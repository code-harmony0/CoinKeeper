import { getDb } from '../store/database';
import { resolveCategoryId } from '../store/transactionStore';
import { financialEventBus } from './EventBus';

const generateTxId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export interface LedgerTransaction {
  amountPaise: number;
  type: 'income' | 'expense';
  categoryName: string;
  categoryIcon?: string;
  description?: string;
  date: string; // ISO String
  paymentMethod?: string;
}

export const FinancialLedgerService = {
  /**
   * Adds a generic transaction (Income or Expense) to the ledger.
   */
  async addTransaction(tx: LedgerTransaction): Promise<string> {
    const id = generateTxId();
    const db = getDb();
    const categoryId = await resolveCategoryId(db as any, tx.categoryName, tx.categoryIcon);

    await db.execute(
      `INSERT INTO transactions
        (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL);`,
      [
        id,
        tx.amountPaise,
        tx.type,
        categoryId,
        tx.description ?? null,
        new Date(tx.date).getTime(),
        tx.paymentMethod ?? null,
      ],
    );

    financialEventBus.emit();
    return id;
  },

  /**
   * Deletes a transaction from the ledger.
   */
  async deleteTransaction(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM transactions WHERE id = ?;', [id]);
    financialEventBus.emit();
  },

  /**
   * Pays a bill. Updates the bill row AND inserts a corresponding expense transaction.
   */
  async payBill(billId: string, timestamp: number): Promise<void> {
    const db = getDb();
    const isUnpaying = timestamp === 0;
    const newTransactionId = isUnpaying ? undefined : generateTxId();

    await db.transaction(async (sqlTx: any) => {
      const billRow = await sqlTx.execute('SELECT * FROM bills WHERE id = ?;', [billId]);
      const bill = billRow.rows?.[0] as any;
      if (!bill) throw new Error('Bill not found');

      if (isUnpaying) {
        if (bill.last_paid_transaction_id) {
          await sqlTx.execute('DELETE FROM transactions WHERE id = ?;', [bill.last_paid_transaction_id]);
        }
        await sqlTx.execute(
          'UPDATE bills SET last_paid_at = ?, last_paid_transaction_id = NULL WHERE id = ?;',
          [timestamp, billId],
        );
      } else {
        const categoryId = bill.category_id || (await resolveCategoryId(sqlTx, bill.name, 'receipt'));
        await sqlTx.execute(
          `INSERT INTO transactions
             (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash)
           VALUES (?, ?, 'expense', ?, NULL, ?, ?, NULL, NULL, NULL)`,
          [newTransactionId, bill.amount_paise, categoryId, bill.name, timestamp],
        );
        await sqlTx.execute(
          'UPDATE bills SET last_paid_at = ?, last_paid_transaction_id = ? WHERE id = ?;',
          [timestamp, newTransactionId, billId],
        );
      }
    });

    financialEventBus.emit();
  },

  /**
   * Funds a goal. Updates the goal currentAmount AND inserts a transfer transaction
   * categorised as a Saving, so it counts correctly in the Money Plan.
   */
  async fundGoal(goalId: string, amountPaise: number): Promise<void> {
    const db = getDb();
    const newTxId = generateTxId();

    await db.transaction(async (sqlTx: any) => {
      const goalRow = await sqlTx.execute('SELECT * FROM goals WHERE id = ?;', [goalId]);
      const goal = goalRow.rows?.[0] as any;
      if (!goal) throw new Error('Goal not found');

      // 1. Update the Goal
      const newAmount = goal.currentAmount + amountPaise;
      await sqlTx.execute('UPDATE goals SET currentAmount = ? WHERE id = ?;', [newAmount, goalId]);

      // 2. Insert the Ledger Expense (Transfer)
      // Force it to a "Savings" category name so the budget_bucket matcher assigns it to savings.
      const categoryId = await resolveCategoryId(sqlTx, 'Savings Transfer', 'bank-transfer');
      await sqlTx.execute(
        `INSERT INTO transactions
           (id, amount_paise, type, category_id, account_id, description, occurred_at, payment_method, upi_ref, sms_hash, goal_id)
         VALUES (?, ?, 'transfer_to_goal', ?, NULL, ?, ?, 'Transfer', NULL, NULL, ?)`,
        [newTxId, amountPaise, categoryId, `Transfer to ${goal.name}`, Date.now(), goalId],
      );
    });

    financialEventBus.emit();
  }
};
