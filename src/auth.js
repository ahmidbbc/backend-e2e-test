const crypto = require('crypto');
const { Router } = require('express');
const { OAuth2Client } = require('google-auth-library');

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} = process.env;

const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

const COOKIE_NAME = 'oauth_state';
const COOKIE_TTL_MS = 5 * 60 * 1000;

const router = Router();

router.get('/auth/google', (_req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_TTL_MS,
  });
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    response_type: 'code',
    state,
  });
  res.redirect(url);
});

router.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies[COOKIE_NAME];

  if (!state || !storedState) {
    return res.status(400).json({ error: 'Missing state parameter' });
  }

  // Timing-safe comparison; also guards different-length strings
  const a = Buffer.from(state);
  const b = Buffer.from(storedState);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  // Clear the one-time CSRF cookie
  res.clearCookie(COOKIE_NAME);

  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' });
  }

  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch (err) {
    const status = err.response?.status ?? 502;
    const message = err.response?.data?.error_description ?? err.message ?? 'Token exchange failed';
    return res.status(status >= 400 && status < 600 ? 401 : 502).json({ error: message });
  }

  if (!tokens.id_token) {
    return res.status(502).json({ error: 'No id_token returned by Google' });
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid id_token' });
  }

  res.json({ email: payload.email, google_id: payload.sub, name: payload.name });
});

module.exports = router;
