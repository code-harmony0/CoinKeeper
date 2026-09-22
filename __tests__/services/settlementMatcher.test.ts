import { findReturn, type Settleable } from '../../src/services/settlementMatcher';

const DAY = 24 * 60 * 60 * 1000;
const base = new Date('2026-06-01T10:00:00Z').getTime();

const tx = (id: string, amountPaise: number, counterparty: string, daysFromBase: number): Settleable => ({
  id,
  amountPaise,
  counterparty,
  occurredAt: base + daysFromBase * DAY,
});

describe('findReturn', () => {
  it('settles a loan repaid in full by the same person', () => {
    const lent = tx('out1', 500000, 'RAVI KUMAR', 0);
    const back = tx('in1', 500000, 'RAVI KUMAR', 21);

    expect(findReturn(lent, [back])).toMatchObject({ incomingId: 'in1', verdict: 'settled' });
  });

  it('settles despite the bank truncating the name on one side', () => {
    const lent = tx('out1', 350000, 'MOHAMMAD SAAD MOHAMMAD YUNUS S', 0);
    const back = tx('in1', 350000, 'MOHAMMAD SAAD', 9);

    expect(findReturn(lent, [back])?.verdict).toBe('settled');
  });

  it('only asks when the amount matches but the name does not', () => {
    // Straight from the user's real inbox: ₹70 out to a person, ₹70 in from a
    // bank months later. Hiding that pair would hide real spending.
    const lent = tx('out1', 7000, 'RATAN LAL SO B', 0);
    const back = tx('in1', 7000, 'HDFC BANK A', 60);

    expect(findReturn(lent, [back])).toMatchObject({ incomingId: 'in1', verdict: 'ask' });
  });

  it('ignores a same-amount return that arrives long after', () => {
    const lent = tx('out1', 7000, 'RATAN LAL SO B', 0);
    const back = tx('in1', 7000, 'RATAN LAL SO B', 114);

    expect(findReturn(lent, [back])).toBeNull();
  });

  it('asks about a part repayment from the same person', () => {
    const lent = tx('out1', 500000, 'RAVI KUMAR', 0);
    const back = tx('in1', 200000, 'RAVI KUMAR', 12);

    expect(findReturn(lent, [back])).toMatchObject({ verdict: 'ask' });
  });

  it('never matches money that arrived before it was sent', () => {
    const lent = tx('out1', 500000, 'RAVI KUMAR', 10);
    const earlier = tx('in1', 500000, 'RAVI KUMAR', 2);

    expect(findReturn(lent, [earlier])).toBeNull();
  });

  it('takes the earliest return when several could fit', () => {
    const lent = tx('out1', 500000, 'RAVI KUMAR', 0);
    const later = tx('in2', 500000, 'RAVI KUMAR', 40);
    const sooner = tx('in1', 500000, 'RAVI KUMAR', 5);

    expect(findReturn(lent, [later, sooner])?.incomingId).toBe('in1');
  });
});
