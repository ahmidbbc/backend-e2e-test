const mockGetToken = jest.fn();
const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    getToken: mockGetToken,
    verifyIdToken: mockVerifyIdToken,
  })),
}));

const { loginWithGoogle } = require('../src/usecases/loginWithGoogle');
const { GoogleAuthError } = require('../src/providers/google');
const { reset: resetUsers } = require('../src/services/users');
const { reset: resetSessions, getSession } = require('../src/services/sessions');

const PROFILE = { sub: 'google-uc-1', email: 'uc@example.com' };

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = 'test-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  resetUsers();
  resetSessions();
});

describe('loginWithGoogle usecase (no HTTP)', () => {
  it('exchanges the code, creates the user and an active session', async () => {
    mockGetToken.mockResolvedValue({ tokens: { id_token: 'tok' } });
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => PROFILE });

    const { user, sessionId } = await loginWithGoogle('auth-code');

    expect(mockGetToken).toHaveBeenCalledWith('auth-code');
    expect(user).toMatchObject({ id: 1, email: PROFILE.email, role: 'member' });
    expect(getSession(sessionId)).toMatchObject({ userId: user.id });
  });

  it('reuses an existing user for the same Google identity', async () => {
    mockGetToken.mockResolvedValue({ tokens: { id_token: 'tok' } });
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => PROFILE });

    const first = await loginWithGoogle('code-1');
    const second = await loginWithGoogle('code-2');

    expect(second.user.id).toBe(first.user.id);
    expect(second.sessionId).not.toBe(first.sessionId);
  });

  it('propagates a GoogleAuthError when the code exchange fails', async () => {
    mockGetToken.mockRejectedValueOnce(new Error('invalid_grant'));

    await expect(loginWithGoogle('bad')).rejects.toMatchObject({
      name: 'GoogleAuthError',
      code: 'token_exchange_failed',
    });
    expect(GoogleAuthError).toBeDefined();
  });
});
