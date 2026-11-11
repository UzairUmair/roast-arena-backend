import mongoose from 'mongoose';
import { AppError } from './AppError.js';

export function requireObjectId(value, label = 'id') {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(400, 'INVALID_ID', `Invalid ${label}.`);
  }
  return value;
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
