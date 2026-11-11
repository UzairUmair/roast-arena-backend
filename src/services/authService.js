import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { normalizeEmail } from '../utils/mongoose.js';

const SALT_ROUNDS = 12;

function userPayload(user) {
  return { id: user._id.toString(), displayName: user.displayName, email: user.email };
}

function issueToken(user) {
  return jwt.sign({ displayName: user.displayName }, env.JWT_SECRET, { subject: user._id.toString(), expiresIn: '8h' });
}

export async function registerUser({ displayName, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await User.exists({ email: normalizedEmail });
  if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const user = await User.create({ displayName, email: normalizedEmail, passwordHash });
    return { user: userPayload(user), token: issueToken(user) };
  } catch (error) {
    if (error?.code === 11000) throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
    throw error;
  }
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email: normalizeEmail(email) }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  return { user: userPayload(user), token: issueToken(user) };
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(401, 'INVALID_TOKEN', 'Your account no longer exists.');
  return userPayload(user);
}
