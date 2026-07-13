const express = require('express');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');
const { checkDatabaseConnection } = require('./services/dbHealth');

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

app.get('/status', async (_req, res) => {
  const db = await checkDatabaseConnection();
  res.json({ status: 'ok', dbLatencyMs: db.latencyMs });
});

app.use('/', authRouter);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
}

module.exports = app;
