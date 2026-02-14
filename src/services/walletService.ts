import firestore from '@react-native-firebase/firestore';
import type {
  Wallet,
  WalletTransaction,
  SettlementRule,
  WalletStats,
} from '../types/wallet';

const COLLECTIONS = {
  WALLETS: 'wallets',
  WALLET_TRANSACTIONS: 'wallet_transactions',
  SETTLEMENT_RULES: 'settlement_rules',
};

export const walletService = {
  // ==================== WALLET MANAGEMENT ====================

  getWalletBalance: async (adminId: string): Promise<Wallet | null> => {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.WALLETS)
        .where('adminId', '==', adminId)
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Wallet;
    } catch (error) {
      console.error('[walletService] Error fetching wallet balance:', error);
      throw new Error('Failed to fetch wallet balance');
    }
  },

  createWallet: async (adminId: string): Promise<Wallet> => {
    try {
      const ref = firestore().collection(COLLECTIONS.WALLETS).doc();

      const walletData: Omit<Wallet, 'id'> = {
        adminId,
        balance: 0,
        lockedBalance: 0,
        availableBalance: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        currency: 'INR',
        lastUpdated: firestore.FieldValue.serverTimestamp() as any,
        createdAt: firestore.FieldValue.serverTimestamp() as any,
      };

      await ref.set(walletData);
      const snapshot = await ref.get();
      return { id: snapshot.id, ...snapshot.data() } as Wallet;
    } catch (error) {
      console.error('[walletService] Error creating wallet:', error);
      throw new Error('Failed to create wallet');
    }
  },

  addFunds: async (
    walletId: string,
    amount: number,
    method: string,
    description: string,
    adminId: string
  ): Promise<WalletTransaction> => {
    try {
      const batch = firestore().batch();

      // Get current wallet
      const walletRef = firestore().collection(COLLECTIONS.WALLETS).doc(walletId);
      const walletSnap = await walletRef.get();
      if (!walletSnap.exists) throw new Error('Wallet not found');
      const wallet = walletSnap.data() as Wallet;

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + amount;

      // Create transaction record
      const transactionRef = firestore().collection(COLLECTIONS.WALLET_TRANSACTIONS).doc();
      const transactionData: Omit<WalletTransaction, 'id'> = {
        walletId,
        type: 'deposit',
        amount,
        balanceBefore,
        balanceAfter,
        status: 'completed',
        method: method as any,
        description,
        initiatedBy: adminId,
        initiatedDate: firestore.FieldValue.serverTimestamp() as any,
        completedDate: firestore.FieldValue.serverTimestamp() as any,
        retryCount: 0,
        receiptGenerated: false,
        createdAt: firestore.FieldValue.serverTimestamp() as any,
        updatedAt: firestore.FieldValue.serverTimestamp() as any,
      };
      batch.set(transactionRef, transactionData);

      // Update wallet balance
      batch.update(walletRef, {
        balance: balanceAfter,
        availableBalance: balanceAfter - wallet.lockedBalance,
        totalDeposits: firestore.FieldValue.increment(amount),
        lastUpdated: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      const transactionSnapshot = await transactionRef.get();
      return { id: transactionSnapshot.id, ...transactionSnapshot.data() } as WalletTransaction;
    } catch (error) {
      console.error('[walletService] Error adding funds:', error);
      throw new Error('Failed to add funds');
    }
  },

  withdrawFunds: async (
    walletId: string,
    amount: number,
    method: string,
    description: string,
    adminId: string
  ): Promise<WalletTransaction> => {
    try {
      // Get current wallet
      const walletSnap = await firestore().collection(COLLECTIONS.WALLETS).doc(walletId).get();
      if (!walletSnap.exists) throw new Error('Wallet not found');
      const wallet = walletSnap.data() as Wallet;

      // Check sufficient funds
      if (wallet.availableBalance < amount) {
        throw new Error('Insufficient available balance');
      }

      const batch = firestore().batch();
      const walletRef = firestore().collection(COLLECTIONS.WALLETS).doc(walletId);

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - amount;

      // Create transaction record
      const transactionRef = firestore().collection(COLLECTIONS.WALLET_TRANSACTIONS).doc();
      const transactionData: Omit<WalletTransaction, 'id'> = {
        walletId,
        type: 'withdrawal',
        amount,
        balanceBefore,
        balanceAfter,
        status: 'completed',
        method: method as any,
        description,
        initiatedBy: adminId,
        initiatedDate: firestore.FieldValue.serverTimestamp() as any,
        completedDate: firestore.FieldValue.serverTimestamp() as any,
        retryCount: 0,
        receiptGenerated: false,
        createdAt: firestore.FieldValue.serverTimestamp() as any,
        updatedAt: firestore.FieldValue.serverTimestamp() as any,
      };
      batch.set(transactionRef, transactionData);

      // Update wallet balance
      batch.update(walletRef, {
        balance: balanceAfter,
        availableBalance: balanceAfter - wallet.lockedBalance,
        totalWithdrawals: firestore.FieldValue.increment(amount),
        lastUpdated: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      const transactionSnapshot = await transactionRef.get();
      return { id: transactionSnapshot.id, ...transactionSnapshot.data() } as WalletTransaction;
    } catch (error) {
      console.error('[walletService] Error withdrawing funds:', error);
      throw new Error('Failed to withdraw funds');
    }
  },

  // ==================== TRANSACTION HISTORY ====================

  getTransactionHistory: async (walletId: string, limit = 50): Promise<WalletTransaction[]> => {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.WALLET_TRANSACTIONS)
        .where('walletId', '==', walletId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WalletTransaction[];
    } catch (error) {
      console.error('[walletService] Error fetching transaction history:', error);
      throw new Error('Failed to fetch transaction history');
    }
  },

  // ==================== REAL-TIME LISTENERS ====================

  onWalletSnapshot: (
    adminId: string,
    callback: (wallet: Wallet | null) => void,
    onError?: (error: Error) => void
  ) => {
    try {
      return firestore()
        .collection(COLLECTIONS.WALLETS)
        .where('adminId', '==', adminId)
        .limit(1)
        .onSnapshot(
          snapshot => {
            if (snapshot.empty) {
              callback(null);
              return;
            }
            const doc = snapshot.docs[0];
            callback({ id: doc.id, ...doc.data() } as Wallet);
          },
          error => {
            console.error('[walletService] Snapshot error:', error);
            onError?.(error);
          }
        );
    } catch (error) {
      console.error('[walletService] Error setting up listener:', error);
      throw new Error('Failed to set up listener');
    }
  },

  onTransactionsSnapshot: (
    walletId: string,
    callback: (transactions: WalletTransaction[]) => void,
    onError?: (error: Error) => void
  ) => {
    try {
      return firestore()
        .collection(COLLECTIONS.WALLET_TRANSACTIONS)
        .where('walletId', '==', walletId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot(
          snapshot => {
            const transactions = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) as WalletTransaction[];
            callback(transactions);
          },
          error => {
            console.error('[walletService] Transactions snapshot error:', error);
            onError?.(error);
          }
        );
    } catch (error) {
      console.error('[walletService] Error setting up transactions listener:', error);
      throw new Error('Failed to set up transactions listener');
    }
  },

  // ==================== SETTLEMENT RULES ====================

  createSettlementRule: async (
    ruleData: Omit<SettlementRule, 'id' | 'createdAt' | 'updatedAt'>,
    adminId: string
  ): Promise<SettlementRule> => {
    try {
      const ref = firestore().collection(COLLECTIONS.SETTLEMENT_RULES).doc();

      const rule: Omit<SettlementRule, 'id'> = {
        ...ruleData,
        executionCount: 0,
        createdAt: firestore.FieldValue.serverTimestamp() as any,
        updatedAt: firestore.FieldValue.serverTimestamp() as any,
        createdBy: adminId,
      };

      await ref.set(rule);
      const snapshot = await ref.get();
      return { id: snapshot.id, ...snapshot.data() } as SettlementRule;
    } catch (error) {
      console.error('[walletService] Error creating settlement rule:', error);
      throw new Error('Failed to create settlement rule');
    }
  },

  getSettlementRules: async (): Promise<SettlementRule[]> => {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.SETTLEMENT_RULES)
        .where('enabled', '==', true)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SettlementRule[];
    } catch (error) {
      console.error('[walletService] Error fetching settlement rules:', error);
      throw new Error('Failed to fetch settlement rules');
    }
  },

  // ==================== STATS ====================

  getWalletStats: async (walletId: string): Promise<WalletStats> => {
    try {
      const [walletSnap, transactionsSnap] = await Promise.all([
        firestore().collection(COLLECTIONS.WALLETS).doc(walletId).get(),
        firestore()
          .collection(COLLECTIONS.WALLET_TRANSACTIONS)
          .where('walletId', '==', walletId)
          .get(),
      ]);

      if (!walletSnap.exists) throw new Error('Wallet not found');
      const wallet = walletSnap.data() as Wallet;
      const transactions = transactionsSnap.docs.map(doc => doc.data()) as WalletTransaction[];

      // Calculate monthly inflow/outflow (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentTransactions = transactions.filter(t => {
        const createdAt = t.createdAt as any;
        return createdAt && createdAt.toDate() > thirtyDaysAgo;
      });

      const monthlyInflow = recentTransactions
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyOutflow = recentTransactions
        .filter(t => t.type === 'withdrawal')
        .reduce((sum, t) => sum + t.amount, 0);

      // Count pending settlements
      const pendingSettlements = transactions.filter(
        t => t.type === 'settlement' && t.status === 'pending'
      ).length;

      // Last transaction date
      const sortedTransactions = transactions.sort((a, b) => {
        const aDate = (a.createdAt as any)?.toDate() || new Date(0);
        const bDate = (b.createdAt as any)?.toDate() || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });

      const lastTransactionDate = sortedTransactions[0]?.createdAt;

      return {
        currentBalance: wallet.balance,
        availableBalance: wallet.availableBalance,
        lockedBalance: wallet.lockedBalance,
        totalDeposits: wallet.totalDeposits,
        totalWithdrawals: wallet.totalWithdrawals,
        pendingSettlements,
        monthlyInflow,
        monthlyOutflow,
        transactionCount: transactions.length,
        lastTransactionDate,
      };
    } catch (error) {
      console.error('[walletService] Error fetching wallet stats:', error);
      throw new Error('Failed to fetch wallet stats');
    }
  },
};
