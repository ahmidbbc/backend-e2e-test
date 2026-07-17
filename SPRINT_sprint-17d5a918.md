# Sprint sprint-17d5a918 — Summary

Noté.

**Tasks**: 1 done / 0 failed / 0 blocked

## Done

### task-1 — Ajouter l'endpoint GET /ping

```
The task is already complete. The `GET /ping` endpoint exists at src/app.js:53 and its test passes.

- **Endpoint**: `app.get('/ping', ...)` returns `200` with `{ ping: 1, timestamp: <ISO string> }` — matching the task's "status 200 with value 1" requirement.
- **Test**: `tests/ping.test.js` passes (verifies status 200, `ping === 1`, and valid ISO timestamp).

No code changes are needed. The endpoint follows the project's JSON convention (`{ ping: 1 }`) established by the other endpoints (`/version`, `/status`, etc.).
```

