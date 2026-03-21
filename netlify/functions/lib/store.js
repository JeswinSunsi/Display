const { getStore } = require("@netlify/blobs");

const SITE_ID_ENV_VARS = ["NETLIFY_SITE_ID", "SITE_ID", "BLOBS_SITE_ID"];
const TOKEN_ENV_VARS = [
  "NETLIFY_AUTH_TOKEN",
  "NETLIFY_ACCESS_TOKEN",
  "NETLIFY_TOKEN",
  "NETLIFY_API_TOKEN",
  "BLOBS_TOKEN",
];

function firstDefinedEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function hasAnyDefinedEnv(names) {
  return names.some((name) => {
    const value = process.env[name];
    return typeof value === "string" && value.trim();
  });
}

function resolveTokenStoreConfig() {
  const siteID = firstDefinedEnv(SITE_ID_ENV_VARS);
  const token = firstDefinedEnv(TOKEN_ENV_VARS);
  const hasSiteID = hasAnyDefinedEnv(SITE_ID_ENV_VARS);
  const hasToken = hasAnyDefinedEnv(TOKEN_ENV_VARS);

  let mode = "auto";
  if (siteID && token) {
    mode = "manual";
  } else if ((siteID && !token) || (!siteID && token)) {
    mode = "incomplete";
  }

  return {
    siteID,
    token,
    mode,
    hasSiteID,
    hasToken,
    siteIdEnvVars: SITE_ID_ENV_VARS,
    tokenEnvVars: TOKEN_ENV_VARS,
  };
}

function getTokenStore() {
  const config = resolveTokenStoreConfig();
  const { siteID, token } = config;

  if (siteID && token) {
    return getStore("oauth-tokens", { siteID, token });
  }

  if ((siteID && !token) || (!siteID && token)) {
    throw new Error(
      `Netlify Blobs manual config is incomplete. Set both site ID (${SITE_ID_ENV_VARS.join(
        ", "
      )}) and token (${TOKEN_ENV_VARS.join(", ")}), or set neither to use Netlify runtime-managed Blobs config.`
    );
  }

  return getStore("oauth-tokens");
}

module.exports = {
  getTokenStore,
  resolveTokenStoreConfig,
};
