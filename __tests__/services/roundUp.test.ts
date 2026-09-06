import {
  ROUND_TO_PAISE,
  roundUpPaise,
  roundUpNote,
  annualisedPaise,
  pickRoundUpGoal,
} from '../../src/services/roundUp';

describe('roundUpPaise', () => {
  it('rounds a ₹47 chai up to ₹50', () => {
    expect(roundUpPaise(4700)).toBe(300);
  });

  it('earmarks nothing when the amount already lands on the step', () => {
    expect(roundUpPaise(5000)).toBe(0);
    expect(roundUpPaise(ROUND_TO_PAISE)).toBe(0);
  });

  it('handles amounts under the step', () => {
    expect(roundUpPaise(100)).toBe(900);
  });

  it('never earmarks more than the step', () => {
    for (const amount of [1, 999, 1001, 45678, 999999]) {
      expect(roundUpPaise(amount)).toBeLessThan(ROUND_TO_PAISE);
    }
  });

  it('is a no-op on zero and negative amounts', () => {
    expect(roundUpPaise(0)).toBe(0);
    expect(roundUpPaise(-500)).toBe(0);
  });

  it('respects a custom step', () => {
    expect(roundUpPaise(4700, 10000)).toBe(5300);
  });
});

describe('roundUpNote', () => {
  it('names the merchant so the row is legible later', () => {
    expect(roundUpNote('Swiggy')).toBe('Round-up from Swiggy');
  });

  it('falls back when there is no merchant', () => {
    expect(roundUpNote()).toBe('Round-up');
    expect(roundUpNote('   ')).toBe('Round-up');
  });
});

describe('annualisedPaise', () => {
  it('illustrates a year of the habit', () => {
    expect(annualisedPaise(300)).toBe(109500); // ₹3/day -> ₹1,095
  });
});

describe('pickRoundUpGoal', () => {
  const holiday = { id: 'g1', name: 'Goa', isEmergencyFund: false };
  const safety = { id: 'g2', name: 'Safety Net', isEmergencyFund: true };

  it('always prefers the emergency fund, wherever it sits in the list', () => {
    expect(pickRoundUpGoal([holiday, safety])?.id).toBe('g2');
    expect(pickRoundUpGoal([safety, holiday])?.id).toBe('g2');
  });

  it('falls back to the first goal when there is no emergency fund', () => {
    expect(pickRoundUpGoal([holiday])?.id).toBe('g1');
  });

  it('has nowhere to put the change when there are no goals', () => {
    expect(pickRoundUpGoal([])).toBeNull();
  });
});
