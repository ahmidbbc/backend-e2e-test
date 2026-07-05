const crypto = require('crypto');
const { verifyIdToken } = require('../src/verifyIdToken');

const AUDIENCE = 'test-client-id';
const ISSUER = 'https://accounts.google.com';

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

let rsaPrivate, rsaPublic, jwk;

beforeAll(() => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  rsaPrivate = privateKey;
  rsaPublic = publicKey;
  const raw = publicKey.export({ format: 'jwk' });
  jwk = { ...raw, kid: 'test-kid', use: 'sig', alg: 'RS256' };
});

function makeToken({ exp, iss, aud, sub, email, name, picture, kid = 'test-kid', alg = 'RS256' } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg, kid };
  const payload = {
    iss: iss ?? ISSUER,
    aud: aud ?? AUDIENCE,
    sub: sub ?? 'user-123',
    email: email ?? 'test@example.com',
    name: name ?? 'Test User',
    picture: picture ?? 'https://example.com/pic.jpg',
    iat: now - 10,
    exp: exp ?? now + 3600,
  };
  const headerEnc = b64url(Buffer.from(JSON.stringify(header)));
  const payloadEnc = b64url(Buffer.from(JSON.stringify(payload)));
  const signingInput = Buffer.from(`${headerEnc}.${payloadEnc}`);
  const sig = crypto.sign('RSA-SHA256', signingInput, rsaPrivate);
  return `${headerEnc}.${payloadEnc}.${b64url(sig)}`;
}

function mockFetch(token) {
  global.fetch = jest.fn(async (url) => {
    if (url.includes('openid-configuration')) {
      return { ok: true, json: async () => ({ jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs' }) };
    }
    if (url.includes('certs')) {
      return { ok: true, json: async () => ({ keys: [jwk] }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

describe('verifyIdToken', () => {
  it('verifies a valid token and returns sub, email, name, picture', async () => {
    mockFetch();
    const profile = await verifyIdToken(makeToken(), AUDIENCE);
    expect(profile).toEqual({
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/pic.jpg',
    });
  });

  it('rejects an expired token', async () => {
    mockFetch();
    const now = Math.floor(Date.now() / 1000);
    await expect(verifyIdToken(makeToken({ exp: now - 1 }), AUDIENCE)).rejects.toThrow(/expired/i);
  });

  it('rejects an invalid issuer', async () => {
    mockFetch();
    await expect(verifyIdToken(makeToken({ iss: 'https://evil.com' }), AUDIENCE)).rejects.toThrow(/issuer/i);
  });

  it('rejects a wrong audience', async () => {
    mockFetch();
    await expect(verifyIdToken(makeToken({ aud: 'other-client' }), AUDIENCE)).rejects.toThrow(/audience/i);
  });

  it('rejects when no matching key found in JWKS', async () => {
    global.fetch = jest.fn(async (url) => {
      if (url.includes('openid-configuration')) {
        return { ok: true, json: async () => ({ jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs' }) };
      }
      return { ok: true, json: async () => ({ keys: [] }) };
    });
    await expect(verifyIdToken(makeToken(), AUDIENCE)).rejects.toThrow(/No key found/i);
  });

  it('rejects a tampered payload', async () => {
    mockFetch();
    const token = makeToken();
    const parts = token.split('.');
    // Flip one byte in the payload
    const decoded = Buffer.from(parts[1], 'base64');
    decoded[0] ^= 0xff;
    parts[1] = b64url(decoded);
    const tampered = parts.join('.');
    await expect(verifyIdToken(tampered, AUDIENCE)).rejects.toThrow();
  });

  it('rejects a malformed token', async () => {
    mockFetch();
    await expect(verifyIdToken('not.a.valid.jwt.parts', AUDIENCE)).rejects.toThrow(/Malformed/i);
  });
});
