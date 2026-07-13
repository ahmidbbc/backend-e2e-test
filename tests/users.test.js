const { findOrCreateByGoogle, findById, reset } = require('../src/services/users');

beforeEach(() => {
  reset();
});

describe('findOrCreateByGoogle upsert', () => {
  it('creates a new member user with a fresh id', () => {
    const user = findOrCreateByGoogle({ googleId: 'g-1', email: 'a@example.com' });
    expect(user).toMatchObject({
      id: 1,
      googleId: 'g-1',
      email: 'a@example.com',
      role: 'member',
    });
  });

  it('reuses the same record for a repeated Google sub', () => {
    const first = findOrCreateByGoogle({ googleId: 'g-1', email: 'a@example.com' });
    const second = findOrCreateByGoogle({ googleId: 'g-1', email: 'a@example.com' });
    expect(second).toBe(first);
    expect(findById(first.id)).toBe(first);
  });

  it('reconciles by email and backfills the google_id instead of duplicating', () => {
    const first = findOrCreateByGoogle({ googleId: 'g-old', email: 'a@example.com' });
    // Same person returns with a different Google sub but the same email.
    const second = findOrCreateByGoogle({ googleId: 'g-new', email: 'a@example.com' });

    expect(second.id).toBe(first.id);
    expect(second.googleId).toBe('g-new');
    // Now resolvable by the new sub.
    expect(findOrCreateByGoogle({ googleId: 'g-new', email: 'a@example.com' }).id).toBe(first.id);
  });

  it('keeps distinct users for distinct emails', () => {
    const a = findOrCreateByGoogle({ googleId: 'g-1', email: 'a@example.com' });
    const b = findOrCreateByGoogle({ googleId: 'g-2', email: 'b@example.com' });
    expect(b.id).not.toBe(a.id);
  });
});
