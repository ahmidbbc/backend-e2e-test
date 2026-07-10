const { getSession: defaultGetSession } = require('../services/sessions');
const { findById } = require('../services/users');

const SESSION_COOKIE = 'sid';

// Builds the auth middleware over an injected session lookup, so tests (and
// alternate storage backends) can supply their own session service.
function createRequireAuth(getSession = defaultGetSession) {
  return function requireAuth(req, res, next) {
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
  };
}

const requireAuth = createRequireAuth();

module.exports = { requireAuth, createRequireAuth, SESSION_COOKIE };
