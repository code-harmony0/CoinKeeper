import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Transaction } from '../types/transaction';

// Mock initial data
const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    amount: 350,
    type: 'expense',
    category: 'Food',
    categoryIcon: 'food',
    description: 'Lunch at restaurant',
    date: new Date().toISOString(),
    paymentMethod: 'UPI',
  },
  {
    id: '2',
    amount: 5000,
    type: 'income',
    category: 'Salary',
    categoryIcon: 'cash',
    description: 'Monthly salary',
    date: new Date().toISOString(),
  },
  {
    id: '3',
    amount: 120,
    type: 'expense',
    category: 'Transport',
    categoryIcon: 'car',
    description: 'Uber ride',
    date: new Date().toISOString(),
    paymentMethod: 'Card',
  },
];

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  loading: boolean;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(
  undefined,
);

export const TransactionsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [loading] = useState(false);

  const addTransaction = (newTx: Omit<Transaction, 'id' | 'date'>) => {
    const transaction: Transaction = {
      ...newTx,
      id: Math.random().toString(36).substring(2, 11),
      date: new Date().toISOString(),
    };
    setTransactions(prev => [transaction, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t)),
    );
  };

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        addTransaction,
        deleteTransaction,
        updateTransaction,
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
