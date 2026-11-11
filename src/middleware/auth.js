import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function requireAuth(req, _res, next) {
  const authorization = req.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.'));
  }

  try {
    const token = authorization.slice('Bearer '.length);
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.sub, displayName: payload.displayName };
    return next();
  } catch {
    return next(new AppError(401, 'INVALID_TOKEN', 'Your session is invalid or expired.'));
  }
}

export function optionalAuth(req, _res, next) {
  const authorization = req.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return next();

  try {
    const payload = jwt.verify(authorization.slice('Bearer '.length), env.JWT_SECRET);
    req.user = { id: payload.sub, displayName: payload.displayName };
  } catch {
    // Public endpoints remain public even when an outdated token is attached.
  }
  return next();
}
