import {
  nextDueDate,
  daysUntilDue,
  isPaidForCycle,
  billStatus,
  urgentBills,
  upcomingBills,
  billsSummary,
} from '../../src/services/billSchedule';
import type { Bill } from '../../src/store/billStore';

const bill = (name: string, dueDay: number, lastPaidAt?: number): Bill => ({
  id: name,
  name,
  amountPaise: 800000,
  dueDay,
  isRecurring: true,
  lastPaidAt,
});

describe('nextDueDate', () => {
  it('clamps a 31st-of-the-month bill to the last day of a short month', () => {
    // April has 30 days. A bill due on the 31st must land on the 30th, not
    // disappear — it used to be invisible in every 30-day month.
    const due = nextDueDate(31, new Date(2026, 3, 1));
    expect(due.getMonth()).toBe(3);
    expect(due.getDate()).toBe(30);
  });

  it('keeps today as the due date when the bill is due today', () => {
    const due = nextDueDate(15, new Date(2026, 5, 15, 18));
    expect(due.getDate()).toBe(15);
    expect(due.getMonth()).toBe(5);
  });

  it('rolls into next month once the day has passed', () => {
    const due = nextDueDate(3, new Date(2026, 5, 20));
    expect(due.getMonth()).toBe(6);
    expect(due.getDate()).toBe(3);
  });
});

describe('daysUntilDue — the month-end blind spot', () => {
  /**
   * The regression this file exists for. "Due soon" was `dueDay >= today &&
   * dueDay <= today + 2`, so on the 30th the window was 30–32 and a bill due
   * on the 1st — two days away — was never flagged. The warning vanished
   * exactly when rent was about to land.
   */
  it('sees next month’s 1st as tomorrow from the last day of the month', () => {
    // April has 30 days, so the 30th is the last day and the 1st is tomorrow.
    // The old integer comparison could not express this at all: its window was
    // `30..32`, which never contains 1.
    expect(daysUntilDue(1, new Date(2026, 3, 30))).toBe(1);
  });

  it('sees next month’s 2nd as two days away from the last day', () => {
    expect(daysUntilDue(2, new Date(2026, 3, 30))).toBe(2);
  });

  it('reports 0 for a bill due today', () => {
    expect(daysUntilDue(9, new Date(2026, 7, 9, 23))).toBe(0);
  });
});

describe('isPaidForCycle', () => {
  it('counts a payment made on the due date', () => {
    const now = new Date(2026, 7, 20);
    const paidOn = new Date(2026, 7, 5).getTime();
    expect(isPaidForCycle(bill('Rent', 5, paidOn), now)).toBe(true);
  });

  it('does not count last cycle’s payment', () => {
    const now = new Date(2026, 7, 20);
    const paidOn = new Date(2026, 6, 5).getTime(); // previous month
    expect(isPaidForCycle(bill('Rent', 5, paidOn), now)).toBe(false);
  });

  it('treats an early payment as settling the cycle it belongs to', () => {
    // Paying on the 31st for a bill due on the 5th settles NEXT cycle, and so
    // must not mark the current one paid. "Paid this calendar month" got this
    // backwards.
    const now = new Date(2026, 7, 31);
    const paidOn = new Date(2026, 7, 31).getTime();
    expect(isPaidForCycle(bill('Rent', 5, paidOn), now)).toBe(true);
  });

  it('is never paid without a payment on record', () => {
    expect(isPaidForCycle(bill('Rent', 5), new Date(2026, 7, 20))).toBe(false);
  });
});

describe('billStatus', () => {
  const now = new Date(2026, 7, 10); // 10 Aug 2026

  it('marks an unpaid bill whose day has passed as overdue', () => {
    expect(billStatus(bill('Rent', 5), now)).toBe('overdue');
  });

  it('marks a bill due within two days as due-soon', () => {
    expect(billStatus(bill('Phone', 12), now)).toBe('due-soon');
    expect(billStatus(bill('Today', 10), now)).toBe('due-soon');
  });

  it('marks anything further out as upcoming', () => {
    expect(billStatus(bill('Card', 25), now)).toBe('upcoming');
  });

  it('marks a settled bill as paid regardless of its day', () => {
    const paid = new Date(2026, 7, 5).getTime();
    expect(billStatus(bill('Rent', 5, paid), now)).toBe('paid');
  });

  it('keeps a 31st bill visible in a 30-day month', () => {
    // It used to be neither overdue nor due — it simply disappeared.
    const status = billStatus(bill('Rent', 31), new Date(2026, 3, 29));
    expect(status).toBe('due-soon');
  });
});

describe('urgentBills', () => {
  it('lists overdue and due-soon together, soonest first', () => {
    const now = new Date(2026, 7, 10);
    const result = urgentBills(
      [bill('Later', 25), bill('Overdue', 5), bill('Soon', 11)],
      now,
    );
    expect(result.map(b => b.name)).toEqual(['Soon', 'Overdue']);
  });

  it('leaves out anything already paid', () => {
    const now = new Date(2026, 7, 10);
    const paid = new Date(2026, 7, 5).getTime();
    expect(urgentBills([bill('Rent', 5, paid)], now)).toEqual([]);
  });
});

describe('upcomingBills', () => {
  it('sorts by how soon and drops anything past the window', () => {
    const due = upcomingBills(
      [bill('Far', 14, undefined), bill('Soon', 17, undefined)],
      new Date(2026, 5, 15),
      7,
    );
    expect(due.map(d => d.name)).toEqual(['Soon']);
  });
});

describe('billsSummary — the three-second answer', () => {
  const now = new Date(2026, 7, 12); // 12 Aug 2026

  it('totals only what is still owed, ignoring paid bills', () => {
    const paidOn = new Date(2026, 7, 9).getTime();
    const s = billsSummary(
      [bill('Rent', 12), bill('Jio', 9, paidOn)],
      now,
    );
    expect(s.unpaidPaise).toBe(800000);
    expect(s.paidPaise).toBe(800000);
  });

  it('goes danger when anything is overdue', () => {
    const s = billsSummary([bill('Power', 3)], now);
    expect(s.tone).toBe('bad');
    expect(s.headline).toMatch(/overdue/);
  });

  it('goes warning when something is due today but nothing is late', () => {
    const s = billsSummary([bill('Rent', 12)], now);
    expect(s.tone).toBe('warn');
    expect(s.headline).toMatch(/due today/);
  });

  it('goes good when nothing is late or due today', () => {
    const s = billsSummary([bill('Card', 25)], now);
    expect(s.tone).toBe('good');
  });

  it('says so plainly when everything is settled', () => {
    const paidOn = new Date(2026, 7, 12).getTime();
    const s = billsSummary([bill('Rent', 12, paidOn)], now);
    expect(s.unpaidPaise).toBe(0);
    expect(s.headline).toBe('Every bill is paid. Nothing owing.');
  });

  it('never claims anything about an account with no bills', () => {
    expect(billsSummary([], now).headline).toBe('No bills tracked yet.');
  });
});
