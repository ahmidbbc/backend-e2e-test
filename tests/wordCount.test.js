const request = require('supertest');
const app = require('../src/app');

describe('GET /wordCount', () => {
  it('counts the words in the text query param', async () => {
    const res = await request(app).get('/wordCount').query({ text: 'hello world foo' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: 'hello world foo', wordCount: 3 });
  });

  it('ignores leading, trailing, and repeated whitespace', async () => {
    const res = await request(app).get('/wordCount').query({ text: '  hello   world  ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: '  hello   world  ', wordCount: 2 });
  });

  it('returns 0 when no text is provided', async () => {
    const res = await request(app).get('/wordCount');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: '', wordCount: 0 });
  });

  it('returns 0 for blank input', async () => {
    const res = await request(app).get('/wordCount').query({ text: '   ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: '   ', wordCount: 0 });
  });
});
