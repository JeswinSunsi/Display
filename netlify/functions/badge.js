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
    bgStyle: `
      .orb1 { animation: float1 12s ease-in-out infinite alternate; }
      .orb2 { animation: float2 14s ease-in-out infinite alternate; transform-origin: center; }
      .orb3 { animation: float3 16s ease-in-out infinite alternate; }
      @keyframes float1 { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(-40px, 30px) scale(1.2); } }
      @keyframes float2 { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(30px, -40px) scale(0.8); } }
      @keyframes float3 { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(40px, 10px) scale(1.1); } }
    `,
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)" opacity="0.12" style="isolation: isolate;">
        <circle cx="500" cy="50" r="100" fill="${c.title}" class="orb1" />
        <circle cx="550" cy="260" r="80" fill="${c.dot}" class="orb2" />
        <circle cx="100" cy="250" r="120" fill="${c.text}" class="orb3" />
      </g>
    `
  },
  light: {
    bg1: "#ffffff",
    bg2: "#f6f8fa",
    title: "#0969da",
    text: "#24292f",
    dot: "#2da44e",
    bgStyle: `
      .wave { animation: drift 15s linear infinite alternate; }
      @keyframes drift { 0% { transform: translateX(-50px) rotate(-2deg); } 100% { transform: translateX(50px) rotate(2deg); } }
    `,
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)" opacity="0.08">
        <path class="wave" d="M-100 200 Q 150 150 300 220 T 700 200 L 700 300 L -100 300 Z" fill="${c.title}" />
        <path class="wave" d="M-100 250 Q 150 200 300 260 T 700 230 L 700 300 L -100 300 Z" fill="${c.dot}" style="animation-duration: 20s" />
      </g>
    `
  },
  dracula: {
    bg1: "#282a36",
    bg2: "#44475a",
    title: "#ff79c6",
    text: "#f8f8f2",
    dot: "#50fa7b",
    bgStyle: `
      .poly { animation: spin 20s linear infinite; transform-origin: center; }
      .poly-rev { animation: spin-rev 25s linear infinite; transform-origin: center; }
      @keyframes spin { 100% { transform: rotate(360deg); } }
      @keyframes spin-rev { 100% { transform: rotate(-360deg); } }
    `,
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)" opacity="0.1">
        <polygon points="500,20 540,80 460,80" fill="${c.title}" class="poly" />
        <polygon points="100,220 150,280 50,280" fill="${c.dot}" class="poly-rev" />
        <polygon points="300,10 330,60 270,60" fill="${c.text}" class="poly" style="animation-duration: 15s" />
      </g>
    `
  },
  synthwave: {
    bg1: "#262335",
    bg2: "#1f1b2e",
    title: "#ff7edb",
    text: "#f9f9f9",
    dot: "#36f9f6",
    bgStyle: `
      .grid { animation: grid-move 4s linear infinite; }
      .sun { animation: pulse 4s ease-in-out infinite alternate; }
      @keyframes grid-move { 0% { transform: translateY(0); } 100% { transform: translateY(20px); } }
      @keyframes pulse { 0% { opacity: 0.8; box-shadow: 0 0 20px ${THEMES?.synthwave?.title || '#ff7edb'}; } 100% { opacity: 1; transform: scale(1.05); } }
    `,
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)">
        <circle cx="290" cy="150" r="100" fill="${c.title}" opacity="0.15" class="sun" />
        <g opacity="0.1" class="grid">
          <line x1="0" y1="20" x2="580" y2="20" stroke="${c.dot}" stroke-width="2"/>
          <line x1="0" y1="60" x2="580" y2="60" stroke="${c.dot}" stroke-width="2"/>
          <line x1="0" y1="100" x2="580" y2="100" stroke="${c.dot}" stroke-width="2"/>
          <line x1="0" y1="140" x2="580" y2="140" stroke="${c.dot}" stroke-width="2"/>
          <line x1="0" y1="180" x2="580" y2="180" stroke="${c.dot}" stroke-width="2"/>
          <line x1="0" y1="220" x2="580" y2="220" stroke="${c.dot}" stroke-width="2"/>
          <line x1="0" y1="260" x2="580" y2="260" stroke="${c.dot}" stroke-width="2"/>
          <line x1="0" y1="300" x2="580" y2="300" stroke="${c.dot}" stroke-width="2"/>
        </g>
      </g>
    `
  }
};

function svgBadge({ username, year, stats, theme = "dark" }) {
  const themeData = THEMES[theme] || THEMES.dark;

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
      <circle cx="30" cy="${y - 6}" r="6" fill="${themeData.dot}" />
      <text x="48" y="${y}" fill="${themeData.text}" font-size="16" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif" font-weight="600">${escapeXml(line.label)}</text>
      <text x="550" y="${y}" fill="${themeData.text}" font-size="16" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif" font-weight="700" text-anchor="end">${escapeXml(line.value)}</text>
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
      <stop offset="0%" stop-color="${themeData.bg1}" />
      <stop offset="100%" stop-color="${themeData.bg2}" />
    </linearGradient>
    <style>
      .title { font: 800 24px -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif; fill: ${themeData.title}; animation: fadeInDown 0.6s ease-out forwards; opacity: 0; }
      .divider { animation: growWidth 0.6s ease-out 0.2s forwards; stroke-dasharray: 520; stroke-dashoffset: 520; }
      .stagger { opacity: 0; animation: slideRight 0.5s ease-out forwards; }
      
      ${themeData.bgStyle}

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
  <rect width="580" height="290" rx="14" fill="url(#bg)" stroke="${themeData.bg2}" stroke-width="2"/>
  
  ${themeData.bgMarkup(themeData)}

  <text x="30" y="45" class="title">${escapeXml(username)} GitHub Stats (${escapeXml(year)})</text>
  <line x1="30" y1="58" x2="550" y2="58" stroke="${themeData.text}" stroke-opacity="0.2" stroke-width="1" class="divider" />
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
