import { Transaction as SQLiteTransaction } from '@op-engineering/op-sqlite';

export const AccountRoutingService = {
  /**
   * Deposits the income amount into the specified income account.
   * Runs within the parent SQLite transaction.
   */
  async depositToAccount(tx: SQLiteTransaction, accountId: string, amountPaise: number): Promise<void> {
    // 1. Verify account exists
    const result = await tx.execute('SELECT balance_paise FROM income_accounts WHERE id = ?', [accountId]);
    
    if (!result.rows || result.rows.length === 0) {
      // Create a default account if it doesn't exist just for safety during routing
      await tx.execute(
        `INSERT INTO income_accounts (id, name, account_type, balance_paise, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [accountId, 'Default Account', 'bank', amountPaise, Date.now(), Date.now()]
      );
    } else {
      // 2. Update balance
      await tx.execute(
        `UPDATE income_accounts SET balance_paise = balance_paise + ?, updated_at = ? WHERE id = ?`,
        [amountPaise, Date.now(), accountId]
      );
    }
  }
};
