/**
 * The published package points `types` at "dist/src/index", which does not
 * exist — the real declarations sit at "dist/index.d.ts", so TypeScript
 * resolves nothing. Declaring the one function we use is more robust than
 * depending on their metadata being fixed upstream.
 */
declare module 'transaction-sms-parser' {
  export type TTransactionType = 'debit' | 'credit' | null;

  export interface ITransaction {
    type: TTransactionType;
    amount: string | null;
    referenceNo: string | null;
    merchant: string | null;
  }

  export interface ITransactionInfo {
    account: { type: string | null; number: string | null; name: string | null };
    balance: { available: string | null; outstanding: string | null } | null;
    transaction: ITransaction;
  }

  export function getTransactionInfo(message: string): ITransactionInfo;
}
