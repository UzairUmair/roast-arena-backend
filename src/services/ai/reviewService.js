import Groq from 'groq-sdk';
import { env } from '../../config/env.js';
import { AI_MAX_ATTEMPTS } from '../../config/constants.js';
import { pitchMessage, systemPrompt } from './prompts.js';
import {
  clampOffer,
  fallbackReview,
  parseAndValidateAiOutput,
} from './reviewValidator.js';

const GROQ_TIMEOUT_MS = 20_000;
const GROQ_MAX_OUTPUT_TOKENS = 350;
const INVESTOR_IDS = ['strict', 'funny', 'dreamer'];

// Used only when MOCK_AI=true, for tests and predictable local demos.
const MOCK_REVIEWS = {
  strict: {
    score: 6,
    roast: 'Queues are painful, but food preorders are not a monopoly. Your margin and vendor onboarding plan need sharper numbers.',
    tip: 'Interview canteen operators about commissions and peak-hour capacity.',
    offer: { amountLakh: 7, equityPercent: 14 },
  },
  funny: {
    score: 7,
    roast: 'A hungry student can outpace your checkout page, so speed matters. The useful part is proving vendors can fulfill orders on time.',
    tip: 'Pilot with one canteen and measure late-order and repeat-order rates.',
    offer: { amountLakh: 11, equityPercent: 9 },
  },
  dreamer: {
    score: 8,
    roast: 'This could grow from preorders into a campus food marketplace if operations stay dependable.',
    tip: 'Start with one campus, then add loyalty and demand forecasting only after retention is proven.',
    offer: { amountLakh: 18, equityPercent: 8 },
  },
};

function isTransientProviderError(error) {
  return error?.status === 429
    || error?.status >= 500
    || error?.name === 'AbortError'
    || error?.name === 'TimeoutError';
}

async function requestGroqCompletion(investor, pitch) {
  const client = new Groq({
    apiKey: env.GROQ_API_KEY,
    timeout: GROQ_TIMEOUT_MS,
    maxRetries: 0,
  });

  const response = await client.chat.completions.create({
    model: env.GROQ_MODEL,
    temperature: 0.45,
    max_tokens: GROQ_MAX_OUTPUT_TOKENS,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt(investor, pitch.roastLevel) },
      { role: 'user', content: pitchMessage(pitch) },
    ],
  });

  return response.choices[0]?.message?.content;
}

function createMockCompletion(investor, pitch) {
  const review = MOCK_REVIEWS[investor];

  return JSON.stringify({
    ...review,
    roast: `${review.roast} (${pitch.title} is the pitch being evaluated.)`,
  });
}

function getCompletionMethod(options) {
  if (options.completion) return options.completion;
  return env.MOCK_AI ? createMockCompletion : requestGroqCompletion;
}

function getReviewSource(options) {
  if (options.source) return options.source;
  return env.MOCK_AI ? 'mock' : 'groq';
}

/**
 * AI text is not trusted. It must pass JSON, business-rule, and safety validation
 * before it can be saved as a scored review.
 */
export async function generateInvestorReview(investor, pitch, options = {}) {
  const completion = getCompletionMethod(options);
  const source = getReviewSource(options);
  let lastError;

  for (let attempt = 1; attempt <= AI_MAX_ATTEMPTS; attempt += 1) {
    try {
      const content = await completion(investor, pitch);
      const validReview = parseAndValidateAiOutput(content);
      const reviewWithSafeOffer = clampOffer(validReview);

      return {
        investor,
        status: 'done',
        ...reviewWithSafeOffer,
        attempts: attempt,
        source,
        providerError: null,
      };
    } catch (error) {
      lastError = error;

      // Retrying malformed responses is useful; retry transient provider errors too.
      if (isTransientProviderError(error) && attempt === AI_MAX_ATTEMPTS) break;
    }
  }

  return fallbackReview(investor, AI_MAX_ATTEMPTS, lastError?.message);
}

export async function generateAllReviews(pitch, options = {}) {
  const settledReviews = await Promise.allSettled(
    INVESTOR_IDS.map((investor) => generateInvestorReview(investor, pitch, options)),
  );

  return settledReviews.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    return fallbackReview(INVESTOR_IDS[index], AI_MAX_ATTEMPTS, result.reason?.message);
  });
}
