import Analyzer from './Analyzer';
import MAP from '@/lib/module-map.json';

export const dynamic = 'force-dynamic'; // keeps the countdown honest

export default function Home() {
  const eos = new Date(MAP.meta.connectEndOfSupport);
  const daysLeft = Math.max(0, Math.ceil((eos.getTime() - Date.now()) / 86_400_000));

  return (
    <>
      <div className="ambient" aria-hidden />

      <main className="layer min-h-dvh">
        <div className="mx-auto max-w-6xl px-5">
          {/* ---------------- hero ---------------- */}
          <header className="pt-20 pb-14 sm:pt-28 sm:pb-16">
            <div className="pill inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium">
              <span className="pulse w-1.5 h-1.5 rounded-full" style={{ background: 'var(--brand)' }} />
              <span style={{ color: 'var(--text-dim)' }}>Connect end of support in</span>
              <span className="tabular-nums font-semibold">{daysLeft} days</span>
            </div>

            <h1 className="mt-7 text-[2.75rem] leading-[1.04] sm:text-[4.25rem] font-bold tracking-[-0.03em] max-w-4xl">
              <span className="gradient-text">How far is your Connect app</span>
              <br />
              <span style={{ color: 'var(--muted)' }}>from Forge?</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl leading-relaxed max-w-2xl" style={{ color: 'var(--text-dim)' }}>
              Point it at your <span className="mono text-[0.92em] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>atlassian-connect.json</span>{' '}
              and get a module-by-module readiness report — every Forge equivalent, every blocker,
              and an effort estimate you can actually plan against.
            </p>

            <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
              {[
                ['31 Jan 2027', 'Connect end of support', 'var(--blocker)'],
                ['Mar 2026', 'Updates already blocked', 'var(--preview)'],
                ['8–16 wks', 'Typical migration', 'var(--text)'],
                ['0%', 'Forge rev share to $1M', 'var(--ok)'],
              ].map(([big, small, color]) => (
                <div key={small} className="card px-4 py-3.5">
                  <dt className="text-lg font-semibold tabular-nums tracking-tight" style={{ color }}>{big}</dt>
                  <dd className="text-[12.5px] mt-1 leading-snug" style={{ color: 'var(--muted)' }}>{small}</dd>
                </div>
              ))}
            </dl>
          </header>

          <Analyzer />

          {/* ---------------- explainers ---------------- */}
          <section className="grid md:grid-cols-2 gap-3 mt-16">
            <div className="card p-6">
              <h2 className="font-semibold text-[15px]">What it checks</h2>
              <ul className="mt-4 space-y-3.5 text-sm" style={{ color: 'var(--text-dim)' }}>
                {[
                  ['Every declared module', 'mapped to its documented Forge equivalent — including the ones Atlassian’s own table omits entirely.'],
                  ['Web item and panel locations', 'resolved individually. The same module is trivial in one location and unsupported in another.'],
                  ['Webhooks', 'mapped to their Forge product events.'],
                  ['Platform risks', 'that apply regardless of modules: discontinued lifecycle events, unlicensedAccess opt-in, FIT-vs-JWT on remotes.'],
                ].map(([b, rest]) => (
                  <li key={b} className="flex gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--brand)' }} />
                    <span><b style={{ color: 'var(--text)' }}>{b}</b> {rest}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold text-[15px]">How to read the estimate</h2>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                Day counts are a planning heuristic — module counts weighted by documented difficulty,
                a surcharge on UI-bearing modules because frontend rework dominates real migrations,
                and fixed overhead for manifest, auth, build and regression work.
              </p>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                <b style={{ color: 'var(--text)' }}>It is not a quote.</b> This reads your descriptor,
                not your code, so it cannot see how complex your frontend really is. Anything flagged as
                a blocker needs a human decision before a date gets committed.
              </p>
            </div>
          </section>

          <footer className="mt-16 pb-20 pt-8 text-[13px] leading-relaxed" style={{ borderTop: '1px solid var(--line-soft)', color: 'var(--muted)' }}>
            <p>
              Built by <span style={{ color: 'var(--text-dim)' }}>Umair Ahmed</span> · Independent Atlassian app developer ·{' '}
              <a href="mailto:umairahmed5544@gmail.com" className="underline underline-offset-4" style={{ color: 'var(--brand)' }}>
                Get in touch
              </a>
            </p>
            <p className="mt-2.5 max-w-3xl">
              An independent tool. Not affiliated with or endorsed by Atlassian. Mapping data transcribed
              from Atlassian’s published Connect/Forge equivalence and limitations documentation, retrieved{' '}
              {MAP.meta.retrieved}. Atlassian revises these tables — verify before relying on this for a
              paid engagement.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
