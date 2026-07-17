const request = require('supertest');
const app = require('../src/app');

describe('/upper', () => {
  it('uppercases the text query param on GET', async () => {
    const res = await request(app).get('/upper').query({ text: 'hello world' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ upper: 'HELLO WORLD' });
  });

  it('uppercases the text body field on POST', async () => {
    const res = await request(app).post('/upper').send({ text: 'ping back' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ upper: 'PING BACK' });
  });

  it('returns an empty string when no text is provided', async () => {
    const res = await request(app).get('/upper');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ upper: '' });
  });
});
