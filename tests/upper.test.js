const request = require('supertest');
const app = require('../src/app');

describe('GET /upper', () => {
  it('uppercases the text query param', async () => {
    const res = await request(app).get('/upper').query({ text: 'hello world' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ upper: 'HELLO WORLD' });
  });

  it('uppercases accented characters', async () => {
    const res = await request(app).get('/upper').query({ text: 'éléphant' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ upper: 'ÉLÉPHANT' });
  });

  it('returns an empty string when no text is provided', async () => {
    const res = await request(app).get('/upper');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ upper: '' });
  });
});
