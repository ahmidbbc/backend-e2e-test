const request = require('supertest');
const app = require('../src/app');

describe('GET /ping', () => {
  it('returns 200 with ping=1 and the current timestamp', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body.ping).toBe(1);
    expect(typeof res.body.timestamp).toBe('string');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});
