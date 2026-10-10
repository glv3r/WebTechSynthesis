# The Final Whistle

A daily sports magazine built with **HTML**, **Tailwind CSS** (Play CDN) and **vanilla JavaScript**. It has a front page plus a section each for football, basketball, Formula 1 and tennis. Each one shows the day's scores and headlines.

- **Look:** Gumroad's design system: black borders, bold flat colours (pink, yellow, purple), and cards that lift with a hard shadow on hover.
- **Layout:** a daily newspaper:
  - a masthead with a double rule
  - a section nav and a scores ticker
  - a lead story beside a "Scores of the day" column
  - more stories in columns underneath

## Run it
Open `index.html` in a browser. You need an internet connection for Tailwind, the fonts and the live data.

## Where the data comes from
- Scores and headlines come from ESPN's free public feeds (no API key):
  - `site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard`
  - `site.api.espn.com/apis/site/v2/sports/{sport}/{league}/news`
- If a feed can't be reached within 6 seconds, the page uses made-up sample data from `js/sample.js` instead. It shows a yellow **Sample data** chip, so the page always works during a demo.
- Scores refresh quietly every minute.

## How the code is organised
Each page is the same HTML skeleton with empty boxes (`#masthead`, `#ticker`, `#lead`, `#rail`, `#grid`…). The `data-sport` attribute on `<body>` says which section the page is. The JavaScript then fills the boxes:

| File | Job |
|---|---|
| `js/sample.js` | Backup data, already in the simple shape the site uses |
| `js/feeds.js` | `SPORTS` config, fetching from ESPN, and *normalising* ESPN's nested data into small objects |
| `js/ui.js` | Functions that turn data into HTML strings (score cards, stories, ticker, nav…) |
| `js/page.js` | Reads `data-sport`, loads the data, and places the HTML on the page |
| `theme.js` | Tailwind config: Gumroad colours, fonts, hard shadow |
| `base.css` | Hover-lift effect, hidden ticker scrollbar, double rule, reduced motion |

**Three kinds of score card** match the three shapes of sport:
- **team:** two sides and a score (football, basketball)
- **race:** a finishing order (F1)
- **tennis:** set-by-set scores

**Adding a sport** takes one entry in `SPORTS` (in `js/feeds.js`) and a copy of a section page with a new `data-sport`.

**Safety:** all text from the feeds goes through `escapeHtml`, and links and images must be `https://`, so feed content can't inject code into the page.
