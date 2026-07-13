const net = require('net');
const { checkDatabaseConnection, parseDatabaseUrl } = require('../src/services/dbHealth');

describe('parseDatabaseUrl', () => {
  it('extracts host and port', () => {
    expect(parseDatabaseUrl('postgres://user:pass@db.example:6543/app')).toEqual({
      host: 'db.example',
      port: 6543,
    });
  });

  it('defaults to port 5432 when absent', () => {
    expect(parseDatabaseUrl('postgres://localhost/app')).toEqual({
      host: 'localhost',
      port: 5432,
    });
  });
});

describe('checkDatabaseConnection', () => {
  it('reports not connected when DATABASE_URL is missing', async () => {
    const res = await checkDatabaseConnection({ databaseUrl: '' });
    expect(res).toEqual({ connected: false, error: 'DATABASE_URL is not set' });
  });

  it('reports an invalid DATABASE_URL', async () => {
    const res = await checkDatabaseConnection({ databaseUrl: 'not a url' });
    expect(res.connected).toBe(false);
    expect(res.error).toMatch(/Invalid DATABASE_URL/);
  });

  it('resolves connected against a live TCP server', async () => {
    const server = net.createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();

    const res = await checkDatabaseConnection({
      databaseUrl: `postgres://127.0.0.1:${port}/app`,
    });

    server.close();
    expect(res.connected).toBe(true);
    expect(typeof res.latencyMs).toBe('number');
  });

  it('reports an error when the connection is refused', async () => {
    // Port 1 is reserved and refuses connections.
    const res = await checkDatabaseConnection({
      databaseUrl: 'postgres://127.0.0.1:1/app',
      timeoutMs: 1000,
    });
    expect(res.connected).toBe(false);
    expect(res.error).toBeDefined();
  });
});
