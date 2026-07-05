const request = require('supertest');

// Stub OAuth config before loading app so no real credentials are needed
jest.mock('../src/config/oauth', () => ({
  createOAuthClient: () => ({
    generateAuthUrl: (_opts) => 'https://accounts.google.com/o/oauth2/auth?stub=1',
  }),
  getAuthUrl: (_client, state) =>
    `https://accounts.google.com/o/oauth2/auth?stub=1&state=${state}`,
  SCOPES: ['openid', 'email', 'profile'],
  REDIRECT_URL: 'http://localhost:3000/auth/google/callback',
}));

const app = require('../src/app');

describe('GET /google', () => {
  it('redirects to Google OAuth with 302', async () => {
    const res = await request(app).get('/google').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/accounts\.google\.com/);
  });

  it('sets oauth_state cookie', async () => {
    const res = await request(app).get('/google').redirects(0);
    const cookie = res.headers['set-cookie'] || [];
    expect(cookie.some((c) => c.startsWith('oauth_state='))).toBe(true);
  });
});
