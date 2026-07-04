const request = require('supertest');
const app = require('../src/app');

describe('GET /auth/google', () => {
  it('redirects to Google OAuth consent screen', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/accounts\.google\.com/);
  });
});

describe('GET /auth/google/callback', () => {
  it('redirects when no code is provided', async () => {
    const res = await request(app).get('/auth/google/callback');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBeTruthy();
  });
});

describe('GET /auth/failure', () => {
  it('returns 401 authentication_failed', async () => {
    const res = await request(app).get('/auth/failure');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('authentication_failed');
  });
});
