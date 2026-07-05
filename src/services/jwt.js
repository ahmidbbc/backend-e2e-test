const jwt = require('jsonwebtoken');

function signToken({ sub, email }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be set');
  }
  return jwt.sign({ sub, email }, secret, { algorithm: 'HS256', expiresIn: '24h' });
}

module.exports = { signToken };
