# backend-e2e-test

Test repo for S1 E2E validation and agent demo.

## Setup

```bash
cp .env.example .env
npm install
npm test
```

## Google OAuth2 credentials setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project (or select an existing one).
2. Navigate to **APIs & Services → Library**, search for **Google Identity** (or "OAuth"), and enable it.
3. Go to **APIs & Services → OAuth consent screen**:
   - Choose **External** user type.
   - Fill in app name, support email, and developer contact.
   - Save and continue through the scopes / test users screens.
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Add the following to **Authorized redirect URIs**:
     - `http://localhost:3000/auth/google/callback` (local dev)
     - `https://<your-production-domain>/auth/google/callback` (production, if applicable)
5. Click **Create**. Copy the **Client ID** and **Client Secret** into your `.env`:

```
GOOGLE_CLIENT_ID=<paste here>
GOOGLE_CLIENT_SECRET=<paste here>
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

> The `.env` file is gitignored — never commit real credentials.

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
