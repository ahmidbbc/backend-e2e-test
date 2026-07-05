const request = require('supertest');
const jwt = require('jsonwebtoken');

const FAKE_STATE = 'aabbccdd11223344aabbccdd11223344';
const FAKE_SUB = '123456789';
const FAKE_EMAIL = 'user@example.com';
const TEST_SECRET = 'test_jwt_secret';

jest.mock('../src/config/oauth', () => ({
  createOAuthClient: () => ({
    generateAuthUrl: (_opts) => 'https://accounts.google.com/o/oauth2/auth?stub=1',
    getToken: async (code) => {
      if (code === 'valid_code') {
        return { tokens: { id_token: 'valid_id_token', access_token: 'tok' } };
      }
      throw new Error('bad code');
    },
    setCredentials: () => {},
    verifyIdToken: async ({ idToken }) => {
      if (idToken === 'valid_id_token') {
        return { getPayload: () => ({ sub: FAKE_SUB, email: FAKE_EMAIL }) };
      }
      throw new Error('bad token');
    },
  }),
  getAuthUrl: (_client, state) =>
    `https://accounts.google.com/o/oauth2/auth?stub=1&state=${state}`,
  SCOPES: ['openid', 'email', 'profile'],
  REDIRECT_URL: 'http://localhost:3000/google/callback',
}));

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

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

describe('GET /google/callback', () => {
  it('returns 400 when state is missing', async () => {
    const res = await request(app)
      .get('/google/callback')
      .set('Cookie', `oauth_state=${FAKE_STATE}`)
      .query({ code: 'valid_code' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_state');
  });

  it('returns 400 when state does not match cookie', async () => {
    const res = await request(app)
      .get('/google/callback')
      .set('Cookie', `oauth_state=${FAKE_STATE}`)
      .query({ code: 'valid_code', state: 'wrongstate_xxxxxxxxxxxxxxxxxxxxx' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_state');
  });

  it('returns 400 when code is missing', async () => {
    const res = await request(app)
      .get('/google/callback')
      .set('Cookie', `oauth_state=${FAKE_STATE}`)
      .query({ state: FAKE_STATE });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing_code');
  });

  it('returns 401 when token exchange fails', async () => {
    const res = await request(app)
      .get('/google/callback')
      .set('Cookie', `oauth_state=${FAKE_STATE}`)
      .query({ code: 'bad_code', state: FAKE_STATE });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('token_exchange_failed');
  });

  it('returns a signed JWT with sub and email on success', async () => {
    const res = await request(app)
      .get('/google/callback')
      .set('Cookie', `oauth_state=${FAKE_STATE}`)
      .query({ code: 'valid_code', state: FAKE_STATE });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    const decoded = jwt.verify(res.body.token, TEST_SECRET);
    expect(decoded.sub).toBe(FAKE_SUB);
    expect(decoded.email).toBe(FAKE_EMAIL);
    expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60);
  });
});
