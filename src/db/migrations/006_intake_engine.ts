import type { DB } from '@op-engineering/op-sqlite';

export const migrate006IntakeEngine = async (db: DB): Promise<void> => {
  await db.transaction(async tx => {
    
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS transaction_drafts (
        id TEXT PRIMARY KEY,
        amount_paise INTEGER,
        merchant_name TEXT,
        category_id TEXT REFERENCES categories(id),
        account_id TEXT,
        payment_method TEXT,
        date TEXT,
        notes TEXT,
        confidence INTEGER,
        source TEXT,
        receipt_image_uri TEXT,
        sms_id TEXT,
        prediction_reason TEXT,
        is_recurring_candidate INTEGER DEFAULT 0,
        is_duplicate INTEGER DEFAULT 0,
        draft_status TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS recent_merchants (
        id TEXT PRIMARY KEY,
        merchant_name TEXT NOT NULL,
        category_id TEXT REFERENCES categories(id),
        last_used_at INTEGER NOT NULL
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS merchant_aliases (
        id TEXT PRIMARY KEY,
        normalized_name TEXT NOT NULL,
        alias TEXT NOT NULL UNIQUE
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS prediction_history (
        id TEXT PRIMARY KEY,
        original_source TEXT,
        predicted_merchant TEXT,
        predicted_category TEXT,
        actual_merchant TEXT,
        actual_category TEXT,
        confidence INTEGER,
        created_at INTEGER NOT NULL
      );
    `);

    await tx.execute(`
      CREATE TABLE IF NOT EXISTS receipt_history (
        id TEXT PRIMARY KEY,
        image_uri TEXT NOT NULL,
        raw_text TEXT,
        extracted_merchant TEXT,
        extracted_amount_paise INTEGER,
        extracted_date TEXT,
        confidence INTEGER,
        created_at INTEGER NOT NULL
      );
    `);

  });
};
