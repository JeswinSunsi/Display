const { assertEnv } = require("./lib/config");
const { getTokenStore } = require("./lib/store");

exports.handler = async (event) => {
  try {
    assertEnv();

    const params = new URLSearchParams(event.queryStringParameters || {});
    const username = (params.get("username") || "").trim().toLowerCase();

    if (!username) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing username query parameter" }),
      };
    }

    const tokenStore = getTokenStore();
    await tokenStore.delete(username);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, username }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
