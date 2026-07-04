# backend-e2e-test

Test repo for S1 E2E validation and agent demo.

## Setup

```bash
cp .env.example .env
npm install
npm test
```

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
