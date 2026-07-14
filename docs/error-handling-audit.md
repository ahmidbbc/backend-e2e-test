# Audit de la gestion des erreurs — backend-e2e-test

> État à la date de l'audit (2026-07-14). Portée : tout le back-end sous `src/`.
> Objectif : recenser les patterns de gestion d'erreurs actuels (codes de
> retour, exceptions, wrapping, logs, propagation) et documenter les
> incohérences et cas problématiques.

## 1. Vue d'ensemble

Le back-end est une petite API Express (auth Google OAuth, sessions, health).
La gestion des erreurs y suit **trois styles coexistants**, sans couche
centralisée :

1. **Exceptions typées** — `GoogleAuthError` (`src/providers/google.js`) et
   `Error` générique (`src/config/auth.js`).
2. **Codes de retour / valeurs sentinelles** — `null` (users, sessions),
   `false` (`logout`), objets `{ connected, error }` (dbHealth).
3. **Réponses HTTP construites à la main** — chaque handler forge son propre
   `res.status(...).json({ error: '...' })`.

Il n'existe **aucun middleware d'erreurs Express** (handler à 4 arguments
`(err, req, res, next)`), ni classe d'erreur applicative commune, ni logging
structuré.

## 2. Inventaire des patterns par couche

### 2.1 Exceptions (`throw`)

| Fichier:ligne | Type levé | Code / message | Rattrapé par |
| --- | --- | --- | --- |
| `src/config/auth.js:16` | `Error` (générique) | `"Missing Google OAuth configuration…"` | personne (remonte au boot / à l'appel de `createClient`) |
| `src/providers/google.js:33` | `GoogleAuthError` | `token_exchange_failed` | `routes/auth.js:62` |
| `src/providers/google.js:41` | `GoogleAuthError` | `invalid_id_token` | `routes/auth.js:62` |
| `src/providers/google.js:45` | `GoogleAuthError` | `invalid_profile` | `routes/auth.js:62` |
| `src/routes/auth.js:66` | ré-`throw` de l'erreur non-`GoogleAuthError` | — | **personne** (voir 3.1) |

`GoogleAuthError` (`src/providers/google.js:6-12`) est la seule erreur typée du
domaine : son `code` est réutilisé tel quel comme corps de réponse
(`{ error: err.code }`).

### 2.2 Wrapping d'erreurs

- **`src/providers/google.js:28-46`** — les erreurs de la lib `google-auth-library`
  (`getToken`, `verifyIdToken`) sont **capturées puis remplacées** par un
  `GoogleAuthError` avec un code stable. L'erreur d'origine est **perdue**
  (pas de `cause`, pas de log) → on ne peut pas distinguer un vrai échec réseau
  d'un code d'autorisation invalide côté observabilité.
- **`src/services/dbHealth.js:23-27`** — `parseDatabaseUrl` peut lancer (URL
  invalide) ; l'erreur est capturée et transformée en objet de retour
  `{ connected: false, error: "Invalid DATABASE_URL: <msg>" }`. Le message brut
  de l'erreur est ré-exposé dans le champ `error`.

### 2.3 Codes de retour / sentinelles (pas d'exception)

| Fonction | Convention | Fichier |
| --- | --- | --- |
| `findByEmail`, `findById`, `findOrCreateByGoogle` | retour `null` si absent | `src/services/users.js` |
| `getSession` | retour `null` si absent/expiré | `src/services/sessions.js:16-25` |
| `logout` | retour `bool` (`false` = rien à invalider) | `src/usecases/logout.js` |
| `checkDatabaseConnection` | résout **toujours** avec `{ connected, error? }`, ne rejette jamais | `src/services/dbHealth.js` |

### 2.4 Réponses HTTP d'erreur (construites à la main)

| Fichier:ligne | Statut | Corps |
| --- | --- | --- |
| `src/routes/auth.js:50` | 400 | `{ error: 'invalid_state' }` |
| `src/routes/auth.js:55` | 400 | `{ error: 'missing_code' }` |
| `src/routes/auth.js:64` | 401 | `{ error: err.code }` (dynamique) |
| `src/middleware/requireAuth.js:13,18` | 401 | `{ error: 'unauthenticated' }` |
| `src/middleware/rateLimit.js:60` | 429 | `{ error: 'too_many_requests', retryAfter }` |
| `src/app.js:13` | 200/503 | `{ status, uptime, database }` (pas de champ `error` racine) |

### 2.5 Logging

- **Aucun log d'erreur** dans tout `src/`. Le seul `console.*` est
  `src/app.js:26` (`console.log("Listening on …")`, purement informatif).
- Les erreurs capturées (google, dbHealth) ne sont **jamais tracées** avant
  d'être transformées.

## 3. Incohérences et cas problématiques

### 3.1 [CRITIQUE] `throw err` non rattrapé → 500 HTML + fuite de stack

`src/routes/auth.js:62-67` : si `loginWithGoogle` lève une erreur **qui n'est pas**
un `GoogleAuthError` (ex. panne mémoire, bug dans `findOrCreateByGoogle`,
`createSession`), le handler ré-`throw`. Comme **aucun middleware d'erreurs
Express n'est monté**, la requête tombe dans le handler par défaut d'Express :
- réponse **500** avec, hors production, la **stack trace en HTML** (fuite
  d'information) ;
- handler `async` : le rejet est bien propagé car `await` est dans un `try`,
  mais tout `throw` synchrone/async hors `try` d'un autre handler ne serait pas
  capturé du tout (crash potentiel du process selon la version d'Express).

### 3.2 [MOYEN] Forme du corps d'erreur non uniforme

Trois formes cohabitent :
- `{ error: '<code_string>' }` (majorité) ;
- `{ error: 'too_many_requests', retryAfter }` (champ supplémentaire) ;
- `/health` renvoie l'erreur **imbriquée** dans `database.error`, sans champ
  `error` de premier niveau.

Aucun champ commun (`code`, `message`, `requestId`). Un client ne peut pas
parser les erreurs de façon générique.

### 3.3 [MOYEN] Codes d'erreur = chaînes libres, non centralisés

Les codes (`invalid_state`, `missing_code`, `unauthenticated`,
`token_exchange_failed`, `invalid_id_token`, `invalid_profile`,
`too_many_requests`) sont des **littéraux dispersés** dans 3 fichiers. Pas
d'énumération partagée → risque de divergence, fautes de frappe, et pas de
source unique pour la doc/contrat d'API.

### 3.4 [MOYEN] `Error` générique de config non typée ni gérée

`src/config/auth.js:16` lève un `Error` nu. Il est appelé **paresseusement**
dans `createClient` (`google.js:15-18`), donc l'app démarre même sans config ;
l'échec ne survient qu'à la première requête OAuth, où il **n'est pas rattrapé**
(pas un `GoogleAuthError`) → même chemin que 3.1 → 500. Idéalement, échouer au
démarrage (fail-fast).

### 3.5 [MOYEN] Perte de la cause originelle (pas d'`error cause`)

Dans `google.js`, les `catch (err)` ignorent totalement `err` : ni chaînage
(`new GoogleAuthError(code, { cause: err })`), ni log. Debug en production
quasi impossible (on ne sait pas *pourquoi* l'échange de token a échoué).

### 3.6 [FAIBLE] Sentinelles vs exceptions : convention implicite

Le mélange `null`/`false`/objet-résultat/exception n'est pas documenté. Un
appelant doit lire chaque fonction pour savoir si l'absence se signale par
`null`, `false`, ou un throw. Cohérent localement, mais aucun contrat écrit.

### 3.7 [FAIBLE] Ré-exposition de messages bruts

`dbHealth.js:23` (`Invalid DATABASE_URL: ${err.message}`) et le handler par
défaut Express (3.1) exposent des messages internes. À filtrer selon
l'environnement.

## 4. Ce qui fonctionne bien (à conserver)

- **`GoogleAuthError`** : bon modèle d'erreur de domaine typée avec `code`
  stable, découplé du transport HTTP. À généraliser.
- **`checkDatabaseConnection`** : « ne rejette jamais », retour structuré —
  pattern adapté à un health-check.
- **Séparation des couches** : les use-cases (`loginWithGoogle`, `logout`) sont
  HTTP-agnostiques ; la traduction erreur→HTTP est confinée aux handlers.
  C'est le bon point d'ancrage pour un futur middleware d'erreurs.

## 5. Recommandations (pour la définition de la stratégie cible)

1. Introduire une **classe `AppError`** commune (code, statut HTTP, message
   public, `cause`) dont `GoogleAuthError` deviendrait un cas.
2. Monter un **middleware d'erreurs Express** unique (4-arg) en fin de chaîne
   qui : mappe `AppError` → statut+corps, sinon 500 générique **sans stack**,
   et **log** systématiquement l'erreur (avec cause).
3. **Centraliser les codes d'erreur** dans un module unique (énum/constantes).
4. Standardiser le **corps d'erreur** : `{ error: { code, message } }` sur
   toutes les routes.
5. Ajouter du **logging structuré** au point de capture (préserver `cause`).
6. **Fail-fast** sur la config manquante au démarrage plutôt qu'à la 1ʳᵉ requête.
