const express = require('express');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

const router = express.Router();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
    },
    (_accessToken, _refreshToken, profile, done) => {
      const user = {
        google_id: profile.id,
        email: profile.emails?.[0]?.value,
        displayName: profile.displayName,
      };
      done(null, user);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: true, failureRedirect: '/auth/failure' }),
  (req, res) => {
    res.json({ user: req.user });
  }
);

router.get('/failure', (_req, res) => {
  res.status(401).json({ error: 'authentication_failed' });
});

module.exports = router;
