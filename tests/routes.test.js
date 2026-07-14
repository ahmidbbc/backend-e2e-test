const request = require('supertest');
const app = require('../src/app');

describe('GET /routes', () => {
  it('returns 200 with the list of registered routes', async () => {
    const res = await request(app).get('/routes');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.routes)).toBe(true);

    res.body.routes.forEach((route) => {
      expect(typeof route.method).toBe('string');
      expect(typeof route.path).toBe('string');
    });
  });

  it('includes app-level and mounted router routes', async () => {
    const res = await request(app).get('/routes');
    const entries = res.body.routes.map((r) => `${r.method} ${r.path}`);

    expect(entries).toContain('GET /version');
    expect(entries).toContain('GET /routes');
    expect(entries).toContain('GET /google');
    expect(entries).toContain('POST /logout');
  });
});
