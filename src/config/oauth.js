const { OAuth2Client } = require('google-auth-library');

const REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL || 'http://localhost:3000/auth/google/callback';
const SCOPES = ['openid', 'email', 'profile'];

function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
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
