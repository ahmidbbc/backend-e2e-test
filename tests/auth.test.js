const request = require('supertest');

const mockGetToken = jest.fn();
const mockVerifyIdToken = jest.fn();
const mockGenerateAuthUrl = jest.fn(
  () => 'https://accounts.google.com/o/oauth2/v2/auth?state=x'
);

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
    getToken: mockGetToken,
    verifyIdToken: mockVerifyIdToken,
  })),
}));

const app = require('../src/app');
const { reset: resetUsers } = require('../src/services/users');
const { reset: resetSessions, TTL_MS } = require('../src/services/sessions');

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = 'test-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  resetUsers();
  resetSessions();
});

// Extracts a named cookie's value from a Set-Cookie header array.
function extractCookie(res, name) {
  const setCookie = res.headers['set-cookie'] || [];
  const cookie = setCookie.find((c) => c.startsWith(`${name}=`));
  return cookie ? cookie.split(';')[0].split('=')[1] : null;
}

// Drives a full successful login and returns the session cookie value.
async function login() {
  mockGetToken.mockResolvedValue({ tokens: { id_token: 'tok' } });
  mockVerifyIdToken.mockResolvedValue({
    getPayload: () => ({ sub: 'google-123', email: 'user@example.com' }),
  });
  const res = await request(app)
    .get('/google/callback?state=s&code=good')
    .set('Cookie', 'oauth_state=s');
  return extractCookie(res, 'sid');
}

describe('GET /google', () => {
  it('redirects (302) to Google with a state cookie', async () => {
    const res = await request(app).get('/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('accounts.google.com');
    expect(extractCookie(res, 'oauth_state')).toBeTruthy();
  });
});

describe('GET /google/callback', () => {
  it('400 when state query param is missing', async () => {
    const res = await request(app).get('/google/callback?code=abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_state');
  });

  it('400 when state does not match the cookie', async () => {
    const res = await request(app)
      .get('/google/callback?code=abc&state=wrong')
      .set('Cookie', 'oauth_state=right');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_state');
  });

  it('400 when code is missing', async () => {
    const res = await request(app)
      .get('/google/callback?state=s')
      .set('Cookie', 'oauth_state=s');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing_code');
  });

  it('401 when token exchange fails (invalid code)', async () => {
    mockGetToken.mockRejectedValueOnce(new Error('invalid_grant'));
    const res = await request(app)
      .get('/google/callback?state=s&code=bad')
      .set('Cookie', 'oauth_state=s');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('token_exchange_failed');
  });

  it('401 when id_token verification fails', async () => {
    mockGetToken.mockResolvedValueOnce({ tokens: { id_token: 'tok' } });
    mockVerifyIdToken.mockRejectedValueOnce(new Error('bad token'));
    const res = await request(app)
      .get('/google/callback?state=s&code=good')
      .set('Cookie', 'oauth_state=s');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_id_token');
  });

  it('401 when the verified profile is missing sub/email', async () => {
    mockGetToken.mockResolvedValueOnce({ tokens: { id_token: 'tok' } });
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ sub: 'google-123' }),
    });
    const res = await request(app)
      .get('/google/callback?state=s&code=good')
      .set('Cookie', 'oauth_state=s');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_profile');
  });

  it('200 returns the user on success and creates then reuses it', async () => {
    mockGetToken.mockResolvedValue({ tokens: { id_token: 'tok' } });
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'google-123', email: 'user@example.com' }),
    });

    const res = await request(app)
      .get('/google/callback?state=s&code=good')
      .set('Cookie', 'oauth_state=s');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      email: 'user@example.com',
      role: 'member',
    });
    // A session cookie is issued on successful login.
    expect(extractCookie(res, 'sid')).toBeTruthy();

    // Same Google user → same record, no new id.
    const res2 = await request(app)
      .get('/google/callback?state=s&code=good')
      .set('Cookie', 'oauth_state=s');
    expect(res2.body.id).toBe(1);
  });

  it('sets the session cookie with HttpOnly and SameSite attributes', async () => {
    mockGetToken.mockResolvedValue({ tokens: { id_token: 'tok' } });
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'google-123', email: 'user@example.com' }),
    });

    const res = await request(app)
      .get('/google/callback?state=s&code=good')
      .set('Cookie', 'oauth_state=s');

    const sidCookie = (res.headers['set-cookie'] || []).find((c) => c.startsWith('sid='));
    expect(sidCookie).toMatch(/HttpOnly/i);
    expect(sidCookie).toMatch(/SameSite=Lax/i);
    // Not Secure over plain HTTP outside production.
    expect(sidCookie).not.toMatch(/Secure/i);
  });

  it('marks the session cookie Secure in production', async () => {
    mockGetToken.mockResolvedValue({ tokens: { id_token: 'tok' } });
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'google-123', email: 'user@example.com' }),
    });

    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      let prodApp;
      jest.isolateModules(() => {
        prodApp = require('../src/app');
      });

      const res = await request(prodApp)
        .get('/google/callback?state=s&code=good')
        .set('Cookie', 'oauth_state=s');

      const sidCookie = (res.headers['set-cookie'] || []).find((c) => c.startsWith('sid='));
      expect(sidCookie).toMatch(/Secure/i);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});

describe('session & requireAuth (GET /me)', () => {
  it('200 returns the current user with a valid session cookie', async () => {
    const sid = await login();
    expect(sid).toBeTruthy();

    const res = await request(app).get('/me').set('Cookie', `sid=${sid}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      email: 'user@example.com',
      role: 'member',
    });
  });

  it('401 when the session cookie is absent', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });

  it('401 when the session cookie is invalid', async () => {
    const res = await request(app).get('/me').set('Cookie', 'sid=bogus');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });

  it('401 once the session has expired past its TTL', async () => {
    const sid = await login();

    // Jump past the session TTL so getSession treats it as expired.
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(Date.now() + TTL_MS + 1);
    try {
      const res = await request(app).get('/me').set('Cookie', `sid=${sid}`);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthenticated');
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('logout destroys the session so /me returns 401', async () => {
    const sid = await login();

    const logoutRes = await request(app)
      .post('/logout')
      .set('Cookie', `sid=${sid}`);
    expect(logoutRes.status).toBe(204);

    const meRes = await request(app).get('/me').set('Cookie', `sid=${sid}`);
    expect(meRes.status).toBe(401);
  });
});

describe('POST /logout', () => {
  it('204 and clears the session cookie on success', async () => {
    const sid = await login();

    const res = await request(app).post('/logout').set('Cookie', `sid=${sid}`);
    expect(res.status).toBe(204);

    // The sid cookie is cleared (expired) in the response.
    const setCookie = res.headers['set-cookie'] || [];
    const cleared = setCookie.find((c) => c.startsWith('sid='));
    expect(cleared).toBeTruthy();
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('a second logout with the same cookie returns 401 (session gone)', async () => {
    const sid = await login();
    await request(app).post('/logout').set('Cookie', `sid=${sid}`);

    const res = await request(app).post('/logout').set('Cookie', `sid=${sid}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });

  it('401 when logging out without a session cookie', async () => {
    const res = await request(app).post('/logout');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });

  it('401 when logging out with an invalid session cookie', async () => {
    const res = await request(app).post('/logout').set('Cookie', 'sid=bogus');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });
});
