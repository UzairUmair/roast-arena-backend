import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { generalRateLimiter } from './middleware/rateLimiters.js';
import { authRouter } from './routes/authRoutes.js';
import { ideaRouter } from './routes/ideaRoutes.js';
import { leaderboardRouter } from './routes/leaderboardRoutes.js';
import { sendSuccess } from './utils/response.js';

function createCorsOptions() {
  const allowedOrigins = env.FRONTEND_URL.split(',').map((origin) => origin.trim());

  return {
    origin(origin, callback) {
      const isServerToServerRequest = !origin;
      const isAllowedFrontend = allowedOrigins.includes(origin);
      return callback(null, isServerToServerRequest || isAllowedFrontend);
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

export function createApp() {
  const app = express();

  // Application-wide security and parsing middleware.
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: '20kb' }));
  app.use(generalRateLimiter);

  // API routes.
  app.get('/api/health', (_req, res) => {
    return sendSuccess(res, {
      status: 'ok',
      service: 'startup-roast-arena-api',
    });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/ideas', ideaRouter);
  app.use('/api/leaderboard', leaderboardRouter);

  // Error middleware must always be registered after the routes.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
