// ---------- Field definitions ----------
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FIELDS = [
  { key: 'minute', label: 'Minute',       min: 0, max: 59, ticks: [0, 15, 30, 45, 59] },
  { key: 'hour',   label: 'Hour',         min: 0, max: 23, ticks: [0, 6, 12, 18, 23] },
  { key: 'dom',    label: 'Day of month', min: 1, max: 31, ticks: [1, 8, 15, 22, 31] },
  { key: 'month',  label: 'Month',        min: 1, max: 12, names: MONTHS },
  { key: 'dow',    label: 'Day of week',  min: 0, max: 6,  names: DAYS },
];

const MACROS = {
  '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *',
};

const PRESETS = [
  ['Weekdays at 09:00', '0 9 * * 1-5'],
  ['Every 15 minutes', '*/15 * * * *'],
  ['First of the month', '@monthly'],
  ['Sundays at 18:30', '30 18 * * SUN'],
  ['13th or a Friday', '0 0 13 * 5'],
  ['Leap day noon', '0 12 29 2 *'],
];

// ---------- Parsing ----------
// "1-5,10/2" style text → a set of allowed numbers for one field
function toNum(token, f) {
  let n = Number(token);
  if (Number.isNaN(n) && f.names) {
    const k = f.names.indexOf(token.toUpperCase());
    if (k === -1) throw `"${token}" isn't a ${f.label.toLowerCase()} name`;
    n = f.key === 'month' ? k + 1 : k;
  }
  if (!Number.isInteger(n)) throw `"${token}" isn't a whole number`;
  const top = f.key === 'dow' ? 7 : f.max; // 7 also means Sunday
  if (n < f.min || n > top) throw `${n} is outside ${f.min}–${top}`;
  return n;
}

function parseField(text, f) {
  const set = new Set();
  for (const part of text.split(',')) {
    const m = part.match(/^(\*|[a-z0-9]+(?:-[a-z0-9]+)?)(?:\/(\d+))?$/i);
    if (!m) throw `"${part}" isn't a value, range, list or step`;
    const step = m[2] ? Number(m[2]) : 1;
    if (step < 1) throw 'a step must be at least 1';
    let lo, hi;
    if (m[1] === '*') [lo, hi] = [f.min, f.max];
    else {
      const ends = m[1].split('-').map((t) => toNum(t, f));
      lo = ends[0];
      hi = ends.length > 1 ? ends[1] : m[2] ? f.max : lo; // "5/10" = from 5 to the end, every 10
    }
    if (lo > hi) throw `range ${lo}-${hi} runs backwards`;
    for (let v = lo; v <= hi; v += step) set.add(f.key === 'dow' && v === 7 ? 0 : v);
  }
  return { text, set, values: [...set].sort((a, b) => a - b), star: text.startsWith('*') };
}

// Returns { fields, errors }. errors[i] is the message for field i; errors.all for whole-expression problems.
function parse(expr) {
  let src = expr.trim().toLowerCase();
  if (MACROS[src]) src = MACROS[src];
  const parts = src.split(/\s+/).filter(Boolean);
  const errors = {};
  if (parts.length !== 5) {
    errors.all = `Expected 5 fields separated by spaces, got ${parts.length}.`;
    return { fields: null, errors };
  }
  const fields = {};
  FIELDS.forEach((f, i) => {
    try { fields[f.key] = parseField(parts[i], f); }
    catch (msg) { errors[i] = msg; }
  });
  return { fields: Object.keys(errors).length ? null : fields, errors, parts };
}

// ---------- Matching ----------
// Classic cron rule: if both day fields are restricted, either one matching is enough.
const orMode = (c) => !c.dom.star && !c.dow.star;

function dayMatches(c, date) {
  if (!c.month.set.has(date.getMonth() + 1)) return false;
  const domOk = c.dom.set.has(date.getDate());
  const dowOk = c.dow.set.has(date.getDay());
  return orMode(c) ? domOk || dowOk : domOk && dowOk;
}

// Scan forward one day at a time. Only matching days look at hours and minutes.
function nextRuns(c, from, count) {
  const first = new Date(from);
  first.setSeconds(0, 0);
  first.setMinutes(first.getMinutes() + 1);
  const runs = [];
  let daysScanned = 0;
  for (let i = 0; i < 366 * 8 && runs.length < count; i++) {
    const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
    daysScanned++;
    if (!dayMatches(c, day)) continue;
    for (const h of c.hour.values) {
      for (const m of c.minute.values) {
        const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
        if (t >= first) runs.push(t);
        if (runs.length === count) return { runs, daysScanned };
      }
    }
  }
  return { runs, daysScanned };
}

// ---------- Plain English ----------
const pad = (n) => String(n).padStart(2, '0');

// [1,2,3,5] → "1–3, 5" (with optional name lookup)
function compress(values, name = String) {
  const out = [];
  for (let i = 0; i < values.length; i++) {
    let j = i;
    while (j + 1 < values.length && values[j + 1] === values[j] + 1) j++;
    out.push(j - i >= 2 ? `${name(values[i])}–${name(values[j])}` : j > i ? `${name(values[i])}, ${name(values[j])}` : name(values[i]));
    i = j;
  }
  return out.join(', ');
}

const stepOf = (field) => (field.text.match(/^\*\/(\d+)$/) || [])[1];

function describe(c) {
  const { minute: mi, hour: hr, dom, month, dow } = c;
  let time;
  if (mi.values.length === 1 && !hr.star && hr.values.length <= 4) {
    time = 'At ' + hr.values.map((h) => `${pad(h)}:${pad(mi.values[0])}`).join(', ');
  } else {
    time = mi.star && !stepOf(mi) ? 'Every minute'
      : stepOf(mi) ? `Every ${stepOf(mi)} minutes`
      : `At minute${mi.values.length > 1 ? 's' : ''} ${compress(mi.values)}`;
    if (!hr.star) time += ` past hour${hr.values.length > 1 ? 's' : ''} ${compress(hr.values, pad)}`;
    else if (stepOf(hr)) time += `, every ${stepOf(hr)} hours`;
  }

  const domText = `day${dom.values.length > 1 ? 's' : ''} ${compress(dom.values)} of the month`;
  const dowText = compress(dow.values, (d) => DAY_NAMES[d]);
  let days = '';
  if (orMode(c)) days = ` on ${domText} or on ${dowText}`;
  else if (!dom.star) days = ` on ${domText}`;
  else if (!dow.star) days = ` on ${dowText}`;

  const months = month.star ? '' : ` in ${compress(month.values, (m) => MONTHS[m - 1][0] + MONTHS[m - 1].slice(1).toLowerCase())}`;
  return `${time}${days}${months}.`;
}

// ---------- State ----------
const $ = (id) => document.getElementById(id);
const exprEl = $('expr');
let cron = null;       // parsed fields
let runs = [];
let scanned = 0;
let selected = 0;      // index into runs
let view = null;       // { y, m } month shown in the calendar
let lastErrors = {};

const fmtDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const fmtMonth = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });
const hhmm = (t) => `${pad(t.getHours())}:${pad(t.getMinutes())}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

function recompute(keepView = false) {
  const { fields, errors } = parse(exprEl.value);
  lastErrors = errors;
  cron = fields;
  if (cron) {
    ({ runs, daysScanned: scanned } = nextRuns(cron, new Date(), 10));
    selected = Math.min(selected, Math.max(0, runs.length - 1));
    const anchor = runs[selected] || new Date();
    if (!keepView || !view) view = { y: anchor.getFullYear(), m: anchor.getMonth() };
  } else {
    runs = [];
  }
  render();
}

// ---------- Rendering ----------
function render() {
  renderInput();
  renderRulers();
  renderRuns();
  renderStats();
  renderCalendar();
  renderNarration();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  $('status').textContent = `local time · ${tz} · now ${hhmm(new Date())}`;
}

function renderInput() {
  const msgs = [lastErrors.all, ...FIELDS.map((f, i) => lastErrors[i] && `${f.label}: ${lastErrors[i]}`)].filter(Boolean);
  $('error').textContent = msgs.join(' ');
  $('error').classList.toggle('hidden', !msgs.length);
  exprEl.classList.toggle('border-crimson', msgs.length > 0);
  exprEl.classList.toggle('border-ink', !msgs.length);

  $('english').textContent = cron ? describe(cron) : 'Fix the expression to see what it means.';
  $('english').classList.toggle('text-ink-soft', !cron);
}

// The value each field takes in the selected run
function runValues(t) {
  return { minute: t.getMinutes(), hour: t.getHours(), dom: t.getDate(), month: t.getMonth() + 1, dow: t.getDay() };
}

// Rulers are built once, then updated in place so the marker can slide between values
const rulerEls = FIELDS.map((f) => {
  const count = f.max - f.min + 1;
  const row = document.createElement('div');
  const labels = f.names
    ? `<div class="mt-1 flex font-mono text-[9.5px] text-ink-soft">${f.names.map((n) => `<span class="min-w-0 flex-1 text-center">${n}</span>`).join('')}</div>`
    : `<div class="relative mt-1 h-3 font-mono text-[9.5px] text-ink-soft">${f.ticks.map((t) =>
        `<span class="absolute -translate-x-1/2" style="left:${((t - f.min + 0.5) / count) * 100}%">${t}</span>`).join('')}</div>`;
  row.innerHTML = `
    <div class="mb-1 flex items-baseline justify-between gap-2">
      <span data-label class="font-mono text-[10px] uppercase tracking-[.16em]">${f.label}</span>
      <span class="font-mono text-[11px]"><span data-text></span> <span data-count class="text-ink-soft"></span></span>
    </div>
    <div data-track class="relative flex h-6 border">
      ${Array.from({ length: count }, (_, k) => `<div class="cell min-w-0 flex-1 ${k ? 'border-l border-grid' : ''}"></div>`).join('')}
      <div data-marker class="slide pointer-events-none absolute inset-y-0 left-0 outline outline-2 -outline-offset-1 outline-ultra" style="width:${100 / count}%"></div>
    </div>
    ${labels}`;
  $('rulers').appendChild(row);
  const q = (sel) => row.querySelector(sel);
  return { count, label: q('[data-label]'), text: q('[data-text]'), countEl: q('[data-count]'),
           track: q('[data-track]'), marker: q('[data-marker]'), cells: [...q('[data-track]').children].slice(0, count) };
});

function renderRulers() {
  const run = runs[selected];
  const at = run ? runValues(run) : null;
  const parts = parse(exprEl.value).parts || [];

  FIELDS.forEach((f, i) => {
    const el = rulerEls[i];
    const field = cron && cron[f.key];
    const bad = Boolean(lastErrors[i] || lastErrors.all);

    el.cells.forEach((c, k) => {
      const on = field && field.set.has(f.min + k);
      c.classList.toggle('bg-ink', Boolean(on));
      c.classList.toggle('bg-paper-2', !on);
    });
    el.track.classList.toggle('border-crimson', bad);
    el.track.classList.toggle('border-ink', !bad);
    el.label.classList.toggle('text-crimson', Boolean(lastErrors[i]));
    el.label.classList.toggle('text-ink-soft', !lastErrors[i]);
    el.text.textContent = lastErrors.all ? '' : parts[i] ?? '';
    el.text.classList.toggle('text-crimson', Boolean(lastErrors[i]));
    el.countEl.textContent = field ? `· ${field.values.length} of ${el.count}` : '· —';

    el.marker.style.display = at ? '' : 'none';
    if (at) el.marker.style.transform = `translateX(${(at[f.key] - f.min) * 100}%)`;
  });
}

function renderRuns() {
  if (!cron) { $('runs').innerHTML = '<li class="text-ink-soft">—</li>'; return; }
  if (!runs.length) { $('runs').innerHTML = '<li class="text-crimson">Never runs in the next 8 years.</li>'; return; }
  $('runs').innerHTML = runs.map((t, k) => `
    <li>
      <button data-run="${k}" class="flex w-full justify-between px-1.5 py-1 text-left ${k === selected ? 'bg-ultra text-paper-2' : 'hover:bg-paper'}
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ultra">
        <span>${fmtDate.format(t)}</span><span>${hhmm(t)}</span>
      </button>
    </li>`).join('');
}

function relative(t) {
  let mins = Math.round((t - Date.now()) / 60000);
  const d = Math.floor(mins / 1440); mins -= d * 1440;
  const h = Math.floor(mins / 60); mins -= h * 60;
  return [d && `${d} d`, h && `${h} h`, `${mins} min`].filter(Boolean).join(' ');
}

function renderStats() {
  const rows = cron ? [
    ['Next run in', runs[0] ? relative(runs[0]) : 'never'],
    ['Runs on a run day', cron.hour.values.length * cron.minute.values.length],
    ['Day rule', orMode(cron) ? 'date OR weekday' : 'date AND weekday'],
    ['Days scanned', scanned],
  ] : [['Next run in', '—'], ['Runs on a run day', '—'], ['Day rule', '—'], ['Days scanned', '—']];
  $('stats').innerHTML = rows.map(([k, v]) =>
    `<div class="flex justify-between gap-2 border-b border-dotted border-grid py-1 last:border-0"><dt class="text-ink-soft">${k}</dt><dd class="text-right">${v}</dd></div>`
  ).join('');
}

function renderCalendar() {
  const cal = $('cal');
  if (!view) { cal.innerHTML = ''; return; }
  $('cal-title').textContent = fmtMonth.format(new Date(view.y, view.m, 1));

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysIn = new Date(view.y, view.m + 1, 0).getDate();
  const today = new Date();
  const sel = runs[selected];
  const perDay = cron ? cron.hour.values.length * cron.minute.values.length : 0;

  let html = DAYS.map((d) => `<div class="bg-paper-2 py-1 text-center text-ink-soft">${d[0]}${d.slice(1).toLowerCase()}</div>`).join('');
  for (let k = 0; k < firstDow; k++) html += '<div class="bg-paper"></div>';
  for (let d = 1; d <= daysIn; d++) {
    const date = new Date(view.y, view.m, d);
    const hit = cron && dayMatches(cron, date);
    const isSel = sel && sel.getFullYear() === view.y && sel.getMonth() === view.m && sel.getDate() === d;
    const isToday = today.getFullYear() === view.y && today.getMonth() === view.m && today.getDate() === d;
    html += `
      <div class="cell relative flex h-12 flex-col justify-between p-1 ${hit ? 'bg-teal/15' : 'bg-paper-2'}
                  ${isSel ? 'outline outline-2 -outline-offset-2 outline-ultra' : ''}">
        <span class="${isToday ? 'underline decoration-2 underline-offset-2' : ''} ${hit ? '' : 'text-dim'}">${d}</span>
        <span class="self-end ${hit ? 'text-teal font-semibold' : ''}">${hit ? '×' + perDay : ''}</span>
      </div>`;
  }
  cal.innerHTML = html;
}

function renderNarration() {
  const el = $('narration');
  if (!cron) { el.textContent = 'Each ruler shows one field. Dark cells are the values that field allows.'; return; }
  const t = runs[selected];
  if (!t) { el.textContent = 'No date in the next 8 years passes every ruler, so this schedule never fires.'; return; }
  const v = runValues(t);
  let text = `Run ${selected + 1}: ${fmtDate.format(t)} at ${hhmm(t)}. The blue box marks this time's value on every ruler: `
    + `minute ${v.minute}, hour ${v.hour}, day ${v.dom}, ${MONTHS[v.month - 1]}, ${DAYS[v.dow]}.`;
  if (orMode(cron)) {
    const domOk = cron.dom.set.has(v.dom), dowOk = cron.dow.set.has(v.dow);
    if (domOk !== dowOk) text += ` Only ${domOk ? 'the day of month' : 'the weekday'} matches here, and that's enough because both day fields are restricted.`;
  }
  el.textContent = text;
}

// ---------- Interaction ----------
function selectRun(k) {
  if (!runs.length) return;
  selected = Math.max(0, Math.min(runs.length - 1, k));
  const t = runs[selected];
  view = { y: t.getFullYear(), m: t.getMonth() };
  render();
}

function shiftMonth(delta) {
  if (!view) return;
  const d = new Date(view.y, view.m + delta, 1);
  view = { y: d.getFullYear(), m: d.getMonth() };
  renderCalendar();
}

$('presets').innerHTML = PRESETS.map(([name, expr]) =>
  `<button data-expr="${expr}" class="btn border border-ink px-2.5 py-1 font-mono text-[11px] hover:bg-ink hover:text-paper-2
     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ultra">${name}</button>`
).join('');

$('presets').addEventListener('click', (e) => {
  const b = e.target.closest('[data-expr]');
  if (!b) return;
  exprEl.value = b.dataset.expr;
  selected = 0;
  recompute();
});
$('runs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-run]');
  if (b) selectRun(Number(b.dataset.run));
});
exprEl.addEventListener('input', () => { selected = 0; recompute(); });
$('cal-prev').addEventListener('click', () => shiftMonth(-1));
$('cal-next').addEventListener('click', () => shiftMonth(1));

document.addEventListener('keydown', (e) => {
  if (e.target === exprEl) {
    if (e.key === 'Escape') exprEl.blur();
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); exprEl.focus(); exprEl.select(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); selectRun(selected + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); selectRun(selected - 1); }
  else if (e.key === 'ArrowRight') shiftMonth(1);
  else if (e.key === 'ArrowLeft') shiftMonth(-1);
});

document.querySelectorAll('#cal-prev, #cal-next').forEach((el) =>
  el.classList.add('focus-visible:outline', 'focus-visible:outline-2', 'focus-visible:outline-offset-2', 'focus-visible:outline-ultra', 'transition-colors')
);

// Keep "next run" honest as time passes
setInterval(() => recompute(true), 30000);
recompute();
