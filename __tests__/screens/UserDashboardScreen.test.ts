import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * The lite bundle excludes src/modules/chitfund via Metro's blockList. Any
 * *static* import of that tree from a screen the lite build renders will fail
 * the bundle, so the dashboard must reach chit-fund code only through a
 * flag-guarded require() that dead-code elimination can remove.
 */
describe('UserDashboardScreen module graph', () => {
  const source = read('src/screens/user/UserDashboardScreen.tsx');

  it('has no static import of chit fund code', () => {
    const staticImports = source
      .split('\n')
      .filter((l: string) => /^\s*import\s/.test(l))
      .join('\n');

    expect(staticImports).not.toMatch(/useChitFunds/);
    expect(staticImports).not.toMatch(/types\/chitFund/);
    expect(staticImports).not.toMatch(/modules\/chitfund/);
  });

  it('guards the chits section behind the compile-time flag', () => {
    expect(source).toMatch(/CHITFUND_ENABLED/);
    expect(source).toMatch(/require\(.*modules\/chitfund.*\)/);
  });

  it('keeps the extracted section inside the blocked tree', () => {
    const section = read('src/modules/chitfund/components/DashboardChitsSection.tsx');
    expect(section).toMatch(/useChitFunds/);
  });
});
