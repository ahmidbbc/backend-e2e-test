const request = require('supertest');
const express = require('express');
const { buildAuthRouter } = require('../src/auth');

function makeApp(overrides = {}) {
  const app = express();
  app.use(express.json());

  const db = overrides.db || {
    query: jest.fn().mockResolvedValue({ rows: [{ id: 1, email: 'user@example.com', role: 'member', google_id: '123', created_at: new Date() }] }),
  };

  const oauthClient = overrides.oauthClient || {
    _clientId: 'test-client-id',
    generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?mock=1'),
    getToken: jest.fn().mockResolvedValue({ tokens: { id_token: 'mock-id-token', access_token: 'mock-access-token' } }),
    setCredentials: jest.fn(),
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: () => ({ sub: '123', email: 'user@example.com', name: 'Test User' }),
    }),
  };

  const redirectUri = 'http://localhost:3000/auth/google/callback';
  app.use(buildAuthRouter({ db, oauthClient, redirectUri }));
  return { app, db, oauthClient };
}

describe('GET /auth/google', () => {
  it('redirects to Google authorization URL', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('accounts.google.com');
  });
});

describe('GET /auth/google/callback', () => {
  it('returns user on valid code', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/auth/google/callback?code=valid-code');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'user@example.com', role: 'member' });
  });

  it('returns 400 when code is missing', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/auth/google/callback');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing_code');
  });

  it('returns 400 when Google returns an error param', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/auth/google/callback?error=access_denied');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('access_denied');
  });

  it('returns 400 when token exchange fails', async () => {
    const { app } = makeApp({
      oauthClient: {
        _clientId: 'test-client-id',
        generateAuthUrl: jest.fn(),
        getToken: jest.fn().mockRejectedValue(new Error('invalid_grant')),
        setCredentials: jest.fn(),
        verifyIdToken: jest.fn(),
      },
    });
    const res = await request(app).get('/auth/google/callback?code=bad-code');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('token_exchange_failed');
  });

  it('upserts user in db with google_id and email', async () => {
    const db = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: 1, email: 'user@example.com', role: 'member', google_id: '123', created_at: new Date() }] }),
    };
    const { app } = makeApp({ db });
    await request(app).get('/auth/google/callback?code=valid-code');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (email)'),
      ['user@example.com', '123']
    );
  });
});
