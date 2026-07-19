const request = require('supertest');
const app = require('../src/app');

describe('GET /factorielle', () => {
  it('computes the factorial of a positive integer', async () => {
    const res = await request(app).get('/factorielle').query({ n: '5' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ n: 5, factorielle: '120' });
  });

  it('returns 1 for 0', async () => {
    const res = await request(app).get('/factorielle').query({ n: '0' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ n: 0, factorielle: '1' });
  });

  it('stays exact for large inputs via BigInt', async () => {
    const res = await request(app).get('/factorielle').query({ n: '25' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ n: 25, factorielle: '15511210043330985984000000' });
  });

  it('rejects a missing n with 400', async () => {
    const res = await request(app).get('/factorielle');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_input' });
  });

  it('rejects a non-integer input with 400', async () => {
    const res = await request(app).get('/factorielle').query({ n: '3.5' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_input' });
  });

  it('rejects a negative input with 400', async () => {
    const res = await request(app).get('/factorielle').query({ n: '-2' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_input' });
  });

  it('rejects an out-of-range input with 400', async () => {
    const res = await request(app).get('/factorielle').query({ n: '10001' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'out_of_range' });
  });
});
