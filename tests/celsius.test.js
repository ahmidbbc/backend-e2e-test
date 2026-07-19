const request = require('supertest');
const app = require('../src/app');

describe('GET /celsius', () => {
  it('converts 212 Fahrenheit to 100 Celsius', async () => {
    const res = await request(app).get('/celsius').query({ f: 212 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fahrenheit: 212, celsius: 100 });
  });

  it('converts 32 Fahrenheit to 0 Celsius', async () => {
    const res = await request(app).get('/celsius').query({ f: 32 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fahrenheit: 32, celsius: 0 });
  });

  it('handles negative temperatures', async () => {
    const res = await request(app).get('/celsius').query({ f: -40 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fahrenheit: -40, celsius: -40 });
  });

  it('returns 400 when f is missing', async () => {
    const res = await request(app).get('/celsius');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_input' });
  });

  it('returns 400 when f is not a number', async () => {
    const res = await request(app).get('/celsius').query({ f: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_input' });
  });
});
