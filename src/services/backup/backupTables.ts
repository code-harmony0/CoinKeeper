/**
 * Tables carried in a backup. Kept as an explicit list rather than reading
 * sqlite_master: a new table should be a deliberate decision to back up, not
 * something that silently joins because a migration created it.
 */
export const BACKUP_TABLES: readonly string[] = [
  'transactions',
  'categories',
  'goals',
  'bills',
  'budget_settings',
  'preferences',
  'recurring_income',
  'subscriptions',
  'income_sources',
  'income_patterns',
  'income_rules',
  'income_allocations',
  'income_accounts',
  'merchant_learning',
  'merchant_aliases',
  'merchant_category_map',
  'favorite_merchants',
  'recent_merchants',
  'transaction_drafts',
  'receipt_history',
  'kaza_prayers',
  'kaza_log',
  'kaza_rest_days',
];

/** Documented so a future reader knows these were considered and rejected. */
export const EXCLUDED_TABLES: readonly string[] = [
  // Regenerable from the rows above.
  'financial_insights_cache',
  'income_predictions',
  'income_forecasts',
  'income_insights_cache',
  'income_health_cache',
  // Zero reads or writes anywhere in the app. quick_templates and
  // employer_learning joined this list when the only services that touched
  // them turned out to be unreachable and were deleted.
  'quick_templates',
  'employer_learning',
  'accounts',
  'merchants',
  'ai_memory',
  'ai_conversations',
  'budget_history',
  'goal_predictions',
  'subscription_predictions',
  'cashflow_predictions',
  'financial_health',
  'prediction_history',
  // Stale copies left by migrations; restoring them would resurrect old money.
  'transactions_v1_backup',
  'personal_transactions_v1_backup',
  'goals_v1_backup',
  'transactions_v3_backup',
];

/** Columns blanked on export because they point at files outside the database. */
export const NULLED_COLUMNS: Record<string, string[]> = {
  receipt_history: ['image_uri'],
};
