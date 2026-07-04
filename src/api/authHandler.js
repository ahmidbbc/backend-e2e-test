'use strict';

const crypto = require('crypto');
const passport = require('../auth/googleProvider');

const OAUTH_STATE_COOKIE = 'oauth_state';
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 };

function initiateGoogleAuth(req, res, next) {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE, state, COOKIE_OPTS);
  passport.authenticate('google', {
    scope: ['email', 'profile'],
    session: false,
    state,
  })(req, res, next);
}

function handleGoogleCallback(req, res, next) {
  const expectedState = req.cookies[OAUTH_STATE_COOKIE];
  if (!expectedState || req.query.state !== expectedState) {
    return res.status(403).json({ error: 'invalid_state' });
  }
  res.clearCookie(OAUTH_STATE_COOKIE);
  passport.authenticate('google', {
    failureRedirect: '/auth/failure',
    session: false,
  })(req, res, next);
}

function authSuccess(req, res) {
  const { id, displayName, emails, photos } = req.user;
  res.json({
    user: {
      id,
      displayName,
      email: emails && emails[0] && emails[0].value,
      photo: photos && photos[0] && photos[0].value,
    },
  });
}

function authFailure(_req, res) {
  res.status(401).json({ error: 'authentication_failed' });
}

module.exports = { initiateGoogleAuth, handleGoogleCallback, authSuccess, authFailure };
