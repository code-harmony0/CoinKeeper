import { detectSubscriptions } from '../../src/services/subscriptionDetector';
import { getDb } from '../../src/store/database';

jest.mock('../../src/store/database', () => ({
  getDb: jest.fn(),
}));

describe('subscriptionDetector', () => {
  let mockExecute: jest.Mock;

  beforeEach(() => {
    mockExecute = jest.fn();
    (getDb as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });
    jest.useFakeTimers().setSystemTime(new Date('2026-07-31T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('detects a monthly subscription based on 30-day interval', async () => {
    const nowMs = new Date('2026-07-31T12:00:00Z').getTime();
    
    mockExecute.mockImplementation((query) => {
      if (query.includes('GROUP BY description, amount_paise')) {
        return Promise.resolve({
          rows: [{ merchant: 'Netflix', amount_paise: 19900, frequencyCount: 2, lastDate: nowMs }]
        });
      }
      if (query.includes('ORDER BY occurred_at DESC')) {
        // Two hits: today, and 30 days ago
        return Promise.resolve({
          rows: [{ occurred_at: nowMs }, { occurred_at: nowMs - (30 * 24 * 60 * 60 * 1000) }]
        });
      }
      if (query.includes('SELECT id FROM subscriptions')) {
        return Promise.resolve({ rows: [] }); // not existing yet
      }
      if (query.includes('INSERT INTO subscriptions')) {
        return Promise.resolve({});
      }
      return Promise.resolve({ rows: [] });
    });

    const subs = await detectSubscriptions();
    
    expect(subs.length).toBe(1);
    expect(subs[0]).toEqual(expect.objectContaining({
      merchant: 'Netflix',
      amountPaise: 19900,
      intervalDays: 30
    }));

    // Should have checked if it exists and then inserted
    expect(mockExecute).toHaveBeenCalledWith(
      'SELECT id FROM subscriptions WHERE name = ? AND amount_paise = ?',
      ['Netflix', 19900] // 19900 paise = 199 INR
    );
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO subscriptions'),
      expect.arrayContaining(['Netflix', 19900, 'monthly'])
    );
  });

  it('ignores transactions with less than 2 occurrences', async () => {
    mockExecute.mockImplementation((query) => {
      if (query.includes('GROUP BY description, amount_paise')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const subs = await detectSubscriptions();
    expect(subs.length).toBe(0);
  });
});
