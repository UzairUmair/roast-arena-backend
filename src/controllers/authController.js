import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const SALT_ROUNDS = 12;

const createToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), displayName: user.displayName },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );
};

const publicUser = (user) => {
  return {
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.email,
  };
};

export const register = async (req, res) => {
  try {
    const { displayName, email, password } = req.body;

    if (typeof displayName !== 'string' || typeof email !== 'string' || typeof password !== 'string'
      || !displayName.trim() || !email.trim() || !password) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Display name, email, and password are required.' },
      });
    }

    if (displayName.trim().length < 2 || displayName.trim().length > 60) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Display name must be between 2 and 60 characters.' },
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email address.' },
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password must be between 8 and 128 characters.' },
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' },
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      displayName: displayName.trim(),
      email: cleanEmail,
      passwordHash,
    });

    return res.status(201).json({
      success: true,
      data: {
        user: publicUser(user),
        token: createToken(user),
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: { code: 'REGISTER_FAILED', message: 'Could not register user.' },
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' },
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: publicUser(user),
        token: createToken(user),
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: { code: 'LOGIN_FAILED', message: 'Could not log in.' },
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Your account no longer exists.' },
      });
    }

    return res.status(200).json({ success: true, data: { user: publicUser(user) } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: { code: 'USER_FETCH_FAILED', message: 'Could not get user.' },
    });
  }
};
