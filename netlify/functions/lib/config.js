const REQUIRED_ENV = [
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "TOKEN_ENCRYPTION_KEY",
  "OAUTH_STATE_SECRET",
  "APP_URL",
];

function assertEnv() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

function appUrl() {
  const url = process.env.APP_URL;
  if (!url) {
    throw new Error("APP_URL is missing");
  }
  return url.replace(/\/$/, "");
}

module.exports = {
  assertEnv,
  appUrl,
};
