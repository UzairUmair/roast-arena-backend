import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true');
const optionalSecret = z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional());

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: optionalSecret,
  JWT_SECRET: z.preprocess((value) => value === '' ? undefined : value, z.string().min(16).optional()),
  GROQ_API_KEY: optionalSecret,
  GROQ_MODEL: optionalSecret,
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  MOCK_AI: booleanFromString.default(false),
});

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  const messages = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${messages}`);
}

export const env = parsed.data;

export function assertRuntimeSecrets() {
  if (!env.MONGODB_URI) throw new Error('MONGODB_URI is required to start the server.');
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET must be at least 16 characters.');
  if (!env.MOCK_AI && (!env.GROQ_API_KEY || !env.GROQ_MODEL)) {
    throw new Error('Set GROQ_API_KEY and GROQ_MODEL, or use MOCK_AI=true for local/demo mode.');
  }
}
