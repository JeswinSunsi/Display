const { getStore } = require("@netlify/blobs");

function getTokenStore() {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token =
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.NETLIFY_ACCESS_TOKEN ||
    process.env.NETLIFY_TOKEN;

  if (siteID && token) {
    return getStore("oauth-tokens", { siteID, token });
  }

  return getStore("oauth-tokens");
}

module.exports = {
  getTokenStore,
};
