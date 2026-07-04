const { Router } = require('express');
const { OAuth2Client } = require('google-auth-library');
const { signToken, verifyToken, requireAuth } = require('./session');

function buildAuthRouter({ db, oauthClient, redirectUri, secret, signFn, requireAuthFn, postLoginRedirect, errorRedirect }) {
  const router = Router();
  const sign = signFn || ((payload) => signToken(payload, secret));
  const authMiddleware = requireAuthFn || requireAuth((token) => verifyToken(token, secret));

  router.get('/auth/google', (_req, res) => {
    const url = oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      redirect_uri: redirectUri,
    });
    res.redirect(url);
  });

  router.get('/auth/google/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
      if (errorRedirect) return res.redirect(errorRedirect + '?error=' + encodeURIComponent(error));
      return res.status(400).json({ error });
    }
    if (!code) {
      if (errorRedirect) return res.redirect(errorRedirect + '?error=missing_code');
      return res.status(400).json({ error: 'missing_code' });
    }

    let tokens;
    try {
      ({ tokens } = await oauthClient.getToken({ code, redirect_uri: redirectUri }));
    } catch (err) {
      if (errorRedirect) return res.redirect(errorRedirect + '?error=token_exchange_failed');
      return res.status(400).json({ error: 'token_exchange_failed', detail: err.message });
    }

    oauthClient.setCredentials(tokens);

    let payload;
    try {
      const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: oauthClient._clientId,
      });
      payload = ticket.getPayload();
    } catch (err) {
      if (errorRedirect) return res.redirect(errorRedirect + '?error=id_token_invalid');
      return res.status(400).json({ error: 'id_token_invalid', detail: err.message });
    }

    const { sub: googleId, email } = payload;

    const result = await db.query(
      `INSERT INTO users (email, google_id)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET google_id = EXCLUDED.google_id
       RETURNING id, email, role, google_id, created_at`,
      [email, googleId]
    );

    const user = result.rows[0];
    const sessionToken = sign({ sub: user.id, email: user.email, role: user.role });

    res.cookie('token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    if (postLoginRedirect) return res.redirect(postLoginRedirect);
    return res.json({ user, token: sessionToken });
  });

  router.post('/auth/logout', (_req, res) => {
    res.clearCookie('token');
    return res.json({ ok: true });
  });

  router.get('/auth/me', authMiddleware, (req, res) => {
    return res.json({ user: req.user });
  });

  return router;
}

function createDefaultAuthRouter() {
  const { Pool } = require('pg');
  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  const oauthClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const postLoginRedirect = process.env.POST_LOGIN_REDIRECT || '/dashboard.html';
  const errorRedirect = process.env.ERROR_REDIRECT || '/login.html';
  return buildAuthRouter({ db, oauthClient, redirectUri, secret, postLoginRedirect, errorRedirect });
}

module.exports = { buildAuthRouter, createDefaultAuthRouter };
