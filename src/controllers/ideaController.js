import mongoose from 'mongoose';
import { Idea } from '../models/Idea.js';
import { Review } from '../models/Review.js';
import { Version } from '../models/Version.js';
import { Vote } from '../models/Vote.js';
import { generateAllReviews } from '../services/aiService.js';
import { calculateAiAverage, calculateFinalScore, roundScore } from '../services/scoringService.js';

const isValidIdeaId = (ideaId) => mongoose.isValidObjectId(ideaId);

const validatePitch = (body, needsTitle) => {
  const errors = [];
  const roastLevels = ['mild', 'medium', 'spicy'];

  if (needsTitle) {
    const titleIsValid = typeof body.title === 'string'
      && body.title.trim().length >= 2
      && body.title.trim().length <= 80;

    if (!titleIsValid) {
      errors.push('Title must be between 2 and 80 characters.');
    }
  }

  const fieldRules = [
    { name: 'problem', minimum: 5 },
    { name: 'solution', minimum: 5 },
    { name: 'customer', minimum: 3 },
  ];

  for (const field of fieldRules) {
    const value = body[field.name];
    const isValid = typeof value === 'string'
      && value.trim().length >= field.minimum
      && value.trim().length <= 600;

    if (!isValid) {
      errors.push(`${field.name} must be between ${field.minimum} and 600 characters.`);
    }
  }

  if (!roastLevels.includes(body.roastLevel)) {
    errors.push('Roast level must be mild, medium, or spicy.');
  }

  return errors;
};

const getEvaluationStatus = (reviews) => {
  let completedReviews = 0;

  for (const review of reviews) {
    if (review.status === 'done') {
      completedReviews += 1;
    }
  }

  if (completedReviews === 3) return 'complete';
  if (completedReviews > 0) return 'partial';
  return 'failed';
};

const presentReview = (review) => ({
  id: review._id?.toString(),
  investor: review.investor,
  status: review.status,
  score: review.score,
  roast: review.roast,
  tip: review.tip,
  offer: review.offer,
  attempts: review.attempts,
  offerClamped: review.offerClamped,
  source: review.source,
  providerError: review.providerError,
});

const presentVersion = (version, reviews) => ({
  id: version._id.toString(),
  versionNumber: version.versionNumber,
  problem: version.problem,
  solution: version.solution,
  customer: version.customer,
  roastLevel: version.roastLevel,
  evaluationStatus: version.evaluationStatus,
  aiAverage: roundScore(calculateAiAverage(reviews)),
  reviews: reviews.map(presentReview),
  createdAt: version.createdAt,
});

const getIdeaData = async (ideaId, viewerId) => {
  const idea = await Idea.findById(ideaId).populate('ownerId', 'displayName');

  if (!idea || !idea.currentVersionId) {
    return null;
  }

  const version = await Version.findById(idea.currentVersionId);
  const reviews = await Review.find({ versionId: idea.currentVersionId }).sort({ investor: 1 });
  const voteCount = await Vote.countDocuments({ ideaId: idea._id });
  const scoreData = calculateFinalScore(reviews, voteCount);

  let hasVoted = false;
  let isOwner = false;

  if (viewerId) {
    const vote = await Vote.findOne({ ideaId: idea._id, userId: viewerId });
    hasVoted = Boolean(vote);
    isOwner = idea.ownerId._id.toString() === viewerId.toString();
  }

  return {
    id: idea._id.toString(),
    title: idea.title,
    owner: {
      id: idea.ownerId._id.toString(),
      displayName: idea.ownerId.displayName,
    },
    currentVersionNumber: idea.currentVersionNumber,
    currentVersion: presentVersion(version, reviews),
    voteCount,
    hasVoted,
    isOwner,
    ranking: {
      aiAverage: roundScore(scoreData.aiAverage),
      voteCount: scoreData.voteCount,
      voteScore: roundScore(scoreData.voteScore),
      finalScore: roundScore(scoreData.finalScore),
    },
    createdAt: idea.createdAt,
  };
};

const saveReviewsForVersion = async (version, pitch) => {
  const generatedReviews = await generateAllReviews(pitch);
  const savedReviews = [];

  for (const review of generatedReviews) {
    const savedReview = await Review.create({
      ...review,
      versionId: version._id,
    });
    savedReviews.push(savedReview);
  }

  version.evaluationStatus = getEvaluationStatus(savedReviews);
  await version.save();

  return savedReviews;
};

const createSubmissionResponse = (idea, version, reviews, comparison) => {
  const data = {
    idea: {
      id: idea._id.toString(),
      title: idea.title,
      currentVersionNumber: idea.currentVersionNumber,
    },
    version: {
      id: version._id.toString(),
      versionNumber: version.versionNumber,
      evaluationStatus: version.evaluationStatus,
    },
    reviews: reviews.map((review) => review.toJSON()),
  };

  if (comparison) {
    data.comparison = comparison;
  }

  return data;
};

export const createIdea = async (req, res) => {
  try {
    const errors = validatePitch(req.body, true);

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: errors[0], details: errors },
      });
    }

    const cleanPitch = {
      title: req.body.title.trim(),
      problem: req.body.problem.trim(),
      solution: req.body.solution.trim(),
      customer: req.body.customer.trim(),
      roastLevel: req.body.roastLevel,
    };

    const idea = await Idea.create({
      ownerId: req.user.id,
      title: cleanPitch.title,
      currentVersionNumber: 1,
    });

    const version = await Version.create({
      ideaId: idea._id,
      versionNumber: 1,
      problem: cleanPitch.problem,
      solution: cleanPitch.solution,
      customer: cleanPitch.customer,
      roastLevel: cleanPitch.roastLevel,
      evaluationStatus: 'pending',
    });

    idea.currentVersionId = version._id;
    await idea.save();

    const reviews = await saveReviewsForVersion(version, cleanPitch);

    return res.status(201).json({
      success: true,
      data: createSubmissionResponse(idea, version, reviews),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: { code: 'IDEA_CREATE_FAILED', message: 'Could not create idea.' },
    });
  }
};

export const getIdeas = async (req, res) => {
  try {
    let page = Number(req.query.page) || 1;
    let limit = Number(req.query.limit) || 12;

    if (page < 1) page = 1;
    if (limit < 1) limit = 12;
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;
    const filter = { currentVersionId: { $ne: null } };
    const total = await Idea.countDocuments(filter);
    const ideas = await Idea.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const items = [];

    for (const idea of ideas) {
      const ideaData = await getIdeaData(idea._id);
      if (ideaData) items.push(ideaData);
    }

    return res.status(200).json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: { code: 'IDEAS_FETCH_FAILED', message: 'Could not get ideas.' },
    });
  }
};

export const getMyIdeas = async (req, res) => {
  try {
    const ideas = await Idea.find({
      ownerId: req.user.id,
      currentVersionId: { $ne: null },
    }).sort({ updatedAt: -1 });

    const items = [];

    for (const idea of ideas) {
      const ideaData = await getIdeaData(idea._id, req.user.id);
      if (ideaData) items.push(ideaData);
    }

    return res.status(200).json({ success: true, data: { items } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: { code: 'MY_IDEAS_FETCH_FAILED', message: 'Could not get your ideas.' },
    });
  }
};

export const getIdeaById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidIdeaId(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid idea ID.' },
      });
    }

    const idea = await getIdeaData(id, req.user?.id);

    if (!idea) {
      return res.status(404).json({
        success: false,
        error: { code: 'IDEA_NOT_FOUND', message: 'Idea not found.' },
      });
    }

    return res.status(200).json({ success: true, data: { idea } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: { code: 'IDEA_FETCH_FAILED', message: 'Could not get idea.' },
    });
  }
};

export const getIdeaVersions = async (req, res) => {
  try {
    const { id: ideaId } = req.params;

    if (!isValidIdeaId(ideaId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid idea ID.' },
      });
    }

    const idea = await Idea.findById(ideaId);

    if (!idea) {
      return res.status(404).json({
        success: false,
        error: { code: 'IDEA_NOT_FOUND', message: 'Idea not found.' },
      });
    }

    const versions = await Version.find({ ideaId }).sort({ versionNumber: -1 });
    const items = [];

    for (const version of versions) {
      const reviews = await Review.find({ versionId: version._id });
      items.push(presentVersion(version, reviews));
    }

    return res.status(200).json({ success: true, data: { items } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: { code: 'VERSION_FETCH_FAILED', message: 'Could not get idea versions.' },
    });
  }
};

const compareScores = (previousReviews, newReviews) => {
  const investorNames = ['strict', 'funny', 'dreamer'];
  const investorChanges = [];

  for (const investor of investorNames) {
    const oldReview = previousReviews.find((review) => review.investor === investor);
    const newReview = newReviews.find((review) => review.investor === investor);
    const previousScore = oldReview?.score ?? null;
    const currentScore = newReview?.score ?? null;

    investorChanges.push({
      investor,
      previousScore,
      currentScore,
      delta: Number.isInteger(previousScore) && Number.isInteger(currentScore)
        ? currentScore - previousScore
        : null,
    });
  }

  const previousAverage = calculateAiAverage(previousReviews);
  const currentAverage = calculateAiAverage(newReviews);

  return {
    previousAiAverage: roundScore(previousAverage),
    currentAiAverage: roundScore(currentAverage),
    delta: previousAverage !== null && currentAverage !== null
      ? roundScore(currentAverage - previousAverage)
      : null,
    investors: investorChanges,
  };
};

export const repitchIdea = async (req, res) => {
  try {
    const { id: ideaId } = req.params;
    const errors = validatePitch(req.body, false);

    if (!isValidIdeaId(ideaId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid idea ID.' },
      });
    }

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: errors[0], details: errors },
      });
    }

    const idea = await Idea.findById(ideaId);

    if (!idea) {
      return res.status(404).json({
        success: false,
        error: { code: 'IDEA_NOT_FOUND', message: 'Idea not found.' },
      });
    }

    if (idea.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_OWNER', message: 'Only the founder can re-pitch this idea.' },
      });
    }

    const previousVersion = await Version.findById(idea.currentVersionId);
    const previousReviews = await Review.find({ versionId: previousVersion._id });
    const nextVersionNumber = idea.currentVersionNumber + 1;

    const version = await Version.create({
      ideaId: idea._id,
      versionNumber: nextVersionNumber,
      problem: req.body.problem.trim(),
      solution: req.body.solution.trim(),
      customer: req.body.customer.trim(),
      roastLevel: req.body.roastLevel,
      evaluationStatus: 'pending',
    });

    const pitch = {
      title: idea.title,
      problem: version.problem,
      solution: version.solution,
      customer: version.customer,
      roastLevel: version.roastLevel,
    };
    const reviews = await saveReviewsForVersion(version, pitch);

    idea.currentVersionId = version._id;
    idea.currentVersionNumber = nextVersionNumber;
    await idea.save();

    return res.status(201).json({
      success: true,
      data: createSubmissionResponse(
        idea,
        version,
        reviews,
        compareScores(previousReviews, reviews),
      ),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: { code: 'VERSION_CONFLICT', message: 'Please try re-pitching again.' },
      });
    }

    console.log(error);
    return res.status(500).json({
      success: false,
      error: { code: 'REPITCH_FAILED', message: 'Could not re-pitch idea.' },
    });
  }
};
