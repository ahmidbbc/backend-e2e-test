const crypto = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';

const app = require('../src/app');
const { OAuth2Client } = require('google-auth-library');
const verifyIdTokenMod = require('../src/verifyIdToken');
const db = require('../src/db');

// ── helpers ──────────────────────────────────────────────────────────────────

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

let rsaPrivate, jwk;

beforeAll(() => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  rsaPrivate = privateKey;
  const raw = publicKey.export({ format: 'jwk' });
  jwk = { ...raw, kid: 'cb-kid', use: 'sig', alg: 'RS256' };
});

function makeIdToken({ exp } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', kid: 'cb-kid' };
  const payload = {
    iss: 'https://accounts.google.com',
    aud: 'test-client-id',
    sub: 'google-sub-001',
    email: 'alice@example.com',
    name: 'Alice',
    picture: 'https://example.com/alice.jpg',
    iat: now - 5,
    exp: exp ?? now + 3600,
  };
  const he = b64url(Buffer.from(JSON.stringify(header)));
  const pe = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${he}.${pe}`), rsaPrivate);
  return `${he}.${pe}.${b64url(sig)}`;
}

function mockGoogleFetch(idToken) {
  global.fetch = jest.fn(async (url) => {
    if (url.includes('openid-configuration')) {
      return { ok: true, json: async () => ({ jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs' }) };
    }
    return { ok: true, json: async () => ({ keys: [jwk] }) };
  });
}

// Stub client.getToken to return a fake id_token
function stubGetToken(idToken) {
  return jest.spyOn(OAuth2Client.prototype, 'getToken').mockResolvedValue({
    tokens: { id_token: idToken, access_token: 'fake-access' },
  });
}

// Stub db.upsertUser
function stubDb(override) {
  return jest.spyOn(db, 'upsertUser').mockResolvedValue(
    override ?? { id: 42, email: 'alice@example.com', role: 'member' }
  );
}

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('GET /auth/google/callback — happy path', () => {
  it('returns a signed JWT with sub, email, role after successful flow', async () => {
    const idToken = makeIdToken();
    mockGoogleFetch();
    const getToken = stubGetToken(idToken);
    const upsert = stubDb();
    const state = 'c'.repeat(32);

    const res = await request(app)
      .get(`/auth/google/callback?code=valid-code&state=${state}`)
      .set('Cookie', `oauth_state=${state}`);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    const decoded = jwt.verify(res.body.token, 'test-secret');
    expect(decoded.sub).toBe('42');
    expect(decoded.email).toBe('alice@example.com');
    expect(decoded.role).toBe('member');
    expect(decoded.exp - decoded.iat).toBe(86400);

    getToken.mockRestore();
    upsert.mockRestore();
  });
});

describe('GET /auth/google/callback — invalid state', () => {
  it('returns 400 when state cookie is absent', async () => {
    const res = await request(app)
      .get('/auth/google/callback?code=x&state=d'.repeat(32));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/state/i);
  });

  it('returns 400 when state value does not match cookie', async () => {
    const state = 'e'.repeat(32);
    const res = await request(app)
      .get(`/auth/google/callback?code=x&state=${'f'.repeat(32)}`)
      .set('Cookie', `oauth_state=${state}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/state/i);
  });
});

describe('GET /auth/google/callback — expired id_token', () => {
  it('returns 401 when id_token is expired', async () => {
    const now = Math.floor(Date.now() / 1000);
    const idToken = makeIdToken({ exp: now - 60 });
    mockGoogleFetch();
    const getToken = stubGetToken(idToken);
    const state = 'g'.repeat(32);

    const res = await request(app)
      .get(`/auth/google/callback?code=any&state=${state}`)
      .set('Cookie', `oauth_state=${state}`);

    expect(res.status).toBe(401);
    getToken.mockRestore();
  });
});
