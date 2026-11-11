import { OFFER_RULES } from '../../config/constants.js';
import { aiOutputSchema } from '../../validation/schemas.js';

const unsafeLanguage = /\b(kill yourself|kys|slur|racial slur|worthless person|idiot founder)\b/i;

function extractJson(content) {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(normalized);
}

function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

export function parseAndValidateAiOutput(content) {
  const candidate = typeof content === 'string' ? extractJson(content) : content;
  const parsed = aiOutputSchema.safeParse(candidate);
  if (!parsed.success) throw new Error('AI response did not match the required review format.');
  if (unsafeLanguage.test(parsed.data.roast) || unsafeLanguage.test(parsed.data.tip)) {
    throw new Error('AI response violated the idea-focused safety rules.');
  }
  return parsed.data;
}

export function clampOffer(review) {
  const { score, offer } = review;
  const minAmount = OFFER_RULES.minAmountLakh(score);
  const maxAmount = OFFER_RULES.maxAmountLakh(score);
  const minEquity = OFFER_RULES.minEquityPercent(score);
  const maxEquity = OFFER_RULES.maxEquityPercent(score);
  const amount = Math.min(maxAmount, Math.max(minAmount, offer.amountLakh));
  const equity = Math.min(maxEquity, Math.max(minEquity, offer.equityPercent));
  const roundedAmount = roundToStep(amount, OFFER_RULES.amountStepLakh);
  const roundedEquity = Math.round(equity);
  return {
    ...review,
    offer: { amountLakh: roundedAmount, equityPercent: roundedEquity },
    offerClamped: roundedAmount !== offer.amountLakh || roundedEquity !== offer.equityPercent,
  };
}

export function fallbackReview(investor, attempts, providerError = null) {
  return {
    investor,
    status: 'unscored',
    score: null,
    roast: 'This investor could not produce a safe, valid review for this pitch.',
    tip: 'Clarify your target customer, test the problem with real users, and submit an improved pitch.',
    offer: { amountLakh: null, equityPercent: null },
    attempts,
    offerClamped: false,
    source: 'fallback',
    providerError: providerError?.slice(0, 300) ?? null,
  };
}
