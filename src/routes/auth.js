const crypto = require('crypto');
const express = require('express');
const { getAuthorizationUrl, GoogleAuthError } = require('../providers/google');
const { loginWithGoogle } = require('../usecases/loginWithGoogle');
const { logout } = require('../usecases/logout');
const { TTL_MS } = require('../services/sessions');
const { requireAuth, SESSION_COOKIE } = require('../middleware/requireAuth');
const { authRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Rate limiting is applied per-route (first in each chain, before requireAuth)
// so it covers only the Google OAuth endpoints and never leaks onto other
// paths that fall through this router.

const STATE_COOKIE = 'oauth_state';
const STATE_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 5 * 60 * 1000,
};
const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  // Secure only in production: browsers (and the test cookie jar) drop Secure
  // cookies over plain HTTP, which local dev and the test server use.
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: TTL_MS,
};

function statesMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

router.get('/google', authRateLimiter, (_req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, STATE_COOKIE_OPTS);
  return res.redirect(getAuthorizationUrl(state));
});

router.get('/google/callback', authRateLimiter, async (req, res) => {
  const { code, state } = req.query;
  const cookieState = req.cookies && req.cookies[STATE_COOKIE];

  if (!state || !statesMatch(state, cookieState)) {
    return res.status(400).json({ error: 'invalid_state' });
  }
  res.clearCookie(STATE_COOKIE);

  if (!code) {
    return res.status(400).json({ error: 'missing_code' });
  }

  let user;
  let sessionId;
  try {
    ({ user, sessionId } = await loginWithGoogle(code));
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      return res.status(401).json({ error: err.code });
    }
    throw err;
  }

  res.cookie(SESSION_COOKIE, sessionId, SESSION_COOKIE_OPTS);

  return res.json({ id: user.id, email: user.email, role: user.role });
});

router.get('/me', authRateLimiter, requireAuth, (req, res) => {
  const { id, email, role } = req.user;
  return res.json({ id, email, role });
});

router.post('/logout', authRateLimiter, requireAuth, (req, res) => {
  const sid = req.cookies && req.cookies[SESSION_COOKIE];
  logout(sid);
  res.clearCookie(SESSION_COOKIE);
  return res.status(204).end();
});

module.exports = router;
