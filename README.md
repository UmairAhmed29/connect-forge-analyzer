# Connect → Forge Migration Analyzer

Paste in an Atlassian Connect descriptor, get a migration readiness report.

**→ https://umairahmed29.github.io/connect-forge-analyzer/**


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
node build.js        # regenerates docs/index.html
```

Produces a single ~50 KB self-contained HTML file — no dependencies, no build step, no
server. Drop it on GitHub Pages, Netlify, Cloudflare Pages or any static host.

Descriptors are analysed entirely in the browser; nothing is uploaded. That is worth
stating on the page, because vendors are pasting a file that describes their product.

`build.js` inlines `data/module-map.json` and `src/core.js` into the page, so the mapping
lives in exactly one place and the CLI and web version cannot drift apart. Re-run it after
any change to the map.

Live at **https://umairahmed29.github.io/connect-forge-analyzer/**, served from `docs/`
on `main`. Re-run `node build.js` and push to deploy.

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
| ⚫ obsolete | Not a live Cloud Connect module. Delete it — zero effort, excluded from scoring. |

## Two questions, not one

"No Forge equivalent" and "can't ship it" are different questions, and a module can be
either one without the other. Reports answer them separately:

1. **Is there a Forge-native module?** — the status column above.
2. **Could an app adopted from Connect keep carrying it?** — checked against
   `connectModuleAllowlist`, transcribed from `SUPPORTED_MODULES` in `@forge/manifest`,
   which is the allowlist `ConnectModulesValidator` matches `connectModules` keys against.

Three things a pass on (2) does **not** mean, all of which the report states inline:

- The validator matches the module **name** only. It never inspects the module body, which
  must still satisfy the Connect schema.
- The route is closed to apps not adopted from Connect — the manifest reference states
  *"Adding Connect Modules to a new Forge app is not supported."*
- Acceptance doesn't mean the surface still renders. `jira:jiraProjectTabPanels` and
  `jira:jiraProjectAdminTabPanels` are both accepted and both were deprecated in 2017.

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
   `jiraReports`, `jiraSearchRequestViews`, `confluenceThemes`) are now listed explicitly in
   `absentFromEquivalenceTable` and surfaced as blockers, with the honest caveat that
   absence from the table is not formal proof no equivalent exists.
2. **Blockers were diluted by easy modules.** Scored on proportion alone this 43-module
   sample reads 74/100 "Moderate" despite 10 unmigratable capabilities. Absolute blocker
   count now imposes a ceiling, so it correctly reads 40/100 "Difficult".

A third bug came from [community
review](https://community.developer.atlassian.com/t/i-mapped-every-connect-module-to-its-forge-equivalent-heres-the-tool-please-tell-me-where-its-wrong/102095):

3. **Five entries weren't live Cloud Connect modules at all.** `spaceViews` is not a module —
   it's the `spaceview` key inside a `confluenceThemes` entry's `routes` object.
   `jiraVersionTabPanels` and `jiraComponentTabPanels` are Server/DC plugin modules.
   `jiraProfileTabPanels` was deprecated in 2017 and support has since been removed from
   Cloud. `profilePages` isn't in the Confluence Cloud module reference. All five were
   scored as ⛔ blockers at 8 days each, inflating this sample by 46 days. They now report
   as ⚫ obsolete at zero effort.

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

`connectModuleAllowlist` is transcribed from `SUPPORTED_MODULES` in `@forge/manifest@13.3.0`,
recorded as `meta.forgeManifestVersion`. That's a versioned npm package, so it moves
independently of the docs — re-check it against the version you build with.

Atlassian changes these tables. `data/module-map.json` carries a `retrieved` date — re-verify
before relying on the output for a paid engagement.
