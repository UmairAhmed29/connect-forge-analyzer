// Copies the analysis engine and mapping table from the repo root into webapp/lib.
// The originals in ../src and ../data remain the single source of truth; this runs
// before dev and build so the Next app can never serve a stale copy.
import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(here, '..', 'lib');
mkdirSync(out, { recursive: true });

copyFileSync(join(root, 'src', 'core.js'), join(out, 'core.js'));
copyFileSync(join(root, 'data', 'module-map.json'), join(out, 'module-map.json'));
console.log('engine synced from repo root → webapp/lib');
