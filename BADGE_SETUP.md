# GitHub Yearly Stats Badges (Auto-Updated)

This repo includes a workflow that queries GitHub's GraphQL API for yearly contribution totals and publishes badge JSON files to a gist. You can then display those badges in any README via [shields.io endpoint badges](https://shields.io/badges/endpoint-badge).

For immediate OAuth deployment on Netlify, use `NETLIFY_DEPLOY.md`.

## What It Tracks

For the current UTC year:

- Commits (`totalCommitContributions`)
- Pull requests (`totalPullRequestContributions`)
- Issues (`totalIssueContributions`)
- PR reviews (`totalPullRequestReviewContributions`)
- Private/restricted contributions (`restrictedContributionsCount`)
- Total activity (sum of all tracked values)

## 1) Create a Personal Access Token

Create a classic PAT and add it to this repository as secret `GH_STATS_TOKEN`.

Required scopes:

- `read:user` (read contribution data)
- `repo` (required to include private repository contributions)
- `gist` (update your gist)

Important:

- The token must belong to the same GitHub account whose stats you are fetching.
- If your org uses SSO, authorize this token for that org, or private org contributions may not be counted.

## 2) Create a Public Gist

1. Create a public gist with any placeholder content.
2. Copy the gist ID from the URL.
3. Add it as repository secret `GIST_ID`.

Optional:

- Add secret `GITHUB_USERNAME` if the target username is not the repository owner.

## 3) Run Workflow

Workflow file: `.github/workflows/update-github-stats-badges.yml`

- Manual run: Actions -> "Update GitHub Stats Badges" -> Run workflow
- Automatic run: daily (cron)

After first run, your gist will contain files:

- `github-yearly-commits.json`
- `github-yearly-prs.json`
- `github-yearly-issues.json`
- `github-yearly-reviews.json`
- `github-yearly-private.json`
- `github-yearly-total.json`
- `github-yearly-raw-stats.json`

## 4) Add Badges to README

Replace `<GIST_ID>` below with your gist ID:

```md
![Yearly Commits](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/<GIST_ID>/raw/github-yearly-commits.json)
![Yearly PRs](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/<GIST_ID>/raw/github-yearly-prs.json)
![Yearly Issues](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/<GIST_ID>/raw/github-yearly-issues.json)
![Yearly Reviews](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/<GIST_ID>/raw/github-yearly-reviews.json)
![Yearly Private](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/<GIST_ID>/raw/github-yearly-private.json)
![Yearly Total](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/<GIST_ID>/raw/github-yearly-total.json)
```

## Notes

- GitHub only returns private contribution totals to authorized users/tokens.
- If `private/restricted` stays at `0`, the token usually lacks private repo access (`repo`) or org SSO authorization.
- Contribution metrics come from GitHub contribution APIs and may differ slightly from custom counting logic.
- If a badge does not update immediately, append a cache buster query string once, e.g. `&t=TIMESTAMP`.

## OAuth Mode (Recommended For Public Release)

If this is for many users, use GitHub OAuth instead of asking each user to manually create a PAT.

### User Experience

1. User clicks `Sign in with GitHub` on your app.
2. User approves scopes.
3. Your backend stores the returned access token securely.
4. Your backend calls GitHub GraphQL with that user token and computes yearly stats.
5. Your backend serves JSON badge endpoints (or updates a gist on the user's behalf).
6. User adds a stable Shields badge URL from your service to README.

### Recommended Scopes

- `read:user`
- `repo` (needed for private contribution visibility)
- `gist` (only if your app writes to user gists)

### Badge Hosting Choices

1. Serve JSON from your API (recommended)
	- Example badge URL pattern:
	  `https://img.shields.io/endpoint?url=https://your-domain.com/badge/<github-username>/yearly-commits.json`
2. Keep gist-based storage
	- Your backend writes JSON files to the user's gist after OAuth.

### Security Requirements

- Encrypt tokens at rest.
- Never expose raw OAuth tokens to the browser after callback.
- Use short session cookies and CSRF protection for auth routes.
- Provide a disconnect/revoke option for users.
- If org SSO is enabled, users must authorize the OAuth token for that org.

### Minimal OAuth Release Checklist

1. Create a GitHub OAuth App.
2. Set callback URL (for example: `https://your-domain.com/auth/github/callback`).
3. Store `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as backend secrets.
4. Implement login/callback/token storage.
5. Implement an endpoint that returns Shields-compatible JSON (`schemaVersion`, `label`, `message`, `color`).
6. Add background refresh (daily/hourly) to reduce API calls.
