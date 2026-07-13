const request = require('supertest');

jest.mock('../src/services/dbHealth');
const { checkDatabaseConnection } = require('../src/services/dbHealth');
const app = require('../src/app');

describe('GET /health', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 200 ok with database status when connected', async () => {
    checkDatabaseConnection.mockResolvedValue({ connected: true, latencyMs: 3 });

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.latencyMs).toBe(3);
    expect(res.body.database).toEqual({ connected: true, latencyMs: 3 });
    expect(typeof res.body.uptime).toBe('number');
  });

  it('returns 503 degraded when the database is unreachable', async () => {
    checkDatabaseConnection.mockResolvedValue({
      connected: false,
      latencyMs: 12,
      error: 'ECONNREFUSED',
    });

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.latencyMs).toBe(12);
    expect(res.body.database.connected).toBe(false);
    expect(res.body.database.error).toBe('ECONNREFUSED');
  });
});
