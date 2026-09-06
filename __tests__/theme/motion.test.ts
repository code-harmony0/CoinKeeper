import { ReduceMotion } from 'react-native-reanimated';
import {
  EXPRESSIVE,
  INFORMATIONAL,
  HOME_SEQUENCE,
  informationalDuration,
  sequenceDelay,
} from '../../src/theme/motion';

/**
 * These assertions exist because the app once shipped with every animation
 * tagged `ReduceMotion.System`, which meant a single OS flag silently removed
 * all motion everywhere — including the gauges and counters whose movement is
 * the only thing communicating the number. That must not come back.
 */
describe('motion policy', () => {
  it('suppresses decorative motion when the system asks', () => {
    expect(EXPRESSIVE).toBe(ReduceMotion.System);
  });

  it('never lets the system flag suppress motion that carries a value', () => {
    expect(INFORMATIONAL).toBe(ReduceMotion.Never);
    expect(INFORMATIONAL).not.toBe(ReduceMotion.System);
  });

  it('shortens informational motion instead of removing it', () => {
    const full = informationalDuration(800, false);
    const reduced = informationalDuration(800, true);

    expect(full).toBe(800);
    expect(reduced).toBeLessThan(full);
    // Still visible: a value that snaps to place teaches nothing about where
    // it came from, which is the failure mode this policy exists to prevent.
    expect(reduced).toBeGreaterThan(0);
  });

  it('compresses the choreography rather than replaying it fast-forward', () => {
    expect(sequenceDelay(1000, false)).toBe(1000);
    expect(sequenceDelay(1000, true)).toBeLessThan(1000);
    expect(sequenceDelay(0, true)).toBe(0);
  });
});

describe('home entrance choreography', () => {
  it('runs outside-in so the eye finishes on the hero figure', () => {
    expect(HOME_SEQUENCE.ringOuter).toBeLessThan(HOME_SEQUENCE.ringMiddle);
    expect(HOME_SEQUENCE.ringMiddle).toBeLessThan(HOME_SEQUENCE.ringInner);
    expect(HOME_SEQUENCE.ringInner).toBeLessThan(HOME_SEQUENCE.heroCount);
  });

  it('reads top to bottom after the gauge lands', () => {
    const order = [
      HOME_SEQUENCE.heroCount,
      HOME_SEQUENCE.storyRow,
      HOME_SEQUENCE.statusLine,
      HOME_SEQUENCE.kpiPills,
      HOME_SEQUENCE.planBar,
      HOME_SEQUENCE.breakdown,
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('finishes inside the window where an app still feels responsive', () => {
    const last = Math.max(...Object.values(HOME_SEQUENCE));
    expect(last).toBeLessThanOrEqual(1500);
  });
});
