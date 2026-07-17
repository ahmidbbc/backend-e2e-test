const request = require('supertest');
const app = require('../src/app');

describe('GET /slug', () => {
  it('slugifies the text query param', async () => {
    const res = await request(app).get('/slug').query({ text: 'Hello World' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ slug: 'hello-world' });
  });

  it('returns an empty slug when no text is provided', async () => {
    const res = await request(app).get('/slug');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ slug: '' });
  });

  it('strips accents and collapses non-alphanumeric runs', async () => {
    const res = await request(app).get('/slug').query({ text: '  Crème  Brûlée!! ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ slug: 'creme-brulee' });
  });
});
