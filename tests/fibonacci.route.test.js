const request = require('supertest');
const app = require('../src/app');

describe('GET /fibonacci', () => {
  it('computes the nth Fibonacci number', async () => {
    const res = await request(app).get('/fibonacci').query({ n: '10' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ n: 10, fibonacci: '55' });
  });

  it('returns 0 for n=0', async () => {
    const res = await request(app).get('/fibonacci').query({ n: '0' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ n: 0, fibonacci: '0' });
  });

  it('stays exact for large inputs via BigInt', async () => {
    const res = await request(app).get('/fibonacci').query({ n: '100' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ n: 100, fibonacci: '354224848179261915075' });
  });

  it('rejects a missing n with 400', async () => {
    const res = await request(app).get('/fibonacci');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_input' });
  });

  it('rejects a non-integer input with 400', async () => {
    const res = await request(app).get('/fibonacci').query({ n: '3.5' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_input' });
  });

  it('rejects a negative input with 400', async () => {
    const res = await request(app).get('/fibonacci').query({ n: '-2' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_input' });
  });

  it('rejects an out-of-range input with 400', async () => {
    const res = await request(app).get('/fibonacci').query({ n: '100001' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'out_of_range' });
  });
});
