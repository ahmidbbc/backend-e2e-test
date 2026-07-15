const request = require('supertest');
const app = require('../src/app');

describe('GET /ping', () => {
  it('returns 200 with Pong and an ISO 8601 timestamp', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Pong');
    expect(typeof res.body.timestamp).toBe('string');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});
