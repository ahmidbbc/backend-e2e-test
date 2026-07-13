const request = require('supertest');
const express = require('express');
const { authRateLimiter, createRateLimiter } = require('../src/middleware/rateLimit');

// Builds a minimal app that mounts the auth rate limiter on a stub route.
function makeApp() {
  const app = express();
  app.use(authRateLimiter);
  app.get('/google', (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

// Builds an app with a short-window custom limiter so window-reset can be
// exercised without waiting a full production minute.
function makeShortWindowApp(windowMs, limit) {
  const limiter = createRateLimiter({ windowMs, limit });
  const app = express();
  app.use(limiter);
  app.get('/google', (_req, res) => res.status(200).json({ ok: true }));
  return { app, limiter };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('authRateLimiter', () => {
  const prevEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prevEnv;
    authRateLimiter.reset();
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
    expect(blocked.headers['x-ratelimit-limit']).toBe('10');
    expect(blocked.headers['x-ratelimit-remaining']).toBe('0');
    expect(blocked.headers['x-ratelimit-reset']).toBeDefined();
    // Retry-After (seconds until the window resets).
    expect(blocked.headers['retry-after']).toBe('60');
    expect(blocked.body.retryAfter).toBe(60);
  });

  it('resets the window: blocked requests are allowed again after windowMs', async () => {
    const windowMs = 300;
    const { app, limiter } = makeShortWindowApp(windowMs, 2);

    // Exhaust the window.
    expect((await request(app).get('/google')).status).toBe(200);
    expect((await request(app).get('/google')).status).toBe(200);
    expect((await request(app).get('/google')).status).toBe(429);

    // Wait for the window to elapse, then requests are allowed again.
    await sleep(windowMs + 50);

    const afterReset = await request(app).get('/google');
    expect(afterReset.status).toBe(200);
    expect(afterReset.headers['x-ratelimit-remaining']).toBe('1');

    limiter.stop();
  });

  it('tracks limits independently per client IP (X-Forwarded-For)', async () => {
    const { app, limiter } = makeShortWindowApp(60 * 1000, 2);

    // Client A exhausts its budget.
    expect((await request(app).get('/google').set('X-Forwarded-For', '1.1.1.1')).status).toBe(200);
    expect((await request(app).get('/google').set('X-Forwarded-For', '1.1.1.1')).status).toBe(200);
    expect((await request(app).get('/google').set('X-Forwarded-For', '1.1.1.1')).status).toBe(429);

    // Client B is unaffected.
    expect((await request(app).get('/google').set('X-Forwarded-For', '2.2.2.2')).status).toBe(200);

    limiter.stop();
  });
});

// A controllable clock so the 1-minute window can be advanced instantly
// instead of waiting in real time — keeps these cases fast and deterministic.
function makeClockedApp({ windowMs = 60 * 1000, limit = 10 } = {}) {
  let nowMs = 1_000_000;
  const clock = {
    advance: (ms) => {
      nowMs += ms;
    },
  };
  const limiter = createRateLimiter({ windowMs, limit, now: () => nowMs });
  const app = express();
  app.use(limiter);
  app.get('/google', (_req, res) => res.status(200).json({ ok: true }));
  return { app, limiter, clock };
}

const getFrom = (app, ip) => request(app).get('/google').set('X-Forwarded-For', ip);

describe('rate limit — 10 req/min per IP (task cases)', () => {
  it('passing case: the first 10 requests within the window are allowed', async () => {
    const { app, limiter } = makeClockedApp();
    for (let i = 1; i <= 10; i += 1) {
      const res = await getFrom(app, '10.0.0.1');
      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-remaining']).toBe(String(10 - i));
    }
    limiter.stop();
  });

  it('blocking case: the 11th request returns 429 with Retry-After', async () => {
    const { app, limiter } = makeClockedApp();
    for (let i = 0; i < 10; i += 1) {
      expect((await getFrom(app, '10.0.0.2')).status).toBe(200);
    }
    const blocked = await getFrom(app, '10.0.0.2');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('too_many_requests');
    expect(blocked.body.retryAfter).toBe(60);
    expect(blocked.headers['retry-after']).toBe('60');
    limiter.stop();
  });

  it('IP isolation: two distinct IPs keep separate counters', async () => {
    const { app, limiter } = makeClockedApp();

    // IP A burns through its whole budget and is then blocked.
    for (let i = 0; i < 10; i += 1) {
      expect((await getFrom(app, '10.0.0.3')).status).toBe(200);
    }
    expect((await getFrom(app, '10.0.0.3')).status).toBe(429);

    // IP B still has its full budget: 10 allowed, 11th blocked.
    for (let i = 0; i < 10; i += 1) {
      expect((await getFrom(app, '10.0.0.4')).status).toBe(200);
    }
    expect((await getFrom(app, '10.0.0.4')).status).toBe(429);

    limiter.stop();
  });

  it('window reset: the counter clears once the 1-minute window elapses', async () => {
    const { app, limiter, clock } = makeClockedApp();

    for (let i = 0; i < 10; i += 1) {
      expect((await getFrom(app, '10.0.0.5')).status).toBe(200);
    }
    expect((await getFrom(app, '10.0.0.5')).status).toBe(429);

    // Advance past the full window: the budget is restored.
    clock.advance(60 * 1000);

    const afterReset = await getFrom(app, '10.0.0.5');
    expect(afterReset.status).toBe(200);
    expect(afterReset.headers['x-ratelimit-remaining']).toBe('9');

    limiter.stop();
  });
});
