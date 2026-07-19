const request = require('supertest');
const app = require('../src/app');

describe('GET /elfe', () => {
  it('returns 200 with JSON status ok', async () => {
    const res = await request(app).get('/elfe');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
