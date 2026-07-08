const request = require('supertest');

const mockGetToken = jest.fn();
const mockVerifyIdToken = jest.fn();
const mockGenerateAuthUrl = jest.fn(
  (opts) => `https://accounts.google.com/o/oauth2/v2/auth?state=${opts.state}`
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

const GOOGLE_PROFILE = { sub: 'google-e2e-42', email: 'e2e@example.com' };

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = 'test-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  resetUsers();
  resetSessions();
  // Stubbed Google OAuth provider: a valid code exchanges into a verifiable id_token.
  mockGetToken.mockResolvedValue({ tokens: { id_token: 'stub-id-token' } });
  mockVerifyIdToken.mockResolvedValue({ getPayload: () => GOOGLE_PROFILE });
});

// Reads the state value Google is redirected with (from the mocked auth URL).
function stateFromRedirect(res) {
  return new URL(res.headers.location).searchParams.get('state');
}

describe('SSO E2E: login → session → protected route → logout', () => {
  it('walks the full authenticated journey with a browser-like cookie jar', async () => {
    // A single agent persists cookies across requests, like a real browser.
    const agent = request.agent(app);

    // 1. Unauthenticated access to a protected route is denied.
    const before = await agent.get('/me');
    expect(before.status).toBe(401);
    expect(before.body.error).toBe('unauthenticated');

    // 2. Initiate login: redirect to Google, oauth_state cookie stored in the jar.
    const initiate = await agent.get('/google');
    expect(initiate.status).toBe(302);
    expect(initiate.headers.location).toContain('accounts.google.com');
    const state = stateFromRedirect(initiate);
    expect(state).toBeTruthy();

    // 3. Google redirects back to the callback with the same state + an auth code.
    //    The agent replays the oauth_state cookie automatically.
    const callback = await agent.get(`/google/callback?state=${state}&code=auth-code`);
    expect(callback.status).toBe(200);
    expect(callback.body).toMatchObject({
      email: GOOGLE_PROFILE.email,
      role: 'member',
    });
    // The stubbed provider was actually exercised.
    expect(mockGetToken).toHaveBeenCalledWith('auth-code');
    expect(mockVerifyIdToken).toHaveBeenCalledWith({ idToken: 'stub-id-token' });

    // 4. Session is active: the protected route now returns the user.
    const me = await agent.get('/me');
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      id: callback.body.id,
      email: GOOGLE_PROFILE.email,
      role: 'member',
    });

    // 5. Logout invalidates the session.
    const logout = await agent.post('/logout');
    expect(logout.status).toBe(204);

    // 6. The protected route is denied again after logout.
    const after = await agent.get('/me');
    expect(after.status).toBe(401);
    expect(after.body.error).toBe('unauthenticated');
  });
});
