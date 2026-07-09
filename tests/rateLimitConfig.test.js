const { getRateLimitConfig, DEFAULT_WINDOW_MS, DEFAULT_LIMIT } = require('../src/config/rateLimit');

describe('getRateLimitConfig', () => {
  const KEYS = ['RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX', 'RATE_LIMIT_ENABLED'];
  const saved = {};

  beforeEach(() => {
    KEYS.forEach((k) => {
      saved[k] = process.env[k];
      delete process.env[k];
    });
  });

  afterEach(() => {
    KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  it('falls back to safe defaults when nothing is set', () => {
    expect(getRateLimitConfig()).toEqual({
      windowMs: DEFAULT_WINDOW_MS,
      limit: DEFAULT_LIMIT,
      enabled: true,
    });
  });

  it('reads window, limit and enabled from the environment', () => {
    process.env.RATE_LIMIT_WINDOW_MS = '5000';
    process.env.RATE_LIMIT_MAX = '3';
    process.env.RATE_LIMIT_ENABLED = 'false';

    expect(getRateLimitConfig()).toEqual({
      windowMs: 5000,
      limit: 3,
      enabled: false,
    });
  });

  it('ignores invalid or non-positive numeric values and keeps defaults', () => {
    process.env.RATE_LIMIT_WINDOW_MS = 'not-a-number';
    process.env.RATE_LIMIT_MAX = '0';

    const config = getRateLimitConfig();
    expect(config.windowMs).toBe(DEFAULT_WINDOW_MS);
    expect(config.limit).toBe(DEFAULT_LIMIT);
  });

  it.each([
    ['false', false],
    ['0', false],
    ['no', false],
    ['off', false],
    ['true', true],
    ['1', true],
    ['anything-else', true],
  ])('parses RATE_LIMIT_ENABLED=%s as enabled=%s', (value, expected) => {
    process.env.RATE_LIMIT_ENABLED = value;
    expect(getRateLimitConfig().enabled).toBe(expected);
  });
});
