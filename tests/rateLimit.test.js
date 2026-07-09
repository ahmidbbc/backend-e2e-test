const request = require('supertest');
const express = require('express');
const { authRateLimiter } = require('../src/middleware/rateLimit');

// Builds a minimal app that mounts the auth rate limiter on a stub route.
function makeApp() {
  const app = express();
  app.use(authRateLimiter);
  app.get('/google', (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe('authRateLimiter', () => {
  const prevEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prevEnv;
  });

  it('is skipped under NODE_ENV=test (existing suites are unaffected)', async () => {
    process.env.NODE_ENV = 'test';
    const app = makeApp();
    let last;
    for (let i = 0; i < 15; i += 1) {
      last = await request(app).get('/google');
    }
    expect(last.status).toBe(200);
  });

  it('allows 10 requests per minute then returns 429', async () => {
    process.env.NODE_ENV = 'production';
    const app = makeApp();

    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).get('/google');
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).get('/google');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('too_many_requests');
  });

  it('exposes rate-limit headers and Retry-After on a 429', async () => {
    process.env.NODE_ENV = 'production';
    const app = makeApp();

    let blocked;
    for (let i = 0; i < 11; i += 1) {
      blocked = await request(app).get('/google');
    }

    expect(blocked.status).toBe(429);
    // Legacy X-RateLimit-* headers.
    expect(blocked.headers['x-ratelimit-limit']).toBe('10');
    expect(blocked.headers['x-ratelimit-remaining']).toBe('0');
    expect(blocked.headers['x-ratelimit-reset']).toBeDefined();
    // draft-7 combined RateLimit header.
    expect(blocked.headers.ratelimit).toBeDefined();
    // Retry-After (seconds until the window resets).
    expect(blocked.headers['retry-after']).toBe('60');
    expect(blocked.body.retryAfter).toBe(60);
  });
});
