const net = require('net');

const DEFAULT_TIMEOUT_MS = 2000;

function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  const port = url.port ? Number(url.port) : 5432;
  return { host: url.hostname, port };
}

// Verifies the database is reachable by opening a TCP connection to the
// host:port from DATABASE_URL. Resolves with connection status, latency, and a
// detailed error message on failure — never rejects.
function checkDatabaseConnection({
  databaseUrl = process.env.DATABASE_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  return new Promise((resolve) => {
    if (!databaseUrl) {
      resolve({ connected: false, error: 'DATABASE_URL is not set' });
      return;
    }

    let target;
    try {
      target = parseDatabaseUrl(databaseUrl);
    } catch (err) {
      resolve({ connected: false, error: `Invalid DATABASE_URL: ${err.message}` });
      return;
    }

    const start = process.hrtime.bigint();
    let settled = false;
    const socket = new net.Socket();

    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    const latency = () => Number(process.hrtime.bigint() - start) / 1e6;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () =>
      finish({ connected: true, latencyMs: Math.round(latency()) })
    );
    socket.once('timeout', () =>
      finish({
        connected: false,
        latencyMs: Math.round(latency()),
        error: `Connection to ${target.host}:${target.port} timed out after ${timeoutMs}ms`,
      })
    );
    socket.once('error', (err) =>
      finish({
        connected: false,
        latencyMs: Math.round(latency()),
        error: err.message,
      })
    );

    socket.connect(target.port, target.host);
  });
}

module.exports = { checkDatabaseConnection, parseDatabaseUrl };
