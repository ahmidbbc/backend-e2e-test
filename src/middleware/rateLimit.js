const rateLimit = require('express-rate-limit');
const { getRateLimitConfig } = require('../config/rateLimit');

const { windowMs, limit, enabled } = getRateLimitConfig();
const retryAfterSeconds = Math.ceil(windowMs / 1000);

// Rate limiter for the authentication routes (per IP). Limits, window and the
// on/off toggle are read from the environment (see src/config/rateLimit.js) so
// they can be tuned without a redeploy. Emits both draft-7 `RateLimit-*` and
// legacy `X-RateLimit-*` headers, plus a `Retry-After` header and a 429 JSON
// body once the window limit is exceeded.
const authRateLimiter = rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: true,
  skip: () => !enabled || process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    res.setHeader('Retry-After', retryAfterSeconds);
    res.status(429).json({ error: 'too_many_requests', retryAfter: retryAfterSeconds });
  },
});

module.exports = { authRateLimiter };
