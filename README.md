# backend-e2e-test

Test repo for S1 E2E validation and agent demo.

## Google Cloud Console setup (required before first run)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project (or select an existing one).
2. Navigate to **APIs & Services → Library** and enable the **Google Identity (OAuth 2.0)** API.
3. Go to **APIs & Services → OAuth consent screen** and configure:
   - User type: **External** (or Internal if using a Google Workspace org)
   - App name: e.g. `backend-e2e-test`
   - Authorized domain: `localhost` (for local dev)
   - Scopes: add `openid`, `email`, `profile`
   - Save and continue through the remaining steps.
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**
   - Authorized redirect URIs (add both for local dev):
     - `http://localhost:3000/auth/google/callback`
     - `http://localhost:8100/auth/google/callback`
   - Click **Create** — Google displays the Client ID and Client Secret once.
5. Copy the generated values into `.env`:
   ```
   GOOGLE_CLIENT_ID=<your-client-id>
   GOOGLE_CLIENT_SECRET=<your-client-secret>
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```

## Setup

```bash
cp .env.example .env
# Fill in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (see above)
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
