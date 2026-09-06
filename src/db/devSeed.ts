import { getDb } from './index';

const PREF_KEY = 'dev_mock_seeded';

// Day-of-month arithmetic that wraps within 1..31, so the demo looks alive
// any day of the month: overdue sits ~9 days back, a few are paid, the rest
// roll out over the coming two weeks.
const clampDay = (day: number): number => ((day - 1 + 31) % 31) + 1;

const dayThisMonth = (day: number, hour = 9): number =>
  new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    day,
    hour,
    0,
  ).getTime();

/**
 * Dev-only mock data (design rule: an empty screen is not the preview — the
 * default launch must look alive and demoable). Seeds one month of realistic
 * bills plus a salary so the Upcoming Bills screen has a hero to count up and
 * a list to swipe. Gated to __DEV__, runs exactly once (preference flag), and
 * never touches a release build.
 */
export const seedDevDataIfNeeded = async (): Promise<void> => {
  if (!__DEV__) return;

  const db = getDb();

  const seeded = await db.execute(
    'SELECT value FROM preferences WHERE key = ?;',
    [PREF_KEY],
  );
  if (seeded.rows && seeded.rows.length > 0) return;

  const today = new Date().getDate();

  const bills: Array<{
    name: string;
    amountPaise: number;
    dueDay: number;
    isRecurring: 1 | 0;
    repeatInterval: string;
    autoPayEnabled: 1 | 0;
    lastPaidAt?: number;
  }> = [
    {
      name: 'Electricity Bill',
      amountPaise: 384000,
      dueDay: clampDay(today - 9),
      isRecurring: 1,
      repeatInterval: 'Monthly',
      autoPayEnabled: 0,
    },
    {
      name: 'Flat Rent',
      amountPaise: 1400000,
      dueDay: clampDay(today),
      isRecurring: 1,
      repeatInterval: 'Monthly',
      autoPayEnabled: 0,
    },
    {
      name: 'Jio Mobile',
      amountPaise: 69900,
      dueDay: clampDay(today - 3),
      isRecurring: 1,
      repeatInterval: 'Monthly',
      autoPayEnabled: 0,
      lastPaidAt: dayThisMonth(clampDay(today - 3)),
    },
    {
      name: 'ACT Fibernet',
      amountPaise: 99900,
      dueDay: clampDay(today + 3),
      isRecurring: 1,
      repeatInterval: 'Monthly',
      autoPayEnabled: 1,
    },
    {
      name: 'Netflix',
      amountPaise: 64900,
      dueDay: clampDay(today + 6),
      isRecurring: 1,
      repeatInterval: 'Monthly',
      autoPayEnabled: 1,
    },
    {
      name: 'Spotify',
      amountPaise: 11900,
      dueDay: clampDay(today + 10),
      isRecurring: 1,
      repeatInterval: 'Monthly',
      autoPayEnabled: 0,
    },
    {
      name: 'Cult.fit Gym',
      amountPaise: 199900,
      dueDay: clampDay(today + 13),
      isRecurring: 1,
      repeatInterval: 'Monthly',
      autoPayEnabled: 0,
    },
  ];

  // Salary anchors the hero's safe-to-spend figure.
  await db.execute(
    `INSERT OR IGNORE INTO transactions
       (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash)
     VALUES (?, ?, 'income', NULL, NULL, 'Monthly Salary', ?, 'Bank Transfer', NULL, NULL);`,
    [
      `mock-salary-${new Date().getFullYear()}-${new Date().getMonth()}`,
      8500000,
      dayThisMonth(1),
    ],
  );

  for (const b of bills) {
    const id = `mock-${b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await db.execute(
      `INSERT OR IGNORE INTO bills
         (id, name, amount_paise, category_id, due_day, is_recurring, repeat_interval, reminder_days_before, notes, color, icon, auto_pay_enabled, last_paid_at, notification_id)
       VALUES (?, ?, ?, NULL, ?, ?, ?, 3, NULL, NULL, NULL, ?, ?, NULL);`,
      [
        id,
        b.name,
        b.amountPaise,
        b.dueDay,
        b.isRecurring,
        b.repeatInterval,
        b.autoPayEnabled,
        b.lastPaidAt ?? null,
      ],
    );
  }

  await seedGoals(db);

  await db.execute(
    'INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?);',
    [PREF_KEY, '1'],
  );
  console.log('[devSeed] Mock data seeded — bills:', bills.length);
};

const daysAgo = (n: number): number => Date.now() - n * 24 * 60 * 60 * 1000;

/**
 * Four goals chosen to exercise all four states the cards render, so the
 * screen demos its whole surface rather than four copies of "healthy":
 * a funded emergency fund on the accent, a trip behind its deadline (amber),
 * a laptop that has gone quiet (amber), and a bike at ₹0 that shows the
 * dashed zero-state slot and its invitation copy.
 *
 * Contributions go in as real `transfer_to_goal` rows linked by `goal_id`,
 * not just a `currentAmount` — that column is what goalIntelligence reads to
 * compute velocity, ETA and stall, so a seeded balance with no ledger behind
 * it would show every goal as stalled and make the demo lie.
 */
const seedGoals = async (db: ReturnType<typeof getDb>): Promise<void> => {
  const inTwoMonths = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const goals: Array<{
    id: string;
    name: string;
    targetPaise: number;
    deadline: string | null;
    isEmergencyFund: 0 | 1;
    contributions: Array<{ amountPaise: number; daysAgo: number }>;
  }> = [
    {
      id: 'mock-goal-emergency',
      name: 'Emergency Fund',
      targetPaise: 5000000, // ₹50,000
      deadline: null,
      isEmergencyFund: 1,
      contributions: [
        { amountPaise: 500000, daysAgo: 74 },
        { amountPaise: 250000, daysAgo: 45 },
        { amountPaise: 250000, daysAgo: 18 },
        { amountPaise: 132400, daysAgo: 4 },
      ], // ₹11,324 total
    },
    {
      id: 'mock-goal-goa',
      name: 'Goa Trip',
      targetPaise: 1500000, // ₹15,000
      deadline: inTwoMonths,
      isEmergencyFund: 0,
      contributions: [
        { amountPaise: 400000, daysAgo: 52 },
        { amountPaise: 261300, daysAgo: 26 },
        { amountPaise: 44400, daysAgo: 9 },
      ], // ₹7,057 total — well under the ~₹4k/month the deadline needs
    },
    {
      id: 'mock-goal-laptop',
      name: 'New Laptop',
      targetPaise: 7500000, // ₹75,000
      deadline: null,
      isEmergencyFund: 0,
      contributions: [
        { amountPaise: 1000000, daysAgo: 120 },
        { amountPaise: 500000, daysAgo: 63 },
      ], // ₹15,000, nothing in 63 days → stalled
    },
    {
      id: 'mock-goal-bike',
      name: 'New Bike',
      targetPaise: 12000000, // ₹1,20,000
      deadline: null,
      isEmergencyFund: 0,
      contributions: [], // ₹0 → dashed zero state
    },
  ];

  for (const g of goals) {
    const currentPaise = g.contributions.reduce((sum, c) => sum + c.amountPaise, 0);

    await db.execute(
      `INSERT OR IGNORE INTO goals (id, name, targetAmount, currentAmount, deadline, is_emergency_fund)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [g.id, g.name, g.targetPaise, currentPaise, g.deadline, g.isEmergencyFund],
    );

    for (const [index, c] of g.contributions.entries()) {
      await db.execute(
        `INSERT OR IGNORE INTO transactions
           (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash, goal_id)
         VALUES (?, ?, 'transfer_to_goal', NULL, NULL, ?, ?, 'Transfer', NULL, NULL, ?);`,
        [
          `${g.id}-tx-${index}`,
          c.amountPaise,
          `Transfer to ${g.name}`,
          daysAgo(c.daysAgo),
          g.id,
        ],
      );
    }
  }
};
