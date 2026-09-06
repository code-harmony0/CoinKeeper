import { decideBudgetAlert, monthKeyOf } from '../../src/services/budgetAlert';

const MONTH = '2026-09';
const PLAN = 20000000; // ₹200,000 in paise

describe('decideBudgetAlert', () => {
  it('says nothing while spending is comfortably under plan', () => {
    expect(decideBudgetAlert(PLAN * 0.5, PLAN, null, MONTH)).toBeNull();
  });

  it('warns once the month is 80% spent', () => {
    const alert = decideBudgetAlert(PLAN * 0.8, PLAN, null, MONTH);
    expect(alert?.key).toBe('2026-09:80');
    expect(alert?.body).toMatch(/80%|left/i);
  });

  it('warns again when the whole plan is gone', () => {
    const alert = decideBudgetAlert(PLAN, PLAN, '2026-09:80', MONTH);
    expect(alert?.key).toBe('2026-09:100');
  });

  it('does not repeat a warning already sent this month', () => {
    expect(decideBudgetAlert(PLAN * 0.85, PLAN, '2026-09:80', MONTH)).toBeNull();
    expect(decideBudgetAlert(PLAN * 1.4, PLAN, '2026-09:100', MONTH)).toBeNull();
  });

  it('skips the 80% warning when a single purchase blows the whole plan', () => {
    // Going straight past 100% should say so, not congratulate you on 80%.
    const alert = decideBudgetAlert(PLAN * 1.2, PLAN, null, MONTH);
    expect(alert?.key).toBe('2026-09:100');
  });

  it('starts fresh in a new month', () => {
    const alert = decideBudgetAlert(PLAN * 0.9, PLAN, '2026-08:100', MONTH);
    expect(alert?.key).toBe('2026-09:80');
  });

  it('stays silent when there is no plan to overspend', () => {
    expect(decideBudgetAlert(50000, 0, null, MONTH)).toBeNull();
    expect(decideBudgetAlert(50000, -1, null, MONTH)).toBeNull();
  });

  it('reports how much is actually left, not a percentage alone', () => {
    const alert = decideBudgetAlert(PLAN * 0.8, PLAN, null, MONTH);
    // ₹40,000 of ₹200,000 remains.
    expect(alert?.body).toContain('40,000');
  });
});

describe('monthKeyOf', () => {
  it('keys by calendar month so warnings reset', () => {
    expect(monthKeyOf(new Date('2026-09-06T12:00:00'))).toBe('2026-09');
    expect(monthKeyOf(new Date('2026-10-01T00:30:00'))).toBe('2026-10');
  });
});

// --- checkBudgetAlert wiring -------------------------------------------------

const mockDisplay = jest.fn();
const mockSnapshot = jest.fn();
const mockGetPref = jest.fn(async () => null);
const mockSetPref = jest.fn(async (_key: string, _value: string) => undefined);

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: { displayNotification: (o: unknown) => mockDisplay(o) },
}));
jest.mock('../../src/services/notificationService', () => ({
  CHANNELS: { BUDGET: 'budget_alerts' },
  areNotificationsEnabled: async () => true,
}));
jest.mock('../../src/store/database', () => ({
  getPreference: () => mockGetPref(),
  setPreference: (k: string, v: string) => mockSetPref(k, v),
}));
jest.mock('../../src/services/FinancialIntelligenceEngine', () => ({
  FinancialIntelligenceEngine: { getCurrentSnapshot: () => mockSnapshot() },
}));

describe('checkBudgetAlert', () => {
  beforeEach(() => {
    mockDisplay.mockReset();
    mockGetPref.mockReset().mockResolvedValue(null);
    mockSetPref.mockReset();
  });

  it('measures total month spend, not just bucketed categories', async () => {
    // A category with no budget bucket (e.g. "Others") contributes nothing to
    // needs/wants, so using buckets meant real overspending never alerted.
    mockSnapshot.mockResolvedValue({
      safeToSpend: 2266700,
      totalExpenses: 1900000, // 84% of plan, all in an unbucketed category
      buckets: {
        needs: { currentSpend: 0 },
        wants: { currentSpend: 0 },
        savings: { currentSpend: 0 },
      },
    });

    const { checkBudgetAlert } = require('../../src/services/budgetAlert');
    await checkBudgetAlert(new Date('2026-09-06T12:00:00'));

    expect(mockDisplay).toHaveBeenCalled();
    expect(mockSetPref).toHaveBeenCalledWith('budget_alert_sent', '2026-09:80');
  });
});
