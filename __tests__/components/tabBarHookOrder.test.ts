import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const SRC = readFileSync(join(ROOT, 'src/components/shared/ExpandingTabBar.tsx'), 'utf8');

/**
 * ExpandingTabBar hides itself on nested detail screens by returning null.
 * That bail-out used to sit *above* useTabBarScroll / useSharedValue /
 * useAnimatedReaction / two useAnimatedStyle calls, so drilling from the admin
 * Groups tab into a group detail dropped the render from six hooks to one and
 * React threw "rendered fewer hooks than expected".
 *
 * The invariant: no early return may precede a hook call in this component.
 */
describe('ExpandingTabBar hook ordering', () => {
  const body = SRC.slice(
    SRC.indexOf('export const ExpandingTabBar'),
    SRC.indexOf('// Enhanced Expanding Tab'),
  );

  it('locates the component body (guards against the slice silently breaking)', () => {
    expect(body).toContain('isDetailScreen');
    expect(body).toContain('useAnimatedReaction');
  });

  it('calls every hook before the first early return', () => {
    const firstReturnNull = body.indexOf('return null');
    expect(firstReturnNull).toBeGreaterThan(-1);

    const hookCalls = [...body.matchAll(/\buse[A-Z][A-Za-z]*\s*\(/g)];
    expect(hookCalls.length).toBeGreaterThanOrEqual(5);

    const lateHooks = hookCalls
      .filter(m => (m.index ?? 0) > firstReturnNull)
      .map(m => m[0].replace(/\s*\($/, ''));

    expect(lateHooks).toEqual([]);
  });
});
