import type { DB } from '@op-engineering/op-sqlite';

export const migrate005Ecosystem = async (db: DB): Promise<void> => {
  await db.transaction(async tx => {
    // 1. Merchant Learning & Categorization
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS merchant_learning (
        id TEXT PRIMARY KEY,
        merchant_name TEXT NOT NULL,
        category_id TEXT REFERENCES categories(id),
        confidence INTEGER DEFAULT 0,
        is_user_verified INTEGER DEFAULT 0,
        updated_at INTEGER NOT NULL
      );
    `);

    // 2. AI Intelligence Tables
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS ai_memory (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        last_updated INTEGER NOT NULL
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS financial_insights_cache (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        action_route TEXT,
        action_params TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);

    // 3. Predictions & History
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS budget_history (
        id TEXT PRIMARY KEY,
        month TEXT NOT NULL, -- e.g., '2026-08'
        category_id TEXT REFERENCES categories(id),
        spent_amount_paise INTEGER NOT NULL,
        budget_limit_paise INTEGER NOT NULL
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS goal_predictions (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        predicted_completion_date INTEGER NOT NULL,
        confidence_score INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS subscription_predictions (
        id TEXT PRIMARY KEY,
        merchant_name TEXT NOT NULL,
        predicted_amount_paise INTEGER NOT NULL,
        predicted_cycle TEXT NOT NULL,
        confidence_score INTEGER NOT NULL,
        is_dismissed INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS cashflow_predictions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        predicted_balance_paise INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS financial_health (
        id TEXT PRIMARY KEY,
        score INTEGER NOT NULL,
        factors TEXT NOT NULL, -- JSON string of contributing factors
        calculated_at INTEGER NOT NULL
      );
    `);

    // 4. Quick Entry Helpers
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS quick_templates (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        amount_paise INTEGER,
        category_id TEXT REFERENCES categories(id),
        merchant_name TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS favorite_merchants (
        id TEXT PRIMARY KEY,
        merchant_name TEXT NOT NULL,
        category_id TEXT REFERENCES categories(id),
        use_count INTEGER DEFAULT 1,
        last_used_at INTEGER NOT NULL
      );
    `);
  });
};
