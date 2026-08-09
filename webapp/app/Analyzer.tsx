'use client';

import { useMemo, useState } from 'react';
import { analyze, toMarkdown, readiness, ICON, LABEL, ORDER } from '@/lib/core.js';
import type { Report, Status } from '@/lib/core.js';
import MAP from '@/lib/module-map.json';

const STATUS_VAR: Record<Status, string> = {
  direct: 'var(--ok)', caveat: 'var(--caveat)', preview: 'var(--preview)',
  redesign: 'var(--redesign)', none: 'var(--blocker)', unknown: 'var(--muted)',
};

const STATUSES = ORDER;
const ICONS = ICON;
const LABELS = LABEL;

function Gauge({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--ok)' : score >= 55 ? 'var(--caveat)' : 'var(--blocker)';
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: 132, height: 132 }}>
      <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--line)" strokeWidth="11" />
        <circle
          cx="66" cy="66" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * score) / 100}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.7,.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <div className="text-4xl font-bold tabular-nums leading-none" style={{ color }}>{score}</div>
        <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: 'var(--muted)' }}>readiness</div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-1" style={{ color: accent ?? 'inherit' }}>{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</div>}
    </div>
  );
}

export default function Analyzer() {
  const [mode, setMode] = useState<'url' | 'paste'>('url');
  const [url, setUrl] = useState('');
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Status | 'all'>('all');

  const verdict = useMemo(() => (report ? readiness(report) : null), [report]);

  function run(descriptor: unknown) {
    try {
      const r = analyze(MAP, descriptor);
      setReport(r);
      setError('');
      queueMicrotask(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) {
      setError(`Analysis failed: ${(e as Error).message}`);
      setReport(null);
    }
  }

  async function fromUrl() {
    const u = url.trim();
    if (!u) return setError('Enter your descriptor URL.');
    setBusy(true); setError(''); setReport(null);
    try {
      const res = await fetch(`/api/descriptor?url=${encodeURIComponent(u)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed.');
      run(data.descriptor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function fromPaste() {
    const t = raw.trim();
    if (!t) return setError('Paste a descriptor first.');
    let d: unknown;
    try { d = JSON.parse(t); } catch (e) { return setError(`That is not valid JSON — ${(e as Error).message}`); }
    if (!d || typeof d !== 'object' || !('modules' in (d as object))) {
      return setError('No "modules" object found — that does not look like a Connect descriptor.');
    }
    run(d);
  }

  function download() {
    if (!report) return;
    const blob = new Blob([toMarkdown(report)], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${report.app.key || 'forge-migration'}-report.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const visible = useMemo(() => {
    if (!report) return [];
    const needle = q.toLowerCase();
    return [...report.findings]
      .filter((f) => filter === 'all' || f.status === filter)
      .filter((f) => !needle || f.module.toLowerCase().includes(needle) || (f.key || '').toLowerCase().includes(needle) || (f.forge || '').toLowerCase().includes(needle))
      .sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status));
  }, [report, q, filter]);

  const blockers = report?.findings.filter((f) => f.status === 'none' || f.status === 'redesign') ?? [];
  const total = report?.findings.length || 1;

  return (
    <>
      {/* ---------- input ---------- */}
      <section className="card p-5 sm:p-6">
        <div className="flex gap-1 p-1 rounded-lg w-fit mb-4" style={{ background: 'var(--bg)' }}>
          {(['url', 'paste'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className="px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={mode === m
                ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 1px 2px rgba(0,0,0,.08)' }
                : { color: 'var(--muted)' }}
            >
              {m === 'url' ? 'From URL' : 'Paste JSON'}
            </button>
          ))}
        </div>

        {mode === 'url' ? (
          <div>
            <label htmlFor="u" className="block text-sm font-semibold mb-2">Descriptor URL</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="u" value={url} onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fromUrl()}
                placeholder="https://your-app.example.com/atlassian-connect.json"
                spellCheck={false}
                className="flex-1 px-3.5 py-2.5 rounded-lg mono outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }}
              />
              <button
                onClick={fromUrl} disabled={busy}
                className="px-5 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50 whitespace-nowrap"
                style={{ background: 'var(--brand)' }}
              >
                {busy ? 'Fetching…' : 'Analyze'}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Your descriptor is fetched server-side to work around CORS, then analysed in your browser. It is never stored.
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="p" className="block text-sm font-semibold mb-2">atlassian-connect.json</label>
            <textarea
              id="p" value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false}
              placeholder={'{ "key": "com.example.app", "name": "My App", "modules": { … } }'}
              className="w-full min-h-44 px-3.5 py-3 rounded-lg mono outline-none resize-y"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }}
            />
            <button onClick={fromPaste} className="mt-3 px-5 py-2.5 rounded-lg font-semibold text-white" style={{ background: 'var(--brand)' }}>
              Analyze
            </button>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>Analysed entirely in your browser. Nothing is uploaded.</p>
          </div>
        )}

        {error && (
          <div className="mt-4 px-3.5 py-2.5 rounded-lg text-sm" style={{ background: 'color-mix(in srgb, var(--blocker) 10%, transparent)', color: 'var(--blocker)' }}>
            {error}
          </div>
        )}
      </section>

      {/* ---------- results ---------- */}
      {report && verdict && (
        <section id="results" className="mt-8 rise">
          <div className="card p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
              <Gauge score={verdict.score} />
              <div className="min-w-0">
                <div className="text-2xl font-bold">{verdict.verdict}</div>
                <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  {report.app.name || '(unnamed app)'} · {report.app.products.join(', ')}
                </div>
                <p className="mt-3 text-sm max-w-xl">{verdict.note}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                {STATUSES.filter((s) => report.summary[s]).map((s: Status) => (
                  <div key={s} title={`${report.summary[s]} ${LABELS[s]}`}
                    style={{ width: `${((report.summary[s] || 0) / total) * 100}%`, background: STATUS_VAR[s] }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs">
                {STATUSES.filter((s) => report.summary[s]).map((s: Status) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: STATUS_VAR[s] }} />
                    <b className="tabular-nums">{report.summary[s]}</b>
                    <span style={{ color: 'var(--muted)' }}>{LABELS[s]}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <Stat label="Modules" value={report.findings.length} />
            <Stat label="Blockers" value={blockers.length} accent={blockers.length ? 'var(--blocker)' : undefined} sub={blockers.length ? 'need a decision' : 'none found'} />
            <Stat label="Effort" value={`${report.effort.totalDays}d`} sub={`~${report.effort.totalWeeks} weeks`} />
            <Stat label="Overhead" value={`${report.effort.baseOverheadDays}d`} sub="manifest, auth, build" />
          </div>

          {blockers.length > 0 && (
            <>
              <h2 className="text-lg font-bold mt-8 mb-3">Blockers — resolve before scoping</h2>
              <div className="grid gap-2.5">
                {blockers.map((f, i) => (
                  <div key={i} className="card p-4" style={{ borderLeft: '3px solid var(--blocker)' }}>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="mono font-semibold">{f.module}</span>
                      {f.key && <span className="mono text-xs" style={{ color: 'var(--muted)' }}>{f.key}</span>}
                      <span className="ml-auto text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{f.effortDays}d</span>
                    </div>
                    {f.note && <p className="text-sm mt-1.5" style={{ color: 'var(--muted)' }}>{f.note}</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 className="text-lg font-bold mt-8 mb-3">Module-by-module</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter modules…"
              className="px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}
            />
            {(['all', ...STATUSES.filter((s) => report.summary[s])] as (Status | 'all')[]).map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={filter === s
                  ? { background: 'var(--brand)', color: '#fff' }
                  : { background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                {s === 'all' ? `All ${report.findings.length}` : `${ICONS[s]} ${report.summary[s]}`}
              </button>
            ))}
          </div>

          <div className="card tablewrap">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {['Connect module', 'Key', 'Forge equivalent', 'Status', 'Days'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap"
                      style={{ color: 'var(--muted)', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((f, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 mono whitespace-nowrap" style={{ borderBottom: '1px solid var(--line)' }}>{f.module}</td>
                    <td className="px-4 py-2.5 mono whitespace-nowrap" style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>{f.key || '—'}</td>
                    <td className="px-4 py-2.5 mono whitespace-nowrap" style={{ borderBottom: '1px solid var(--line)' }}>{f.forge || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ borderBottom: '1px solid var(--line)' }}>
                      <span className="inline-flex items-center gap-1.5">
                        <i className="w-2 h-2 rounded-full inline-block" style={{ background: STATUS_VAR[f.status] }} />
                        {LABELS[f.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums" style={{ borderBottom: '1px solid var(--line)' }}>{f.effortDays}</td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>No modules match that filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {report.globalRisks.length > 0 && (
            <>
              <h2 className="text-lg font-bold mt-8 mb-3">Platform-level risks</h2>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {report.globalRisks.map((g) => (
                  <div key={g.id} className="card p-4" style={{ borderLeft: `3px solid ${g.severity === 'high' ? 'var(--blocker)' : 'var(--caveat)'}` }}>
                    <div className="font-semibold text-sm">{g.title}</div>
                    <p className="text-sm mt-1.5" style={{ color: 'var(--muted)' }}>{g.detail}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="card p-5 sm:p-6 mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold">Want this scoped properly?</div>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                This report reads your descriptor. A full assessment reads your code — where the real
                effort hides, and where an estimate becomes a plan.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={download} className="px-4 py-2.5 rounded-lg font-semibold text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}>
                Download report
              </button>
              <a href={`mailto:umairahmed5544@gmail.com?subject=${encodeURIComponent(`Forge migration assessment — ${report.app.name || report.app.key || 'my app'}`)}`}
                className="px-4 py-2.5 rounded-lg font-semibold text-sm text-white whitespace-nowrap"
                style={{ background: 'var(--brand)' }}>
                Request an assessment
              </a>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
