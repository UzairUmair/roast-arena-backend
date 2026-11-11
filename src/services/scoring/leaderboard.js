import { LEADERBOARD_RULES } from '../../config/constants.js';

export function validScores(reviews = []) {
  return reviews
    .filter((review) => review.status === 'done' && Number.isInteger(review.score) && review.score >= 1 && review.score <= 10)
    .map((review) => review.score);
}

export function calculateAiAverage(reviews) {
  const scores = validScores(reviews);
  if (scores.length === 0) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function calculateVoteScore(voteCount) {
  return 10 * voteCount / (voteCount + LEADERBOARD_RULES.voteSmoothing);
}

export function calculateRanking({ reviews, voteCount }) {
  const aiAverage = calculateAiAverage(reviews);
  if (aiAverage === null) return { aiAverage: null, voteCount, voteScore: null, finalScore: null };

  const voteScore = calculateVoteScore(voteCount);
  const finalScore = voteCount === 0
    ? aiAverage
    : LEADERBOARD_RULES.aiWeight * aiAverage + LEADERBOARD_RULES.voteWeight * voteScore;

  return { aiAverage, voteCount, voteScore, finalScore };
}

export function toDisplayScore(value) {
  return value === null ? null : Number(value.toFixed(2));
}

export function compareLeaderboardEntries(left, right) {
  if (right.finalScore !== left.finalScore) return right.finalScore - left.finalScore;
  if (right.voteCount !== left.voteCount) return right.voteCount - left.voteCount;
  return new Date(left.createdAt) - new Date(right.createdAt);
}
