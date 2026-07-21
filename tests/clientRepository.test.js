const { createInMemoryClientRepository } = require('../src/repositories/clientRepository');

let repo;

beforeEach(() => {
  repo = createInMemoryClientRepository();
});

describe('createInMemoryClientRepository', () => {
  it('creates a client with a fresh id and timestamps', () => {
    const client = repo.create({ name: 'Acme', contact: 'acme@example.com', address: '1 rue X' });
    expect(client).toMatchObject({
      id: 1,
      name: 'Acme',
      contact: 'acme@example.com',
      address: '1 rue X',
    });
    expect(client.createdAt).toBeDefined();
    expect(client.updatedAt).toBe(client.createdAt);
  });

  it('defaults missing contact and address to null', () => {
    const client = repo.create({ name: 'Acme' });
    expect(client.contact).toBeNull();
    expect(client.address).toBeNull();
  });

  it('rejects creation without a name', () => {
    expect(() => repo.create({})).toThrow(/name is required/);
    expect(() => repo.create({ name: '   ' })).toThrow(/name is required/);
  });

  it('assigns incrementing ids', () => {
    const a = repo.create({ name: 'A' });
    const b = repo.create({ name: 'B' });
    expect(b.id).toBe(a.id + 1);
  });

  it('gets a client by id and returns null for unknown ids', () => {
    const created = repo.create({ name: 'Acme' });
    expect(repo.getById(created.id)).toBe(created);
    expect(repo.getById(999)).toBeNull();
  });

  it('lists clients in insertion order', () => {
    repo.create({ name: 'A' });
    repo.create({ name: 'B' });
    expect(repo.list().map((c) => c.name)).toEqual(['A', 'B']);
  });

  it('updates fields partially and bumps updatedAt', () => {
    const created = repo.create({ name: 'Acme', contact: 'old@example.com' });
    const updated = repo.update(created.id, { contact: 'new@example.com' });
    expect(updated.name).toBe('Acme');
    expect(updated.contact).toBe('new@example.com');
  });

  it('returns null when updating an unknown id', () => {
    expect(repo.update(999, { name: 'X' })).toBeNull();
  });

  it('rejects an update that blanks the name', () => {
    const created = repo.create({ name: 'Acme' });
    expect(() => repo.update(created.id, { name: '' })).toThrow(/name is required/);
  });

  it('deletes a client and reports whether one was removed', () => {
    const created = repo.create({ name: 'Acme' });
    expect(repo.delete(created.id)).toBe(true);
    expect(repo.getById(created.id)).toBeNull();
    expect(repo.delete(created.id)).toBe(false);
  });

  it('clears all clients and resets ids', () => {
    repo.create({ name: 'A' });
    repo.clear();
    expect(repo.list()).toEqual([]);
    expect(repo.create({ name: 'B' }).id).toBe(1);
  });
});
