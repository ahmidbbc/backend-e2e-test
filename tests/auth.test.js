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
  it('returns 400 when state param is missing', async () => {
    const res = await request(app).get('/auth/google/callback?code=abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/state/i);
  });

  it('returns 400 when state does not match the cookie', async () => {
    const res = await request(app)
      .get('/auth/google/callback?code=abc&state=wrongstate1234567890123456789012')
      .set('Cookie', 'oauth_state=correctstate1234567890123456789');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/state/i);
  });

  it('returns 400 when code param is missing but state matches', async () => {
    const state = 'a'.repeat(32);
    const res = await request(app)
      .get(`/auth/google/callback?state=${state}`)
      .set('Cookie', `oauth_state=${state}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/code/i);
  });

  it('returns 401 when Google token exchange fails', async () => {
    const { OAuth2Client } = require('google-auth-library');
    const getToken = jest.spyOn(OAuth2Client.prototype, 'getToken').mockRejectedValueOnce(
      Object.assign(new Error('invalid_grant'), {
        response: { status: 400, data: { error_description: 'invalid_grant' } },
      })
    );
    const state = 'b'.repeat(32);
    const res = await request(app)
      .get(`/auth/google/callback?code=badcode&state=${state}`)
      .set('Cookie', `oauth_state=${state}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    getToken.mockRestore();
  });
});
