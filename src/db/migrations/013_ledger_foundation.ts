import type { DB } from '@op-engineering/op-sqlite';

export const migrate013LedgerFoundation = async (db: DB): Promise<void> => {
  await db.transaction(async tx => {
    // 1. Rename goals to goals_v1_backup
    await tx.execute('ALTER TABLE goals RENAME TO goals_v1_backup;');
    
    // 2. Create goals table with paise (INTEGER) instead of REAL rupees
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        name TEXT,
        targetAmount INTEGER NOT NULL,
        currentAmount INTEGER NOT NULL,
        deadline TEXT,
        is_emergency_fund INTEGER DEFAULT 0
      );
    `);
    
    // 3. Migrate data, multiplying amounts by 100 to convert Rupees -> Paise
    const oldGoals = await tx.execute('SELECT * FROM goals_v1_backup;');
    for (const row of (oldGoals.rows ?? []) as any[]) {
      await tx.execute(`
        INSERT INTO goals (id, name, targetAmount, currentAmount, deadline, is_emergency_fund)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        row.id,
        row.name,
        Math.round((row.targetAmount || 0) * 100),
        Math.round((row.currentAmount || 0) * 100),
        row.deadline,
        row.is_emergency_fund || 0
      ]);
    }
  });
};
