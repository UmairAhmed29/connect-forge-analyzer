// Pure analysis + rendering logic. No filesystem, no Node built-ins - so the exact
// same code runs in the CLI and inside the generated single-file web page.
// Every function takes MAP explicitly rather than importing it.

const EFFORT_BY_STATUS = { direct: 0.5, caveat: 1.5, preview: 2, redesign: 5, none: 8, unknown: 3 };
const UI_SURCHARGE = 1.5;
const BASE_OVERHEAD_DAYS = 5;
const UI_BEARING = /page|panel|macro|dialog|glance|item|gadget|field|content|header|footer|banner|menu|action|tab/i;

const AMBIGUOUS = new Set([
  'adminPages', 'generalPages', 'configurePage', 'postInstallPage',
  'dialogs', 'keyboardShortcuts', 'webItems', 'webPanels', 'webhooks',
]);

export const ICON = { direct: '🟢', caveat: '🟡', preview: '🟠', redesign: '🔴', none: '⛔', unknown: '⚪' };
export const LABEL = {
  direct: 'Direct equivalent',
  caveat: 'Equivalent with caveats',
  preview: 'Forge module in preview',
  redesign: 'Requires redesign',
  none: 'No equivalent',
  unknown: 'Unrecognised module',
};
export const ORDER = ['none', 'redesign', 'preview', 'caveat', 'unknown', 'direct'];

const toArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

function detectProducts(MAP, descriptor) {
  const modules = descriptor.modules || {};
  const keys = Object.keys(modules).filter((k) => !AMBIGUOUS.has(k));
  const products = new Set();

  if (keys.some((k) => k in MAP.jira) || keys.some((k) => /^jira/i.test(k))) products.add('jira');
  if (keys.some((k) => k in MAP.confluence) || keys.some((k) => /^confluence|macro|blueprint|spaceTools/i.test(k))) products.add('confluence');
  if (keys.some((k) => k in MAP.jiraServiceManagement) || keys.some((k) => /^serviceDesk/i.test(k))) products.add('jiraServiceManagement');

  if (products.size === 0) {
    const scopes = (descriptor.scopes || []).join(' ').toLowerCase();
    if (scopes.includes('confluence')) products.add('confluence');
    else products.add('jira');
  }
  return [...products];
}

function lookupModule(MAP, rawName, products) {
  const name = MAP.aliases[rawName] || rawName;

  for (const p of products) {
    if (MAP[p] && MAP[p][name]) return { ...MAP[p][name], product: p };
  }
  if (MAP.platform[name]) return { ...MAP.platform[name], product: 'platform' };
  for (const p of ['jira', 'confluence', 'jiraServiceManagement']) {
    if (MAP[p][name]) return { ...MAP[p][name], product: p };
  }
  if (MAP.absentFromEquivalenceTable[name]) {
    return {
      forge: null,
      status: 'none',
      note: `${MAP.absentFromEquivalenceTable[name]} (Not listed in Atlassian's published equivalence table - verify manually before committing to a scope.)`,
      product: products[0],
      unverified: true,
    };
  }
  return null;
}

function locationFinding(MAP, kind, location, products, moduleKey) {
  const table = kind === 'webItems' ? MAP.webItemLocations : MAP.webPanelLocations;
  for (const p of products) {
    if (table[p] && table[p][location]) {
      const forge = table[p][location];
      return {
        module: `${kind}[${location}]`, key: moduleKey, forge,
        status: /preview/i.test(forge) ? 'preview' : 'direct', product: p,
      };
    }
  }
  return {
    module: `${kind}[${location}]`, key: moduleKey, forge: null, status: 'none',
    note: `Location "${location}" has no documented Forge equivalent. Requires a product decision on where this UI should live in Forge, or removal.`,
    product: products[0],
  };
}

function webhookFinding(MAP, event, products, moduleKey) {
  for (const p of [...products, 'jira', 'confluence']) {
    if (MAP.webhooks[p] && MAP.webhooks[p][event]) {
      return { module: `webhooks[${event}]`, key: moduleKey, forge: MAP.webhooks[p][event], status: 'direct', product: p };
    }
  }
  return {
    module: `webhooks[${event}]`, key: moduleKey, forge: null, status: 'none',
    note: `Webhook "${event}" has no documented Forge product event. Verify against the current events reference before scoping.`,
    product: products[0],
  };
}

export function analyze(MAP, descriptor) {
  const products = detectProducts(MAP, descriptor);
  const modules = descriptor.modules || {};
  const findings = [];

  for (const [name, value] of Object.entries(modules)) {
    if (name === 'webItems' || name === 'webPanels') {
      for (const entry of toArray(value)) findings.push(locationFinding(MAP, name, entry.location || '(no location)', products, entry.key));
      continue;
    }
    if (name === 'webhooks') {
      for (const entry of toArray(value)) findings.push(webhookFinding(MAP, entry.event || '(no event)', products, entry.key));
      continue;
    }

    const hit = lookupModule(MAP, name, products);
    const entries = toArray(value);
    for (let i = 0; i < Math.max(entries.length, 1); i++) {
      const entry = entries[i] || {};
      findings.push({
        module: name,
        key: entry.key,
        forge: hit ? hit.forge : null,
        status: hit ? hit.status : 'unknown',
        note: hit ? hit.note : `"${name}" is not in the equivalence table. It may be deprecated, product-specific, or newly added - verify manually against Atlassian's docs.`,
        dataMigration: hit ? !!hit.dataMigration : false,
        product: hit ? hit.product : products[0],
      });
    }
  }

  const globalRisks = MAP.globalRisks.filter((r) => {
    if (!r.triggerKeys || r.triggerKeys.length === 0) return true;
    return r.triggerKeys.some((k) => (k === 'baseUrl' ? !!descriptor.baseUrl : k === 'lifecycle' ? !!descriptor.lifecycle : false));
  });

  let moduleDays = 0;
  for (const f of findings) {
    let d = EFFORT_BY_STATUS[f.status] ?? EFFORT_BY_STATUS.unknown;
    if (UI_BEARING.test(f.module)) d += UI_SURCHARGE;
    moduleDays += d;
    f.effortDays = Number(d.toFixed(1));
  }
  const totalDays = Math.ceil(moduleDays + BASE_OVERHEAD_DAYS);
  const summary = findings.reduce((acc, f) => ((acc[f.status] = (acc[f.status] || 0) + 1), acc), {});

  return {
    app: {
      key: descriptor.key, name: descriptor.name, baseUrl: descriptor.baseUrl,
      hasLifecycle: !!descriptor.lifecycle, scopes: descriptor.scopes || [], products,
    },
    findings, globalRisks, summary,
    blockers: findings.filter((f) => f.status === 'none' || f.status === 'redesign'),
    effort: {
      moduleDays: Number(moduleDays.toFixed(1)),
      baseOverheadDays: BASE_OVERHEAD_DAYS,
      totalDays,
      totalWeeks: Number((totalDays / 5).toFixed(1)),
    },
    meta: MAP.meta,
  };
}

// A single capability with no Forge equivalent can stop a migration outright, so
// absolute blocker count caps the score independently of the proportional maths.
function blockerCeiling(n) {
  if (n === 0) return 100;
  if (n <= 2) return 75;
  if (n <= 5) return 55;
  if (n <= 9) return 40;
  return 25;
}

export function readiness(report) {
  const { summary, findings } = report;
  const total = findings.length || 1;
  const bad = (summary.none || 0) + (summary.redesign || 0);
  const mid = (summary.preview || 0) + (summary.caveat || 0) + (summary.unknown || 0);
  const proportional = 100 - (bad / total) * 70 - (mid / total) * 25;
  const score = Math.round(Math.min(proportional, blockerCeiling(summary.none || 0)));
  if (score >= 80) return { score, verdict: 'Straightforward', note: 'Mostly direct equivalents. This is a mechanical migration.' };
  if (score >= 55) return { score, verdict: 'Moderate', note: 'Several modules need behavioural changes or depend on preview APIs.' };
  if (score >= 30) return { score, verdict: 'Difficult', note: 'Significant redesign required. Scope carefully before committing to a date.' };
  return { score, verdict: 'High risk', note: 'Core capabilities have no Forge equivalent. A product decision is needed before any engineering.' };
}

export function toMarkdown(report) {
  const { app, findings, globalRisks, summary, effort, meta } = report;
  const r = readiness(report);
  const out = [];

  out.push(`# Forge Migration Readiness Report`, '');
  out.push(`**App:** ${app.name || '(unnamed)'} \`${app.key || 'no-key'}\``);
  out.push(`**Products:** ${app.products.join(', ')}`);
  out.push(`**Modules analysed:** ${findings.length}`, '');
  out.push(`## Verdict: ${r.verdict} (${r.score}/100)`, '', r.note, '');
  out.push(`**Estimated effort: ${effort.totalDays} developer-days (~${effort.totalWeeks} ${effort.totalWeeks === 1 ? 'week' : 'weeks'})**`, '');
  out.push(`> ${effort.moduleDays} days of module work plus ${effort.baseOverheadDays} days of base overhead (manifest, auth, build pipeline, deploy, regression pass). A planning heuristic derived from module counts and documented difficulty - not a quote.`, '');

  out.push(`## Summary`, '', '| | Status | Count |', '|---|---|---|');
  for (const s of ORDER) if (summary[s]) out.push(`| ${ICON[s]} | ${LABEL[s]} | ${summary[s]} |`);
  out.push('');

  const blockers = findings.filter((f) => f.status === 'none' || f.status === 'redesign');
  if (blockers.length) {
    out.push(`## ⛔ Blockers - resolve before scoping`, '');
    for (const f of blockers) {
      out.push(`### ${f.module}${f.key ? ` \`${f.key}\`` : ''}`, '');
      out.push(`- **Forge target:** ${f.forge || '_none documented_'}`);
      if (f.note) out.push(`- **Why it matters:** ${f.note}`);
      out.push(`- **Estimated:** ${f.effortDays} days`, '');
    }
  }

  out.push(`## Module-by-module`, '', '| Connect module | Key | Forge equivalent | Status | Days |', '|---|---|---|---|---|');
  for (const f of [...findings].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))) {
    out.push(`| \`${f.module}\` | ${f.key ? `\`${f.key}\`` : '—'} | ${f.forge ? `\`${f.forge}\`` : '—'} | ${ICON[f.status]} ${LABEL[f.status]} | ${f.effortDays} |`);
  }
  out.push('');

  const noted = findings.filter((f) => f.note && f.status !== 'none' && f.status !== 'redesign');
  if (noted.length) {
    out.push(`## Behavioural differences to plan for`, '');
    for (const f of noted) out.push(`- **\`${f.module}\`** — ${f.note}`);
    out.push('');
  }

  const dm = findings.filter((f) => f.dataMigration);
  if (dm.length) {
    out.push(`## Data migration required`, '');
    out.push('These modules carry customer data. Migrating the module without migrating the data loses customer configuration:', '');
    for (const f of dm) out.push(`- \`${f.module}\` → \`${f.forge}\``);
    out.push('');
  }

  out.push(`## Platform-level risks`, '');
  for (const g of globalRisks) {
    out.push(`### ${g.severity === 'high' ? '🔴' : g.severity === 'medium' ? '🟡' : '⚪'} ${g.title}`, '', g.detail, '');
  }

  if (app.baseUrl) {
    out.push(`## Hosting`, '');
    out.push(`This app declares \`baseUrl: ${app.baseUrl}\`, so it currently runs on its own infrastructure. Two paths:`, '');
    out.push(`1. **Full Forge** — move all compute to Forge functions and delete the hosting. Eligible for the *Runs on Atlassian* badge, which enterprise buyers filter on.`);
    out.push(`2. **Forge Remote** — keep the existing backend and call it from Forge. Faster, but the remote must validate Forge Invocation Tokens instead of JWT, and you keep the hosting bill.`, '');
  }

  out.push('---', '');
  out.push(`Connect end of support: **${meta.connectEndOfSupport}**. Connect descriptor updates have been blocked since **${meta.connectUpdatesFrozenSince}** — apps still on Connect cannot ship changes.`, '');
  out.push(`Mapping data from Atlassian's Connect/Forge equivalences, retrieved ${meta.retrieved}.`);
  return out.join('\n');
}

export function toTerminal(report) {
  const r = readiness(report);
  const { app, summary, effort, findings } = report;
  const lines = ['', `  ${app.name || '(unnamed)'}  [${app.products.join(', ')}]`, `  ${'─'.repeat(52)}`];
  lines.push(`  Verdict:  ${r.verdict} (${r.score}/100)`);
  lines.push(`  Modules:  ${findings.length}`);
  lines.push(`  Effort:   ~${effort.totalDays} developer-days (~${effort.totalWeeks} ${effort.totalWeeks === 1 ? 'week' : 'weeks'})`, '');
  for (const s of ORDER) if (summary[s]) lines.push(`    ${ICON[s]} ${String(summary[s]).padStart(3)}  ${LABEL[s]}`);
  lines.push('');
  const blockers = findings.filter((f) => f.status === 'none' || f.status === 'redesign');
  if (blockers.length) {
    lines.push(`  Blockers:`);
    for (const b of blockers) lines.push(`    ⛔ ${b.module}${b.key ? ` (${b.key})` : ''}`);
    lines.push('');
  }
  return lines.join('\n');
}
