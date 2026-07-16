const request = require('supertest');
const app = require('../src/app');

describe('GET /reverse', () => {
  it('reverses the text query param', async () => {
    const res = await request(app).get('/reverse').query({ text: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reversed: 'olleh' });
  });

  it('returns an empty string when no text is provided', async () => {
    const res = await request(app).get('/reverse');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reversed: '' });
  });

  it('reverses multi-byte characters by code point', async () => {
    const res = await request(app).get('/reverse').query({ text: 'aé😀' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reversed: '😀éa' });
  });
});
