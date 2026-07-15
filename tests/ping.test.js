const request = require('supertest');
const app = require('../src/app');
const { version } = require('../package.json');

describe('GET /ping', () => {
  it('returns 200 with ping and the API version', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ping: 'ping', version });
  });
});
