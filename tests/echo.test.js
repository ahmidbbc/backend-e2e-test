const request = require('supertest');
const app = require('../src/app');

describe('/echo', () => {
  it('echoes the text query param on GET', async () => {
    const res = await request(app).get('/echo').query({ text: 'hello world' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: 'hello world' });
  });

  it('echoes the text body field on POST', async () => {
    const res = await request(app).post('/echo').send({ text: 'ping back' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: 'ping back' });
  });

  it('returns an empty string when no text is provided', async () => {
    const res = await request(app).get('/echo');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: '' });
  });
});
