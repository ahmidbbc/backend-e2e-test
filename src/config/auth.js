const SCOPES = ['openid', 'email', 'profile'];
const DEFAULT_REDIRECT_URL = 'http://localhost:3000/google/callback';

const GOOGLE_ENDPOINTS = {
  authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  userInfo: 'https://openidconnect.googleapis.com/v1/userinfo',
};

function getAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUrl = process.env.GOOGLE_REDIRECT_URL || DEFAULT_REDIRECT_URL;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Google OAuth configuration: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUrl,
    scopes: SCOPES,
    endpoints: GOOGLE_ENDPOINTS,
  };
}

module.exports = { getAuthConfig, SCOPES, DEFAULT_REDIRECT_URL, GOOGLE_ENDPOINTS };
