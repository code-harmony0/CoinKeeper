import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type WalletTransactionType = 'deposit' | 'withdrawal' | 'settlement' | 'refund' | 'fee' | 'penalty';
export type WalletTransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'bank_transfer' | 'upi' | 'card' | 'cash' | 'cheque';

export interface Wallet {
  id: string;
  adminId: string;
  balance: number;
  lockedBalance: number; // Funds reserved for settlements
  availableBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  currency: string;
  lastUpdated: FirebaseFirestoreTypes.Timestamp;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: WalletTransactionStatus;
  method: PaymentMethod;
  description: string;
  reference?: string; // External reference number
  transactionId?: string;

  // Bank details (for transfers)
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };

  // UPI details
  upiId?: string;
  upiTransactionId?: string;

  // Related entities
  groupId?: string;
  memberId?: string;
  drawId?: string;

  // Metadata
  initiatedBy: string;
  initiatedDate: FirebaseFirestoreTypes.Timestamp;
  completedDate?: FirebaseFirestoreTypes.Timestamp;
  failureReason?: string;
  retryCount: number;

  // Receipts
  receiptUrl?: string;
  receiptGenerated: boolean;

  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

export interface SettlementRule {
  id: string;
  name: string;
  enabled: boolean;
  type: 'auto' | 'manual' | 'scheduled';

  // Auto settlement triggers
  trigger: 'immediate' | 'daily' | 'weekly' | 'monthly' | 'balance_threshold';
  triggerTime?: string; // HH:mm format for scheduled
  balanceThreshold?: number; // For balance_threshold type

  // Settlement details
  minAmount?: number;
  maxAmount?: number;
  method: PaymentMethod;

  // Bank details (default for settlements)
  defaultBankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };

  // Execution
  lastExecuted?: FirebaseFirestoreTypes.Timestamp;
  nextExecution?: FirebaseFirestoreTypes.Timestamp;
  executionCount: number;

  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
  createdBy: string;
}

export interface WalletStats {
  currentBalance: number;
  availableBalance: number;
  lockedBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingSettlements: number;
  monthlyInflow: number;
  monthlyOutflow: number;
  transactionCount: number;
  lastTransactionDate?: FirebaseFirestoreTypes.Timestamp;
}
