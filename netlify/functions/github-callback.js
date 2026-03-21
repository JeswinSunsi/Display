const { getStore } = require("@netlify/blobs");
const { assertEnv, appUrl } = require("./lib/config");
const { verifyAndParseState, encryptToken } = require("./lib/crypto");
const { exchangeCodeForToken, fetchAuthenticatedUser } = require("./lib/github");

exports.handler = async (event) => {
  try {
    assertEnv();

    const params = new URLSearchParams(event.queryStringParameters || {});
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing code or state" }),
      };
    }

    verifyAndParseState(state);
    const accessToken = await exchangeCodeForToken({ code });
    const user = await fetchAuthenticatedUser(accessToken);
    const username = String(user.login).toLowerCase();

    const tokenStore = getStore("oauth-tokens");
    await tokenStore.set(username, encryptToken(accessToken));

    const next = new URL(`${appUrl()}/`);
    next.searchParams.set("connected", "1");
    next.searchParams.set("username", username);

    return {
      statusCode: 302,
      headers: {
        Location: next.toString(),
        "Cache-Control": "no-store",
      },
      body: "",
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
