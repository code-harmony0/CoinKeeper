import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { Transaction } from '../types/transaction';
import { initDatabase } from '../store/database';
import { useTransactionStore } from '../store/transactionStore';

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  refreshTransactions: () => Promise<void>;
  loading: boolean;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(
  undefined,
);

export const TransactionsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const transactions = useTransactionStore(state => state.transactions);
  const loading = useTransactionStore(state => state.loading);
  const loadTransactions = useTransactionStore(
    state => state.loadTransactions,
  );
  const addTransaction = useTransactionStore(state => state.addTransaction);
  const deleteTransaction = useTransactionStore(
    state => state.deleteTransaction,
  );
  const updateTransaction = useTransactionStore(
    state => state.updateTransaction,
  );

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await loadTransactions();
      } catch (error) {
        console.error('[TransactionsContext] Init error:', error);
      }
    })();
  }, [loadTransactions]);

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        refreshTransactions: loadTransactions,
        loading,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactionsContext = (): TransactionsContextType => {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error(
      'useTransactionsContext must be used within a TransactionsProvider',
    );
  }
  return context;
};
