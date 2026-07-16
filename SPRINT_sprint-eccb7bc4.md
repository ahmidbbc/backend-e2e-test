# Sprint sprint-eccb7bc4 — Summary

Noté.

**Tasks**: 1 done / 0 failed / 0 blocked

## Done

### task-1 — Ajouter un endpoint GET /uuid renvoyant un identifiant unique aléatoire

```
Fait. L'endpoint `GET /uuid` renvoie maintenant un UUID v4 aléatoire **et** le champ `version` :

```js
app.get('/uuid', (_req, res) => res.json({ uuid: crypto.randomUUID(), version }));
```

- `src/app.js` : ajout de l'endpoint (+ import `crypto`).
- `tests/uuid.test.js` : vérifie le format UUID, le champ `version`, et l'unicité entre appels.

Tests et lint passent.
```

