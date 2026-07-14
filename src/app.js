const express = require('express');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');
const { checkDatabaseConnection } = require('./services/dbHealth');
const { version } = require('../package.json');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/health', async (_req, res) => {
  const db = await checkDatabaseConnection();
  res.status(db.connected ? 200 : 503).json({
    status: db.connected ? 'ok' : 'degraded',
    uptime: process.uptime(),
    database: db,
  });
});

app.get('/status', (_req, res) => res.json({ status: 'ok' }));

app.get('/version', (_req, res) => res.json({ version }));

app.get('/time', (_req, res) => res.json({ time: new Date().toISOString() }));

app.use('/', authRouter);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
}

module.exports = app;
