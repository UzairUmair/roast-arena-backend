import { Idea } from '../../models/Idea.js';
import { Review } from '../../models/Review.js';
import { Version } from '../../models/Version.js';
import { AppError } from '../../utils/AppError.js';
import { generateAllReviews } from '../ai/reviewService.js';
import { calculateAiAverage, toDisplayScore } from '../scoring/leaderboard.js';

function determineEvaluationStatus(reviews) {
  const completedCount = reviews.filter((review) => review.status === 'done').length;

  if (completedCount === 3) return 'complete';
  if (completedCount > 0) return 'partial';
  return 'failed';
}

async function evaluateVersion(version, pitch, options) {
  const generatedReviews = await generateAllReviews(pitch, options);
  const reviewsToSave = generatedReviews.map((review) => ({
    ...review,
    versionId: version._id,
  }));

  const savedReviews = await Review.insertMany(reviewsToSave);
  version.evaluationStatus = determineEvaluationStatus(savedReviews);
  await version.save();

  return savedReviews;
}

async function removeIncompleteIdea(ideaId) {
  const versions = await Version.find({ ideaId }).select('_id');
  const versionIds = versions.map((version) => version._id);

  await Promise.allSettled([
    Review.deleteMany({ versionId: { $in: versionIds } }),
    Version.deleteMany({ ideaId }),
  ]);

  await Idea.findByIdAndDelete(ideaId);
}

export async function createIdea(ownerId, payload, options) {
  const idea = await Idea.create({ ownerId, title: payload.title });

  try {
    const version = await Version.create({
      ideaId: idea._id,
      versionNumber: 1,
      ...payload,
    });

    idea.currentVersionId = version._id;
    idea.currentVersionNumber = 1;
    await idea.save();

    const reviews = await evaluateVersion(version, payload, options);
    return { idea, version, reviews };
  } catch (error) {
    // Avoid leaving an idea that has no usable first pitch version.
    await removeIncompleteIdea(idea._id);
    throw error;
  }
}

function buildScoreComparison(previousReviews, currentReviews) {
  const previousScores = new Map(previousReviews.map((review) => [review.investor, review.score]));
  const currentScores = new Map(currentReviews.map((review) => [review.investor, review.score]));
  const previousAverage = calculateAiAverage(previousReviews);
  const currentAverage = calculateAiAverage(currentReviews);

  const investors = ['strict', 'funny', 'dreamer'].map((investor) => {
    const previousScore = previousScores.get(investor) ?? null;
    const currentScore = currentScores.get(investor) ?? null;
    const canCompare = Number.isInteger(previousScore) && Number.isInteger(currentScore);

    return {
      investor,
      previousScore,
      currentScore,
      delta: canCompare ? currentScore - previousScore : null,
    };
  });

  return {
    previousAiAverage: toDisplayScore(previousAverage),
    currentAiAverage: toDisplayScore(currentAverage),
    delta: previousAverage !== null && currentAverage !== null
      ? toDisplayScore(currentAverage - previousAverage)
      : null,
    investors,
  };
}

/**
 * Incrementing currentVersionNumber first gives each concurrent re-pitch a unique version number.
 * The most recently allocated version becomes the current pitch.
 */
export async function repitchIdea(ideaId, ownerId, payload, options) {
  const idea = await Idea.findOneAndUpdate(
    { _id: ideaId, ownerId },
    { $inc: { currentVersionNumber: 1 } },
    { new: true },
  );

  if (!idea) {
    const ideaExists = await Idea.exists({ _id: ideaId });
    const errorCode = ideaExists ? 'NOT_OWNER' : 'IDEA_NOT_FOUND';
    const message = ideaExists
      ? 'Only the founder can re-pitch this idea.'
      : 'Idea not found.';

    throw new AppError(ideaExists ? 403 : 404, errorCode, message);
  }

  const previousVersionNumber = idea.currentVersionNumber - 1;
  const previousVersion = await Version.findOne({
    ideaId,
    versionNumber: previousVersionNumber,
  });
  const previousReviews = previousVersion
    ? await Review.find({ versionId: previousVersion._id })
    : [];

  const version = await Version.create({
    ideaId,
    versionNumber: idea.currentVersionNumber,
    ...payload,
  });
  const reviews = await evaluateVersion(version, payload, options);

  await Idea.updateOne(
    { _id: ideaId, currentVersionNumber: { $lte: version.versionNumber } },
    { $set: { currentVersionId: version._id } },
  );

  return {
    idea: await Idea.findById(ideaId),
    version,
    reviews,
    comparison: buildScoreComparison(previousReviews, reviews),
  };
}
