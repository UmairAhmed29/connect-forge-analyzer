'use client';

import { useMemo, useState } from 'react';
import { track } from '@vercel/analytics';
import { analyze, toMarkdown, readiness, ICON, LABEL, ORDER } from '@/lib/core.js';
import type { Report, Status } from '@/lib/core.js';
import MAP from '@/lib/module-map.json';
import { DEMO_CONFLUENCE, DEMO_JIRA } from './demo-descriptors';

const STATUS_VAR: Record<Status, string> = {
  direct: 'var(--ok)', caveat: 'var(--caveat)', preview: 'var(--preview)',
  redesign: 'var(--redesign)', none: 'var(--blocker)', unknown: 'var(--muted)',
};

function Gauge({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--ok)' : score >= 55 ? 'var(--caveat)' : 'var(--blocker)';
  const r = 58, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: 148, height: 148 }}>
      <svg width="148" height="148" viewBox="0 0 148 148" className="-rotate-90">
        <defs>
          <filter id="gGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="74" cy="74" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx="74" cy="74" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * score) / 100} filter="url(#gGlow)"
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.7,.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <div className="text-[2.75rem] font-bold tabular-nums leading-none tracking-tight" style={{ color }}>{score}</div>
        <div className="text-[10.5px] uppercase tracking-[0.14em] mt-1.5" style={{ color: 'var(--muted)' }}>readiness</div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10.5px] uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-[1.65rem] font-semibold tabular-nums mt-1.5 tracking-tight" style={{ color: accent ?? 'var(--text)' }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{sub}</div>}
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
  const [demo, setDemo] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Status | 'all'>('all');

  const verdict = useMemo(() => (report ? readiness(report) : null), [report]);

  function run(descriptor: unknown, isDemo = false, source: 'url' | 'paste' | 'demo' = 'paste') {
    try {
      const r = analyze(MAP, descriptor);
      setReport(r);
      setDemo(isDemo);
      track('analysis_run', {
        source,
        modules: r.findings.length,
        blockers: r.findings.filter((f) => f.status === 'none' || f.status === 'redesign').length,
        score: readiness(r).score,
        products: r.app.products.join(','),
      });
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
      run(data.descriptor, false, 'url');
    } catch (e) {
      track('url_fetch_failed', { reason: (e as Error).message.slice(0, 80) });
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
    run(d, false, 'paste');
  }

  function download() {
    if (!report) return;
    track('report_downloaded', { app: report.app.key || 'unknown' });
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
      .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  }, [report, q, filter]);

  const blockers = report?.findings.filter((f) => f.status === 'none' || f.status === 'redesign') ?? [];
  const total = report?.findings.length || 1;

  return (
    <>
      {/* ------------------------- input ------------------------- */}
      <section className="card card-glow p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-3 justify-between mb-5">
          <div className="inline-flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--line-soft)' }}>
            {(['url', 'paste'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className="px-4 py-1.5 rounded-lg text-[13.5px] font-medium transition-colors"
                style={mode === m
                  ? { background: 'var(--surface-2)', color: 'var(--text)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)' }
                  : { color: 'var(--muted)' }}
              >
                {m === 'url' ? 'From URL' : 'Paste JSON'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[13px]">
            <span style={{ color: 'var(--muted)' }}>No descriptor handy?</span>
            <button onClick={() => run(DEMO_CONFLUENCE, true, 'demo')} className="btn-ghost px-3 py-1.5 rounded-lg text-[13px] font-medium">
              Confluence example
            </button>
            <button onClick={() => run(DEMO_JIRA, true, 'demo')} className="btn-ghost px-3 py-1.5 rounded-lg text-[13px] font-medium">
              Jira example
            </button>
          </div>
        </div>

        {mode === 'url' ? (
          <div>
            <label htmlFor="u" className="block text-[13px] font-semibold mb-2.5" style={{ color: 'var(--text-dim)' }}>
              Descriptor URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="u" value={url} onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fromUrl()}
                placeholder="https://your-app.example.com/atlassian-connect.json"
                spellCheck={false}
                className="field flex-1 px-4 py-3 rounded-xl mono text-[13px]"
              />
              <button onClick={fromUrl} disabled={busy} className="btn-primary px-6 py-3 rounded-xl font-semibold text-[14px] whitespace-nowrap">
                {busy ? 'Fetching…' : 'Analyze'}
              </button>
            </div>
            <p className="text-[12.5px] mt-2.5" style={{ color: 'var(--muted)' }}>
              Fetched server-side to get around CORS, then analysed in your browser. Never stored.
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="p" className="block text-[13px] font-semibold mb-2.5" style={{ color: 'var(--text-dim)' }}>
              atlassian-connect.json
            </label>
            <textarea
              id="p" value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false}
              placeholder={'{ "key": "com.example.app", "name": "My App", "modules": { … } }'}
              className="field w-full min-h-48 px-4 py-3.5 rounded-xl mono text-[13px] resize-y"
            />
            <button onClick={fromPaste} className="btn-primary mt-3 px-6 py-3 rounded-xl font-semibold text-[14px]">
              Analyze
            </button>
            <p className="text-[12.5px] mt-2.5" style={{ color: 'var(--muted)' }}>
              Analysed entirely in your browser. Nothing leaves the page.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl text-[13.5px]"
            style={{ background: 'rgba(255,92,92,.10)', border: '1px solid rgba(255,92,92,.25)', color: 'var(--blocker)' }}>
            {error}
          </div>
        )}
      </section>

      {/* ------------------------- results ------------------------- */}
      {report && verdict && (
        <section id="results" className="mt-6 rise">
          {demo && (
            <div className="mb-3 px-4 py-2.5 rounded-xl text-[13px] inline-flex items-center gap-2"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--text-dim)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--caveat)' }} />
              Example descriptor — swap in your own above for a real result.
            </div>
          )}

          <div className="card card-glow p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-7 sm:items-center">
              <Gauge score={verdict.score} />
              <div className="min-w-0 flex-1">
                <div className="text-[1.75rem] font-bold tracking-tight">{verdict.verdict}</div>
                <div className="text-[13.5px] mt-1.5 mono" style={{ color: 'var(--muted)' }}>
                  {report.app.name || '(unnamed app)'} · {report.app.products.join(', ')}
                </div>
                <p className="mt-4 text-[15px] leading-relaxed max-w-xl" style={{ color: 'var(--text-dim)' }}>{verdict.note}</p>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex h-2 rounded-full overflow-hidden gap-[2px]">
                {ORDER.filter((s) => report.summary[s]).map((s) => (
                  <div key={s} title={`${report.summary[s]} ${LABEL[s]}`} className="first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${((report.summary[s] || 0) / total) * 100}%`, background: STATUS_VAR[s] }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[12.5px]">
                {ORDER.filter((s) => report.summary[s]).map((s) => (
                  <span key={s} className="inline-flex items-center gap-2">
                    <i className="w-2 h-2 rounded-full inline-block" style={{ background: STATUS_VAR[s] }} />
                    <b className="tabular-nums">{report.summary[s]}</b>
                    <span style={{ color: 'var(--muted)' }}>{LABEL[s]}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <Stat label="Modules" value={report.findings.length} />
            <Stat label="Blockers" value={blockers.length}
              accent={blockers.length ? 'var(--blocker)' : 'var(--ok)'}
              sub={blockers.length ? 'need a decision' : 'none found'} />
            <Stat label="Effort" value={`${report.effort.totalDays}d`} sub={`≈ ${report.effort.totalWeeks} weeks`} />
            <Stat label="Overhead" value={`${report.effort.baseOverheadDays}d`} sub="manifest, auth, build" />
          </div>

          {blockers.length > 0 && (
            <>
              <h2 className="text-[17px] font-bold mt-10 mb-3.5">Blockers — resolve before scoping</h2>
              <div className="grid gap-2.5">
                {blockers.map((f, i) => (
                  <div key={i} className="card p-5" style={{ borderLeft: '2px solid var(--blocker)' }}>
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <span className="mono text-[13.5px] font-semibold">{f.module}</span>
                      {f.key && <span className="mono text-[12px]" style={{ color: 'var(--muted)' }}>{f.key}</span>}
                      <span className="ml-auto text-[12px] tabular-nums px-2 py-0.5 rounded-md"
                        style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>{f.effortDays}d</span>
                    </div>
                    {f.note && <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: 'var(--text-dim)' }}>{f.note}</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 className="text-[17px] font-bold mt-10 mb-3.5">Module-by-module</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…"
              className="field px-3.5 py-2 rounded-lg text-[13px] w-40" />
            {(['all', ...ORDER.filter((s) => report.summary[s])] as (Status | 'all')[]).map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors"
                style={filter === s
                  ? { background: 'var(--brand)', color: '#fff', border: '1px solid transparent' }
                  : { background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                {s === 'all' ? `All ${report.findings.length}` : `${ICON[s]} ${report.summary[s]}`}
              </button>
            ))}
          </div>

          <div className="card tablewrap">
            <table className="w-full text-[13.5px] border-collapse">
              <thead>
                <tr>
                  {['Connect module', 'Key', 'Forge equivalent', 'Status', 'Days'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10.5px] uppercase tracking-[0.12em] font-semibold whitespace-nowrap"
                      style={{ color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((f, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 mono whitespace-nowrap" style={{ borderBottom: '1px solid var(--line-soft)' }}>{f.module}</td>
                    <td className="px-4 py-3 mono whitespace-nowrap" style={{ borderBottom: '1px solid var(--line-soft)', color: 'var(--muted)' }}>{f.key || '—'}</td>
                    <td className="px-4 py-3 mono whitespace-nowrap" style={{ borderBottom: '1px solid var(--line-soft)', color: 'var(--text-dim)' }}>{f.forge || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ borderBottom: '1px solid var(--line-soft)' }}>
                      <span className="inline-flex items-center gap-2">
                        <i className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: STATUS_VAR[f.status] }} />
                        {LABEL[f.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ borderBottom: '1px solid var(--line-soft)', color: 'var(--muted)' }}>{f.effortDays}</td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[13.5px]" style={{ color: 'var(--muted)' }}>No modules match that filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {report.globalRisks.length > 0 && (
            <>
              <h2 className="text-[17px] font-bold mt-10 mb-3.5">Platform-level risks</h2>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {report.globalRisks.map((g) => (
                  <div key={g.id} className="card p-5"
                    style={{ borderLeft: `2px solid ${g.severity === 'high' ? 'var(--blocker)' : 'var(--caveat)'}` }}>
                    <div className="font-semibold text-[14px]">{g.title}</div>
                    <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: 'var(--text-dim)' }}>{g.detail}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="card card-glow p-6 sm:p-7 mt-10 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <div className="font-semibold text-[16px]">Want this scoped properly?</div>
              <p className="text-[14px] mt-1.5 leading-relaxed max-w-lg" style={{ color: 'var(--text-dim)' }}>
                This report reads your descriptor. A full assessment reads your code — where the real
                effort hides, and where an estimate becomes a plan.
              </p>
            </div>
            <div className="flex gap-2.5 shrink-0">
              <button onClick={download} className="btn-ghost px-4 py-3 rounded-xl font-semibold text-[13.5px]">
                Download report
              </button>
              <a href={`mailto:umairahmed5544@gmail.com?subject=${encodeURIComponent(`Forge migration assessment — ${report.app.name || report.app.key || 'my app'}`)}`}
                onClick={() => track('assessment_requested', { app: report.app.key || 'unknown', blockers: blockers.length, score: verdict.score })}
                className="btn-primary px-5 py-3 rounded-xl font-semibold text-[13.5px] whitespace-nowrap inline-flex items-center">
                Request an assessment
              </a>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
