const jwt = require('jsonwebtoken');

function signSession({ id, email, role }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var is required');
  return jwt.sign({ sub: String(id), email, role }, secret, { expiresIn: '24h', algorithm: 'HS256' });
}

module.exports = { signSession };
