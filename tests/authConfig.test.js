const {
  getAuthConfig,
  SCOPES,
  DEFAULT_REDIRECT_URL,
  GOOGLE_ENDPOINTS,
} = require('../src/config/auth');

describe('getAuthConfig', () => {
  const KEYS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URL'];
  const saved = {};

  beforeEach(() => {
    KEYS.forEach((k) => {
      saved[k] = process.env[k];
      delete process.env[k];
    });
  });

  afterEach(() => {
    KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  it('throws when GOOGLE_CLIENT_ID is missing', () => {
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    expect(() => getAuthConfig()).toThrow(/Missing Google OAuth configuration/);
  });

  it('throws when GOOGLE_CLIENT_SECRET is missing', () => {
    process.env.GOOGLE_CLIENT_ID = 'client';
    expect(() => getAuthConfig()).toThrow(/Missing Google OAuth configuration/);
  });

  it('returns the config with the default redirect URL when none is set', () => {
    process.env.GOOGLE_CLIENT_ID = 'client';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';

    expect(getAuthConfig()).toEqual({
      clientId: 'client',
      clientSecret: 'secret',
      redirectUrl: DEFAULT_REDIRECT_URL,
      scopes: SCOPES,
      endpoints: GOOGLE_ENDPOINTS,
    });
  });

  it('honours GOOGLE_REDIRECT_URL when provided', () => {
    process.env.GOOGLE_CLIENT_ID = 'client';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    process.env.GOOGLE_REDIRECT_URL = 'https://example.com/cb';

    expect(getAuthConfig().redirectUrl).toBe('https://example.com/cb');
  });

  it('exposes the OpenID scopes and Google endpoints', () => {
    expect(SCOPES).toEqual(['openid', 'email', 'profile']);
    expect(GOOGLE_ENDPOINTS).toMatchObject({
      authorization: expect.stringContaining('accounts.google.com'),
      token: expect.stringContaining('oauth2.googleapis.com'),
      userInfo: expect.stringContaining('googleapis.com'),
    });
  });
});
