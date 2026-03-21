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
