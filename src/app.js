'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const passport = require('./auth/googleProvider');
const { initiateGoogleAuth, handleGoogleCallback, authSuccess, authFailure } = require('./api/authHandler');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/auth/google', initiateGoogleAuth);
app.get('/auth/google/callback', handleGoogleCallback, authSuccess);
app.get('/auth/failure', authFailure);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
}

module.exports = app;
