import { DB } from '@op-engineering/op-sqlite';

export const migrate007IncomeIntelligence = async (db: DB): Promise<void> => {
  await db.transaction(async (tx) => {
    // 1. income_sources
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS income_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source_type TEXT NOT NULL, -- e.g., 'employer', 'client', 'dividend'
        confidence_score INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // 2. income_patterns
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS income_patterns (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        frequency TEXT NOT NULL, -- 'weekly', 'bi-weekly', 'monthly', 'random'
        variance_paise INTEGER DEFAULT 0,
        average_amount_paise INTEGER DEFAULT 0,
        last_payment_date TEXT,
        next_expected_date TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (source_id) REFERENCES income_sources(id) ON DELETE CASCADE
      );
    `);

    // 3. income_accounts
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS income_accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        account_type TEXT NOT NULL, -- 'cash', 'bank', 'wallet', 'upi', 'credit_settlement', 'investment'
        balance_paise INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // 4. income_rules
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS income_rules (
        id TEXT PRIMARY KEY,
        source_id TEXT, -- NULL means a global rule
        rule_type TEXT NOT NULL, -- 'fixed', 'percentage', 'remaining', 'priority', 'threshold_skip'
        destination_type TEXT NOT NULL, -- 'goal', 'bill', 'budget', 'safe_to_spend'
        destination_id TEXT,
        value INTEGER NOT NULL, -- percentage * 100 or fixed paise
        priority_order INTEGER DEFAULT 0,
        threshold_paise INTEGER DEFAULT 0, -- minimum income required for rule to trigger
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (source_id) REFERENCES income_sources(id) ON DELETE CASCADE
      );
    `);

    // 5. income_allocations
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS income_allocations (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        destination_type TEXT NOT NULL,
        destination_id TEXT,
        allocated_amount_paise INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (rule_id) REFERENCES income_rules(id) ON DELETE RESTRICT
      );
    `);

    // 6. income_predictions
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS income_predictions (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        predicted_date TEXT NOT NULL,
        predicted_amount_paise INTEGER NOT NULL,
        confidence_score INTEGER NOT NULL,
        prediction_reason TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (source_id) REFERENCES income_sources(id) ON DELETE CASCADE
      );
    `);

    // 7. income_forecasts
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS income_forecasts (
        id TEXT PRIMARY KEY,
        forecast_month TEXT NOT NULL, -- YYYY-MM
        total_expected_paise INTEGER NOT NULL,
        safe_to_spend_projected_paise INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // 8. income_insights_cache
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS income_insights_cache (
        id TEXT PRIMARY KEY,
        insight_type TEXT NOT NULL, -- 'salary_increased', 'salary_delayed', 'new_source'
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        is_read INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);
    
    // 9. employer_learning
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS employer_learning (
        id TEXT PRIMARY KEY,
        raw_string TEXT NOT NULL UNIQUE,
        resolved_source_id TEXT NOT NULL,
        hit_count INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (resolved_source_id) REFERENCES income_sources(id) ON DELETE CASCADE
      );
    `);

    // 10. income_health_cache
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS income_health_cache (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        overall_score INTEGER NOT NULL,
        stability_score INTEGER NOT NULL,
        diversity_score INTEGER NOT NULL,
        growth_score INTEGER NOT NULL,
        metrics_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
    
    // Indexes for fast lookups
    await tx.execute('CREATE INDEX IF NOT EXISTS idx_income_sources_type ON income_sources(source_type);');
    await tx.execute('CREATE INDEX IF NOT EXISTS idx_income_rules_source ON income_rules(source_id);');
    await tx.execute('CREATE INDEX IF NOT EXISTS idx_income_allocations_tx ON income_allocations(transaction_id);');
    await tx.execute('CREATE INDEX IF NOT EXISTS idx_income_insights_read ON income_insights_cache(is_read);');
    await tx.execute('CREATE INDEX IF NOT EXISTS idx_employer_learning_raw ON employer_learning(raw_string);');
  });
};
