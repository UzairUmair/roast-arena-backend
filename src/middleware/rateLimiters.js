import { rateLimit } from 'express-rate-limit';

const response = (_req, res) => res.status(429).json({
  success: false,
  error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
});

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: response,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: response,
});
