const request = require('supertest');
const app = require('../src/app');
const { version } = require('../package.json');

describe('GET /version', () => {
  it('returns 200 with the API version', async () => {
    const res = await request(app).get('/version');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ version });
  });
});
