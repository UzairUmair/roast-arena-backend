import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();

export async function registerUser(overrides = {}) {
  const data = {
    displayName: 'Founder A', email: `user-${Math.random().toString(36).slice(2)}@example.com`, password: 'strong-password-123', ...overrides,
  };
  const response = await request(app).post('/api/auth/register').send(data);
  return { ...response.body.data, input: data };
}

export function authorization(token) {
  return { Authorization: `Bearer ${token}` };
}

export const pitch = {
  title: 'Smart Canteen',
  problem: 'Students spend too long waiting in busy canteen queues between classes.',
  solution: 'A mobile preorder system that lets students collect food at scheduled times.',
  customer: 'University students and campus canteen operators.',
  roastLevel: 'medium',
};

export async function createIdea(token, overrides = {}) {
  const response = await request(app).post('/api/ideas').set(authorization(token)).send({ ...pitch, ...overrides });
  return response;
}
