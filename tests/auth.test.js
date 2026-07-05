const request = require('supertest');
const app = require('../src/app');

describe('GET /auth/google', () => {
  it('redirects to Google OAuth with a location header', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/accounts\.google\.com/);
  });
});

describe('GET /auth/google/callback', () => {
  it('returns 400 when code param is missing', async () => {
    const res = await request(app).get('/auth/google/callback');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
