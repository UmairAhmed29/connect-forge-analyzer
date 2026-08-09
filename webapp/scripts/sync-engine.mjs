// Copies the analysis engine and mapping table from the repo root into webapp/lib
// so the CLI, the static build and this app all share one source of truth.
//
// On Vercel only this directory is uploaded, so ../src and ../data do not exist.
// The lib/ copies are committed for exactly that reason - if the sources are
// missing we keep the committed copies rather than failing the build.
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(here, '..', 'lib');
mkdirSync(out, { recursive: true });

const pairs = [
  [join(root, 'src', 'core.js'), join(out, 'core.js')],
  [join(root, 'data', 'module-map.json'), join(out, 'module-map.json')],
];

let copied = 0;
for (const [from, to] of pairs) {
  if (existsSync(from)) { copyFileSync(from, to); copied++; }
}

console.log(copied === pairs.length
  ? 'engine synced from repo root → webapp/lib'
  : `repo root not available (${copied}/${pairs.length}); using committed lib/ copies`);
