const request = require('supertest');
const app = require('../src/app');

describe('GET /palindrome', () => {
  it('reports true for a palindrome', async () => {
    const res = await request(app).get('/palindrome').query({ mot: 'kayak' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mot: 'kayak', isPalindrome: true });
  });

  it('reports false for a non-palindrome', async () => {
    const res = await request(app).get('/palindrome').query({ mot: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mot: 'hello', isPalindrome: false });
  });

  it('treats missing input as an empty palindrome', async () => {
    const res = await request(app).get('/palindrome');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mot: '', isPalindrome: true });
  });

  it('compares multi-byte characters by code point', async () => {
    const res = await request(app).get('/palindrome').query({ mot: '😀é😀' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mot: '😀é😀', isPalindrome: true });
  });
});
