const { resolveTokenStoreConfig } = require("./lib/store");

function hasDiagnosticAccess(event) {
  const requiredKey = process.env.DIAGNOSTIC_KEY;
  if (!requiredKey) {
    return true;
  }

  const params = new URLSearchParams(event.queryStringParameters || {});
  const queryKey = params.get("key") || "";
  const headerKey =
    event.headers?.["x-diagnostic-key"] ||
    event.headers?.["X-Diagnostic-Key"] ||
    "";

  return queryKey === requiredKey || headerKey === requiredKey;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: "GET",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!hasDiagnosticAccess(event)) {
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Forbidden" }),
    };
  }

  const config = resolveTokenStoreConfig();

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({
      ok: config.mode !== "incomplete",
      blobsConfigMode: config.mode,
      hasSiteID: config.hasSiteID,
      hasToken: config.hasToken,
      siteIdEnvVarsChecked: config.siteIdEnvVars,
      tokenEnvVarsChecked: config.tokenEnvVars,
      timestamp: new Date().toISOString(),
    }),
  };
};
