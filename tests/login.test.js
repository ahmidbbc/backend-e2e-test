'use strict';

const request = require('supertest');

jest.mock('../src/store/userStore', () => ({ findOrCreateUser: jest.fn() }));

const app = require('../src/app');

describe('GET /login', () => {
  it('returns 200 with the login page', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('contains a link to /auth/google', async () => {
    const res = await request(app).get('/login');
    expect(res.text).toContain('href="/auth/google"');
  });

  it('contains the sign-in button label', async () => {
    const res = await request(app).get('/login');
    expect(res.text).toContain('Se connecter avec Google');
  });
});
