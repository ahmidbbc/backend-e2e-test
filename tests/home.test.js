const request = require('supertest');
const app = require('../src/app');

describe('GET /', () => {
  it('serves the home page as HTML', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('Gestion des commandes');
    expect(res.text).toContain('orders-list');
  });

  it('serves the stylesheet as CSS', async () => {
    const res = await request(app).get('/styles.css');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/css/);
  });
});
