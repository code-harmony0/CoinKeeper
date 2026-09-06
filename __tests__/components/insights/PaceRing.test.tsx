import React from 'react';
import { act, render } from '@testing-library/react-native';
import {
  PaceRing,
  RingLegend,
  ringTones,
  todayUsedRatio,
} from '../../../src/components/insights/PaceRing';
import { computePace } from '../../../src/services/budgetPacing';
import { enamel, specLight } from '../../../src/theme/specTheme';

const base = {
  safeTodayPaise: 53600,
  todaySpendPaise: 0,
  spendPaise: 21000,
  planPaise: 1200000,
  incomePaise: 1500000,
  now: new Date(2026, 5, 15),
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

  it('prompts for income instead of showing ₹0 when there is no plan', () => {
    const { getByText, queryByText } = render(
      <PaceRing {...base} planPaise={0} safeTodayPaise={0} />,
    );
    expect(getByText('Add income to set a plan')).toBeTruthy();
    expect(queryByText('₹0')).toBeNull();
  });

  it('describes all three rings to a screen reader', () => {
    const { getByLabelText } = render(<PaceRing {...base} />);
    // The rings are geometry; the label is the only way this reaches TalkBack.
    expect(
      getByLabelText(/safe to spend today.*Under pace.*80% of income/i),
    ).toBeTruthy();
  });
});

/**
 * A multi-series chart without a key is decoration. These assertions exist
 * because the gauge shipped once with three unlabelled arcs and the ring
 * semantics living only in DESIGN.md, where the person reading the gauge
 * could not see them.
 */
describe('RingLegend', () => {
  it('names every ring the gauge draws', () => {
    const { getByText } = render(<RingLegend {...base} />);
    expect(getByText('Today')).toBeTruthy();
    expect(getByText('This month')).toBeTruthy();
    expect(getByText('Plan size')).toBeTruthy();
  });

  it('gives each ring its own number rather than a colour alone', () => {
    const { getByText } = render(<RingLegend {...base} />);
    expect(getByText('₹0 of ₹536 used')).toBeTruthy();
    expect(getByText('2% of plan spent')).toBeTruthy();
    expect(getByText('80% of income')).toBeTruthy();
  });

  it('says nothing at all when there is no plan to explain', () => {
    const { queryByText } = render(<RingLegend {...base} planPaise={0} />);
    expect(queryByText('Today')).toBeNull();
  });
});

/**
 * A legend that disagrees with the ring it explains is worse than no legend:
 * it is confidently wrong. The gauge and the key derive their colours from
 * this one function precisely so they cannot drift apart, and these cases pin
 * the ladder itself.
 */
describe('ringTones', () => {
  const MID_MONTH = new Date(2026, 5, 15); // day 15 of 30

  it('greens the month ring when spending is under pace', () => {
    // 10% spent at the halfway mark is well under an even draw-down.
    const pace = computePace(120000, 1200000, MID_MONTH);
    expect(pace?.status).toBe('ahead');
    expect(ringTones(0, pace?.status).month).toBe(enamel.success);
  });

  it('ambers the month ring only when spending outruns the plan', () => {
    const pace = computePace(900000, 1200000, MID_MONTH);
    expect(pace?.status).toBe('fast');
    expect(ringTones(0, pace?.status).month).toBe(enamel.warning);
  });

  it('keeps "on pace" neutral rather than claiming a win', () => {
    const pace = computePace(600000, 1200000, MID_MONTH);
    expect(pace?.status).toBe('on');
    expect(ringTones(0, pace?.status).month).toBe(specLight.sky);
  });

  it('never lets today’s state leak into the month ring', () => {
    // Today blown at 91%, month still comfortably ahead: the rings must
    // disagree, because they are measuring different spans.
    const pace = computePace(120000, 1200000, MID_MONTH);
    const tones = ringTones(0.91, pace?.status);
    expect(tones.today).toBe(enamel.warning);
    expect(tones.month).toBe(enamel.success);
  });

  it('reads today’s allowance as fully spent when there is none left', () => {
    expect(todayUsedRatio(0, 5000)).toBe(1);
    expect(todayUsedRatio(0, 0)).toBe(0);
    expect(todayUsedRatio(10000, 9100)).toBeCloseTo(0.91);
  });
});
