const request = require('supertest');
const app = require('../src/app');

describe('GET /anagramme', () => {
  it('reports true for two anagrams', async () => {
    const res = await request(app).get('/anagramme').query({ a: 'listen', b: 'silent' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ a: 'listen', b: 'silent', isAnagram: true });
  });

  it('reports false for non-anagrams', async () => {
    const res = await request(app).get('/anagramme').query({ a: 'hello', b: 'world' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ a: 'hello', b: 'world', isAnagram: false });
  });

  it('is case-insensitive and ignores accents, spaces and punctuation', async () => {
    const res = await request(app).get('/anagramme').query({ a: 'Le chien', b: 'niche él' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ a: 'Le chien', b: 'niche él', isAnagram: true });
  });

  it('treats two missing inputs as anagrams', async () => {
    const res = await request(app).get('/anagramme');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ a: '', b: '', isAnagram: true });
  });
});
