'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const passport = require('../auth/googleProvider');
const { findOrCreateUser } = require('../store/userStore');
const config = require('../config');

const OAUTH_STATE_COOKIE = 'oauth_state';
const JWT_COOKIE = 'token';
const STATE_COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 };
const JWT_COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 };

function initiateGoogleAuth(req, res, next) {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE, state, STATE_COOKIE_OPTS);
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

async function authSuccess(req, res) {
  try {
    const profile = req.user;
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;

    const user = await findOrCreateUser({
      googleId: profile.id,
      email,
      displayName: profile.displayName,
    });

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    );

    res.cookie(JWT_COOKIE, token, JWT_COOKIE_OPTS);
    res.redirect('/');
  } catch (err) {
    res.status(500).json({ error: 'session_error' });
  }
}

function authFailure(_req, res) {
  res.status(401).json({ error: 'authentication_failed' });
}

module.exports = { initiateGoogleAuth, handleGoogleCallback, authSuccess, authFailure };
