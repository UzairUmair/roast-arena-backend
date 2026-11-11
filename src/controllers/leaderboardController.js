import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { getLeaderboard } from '../services/leaderboardService.js';

export const listLeaderboard = asyncHandler(async (_req, res) => sendSuccess(res, { items: await getLeaderboard() }));
