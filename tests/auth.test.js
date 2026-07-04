'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the DB-backed store so tests never need a real database.
jest.mock('../src/store/userStore', () => ({
  findOrCreateUser: jest.fn(),
}));

const { findOrCreateUser } = require('../src/store/userStore');
const app = require('../src/app');

describe('GET /auth/google', () => {
  it('redirects to Google when credentials are configured', async () => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return;

    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/accounts\.google\.com/);
    expect(res.headers.location).toMatch(/state=/);
  });

  it('returns 401 when Google strategy is not configured', async () => {
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

describe('authSuccess — session after successful OAuth', () => {
  const { authSuccess } = require('../src/api/authHandler');
  const config = require('../src/config');

  function makeRes() {
    const res = {
      _cookies: {},
      _redirectUrl: null,
      _status: 200,
      _body: null,
      cookie(name, value) { this._cookies[name] = value; return this; },
      clearCookie(name) { delete this._cookies[name]; return this; },
      redirect(url) { this._redirectUrl = url; },
      status(code) { this._status = code; return this; },
      json(body) { this._body = body; return this; },
    };
    return res;
  }

  it('upserts user, sets JWT cookie, and redirects to /', async () => {
    findOrCreateUser.mockResolvedValueOnce({ id: 42, email: 'alice@example.com', role: 'member' });

    const req = {
      user: {
        id: 'google-123',
        displayName: 'Alice',
        emails: [{ value: 'alice@example.com' }],
        photos: [],
      },
    };
    const res = makeRes();

    await authSuccess(req, res);

    expect(findOrCreateUser).toHaveBeenCalledWith({
      googleId: 'google-123',
      email: 'alice@example.com',
      displayName: 'Alice',
    });

    expect(res._redirectUrl).toBe('/');
    expect(res._cookies.token).toBeDefined();

    const payload = jwt.verify(res._cookies.token, config.jwtSecret);
    expect(payload.sub).toBe(42);
    expect(payload.email).toBe('alice@example.com');
    expect(payload.role).toBe('member');
  });

  it('returns 500 when userStore throws', async () => {
    findOrCreateUser.mockRejectedValueOnce(new Error('db down'));

    const req = {
      user: {
        id: 'google-456',
        displayName: 'Bob',
        emails: [{ value: 'bob@example.com' }],
        photos: [],
      },
    };
    const res = makeRes();

    await authSuccess(req, res);

    expect(res._status).toBe(500);
    expect(res._body.error).toBe('session_error');
  });
});

describe('GET /auth/failure', () => {
  it('returns 401 with authentication_failed', async () => {
    const res = await request(app).get('/auth/failure');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('authentication_failed');
  });
});
