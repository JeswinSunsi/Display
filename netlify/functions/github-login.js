const { assertEnv, appUrl } = require("./lib/config");
const { signStatePayload } = require("./lib/crypto");

exports.handler = async (event) => {
  try {
    assertEnv();

    const params = new URLSearchParams(event.queryStringParameters || {});
    const requestedUsername = (params.get("username") || "").trim().toLowerCase();

    const state = signStatePayload({
      ts: Date.now(),
      usernameHint: requestedUsername,
      nonce: Math.random().toString(36).slice(2),
    });

    const redirectUri = `${appUrl()}/auth/github/callback`;
    const scope = "read:user repo gist";

    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", scope);
    authorizeUrl.searchParams.set("state", state);

    return {
      statusCode: 302,
      headers: {
        Location: authorizeUrl.toString(),
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
