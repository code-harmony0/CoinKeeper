import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Transaction } from '../types/transaction';
import { initDatabase } from '../store/database';
import { useTransactionStore } from '../store/transactionStore';

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'> & { date?: string }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  refreshTransactions: () => Promise<void>;
  loading: boolean;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(
  undefined,
);

const DbLoadingScreen: React.FC = () => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  return (
    <View style={loadingStyles.root}>
      <Animated.Text style={[loadingStyles.logo, { opacity: pulse }]}>
        CoinKeeper
      </Animated.Text>
    </View>
  );
};

const loadingStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121723',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 28,
    color: '#C2DFF7',
    letterSpacing: 0.5,
  },
});

export const TransactionsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isDbReady, setIsDbReady] = useState(false);
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
      } finally {
        setIsDbReady(true);
      }
    })();
  }, [loadTransactions]);

  if (!isDbReady) {
    return <DbLoadingScreen />;
  }

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
