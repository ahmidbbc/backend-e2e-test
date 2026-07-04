const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authRouter = require('./auth');

const app = express();
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRouter);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
}

module.exports = app;
