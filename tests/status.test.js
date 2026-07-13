const request = require('supertest');

jest.mock('../src/services/dbHealth');
const { checkDatabaseConnection } = require('../src/services/dbHealth');
const app = require('../src/app');

describe('GET /status', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 200 with status ok and DB latency in ms', async () => {
    checkDatabaseConnection.mockResolvedValue({ connected: true, latencyMs: 7 });

    const res = await request(app).get('/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', dbLatencyMs: 7 });
  });
});
