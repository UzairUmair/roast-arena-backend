import { describe, expect, it } from 'vitest';
import { calculateAiAverage, calculateRanking, calculateVoteScore } from '../src/services/scoring/leaderboard.js';

const reviews = [
  { status: 'done', score: 7 }, { status: 'done', score: 8 }, { status: 'done', score: 6 },
];

describe('leaderboard scoring', () => {
  it('uses the documented average and 70/30 smoothed formula', () => {
    expect(calculateAiAverage(reviews)).toBe(7);
    expect(calculateVoteScore(5)).toBe(5);
    expect(calculateRanking({ reviews, voteCount: 5 }).finalScore).toBeCloseTo(6.4);
  });

  it('uses the AI average alone for no votes and leaves unscored ideas unranked', () => {
    expect(calculateRanking({ reviews, voteCount: 0 }).finalScore).toBe(7);
    expect(calculateRanking({ reviews: [{ status: 'unscored', score: null }], voteCount: 10 }).finalScore).toBeNull();
  });
});
