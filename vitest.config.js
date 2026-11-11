import { defineConfig } from 'vitest/config';

// Set before application modules load so dotenv does not select the local live-provider .env file.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
process.env.MOCK_AI = 'true';
process.env.FRONTEND_URL = 'http://localhost:5173';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      MOCK_AI: 'true',
      JWT_SECRET: 'test-secret-that-is-long-enough',
      FRONTEND_URL: 'http://localhost:5173',
    },
    setupFiles: ['./tests/setup.js'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
