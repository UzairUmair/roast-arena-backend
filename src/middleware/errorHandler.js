import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} was not found.`));
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', details: error.flatten() } });
  }

  if (error?.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0];
    const duplicate = field === 'email'
      ? ['EMAIL_TAKEN', 'An account with this email already exists.']
      : ['DUPLICATE_RESOURCE', 'This resource already exists.'];
    return res.status(409).json({ success: false, error: { code: duplicate[0], message: duplicate[1] } });
  }

  if (error?.name === 'CastError') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'An identifier in this request is invalid.' } });
  }

  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  const message = error instanceof AppError ? error.message : 'An unexpected server error occurred.';
  const body = { success: false, error: { code, message } };
  if (error instanceof AppError && error.details) body.error.details = error.details;
  return res.status(statusCode).json(body);
}
