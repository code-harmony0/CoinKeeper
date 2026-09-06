import { buildWeeklyStory } from '../../src/services/weeklyStory';
import type { Transaction } from '../../src/types/transaction';

const NOW = new Date('2026-08-13T12:00:00.000Z');

/** Days before NOW, as an ISO string. */
const ago = (days: number): string =>
  new Date(NOW.getTime() - days * 86400000).toISOString();

let seq = 0;
const spend = (rupees: number, days: number, category = 'Food'): Transaction => ({
  id: `t${seq++}`,
  amountPaise: rupees * 100,
  type: 'expense',
  category,
  categoryId: 'c1',
  categoryIcon: 'utensils',
  date: ago(days),
});

describe('buildWeeklyStory', () => {
  it('leads with what the week cost', () => {
    const story = buildWeeklyStory([spend(400, 1), spend(600, 3)], NOW);
    expect(story?.headline).toBe('You spent ₹1,000 this week.');
    expect(story?.spendPaise).toBe(100000);
  });

  it('says nothing at all when the week is empty', () => {
    expect(buildWeeklyStory([spend(400, 20)], NOW)).toBeNull();
    expect(buildWeeklyStory([], NOW)).toBeNull();
  });

  it('counts only the last seven days', () => {
    const story = buildWeeklyStory([spend(400, 2), spend(9999, 9)], NOW);
    expect(story?.spendPaise).toBe(40000);
  });

  describe('week-on-week comparison', () => {
    it('reports a real drop as good news', () => {
      const story = buildWeeklyStory(
        [spend(400, 2), spend(1000, 9), spend(1000, 10)],
        NOW,
      );
      expect(story?.comparison).toBe('₹1,600 less than the week before.');
      expect(story?.tone).toBe('good');
    });

    it('reports a real rise as direction, not blame', () => {
      const story = buildWeeklyStory([spend(2000, 2), spend(500, 9)], NOW);
      expect(story?.comparison).toBe('₹1,500 more than the week before.');
      expect(story?.tone).toBe('warn');
    });

    it('treats small drift as no change', () => {
      const story = buildWeeklyStory([spend(1030, 2), spend(1000, 9)], NOW);
      expect(story?.comparison).toBe('About the same as the week before.');
      expect(story?.tone).toBe('neutral');
    });

    it('does not compare against a week with nothing recorded', () => {
      // Eight days into using the app, the prior week is absent data — not a
      // week of zero spending to dramatise a rise against.
      const story = buildWeeklyStory([spend(2000, 2)], NOW);
      expect(story?.comparison).toBeNull();
      expect(story?.tone).toBe('neutral');
    });
  });

  describe('observation', () => {
    it('calls out a category that actually dominates', () => {
      const story = buildWeeklyStory(
        [spend(800, 1, 'Food'), spend(200, 2, 'Transport')],
        NOW,
      );
      expect(story?.observation).toBe('Food was 80% of it — ₹800.');
    });

    it('stays quiet when spending is spread evenly', () => {
      const story = buildWeeklyStory(
        [
          spend(300, 1, 'Food'),
          spend(300, 2, 'Transport'),
          spend(300, 3, 'Shopping'),
          spend(300, 4, 'Bills'),
        ],
        NOW,
      );
      expect(story?.observation).toBeNull();
    });
  });

  it('ignores income and goal transfers', () => {
    const mixed: Transaction[] = [
      spend(400, 1),
      { ...spend(9999, 1), type: 'income' },
      { ...spend(9999, 1), type: 'transfer_to_goal' },
    ];
    expect(buildWeeklyStory(mixed, NOW)?.spendPaise).toBe(40000);
  });
});
