const request = require('supertest');
const app = require('../src/app');

describe('GET /ready', () => {
  it('returns 200 with a plain-text readiness message', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.type).toBe('text/plain');
    expect(res.text).toBe('je suis prêt');
  });
});
