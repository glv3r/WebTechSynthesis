// ---------- Grid setup ----------
const SMALL = window.innerWidth < 640;
const COLS = SMALL ? 21 : 41;
const ROWS = SMALL ? 25 : 21;
const N = ROWS * COLS;

const idx = (r, c) => r * COLS + c;
const rowOf = (i) => Math.floor(i / COLS);
const colOf = (i) => i % COLS;

let start = idx(Math.floor(ROWS / 2), Math.floor(COLS * 0.2));
let end = idx(Math.floor(ROWS / 2), COLS - 1 - Math.floor(COLS * 0.2));
const walls = new Uint8Array(N); // 1 = wall

// Playback state
let run = null;   // result of bfs(), or null when the grid was edited
let pos = 0;      // timeline position: 0 = before any dequeue
let timer = null;

// ---------- DOM refs ----------
const $ = (id) => document.getElementById(id);
const gridEl = $('grid');
const scrub = $('scrub');
const speed = $('speed');
const playBtn = $('btn-play');

gridEl.style.gridTemplateColumns = `repeat(${COLS}, minmax(0, 1fr))`;
const cells = [];
for (let i = 0; i < N; i++) {
  const el = document.createElement('div');
  el.dataset.i = i;
  gridEl.appendChild(el);
  cells.push(el);
}

// ---------- BFS (pure logic, no DOM) ----------
// Runs the whole search at once and records *when* each cell
// entered and left the queue. Any moment can then be redrawn from those times.
function bfs() {
  const INF = 1e9;
  const enq = new Int32Array(N).fill(INF);  // step the cell joined the queue
  const deq = new Int32Array(N).fill(INF);  // step the cell left the queue
  const dist = new Int32Array(N).fill(-1);
  const prev = new Int32Array(N).fill(-1);
  const order = [];  // cells in dequeue order
  const added = [];  // how many neighbours each step added

  const queue = [start];
  let head = 0;
  enq[start] = 0;
  dist[start] = 0;

  while (head < queue.length) {
    const cur = queue[head++];
    order.push(cur);
    const step = order.length;
    deq[cur] = step;
    if (cur === end) { added.push(0); break; }

    let count = 0;
    const r = rowOf(cur), c = colOf(cur);
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      const n = idx(nr, nc);
      if (walls[n] || dist[n] !== -1) continue;
      dist[n] = dist[cur] + 1;
      prev[n] = cur;
      enq[n] = step;
      queue.push(n);
      count++;
    }
    added.push(count);
  }

  const found = dist[end] !== -1;
  const path = [];
  if (found) for (let at = end; at !== -1; at = prev[at]) path.push(at);
  path.reverse();

  // timeline: 0 (start queued) … order.length (last dequeue) … +1 (path drawn)
  const total = order.length + (found ? 1 : 0);
  return { enq, deq, dist, order, added, path, onPath: new Set(path), found, total };
}

// ---------- Rendering ----------
const BASE = 'cell aspect-square flex items-center justify-center font-mono text-[9px] font-semibold leading-none';
const LOOK = {
  empty:    'bg-paper-2',
  wall:     'bg-ink',
  frontier: 'bg-marigold',
  current:  'bg-crimson',
  settled:  'bg-teal/20',
  path:     'bg-ultra',
};
const ENDPOINT = 'outline outline-2 -outline-offset-2 outline-ink text-ink';

function cellState(i) {
  if (walls[i]) return 'wall';
  if (!run) return 'empty';
  if (pos === run.total && run.found && run.onPath.has(i)) return 'path';
  if (run.deq[i] === pos) return 'current';
  if (run.deq[i] <= pos) return 'settled';
  if (run.enq[i] <= pos) return 'frontier';
  return 'empty';
}

function render() {
  let frontier = 0, settled = 0;
  for (let i = 0; i < N; i++) {
    const s = cellState(i);
    if (s === 'frontier') frontier++;
    if (s === 'settled' || s === 'current') settled++;
    let cls = `${BASE} ${LOOK[s]}`;
    if (i === start || i === end) {
      cls = `${BASE} ${s === 'path' ? 'bg-ultra' : 'bg-paper-2'} ${ENDPOINT}`;
      if (s === 'path') cls = cls.replace('text-ink', 'text-paper-2');
    }
    cells[i].className = cls;
    cells[i].textContent = i === start ? 'S' : i === end ? 'E' : '';
  }
  renderSidebar(frontier, settled);
  renderNarration();
  scrub.max = run ? run.total : 0;
  scrub.value = pos;
  scrub.disabled = !run;
  playBtn.textContent = timer ? '❙❙ Pause' : '▶ Play';
}

const CODE = [
  'queue ← [S]',
  'while queue not empty',
  '  cur ← dequeue()',
  '  if cur = E: stop',
  '  for open, unseen n:',
  '    dist[n] ← dist[cur]+1',
  '    prev[n] ← cur; enqueue(n)',
  'path ← walk prev from E',
  'queue empty: no path',
];

function activeLine() {
  if (!run) return -1;
  if (pos === 0) return 0;
  if (run.found && pos === run.total) return 7;
  const cur = run.order[pos - 1];
  if (cur === end) return 3;
  if (!run.found && pos === run.order.length) return 8;
  return run.added[pos - 1] > 0 ? 6 : 2;
}

function renderSidebar(frontier, settled) {
  const line = activeLine();
  $('code').innerHTML = CODE.map((text, k) =>
    `<li class="whitespace-pre px-1 ${k === line ? 'bg-ink text-paper-2' : ''}">${text}</li>`
  ).join('');

  const cur = run && pos > 0 && pos <= run.order.length ? run.order[pos - 1] : null;
  const rows = [
    ['Step', run ? `${pos} / ${run.total}` : '—'],
    ['Distance d', cur !== null ? run.dist[cur] : '—'],
    ['Queue size', run ? frontier : '—'],
    ['Settled', run ? settled : '—'],
    ['Path length', run && run.found && pos === run.total ? `${run.path.length - 1} moves` : '—'],
    ['Walls', walls.reduce((a, b) => a + b, 0)],
  ];
  $('stats').innerHTML = rows.map(([k, v]) =>
    `<div class="flex justify-between border-b border-dotted border-grid py-1 last:border-0"><dt class="text-ink-soft">${k}</dt><dd>${v}</dd></div>`
  ).join('');

  $('status').textContent = `BFS · ${COLS}×${ROWS} · ${run ? (run.found ? 'path found' : 'no path') : 'editing'}`;
}

function renderNarration() {
  const el = $('narration');
  const rc = (i) => `(${rowOf(i)}, ${colOf(i)})`;
  if (!run) {
    el.textContent = 'Drag across the grid to draw walls, then press Find path. BFS will spread out from S one ring at a time.';
    return;
  }
  if (pos === 0) {
    el.textContent = 'S goes into the queue at distance 0. Every later step takes the oldest cell out of the queue, so cells come out in order of distance.';
    return;
  }
  if (run.found && pos === run.total) {
    el.textContent = `Following prev back from E to S traces the route: ${run.path.length - 1} moves. You can't get there in fewer, because BFS settles every closer cell first.`;
    return;
  }
  const cur = run.order[pos - 1];
  const d = run.dist[cur];
  if (cur === end) {
    el.textContent = `E comes out of the queue at distance ${d}. Every cell closer than ${d} has already been settled, so this is the shortest distance.`;
    return;
  }
  if (!run.found && pos === run.order.length) {
    el.textContent = 'The queue is empty and E was never reached. The walls cut S off from E.';
    return;
  }
  const a = run.added[pos - 1];
  el.textContent = a > 0
    ? `Expanding ${rc(cur)} at distance ${d}. It adds ${a} new neighbour${a > 1 ? 's' : ''} at distance ${d + 1} to the back of the queue. Everything already queued at distance ${d} still comes out first.`
    : `Expanding ${rc(cur)} at distance ${d}. Its neighbours are walls or already seen, so nothing new joins the queue.`;
}

// ---------- Playback ----------
function delay() { return Math.round(220 / speed.value ** 1.4) + 4; }

function play() {
  if (!run) return;
  if (pos >= run.total) pos = 0;
  stop();
  timer = setInterval(() => {
    if (pos >= run.total) { stop(); render(); return; }
    pos++;
    render();
  }, delay());
  render();
}

function stop() {
  clearInterval(timer);
  timer = null;
}

function togglePlay() { timer ? (stop(), render()) : play(); }

function findPath() {
  run = bfs();
  pos = 0;
  play();
}

function stepBy(k) {
  if (!run) return;
  stop();
  pos = Math.max(0, Math.min(run.total, pos + k));
  render();
}

// Any edit to the grid makes the old search out of date
function invalidate() {
  stop();
  run = null;
  pos = 0;
  render();
}

// ---------- Editing: draw walls, drag S / E ----------
let dragMode = null; // 'start' | 'end' | 'add' | 'remove'

function cellAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el && el.dataset && el.dataset.i !== undefined ? Number(el.dataset.i) : null;
}

function applyDrag(i) {
  if (i === null) return;
  if (dragMode === 'start' && i !== end && !walls[i]) start = i;
  else if (dragMode === 'end' && i !== start && !walls[i]) end = i;
  else if (dragMode === 'add' && i !== start && i !== end) walls[i] = 1;
  else if (dragMode === 'remove') walls[i] = 0;
  else return;
  invalidate();
}

gridEl.addEventListener('pointerdown', (e) => {
  const i = cellAt(e.clientX, e.clientY);
  if (i === null) return;
  e.preventDefault();
  gridEl.setPointerCapture(e.pointerId);
  dragMode = i === start ? 'start' : i === end ? 'end' : walls[i] ? 'remove' : 'add';
  applyDrag(i);
});
gridEl.addEventListener('pointermove', (e) => {
  if (dragMode) applyDrag(cellAt(e.clientX, e.clientY));
});
const endDrag = () => { dragMode = null; };
gridEl.addEventListener('pointerup', endDrag);
gridEl.addEventListener('pointercancel', endDrag);

function randomWalls() {
  for (let i = 0; i < N; i++) walls[i] = i !== start && i !== end && Math.random() < 0.28 ? 1 : 0;
  invalidate();
}

function clearWalls() {
  walls.fill(0);
  invalidate();
}

// ---------- Controls ----------
$('btn-find').addEventListener('click', findPath);
playBtn.addEventListener('click', togglePlay);
$('btn-back').addEventListener('click', () => stepBy(-1));
$('btn-next').addEventListener('click', () => stepBy(1));
$('btn-random').addEventListener('click', randomWalls);
$('btn-clear').addEventListener('click', clearWalls);
scrub.addEventListener('input', () => { stop(); pos = Number(scrub.value); render(); });
speed.addEventListener('input', () => { if (timer) play(); });

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  // Space/Enter on a focused button already "clicks" it
  if (e.target.tagName === 'BUTTON' && (k === ' ' || k === 'enter')) return;
  if (k === 'enter') findPath();
  else if (k === ' ') { e.preventDefault(); run ? togglePlay() : findPath(); }
  else if (k === 'arrowright') stepBy(1);
  else if (k === 'arrowleft') stepBy(-1);
  else if (k === 'w') randomWalls();
  else if (k === 'c') clearWalls();
  else return;
});

// Visible focus rings on every control
document.querySelectorAll('button, input').forEach((el) =>
  el.classList.add('focus-visible:outline', 'focus-visible:outline-2', 'focus-visible:outline-offset-2', 'focus-visible:outline-ultra', 'transition-colors', 'duration-200')
);

render();
