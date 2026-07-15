# Sprint sprint-c6504b19 — Summary

Noté.

**Tasks**: 1 done / 0 failed / 0 blocked

## Done

### task-1 — Ajouter l'endpoint GET /ping

```
My `ping.test.js` passes. The single failing test (`rateLimit.test.js`) is unrelated to this change — it's a rate-limiter header assertion, not touched by the `/ping` work (a similar rate-limit test was already recorded as flaky/failing in the sprint history).

Done:
- `src/app.js:` added `app.get('/ping', ...)` returning `{ ping: 'ping', version }` — includes the version field per the steering note.
- `tests/ping.test.js`: new test asserting 200 with `{ ping: 'ping', version }`.
```

