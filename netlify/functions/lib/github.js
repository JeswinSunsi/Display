const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const GITHUB_OAUTH_TOKEN = "https://github.com/login/oauth/access_token";
const GITHUB_USER = "https://api.github.com/user";

async function exchangeCodeForToken({ code }) {
  const res = await fetch(GITHUB_OAUTH_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Missing access token from GitHub: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function fetchAuthenticatedUser(accessToken) {
  const res = await fetch(GITHUB_USER, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "github-yearly-badge-app",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub user lookup failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.login) {
    throw new Error("GitHub user login missing in response");
  }

  return data;
}

async function fetchYearlyStats({ accessToken, username, year }) {
  const y = Number(year);
  const from = `${y}-01-01T00:00:00Z`;
  const to = `${y}-12-31T23:59:59Z`;

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!, $reposCursor: String) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
          totalPullRequestReviewContributions
          restrictedContributionsCount
        }
        repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, after: $reposCursor) {
          totalCount
          nodes {
            stargazerCount
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  let reposCursor = null;
  let contributions = null;
  let totalRepos = 0;
  let totalStars = 0;

  while (true) {
    const res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "github-yearly-badge-app",
      },
      body: JSON.stringify({
        query,
        variables: { username, from, to, reposCursor },
      }),
    });

    if (!res.ok) {
      throw new Error(`GitHub GraphQL request failed: ${res.status}`);
    }

    const payload = await res.json();
    if (payload.errors) {
      throw new Error(`GitHub GraphQL errors: ${JSON.stringify(payload.errors)}`);
    }

    const user = payload?.data?.user;
    const c = user?.contributionsCollection;
    const repositories = user?.repositories;
    if (!c || !repositories) {
      throw new Error("GitHub GraphQL response missing stats data");
    }

    if (!contributions) {
      contributions = c;
      totalRepos = repositories.totalCount || 0;
    }

    const starsInPage = (repositories.nodes || []).reduce(
      (sum, repo) => sum + (repo?.stargazerCount || 0),
      0
    );
    totalStars += starsInPage;

    if (!repositories.pageInfo?.hasNextPage) {
      break;
    }
    reposCursor = repositories.pageInfo.endCursor;
  }

  const stats = {
    username,
    year: y,
    commits: contributions.totalCommitContributions,
    prs: contributions.totalPullRequestContributions,
    issues: contributions.totalIssueContributions,
    reviews: contributions.totalPullRequestReviewContributions,
    repos: totalRepos,
    stars: totalStars,
  };

  return stats;
}

module.exports = {
  exchangeCodeForToken,
  fetchAuthenticatedUser,
  fetchYearlyStats,
};
