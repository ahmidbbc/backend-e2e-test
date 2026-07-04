const express = require('express');
const passport = require('./auth/googleProvider');

const app = express();
app.use(express.json());
app.use(passport.initialize());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'], session: false }),
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure', session: false }),
  (req, res) => res.json({ user: req.user }),
);

app.get('/auth/failure', (_req, res) => res.status(401).json({ error: 'authentication_failed' }));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
}

module.exports = app;
