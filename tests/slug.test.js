const request = require('supertest');
const app = require('../src/app');

describe('GET /slug', () => {
  it('slugifies the text query param and returns its length', async () => {
    const res = await request(app).get('/slug').query({ text: 'Hello World' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ slug: 'hello-world', length: 11 });
  });

  it('strips accents and collapses separators', async () => {
    const res = await request(app).get('/slug').query({ text: '  Éléphant   Rosé!! ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ slug: 'elephant-rose', length: 13 });
  });

  it('returns an empty slug when no text is provided', async () => {
    const res = await request(app).get('/slug');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ slug: '', length: 0 });
  });
});
