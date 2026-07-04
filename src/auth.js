const { Router } = require('express');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

const router = Router();

router.get('/auth/google', (_req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
  });
  res.redirect(url);
});

router.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ error: 'missing_code_or_state' });
  }

  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch {
    return res.status(400).json({ error: 'token_exchange_failed' });
  }

  if (!tokens.id_token) {
    return res.status(400).json({ error: 'no_id_token' });
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'invalid_id_token' });
  }

  return res.json({
    email: payload.email,
    sub: payload.sub,
    name: payload.name,
  });
});

module.exports = router;
