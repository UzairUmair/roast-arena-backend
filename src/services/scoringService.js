import { LEADERBOARD } from '../config/constants.js';

export const getValidScores = (reviews) => {
  const scores = [];

  for (const review of reviews) {
    if (review.status === 'done' && Number.isInteger(review.score)) {
      scores.push(review.score);
    }
  }

  return scores;
};

export const calculateAiAverage = (reviews) => {
  const scores = getValidScores(reviews);

  if (scores.length === 0) {
    return null;
  }

  let total = 0;
  for (const score of scores) {
    total += score;
  }

  return total / scores.length;
};

export const calculateVoteScore = (voteCount) => {
  return (10 * voteCount) / (voteCount + LEADERBOARD.voteSmoothing);
};

export const calculateFinalScore = (reviews, voteCount) => {
  const aiAverage = calculateAiAverage(reviews);

  if (aiAverage === null) {
    return {
      aiAverage: null,
      voteCount,
      voteScore: null,
      finalScore: null,
    };
  }

  const voteScore = calculateVoteScore(voteCount);
  let finalScore = aiAverage;

  if (voteCount > 0) {
    finalScore = (LEADERBOARD.aiWeight * aiAverage)
      + (LEADERBOARD.voteWeight * voteScore);
  }

  return {
    aiAverage,
    voteCount,
    voteScore,
    finalScore,
  };
};

export const roundScore = (score) => {
  if (score === null) {
    return null;
  }

  return Number(score.toFixed(2));
};
