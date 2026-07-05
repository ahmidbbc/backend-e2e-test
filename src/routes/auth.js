const express = require('express');
const crypto = require('crypto');
const { createOAuthClient, getAuthUrl } = require('../config/oauth');
const { signToken } = require('../services/jwt');

const router = express.Router();

router.get('/google', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  // Store state in a short-lived cookie for CSRF validation in the callback
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 5 * 60 * 1000 });

  const client = createOAuthClient();
  const url = getAuthUrl(client, state);
  res.redirect(302, url);
});

router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies && req.cookies.oauth_state;

  if (
    !state ||
    !storedState ||
    state.length !== storedState.length ||
    !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(storedState))
  ) {
    return res.status(400).json({ error: 'invalid_state' });
  }

  if (!code) {
    return res.status(400).json({ error: 'missing_code' });
  }

  res.clearCookie('oauth_state');

  let tokens;
  let client;
  try {
    client = createOAuthClient();
    const tokenResponse = await client.getToken(code);
    tokens = tokenResponse.tokens;
    client.setCredentials(tokens);
  } catch {
    return res.status(401).json({ error: 'token_exchange_failed' });
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'id_token_invalid' });
  }

  const token = signToken({ sub: payload.sub, email: payload.email });
  return res.json({ token });
});

module.exports = router;
