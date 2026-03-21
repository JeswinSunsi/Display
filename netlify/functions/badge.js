const { getStore } = require("@netlify/blobs");
const { assertEnv } = require("./lib/config");
const { decryptToken } = require("./lib/crypto");
const { fetchYearlyStats } = require("./lib/github");

const METRIC_MAP = {
  commits: { label: "commits", color: "2ea44f", key: "commits" },
  prs: { label: "PRs", color: "1f6feb", key: "prs" },
  issues: { label: "issues", color: "8250df", key: "issues" },
  reviews: { label: "reviews", color: "0969da", key: "reviews" },
  private: { label: "private", color: "bf8700", key: "privateContributions" },
  total: { label: "activity", color: "0e8a16", key: "total" },
};

function badgeJson(label, message, color) {
  return {
    schemaVersion: 1,
    label,
    message: String(message),
    color,
    cacheSeconds: 1800,
  };
}

exports.handler = async (event) => {
  try {
    assertEnv();

    const params = new URLSearchParams(event.queryStringParameters || {});
    const username = (params.get("username") || "").trim().toLowerCase();
    const metric = (params.get("metric") || "total").trim().toLowerCase();
    const year = Number(params.get("year") || new Date().getUTCFullYear());

    if (!username) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing username query parameter" }),
      };
    }

    const metricDef = METRIC_MAP[metric];
    if (!metricDef) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: `Invalid metric. Use one of: ${Object.keys(METRIC_MAP).join(", ")}` }),
      };
    }

    const tokenStore = getStore("oauth-tokens");
    const encryptedToken = await tokenStore.get(username, { consistency: "strong" });
    if (!encryptedToken) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          badgeJson(`${metricDef.label} ${year}`, "connect OAuth", "9a6700")
        ),
      };
    }

    const token = decryptToken(encryptedToken);
    const stats = await fetchYearlyStats({ accessToken: token, username, year });

    const value = stats[metricDef.key];
    const body = badgeJson(`${metricDef.label} ${year}`, value, metricDef.color);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=1800",
      },
      body: JSON.stringify(body),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(badgeJson("github stats", "error", "cf222e")),
    };
  }
};
