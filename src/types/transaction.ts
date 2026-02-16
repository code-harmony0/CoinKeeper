export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryIcon: string;
  description?: string;
  date: string;
  paymentMethod?: string;
}

/**
 * Contribution type for receipt generation
 * Extended from group Contribution with receipt-specific fields
 */
export interface Contribution {
  id: string;
  groupId: string;
  groupName?: string;
  memberId: string;
  memberName: string;
  userName?: string;
  amount: number;
  dueDate?: any;
  paidDate?: any;
  paidAt?: any;
  status: 'paid' | 'pending' | 'overdue' | 'failed';
  cycleNumber?: number;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}
