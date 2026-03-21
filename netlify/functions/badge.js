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
    dot: "#3fb950"
  },
  light: {
    bg1: "#ffffff",
    bg2: "#f6f8fa",
    title: "#0969da",
    text: "#24292f",
    dot: "#2da44e"
  },
  dracula: {
    bg1: "#282a36",
    bg2: "#44475a",
    title: "#ff79c6",
    text: "#f8f8f2",
    dot: "#50fa7b"
  },
  synthwave: {
    bg1: "#262335",
    bg2: "#262335",
    title: "#ff7edb",
    text: "#f9f9f9",
    dot: "#36f9f6"
  }
};

function svgBadge({ username, year, stats, theme = "dark" }) {
  const colors = THEMES[theme] || THEMES.dark;

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
      const y = 84 + index * 32;
      const delay = index * 100 + 300;
      return `
    <g class="stagger" style="animation-delay: ${delay}ms;">
      <circle cx="30" cy="${y - 6}" r="6" fill="${colors.dot}" />
      <text x="48" y="${y}" fill="${colors.text}" font-size="16" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif" font-weight="600">${escapeXml(line.label)}</text>
      <text x="550" y="${y}" fill="${colors.text}" font-size="16" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif" font-weight="700" text-anchor="end">${escapeXml(line.value)}</text>
    </g>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="580" height="290" role="img" aria-label="${escapeXml(username)} GitHub stats ${escapeXml(year)}">
  <defs>
    <clipPath id="cardClip">
      <rect width="580" height="290" rx="14"/>
    </clipPath>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors.bg1}" />
      <stop offset="100%" stop-color="${colors.bg2}" />
    </linearGradient>
    <style>
      .title { font: 800 24px -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif; fill: ${colors.title}; animation: fadeInDown 0.6s ease-out forwards; opacity: 0; }
      .divider { animation: growWidth 0.6s ease-out 0.2s forwards; stroke-dasharray: 520; stroke-dashoffset: 520; }
      .stagger { opacity: 0; animation: slideRight 0.5s ease-out forwards; }
      
      .orb1 { animation: float1 12s ease-in-out infinite alternate; }
      .orb2 { animation: float2 14s ease-in-out infinite alternate; transform-origin: center; }
      .orb3 { animation: float3 16s ease-in-out infinite alternate; }

      @keyframes float1 {
        0% { transform: translate(0, 0) scale(1); }
        100% { transform: translate(-40px, 30px) scale(1.2); }
      }
      @keyframes float2 {
        0% { transform: translate(0, 0) scale(1); }
        100% { transform: translate(30px, -40px) scale(0.8); }
      }
      @keyframes float3 {
        0% { transform: translate(0, 0) scale(1); }
        100% { transform: translate(40px, 10px) scale(1.1); }
      }

      @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideRight {
        from { opacity: 0; transform: translateX(-15px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes growWidth {
        from { stroke-dashoffset: 520; }
        to { stroke-dashoffset: 0; }
      }
    </style>
  </defs>
  <rect width="580" height="290" rx="14" fill="url(#bg)" stroke="${colors.bg2}" stroke-width="2"/>
  
  <g clip-path="url(#cardClip)" opacity="0.12" style="isolation: isolate;">
    <circle cx="500" cy="50" r="100" fill="${colors.title}" class="orb1" />
    <circle cx="550" cy="260" r="80" fill="${colors.dot}" class="orb2" />
    <circle cx="100" cy="250" r="120" fill="${colors.text}" class="orb3" />
  </g>

  <text x="30" y="45" class="title">${escapeXml(username)} GitHub Stats (${escapeXml(year)})</text>
  <line x1="30" y1="58" x2="550" y2="58" stroke="${colors.text}" stroke-opacity="0.2" stroke-width="1" class="divider" />
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
    const svg = svgBadge({ username, year, stats, theme });

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
