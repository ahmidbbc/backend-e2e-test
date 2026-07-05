const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL || 'http://localhost:3000/auth/google/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
}

const SCOPES = ['openid', 'email', 'profile'];

const oauthClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

function getAuthUrl() {
  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
}

module.exports = { oauthClient, getAuthUrl, SCOPES };
