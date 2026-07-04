const jwt = require('jsonwebtoken');

function signToken(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}

function parseCookieHeader(header) {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((c) => {
      const eq = c.indexOf('=');
      const k = c.slice(0, eq).trim();
      const v = decodeURIComponent(c.slice(eq + 1).trim());
      return [k, v];
    })
  );
}

function requireAuth(verifyFn) {
  return (req, res, next) => {
    let token;

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      const cookies = parseCookieHeader(req.headers['cookie']);
      token = cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    try {
      req.user = verifyFn(token);
      return next();
    } catch {
      return res.status(401).json({ error: 'unauthenticated' });
    }
  };
}

module.exports = { signToken, verifyToken, requireAuth };
