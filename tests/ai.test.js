import { describe, expect, it } from 'vitest';
import { generateAllReviews, generateInvestorReview } from '../src/services/ai/reviewService.js';
import { clampOffer, parseAndValidateAiOutput } from '../src/services/ai/reviewValidator.js';
import { pitch } from './helpers.js';

describe('AI review validation', () => {
  it('generates three distinct clearly-labelled mock investor reviews', async () => {
    const reviews = await generateAllReviews(pitch);
    expect(reviews.map((review) => review.investor)).toEqual(['strict', 'funny', 'dreamer']);
    expect(reviews.every((review) => review.status === 'done' && review.source === 'mock')).toBe(true);
    expect(new Set(reviews.map((review) => review.roast)).size).toBe(3);
  });

  it('rejects malformed or invalid scores and clamps out-of-range offers', () => {
    expect(() => parseAndValidateAiOutput('{"score": 11}')).toThrow();
    const clamped = clampOffer({ score: 8, roast: 'Good', tip: 'Test', offer: { amountLakh: 99, equityPercent: 1 } });
    expect(clamped.offer).toEqual({ amountLakh: 20, equityPercent: 9 });
    expect(clamped.offerClamped).toBe(true);
  });

  it('retries invalid output three times and saves an unscored fallback', async () => {
    let calls = 0;
    const review = await generateInvestorReview('strict', pitch, {
      completion: async () => { calls += 1; return '{bad json'; }, source: 'groq',
    });
    expect(calls).toBe(3);
    expect(review).toMatchObject({ status: 'unscored', score: null, source: 'fallback', attempts: 3 });
  });
});
