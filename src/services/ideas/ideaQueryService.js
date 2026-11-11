import { Idea } from '../../models/Idea.js';
import { Review } from '../../models/Review.js';
import { Version } from '../../models/Version.js';
import { Vote } from '../../models/Vote.js';
import { AppError } from '../../utils/AppError.js';
import { calculateRanking, toDisplayScore } from '../scoring/leaderboard.js';
import { presentVersion } from './ideaPresenter.js';

function presentRanking(ranking) {
  return Object.fromEntries(
    Object.entries(ranking).map(([key, value]) => [key, toDisplayScore(value)]),
  );
}

async function getCurrentVersionData(idea, viewerId) {
  const [version, reviews, voteCount, viewerVote] = await Promise.all([
    Version.findById(idea.currentVersionId),
    Review.find({ versionId: idea.currentVersionId }).sort({ investor: 1 }),
    Vote.countDocuments({ ideaId: idea._id }),
    viewerId ? Vote.exists({ ideaId: idea._id, userId: viewerId }) : null,
  ]);

  return { version, reviews, voteCount, viewerVote };
}

/**
 * Returns the current pitch version. Historical versions are exposed separately.
 */
export async function getIdeaDetail(ideaId, viewerId) {
  const idea = await Idea.findById(ideaId).populate('ownerId', 'displayName');

  if (!idea || !idea.currentVersionId) {
    throw new AppError(404, 'IDEA_NOT_FOUND', 'Idea not found.');
  }

  const { version, reviews, voteCount, viewerVote } = await getCurrentVersionData(idea, viewerId);
  const ranking = calculateRanking({ reviews, voteCount });

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
    hasVoted: Boolean(viewerVote),
    isOwner: viewerId ? idea.ownerId._id.toString() === viewerId.toString() : false,
    ranking: presentRanking(ranking),
    createdAt: idea.createdAt,
  };
}

export async function listIdeas({ page, limit }) {
  const currentIdeaFilter = { currentVersionId: { $ne: null } };
  const skip = (page - 1) * limit;

  const [ideas, total] = await Promise.all([
    Idea.find(currentIdeaFilter)
      .populate('ownerId', 'displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Idea.countDocuments(currentIdeaFilter),
  ]);

  const items = await Promise.all(ideas.map((idea) => getIdeaDetail(idea._id)));

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function listMyIdeas(ownerId) {
  const ideas = await Idea.find({
    ownerId,
    currentVersionId: { $ne: null },
  }).sort({ updatedAt: -1 });

  return Promise.all(ideas.map((idea) => getIdeaDetail(idea._id, ownerId)));
}

export async function getVersionHistory(ideaId) {
  const idea = await Idea.findById(ideaId);

  if (!idea) {
    throw new AppError(404, 'IDEA_NOT_FOUND', 'Idea not found.');
  }

  const versions = await Version.find({ ideaId }).sort({ versionNumber: -1 });
  const versionIds = versions.map((version) => version._id);
  const reviews = await Review.find({ versionId: { $in: versionIds } });

  return versions.map((version) => {
    const versionReviews = reviews.filter((review) => review.versionId.equals(version._id));
    return presentVersion(version, versionReviews);
  });
}
