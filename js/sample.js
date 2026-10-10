/* =====================================================================
   sample.js: backup data for when the live feed can't be reached
   ---------------------------------------------------------------------
   These are made-up results and stories, written in the same simple
   shape that feeds.js produces from ESPN. The page always labels them
   "Sample data" so nobody mistakes them for real results.

   Provides: SAMPLE  (keyed by league path, e.g. 'soccer/eng.1')
   ===================================================================== */


// ===== 1. Helpers for building sample data =====

// A date today at the given hour and minute (used for kick-off times).
function todayAt(hour, minute) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

// A date a few hours ago (used for story timestamps).
function hoursAgo(hours) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

// Short builders so each match below fits on one readable line.
function team(name, abbr, score, winner = false) {
  return { name, abbr, score, logo: '', winner };
}

function match(league, status, detail, home, away, date = todayAt(15, 0)) {
  return { kind: 'team', league, status, detail, date, home, away };
}

function story(headline, standfirst, hours) {
  return { headline, standfirst, image: '', time: hoursAgo(hours), url: '' };
}


// ===== 2. The sample data itself =====
const SAMPLE = {

  // ----- Football: Premier League -----
  'soccer/eng.1': {
    games: [
      match('Premier League', 'in', "67'", team('Liverpool', 'LIV', '1'), team('Man City', 'MCI', '1')),
      match('Premier League', 'post', 'FT', team('Arsenal', 'ARS', '2', true), team('Chelsea', 'CHE', '1')),
      match('Premier League', 'post', 'FT', team('Aston Villa', 'AVL', '0'), team('Brighton', 'BHA', '0')),
      match('Premier League', 'pre', '', team('Spurs', 'TOT', ''), team('Newcastle', 'NEW', ''), todayAt(17, 30)),
    ],
    stories: [
      story('Late header settles a London derby', 'A set-piece in stoppage time decided a tight, cagey afternoon at the Emirates.', 2),
      story('Title race tightens as leaders drop points', 'Three teams are now separated by just two points going into the winter fixtures.', 5),
      story('Young goalkeeper keeps third clean sheet in a row', 'The 20-year-old has conceded once since being handed the gloves last month.', 8),
      story('Managers call for winter break to return', 'Fixture congestion is back on the agenda after a run of muscle injuries.', 11),
    ],
  },

  // ----- Football: La Liga -----
  'soccer/esp.1': {
    games: [
      match('La Liga', 'post', 'FT', team('Barcelona', 'BAR', '3', true), team('Sevilla', 'SEV', '1')),
      match('La Liga', 'post', 'FT', team('Real Madrid', 'RMA', '2', true), team('Valencia', 'VAL', '0')),
      match('La Liga', 'pre', '', team('Atlético', 'ATM', ''), team('Betis', 'BET', ''), todayAt(20, 0)),
    ],
    stories: [
      story('Barcelona’s midfield runs the show again', 'Possession, patience and a late burst of goals sealed a comfortable home win.', 3),
      story('Madrid keep pace at the top', 'Two first-half goals were enough on a quiet night at the Bernabéu.', 6),
      story('Atlético look to bounce back under the lights', 'A home crowd and a rested squad should help after a midweek defeat.', 9),
    ],
  },

  // ----- Football: Champions League -----
  'soccer/uefa.champions': {
    games: [
      match('Champions League', 'post', 'FT', team('Bayern', 'BAY', '2', true), team('PSG', 'PSG', '1')),
      match('Champions League', 'post', 'FT', team('Inter', 'INT', '1'), team('Dortmund', 'DOR', '1')),
      match('Champions League', 'pre', '', team('Porto', 'POR', ''), team('Benfica', 'BEN', ''), todayAt(21, 0)),
    ],
    stories: [
      story('Bayern edge a European heavyweight clash', 'A second-half winner leaves the group finely balanced with two rounds to go.', 4),
      story('Honours even in Milan', 'Inter and Dortmund traded first-half goals before both defences took over.', 7),
      story('Portuguese derby on the continental stage', 'Porto and Benfica meet in Europe for the first time in years.', 10),
    ],
  },

  // ----- Basketball: NBA -----
  'basketball/nba': {
    games: [
      match('NBA', 'in', 'Q3 4:12', team('Lakers', 'LAL', '78'), team('Celtics', 'BOS', '81')),
      match('NBA', 'post', 'Final', team('Warriors', 'GSW', '118', true), team('Suns', 'PHX', '109')),
      match('NBA', 'post', 'Final/OT', team('Knicks', 'NYK', '102'), team('Heat', 'MIA', '105', true)),
      match('NBA', 'pre', '', team('Bucks', 'MIL', ''), team('Nuggets', 'DEN', ''), todayAt(22, 0)),
    ],
    stories: [
      story('Warriors pull away in the fourth quarter', 'A 14–2 run late on turned a close game into a comfortable win.', 2),
      story('Heat survive overtime in New York', 'A corner three with eight seconds left forced the extra period.', 5),
      story('Rookie class making an early impact', 'Three first-year players are averaging double figures a month into the season.', 9),
    ],
  },

  // ----- Formula 1 -----
  'racing/f1': {
    games: [
      {
        kind: 'race',
        league: 'Formula 1',
        name: 'Sample Grand Prix',
        session: 'Race',
        status: 'post',
        detail: 'Final',
        date: todayAt(14, 0),
        results: [
          { pos: 1, name: 'Max Verstappen', team: 'Red Bull' },
          { pos: 2, name: 'Lando Norris', team: 'McLaren' },
          { pos: 3, name: 'Charles Leclerc', team: 'Ferrari' },
          { pos: 4, name: 'Oscar Piastri', team: 'McLaren' },
          { pos: 5, name: 'Lewis Hamilton', team: 'Ferrari' },
          { pos: 6, name: 'George Russell', team: 'Mercedes' },
          { pos: 7, name: 'Fernando Alonso', team: 'Aston Martin' },
          { pos: 8, name: 'Carlos Sainz', team: 'Williams' },
          { pos: 9, name: 'Pierre Gasly', team: 'Alpine' },
          { pos: 10, name: 'Yuki Tsunoda', team: 'Red Bull' },
        ],
      },
    ],
    stories: [
      story('Tyre strategy decides a tense afternoon', 'A late switch to hard tyres paid off for the leaders as rivals pitted twice.', 3),
      story('Midfield battle closer than ever', 'Four teams finished within a tenth of a second of each other in qualifying.', 7),
      story('New rules for next season explained', 'Smaller cars, active aero and more sustainable fuel: what changes and why.', 12),
    ],
  },

  // ----- Tennis: ATP -----
  'tennis/atp': {
    games: [
      {
        kind: 'tennis', league: 'ATP · Sample Open', round: 'Semifinal', status: 'in', detail: 'Set 3', date: todayAt(13, 0),
        p1: { name: 'Jannik Sinner', sets: [6, 4, 3], winner: false },
        p2: { name: 'Carlos Alcaraz', sets: [4, 6, 2], winner: false },
      },
      {
        kind: 'tennis', league: 'ATP · Sample Open', round: 'Semifinal', status: 'post', detail: 'Final', date: todayAt(11, 0),
        p1: { name: 'Alexander Zverev', sets: [7, 6], winner: true },
        p2: { name: 'Taylor Fritz', sets: [5, 4], winner: false },
      },
    ],
    stories: [
      story('Semifinal goes the distance', 'Two of the tour’s best returners traded breaks deep into a deciding set.', 1),
      story('Zverev books his place in the final', 'A first-serve percentage above 75 kept his opponent under pressure all match.', 4),
      story('Indoor season gets underway', 'Faster courts are expected to favour the big servers over the next month.', 10),
    ],
  },

  // ----- Tennis: WTA -----
  'tennis/wta': {
    games: [
      {
        kind: 'tennis', league: 'WTA · Sample Open', round: 'Final', status: 'post', detail: 'Final', date: todayAt(12, 0),
        p1: { name: 'Aryna Sabalenka', sets: [6, 3, 6], winner: true },
        p2: { name: 'Iga Świątek', sets: [4, 6, 3], winner: false },
      },
      {
        kind: 'tennis', league: 'WTA · Sample Open', round: 'Doubles final', status: 'pre', detail: '', date: todayAt(16, 0),
        p1: { name: 'Pair A', sets: [], winner: false },
        p2: { name: 'Pair B', sets: [], winner: false },
      },
    ],
    stories: [
      story('Sabalenka wins a three-set final', 'Power from the baseline proved decisive after a dip in the second set.', 2),
      story('Świątek’s clay-court form carries indoors', 'Her movement on faster courts has improved noticeably this season.', 6),
    ],
  },
};
