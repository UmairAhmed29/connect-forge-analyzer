# Connect → Forge Migration Analyzer

Paste in an Atlassian Connect descriptor, get a migration readiness report.

Atlassian ends support for Connect on **31 January 2027**, and Marketplace has blocked
Connect descriptor updates since **March 2026** — apps still on Connect cannot ship changes
at all. This tool tells you how far you are from Forge and where the hard parts are.

## Usage

```bash
node src/cli.js samples/confluence-app.json              # terminal summary
node src/cli.js <descriptor-url> --markdown              # full report
node src/cli.js <descriptor-url> --out report.md         # write to file
node src/cli.js <descriptor-url> --json                  # raw analysis
```

Accepts a local file path or a URL to a live `atlassian-connect.json`.

## Web version

```bash
node build.js        # regenerates web/index.html
```

Produces a single ~50 KB self-contained HTML file — no dependencies, no build step, no
server. Drop it on GitHub Pages, Netlify, Cloudflare Pages or any static host.

Descriptors are analysed entirely in the browser; nothing is uploaded. That is worth
stating on the page, because vendors are pasting a file that describes their product.

`build.js` inlines `data/module-map.json` and `src/core.js` into the page, so the mapping
lives in exactly one place and the CLI and web version cannot drift apart. Re-run it after
any change to the map.

### Before publishing

Set `AUTHOR.contact` in `build.js` — without it the page has no call to action and
generates no leads.

## What it checks

- **Every declared module** mapped to its documented Forge equivalent
- **Web item and web panel locations** resolved individually — the same `webItems`
  module can be trivial in one location and unsupported in another
- **Webhooks** mapped to Forge product events
- **Platform-level risks** that apply regardless of modules: discontinued lifecycle
  events, `unlicensedAccess` opt-in, licensing consistency, FIT-vs-JWT for remotes
- **Data migration flags** for modules carrying customer configuration

## Status levels

| | Meaning |
|---|---|
| 🟢 direct | Straight equivalent. Mechanical. |
| 🟡 caveat | Equivalent exists, behaviour differs. |
| 🟠 preview | Forge module still in preview — API may change. |
| 🔴 redesign | No like-for-like module. Architectural change. |
| ⛔ none | No documented equivalent. Blocker. |

## On the effort estimate

The day counts are a **planning heuristic**, not a quote. They come from module counts
weighted by documented difficulty, plus a surcharge on UI-bearing modules (frontend rework
dominates real migrations) and a fixed base overhead for manifest, auth, build pipeline and
regression testing.

Calibration check: a macro-heavy Confluence app scores ~11.6 weeks and a simple Jira app
~3.8 weeks, against an industry-reported range of 8–16 weeks for typical migrations.

## Validation

Run `node src/cli.js samples/stress-coverage.json` — a synthetic descriptor containing 43
Connect module keys. Every one must resolve; none should come back as `unknown`.

That test caught two real bugs:

1. **23% of modules fell through unmapped** and were reported as a neutral "unknown"
   rather than as risk. Modules absent from Atlassian's equivalence table (`webSections`,
   `jiraReports`, `confluenceThemes`, `spaceViews` and others) are now listed explicitly in
   `absentFromEquivalenceTable` and surfaced as blockers, with the honest caveat that
   absence from the table is not formal proof no equivalent exists.
2. **Blockers were diluted by easy modules.** A 43-module app with 12 unmigratable
   capabilities scored 69/100 "Moderate". Absolute blocker count now imposes a ceiling on
   the score, so that same app correctly reads 25/100 "High risk".

Also verified against three real descriptors pulled from public GitHub repositories. All
parse and analyse cleanly, though all three are small boilerplate apps — the tool has **not**
yet been validated against a large commercial descriptor.

Treat the output as a scoping conversation starter. Anything marked 🔴 or ⛔ needs a human
decision before a date can be committed.

## Data source

Mappings are transcribed from [Atlassian's Connect/Forge capability
equivalences](https://developer.atlassian.com/platform/adopting-forge-from-connect/connect-forge-equivalences/connect-forge-capabilities-available/)
and [limitations and
differences](https://developer.atlassian.com/platform/adopting-forge-from-connect/limitations-and-differences/),
retrieved 2026-08-09.

Atlassian changes these tables. `data/module-map.json` carries a `retrieved` date — re-verify
before relying on the output for a paid engagement.
