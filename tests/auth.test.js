const request = require('supertest');

jest.mock('../src/db', () => ({
  upsertUser: jest.fn().mockResolvedValue({
    id: 1,
    email: 'test@example.com',
    role: 'member',
    google_id: 'gid-123',
  }),
}));

const app = require('../src/app');
const { signToken, verifyToken } = require('../src/jwt');

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

describe('jwt helpers', () => {
  it('signToken produces a token verifiable by verifyToken', () => {
    const token = signToken({ sub: 42, email: 'a@b.com', role: 'member' });
    const payload = verifyToken(token);
    expect(payload.sub).toBe(42);
    expect(payload.email).toBe('a@b.com');
    expect(payload.role).toBe('member');
  });

  it('verifyToken throws on a tampered token', () => {
    expect(() => verifyToken('not.a.valid.token')).toThrow();
  });
});

describe('GET /me', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing_token');
  });

  it('returns user payload with valid Bearer token', async () => {
    const token = signToken({ sub: 1, email: 'test@example.com', role: 'member' });
    const res = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/me')
      .set('Authorization', 'Bearer tampered.token.here');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_token');
  });
});
