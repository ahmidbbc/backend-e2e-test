// Client repository interface (the contract callers depend on):
//   create(data)     -> client        (assigns a fresh id, throws on missing name)
//   update(id, data) -> client | null (partial patch; null if unknown id)
//   delete(id)       -> boolean       (true if a client was removed)
//   getById(id)      -> client | null
//   list()           -> client[]      (insertion order)
//   clear()          -> void
// A client is { id, name, contact, address, createdAt, updatedAt }. Swap this
// in-memory implementation for a SQL/Redis-backed one without touching callers.
function createInMemoryClientRepository() {
  const store = new Map();
  let nextId = 1;

  function create(data = {}) {
    if (!data.name || String(data.name).trim() === '') {
      throw new Error('client name is required');
    }
    const now = new Date().toISOString();
    const client = {
      id: nextId++,
      name: String(data.name),
      contact: data.contact == null ? null : String(data.contact),
      address: data.address == null ? null : String(data.address),
      createdAt: now,
      updatedAt: now,
    };
    store.set(client.id, client);
    return client;
  }

  function update(id, data = {}) {
    const existing = store.get(id);
    if (!existing) return null;
    if ('name' in data) {
      if (!data.name || String(data.name).trim() === '') {
        throw new Error('client name is required');
      }
      existing.name = String(data.name);
    }
    if ('contact' in data) existing.contact = data.contact == null ? null : String(data.contact);
    if ('address' in data) existing.address = data.address == null ? null : String(data.address);
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  function remove(id) {
    return store.delete(id);
  }

  function getById(id) {
    return store.get(id) || null;
  }

  function list() {
    return Array.from(store.values());
  }

  function clear() {
    store.clear();
    nextId = 1;
  }

  return { create, update, delete: remove, getById, list, clear };
}

module.exports = { createInMemoryClientRepository };
