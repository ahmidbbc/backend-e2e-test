const request = require('supertest');
const app = require('../src/app');

describe('GET /auth/google', () => {
  it('redirects to Google OAuth with a location header', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/accounts\.google\.com/);
  });

  it('includes a state param in the redirect URL', async () => {
    const res = await request(app).get('/auth/google');
    const location = new URL(res.headers.location);
    expect(location.searchParams.get('state')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('sets an oauth_state cookie', async () => {
    const res = await request(app).get('/auth/google');
    const setCookie = res.headers['set-cookie'] || [];
    expect(setCookie.some(c => c.startsWith('oauth_state='))).toBe(true);
  });
});

describe('GET /auth/google/callback', () => {
  it('returns 400 when code param is missing', async () => {
    const res = await request(app).get('/auth/google/callback');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
