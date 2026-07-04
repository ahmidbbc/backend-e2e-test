/**
 * Tests for the /auth/google/callback success path.
 * passport.authenticate is mocked at module-load time (jest.mock is hoisted)
 * so the already-registered middleware uses the stub from the start.
 */

jest.mock('passport', () => {
  const actual = jest.requireActual('passport');
  const instance = new actual.Passport();
  instance.authenticate = jest.fn(() => (req, _res, next) => {
    req.user = { id: 1, email: 'test@example.com', role: 'member' };
    next();
  });
  return instance;
});

jest.mock('../src/db', () => ({
  upsertUser: jest.fn().mockResolvedValue({
    id: 1,
    email: 'test@example.com',
    role: 'member',
    google_id: 'gid-123',
  }),
}));

const request = require('supertest');
const app = require('../src/app');
const { verifyToken } = require('../src/jwt');

describe('GET /auth/google/callback — valid code', () => {
  it('returns 200 with a signed JWT in the response body', async () => {
    const res = await request(app).get('/auth/google/callback?code=valid-code');
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    const payload = verifyToken(res.body.token);
    expect(payload.sub).toBe(1);
    expect(payload.email).toBe('test@example.com');
    expect(payload.role).toBe('member');
  });

  it('sets an httpOnly cookie named token', async () => {
    const res = await request(app).get('/auth/google/callback?code=valid-code');
    const cookies = res.headers['set-cookie'] ?? [];
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeTruthy();
    expect(tokenCookie).toMatch(/HttpOnly/i);
  });
});
