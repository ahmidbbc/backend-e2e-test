# Sprint sprint-0a8257b8 — Summary

Noté.

**Tasks**: 1 done / 0 failed / 0 blocked

## Done

### task-1 — Ajouter endpoint GET /slug

```
Tests pass and lint is clean. Done.

Added `GET /slug` in `src/app.js:79`: it reads the `text` query param, slugifies it (NFKD-normalize → strip accents → lowercase → collapse non-alphanumerics to hyphens → trim), and returns `{ slug, length }` where `length` is the slug's code-point count (per your steering note). Test coverage in `tests/slug.test.js`.
```

