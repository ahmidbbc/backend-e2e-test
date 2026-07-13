const { getRateLimitConfig } = require('../config/rateLimit');

// Extracts the client IP. Behind a proxy we trust the first hop of
// `X-Forwarded-For` (client, proxy1, proxy2); otherwise fall back to the
// socket's remote address (`req.ip` already honours Express `trust proxy`).
function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Builds a per-IP, fixed-window rate limiter backed by an in-memory map
// (IP -> { count, resetAt }). Expired entries are swept periodically so the
// map does not grow unbounded. Returns a `stop()` handle to clear the sweeper
// (used by tests to avoid leaking timers).
function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    limit = 10,
    enabled = true,
    skip = () => false,
    cleanupIntervalMs = windowMs,
    now = () => Date.now(),
  } = options;

  const hits = new Map();

  const sweeper = setInterval(() => {
    const current = now();
    for (const [ip, entry] of hits) {
      if (current >= entry.resetAt) hits.delete(ip);
    }
  }, cleanupIntervalMs);
  if (typeof sweeper.unref === 'function') sweeper.unref();

  function middleware(req, res, next) {
    if (!enabled || skip(req, res)) return next();

    const ip = clientIp(req);
    const current = now();

    let entry = hits.get(ip);
    if (!entry || current >= entry.resetAt) {
      entry = { count: 0, resetAt: current + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;

    const remaining = Math.max(0, limit - entry.count);
    const resetSeconds = Math.ceil(entry.resetAt / 1000);
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSeconds));

    if (entry.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - current) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'too_many_requests', retryAfter });
    }

    return next();
  }

  middleware.stop = () => clearInterval(sweeper);
  middleware.reset = () => hits.clear();
  return middleware;
}

const { windowMs, limit, enabled } = getRateLimitConfig();

// Rate limiter for the authentication routes: allows `limit` requests per IP
// within `windowMs` (defaults: 10 requests / minute), then responds 429 with a
// `Retry-After` header until the window rolls over. Limits, window and the
// on/off toggle come from the environment (see src/config/rateLimit.js) so they
// can be tuned without a redeploy. Disabled entirely under NODE_ENV=test so the
// existing HTTP suites are unaffected.
const authRateLimiter = createRateLimiter({
  windowMs,
  limit,
  enabled,
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = { authRateLimiter, createRateLimiter };
