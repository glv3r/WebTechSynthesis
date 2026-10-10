/* =====================================================================
   page.js: decides what each page shows, and puts it on screen
   ---------------------------------------------------------------------
   Every HTML page has the same empty boxes (masthead, nav, ticker,
   lead, rail, grid, footer) and a `data-sport` on <body>:
     data-sport="front"     → the front page, a bit of every sport
     data-sport="football"  → one sport's section (same for the others)
   This file reads that value, loads the data (feeds.js), turns it
   into HTML (ui.js) and drops it into the boxes.

   Uses: SPORTS, loadLeague (feeds.js) and the render… functions (ui.js)
   ===================================================================== */


// ===== 1. Page state =====
const PAGE_SPORT = document.body.dataset.sport; // 'front' | 'football' | 'basketball' | 'f1' | 'tennis'
const REFRESH_MS = 60 * 1000;                    // re-check scores every minute

let activeLeague = null; // on sport pages: the league tab that's selected
let requestId = 0;       // bumps on every load so a slow, old request can't overwrite a newer one


// ===== 2. Small DOM helpers =====

// Put an HTML string inside the element with this id (if the page has it).
function setHtml(id, html) {
  const element = document.getElementById(id);
  if (element) element.innerHTML = html;
}

// Combine the live/sample flags from several leagues:
// the front page only counts as "live" if every league was live.
function combineLive(results) {
  return {
    scores: results.every((r) => r.live.scores),
    news: results.every((r) => r.live.news),
  };
}


// ===== 3. Things every page has: masthead, nav, footer =====
function showChrome() {
  setHtml('masthead', renderMasthead(null));
  setHtml('nav', renderNav(PAGE_SPORT));
  setHtml('footer', renderFooter());
}

// Grey placeholders while we wait for the network.
function showLoading() {
  setHtml('lead', renderLoading(1, 'h-[420px]'));
  setHtml('rail', renderLoading(4, 'h-24'));
  setHtml('grid', renderLoading(3, 'h-64'));
}


// ===== 4. A sport's section page =====

// Load the selected league and fill the page with its scores and stories.
async function showSportPage({ fresh = false } = {}) {
  const sport = SPORTS[PAGE_SPORT];
  if (!activeLeague) activeLeague = sport.leagues[0];

  setHtml('tabs', renderTabs(sport.leagues, activeLeague.path));
  if (!fresh) showLoading();

  const myRequest = ++requestId;
  const data = await loadLeague(PAGE_SPORT, activeLeague, { fresh });
  if (myRequest !== requestId) return; // the reader switched tabs meanwhile

  // Ticker: every game in this league
  setHtml('ticker', renderTicker(data.games));

  // Lead story: the newest headline
  setHtml('lead', renderLeadStory(data.stories[0], PAGE_SPORT));

  // Scores rail: every game, or a message on days with no matches
  setHtml('rail-head', renderSectionBar('Scores of the day', renderSourceChip(data.live)));
  setHtml('rail', data.games.length
    ? data.games.map((game) => renderGameCard(game)).join('')
    : renderEmpty(`No ${activeLeague.name} matches today. Check back on matchday.`));

  // Story grid: the next six headlines
  setHtml('grid-head', renderSectionBar(`More ${activeLeague.name}`));
  const more = data.stories.slice(1, 7);
  setHtml('grid', more.length
    ? more.map((story) => renderStoryCard(story, PAGE_SPORT)).join('')
    : renderEmpty('No more stories right now.'));

  setHtml('masthead', renderMasthead(new Date()));
}

// Clicking a league tab: remember it and reload.
// One listener on the tab row handles every tab ("event delegation").
function listenForTabClicks() {
  const tabs = document.getElementById('tabs');
  if (!tabs) return;
  tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-league]');
    if (!button) return;
    activeLeague = SPORTS[PAGE_SPORT].leagues.find((l) => l.path === button.dataset.league);
    showSportPage();
  });
}


// ===== 5. The front page: a bit of every sport =====

// One column per sport: a heading link, its top story, and two scores.
function renderSectionColumn(section) {
  const sport = SPORTS[section.key];
  // Football's first story is already the lead, so use its second one.
  const story = section.key === 'football' ? section.stories[1] : section.stories[0];
  const games = section.games.slice(0, 2);

  return `
    <div class="space-y-3 lg:px-5 first:lg:pl-0 last:lg:pr-0">
      <a href="${sport.page}" class="group flex items-center justify-between border-b-2 border-ink pb-1.5">
        <h3 class="font-display text-sm font-bold uppercase tracking-widest">${sport.label}</h3>
        <span class="rounded-full border border-ink px-2 text-xs font-bold group-hover:bg-pink">Open ›</span>
      </a>
      ${story ? renderStoryCard(story, section.key) : renderEmpty('No headlines right now.')}
      ${games.map((game) => renderGameCard(game, { compact: true })).join('')}
    </div>`;
}

// Load the first league of every sport at once, then lay out the front page.
async function showFrontPage({ fresh = false } = {}) {
  if (!fresh) showLoading();

  const keys = Object.keys(SPORTS);
  const results = await Promise.all(keys.map((key) => loadLeague(key, SPORTS[key].leagues[0], { fresh })));
  const sections = keys.map((key, i) => ({ key, ...results[i] }));
  const allGames = sections.flatMap((section) => section.games);

  // Ticker: everything happening today
  setHtml('ticker', renderTicker(allGames));

  // Lead story: the first sport that has a headline (football normally)
  const leadSection = sections.find((section) => section.stories.length) || sections[0];
  setHtml('lead', renderLeadStory(leadSection.stories[0], leadSection.key));

  // Scores rail: the top two games from each sport
  const railGames = sections.flatMap((section) => section.games.slice(0, 2));
  setHtml('rail-head', renderSectionBar('Scores of the day', renderSourceChip(combineLive(results))));
  setHtml('rail', railGames.length
    ? railGames.map((game) => renderGameCard(game, { compact: true })).join('')
    : renderEmpty('No matches today.'));

  // Section columns
  setHtml('grid-head', renderSectionBar('Around the sections'));
  setHtml('grid', sections.map(renderSectionColumn).join(''));

  setHtml('masthead', renderMasthead(new Date()));
}


// ===== 6. Start-up and auto-refresh =====

// Draw the page once, then quietly refresh the data every minute
// so live scores keep moving without a reload.
function start() {
  showChrome();

  const show = PAGE_SPORT === 'front' ? showFrontPage : showSportPage;
  if (PAGE_SPORT !== 'front') listenForTabClicks();

  show();
  setInterval(() => show({ fresh: true }), REFRESH_MS);
}

start();
