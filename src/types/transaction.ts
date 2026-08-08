import { IncomeType } from './income';

export interface Transaction {
  id: string;
  amountPaise: number;
  type: 'income' | 'expense' | 'transfer_to_goal';
  category: string;
  categoryIcon: string;
  categoryColor?: string;
  description?: string;
  date: string;
  paymentMethod?: string;
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
