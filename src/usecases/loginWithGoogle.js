const { exchangeCodeForProfile } = require('../providers/google');
const { findOrCreateByGoogle } = require('../services/users');
const { createSession } = require('../services/sessions');

// Orchestrates the Google login: authorization code -> profile -> user -> session.
// HTTP-agnostic so it can be exercised directly in unit tests.
async function loginWithGoogle(code) {
  const profile = await exchangeCodeForProfile(code);
  const user = findOrCreateByGoogle(profile);
  const sessionId = createSession(user);
  return { user, sessionId };
}

module.exports = { loginWithGoogle };
