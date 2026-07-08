const { getSession } = require('../services/sessions');
const { findById } = require('../services/users');

const SESSION_COOKIE = 'sid';

function requireAuth(req, res, next) {
  const sid = req.cookies && req.cookies[SESSION_COOKIE];
  const session = getSession(sid);
  if (!session) {
    return res.status(401).json({ error: 'unauthenticated' });
  }

  const user = findById(session.userId);
  if (!user) {
    return res.status(401).json({ error: 'unauthenticated' });
  }

  req.user = user;
  return next();
}

module.exports = { requireAuth, SESSION_COOKIE };
