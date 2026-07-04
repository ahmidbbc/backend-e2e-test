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

// ── OAuth redirect ────────────────────────────────────────────────────────────

describe('GET /auth/google', () => {
  it('redirects to Google OAuth consent screen', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/accounts\.google\.com/);
  });

  it('includes profile and email scopes in redirect URL', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.headers.location).toMatch(/scope=.*email/);
    expect(res.headers.location).toMatch(/scope=.*profile/);
  });
});

// ── Callback — no code ────────────────────────────────────────────────────────

describe('GET /auth/google/callback — no code', () => {
  it('redirects (302) when no authorization code is provided', async () => {
    const res = await request(app).get('/auth/google/callback');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBeTruthy();
  });
});

// ── Failure route ─────────────────────────────────────────────────────────────

describe('GET /auth/failure', () => {
  it('returns 401 authentication_failed', async () => {
    const res = await request(app).get('/auth/failure');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('authentication_failed');
  });
});

// ── JWT helpers ───────────────────────────────────────────────────────────────

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
