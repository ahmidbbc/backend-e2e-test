const request = require('supertest');
const app = require('../src/app');

describe('GET /base64', () => {
  it('encodes the text query param to base64', async () => {
    const res = await request(app).get('/base64').query({ text: 'hello world' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ base64: 'aGVsbG8gd29ybGQ=' });
  });

  it('encodes multi-byte characters as UTF-8', async () => {
    const res = await request(app).get('/base64').query({ text: 'aé😀' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ base64: Buffer.from('aé😀', 'utf8').toString('base64') });
  });

  it('returns an empty string when no text is provided', async () => {
    const res = await request(app).get('/base64');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ base64: '' });
  });
});
