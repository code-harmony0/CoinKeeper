import { daysToFinish, estimateMissedDays } from '../../src/services/kazaPlan';

describe('estimateMissedDays', () => {
  it('counts every day between bulugh and regular prayer', () => {
    expect(estimateMissedDays({ pubertyAge: 15, prayingSinceAge: 17 })).toBe(730);
  });

  it('subtracts excused cycle days', () => {
    // 2 years * 12 months * 7 days = 168 excused
    expect(estimateMissedDays({ pubertyAge: 15, prayingSinceAge: 17, cycleDaysPerMonth: 7 })).toBe(562);
  });

  it('also subtracts postpartum days', () => {
    // 730 - 168 (cycle) - 40 (one postpartum period)
    expect(
      estimateMissedDays({ pubertyAge: 15, prayingSinceAge: 17, cycleDaysPerMonth: 7, postpartumDays: 40 }),
    ).toBe(522);
  });

  it('never goes negative', () => {
    expect(estimateMissedDays({ pubertyAge: 18, prayingSinceAge: 15 })).toBe(0);
  });
});

describe('daysToFinish', () => {
  it('rounds up', () => expect(daysToFinish(11, 5)).toBe(3));
  it('is null without a goal', () => expect(daysToFinish(11, 0)).toBeNull());
});
