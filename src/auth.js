const { Router } = require('express');
const { OAuth2Client } = require('google-auth-library');

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} = process.env;

const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

const router = Router();

router.get('/auth/google', (_req, res) => {
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
  });
  res.redirect(url);
});

router.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' });
  }
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  res.json({ email: payload.email, google_id: payload.sub, name: payload.name });
});

module.exports = router;
