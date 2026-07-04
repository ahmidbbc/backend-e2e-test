/**
 * End-to-end SSO flow tests.
 *
 * Every test runs against a fully wired Express app (no live Google or DB).
 * The app is built with buildAuthRouter so dependencies are injected.
 * Tests exercise the flow as chained steps, not isolated endpoints.
 */

const request = require('supertest');
const express = require('express');
const path = require('path');
const { buildAuthRouter } = require('../src/auth');
const { signToken, verifyToken } = require('../src/session');

const SECRET = 'e2e-test-secret';

const DEFAULT_USER = { id: 7, email: 'alice@example.com', role: 'member', google_id: 'g-alice', created_at: new Date() };

function makeOauthClient(overrides = {}) {
  return {
    _clientId: 'test-client-id',
    generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1'),
    getToken: jest.fn().mockResolvedValue({ tokens: { id_token: 'id-tok', access_token: 'acc-tok' } }),
    setCredentials: jest.fn(),
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: () => ({ sub: DEFAULT_USER.google_id, email: DEFAULT_USER.email }),
    }),
    ...overrides,
  };
}

function makeDb(rows = [DEFAULT_USER]) {
  return { query: jest.fn().mockResolvedValue({ rows }) };
}

function buildApp({ db, oauthClient, postLoginRedirect, errorRedirect } = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(buildAuthRouter({
    db: db || makeDb(),
    oauthClient: oauthClient || makeOauthClient(),
    redirectUri: 'http://localhost:3000/auth/google/callback',
    signFn: (p) => signToken(p, SECRET),
    requireAuthFn: require('../src/session').requireAuth((t) => verifyToken(t, SECRET)),
    postLoginRedirect,
    errorRedirect,
  }));
  return app;
}

// ─── 1. Full happy path ────────────────────────────────────────────────────────

describe('Full SSO flow — happy path', () => {
  let app, token;

  beforeAll(() => { app = buildApp(); });

  it('step 1: GET /auth/google → 302 to accounts.google.com', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/accounts\.google\.com/);
  });

  it('step 2: GET /auth/google/callback?code=X → 200, user + token in body, httpOnly cookie set', async () => {
    const res = await request(app).get('/auth/google/callback?code=auth-code');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: DEFAULT_USER.email, role: 'member' });
    expect(typeof res.body.token).toBe('string');

    const cookies = res.headers['set-cookie'] || [];
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toMatch(/HttpOnly/i);
    expect(tokenCookie).toMatch(/SameSite=Lax/i);

    token = res.body.token;
  });

  it('step 3: GET /auth/me with Bearer token → 200 with user payload', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(DEFAULT_USER.email);
    expect(res.body.user.sub).toBe(DEFAULT_USER.id);
  });

  it('step 4: GET /auth/me with cookie → 200', async () => {
    const res = await request(app).get('/auth/me').set('Cookie', `token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(DEFAULT_USER.email);
  });

  it('step 5: POST /auth/logout → 200 ok, token cookie cleared', async () => {
    const res = await request(app).post('/auth/logout').set('Cookie', `token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const cookies = res.headers['set-cookie'] || [];
    const cleared = cookies.find((c) => /^token=($|;)/.test(c) || /token=\s*;/.test(c));
    expect(cleared).toBeDefined();
  });

  it('step 6: GET /auth/me after logout (no cookie) → 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });
});

// ─── 2. DB upsert — new user vs returning user ─────────────────────────────────

describe('DB upsert behaviour', () => {
  it('calls INSERT … ON CONFLICT for a new user', async () => {
    const db = makeDb();
    const app = buildApp({ db });
    await request(app).get('/auth/google/callback?code=c1');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (email)'),
      [DEFAULT_USER.email, DEFAULT_USER.google_id]
    );
  });

  it('returns the upserted row from the DB', async () => {
    const returning = { ...DEFAULT_USER, id: 42 };
    const db = makeDb([returning]);
    const app = buildApp({ db });
    const res = await request(app).get('/auth/google/callback?code=c2');
    expect(res.body.user.id).toBe(42);
  });
});

// ─── 3. JWT payload integrity ──────────────────────────────────────────────────

describe('JWT session payload', () => {
  it('token contains sub=user.id, email, role', async () => {
    const app = buildApp();
    const res = await request(app).get('/auth/google/callback?code=c3');
    const payload = verifyToken(res.body.token, SECRET);
    expect(payload.sub).toBe(DEFAULT_USER.id);
    expect(payload.email).toBe(DEFAULT_USER.email);
    expect(payload.role).toBe('member');
  });

  it('token has an exp claim (24 h window)', async () => {
    const app = buildApp();
    const res = await request(app).get('/auth/google/callback?code=c4');
    const payload = verifyToken(res.body.token, SECRET);
    const ttl = payload.exp - payload.iat;
    expect(ttl).toBe(24 * 60 * 60);
  });
});

// ─── 4. Error cases — JSON mode (no redirects) ─────────────────────────────────

describe('Error handling — JSON mode', () => {
  it('returns 400 when Google sends error=access_denied', async () => {
    const app = buildApp();
    const res = await request(app).get('/auth/google/callback?error=access_denied');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('access_denied');
  });

  it('returns 400 when code is absent', async () => {
    const app = buildApp();
    const res = await request(app).get('/auth/google/callback');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing_code');
  });

  it('returns 400 when token exchange fails (invalid_grant)', async () => {
    const oauthClient = makeOauthClient({
      getToken: jest.fn().mockRejectedValue(new Error('invalid_grant')),
    });
    const app = buildApp({ oauthClient });
    const res = await request(app).get('/auth/google/callback?code=bad');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('token_exchange_failed');
    expect(res.body.detail).toContain('invalid_grant');
  });

  it('returns 400 when id_token verification fails', async () => {
    const oauthClient = makeOauthClient({
      verifyIdToken: jest.fn().mockRejectedValue(new Error('Token used too late')),
    });
    const app = buildApp({ oauthClient });
    const res = await request(app).get('/auth/google/callback?code=ok');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('id_token_invalid');
    expect(res.body.detail).toContain('too late');
  });
});

// ─── 5. Error cases — redirect mode (postLoginRedirect / errorRedirect) ─────────

describe('Error handling — redirect mode', () => {
  const opts = { postLoginRedirect: '/dashboard.html', errorRedirect: '/login.html' };

  it('redirects to errorRedirect on access_denied', async () => {
    const app = buildApp(opts);
    const res = await request(app).get('/auth/google/callback?error=access_denied');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login.html');
    expect(res.headers.location).toContain('error=access_denied');
  });

  it('redirects to errorRedirect when code is missing', async () => {
    const app = buildApp(opts);
    const res = await request(app).get('/auth/google/callback');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login.html');
    expect(res.headers.location).toContain('error=missing_code');
  });

  it('redirects to errorRedirect when token exchange fails', async () => {
    const oauthClient = makeOauthClient({
      getToken: jest.fn().mockRejectedValue(new Error('invalid_grant')),
    });
    const app = buildApp({ ...opts, oauthClient });
    const res = await request(app).get('/auth/google/callback?code=bad');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login.html');
    expect(res.headers.location).toContain('error=token_exchange_failed');
  });

  it('redirects to errorRedirect when id_token is invalid', async () => {
    const oauthClient = makeOauthClient({
      verifyIdToken: jest.fn().mockRejectedValue(new Error('expired')),
    });
    const app = buildApp({ ...opts, oauthClient });
    const res = await request(app).get('/auth/google/callback?code=ok');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login.html');
    expect(res.headers.location).toContain('error=id_token_invalid');
  });

  it('redirects to postLoginRedirect on success', async () => {
    const app = buildApp(opts);
    const res = await request(app).get('/auth/google/callback?code=good');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard.html');
  });

  it('sets the session cookie even when redirecting post-login', async () => {
    const app = buildApp(opts);
    const res = await request(app).get('/auth/google/callback?code=good');
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.find((c) => c.startsWith('token='))).toBeDefined();
  });
});

// ─── 6. Protected route — invalid / expired tokens ────────────────────────────

describe('Protected route — token validation', () => {
  let app;
  beforeAll(() => { app = buildApp(); });

  it('rejects a token signed with the wrong secret', async () => {
    const badToken = signToken({ sub: 1, email: 'x@x.com', role: 'member' }, 'wrong-secret');
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });

  it('rejects a structurally malformed token', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('rejects a token with a tampered payload', async () => {
    const token = signToken({ sub: 1, email: 'x@x.com', role: 'admin' }, SECRET);
    const [header, , sig] = token.split('.');
    const fakePayload = Buffer.from(JSON.stringify({ sub: 99, email: 'evil@example.com', role: 'admin' })).toString('base64url');
    const tampered = `${header}.${fakePayload}.${sig}`;
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 with no Authorization header and no cookie', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });
});

// ─── 7. Static pages are served ───────────────────────────────────────────────

describe('Static pages', () => {
  let app;
  beforeAll(() => { app = buildApp(); });

  it('serves /login.html', async () => {
    const res = await request(app).get('/login.html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Sign in with Google');
  });

  it('serves /dashboard.html', async () => {
    const res = await request(app).get('/dashboard.html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('/auth/me');
  });
});
