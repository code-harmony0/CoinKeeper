import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Transaction } from '../types/transaction';
import { initDatabase } from '../store/database';
import { initializeNotifications } from '../services/notificationService';
import { useTransactionStore } from '../store/transactionStore';
import { RecurringIncomeService } from '../services/income/RecurringIncomeService';

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'categoryId'> & { date?: string }) => Promise<void>;
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
  const [dbError, setDbError] = useState<Error | null>(null);
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

  const initializeApp = async () => {
    setDbError(null);
    setIsDbReady(false);
    try {
      await initDatabase();
      // Rolls any active recurring-income template forward to the current
      // month before the first load, so a salary due this month shows up
      // without the user having to open the income flow first. Failures here
      // must not block the app from opening — recurring income is additive,
      // not load-bearing for basic use.
      try {
        await RecurringIncomeService.syncRecurringIncome();
      } catch (e) {
        console.error('[TransactionsContext] syncRecurringIncome error:', e);
      }
      // Android silently drops any notification posted to a channel that was
      // never created, so the channels have to exist before anything notifies —
      // without this, bill reminders and budget alerts vanish with no error.
      //
      // Deliberately not awaited: it asks for the notification permission, and
      // a user sitting on that dialog (or never answering it) must not hold the
      // app on its splash screen. Nothing here is load-bearing for opening.
      void initializeNotifications().catch(e =>
        console.error('[TransactionsContext] initializeNotifications error:', e),
      );
      await loadTransactions();
      setIsDbReady(true);
    } catch (error: any) {
      console.error('[TransactionsContext] Init error:', error);
      setDbError(error);
    }
  };

  useEffect(() => {
    initializeApp();
  }, [loadTransactions]);

  if (dbError) {
    return (
      <View style={loadingStyles.root}>
        <Text style={[loadingStyles.logo, { fontSize: 20, marginBottom: 16, textAlign: 'center', paddingHorizontal: 32 }]}>
          Unable to unlock database
        </Text>
        <Text style={{ color: '#C2DFF7', opacity: 0.7, marginBottom: 32, textAlign: 'center', paddingHorizontal: 32 }}>
          {dbError.message?.includes('canceled') 
            ? 'Authentication was canceled. CoinKeeper needs to verify your identity to decrypt your data.'
            : dbError.message || 'An unknown error occurred'}
        </Text>
        <View style={{ backgroundColor: '#1E2536', borderRadius: 12, overflow: 'hidden' }}>
          <Text 
            style={{ color: '#C2DFF7', paddingHorizontal: 24, paddingVertical: 14, fontFamily: 'Satoshi-Bold' }}
            onPress={initializeApp}
          >
            Try Again
          </Text>
        </View>
      </View>
    );
  }

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
