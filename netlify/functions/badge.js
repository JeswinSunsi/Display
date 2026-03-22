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

const THEMES = {
  dark: {
    bg1: "#0d1117",
    bg2: "#161b22",
    title: "#58a6ff",
    text: "#c9d1d9",
    dot: "#3fb950",
    bgStyle: "",
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)" opacity="0.12" style="isolation: isolate;">
        <circle cx="500" cy="50" r="100" fill="${c.title}" class="orb1" />
        <circle cx="550" cy="260" r="80" fill="${c.dot}" class="orb2" />
        <circle cx="100" cy="250" r="120" fill="${c.text}" class="orb3" />
      </g>
    `
  }
};

const FIELD_DEFS = {
  commits: { label: "Total Commits:", key: "commits" },
  prs: { label: "Total PRs:", key: "prs" },
  issues: { label: "Total Issues:", key: "issues" },
  reviews: { label: "Total Reviews:", key: "reviews" },
  repos: { label: "Total Repos:", key: "repos" },
  stars: { label: "Total Stars:", key: "stars" },
};

const DEFAULT_FIELDS = ["commits", "prs", "issues", "reviews", "repos", "stars"];

function resolveFields(rawFields) {
  const list = String(rawFields || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  const resolved = (list.length ? list : DEFAULT_FIELDS).filter((field) => FIELD_DEFS[field]);
  return resolved.length ? resolved : DEFAULT_FIELDS;
}

function svgBadge({ username, year, stats, theme = "dark", fields = DEFAULT_FIELDS }) {
  const themeData = THEMES[theme] || THEMES.dark;
  const width = 580;
  const titleY = 45;
  const dividerY = 58;
  const firstRowY = 84;
  const rowGap = 32;

  const lines = fields.map((field) => {
    const def = FIELD_DEFS[field];
    return {
      label: def.label,
      value: stats[def.key] ?? "-",
    };
  });

  const rowCount = Math.max(lines.length, 1);
  const lastRowY = firstRowY + (rowCount - 1) * rowGap;
  const height = Math.max(130, lastRowY + 28);

  const rows = lines
    .map((line, index) => {
      const y = firstRowY + index * rowGap;
      return `
    <g>
      <circle cx="30" cy="${y - 6}" r="6" fill="${themeData.dot}" />
      <text x="48" y="${y}" fill="${themeData.text}" font-size="16" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif" font-weight="600">${escapeXml(line.label)}</text>
      <text x="550" y="${y}" fill="${themeData.text}" font-size="16" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif" font-weight="700" text-anchor="end">${escapeXml(line.value)}</text>
    </g>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="${escapeXml(username)} GitHub stats ${escapeXml(year)}">
  <defs>
    <clipPath id="cardClip">
      <rect width="${width}" height="${height}" rx="14"/>
    </clipPath>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${themeData.bg1}" />
      <stop offset="100%" stop-color="${themeData.bg2}" />
    </linearGradient>
    <style>
      .title { font: 800 24px -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif; fill: ${themeData.title}; }
      .divider { stroke-dasharray: 520; stroke-dashoffset: 0; }
      
      ${themeData.bgStyle}
    </style>
  </defs>
  <rect width="${width}" height="${height}" rx="14" fill="url(#bg)" stroke="${themeData.bg2}" stroke-width="2"/>
  
  ${themeData.bgMarkup(themeData)}

  <text x="30" y="${titleY}" class="title">${escapeXml(username)} GitHub Stats (${escapeXml(year)})</text>
  <line x1="30" y1="${dividerY}" x2="550" y2="${dividerY}" stroke="${themeData.text}" stroke-opacity="0.2" stroke-width="1" class="divider" />
  ${rows}
</svg>`;
}

exports.handler = async (event) => {
  try {
    assertEnv();

    const params = new URLSearchParams(event.queryStringParameters || {});
    const username = (params.get("username") || "").trim().toLowerCase();
    const year = Number(params.get("year") || new Date().getUTCFullYear());
    const theme = (params.get("theme") || "dark").toLowerCase();
    const fields = resolveFields(params.get("fields"));

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
        theme,
        fields,
        stats: {
          commits: "-",
          prs: "-",
          issues: "-",
          reviews: "-",
          repos: "-",
          stars: "Connect OAuth",
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
    const svg = svgBadge({ username, year, stats, theme, fields });

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
