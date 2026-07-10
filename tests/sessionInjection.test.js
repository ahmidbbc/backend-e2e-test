const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');

const { createSessionService } = require('../src/services/sessions');
const { createRequireAuth, SESSION_COOKIE } = require('../src/middleware/requireAuth');
const { findOrCreateByGoogle, reset: resetUsers } = require('../src/services/users');

// Builds a minimal app whose session storage is injected, so a protected
// endpoint can be validated without HTTP-level OAuth or the module singletons.
function buildApp(repository) {
  const sessions = createSessionService(repository);
  const requireAuth = createRequireAuth(sessions.getSession);

  const app = express();
  app.use(cookieParser());
  app.get('/protected', requireAuth, (req, res) => res.json({ id: req.user.id }));

  return { app, sessions };
}

beforeEach(() => {
  resetUsers();
});

describe('session repository injection on a protected endpoint', () => {
  it('grants access with a session issued by the injected repository', async () => {
    const records = new Map();
    const repository = {
      save: (id, record) => records.set(id, record),
      find: (id) => records.get(id),
      delete: (id) => records.delete(id),
      clear: () => records.clear(),
    };
    const { app, sessions } = buildApp(repository);

    const user = findOrCreateByGoogle({ googleId: 'g-1', email: 'a@example.com' });
    const sid = sessions.createSession(user);

    // The credential was persisted through the injected repository, not a global.
    expect(records.has(sid)).toBe(true);

    const res = await request(app).get('/protected').set('Cookie', `${SESSION_COOKIE}=${sid}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: user.id });
  });

  it('denies access when the injected repository has no matching session', async () => {
    const repository = {
      save: jest.fn(),
      find: jest.fn(() => undefined),
      delete: jest.fn(),
      clear: jest.fn(),
    };
    const { app } = buildApp(repository);

    const res = await request(app).get('/protected').set('Cookie', `${SESSION_COOKIE}=bogus`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
    expect(repository.find).toHaveBeenCalledWith('bogus');
  });
});
