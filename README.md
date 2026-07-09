# backend-e2e-test

Test repo for S1 E2E validation and agent demo.

## Setup

```bash
cp .env.example .env
npm install
npm test
```

## Rate limiting

Auth routes are rate limited per IP. Tunable via env vars (no redeploy needed):

| Variable | Default | Description |
| --- | --- | --- |
| `RATE_LIMIT_ENABLED` | `true` | Set to `false`/`0`/`no`/`off` to disable the limiter. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Window size in ms. |
| `RATE_LIMIT_MAX` | `10` | Max requests per window per IP. |

The limiter is always skipped when `NODE_ENV=test`.

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
