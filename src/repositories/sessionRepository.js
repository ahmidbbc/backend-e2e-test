// Session repository interface (the contract the session service depends on):
//   save(id, record) -> void
//   find(id)         -> record | undefined
//   delete(id)       -> void
//   clear()          -> void
// A record is { userId, expiresAt }. Swap this in-memory implementation for a
// Redis/SQL-backed one without touching the session service.
function createInMemorySessionRepository() {
  const store = new Map();
  return {
    save(id, record) {
      store.set(id, record);
    },
    find(id) {
      return store.get(id);
    },
    delete(id) {
      store.delete(id);
    },
    clear() {
      store.clear();
    },
  };
}

module.exports = { createInMemorySessionRepository };
