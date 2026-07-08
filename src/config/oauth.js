const { OAuth2Client } = require('google-auth-library');

const SCOPES = ['openid', 'email', 'profile'];
const REDIRECT_URL =
  process.env.GOOGLE_REDIRECT_URL || 'http://localhost:3000/google/callback';

function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Google OAuth configuration: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'
    );
  }

  return new OAuth2Client(clientId, clientSecret, REDIRECT_URL);
}

function getAuthUrl(client, state) {
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
  });
}

module.exports = { createOAuthClient, getAuthUrl, SCOPES, REDIRECT_URL };
