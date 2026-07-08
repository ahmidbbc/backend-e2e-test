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
const { reset: resetSessions } = require('../src/services/sessions');

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
