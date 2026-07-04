const { verifyToken } = require('./jwt');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token;
  const token = (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) || cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'missing_token' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}

module.exports = requireAuth;
