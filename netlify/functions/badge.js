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
  },
  light: {
    bg1: "#ffffff",
    bg2: "#f6f8fa",
    title: "#0969da",
    text: "#24292f",
    dot: "#2da44e",
    bgStyle: "",
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)" opacity="0.08">
        <path class="wave" d="M-100 200 Q 150 150 300 220 T 700 200 L 700 300 L -100 300 Z" fill="${c.title}" />
        <path class="wave" d="M-100 250 Q 150 200 300 260 T 700 230 L 700 300 L -100 300 Z" fill="${c.dot}" />
      </g>
    `
  },
  dracula: {
    bg1: "#282a36",
    bg2: "#44475a",
    title: "#ff79c6",
    text: "#f8f8f2",
    dot: "#50fa7b",
    bgStyle: "",
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)" opacity="0.1">
        <polygon points="500,20 540,80 460,80" fill="${c.title}" class="poly" />
        <polygon points="100,220 150,280 50,280" fill="${c.dot}" class="poly-rev" />
        <polygon points="300,10 330,60 270,60" fill="${c.text}" class="poly" />
      </g>
    `
  },
  synthwave: {
    bg1: "#262335",
    bg2: "#1f1b2e",
    title: "#ff7edb",
    text: "#f9f9f9",
    dot: "#36f9f6",
    bgStyle: "",
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
  },
  cyberpunk: {
    bg1: "#fcee0a",
    bg2: "#ff003c",
    title: "#00ffff",
    text: "#000000",
    dot: "#000000",
    bgStyle: "",
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)" opacity="0.1">
        <rect x="50" y="50" width="100" height="15" fill="${c.title}" class="glitch" />
        <rect x="400" y="200" width="150" height="20" fill="${c.text}" class="glitch" />
        <rect x="150" y="250" width="80" height="10" fill="${c.title}" class="glitch" />
      </g>
    `
  },
  hacker: {
    bg1: "#000000",
    bg2: "#0f0f0f",
    title: "#00ff00",
    text: "#00aa00",
    dot: "#00ff00",
    bgStyle: "",
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)" opacity="0.15">
        <text x="50" y="0" fill="${c.title}" font-size="20" font-family="monospace" class="fall">101010</text>
        <text x="250" y="-30" fill="${c.dot}" font-size="24" font-family="monospace" class="fall">01011</text>
        <text x="450" y="-10" fill="${c.title}" font-size="18" font-family="monospace" class="fall">110010</text>
      </g>
    `
  },
  ocean: {
    bg1: "#001f3f",
    bg2: "#0074d9",
    title: "#7fdbff",
    text: "#ffffff",
    dot: "#39cccc",
    bgStyle: "",
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)" opacity="0.3">
        <circle cx="100" cy="300" r="10" fill="${c.dot}" class="bubble" />
        <circle cx="300" cy="300" r="15" fill="${c.title}" class="bubble" />
        <circle cx="500" cy="300" r="8" fill="${c.dot}" class="bubble" />
      </g>
    `
  },
  sunset: {
    bg1: "#ff512f",
    bg2: "#dd2476",
    title: "#ffeb3b",
    text: "#ffffff",
    dot: "#ffeb3b",
    bgStyle: "",
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)" opacity="0.15">
        <rect x="240" y="-100" width="100" height="500" fill="${c.title}" class="sun-ray" />
        <rect x="-100" y="240" width="500" height="100" fill="${c.title}" class="sun-ray" />
      </g>
    `
  },
  minimalist: {
    bg1: "#f0f0f0",
    bg2: "#e0e0e0",
    title: "#333333",
    text: "#555555",
    dot: "#111111",
    bgStyle: "",
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)">
        <circle cx="150" cy="150" r="40" fill="${c.title}" class="pulse-dot" />
        <circle cx="450" cy="100" r="60" fill="${c.dot}" class="pulse-dot" />
      </g>
    `
  },
  retro: {
    bg1: "#2b213a",
    bg2: "#150e22",
    title: "#ff007f",
    text: "#f0f0f0",
    dot: "#00e5ff",
    bgStyle: "",
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)" opacity="0.2">
        <rect x="0" y="0" width="580" height="10" fill="${c.title}" class="scanline" />
        <rect x="0" y="20" width="580" height="5" fill="${c.dot}" class="scanline" />
      </g>
    `
  },
  space: {
    bg1: "#0b0c10",
    bg2: "#1f2833",
    title: "#66fcf1",
    text: "#c5c6c7",
    dot: "#45a29e",
    bgStyle: "",
    bgMarkup: (c) => `
      <g clip-path="url(#cardClip)">
        <circle cx="0" cy="0" r="3" fill="${c.title}" class="comet" />
        <path d="M0,0 L-30,-30" stroke="${c.title}" stroke-width="2" class="comet" />
        <circle cx="0" cy="0" r="2" fill="${c.dot}" class="comet" />
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
      return `
    <g>
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
      .title { font: 800 24px -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif; fill: ${themeData.title}; }
      .divider { stroke-dasharray: 520; stroke-dashoffset: 0; }
      
      ${themeData.bgStyle}
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
