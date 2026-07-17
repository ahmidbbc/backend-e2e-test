const request = require('supertest');
const app = require('../src/app');

describe('GET /compte/:id', () => {
  it('returns the id and its character count', async () => {
    const res = await request(app).get('/compte/abc123');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'abc123', length: 6 });
  });

  it('counts multi-byte characters by code point', async () => {
    const res = await request(app).get(`/compte/${encodeURIComponent('aé😀')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'aé😀', length: 3 });
  });
});
