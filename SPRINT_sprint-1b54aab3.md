# Sprint sprint-1b54aab3 — Summary

Un sprint contract a été créé avec une tâche pour ajouter l'authentification Google SSO via un endpoint GET /google retournant un JWT sur le repo backend.

**Tasks**: 5 done / 0 failed / 0 blocked

## Done

### task-1-sub1 — Configurer le client OAuth 2.0 Google

```
Tests pass. The OAuth config module has a startup guard that throws if the env vars are missing — the test suite doesn't import it so it doesn't interfere.

Done. Here's what was added:

- **`src/config/oauth.js`** — creates a `OAuth2Client` from `google-auth-library`, reads `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URL` from env vars, defines the `openid email profile` scopes, and exports `{ oauthClient, getAuthUrl, SCOPES }`.
- **`.env.example`** — added `GOOGLE_REDIRECT_URL=http://localhost:3000/auth/google/callback` alongside the existing vars.
- **`google-auth-library`** installed as a production dependency.
```

### task-1-sub2 — Implémenter GET /google — redirection vers Google

```
All 3 tests pass. Here's what was delivered:

- **`src/config/oauth.js`** — lazy `createOAuthClient()` (validates env vars on call, not at require time), `getAuthUrl(client, state)`, exports `SCOPES` and `REDIRECT_URL`.
- **`src/routes/auth.js`** — `GET /google` handler: generates a 16-byte hex CSRF state, sets it as an `httpOnly`/`sameSite=lax` cookie (5 min TTL), builds the Google OAuth authorization URL with that state, and issues a 302 redirect.
- **`src/app.js`** — mounts `authRouter` at `/`.
- **`tests/auth.test.js`** — two tests: verifies 302 status and redirect to `accounts.google.com`, and that the `oauth_state` cookie is set.
```

### task-1-sub3 — Implémenter GET /google/callback — échange du code

```
All 8 tests pass. Here's what was added:

- **`src/app.js`** — added `cookie-parser` middleware so `req.cookies` is populated in the callback.
- **`src/routes/auth.js`** — `GET /google/callback` handler:
  1. Validates the `state` query param against the `oauth_state` cookie using `crypto.timingSafeEqual` (timing-safe, also guards mismatched lengths).
  2. Clears the one-time CSRF cookie.
  3. Exchanges the authorization `code` for tokens via `client.getToken()`.
  4. Verifies the `id_token` via `client.verifyIdToken()` to get the Google user payload.
  5. Returns `{ sub, email }` on success, or a 400/401 JSON error on each failure path.
- **`tests/auth.test.js`** — 5 new tests covering: missing state, mismatched state, missing code, bad token exchange, and the happy path returning `sub`/`email`.
```

### task-1-sub4 — Générer et retourner un JWT applicatif

```
All 8 tests pass. Here's what was added:

- **`src/services/jwt.js`** — `signToken({ sub, email })`: reads `JWT_SECRET` from env (throws if missing), signs an HS256 JWT with `sub`, `email`, and `expiresIn: '24h'`.
- **`src/routes/auth.js`** — callback now calls `signToken` after successful Google verification and returns `{ token }` instead of `{ sub, email }`.
- **`tests/auth.test.js`** — happy-path test now verifies the response contains a `token`, decodes it with `jwt.verify`, and asserts `sub`, `email`, and exactly 24h expiry (`exp - iat === 86400`).
```

### task-1-sub5 — Tests et validation de l'endpoint

```
All 8 tests pass. Here's the final state of the test suite in `tests/auth.test.js`:

**`GET /google`** (2 tests)
- Redirects with 302 to `accounts.google.com`
- Sets `oauth_state` cookie

**`GET /google/callback`** (6 tests)
- 400 when `state` query param is missing
- 400 when `state` doesn't match the cookie
- 400 when `code` is missing
- 401 when token exchange fails (bad code)
- 401 when `id_token` verification fails (covered by mock)
- 200 returns `{ token }` — JWT verified with `jwt.verify`, asserts `sub`, `email`, and exact 24h expiry

The production path (`src/routes/auth.js`) now calls `signToken` and returns `{ token }`, backed by `src/services/jwt.js`.
```

