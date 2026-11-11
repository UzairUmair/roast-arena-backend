import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, authorization, createIdea, pitch, registerUser } from './helpers.js';

describe('ideas, voting, leaderboard, and re-pitch APIs', () => {
  it('validates submissions and persists a pitch with three investor evaluations', async () => {
    const founder = await registerUser();
    const unauthenticated = await request(app).post('/api/ideas').send(pitch);
    expect(unauthenticated.status).toBe(401);

    const invalid = await request(app).post('/api/ideas').set(authorization(founder.token)).send({ ...pitch, roastLevel: 'extreme' });
    expect(invalid.status).toBe(422);

    const created = await createIdea(founder.token);
    expect(created.status).toBe(201);
    expect(created.body.data.idea).toMatchObject({ title: pitch.title, currentVersionNumber: 1 });
    expect(created.body.data.reviews).toHaveLength(3);
    expect(created.body.data.reviews.every((review) => review.source === 'mock')).toBe(true);

    const id = created.body.data.idea.id;
    const detail = await request(app).get(`/api/ideas/${id}`).set(authorization(founder.token));
    expect(detail.status).toBe(200);
    expect(detail.body.data.idea.currentVersion.reviews).toHaveLength(3);
    expect(detail.body.data.idea.isOwner).toBe(true);

    const listed = await request(app).get('/api/ideas?page=1&limit=5');
    expect(listed.status).toBe(200);
    expect(listed.body.data.pagination.total).toBe(1);

    const mine = await request(app).get('/api/ideas/mine').set(authorization(founder.token));
    expect(mine.status).toBe(200);
    expect(mine.body.data.items).toHaveLength(1);
  });

  it('enforces one permanent support vote per user and rejects concurrent duplicates', async () => {
    const founder = await registerUser({ email: 'founder@example.com' });
    const voter = await registerUser({ email: 'voter@example.com' });
    const created = await createIdea(founder.token);
    const ideaId = created.body.data.idea.id;

    const selfVote = await request(app).post(`/api/ideas/${ideaId}/vote`).set(authorization(founder.token));
    expect(selfVote.status).toBe(403);

    const requests = Array.from({ length: 2 }, () => request(app).post(`/api/ideas/${ideaId}/vote`).set(authorization(voter.token)));
    const responses = await Promise.all(requests);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);

    const leaderboard = await request(app).get('/api/leaderboard');
    expect(leaderboard.status).toBe(200);
    expect(leaderboard.body.data.items[0]).toMatchObject({ id: ideaId, rank: 1, voteCount: 1, aiAverage: 7 });
  });

  it('preserves version history and voting eligibility after an owner re-pitches', async () => {
    const founder = await registerUser({ email: 'repitch-founder@example.com' });
    const voter = await registerUser({ email: 'repitch-voter@example.com' });
    const other = await registerUser({ email: 'other@example.com' });
    const created = await createIdea(founder.token);
    const ideaId = created.body.data.idea.id;
    expect((await request(app).post(`/api/ideas/${ideaId}/vote`).set(authorization(voter.token))).status).toBe(201);

    const forbidden = await request(app).post(`/api/ideas/${ideaId}/repitch`).set(authorization(other.token)).send({
      problem: 'A new problem statement for testing owner restrictions.',
      solution: pitch.solution,
      customer: pitch.customer,
      roastLevel: pitch.roastLevel,
    });
    expect(forbidden.status).toBe(403);

    const repitch = await request(app).post(`/api/ideas/${ideaId}/repitch`).set(authorization(founder.token)).send({
      problem: 'Students wait in unpredictable queues and cannot plan their short breaks.',
      solution: 'Preorder meals and receive a pickup window through a simple campus system.',
      customer: 'University students and independent campus canteen operators.', roastLevel: 'spicy',
    });
    expect(repitch.status).toBe(201);
    expect(repitch.body.data.idea.currentVersionNumber).toBe(2);
    expect(repitch.body.data.comparison).toMatchObject({ previousAiAverage: 7, currentAiAverage: 7, delta: 0 });

    const history = await request(app).get(`/api/ideas/${ideaId}/versions`);
    expect(history.status).toBe(200);
    expect(history.body.data.items.map((version) => version.versionNumber)).toEqual([2, 1]);

    const duplicateAfterRepitch = await request(app).post(`/api/ideas/${ideaId}/vote`).set(authorization(voter.token));
    expect(duplicateAfterRepitch.status).toBe(409);
  });
});
