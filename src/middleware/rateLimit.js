const rateLimit = require('express-rate-limit');

// Rate limiter for the authentication routes: 10 requests per minute per IP.
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = { authRateLimiter };
