import React from 'react';
import { act, render } from '@testing-library/react-native';
import {
  PaceRing,
  dayElapsed,
  ringTones,
  todayUsedRatio,
} from '../../../src/components/insights/PaceRing';
import { enamel } from '../../../src/theme/specTheme';

const base = {
  safeTodayPaise: 53600,
  todaySpendPaise: 0,
  spendPaise: 21000,
  planPaise: 1200000,
  incomePaise: 1500000,
  now: new Date(2026, 5, 15, 9, 30),
};

describe('PaceRing', () => {
  it('settles on the safe-to-spend-today figure as the centre number', () => {
    jest.useFakeTimers();
    const { getByText } = render(<PaceRing {...base} />);
    // The hero counts up from zero, starting at its slot in the entrance
    // sequence. With no frame loop here, CountUp's guaranteed settle is what
    // must land the real figure on screen — so advance past delay + duration.
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(getByText('₹536')).toBeTruthy();
    jest.useRealTimers();
  });

  it('labels what the centre number means', () => {
    const { getByText } = render(<PaceRing {...base} />);
    expect(getByText('Safe to spend today')).toBeTruthy();
  });

  /**
   * The dial draws what is left and the centre prints what is left; the other
   * half of the same sentence — what today has already cost — is the one fact
   * the mark itself cannot show, so it sits in the dial's foot.
   */
  it('states the day’s spend in the dial’s foot', () => {
    const { getByText } = render(
      <PaceRing {...base} todaySpendPaise={12000} />,
    );
    expect(getByText('₹120 spent today')).toBeTruthy();
  });

  it('prompts for income instead of showing ₹0 when there is no plan', () => {
    const { getByText, queryByText } = render(
      <PaceRing {...base} planPaise={0} safeTodayPaise={0} />,
    );
    expect(getByText('Add income to set a plan')).toBeTruthy();
    expect(queryByText('₹0')).toBeNull();
  });

  it('describes the dial to a screen reader', () => {
    const { getByLabelText } = render(<PaceRing {...base} />);
    // The dial is geometry; the label is the only way this reaches TalkBack.
    expect(
      getByLabelText(/safe to spend for the rest of today.*spent today/i),
    ).toBeTruthy();
  });
});

/**
 * The gauge is one mark saying one thing, so its colour ladder is about the
 * day and nothing else. `danger` stays reserved for the allowance actually
 * being gone — a gauge that reddens before anything is wrong teaches the
 * reader to ignore red.
 */
describe('ringTones', () => {
  it('stays green while most of the day’s allowance is intact', () => {
    expect(ringTones(0).today).toBe(enamel.success);
    expect(ringTones(0.4).today).toBe(enamel.success);
  });

  it('ambers past 60% of the allowance spent', () => {
    expect(ringTones(0.6).today).toBe(enamel.warning);
    expect(ringTones(0.99).today).toBe(enamel.warning);
  });

  it('reddens only once the allowance is gone', () => {
    expect(ringTones(1).today).toBe(enamel.danger);
    expect(ringTones(1.4).today).toBe(enamel.danger);
  });

  it('reads today’s allowance as fully spent when there is none left', () => {
    expect(todayUsedRatio(0, 5000)).toBe(1);
    expect(todayUsedRatio(0, 0)).toBe(0);
    expect(todayUsedRatio(10000, 9100)).toBeCloseTo(0.91);
  });
});

/** The hour scale — how much of the day is gone, drawn beside the money. */
describe('dayElapsed', () => {
  it('reads midnight as the start of the scale', () => {
    expect(dayElapsed(new Date(2026, 5, 15, 0, 0))).toBe(0);
  });

  it('reads midday as half the dial', () => {
    expect(dayElapsed(new Date(2026, 5, 15, 12, 0))).toBeCloseTo(0.5);
  });

  it('never reaches a full turn', () => {
    expect(dayElapsed(new Date(2026, 5, 15, 23, 59))).toBeLessThan(1);
  });
});
