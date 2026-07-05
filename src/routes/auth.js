const express = require('express');
const crypto = require('crypto');
const { createOAuthClient, getAuthUrl } = require('../config/oauth');

const router = express.Router();

router.get('/google', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  // Store state in a short-lived cookie for CSRF validation in the callback
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 5 * 60 * 1000 });

  const client = createOAuthClient();
  const url = getAuthUrl(client, state);
  res.redirect(302, url);
});

module.exports = router;
