import { IncomeType } from './income';

export interface Transaction {
  id: string;
  amountPaise: number;
  type: 'income' | 'expense' | 'transfer_to_goal';
  category: string;
  categoryId: string;
  categoryIcon: string;
  categoryColor?: string;
  description?: string;
  date: string;
  paymentMethod?: string;
  /** Which bank the SMS came from. Absent for manual and CSV entries. */
  bankId?: string;
  /** Inbox message id an SMS import came from, so a rescan skips it. Write-only. */
  smsId?: string;
  /** Money the user expects back — lent out, or moved to their own account. */
  awaitingReturn?: boolean;
  /** The transaction this one repays. Set on the incoming half of a settled pair. */
  settlementOf?: string;
  incomeType?: IncomeType;
  incomeSourceId?: string;
}

/**
 * Contribution type for receipt generation
 * Extended from group Contribution with receipt-specific fields
 */
export type ContributionStatus = 'paid' | 'pending' | 'overdue' | 'failed' | 'approved' | 'refunded';

export interface Contribution {
  id: string;
  groupId: string;
  groupName?: string;
  memberId: string;
  memberName: string;
  userName?: string;
  userId?: string;
  amount: number;
  dueDate?: any;
  paidDate?: any;
  paidAt?: any;
  approvedAt?: any;
  approvedBy?: string;
  createdAt?: any;
  updatedAt?: any;
  refundedAt?: any;
  status: ContributionStatus;
  cycleNumber?: number;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}
