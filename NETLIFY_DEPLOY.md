# Deploy To Netlify Immediately

## 1) Create GitHub OAuth App

In GitHub account settings:

1. Developer settings -> OAuth Apps -> New OAuth App
2. Homepage URL: `https://YOUR_SITE.netlify.app`
3. Authorization callback URL: `https://YOUR_SITE.netlify.app/auth/github/callback`
4. Save and copy Client ID + Client Secret

## 2) Deploy This Repo To Netlify

1. Push this repo to GitHub.
2. In Netlify: Add new project -> Import from GitHub.
3. Build settings are already in `netlify.toml`.

## 3) Add Environment Variables In Netlify

Site settings -> Environment variables:

- `APP_URL` = your Netlify site URL
- `GITHUB_CLIENT_ID` = GitHub OAuth client id
- `GITHUB_CLIENT_SECRET` = GitHub OAuth client secret
- `TOKEN_ENCRYPTION_KEY` = long random secret
- `OAUTH_STATE_SECRET` = long random secret

Then redeploy.

## Blobs Error Fix (siteID/token)

If you see:

`The environment has not been configured to use Netlify Blobs ... supply ... siteID, token`

add these env vars in Netlify too:

- `NETLIFY_SITE_ID`
- `NETLIFY_AUTH_TOKEN`

Supported aliases in this codebase:

- site id: `NETLIFY_SITE_ID`, `SITE_ID`, `BLOBS_SITE_ID`
- token: `NETLIFY_AUTH_TOKEN`, `NETLIFY_ACCESS_TOKEN`, `NETLIFY_TOKEN`, `NETLIFY_API_TOKEN`, `BLOBS_TOKEN`

Where to get them:

1. `NETLIFY_SITE_ID`
	- Netlify site -> Site configuration -> General -> Site details -> Site ID
2. `NETLIFY_AUTH_TOKEN`
	- Netlify user settings -> Applications -> Personal access tokens -> New access token

After adding, trigger a new deploy.

## Blobs Diagnostic Endpoint

You can verify Blobs configuration without exposing secret values:

- URL: `/diagnostics/blobs`
- Response fields include:
	- `blobsConfigMode`: `manual`, `auto`, or `incomplete`
	- `hasSiteID`: whether any supported site id env var is present
	- `hasToken`: whether any supported token env var is present

Optional protection:

- Set `DIAGNOSTIC_KEY` in Netlify env vars to require access.
- Then call either:
	- `/diagnostics/blobs?key=YOUR_KEY`
	- or header `x-diagnostic-key: YOUR_KEY`

## 4) Connect User Account

Open your site and click Connect with GitHub.

Direct login URL format:

`https://YOUR_SITE.netlify.app/auth/github?username=YOUR_GITHUB_USERNAME`

## 5) Use Badge URLs In README

Endpoint format:

`https://img.shields.io/endpoint?url=https://YOUR_SITE.netlify.app/badge?username=YOUR_GITHUB_USERNAME&metric=total`

Valid metrics:

- `commits`
- `prs`
- `issues`
- `reviews`
- `private`
- `total`

Example markdown:

```md
![Yearly Commits](https://img.shields.io/endpoint?url=https://YOUR_SITE.netlify.app/badge?username=YOUR_GITHUB_USERNAME&metric=commits)
![Yearly PRs](https://img.shields.io/endpoint?url=https://YOUR_SITE.netlify.app/badge?username=YOUR_GITHUB_USERNAME&metric=prs)
![Yearly Issues](https://img.shields.io/endpoint?url=https://YOUR_SITE.netlify.app/badge?username=YOUR_GITHUB_USERNAME&metric=issues)
![Yearly Reviews](https://img.shields.io/endpoint?url=https://YOUR_SITE.netlify.app/badge?username=YOUR_GITHUB_USERNAME&metric=reviews)
![Yearly Private](https://img.shields.io/endpoint?url=https://YOUR_SITE.netlify.app/badge?username=YOUR_GITHUB_USERNAME&metric=private)
![Yearly Total](https://img.shields.io/endpoint?url=https://YOUR_SITE.netlify.app/badge?username=YOUR_GITHUB_USERNAME&metric=total)
```

## Notes

- Private contributions require user consented OAuth with `repo` scope.
- For org private contributions, user may need to authorize SSO on the token.
- If a user revokes access, they can reconnect and badges resume automatically.
