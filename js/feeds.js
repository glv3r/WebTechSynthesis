/* =====================================================================
   feeds.js: where the scores and headlines come from
   ---------------------------------------------------------------------
   1. SPORTS lists every section of the magazine and which leagues it
      covers. Adding a sport = adding one entry here + one HTML page.
   2. We ask ESPN's free public feeds for today's scoreboard and news.
   3. ESPN's data is big and nested, so "normalise" functions turn it
      into small, simple objects that the rest of the site understands.
   4. If ESPN can't be reached, we fall back to SAMPLE data (sample.js)
      so the page never breaks during a demo.

   Uses:     SAMPLE (sample.js)
   Provides: SPORTS, loadLeague(sportKey, league)
   ===================================================================== */


// ===== 1. The sections of the magazine =====
// kind tells the UI which kind of score card to draw:
//   'team'   → two teams and a score (football, basketball)
//   'race'   → a finishing order (Formula 1)
//   'tennis' → two players and set scores
const SPORTS = {
  football: {
    label: 'Football',
    kind: 'team',
    page: 'football.html',
    color: 'bg-pink',
    leagues: [
      { name: 'Premier League', path: 'soccer/eng.1' },
      { name: 'La Liga', path: 'soccer/esp.1' },
      { name: 'Champions League', path: 'soccer/uefa.champions' },
    ],
  },
  basketball: {
    label: 'Basketball',
    kind: 'team',
    page: 'basketball.html',
    color: 'bg-orange',
    leagues: [{ name: 'NBA', path: 'basketball/nba' }],
  },
  f1: {
    label: 'Formula 1',
    kind: 'race',
    page: 'f1.html',
    color: 'bg-yellow',
    leagues: [{ name: 'Formula 1', path: 'racing/f1' }],
  },
  tennis: {
    label: 'Tennis',
    kind: 'tennis',
    page: 'tennis.html',
    color: 'bg-purple',
    leagues: [
      { name: 'ATP', path: 'tennis/atp' },
      { name: 'WTA', path: 'tennis/wta' },
    ],
  },
};


// ===== 2. Talking to ESPN =====
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/';
const TIMEOUT_MS = 6000;

// Fetch a URL and return its JSON.
// Gives up after TIMEOUT_MS so a slow network can't freeze the page.
async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}


// ===== 3. Normalising: ESPN's shape → our simple shape =====
// Every game object we produce has a `kind` ('team' | 'race' | 'tennis')
// and a `status`: 'pre' (not started), 'in' (live) or 'post' (finished).

// Pull the state ('pre' | 'in' | 'post') and the short text ("FT", "67'")
// out of an ESPN status object.
function readStatus(status) {
  const type = (status && status.type) || {};
  return {
    status: type.state || 'pre',
    detail: type.shortDetail || type.detail || '',
  };
}

// One team in a football/basketball match.
function normaliseTeamSide(competitor) {
  const team = competitor.team || {};
  return {
    name: team.shortDisplayName || team.displayName || 'TBC',
    abbr: team.abbreviation || '',
    score: competitor.score ?? '',
    logo: team.logo || '',
    winner: Boolean(competitor.winner),
  };
}

// A football or basketball match: home team, away team, score.
function normaliseTeamMatch(event, leagueName) {
  const competition = (event.competitions || [])[0] || {};
  const competitors = competition.competitors || [];
  const home = competitors.find((c) => c.homeAway === 'home') || competitors[0] || {};
  const away = competitors.find((c) => c !== home) || {};

  return {
    kind: 'team',
    league: leagueName,
    date: event.date,
    ...readStatus(event.status || competition.status),
    home: normaliseTeamSide(home),
    away: normaliseTeamSide(away),
  };
}

// A Formula 1 weekend has several sessions (practice, qualifying, race).
// We show the latest session that has started, with its top 10.
function normaliseRace(event) {
  const sessions = event.competitions || [];
  const started = sessions.filter((s) => readStatus(s.status).status !== 'pre');
  const session = started[started.length - 1] || sessions[sessions.length - 1] || {};

  const results = (session.competitors || [])
    .slice()
    .sort((a, b) => (a.order || 99) - (b.order || 99))
    .slice(0, 10)
    .map((driver) => ({
      pos: driver.order,
      name: (driver.athlete && (driver.athlete.displayName || driver.athlete.shortName)) || 'TBC',
      team: (driver.team && driver.team.displayName) || (driver.vehicle && driver.vehicle.manufacturer) || '',
    }));

  return {
    kind: 'race',
    league: 'Formula 1',
    name: event.name || event.shortName || 'Grand Prix',
    session: (session.type && (session.type.text || session.type.abbreviation)) || 'Race',
    date: session.date || event.date,
    ...readStatus(session.status || event.status),
    results,
  };
}

// One player in a tennis match, with their score for each set.
function normaliseTennisPlayer(competitor) {
  const athlete = competitor.athlete || competitor.roster || {};
  return {
    name: athlete.displayName || athlete.shortName || 'TBC',
    sets: (competitor.linescores || []).map((set) => set.value),
    winner: Boolean(competitor.winner),
  };
}

// A tennis tournament holds many matches. ESPN sometimes groups them
// (e.g. men's singles / women's singles), so we gather them all first.
function normaliseTennisEvent(event, leagueName) {
  let matches = event.competitions || [];
  if (event.groupings) {
    matches = event.groupings.flatMap((group) => group.competitions || []);
  }

  return matches.map((match) => {
    const players = match.competitors || [];
    return {
      kind: 'tennis',
      league: `${leagueName} · ${event.shortName || event.name || ''}`.trim(),
      round: (match.round && match.round.displayName) || '',
      date: match.date || event.date,
      ...readStatus(match.status),
      p1: normaliseTennisPlayer(players[0] || {}),
      p2: normaliseTennisPlayer(players[1] || {}),
    };
  });
}

// Turn a whole ESPN scoreboard into a list of our game objects.
function normaliseScoreboard(data, kind, leagueName) {
  const events = data.events || [];

  if (kind === 'race') {
    return events.map(normaliseRace);
  }
  if (kind === 'tennis') {
    const matches = events.flatMap((event) => normaliseTennisEvent(event, leagueName));
    return sortLiveFirst(matches).slice(0, 12);
  }
  return sortLiveFirst(events.map((event) => normaliseTeamMatch(event, leagueName)));
}

// One news article → our story shape.
function normaliseStory(article) {
  const image = (article.images || [])[0];
  const web = article.links && article.links.web;
  return {
    headline: article.headline || '',
    standfirst: article.description || '',
    image: image ? image.url : '',
    time: article.published || '',
    url: web ? web.href : '',
  };
}

// Put live games first, then finished, then upcoming.
function sortLiveFirst(games) {
  const order = { in: 0, post: 1, pre: 2 };
  return games.slice().sort((a, b) => order[a.status] - order[b.status]);
}


// ===== 4. Loading a league (live first, sample if that fails) =====
// Results are remembered here so switching tabs doesn't refetch.
const leagueCache = new Map();

// Returns { games, stories, live: { scores: bool, news: bool } }.
// `fresh: true` skips the cache (used by the auto-refresh).
async function loadLeague(sportKey, league, { fresh = false } = {}) {
  if (!fresh && leagueCache.has(league.path)) {
    return leagueCache.get(league.path);
  }

  const kind = SPORTS[sportKey].kind;
  const sample = SAMPLE[league.path] || { games: [], stories: [] };

  // Ask for scores and news at the same time; either may fail on its own.
  const [board, news] = await Promise.allSettled([
    fetchJson(`${ESPN_BASE}${league.path}/scoreboard`),
    fetchJson(`${ESPN_BASE}${league.path}/news`),
  ]);

  const result = {
    games: sample.games,
    stories: sample.stories,
    live: { scores: false, news: false },
  };

  // Scores: use the live feed if it arrived and could be read.
  // An empty list is still "live": it just means no matches today.
  if (board.status === 'fulfilled') {
    try {
      result.games = normaliseScoreboard(board.value, kind, league.name);
      result.live.scores = true;
    } catch (error) {
      console.warn('Could not read scoreboard, using sample data', error);
    }
  }

  // News: only swap in live stories if there are some.
  if (news.status === 'fulfilled') {
    const stories = (news.value.articles || []).map(normaliseStory).filter((s) => s.headline);
    if (stories.length) {
      result.stories = stories;
      result.live.news = true;
    }
  }

  // Tag every game with its sport so mixed lists (front page) can label them.
  result.games = result.games.map((game) => ({ ...game, sportKey }));

  leagueCache.set(league.path, result);
  return result;
}
