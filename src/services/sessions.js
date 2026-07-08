const crypto = require('crypto');

const sessions = new Map();
const TTL_MS = 24 * 60 * 60 * 1000;

function createSession(user) {
  const id = crypto.randomBytes(32).toString('hex');
  sessions.set(id, { userId: user.id, expiresAt: Date.now() + TTL_MS });
  return id;
}

function getSession(id) {
  if (!id) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }
  return session;
}

function destroySession(id) {
  if (id) sessions.delete(id);
}

function reset() {
  sessions.clear();
}

module.exports = { createSession, getSession, destroySession, reset, TTL_MS };
