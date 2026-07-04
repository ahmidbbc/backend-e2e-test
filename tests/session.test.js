const request = require('supertest');
const express = require('express');
const { signToken, verifyToken, requireAuth } = require('../src/session');
const { buildAuthRouter } = require('../src/auth');

const SECRET = 'test-secret';

function makeApp(overrides = {}) {
  const app = express();
  app.use(express.json());

  const db = overrides.db || {
    query: jest.fn().mockResolvedValue({
      rows: [{ id: 1, email: 'user@example.com', role: 'member', google_id: '123', created_at: new Date() }],
    }),
  };

  const oauthClient = {
    _clientId: 'test-client-id',
    generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?mock=1'),
    getToken: jest.fn().mockResolvedValue({ tokens: { id_token: 'mock-id-token', access_token: 'mock-access-token' } }),
    setCredentials: jest.fn(),
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: () => ({ sub: '123', email: 'user@example.com' }),
    }),
    ...overrides.oauthClient,
  };

  const signFn = (payload) => signToken(payload, SECRET);
  const requireAuthFn = requireAuth((token) => verifyToken(token, SECRET));

  app.use(buildAuthRouter({
    db,
    oauthClient,
    redirectUri: 'http://localhost:3000/auth/google/callback',
    signFn,
    requireAuthFn,
  }));

  return app;
}

describe('signToken / verifyToken', () => {
  it('round-trips a payload', () => {
    const token = signToken({ sub: 1, email: 'a@b.com', role: 'member' }, SECRET);
    const payload = verifyToken(token, SECRET);
    expect(payload.sub).toBe(1);
    expect(payload.email).toBe('a@b.com');
  });

  it('throws on tampered token', () => {
    const token = signToken({ sub: 1 }, SECRET);
    expect(() => verifyToken(token + 'x', SECRET)).toThrow();
  });
});

describe('GET /auth/google/callback — session issuance', () => {
  it('returns a JWT token in the response body', async () => {
    const app = makeApp();
    const res = await request(app).get('/auth/google/callback?code=valid-code');
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    const payload = verifyToken(res.body.token, SECRET);
    expect(payload.email).toBe('user@example.com');
  });

  it('sets an httpOnly cookie named token', async () => {
    const app = makeApp();
    const res = await request(app).get('/auth/google/callback?code=valid-code');
    const cookies = res.headers['set-cookie'] || [];
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toMatch(/HttpOnly/i);
  });
});

describe('POST /auth/logout', () => {
  it('returns ok and clears the cookie', async () => {
    const app = makeApp();
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const cookies = res.headers['set-cookie'] || [];
    const cleared = cookies.find((c) => c.startsWith('token=;') || c.includes('token=;') || c.match(/token=\s*;/));
    expect(cleared).toBeDefined();
  });
});

describe('requireAuth middleware / GET /auth/me', () => {
  it('returns 401 with no token', async () => {
    const app = makeApp();
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });

  it('returns 401 with an invalid token', async () => {
    const app = makeApp();
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });

  it('returns 200 with a valid Bearer token', async () => {
    const app = makeApp();
    const token = signToken({ sub: 1, email: 'user@example.com', role: 'member' }, SECRET);
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('user@example.com');
  });

  it('returns 200 with a valid cookie token', async () => {
    const app = makeApp();
    const token = signToken({ sub: 1, email: 'user@example.com', role: 'member' }, SECRET);
    const res = await request(app).get('/auth/me').set('Cookie', `token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('user@example.com');
  });
});
