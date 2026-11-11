import { calculateAiAverage, toDisplayScore } from '../scoring/leaderboard.js';

/**
 * Converts a Review document into the public object returned by the API.
 * Keeping this mapping here prevents database-only fields leaking by accident.
 */
export function presentReview(review) {
  return {
    id: review._id?.toString(),
    investor: review.investor,
    status: review.status,
    score: review.score,
    roast: review.roast,
    tip: review.tip,
    offer: review.offer,
    attempts: review.attempts,
    offerClamped: review.offerClamped,
    source: review.source,
    providerError: review.providerError,
  };
}

/**
 * A version owns the pitch fields and the three reviews generated for it.
 */
export function presentVersion(version, reviews) {
  return {
    id: version._id.toString(),
    versionNumber: version.versionNumber,
    problem: version.problem,
    solution: version.solution,
    customer: version.customer,
    roastLevel: version.roastLevel,
    evaluationStatus: version.evaluationStatus,
    aiAverage: toDisplayScore(calculateAiAverage(reviews)),
    reviews: reviews.map(presentReview),
    createdAt: version.createdAt,
  };
}

export function presentIdeaSummary(idea) {
  return {
    id: idea._id.toString(),
    title: idea.title,
    currentVersionNumber: idea.currentVersionNumber,
  };
}

export function presentReviewDocuments(reviews) {
  return reviews.map((review) => review.toJSON());
}
