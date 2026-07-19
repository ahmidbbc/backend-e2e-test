const request = require('supertest');
const app = require('../src/app');

describe('GET /wordCount', () => {
  it('counts space-separated words', async () => {
    const res = await request(app).get('/wordCount').query({ text: 'hello world' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: 'hello world', count: 2 });
  });

  it('counts a single word', async () => {
    const res = await request(app).get('/wordCount').query({ text: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: 'hello', count: 1 });
  });

  it('ignores leading, trailing, and repeated whitespace', async () => {
    const res = await request(app).get('/wordCount').query({ text: '  hello   world  ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: '  hello   world  ', count: 2 });
  });

  it('returns 0 for empty text', async () => {
    const res = await request(app).get('/wordCount').query({ text: '' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: '', count: 0 });
  });

  it('returns 0 when no text is provided', async () => {
    const res = await request(app).get('/wordCount');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: '', count: 0 });
  });
});
