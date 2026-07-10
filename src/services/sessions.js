const crypto = require('crypto');
const { createInMemorySessionRepository } = require('../repositories/sessionRepository');

const TTL_MS = 24 * 60 * 60 * 1000;

// Builds a session service over any repository implementing the session
// repository contract, so the storage backend can be swapped (memory, Redis, SQL).
function createSessionService(repository = createInMemorySessionRepository()) {
  function createSession(user) {
    const id = crypto.randomBytes(32).toString('hex');
    repository.save(id, { userId: user.id, expiresAt: Date.now() + TTL_MS });
    return id;
  }

  function getSession(id) {
    if (!id) return null;
    const session = repository.find(id);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      repository.delete(id);
      return null;
    }
    return session;
  }

  function destroySession(id) {
    if (id) repository.delete(id);
  }

  function reset() {
    repository.clear();
  }

  return { createSession, getSession, destroySession, reset };
}

// Default service backed by an in-memory repository — preserves the existing
// module-level API used across the app.
const defaultService = createSessionService();

module.exports = {
  createSessionService,
  createSession: defaultService.createSession,
  getSession: defaultService.getSession,
  destroySession: defaultService.destroySession,
  reset: defaultService.reset,
  TTL_MS,
};
