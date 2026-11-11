export const INVESTORS = ['strict', 'funny', 'dreamer'];

export const INVESTOR_META = {
  strict: { displayName: 'The Strict Investor' },
  funny: { displayName: 'The Funny Investor' },
  dreamer: { displayName: 'The Dreamer' },
};

export const OFFER_RULES = {
  amountStepLakh: 0.5,
  minAmountLakh: (score) => 0.5 * score,
  maxAmountLakh: (score) => 2.5 * score,
  minEquityPercent: (score) => Math.max(5, 25 - 2 * score),
  maxEquityPercent: (score) => 30 - 2 * score,
};

export const LEADERBOARD_RULES = {
  aiWeight: 0.7,
  voteWeight: 0.3,
  voteSmoothing: 5,
};

export const AI_MAX_ATTEMPTS = 3;
export const MAX_PAGE_SIZE = 50;
