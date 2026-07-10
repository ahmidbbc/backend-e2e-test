const { logout } = require('../src/usecases/logout');
const {
  createSession,
  getSession,
  reset: resetSessions,
} = require('../src/services/sessions');

beforeEach(() => {
  resetSessions();
});

describe('logout usecase (no HTTP)', () => {
  it('invalidates an active session and reports success', () => {
    const sid = createSession({ id: 1 });
    expect(getSession(sid)).not.toBeNull();

    expect(logout(sid)).toBe(true);
    expect(getSession(sid)).toBeNull();
  });

  it('reports failure when there is no active session to invalidate', () => {
    expect(logout('unknown-sid')).toBe(false);
    expect(logout(undefined)).toBe(false);
  });
});
