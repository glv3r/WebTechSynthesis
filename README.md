# Web Tech mini projects

Two small tools built with HTML, Tailwind CSS (Play CDN) and vanilla JavaScript. They share a theme (`theme.js`) and a few base styles (`base.css`).

| Page | What it does |
|---|---|
| `index.html` + `app.js` | Shortest path finder: an animated breadth-first search on a grid |
| `cron.html` + `cron.js` | Cron explainer: turns a cron expression into plain English, its next 10 runs and a calendar |

---

# Shortest path finder

## Run it
Open `index.html` in a browser. You need an internet connection because Tailwind and the fonts load from CDNs.

## Use it
- Drag across the grid to draw or erase walls. Drag **S** or **E** to move them.
- **Find path** runs BFS and animates it. Use the timeline to scrub backwards and forwards.
- Keys: Enter find path · Space play/pause · ← → step · W random walls · C clear walls

## How it works
- `bfs()` is pure logic. It runs the whole search at once and records, for every cell, the step it joined the queue (`enq`) and the step it left (`deq`).
- To draw any moment `t`, each cell compares its times with `t`: settled if `deq ≤ t`, in the queue (frontier) if `enq ≤ t < deq`. That's how the timeline can go backwards without storing snapshots.
- The path comes from walking `prev[]` back from E to S.
- BFS gives the shortest path because the queue only ever holds cells at distance d or d + 1. Cells leave in order of distance, so the first time E leaves the queue is the shortest route.

---

# Cron explainer

## Use it
- Type a cron expression (`minute hour day month weekday`) or pick a preset. Everything updates as you type.
- Five rulers show which values each field allows. The blue box marks the selected run's value on each one.
- Click a run, or use ↑ ↓, to see it on the rulers and the calendar.
- Supports `*`, numbers, ranges `1-5`, lists `1,15`, steps `*/15` or `5/20`, names `MON-FRI`/`JAN`, and macros like `@daily`.

## How it works
- **Parse:** each field becomes a set of allowed numbers. For example, `*/15` in minutes becomes {0, 15, 30, 45}. Bad fields throw a message that's shown next to that field.
- **Match:** a time runs when its minute, hour, month and day are all in their sets. Day of month and day of week are the exception: if *both* are restricted, cron needs only one of them to match (try "13th or a Friday").
- **Next runs:** scan forward one day at a time. On a day that matches, list every hour × minute combination. The scan stops after 8 years, which handles impossible schedules like `0 0 31 2 *`.
- **Describe:** the plain-English sentence is built from the sets. Consecutive values are compressed into ranges (`1,2,3,5` → `1–3, 5`).

## Files
- `index.html` / `app.js`: path finder page and logic
- `cron.html` / `cron.js`: cron page and logic
- `theme.js`: shared Tailwind config (custom colours and fonts)
- `base.css`: shared CSS (graph-paper background, reduced motion)
