const request = require('supertest');
const app = require('../src/app');
const { version } = require('../package.json');

describe('GET /uuid', () => {
  it('returns 200 with a random UUID and the API version', async () => {
    const res = await request(app).get('/uuid');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(version);
    expect(res.body.uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('returns a different UUID on each call', async () => {
    const first = await request(app).get('/uuid');
    const second = await request(app).get('/uuid');
    expect(first.body.uuid).not.toBe(second.body.uuid);
  });
});
