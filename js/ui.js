/* =====================================================================
   ui.js: the building blocks every page is made from
   ---------------------------------------------------------------------
   Every function here takes plain data and RETURNS A STRING OF HTML.
   None of them put anything on the page themselves; page.js decides
   where each piece goes. Keeping "build the HTML" separate from
   "show it" makes each piece small and easy to follow.

   Styling: Tailwind classes using the Gumroad colours from theme.js.
   Uses:     SPORTS (feeds.js)
   ===================================================================== */


// ===== 1. Safety and formatting helpers =====

// Feed text could contain "<" or quotes. Escaping stops it from being
// read as HTML, so a headline can never inject code into our page.
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Only allow https:// links and images; anything else becomes empty.
function safeUrl(url) {
  return /^https:\/\//i.test(url || '') ? escapeHtml(url) : '';
}

// "17:30" in the reader's own time zone.
function formatTime(iso) {
  const date = new Date(iso);
  if (isNaN(date)) return '';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// "Saturday 10 October 2026" for the masthead.
function formatLongDate(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// "3 h ago" / "25 min ago" / "2 d ago" for story timestamps.
function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60000);
  if (isNaN(minutes)) return '';
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} d ago`;
}


// ===== 2. Page chrome: masthead, section nav, footer =====

// The newspaper name block at the top of every page.
// `updatedAt` is a Date, or null while data is still loading.
function renderMasthead(updatedAt) {
  const updated = updatedAt ? `Updated ${formatTime(updatedAt)}` : 'Loading today’s edition…';
  return `
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-ink py-2 text-xs font-medium uppercase tracking-wider">
      <span>${formatLongDate(new Date())}</span>
      <span class="hidden sm:inline">Daily sports edition · Vol. 1</span>
      <span>${updated}</span>
    </div>
    <a href="index.html" class="block py-4 text-center font-display text-[clamp(40px,9vw,104px)] font-bold uppercase leading-none tracking-tight">
      The Final Whistle
    </a>
    <div class="double-rule"></div>`;
}

// The row of section links. The current section gets a pink pill.
function renderNav(activeKey) {
  const links = [{ key: 'front', label: 'Front page', page: 'index.html' }]
    .concat(Object.entries(SPORTS).map(([key, sport]) => ({ key, label: sport.label, page: sport.page })));

  const items = links.map((link) => {
    const isActive = link.key === activeKey;
    const look = isActive ? 'bg-pink' : 'bg-white hover:bg-ink hover:text-white';
    return `
      <a href="${link.page}" ${isActive ? 'aria-current="page"' : ''}
         class="whitespace-nowrap rounded-full border border-ink px-4 py-1.5 text-sm font-medium transition-colors ${look}">
        ${link.label}
      </a>`;
  });

  return `<div class="ticker flex gap-2 overflow-x-auto py-3">${items.join('')}</div>`;
}

// Small print at the bottom of every page.
function renderFooter() {
  return `
    <div class="mt-12 border-t-2 border-ink py-6 text-sm">
      <p class="font-display text-lg font-bold uppercase">The Final Whistle</p>
      <p class="mt-1 max-w-prose text-ink/70">
        A Web Technologies mini project built with HTML, Tailwind CSS and JavaScript.
        Live scores and headlines come from ESPN's public feeds. When they can't be reached,
        the page shows clearly labelled sample data instead.
      </p>
    </div>`;
}


// ===== 3. Small pieces: pills, badges, section bars =====

// The coloured status pill on each score card: LIVE / FT / kick-off time.
function renderStatusPill(game) {
  const base = 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-ink px-2.5 py-0.5 text-xs font-bold';

  if (game.status === 'in') {
    return `<span class="${base} bg-red text-white"><span class="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></span>LIVE ${escapeHtml(game.detail)}</span>`;
  }
  if (game.status === 'post') {
    return `<span class="${base} bg-ink text-white">${escapeHtml(game.detail || 'FT')}</span>`;
  }
  return `<span class="${base} bg-white">${formatTime(game.date)}</span>`;
}

// Tells the reader whether they're seeing live or sample data.
function renderSourceChip(live) {
  const base = 'inline-block shrink-0 whitespace-nowrap rounded-full border border-ink px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide';
  if (live.scores && live.news) {
    return `<span class="${base} bg-green text-white">Live · ESPN</span>`;
  }
  if (live.scores || live.news) {
    return `<span class="${base} bg-yellow" title="One of the live feeds couldn't be reached">Partly sample</span>`;
  }
  return `<span class="${base} bg-yellow" title="The live feed couldn't be reached, so these are made-up results">Sample data</span>`;
}

// A team logo, or a black square with the team's initials if there's no logo.
function renderTeamBadge(side) {
  const logo = safeUrl(side.logo);
  if (logo) {
    return `<img src="${logo}" alt="" class="h-6 w-6 shrink-0 object-contain" loading="lazy">`;
  }
  return `<span class="grid h-6 w-6 shrink-0 place-items-center rounded bg-ink text-[9px] font-bold text-white">${escapeHtml(side.abbr.slice(0, 3))}</span>`;
}

// A black newspaper-style heading bar ("SCORES OF THE DAY").
// `extraHtml` goes on the right, e.g. the live/sample chip.
function renderSectionBar(title, extraHtml = '') {
  return `
    <div class="mb-3 flex items-center justify-between gap-2 border-b-2 border-ink pb-1.5">
      <h2 class="font-display text-sm font-bold uppercase tracking-widest">${escapeHtml(title)}</h2>
      ${extraHtml}
    </div>`;
}


// ===== 4. Score cards: one design per kind of sport =====

// Pick the right card for the game's kind.
// `compact` shortens long cards (used on the front page).
function renderGameCard(game, { compact = false } = {}) {
  if (game.kind === 'race') return renderRaceCard(game, compact);
  if (game.kind === 'tennis') return renderTennisCard(game);
  return renderTeamMatchCard(game);
}

// Shared outer box for every card: white, black border, lifts on hover.
function cardShell(header, body) {
  return `
    <article class="lift rounded border border-ink bg-white p-3">
      <div class="mb-2 flex items-center justify-between gap-2 text-xs">
        ${header}
      </div>
      ${body}
    </article>`;
}

// Football / basketball: two rows, each with a badge, a name and a score.
function renderTeamMatchCard(game) {
  // The winner is bold; if the match is finished, the loser fades a little.
  const row = (side) => {
    const faded = game.status === 'post' && !side.winner ? 'text-ink/50' : '';
    const bold = side.winner ? 'font-bold' : 'font-medium';
    return `
      <div class="flex items-center gap-2 py-0.5 ${faded}">
        ${renderTeamBadge(side)}
        <span class="flex-1 truncate ${bold}">${escapeHtml(side.name)}</span>
        <span class="font-display text-lg font-bold tabular-nums">${escapeHtml(side.score)}</span>
      </div>`;
  };

  const header = `<span class="truncate font-medium text-ink/70">${escapeHtml(game.league)}</span>${renderStatusPill(game)}`;
  return cardShell(header, row(game.home) + row(game.away));
}

// Formula 1: the latest session and its finishing order.
function renderRaceCard(game, compact) {
  const rows = compact ? game.results.slice(0, 3) : game.results;

  const list = rows.map((driver) => `
    <li class="flex items-baseline gap-2 border-b border-ink/10 py-1 last:border-0">
      <span class="w-6 font-display font-bold tabular-nums">${escapeHtml(driver.pos)}</span>
      <span class="flex-1 truncate font-medium">${escapeHtml(driver.name)}</span>
      <span class="truncate text-xs text-ink/60">${escapeHtml(driver.team)}</span>
    </li>`).join('');

  const header = `<span class="truncate font-medium text-ink/70">${escapeHtml(game.session)}</span>${renderStatusPill(game)}`;
  const body = `
    <p class="mb-1 font-display font-bold">${escapeHtml(game.name)}</p>
    ${rows.length ? `<ol class="text-sm">${list}</ol>` : '<p class="text-sm text-ink/60">No results yet.</p>'}`;
  return cardShell(header, body);
}

// Tennis: two players, with a little box for each set they played.
function renderTennisCard(game) {
  const row = (player) => {
    const sets = player.sets.map((score) =>
      `<span class="grid h-6 w-6 place-items-center rounded border border-ink text-xs font-bold tabular-nums ${player.winner ? 'bg-green text-white' : ''}">${escapeHtml(score)}</span>`
    ).join('');
    return `
      <div class="flex items-center gap-2 py-0.5">
        <span class="flex-1 truncate ${player.winner ? 'font-bold' : 'font-medium'}">${escapeHtml(player.name)}</span>
        <span class="flex gap-1">${sets}</span>
      </div>`;
  };

  const label = [game.league, game.round].filter(Boolean).join(' · ');
  const header = `<span class="truncate font-medium text-ink/70">${escapeHtml(label)}</span>${renderStatusPill(game)}`;
  return cardShell(header, row(game.p1) + row(game.p2));
}


// ===== 5. The scores ticker (the yellow strip under the nav) =====

// One short chip of text summarising a game.
function renderTickerItem(game) {
  let text;
  if (game.kind === 'race') {
    const leader = game.results[0];
    text = `${game.session}: ${leader ? leader.name : 'TBC'}`;
  } else if (game.kind === 'tennis') {
    text = `${game.p1.name} ${game.p1.sets.join('-')} v ${game.p2.sets.join('-')} ${game.p2.name}`;
  } else {
    const home = game.home.abbr || game.home.name;
    const away = game.away.abbr || game.away.name;
    text = game.status === 'pre' ? `${home} v ${away}` : `${home} ${game.home.score}–${game.away.score} ${away}`;
  }

  const dot = game.status === 'in' ? '<span class="h-2 w-2 rounded-full bg-red"></span>' : '';
  const when = game.status === 'pre' ? formatTime(game.date) : escapeHtml(game.detail);
  return `
    <li class="flex shrink-0 items-center gap-2 rounded-full border border-ink bg-white px-3 py-1 text-sm">
      ${dot}<span class="font-bold">${escapeHtml(text)}</span><span class="text-ink/60">${when}</span>
    </li>`;
}

// The whole strip. Hidden when there are no games.
function renderTicker(games) {
  if (!games.length) return '';
  return `
    <div class="border-y border-ink bg-yellow">
      <ul class="ticker mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2">
        <li class="shrink-0 self-center pr-1 font-display text-xs font-bold uppercase tracking-widest">Today</li>
        ${games.map(renderTickerItem).join('')}
      </ul>
    </div>`;
}


// ===== 6. Stories =====

// The story's photo, or a bold coloured block with the sport's name
// when there's no photo (always the case for sample stories).
// `labelSize` lets the big lead use a bigger label than small cards.
function renderStoryImage(story, sportKey, heightClass, labelSize = 'text-2xl') {
  const image = safeUrl(story.image);
  if (image) {
    return `<img src="${image}" alt="" loading="lazy" class="${heightClass} w-full border-b border-ink object-cover">`;
  }
  const sport = SPORTS[sportKey];
  return `
    <div class="${heightClass} grid w-full place-items-center border-b border-ink ${sport.color}">
      <span class="px-3 text-center font-display ${labelSize} font-bold uppercase leading-none tracking-tight">${sport.label}</span>
    </div>`;
}

// Wraps content in a link if the story has a URL (live stories do).
function linkIfAny(story, innerHtml, classes) {
  const url = safeUrl(story.url);
  if (!url) return `<div class="${classes}">${innerHtml}</div>`;
  return `<a href="${url}" target="_blank" rel="noopener" class="${classes}">${innerHtml}</a>`;
}

// The big story at the top of the page.
function renderLeadStory(story, sportKey) {
  if (!story) return renderEmpty('No headlines right now.');
  const inner = `
    ${renderStoryImage(story, sportKey, 'aspect-[16/9]', 'text-5xl')}
    <div class="p-5">
      <span class="inline-block rounded-full border border-ink bg-pink px-3 py-0.5 text-xs font-bold uppercase tracking-wide">${SPORTS[sportKey].label}</span>
      <h2 class="mt-3 font-display text-[clamp(28px,4vw,44px)] font-bold leading-[1.05] tracking-tight">${escapeHtml(story.headline)}</h2>
      <p class="mt-3 text-lg text-ink/80">${escapeHtml(story.standfirst)}</p>
      <p class="mt-3 text-xs font-medium uppercase tracking-wider text-ink/60">${timeAgo(story.time)}</p>
    </div>`;
  return linkIfAny(story, inner, 'lift block overflow-hidden rounded border border-ink bg-white');
}

// A smaller story in the grid below the lead.
function renderStoryCard(story, sportKey) {
  const inner = `
    ${renderStoryImage(story, sportKey, 'aspect-[3/2]')}
    <div class="p-4">
      <h3 class="font-display text-xl font-bold leading-tight">${escapeHtml(story.headline)}</h3>
      <p class="mt-2 line-clamp-3 text-sm text-ink/75">${escapeHtml(story.standfirst)}</p>
      <p class="mt-2 text-xs font-medium uppercase tracking-wider text-ink/60">${timeAgo(story.time)}</p>
    </div>`;
  return linkIfAny(story, inner, 'lift block overflow-hidden rounded border border-ink bg-white');
}


// ===== 7. Tabs, loading and empty states =====

// League tabs (e.g. Premier League / La Liga). Only shown when a sport has more than one.
function renderTabs(leagues, activePath) {
  if (leagues.length < 2) return '';
  const tabs = leagues.map((league) => {
    const isActive = league.path === activePath;
    return `
      <button type="button" data-league="${league.path}" role="tab" aria-selected="${isActive}"
              class="rounded border border-ink px-3 py-1.5 text-sm font-bold transition-colors
                     ${isActive ? 'bg-ink text-white' : 'bg-white hover:bg-pink'}">
        ${escapeHtml(league.name)}
      </button>`;
  });
  return `<div role="tablist" class="flex flex-wrap gap-2">${tabs.join('')}</div>`;
}

// Grey pulsing boxes shown while data loads.
function renderLoading(count = 3, heightClass = 'h-24') {
  return Array.from({ length: count }, () => `<div class="skeleton ${heightClass} rounded border border-ink"></div>`).join('');
}

// A friendly message when there's nothing to show.
function renderEmpty(message) {
  return `<p class="rounded border border-dashed border-ink bg-white p-4 text-sm text-ink/70">${escapeHtml(message)}</p>`;
}
