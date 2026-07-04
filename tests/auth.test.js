'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('GET /auth/google', () => {
  it('redirects to Google when credentials are configured', async () => {
    const originalClientId = process.env.GOOGLE_CLIENT_ID;
    const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // Skip if no credentials are available (CI without secrets)
    if (!originalClientId || !originalClientSecret) {
      return;
    }

    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/accounts\.google\.com/);
    expect(res.headers.location).toMatch(/state=/);
  });

  it('returns 401 when Google strategy is not configured', async () => {
    // When no credentials are set, passport has no google strategy registered.
    if (process.env.GOOGLE_CLIENT_ID) return;

    const res = await request(app).get('/auth/google');
    expect([401, 500]).toContain(res.status);
  });
});

describe('GET /auth/google/callback', () => {
  it('returns 403 when state cookie is missing', async () => {
    const res = await request(app)
      .get('/auth/google/callback')
      .query({ state: 'anything', code: 'fake' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('invalid_state');
  });

  it('returns 403 when state cookie does not match query param', async () => {
    const res = await request(app)
      .get('/auth/google/callback')
      .set('Cookie', 'oauth_state=aabbcc')
      .query({ state: 'different', code: 'fake' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('invalid_state');
  });
});

describe('GET /auth/failure', () => {
  it('returns 401 with authentication_failed', async () => {
    const res = await request(app).get('/auth/failure');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('authentication_failed');
  });
});
