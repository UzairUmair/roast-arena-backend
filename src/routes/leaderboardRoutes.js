import { Router } from 'express';
import { listLeaderboard } from '../controllers/leaderboardController.js';

export const leaderboardRouter = Router();
leaderboardRouter.get('/', listLeaderboard);
