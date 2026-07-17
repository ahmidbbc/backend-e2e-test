# Sprint sprint-37e4c2cd — Summary

Noté.

**Tasks**: 1 done / 0 failed / 0 blocked

## Done

### task-1 — Ajouter l'endpoint GET /base64

```
Done. Added the `GET /base64` endpoint in `src/app.js:120` and a test file `tests/base64.test.js` — all 3 tests pass.

The endpoint reads `text` from the query string, encodes it as UTF-8 base64 via `Buffer`, and returns `{ base64: "..." }`; missing input yields an empty string, matching the existing `/reverse` and `/slug` conventions.
```

