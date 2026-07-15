const express = require('express');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');
const { checkDatabaseConnection } = require('./services/dbHealth');
const { version } = require('../package.json');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Walks the Express router stack and collects the registered routes as
// { method, path } entries. Handles both app-level routes and routes mounted
// via sub-routers (e.g. the auth router), prefixing the latter with their
// mount path.
function listRoutes(application) {
  const routes = [];

  const collect = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        const path = `${prefix}${layer.route.path}`;
        for (const method of Object.keys(layer.route.methods)) {
          if (layer.route.methods[method]) {
            routes.push({ method: method.toUpperCase(), path });
          }
        }
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        collect(layer.handle.stack, prefix);
      }
    }
  };

  collect(application._router.stack, '');

  routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  return routes;
}

app.get('/health', async (_req, res) => {
  const db = await checkDatabaseConnection();
  res.status(db.connected ? 200 : 503).json({
    status: db.connected ? 'ok' : 'degraded',
    uptime: process.uptime(),
    database: db,
  });
});

app.get('/status', (_req, res) => res.json({ status: 'ok' }));

app.get('/version', (_req, res) => res.json({ ver: version }));

app.get('/ping', (_req, res) => res.json({ ping: 'ping', version }));

app.get('/time', (_req, res) => res.json({ time: new Date().toISOString() }));

app.get('/routes', (_req, res) => res.json({ routes: listRoutes(app) }));

app.use('/', authRouter);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
}

module.exports = app;
