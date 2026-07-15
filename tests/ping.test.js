const request = require('supertest');
const app = require('../src/app');

describe('GET /ping', () => {
  it('returns 200 with { pong: true }', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pong: true });
  });
});
