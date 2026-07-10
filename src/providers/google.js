const { OAuth2Client } = require('google-auth-library');
const { getAuthConfig, SCOPES } = require('../config/auth');

// Raised for expected OAuth failures; `code` maps directly to the API error body.
class GoogleAuthError extends Error {
  constructor(code) {
    super(code);
    this.name = 'GoogleAuthError';
    this.code = code;
  }
}

function createClient() {
  const { clientId, clientSecret, redirectUrl } = getAuthConfig();
  return new OAuth2Client(clientId, clientSecret, redirectUrl);
}

function getAuthorizationUrl(state) {
  return createClient().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
  });
}

async function exchangeCodeForProfile(code) {
  const client = createClient();

  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch (err) {
    throw new GoogleAuthError('token_exchange_failed');
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token });
    payload = ticket.getPayload();
  } catch (err) {
    throw new GoogleAuthError('invalid_id_token');
  }

  if (!payload || !payload.sub || !payload.email) {
    throw new GoogleAuthError('invalid_profile');
  }

  return { googleId: payload.sub, email: payload.email };
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForProfile,
  GoogleAuthError,
  SCOPES,
};
