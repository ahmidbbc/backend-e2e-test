# Sprint sprint-48857eff — Summary

Sprint contract généré avec 2 tâches back-end assignées à Alice.

**Tasks**: 3 done / 2 failed / 0 blocked

## Done

### task-1 — Ajouter un endpoint de version de l'API

```
This task is already complete. The `/version` endpoint was implemented and committed in the previous sprint (`637f6df`).

Current state:
- **`src/app.js:22`** — `app.get('/version', (_req, res) => res.json({ version }));` returns the version from `package.json` (`0.1.0`) as JSON.
- **`tests/version.test.js`** — asserts `GET /version` returns `200` with `{ version }`; test passes.

No code changes are needed. If you want something beyond the current implementation (e.g. include git SHA, build timestamp, or a plaintext variant), let me know.
```

### task-2-sub1 — Auditer la gestion des erreurs existante

```
I have a complete picture. This is an audit-only task — the deliverable is a list of problems. Here is the audit.

## Audit de la gestion des erreurs — `backend-e2e-test`

### Points de capture actuels

| Emplacement | Mécanisme | Réponse HTTP |
|---|---|---|
| `src/routes/auth.js:50` | validation `state` | `400 {error:'invalid_state'}` |
| `src/routes/auth.js:55` | validation `code` | `400 {error:'missing_code'}` |
| `src/routes/auth.js:62-66` | `try/catch` → `GoogleAuthError` traité, autres **re-`throw`** | `401 {error:err.code}` ou crash |
| `src/middleware/requireAuth.js:13,18` | session/user absent | `401 {error:'unauthenticated'}` |
| `src/middleware/rateLimit.js:60` | quota dépassé | `429 {error:'too_many_requests',retryAfter}` |
| `src/app.js:13` | health DB | `503` (sans corps d'erreur normalisé) |
| `src/providers/google.js` | `try/catch` → `GoogleAuthError` (bonne isolation) | — (propagé) |
| `src/config/auth.js:16` | config manquante | `throw new Error` générique |
| `src/services/dbHealth.js:27` | `catch` → résout au lieu de rejeter (OK) | — |

### Problèmes à corriger

**BLOQUANT**

1. **Aucun error-handler Express global (middleware 4-args).** Confirmé : `grep "(err, req, res, next)"` → 0 résultat. Toute exception non prévue (ex. `throw err` re-lancé à `auth.js:66`, ou une DB qui tombe) part dans le handler par défaut d'Express → stacktrace HTML en dev, réponse non-JSON, et **risque de fuite de stacktrace en prod**.

2. **`auth.js:66` re-`throw` dans un handler `async`.** Express 4 **ne capture pas** les rejets de promesses async. Un `throw` non-`GoogleAuthError` (ex. panne réseau dans `loginWithGoogle`) produit un `unhandledRejection` → la requête reste pendante (timeout client) et le process peut planter. Il faut soit `next(err)`, soit un wrapper `asyncHandler`.

**MEDIUM**

3. **Aucun format d'erreur unifié.** Trois formes coexistent : `{error:'...'}` (auth/requireAuth), `{error:'...',retryAfter}` (rateLimit), `{status:'degraded',...}` (health). Pas de champ `code`/`message`/`requestId` stable → couplage fragile pour les clients.

4. **Codes d'erreur exposés bruts issus du provider.** `auth.js:64` renvoie `err.code` de `GoogleAuthError` tel quel (`token_exchange_failed`, `invalid_id_token`, `invalid_profile`) → détails d'implémentation OAuth exposés côté API publique, sans mapping vers un vocabulaire d'API stable.

5. **`config/auth.js:16` lève un `Error` générique** au premier appel OAuth si la config manque. Combiné au point 1/2, cela donne une 500 non formatée au lieu d'une erreur de config détectée au démarrage.

6. **Health : pas de corps d'erreur normalisé.** `app.js` renvoie `503 {status:'degraded',...}` — sémantique « statut » et non « erreur », donc incohérent avec le reste si on standardise.

**MINEUR**

7. **Pas de gestion du 404 / route inconnue.** Aucune route catch-all → Express renvoie son 404 HTML par défaut, non-JSON.

8. **`express.json()` sans catch de parse error.** Un body JSON malformé déclenche l'erreur de parsing d'Express → 400 HTML par défaut (à couvrir par le handler global du point 1).

9. **Aucune journalisation centralisée** des erreurs (pas de `console.error`/logger au point de capture) → observabilité nulle sur les 4xx/5xx.

### Recommandation de correction (pour les tâches suivantes du sprint)
- Introduire une classe `AppError`/socle d'erreurs + un **error-handler Express global** (déjà cadré par le sprint `sprint-56cee6b0` « Implémenter le socle d'erreurs » / « Définir la stratégie d'erreurs cible »).
- Ajouter un `asyncHandler` pour router les rejets async vers `next(err)` (corrige #2).
- Mapper `GoogleAuthError.code` → codes d'API stables (corrige #4).
- Ajouter middlewares 404 + format d'erreur JSON unifié (`{error:{code,message}}`).

**Aucune modification de code effectuée** — tâche d'audit uniquement. Deux problèmes bloquants (absence de handler global, re-`throw` async non capturé) et un manque de format d'erreur unifié sont les priorités à traiter.
```

### task-2-sub2 — Définir le format d'erreur standardisé

```
This is a design task — the deliverable is the error-format specification that the next implementation sub-task will build against. Following the same pattern as sub1 (design output, no code changes), here is the convention.

## Format d'erreur standardisé — `backend-e2e-test`

### 1. Structure JSON de réponse d'erreur

Toute réponse d'erreur (statut HTTP ≥ 400) DOIT retourner ce corps JSON, avec `Content-Type: application/json` :

```json
{
  "error": {
    "code": "invalid_state",
    "message": "The OAuth state parameter is missing or does not match.",
    "details": null,
    "requestId": "b1f3c8e0-..."
  }
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `error` | object | oui | Enveloppe racine. Jamais de champ d'erreur au niveau racine (fin de `{error:'...'}` à plat). |
| `error.code` | string (snake_case) | oui | Code machine **stable**, vocabulaire d'API contrôlé (voir §3). Ne jamais exposer un code interne de provider tel quel. |
| `error.message` | string | oui | Message humain, en anglais, sûr à afficher. Aucune donnée sensible ni stacktrace. |
| `error.details` | object \| array \| null | non | Contexte structuré optionnel (ex. champs de validation, `retryAfter`). `null`/absent si rien. |
| `error.requestId` | string | non | Corrélation logs ↔ réponse. Présent dès qu'un logger de requête existe. |

**Règles :**
- Un seul format pour **toutes** les erreurs, y compris 404 route inconnue, 400 JSON malformé, 500 inattendue.
- Jamais de stacktrace ni de `err.message` brut en réponse hors `NODE_ENV !== 'production'` (en prod : `500` → `message` générique `"Internal server error"`, détails uniquement dans les logs via `requestId`).
- `details` sert au transport de contexte : ex. rate-limit → `{ "retryAfter": 60 }` ; validation → `{ "fields": { "code": "required" } }`.

### 2. Table de correspondance code HTTP → type d'erreur

| HTTP | Catégorie | `error.code` (exemples) | Déclencheur |
|---|---|---|---|
| **400** | Bad Request | `invalid_state`, `missing_code`, `malformed_json`, `validation_error` | Entrée client invalide / body non-parsable. |
| **401** | Unauthorized | `unauthenticated`, `authentication_failed` | Session absente/expirée, échec du flow OAuth. |
| **403** | Forbidden | `forbidden`, `insufficient_role` | Authentifié mais droits insuffisants (réservé à l'usage futur). |
| **404** | Not Found | `not_found`, `route_not_found` | Ressource ou route inconnue. |
| **409** | Conflict | `conflict` | Conflit d'état (réservé). |
| **429** | Too Many Requests | `too_many_requests` | Rate limiter dépassé. `details.retryAfter` + header `Retry-After`. |
| **500** | Internal Server Error | `internal_error` | Exception non prévue, bug, dépendance en panne. Message générique en prod. |
| **502 / 503** | Upstream / Unavailable | `upstream_error`, `service_unavailable` | Dépendance externe/DB injoignable. |

### 3. Mapping des codes provider → codes d'API stables

Corrige le problème #4 de l'audit (fuite de `GoogleAuthError.code` brut) :

| `GoogleAuthError.code` (interne) | HTTP | `error.code` (API publique) |
|---|---|---|
| `token_exchange_failed` | 401 | `authentication_failed` |
| `invalid_id_token` | 401 | `authentication_failed` |
| `invalid_profile` | 401 | `authentication_failed` |

Le code interne reste consigné dans les logs (via `details`/`requestId`), pas dans le corps public.

### 4. Convention d'application (à implémenter dans la sous-tâche suivante)

1. **Classe `AppError`** — porte `statusCode`, `code`, `message`, `details`. Les erreurs attendues lèvent une `AppError` ; on ne renvoie plus `res.status().json()` ad hoc dispersé.
2. **`asyncHandler(fn)`** — wrappe les handlers async pour router les rejets vers `next(err)` (corrige le bloquant #2 : re-`throw` async non capturé à `auth.js:66`).
3. **Error-handler global** (middleware 4-args, monté en dernier dans `app.js`) — sérialise toute erreur au format §1 : `AppError` → son `statusCode`/`code` ; erreur inconnue → `500 internal_error` (message générique en prod, log complet).
4. **Middleware 404** juste avant l'error-handler → `404 route_not_found` au format JSON.
5. **Parse-error JSON** (`express.json()`) → capturée par l'error-handler → `400 malformed_json`.
6. **Migration des points existants** vers le format :
   - `requireAuth` `{error:'unauthenticated'}` → `{error:{code:'unauthenticated',...}}`.
   - rateLimit `{error:'too_many_requests',retryAfter}` → `{error:{code:'too_many_requests',details:{retryAfter}}}`.
   - `/health` conserve sa sémantique « statut » (`200`/`503` avec `{status,...}`) — ce n'est pas une erreur applicative ; documenter l'exception explicitement.

### 5. Compatibilité tests

Les suites actuelles asservissent `res.body.error === 'unauthenticated'` / `'invalid_state'` / `'too_many_requests'` (chaîne plate). Le passage à `error.code` **cassera** ces assertions → la sous-tâche d'implémentation devra mettre à jour `tests/auth.test.js`, `tests/sso.e2e.test.js`, `tests/rateLimit.test.js` en conséquence. À signaler comme impact connu du refactor.

---

**Aucune modification de code effectuée** — tâche de conception/documentation. La convention ci-dessus (enveloppe `{error:{code,message,details,requestId}}`, table HTTP↔type, mapping provider→API stable) est le contrat que la sous-tâche d'implémentation devra respecter.
```

## Failed

### task-2-sub4 — Migrer les handlers vers le nouveau format

```
cancelled by DELETE /sprints/sprint-48857eff
```

### task-2-sub5 — Ajouter les tests de la gestion d'erreur

```
cancelled by DELETE /sprints/sprint-48857eff
```

