import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import auth from '@react-native-firebase/auth';
import { Transaction } from '../types/transaction';
import { transactionService } from '../services/transactionService';

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  refreshTransactions: () => Promise<void>;
  loading: boolean;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(
  undefined,
);

export const TransactionsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time Firestore listener
  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = transactionService.onTransactionsSnapshot(
      txs => {
        setTransactions(txs);
        setLoading(false);
      },
      error => {
        console.error('[TransactionsContext] Listener error:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const addTransaction = useCallback(
    async (newTx: Omit<Transaction, 'id' | 'date'>) => {
      try {
        await transactionService.addTransaction(newTx);
        // onSnapshot will automatically update the list
      } catch (error) {
        console.error('[TransactionsContext] Add error:', error);
      }
    },
    [],
  );

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      await transactionService.deleteTransaction(id);
    } catch (error) {
      console.error('[TransactionsContext] Delete error:', error);
    }
  }, []);

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      try {
        await transactionService.updateTransaction(id, updates);
      } catch (error) {
        console.error('[TransactionsContext] Update error:', error);
      }
    },
    [],
  );

  const refreshTransactions = useCallback(async () => {
    // onSnapshot handles real-time — this is a no-op but keeps the API stable
    setLoading(true);
    setTimeout(() => setLoading(false), 300);
  }, []);

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        refreshTransactions,
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
