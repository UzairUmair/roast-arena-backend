import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { getCurrentUser, loginUser, registerUser } from '../services/authService.js';

export const register = asyncHandler(async (req, res) => sendSuccess(res, await registerUser(req.body), 201));
export const login = asyncHandler(async (req, res) => sendSuccess(res, await loginUser(req.body)));
export const me = asyncHandler(async (req, res) => sendSuccess(res, { user: await getCurrentUser(req.user.id) }));
