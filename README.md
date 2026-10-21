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

## Delivery tracking

Deliveries are linked to existing order IDs (see `GET /api/orders`).
This demo stores deliveries and their history **in memory**: data is lost on
restart and is not shared between server instances. Like the orders API, these
endpoints are public. Delivery status is tracked separately from order status.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/deliveries` | Create with JSON `{"orderId":2}`; returns `201` and a `Location` header. |
| GET | `/api/deliveries` | List as `{"deliveries":[...]}`. |
| GET | `/api/deliveries/:id` | Read the delivery, including its current status and history. |
| PATCH | `/api/deliveries/:id/status` | Set status with JSON `{"status":"shipped"}`. |
| GET | `/api/deliveries/:id/history` | Read `{"history":[...]}` in chronological insertion order. |

A delivery has `id`, `orderId`, `status`, and `history`. Creation records the
initial `pending` status. Allowed statuses are `pending`, `shipped`, `in_transit`,
and `delivered`. Any change between these statuses is allowed, including a
correction to an earlier status. Each change appends `{status, timestamp}` with a
server-generated UTC ISO timestamp; repeating the current status is a no-op.
Clients cannot supply or overwrite history. There is at most one delivery per
order (`409` for duplicates). Invalid input returns `400`; unknown orders or
deliveries return `404`.
