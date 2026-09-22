import { DB } from '@op-engineering/op-sqlite';

/**
 * Money that leaves and comes back.
 *
 * Lending a friend ₹5,000 and being repaid is not income and not an expense —
 * counting it as either overstates both sides of the month. The same is true of
 * moving money between two accounts the user owns.
 *
 * `awaiting_return` marks money the user expects back. `settlement_of` points at
 * the row a repayment settles, so a pair can be recognised, hidden from totals,
 * and still be opened up and read later. Both nullable: an ordinary purchase is
 * neither.
 */
export const migrate019MoneyThatReturns = async (db: DB): Promise<void> => {
  await db.transaction(async tx => {
    await tx.execute('ALTER TABLE transactions ADD COLUMN awaiting_return INTEGER DEFAULT 0;');
    await tx.execute('ALTER TABLE transactions ADD COLUMN settlement_of TEXT;');
    // Finding "what is still owed to me" and "what settled this" are the two
    // questions this table will be asked constantly once the screen exists.
    await tx.execute(
      'CREATE INDEX IF NOT EXISTS idx_transactions_awaiting ON transactions (awaiting_return);',
    );
    await tx.execute(
      'CREATE INDEX IF NOT EXISTS idx_transactions_settlement ON transactions (settlement_of);',
    );
  });
};
