import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, extname } from 'path';

const ROOT = join(__dirname, '..', '..');
const MODULE_DIR = 'src/modules/chitfund';
const EXTS = ['.ts', '.tsx'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (EXTS.includes(extname(name))) out.push(rel);
  }
  return out;
}

/**
 * The lite bundle drops src/modules/chitfund via Metro's blockList. A single
 * *static* import into that tree from outside pulls the whole module back into
 * the lite bundle and breaks the build. Guarded require() is the only legal
 * route in, because CHITFUND_ENABLED is inlined at build time and the branch
 * is eliminated.
 */
describe('chitfund module boundary', () => {
  const outsideFiles = [
    ...walk('src').filter(f => !f.startsWith(MODULE_DIR)),
    'App.tsx',
  ].filter(f => {
    try { return statSync(join(ROOT, f)).isFile(); } catch { return false; }
  });

  it('has no static import of the chitfund module from outside it', () => {
    const offenders: string[] = [];

    for (const file of outsideFiles) {
      const src = readFileSync(join(ROOT, file), 'utf8');
      for (const line of src.split('\n')) {
        // Both forms pull the target into the module graph at transform time.
        if (!/^\s*(import|export)\s[^=]*\bfrom\b/.test(line) && !/^\s*import\s+['"]/.test(line)) {
          continue;
        }
        const m = line.match(/from\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/);
        if (!m) continue;
        m[1] = m[1] || m[2];

        const spec = m[1];
        if (!spec.startsWith('.')) continue;

        const resolved = relative(ROOT, join(ROOT, file, '..', spec));
        if (resolved.startsWith(MODULE_DIR)) {
          offenders.push(`${file} -> ${spec}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  /**
   * The guard must read process.env in the same file as the require. Babel
   * cannot fold a constant imported from another module, so a
   * `CHITFUND_ENABLED ? require(...)` guard leaves the require in the graph and
   * the bundle fails to resolve it under the blockList.
   */
  it('guards every chitfund require with an in-file process.env check', () => {
    const offenders: string[] = [];

    for (const file of outsideFiles) {
      const src = readFileSync(join(ROOT, file), 'utf8');
      const requires = src.match(/^.*require\(\s*['"][^'"]*modules\/chitfund[^'"]*['"]/gm) || [];
      if (requires.length === 0) continue;

      if (!/process\.env\.CK_CHITFUND/.test(src)) {
        offenders.push(`${file} requires chitfund without an in-file env guard`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
