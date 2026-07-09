const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_LIMIT = 10;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseBool(value, fallback) {
  if (value === undefined) return fallback;
  return !['false', '0', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

// Reads rate-limit settings from the environment so limits, window and the
// on/off toggle can be tuned without a code change. Falls back to safe defaults.
function getRateLimitConfig() {
  return {
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS),
    limit: parsePositiveInt(process.env.RATE_LIMIT_MAX, DEFAULT_LIMIT),
    enabled: parseBool(process.env.RATE_LIMIT_ENABLED, true),
  };
}

module.exports = { getRateLimitConfig, DEFAULT_WINDOW_MS, DEFAULT_LIMIT };
