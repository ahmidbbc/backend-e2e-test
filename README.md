# backend-e2e-test

Test repo for S1 E2E validation and agent demo.

## Setup

```bash
cp .env.example .env
npm install
npm test
```

## Health check

`GET /health` verifies the database connection in addition to reporting uptime.
The check opens a TCP connection to the host/port from `DATABASE_URL` and
measures round-trip latency.

- **DB reachable** — `200`:

  ```json
  { "status": "ok", "uptime": 12.3, "database": { "connected": true, "latencyMs": 3 } }
  ```

- **DB unreachable** — `503`:

  ```json
  { "status": "degraded", "uptime": 12.3, "database": { "connected": false, "latencyMs": 12, "error": "ECONNREFUSED" } }
  ```

`GET /status` remains a lightweight liveness probe that does not touch the database.

## Rate limiting

The authentication routes (mounted under `/`, e.g. `GET /google`, `GET /google/callback`)
are protected by a fixed-window rate limiter (`express-rate-limit`), keyed **per client IP**.

### Default limits

- **10 requests per 60 s window, per IP** (fixed window).
- Counters are held in memory (per process). They reset when the window elapses
  and are not shared across instances or restarts.

### Configuration

Tunable via environment variables (no redeploy needed):

| Variable | Default | Description |
| --- | --- | --- |
| `RATE_LIMIT_ENABLED` | `true` | Set to `false`/`0`/`no`/`off` to disable the limiter. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Window size in ms. |
| `RATE_LIMIT_MAX` | `10` | Max requests per window per IP. |

Invalid or non-positive numeric values fall back to the defaults. The limiter is
always skipped when `NODE_ENV=test`.

### Response codes & headers

- **Within the limit** — the request is served normally (e.g. `200`/`302`).
- **Limit exceeded** — `429 Too Many Requests` with a JSON body:

  ```json
  { "error": "too_many_requests", "retryAfter": 60 }
  ```

Every response carries rate-limit headers:

| Header | Description |
| --- | --- |
| `RateLimit`, `RateLimit-Policy` | draft-7 standard headers (limit, remaining, reset). |
| `X-RateLimit-Limit` | Max requests allowed in the window. |
| `X-RateLimit-Remaining` | Requests left in the current window. |
| `X-RateLimit-Reset` | Seconds until the window resets. |
| `Retry-After` | Sent on a `429`: seconds to wait before retrying (derived from the window). |

## Manual GitHub config (required before E2E test)

- Enable `allow_auto_merge` in repo Settings → General
- Branch protection on `main`: require status checks (`test`)
- Configure webhook: `POST https://<ngrok>/webhooks/github` — events: `pull_request`, `workflow_run`
- `GITHUB_TOKEN` with `push` + `pull_requests:write` scopes

## Reset between demos

```bash
git checkout main
git reset --hard origin/main
git push --force
```
// V36 merge-approval e2e test 1784392369
