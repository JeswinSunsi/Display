const { assertEnv } = require("./lib/config");
const { decryptToken } = require("./lib/crypto");
const { fetchYearlyStats } = require("./lib/github");
const { getTokenStore } = require("./lib/store");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function svgBadge({ username, year, stats }) {
  const lines = [
    { label: "Total Commits:", value: stats.commits },
    { label: "Total PRs:", value: stats.prs },
    { label: "Total Issues:", value: stats.issues },
    { label: "Total Reviews:", value: stats.reviews },
    { label: "Private Contributions:", value: stats.privateContributions },
    { label: "Yearly Activity Total:", value: stats.total },
  ];

  const rows = lines
    .map((line, index) => {
      const y = 74 + index * 30;
      return `
    <circle cx="26" cy="${y - 7}" r="6" fill="#2ec27e" opacity="0.9" />
    <text x="40" y="${y}" fill="#ffffff" font-size="18" font-weight="700">${escapeXml(line.label)}</text>
    <text x="560" y="${y}" fill="#ffffff" font-size="18" font-weight="800" text-anchor="end">${escapeXml(line.value)}</text>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="580" height="260" role="img" aria-label="${escapeXml(username)} GitHub stats ${escapeXml(year)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f2538" />
      <stop offset="100%" stop-color="#1b3247" />
    </linearGradient>
  </defs>
  <rect width="580" height="260" rx="14" fill="url(#bg)" />
  <text x="24" y="40" fill="#2ec27e" font-size="34" font-weight="800">${escapeXml(username)} GitHub Stats (${escapeXml(year)})</text>${rows}
</svg>`;
}

exports.handler = async (event) => {
  try {
    assertEnv();

    const params = new URLSearchParams(event.queryStringParameters || {});
    const username = (params.get("username") || "").trim().toLowerCase();
    const year = Number(params.get("year") || new Date().getUTCFullYear());

    if (!username) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: "Missing username query parameter",
      };
    }

    const tokenStore = getTokenStore();
    const encryptedToken = await tokenStore.get(username, { consistency: "strong" });
    if (!encryptedToken) {
      const svg = svgBadge({
        username,
        year,
        stats: {
          commits: "-",
          prs: "-",
          issues: "-",
          reviews: "-",
          privateContributions: "-",
          total: "Connect OAuth",
        },
      });

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=60",
        },
        body: svg,
      };
    }

    const token = decryptToken(encryptedToken);
    const stats = await fetchYearlyStats({ accessToken: token, username, year });
    const svg = svgBadge({ username, year, stats });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=1800",
      },
      body: svg,
    };
  } catch (error) {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="580" height="110" role="img" aria-label="GitHub stats error">
  <rect width="580" height="110" rx="14" fill="#35162d" />
  <text x="24" y="45" fill="#ff7b72" font-size="24" font-weight="800">GitHub stats unavailable</text>
  <text x="24" y="80" fill="#f0f6fc" font-size="18">Reconnect OAuth and try again</text>
</svg>`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
      body: svg,
    };
  }
};
