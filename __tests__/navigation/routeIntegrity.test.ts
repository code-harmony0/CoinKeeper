import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = join(__dirname, '..', '..');
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

const files = walk('src').map(rel => ({ rel, src: readFileSync(join(ROOT, rel), 'utf8') }));

/**
 * Route names registered anywhere in the app: JSX <Stack.Screen name="X"> /
 * <Tab.Screen name="X">, plus the chitFundRoutes manifest entries. Whitespace
 * is collapsed first so multi-line <Stack.Screen> declarations still match.
 */
const registered = new Set<string>();
for (const { src } of files) {
  const flat = src.replace(/\s+/g, ' ');
  for (const m of flat.matchAll(/<(?:Stack|Tab)\.Screen[^>]*?name="([A-Za-z0-9_]+)"/g)) {
    registered.add(m[1]);
  }
  for (const m of flat.matchAll(/name:\s*'([A-Za-z0-9_]+)',\s*component/g)) {
    registered.add(m[1]);
  }
}

/**
 * A navigate() call naming a route that was never registered is a dead button:
 * React Navigation warns and does nothing, so the user taps and stays put. The
 * sign-up and password-reset screens shipped this way — fully built, never
 * added to chitFundRoutes, so LoginForm's two links went nowhere.
 */
describe('navigation route integrity', () => {
  it('finds the registered routes (guards against the regex silently breaking)', () => {
    expect(registered.size).toBeGreaterThan(20);
    expect(registered).toContain('UserTabs');
    expect(registered).toContain('Login');
  });

  it('resolves every literal navigate() target to a registered route', () => {
    const dangling: string[] = [];

    for (const { rel, src } of files) {
      for (const m of src.matchAll(/navigate\(\s*['"]([A-Za-z0-9_]+)['"]/g)) {
        const target = m[1];
        if (registered.has(target)) continue;
        const line = src.slice(0, m.index).split('\n').length;
        dangling.push(`${rel}:${line} -> navigate('${target}')`);
      }
    }

    expect(dangling).toEqual([]);
  });

  it('registers the auth screens LoginForm links to', () => {
    expect(registered).toContain('Register');
    expect(registered).toContain('ForgotPassword');
  });
});
