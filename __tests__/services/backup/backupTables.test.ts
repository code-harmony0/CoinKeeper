import { BACKUP_TABLES, EXCLUDED_TABLES } from '../../../src/services/backup/backupTables';

describe('backup table manifest', () => {
  it('includes the tables holding real user money data', () => {
    for (const t of ['transactions', 'categories', 'goals', 'bills', 'budget_settings']) {
      expect(BACKUP_TABLES).toContain(t);
    }
  });

  it('excludes regenerable caches', () => {
    for (const t of ['financial_insights_cache', 'income_health_cache']) {
      expect(BACKUP_TABLES).not.toContain(t);
      expect(EXCLUDED_TABLES).toContain(t);
    }
  });

  it('excludes legacy migration tables holding stale money data', () => {
    for (const t of ['transactions_v1_backup', 'goals_v1_backup', 'transactions_v3_backup']) {
      expect(BACKUP_TABLES).not.toContain(t);
    }
  });

  it('excludes tables nothing reads or writes', () => {
    for (const t of ['accounts', 'merchants', 'ai_memory', 'budget_history']) {
      expect(BACKUP_TABLES).not.toContain(t);
    }
  });

  it('lists no table twice', () => {
    expect(new Set(BACKUP_TABLES).size).toBe(BACKUP_TABLES.length);
  });
});
