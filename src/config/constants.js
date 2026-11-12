export const INVESTORS = ['strict', 'funny', 'dreamer'];

export const INVESTOR_NAMES = {
  strict: 'The Strict Investor',
  funny: 'The Funny Investor',
  dreamer: 'The Dreamer',
};

export const MAX_AI_ATTEMPTS = 3;
export const MAX_PAGE_LIMIT = 50;

// These are project rules for fictional offers, not real investment rules.
export const getOfferLimits = (score) => ({
  minAmountLakh: 0.5 * score,
  maxAmountLakh: 2.5 * score,
  minEquityPercent: Math.max(5, 25 - (2 * score)),
  maxEquityPercent: 30 - (2 * score),
});

export const LEADERBOARD = {
  aiWeight: 0.7,
  voteWeight: 0.3,
  voteSmoothing: 5,
};
