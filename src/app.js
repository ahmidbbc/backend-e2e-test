const express = require('express');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/', authRouter);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
}

module.exports = app;
