const rateLimit = require('express-rate-limit');

const WINDOW_MS = 60 * 1000;
const LIMIT = 10;

// Rate limiter for the authentication routes: 10 requests per minute per IP.
// Emits both draft-7 `RateLimit-*` and legacy `X-RateLimit-*` headers, plus a
// `Retry-After` header and a 429 JSON body once the window limit is exceeded.
const authRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: true,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    const retryAfterSeconds = Math.ceil(WINDOW_MS / 1000);
    res.setHeader('Retry-After', retryAfterSeconds);
    res.status(429).json({ error: 'too_many_requests', retryAfter: retryAfterSeconds });
  },
});

module.exports = { authRateLimiter };
