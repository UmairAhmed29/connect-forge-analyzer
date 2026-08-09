#!/usr/bin/env node
// Generates web/index.html: one self-contained file with the mapping data and the
// analysis logic inlined, so it can be hosted on any static host with no build step
// and no dependencies. The mapping lives only in data/module-map.json - this script
// is the single place it gets copied, so the CLI and the web page can never drift.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;

const MAP_RAW = readFileSync(join(root, 'data', 'module-map.json'), 'utf8');
const CORE = readFileSync(join(root, 'src', 'core.js'), 'utf8')
  .replace(/^export\s+/gm, '')          // inline script, nothing imports it
  .replace(/^\/\/.*$/gm, (m) => m);      // keep comments

const AUTHOR = {
  name: 'Umair Ahmed',
  tagline: 'Independent Atlassian app developer',
  contact: '', // e.g. 'mailto:you@example.com' or a LinkedIn URL
};

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect → Forge Migration Analyzer</title>
<style>
  :root {
    --bg: #f7f8f9; --surface: #ffffff; --border: #dfe1e6; --text: #172b4d;
    --muted: #626f86; --accent: #0c66e4; --accent-soft: #e9f2ff;
    --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    --ok: #216e4e; --warn: #a54800; --bad: #ae2e24;
    --radius: 8px;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #1d2125; --surface: #22272b; --border: #3c434a; --text: #dee4ea;
      --muted: #9fadbc; --accent: #579dff; --accent-soft: #1c2b41;
      --ok: #7ee2b8; --warn: #f5cd47; --bad: #ff9c8f;
    }
  }
  :root[data-theme="dark"] {
    --bg: #1d2125; --surface: #22272b; --border: #3c434a; --text: #dee4ea;
    --muted: #9fadbc; --accent: #579dff; --accent-soft: #1c2b41;
    --ok: #7ee2b8; --warn: #f5cd47; --bad: #ff9c8f;
  }

  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .wrap { max-width: 960px; margin: 0 auto; padding: 40px 20px 80px; }
  header { margin-bottom: 28px; }
  h1 { font-size: 26px; margin: 0 0 6px; letter-spacing: -0.01em; }
  .sub { color: var(--muted); margin: 0; }
  .deadline {
    margin-top: 16px; padding: 12px 14px; border-radius: var(--radius);
    background: var(--accent-soft); border: 1px solid var(--border); font-size: 14px;
  }
  .deadline strong { font-variant-numeric: tabular-nums; }

  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 18px; margin-bottom: 18px;
  }
  label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 8px; }
  textarea {
    width: 100%; min-height: 190px; resize: vertical; padding: 12px;
    font: 12.5px/1.5 var(--mono); color: var(--text);
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
  }
  textarea:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
  button {
    font: inherit; font-weight: 600; padding: 8px 16px; border-radius: 6px;
    border: 1px solid transparent; background: var(--accent); color: #fff; cursor: pointer;
  }
  button.ghost { background: transparent; color: var(--accent); border-color: var(--border); font-weight: 500; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .err { color: var(--bad); font-size: 13.5px; margin-top: 10px; }

  .verdict { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
  .score { font-size: 40px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; }
  .vlabel { font-size: 19px; font-weight: 600; }
  .effort { margin-top: 10px; color: var(--muted); font-size: 14px; }
  .bar { height: 6px; border-radius: 3px; background: var(--border); margin-top: 14px; overflow: hidden; }
  .bar > i { display: block; height: 100%; border-radius: 3px; }

  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
  .chip {
    font-size: 13px; padding: 4px 10px; border-radius: 20px;
    border: 1px solid var(--border); background: var(--bg);
  }

  h2 { font-size: 17px; margin: 26px 0 12px; }
  .blocker { border-left: 3px solid var(--bad); padding: 12px 14px; background: var(--bg); border-radius: 0 6px 6px 0; margin-bottom: 10px; }
  .blocker h3 { margin: 0 0 6px; font-size: 14px; font-family: var(--mono); font-weight: 600; }
  .blocker p { margin: 0; font-size: 13.5px; color: var(--muted); }

  .tablewrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 6px; }
  table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  th { background: var(--bg); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
  tr:last-child td { border-bottom: 0; }
  code { font-family: var(--mono); font-size: 12.5px; }

  footer { margin-top: 40px; padding-top: 22px; border-top: 1px solid var(--border); color: var(--muted); font-size: 13px; }
  footer a { color: var(--accent); }
  .caveat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; font-size: 13.5px; color: var(--muted); margin-top: 18px; }
  .hidden { display: none; }
</style>

<div class="wrap">
<header>
  <h1>Connect → Forge Migration Analyzer</h1>
  <p class="sub">Paste an Atlassian Connect descriptor. Get a migration readiness report.</p>
  <div class="deadline">
    Atlassian ends Connect support on <strong>31 January 2027</strong>. Marketplace has blocked
    Connect descriptor updates since <strong>March 2026</strong> — apps still on Connect cannot ship
    changes at all.
  </div>
</header>

<div class="card">
  <label for="src">atlassian-connect.json</label>
  <textarea id="src" spellcheck="false" placeholder='{ "key": "com.example.app", "name": "My App", "modules": { ... } }'></textarea>
  <div class="row">
    <button id="go">Analyze</button>
    <button class="ghost" id="ex-conf">Load Confluence example</button>
    <button class="ghost" id="ex-jira">Load Jira example</button>
    <button class="ghost" id="clear">Clear</button>
  </div>
  <div class="err hidden" id="err"></div>
</div>

<div id="out" class="hidden"></div>

<div class="caveat">
  <strong>How to read the estimate.</strong> Day counts are a planning heuristic from module
  counts weighted by documented difficulty, plus a surcharge on UI-bearing modules and fixed
  overhead for manifest, auth, build and regression work. It is not a quote. This tool reads the
  descriptor, not your code — it cannot see how complex your frontend actually is, and frontend
  rework dominates real migrations. Anything marked ⛔ or 🔴 needs a human decision before a date
  can be committed.
</div>

<footer>
  <p>Built by ${AUTHOR.name} · ${AUTHOR.tagline}${AUTHOR.contact ? ` · <a href="${AUTHOR.contact}">Get in touch</a>` : ''}</p>
  <p>An independent tool. Not affiliated with or endorsed by Atlassian. Mapping data transcribed from
  Atlassian's published Connect/Forge equivalence and limitations documentation, retrieved __RETRIEVED__.
  Atlassian revises these tables — verify before relying on this for a paid engagement.</p>
  <p>Your descriptor is analysed entirely in your browser. Nothing is uploaded.</p>
</footer>
</div>

<script>
const MAP = __MAP__;

__CORE__

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const EXAMPLES = {
  conf: __EX_CONF__,
  jira: __EX_JIRA__
};

function scoreColor(score) {
  if (score >= 80) return 'var(--ok)';
  if (score >= 55) return 'var(--warn)';
  return 'var(--bad)';
}

function render(report) {
  const r = readiness(report);
  const { summary, findings, effort, app, globalRisks } = report;
  const col = scoreColor(r.score);
  const h = [];

  h.push('<div class="card">');
  h.push('<div class="verdict"><span class="score" style="color:' + col + '">' + r.score + '</span>');
  h.push('<span class="vlabel">' + esc(r.verdict) + '</span>');
  h.push('<span style="color:var(--muted);font-size:14px">' + esc(app.name || '(unnamed)') + ' · ' + esc(app.products.join(', ')) + ' · ' + findings.length + ' modules</span></div>');
  h.push('<div class="bar"><i style="width:' + r.score + '%;background:' + col + '"></i></div>');
  h.push('<p class="effort">' + esc(r.note) + '</p>');
  h.push('<p class="effort"><strong>~' + effort.totalDays + ' developer-days (~' + effort.totalWeeks + (effort.totalWeeks === 1 ? ' week' : ' weeks') + ')</strong></p>');
  h.push('<div class="chips">');
  for (const s of ORDER) if (summary[s]) h.push('<span class="chip">' + ICON[s] + ' ' + summary[s] + ' ' + esc(LABEL[s]) + '</span>');
  h.push('</div></div>');

  const blockers = findings.filter((f) => f.status === 'none' || f.status === 'redesign');
  if (blockers.length) {
    h.push('<h2>⛔ Blockers — resolve before scoping</h2>');
    for (const f of blockers) {
      h.push('<div class="blocker"><h3>' + esc(f.module) + (f.key ? ' <span style="color:var(--muted)">' + esc(f.key) + '</span>' : '') + '</h3>');
      h.push('<p>' + esc(f.note || 'No Forge equivalent documented.') + '</p></div>');
    }
  }

  h.push('<h2>Module-by-module</h2><div class="tablewrap"><table><thead><tr>');
  h.push('<th>Connect module</th><th>Key</th><th>Forge equivalent</th><th>Status</th><th>Days</th></tr></thead><tbody>');
  const sorted = findings.slice().sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  for (const f of sorted) {
    h.push('<tr><td><code>' + esc(f.module) + '</code></td><td>' + (f.key ? '<code>' + esc(f.key) + '</code>' : '—') +
      '</td><td>' + (f.forge ? '<code>' + esc(f.forge) + '</code>' : '—') +
      '</td><td>' + ICON[f.status] + ' ' + esc(LABEL[f.status]) + '</td><td>' + f.effortDays + '</td></tr>');
  }
  h.push('</tbody></table></div>');

  if (globalRisks.length) {
    h.push('<h2>Platform-level risks</h2>');
    for (const g of globalRisks) {
      h.push('<div class="blocker" style="border-left-color:' + (g.severity === 'high' ? 'var(--bad)' : 'var(--warn)') + '">');
      h.push('<h3 style="font-family:inherit">' + esc(g.title) + '</h3><p>' + esc(g.detail) + '</p></div>');
    }
  }

  h.push('<div class="row"><button id="dl">Download full report (.md)</button></div>');
  $('out').innerHTML = h.join('');
  $('out').classList.remove('hidden');
  $('dl').onclick = () => {
    const blob = new Blob([toMarkdown(report)], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (app.key || 'forge-migration') + '-report.md';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('out').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function run() {
  const raw = $('src').value.trim();
  $('err').classList.add('hidden');
  $('out').classList.add('hidden');
  if (!raw) { $('err').textContent = 'Paste a descriptor first.'; $('err').classList.remove('hidden'); return; }
  let descriptor;
  try {
    descriptor = JSON.parse(raw);
  } catch (e) {
    $('err').textContent = 'That is not valid JSON — ' + e.message;
    $('err').classList.remove('hidden');
    return;
  }
  if (!descriptor || typeof descriptor !== 'object' || !descriptor.modules) {
    $('err').textContent = 'No "modules" object found. This does not look like an atlassian-connect.json descriptor.';
    $('err').classList.remove('hidden');
    return;
  }
  try {
    render(analyze(MAP, descriptor));
  } catch (e) {
    $('err').textContent = 'Analysis failed: ' + e.message;
    $('err').classList.remove('hidden');
  }
}

$('go').onclick = run;
$('ex-conf').onclick = () => { $('src').value = JSON.stringify(EXAMPLES.conf, null, 2); run(); };
$('ex-jira').onclick = () => { $('src').value = JSON.stringify(EXAMPLES.jira, null, 2); run(); };
$('clear').onclick = () => { $('src').value = ''; $('out').classList.add('hidden'); $('err').classList.add('hidden'); };
$('src').addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run(); });
</script>
`;

const meta = JSON.parse(MAP_RAW).meta;
const out = html
  .replace('__MAP__', MAP_RAW)
  .replace('__CORE__', CORE)
  .replace('__RETRIEVED__', meta.retrieved)
  .replace('__EX_CONF__', readFileSync(join(root, 'samples', 'confluence-app.json'), 'utf8'))
  .replace('__EX_JIRA__', readFileSync(join(root, 'samples', 'jira-app.json'), 'utf8'));

mkdirSync(join(root, 'web'), { recursive: true });
writeFileSync(join(root, 'web', 'index.html'), out);
console.log(`web/index.html written — ${(out.length / 1024).toFixed(0)} KB, self-contained`);
