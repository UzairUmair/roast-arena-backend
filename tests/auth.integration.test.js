import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, authorization, registerUser } from './helpers.js';

describe('authentication API', () => {
  it('registers, logs in, and returns the authenticated user without a password hash', async () => {
    const registered = await registerUser({ email: 'founder@example.com', displayName: 'Founder' });
    expect(registered.token).toBeTypeOf('string');
    expect(registered.user).toEqual(expect.objectContaining({ email: 'founder@example.com', displayName: 'Founder' }));
    expect(registered.user.passwordHash).toBeUndefined();

    const login = await request(app).post('/api/auth/login').send({ email: 'FOUNDER@example.com', password: registered.input.password });
    expect(login.status).toBe(200);
    expect(login.body.data.token).toBeTypeOf('string');

    const me = await request(app).get('/api/auth/me').set(authorization(login.body.data.token));
    expect(me.status).toBe(200);
    expect(me.body.data.user).toEqual(expect.objectContaining({ email: 'founder@example.com' }));
  });

  it('rejects duplicate accounts, bad credentials, and missing protected tokens', async () => {
    const registered = await registerUser({ email: 'duplicate@example.com' });
    const duplicate = await request(app).post('/api/auth/register').send(registered.input);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('EMAIL_TAKEN');

    const badLogin = await request(app).post('/api/auth/login').send({ email: registered.input.email, password: 'wrong-password' });
    expect(badLogin.status).toBe(401);
    expect(badLogin.body.error.code).toBe('INVALID_CREDENTIALS');

    const me = await request(app).get('/api/auth/me');
    expect(me.status).toBe(401);
  });
});
