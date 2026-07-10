const { getSession, destroySession } = require('../services/sessions');

// Invalidates the current session. Returns true if an active session was
// destroyed, false when there was nothing to invalidate (missing/unknown sid).
// HTTP-agnostic so it can be exercised directly in unit tests.
function logout(sessionId) {
  if (!getSession(sessionId)) {
    return false;
  }
  destroySession(sessionId);
  return true;
}

module.exports = { logout };
