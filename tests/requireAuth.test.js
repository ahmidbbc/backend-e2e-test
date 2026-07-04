const request = require('supertest');

jest.mock('../src/db', () => ({
  upsertUser: jest.fn(),
}));

const app = require('../src/app');
const { signToken } = require('../src/jwt');

describe('requireAuth middleware', () => {
  describe('GET /me — no token', () => {
    it('returns 401 missing_token', async () => {
      const res = await request(app).get('/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('missing_token');
    });
  });

  describe('GET /me — invalid token', () => {
    it('returns 401 invalid_token for a malformed JWT', async () => {
      const res = await request(app)
        .get('/me')
        .set('Authorization', 'Bearer not.a.valid.jwt');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid_token');
    });

    it('returns 401 invalid_token for a tampered JWT', async () => {
      const token = signToken({ sub: 1, email: 'x@y.com', role: 'member' });
      const tampered = token.slice(0, -5) + 'XXXXX';
      const res = await request(app)
        .get('/me')
        .set('Authorization', `Bearer ${tampered}`);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid_token');
    });
  });

  describe('GET /me — valid Bearer token', () => {
    it('returns 200 with user payload', async () => {
      const token = signToken({ sub: 7, email: 'a@b.com', role: 'member' });
      const res = await request(app)
        .get('/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.sub).toBe(7);
      expect(res.body.user.email).toBe('a@b.com');
    });
  });

  describe('GET /me — valid cookie token', () => {
    it('returns 200 with user payload', async () => {
      const token = signToken({ sub: 8, email: 'b@c.com', role: 'admin' });
      const res = await request(app)
        .get('/me')
        .set('Cookie', `token=${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
    });
  });
});
