'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const passport = require('./auth/googleProvider');
const { initiateGoogleAuth, handleGoogleCallback, authSuccess, authFailure } = require('./api/authHandler');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/login', (_req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html')),
);

app.get('/auth/google', initiateGoogleAuth);
app.get('/auth/google/callback', handleGoogleCallback, authSuccess);
app.get('/auth/failure', authFailure);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
}

module.exports = app;
