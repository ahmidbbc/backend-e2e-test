const request = require('supertest');
const app = require('../src/app');

describe('GET /google', () => {
  it('returns 200 with a google url', async () => {
    const res = await request(app).get('/google');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://www.google.com');
  });
});
