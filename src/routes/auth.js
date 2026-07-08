const crypto = require('crypto');
const express = require('express');
const { createOAuthClient, getAuthUrl } = require('../config/oauth');
const { findOrCreateByGoogle } = require('../services/users');
const { createSession, destroySession, TTL_MS } = require('../services/sessions');
const { requireAuth, SESSION_COOKIE } = require('../middleware/requireAuth');

const router = express.Router();

const STATE_COOKIE = 'oauth_state';
const STATE_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 5 * 60 * 1000,
};
const SESSION_COOKIE_OPTS = {
  httpOnly: true,
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

router.get('/google', (_req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, STATE_COOKIE_OPTS);
  const client = createOAuthClient();
  return res.redirect(getAuthUrl(client, state));
});

router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const cookieState = req.cookies && req.cookies[STATE_COOKIE];

  if (!state || !statesMatch(state, cookieState)) {
    return res.status(400).json({ error: 'invalid_state' });
  }
  res.clearCookie(STATE_COOKIE);

  if (!code) {
    return res.status(400).json({ error: 'missing_code' });
  }

  const client = createOAuthClient();

  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch (err) {
    return res.status(401).json({ error: 'token_exchange_failed' });
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_id_token' });
  }

  if (!payload || !payload.sub || !payload.email) {
    return res.status(401).json({ error: 'invalid_profile' });
  }

  const user = findOrCreateByGoogle({
    googleId: payload.sub,
    email: payload.email,
  });

  const sid = createSession(user);
  res.cookie(SESSION_COOKIE, sid, SESSION_COOKIE_OPTS);

  return res.json({ id: user.id, email: user.email, role: user.role });
});

router.get('/me', requireAuth, (req, res) => {
  const { id, email, role } = req.user;
  return res.json({ id, email, role });
});

router.post('/logout', (req, res) => {
  const sid = req.cookies && req.cookies[SESSION_COOKIE];
  destroySession(sid);
  res.clearCookie(SESSION_COOKIE);
  return res.status(204).end();
});

module.exports = router;
