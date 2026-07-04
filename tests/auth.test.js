const request = require('supertest');

// Mock must be declared before requiring app / auth
jest.mock('google-auth-library', () => {
  const mockGenerateAuthUrl = jest.fn(() => 'https://accounts.google.com/o/oauth2/auth?mock=1');
  const mockGetToken = jest.fn();
  const mockVerifyIdToken = jest.fn();

  const MockOAuth2Client = jest.fn().mockImplementation(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
    getToken: mockGetToken,
    verifyIdToken: mockVerifyIdToken,
  }));

  MockOAuth2Client._mockGenerateAuthUrl = mockGenerateAuthUrl;
  MockOAuth2Client._mockGetToken = mockGetToken;
  MockOAuth2Client._mockVerifyIdToken = mockVerifyIdToken;

  return { OAuth2Client: MockOAuth2Client };
});

const { OAuth2Client } = require('google-auth-library');
const app = require('../src/app');

const mockGetToken = OAuth2Client._mockGetToken;
const mockVerifyIdToken = OAuth2Client._mockVerifyIdToken;

describe('GET /auth/google', () => {
  it('redirects to Google auth URL', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/accounts\.google\.com/);
  });
});

describe('GET /auth/google/callback', () => {
  it('returns 400 when code is missing', async () => {
    const res = await request(app).get('/auth/google/callback?state=abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing_code_or_state');
  });

  it('returns 400 when state is missing', async () => {
    const res = await request(app).get('/auth/google/callback?code=abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing_code_or_state');
  });

  it('returns 400 when token exchange fails', async () => {
    mockGetToken.mockRejectedValueOnce(new Error('bad code'));
    const res = await request(app).get('/auth/google/callback?code=bad&state=s');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('token_exchange_failed');
  });

  it('returns 400 when response has no id_token', async () => {
    mockGetToken.mockResolvedValueOnce({ tokens: {} });
    const res = await request(app).get('/auth/google/callback?code=ok&state=s');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('no_id_token');
  });

  it('returns 401 when id_token verification fails', async () => {
    mockGetToken.mockResolvedValueOnce({ tokens: { id_token: 'bad-jwt' } });
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid'));
    const res = await request(app).get('/auth/google/callback?code=ok&state=s');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_id_token');
  });

  it('returns user payload on success', async () => {
    mockGetToken.mockResolvedValueOnce({ tokens: { id_token: 'valid-jwt' } });
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ email: 'user@example.com', sub: '12345', name: 'Test User' }),
    });
    const res = await request(app).get('/auth/google/callback?code=ok&state=s');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: 'user@example.com', sub: '12345', name: 'Test User' });
  });
});
