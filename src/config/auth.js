const SCOPES = ['openid', 'email', 'profile'];
const DEFAULT_REDIRECT_URL = 'http://localhost:3000/google/callback';

function getAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUrl = process.env.GOOGLE_REDIRECT_URL || DEFAULT_REDIRECT_URL;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Google OAuth configuration: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'
    );
  }

  return { clientId, clientSecret, redirectUrl, scopes: SCOPES };
}

module.exports = { getAuthConfig, SCOPES, DEFAULT_REDIRECT_URL };
