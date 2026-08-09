import Analyzer from './Analyzer';
import MAP from '@/lib/module-map.json';

export const dynamic = 'force-dynamic'; // keeps the countdown honest

export default function Home() {
  const eos = new Date(MAP.meta.connectEndOfSupport);
  const daysLeft = Math.max(0, Math.ceil((eos.getTime() - Date.now()) / 86_400_000));

  return (
    <main className="min-h-dvh">
      <div className="hero-wash">
        <div className="mx-auto max-w-5xl px-5 pt-16 pb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
            style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--brand)' }} />
            Connect end of support in {daysLeft} days
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-3xl leading-[1.08]">
            How far is your Connect app from Forge?
          </h1>

          <p className="mt-4 text-lg max-w-2xl" style={{ color: 'var(--muted)' }}>
            Point this at your <span className="mono">atlassian-connect.json</span> and get a
            module-by-module migration readiness report — every Forge equivalent, every blocker,
            and an effort estimate you can plan against.
          </p>

          <div className="mt-6 grid sm:grid-cols-3 gap-3 max-w-3xl">
            {[
              ['31 Jan 2027', 'Connect end of support'],
              ['March 2026', 'Descriptor updates already blocked'],
              ['8–16 weeks', 'Typical migration effort'],
            ].map(([big, small]) => (
              <div key={small} className="card px-4 py-3">
                <div className="font-semibold tabular-nums">{big}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{small}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 pb-24">
        <Analyzer />

        <section className="card p-5 sm:p-6 mt-10">
          <h2 className="font-semibold">What it checks</h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 mt-3 text-sm" style={{ color: 'var(--muted)' }}>
            <p><b style={{ color: 'var(--text)' }}>Every declared module</b> mapped to its documented Forge equivalent, including modules Atlassian&apos;s table omits entirely.</p>
            <p><b style={{ color: 'var(--text)' }}>Web item and panel locations</b> resolved individually — the same module is trivial in one location and unsupported in another.</p>
            <p><b style={{ color: 'var(--text)' }}>Webhooks</b> mapped to Forge product events.</p>
            <p><b style={{ color: 'var(--text)' }}>Platform risks</b> that apply regardless of modules: discontinued lifecycle events, <span className="mono">unlicensedAccess</span> opt-in, FIT-vs-JWT on remotes.</p>
          </div>
        </section>

        <section className="card p-5 sm:p-6 mt-3">
          <h2 className="font-semibold">How to read the estimate</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            Day counts are a planning heuristic — module counts weighted by documented difficulty,
            a surcharge on UI-bearing modules because frontend rework dominates real migrations, and
            fixed overhead for manifest, auth, build and regression work. <b style={{ color: 'var(--text)' }}>It is not a quote.</b>{' '}
            This tool reads your descriptor, not your code, so it cannot see how complex your frontend
            actually is. Anything flagged as a blocker needs a human decision before a date can be committed.
          </p>
        </section>

        <footer className="mt-10 pt-6 text-sm" style={{ borderTop: '1px solid var(--line)', color: 'var(--muted)' }}>
          <p>
            Built by Umair Ahmed · Independent Atlassian app developer ·{' '}
            <a href="mailto:umairahmed5544@gmail.com" style={{ color: 'var(--brand)' }}>Get in touch</a>
          </p>
          <p className="mt-2">
            An independent tool. Not affiliated with or endorsed by Atlassian. Mapping data transcribed
            from Atlassian&apos;s published Connect/Forge equivalence and limitations documentation,
            retrieved {MAP.meta.retrieved}. Atlassian revises these tables — verify before relying on
            this for a paid engagement.
          </p>
        </footer>
      </div>
    </main>
  );
}
