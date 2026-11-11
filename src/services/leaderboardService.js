import { Idea } from '../models/Idea.js';
import { Review } from '../models/Review.js';
import { Vote } from '../models/Vote.js';
import {
  calculateRanking,
  compareLeaderboardEntries,
  toDisplayScore,
} from './scoring/leaderboard.js';

function groupReviewsByVersion(reviews) {
  const reviewsByVersion = new Map();

  for (const review of reviews) {
    const versionId = review.versionId.toString();
    const currentReviews = reviewsByVersion.get(versionId) ?? [];
    currentReviews.push(review);
    reviewsByVersion.set(versionId, currentReviews);
  }

  return reviewsByVersion;
}

function mapVoteCounts(voteCounts) {
  return new Map(voteCounts.map((entry) => [entry._id.toString(), entry.count]));
}

function createLeaderboardEntry(idea, reviewsByVersion, votesByIdea) {
  const ideaId = idea._id.toString();
  const currentReviews = reviewsByVersion.get(idea.currentVersionId.toString()) ?? [];
  const voteCount = votesByIdea.get(ideaId) ?? 0;
  const ranking = calculateRanking({ reviews: currentReviews, voteCount });

  return {
    id: ideaId,
    title: idea.title,
    owner: { displayName: idea.ownerId.displayName },
    versionNumber: idea.currentVersionNumber,
    createdAt: idea.createdAt,
    ...ranking,
  };
}

function formatLeaderboardEntry(entry, index) {
  return {
    ...entry,
    rank: index + 1,
    aiAverage: toDisplayScore(entry.aiAverage),
    voteScore: toDisplayScore(entry.voteScore),
    finalScore: toDisplayScore(entry.finalScore),
  };
}

/**
 * Rankings use only the latest pitch version, while votes stay with the idea.
 */
export async function getLeaderboard() {
  const ideas = await Idea.find({ currentVersionId: { $ne: null } })
    .populate('ownerId', 'displayName')
    .sort({ createdAt: 1 });

  const currentVersionIds = ideas.map((idea) => idea.currentVersionId);
  const [reviews, voteCounts] = await Promise.all([
    Review.find({ versionId: { $in: currentVersionIds } }),
    Vote.aggregate([{ $group: { _id: '$ideaId', count: { $sum: 1 } } }]),
  ]);

  const reviewsByVersion = groupReviewsByVersion(reviews);
  const votesByIdea = mapVoteCounts(voteCounts);

  return ideas
    .map((idea) => createLeaderboardEntry(idea, reviewsByVersion, votesByIdea))
    .filter((entry) => entry.finalScore !== null)
    .sort(compareLeaderboardEntries)
    .map(formatLeaderboardEntry);
}
