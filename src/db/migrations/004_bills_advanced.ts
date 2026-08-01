import type { DB } from '@op-engineering/op-sqlite';

export const migrate004BillsAdvanced = async (db: DB): Promise<void> => {
  // Add new columns if they don't exist
  // With op-sqlite, we can just catch errors if column exists or use PRAGMA table_info
  const result = await db.execute("PRAGMA table_info('bills');");
  const existingColumns = (result.rows || []).map((col: any) => col.name);

  const columnsToAdd = [
    { name: 'repeat_interval', type: 'TEXT' },
    { name: 'reminder_days_before', type: 'INTEGER' },
    { name: 'notes', type: 'TEXT' },
    { name: 'color', type: 'TEXT' },
    { name: 'icon', type: 'TEXT' },
    { name: 'auto_pay_enabled', type: 'INTEGER DEFAULT 0' }
  ];

  for (const col of columnsToAdd) {
    if (!existingColumns.includes(col.name)) {
      try {
        await db.execute(`ALTER TABLE bills ADD COLUMN ${col.name} ${col.type};`);
      } catch (e) {
        console.warn(`Failed to add column ${col.name}`, e);
      }
    }
  }
};
