#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { analyze, toMarkdown, toTerminal } from './core.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAP = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'module-map.json'), 'utf8'));

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
const outIdx = args.indexOf('--out');
const outFile = outIdx > -1 ? args[outIdx + 1] : null;

if (positional.length === 0 || flags.has('--help')) {
  console.log(`
  Connect → Forge migration analyzer

  Usage:
    cfa <descriptor.json | url>   analyze a Connect descriptor
    cfa <src> --markdown          print the full markdown report
    cfa <src> --out report.md     write the markdown report to a file
    cfa <src> --json              print raw analysis as JSON

  Example:
    cfa https://example.com/atlassian-connect.json --out report.md
`);
  process.exit(positional.length === 0 ? 1 : 0);
}

async function load(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch descriptor: HTTP ${res.status}`);
    return res.json();
  }
  return JSON.parse(readFileSync(src, 'utf8'));
}

try {
  const report = analyze(MAP, await load(positional[0]));

  if (flags.has('--json')) console.log(JSON.stringify(report, null, 2));
  else if (flags.has('--markdown') && !outFile) console.log(toMarkdown(report));
  else console.log(toTerminal(report));

  if (outFile) {
    writeFileSync(outFile, toMarkdown(report));
    console.log(`  Report written to ${outFile}\n`);
  }
} catch (err) {
  console.error(`\n  Error: ${err.message}\n`);
  process.exit(1);
}
