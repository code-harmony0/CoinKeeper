import { inferMonthlyDueDay, inferSchedule } from '../../src/services/spendingAnalysis';
import { suggestBills } from '../../src/services/billSuggestions';
import type { RecurringPayment } from '../../src/services/spendingAnalysis';

describe('inferMonthlyDueDay', () => {
  it('finds the day a monthly bill usually lands', () => {
    expect(inferMonthlyDueDay(['2026-05-16', '2026-06-16', '2026-07-17', '2026-08-16'])).toBe(16);
  });

  it('refuses a payment that is not monthly', () => {
    // Weekly top-ups are repetition, not a monthly bill.
    expect(inferMonthlyDueDay(['2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22'])).toBeNull();
  });

  it('needs at least three occurrences', () => {
    expect(inferMonthlyDueDay(['2026-07-16', '2026-08-16'])).toBeNull();
  });
});

const airtel: RecurringPayment = {
  payee: 'Airtel', amountPaise: 300300, times: 4, totalPaise: 1201200,
  lastSeen: '2026-08-16', dates: ['2026-05-16', '2026-06-16', '2026-07-16', '2026-08-16'],
};

describe('suggestBills', () => {
  it('turns a monthly repeating payment into a bill with its due day', () => {
    expect(suggestBills([airtel], [])).toEqual([
      { name: 'Airtel', amountPaise: 300300, dueDay: 16, intervalMonths: 1, lastSeen: '2026-08-16' },
    ]);
  });

  it('skips a payment the user already tracks as a bill', () => {
    expect(suggestBills([airtel], [{ name: 'airtel', amountPaise: 300300 }])).toEqual([]);
  });

  it('suggests a half-yearly bill too, not only monthly ones', () => {
    const wifi: RecurringPayment = {
      payee: 'Airtel Wi-Fi', amountPaise: 300300, times: 3, totalPaise: 900900,
      lastSeen: '2026-04-18', dates: ['2025-04-19', '2025-10-19', '2026-04-18'],
    };
    expect(suggestBills([wifi], [])).toEqual([
      { name: 'Airtel Wi-Fi', amountPaise: 300300, dueDay: 19, intervalMonths: 6, lastSeen: '2026-04-18' },
    ]);
  });
});

describe('inferSchedule', () => {
  it('recognises a bill that repeats every 6 months, not just monthly ones', () => {
    // CoinKeeper's own Airtel Wi-Fi advance-rental plan: paid twice a year.
    expect(inferSchedule(['2025-04-19', '2025-10-19', '2026-04-18'])).toEqual({
      intervalMonths: 6,
      dueDay: 19,
    });
  });

  it('still recognises an ordinary monthly bill', () => {
    expect(inferSchedule(['2026-05-16', '2026-06-16', '2026-07-17', '2026-08-16'])).toEqual({
      intervalMonths: 1,
      dueDay: 16,
    });
  });

  it('recognises a quarterly payment', () => {
    expect(inferSchedule(['2026-01-10', '2026-04-11', '2026-07-09'])).toEqual({
      intervalMonths: 3,
      dueDay: 10,
    });
  });

  it('recognises a yearly payment', () => {
    expect(inferSchedule(['2024-03-05', '2025-03-04', '2026-03-06'])).toEqual({
      intervalMonths: 12,
      dueDay: 5,
    });
  });

  it('refuses a weekly top-up: repetition is not always a bill', () => {
    expect(inferSchedule(['2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22'])).toBeNull();
  });

  it('needs at least three occurrences', () => {
    expect(inferSchedule(['2026-07-16', '2026-08-16'])).toBeNull();
  });
});
