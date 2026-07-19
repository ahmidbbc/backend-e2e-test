const request = require('supertest');
const app = require('../src/app');

describe('GET /celsius', () => {
  it('converts a Fahrenheit value to Celsius', async () => {
    const res = await request(app).get('/celsius').query({ fahrenheit: 212 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fahrenheit: 212, celsius: 100 });
  });

  it('handles negative and fractional values', async () => {
    const res = await request(app).get('/celsius').query({ fahrenheit: 32 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fahrenheit: 32, celsius: 0 });
  });

  it('returns 400 when the input is missing', async () => {
    const res = await request(app).get('/celsius');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_input' });
  });

  it('returns 400 when the input is not a number', async () => {
    const res = await request(app).get('/celsius').query({ fahrenheit: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_input' });
  });
});
