import { z } from 'zod';
import { MAX_PAGE_SIZE } from '../config/constants.js';

const trimmed = (min, max, label) => z.string().trim().min(min, `${label} is required.`).max(max, `${label} must be ${max} characters or fewer.`);

export const registerSchema = z.object({
  displayName: trimmed(2, 60, 'Display name'),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(254),
  password: z.string().min(1, 'Password is required.').max(128),
}).strict();

export const pitchSchema = z.object({
  title: trimmed(2, 80, 'Title'),
  problem: trimmed(5, 600, 'Problem'),
  solution: trimmed(5, 600, 'Solution'),
  customer: trimmed(3, 600, 'Customer'),
  roastLevel: z.enum(['mild', 'medium', 'spicy']),
}).strict();

export const repitchSchema = pitchSchema.omit({ title: true });

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(12),
}).strict();

export const aiOutputSchema = z.object({
  score: z.number().int().min(1).max(10),
  roast: trimmed(1, 400, 'Roast'),
  tip: trimmed(1, 200, 'Tip'),
  offer: z.object({
    amountLakh: z.number().finite().positive(),
    equityPercent: z.number().int().positive().lt(100),
  }).strict(),
}).strict();
