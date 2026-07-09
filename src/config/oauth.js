const { OAuth2Client } = require('google-auth-library');
const { getAuthConfig, SCOPES } = require('./auth');

function createOAuthClient() {
  const { clientId, clientSecret, redirectUrl } = getAuthConfig();
  return new OAuth2Client(clientId, clientSecret, redirectUrl);
}

function getAuthUrl(client, state) {
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
  });
}

module.exports = { createOAuthClient, getAuthUrl, SCOPES };
