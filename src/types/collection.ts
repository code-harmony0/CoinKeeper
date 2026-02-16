import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type PaymentStatus = 'scheduled' | 'reminded' | 'paid' | 'overdue' | 'failed';
export type ReminderChannel = 'sms' | 'email' | 'push' | 'whatsapp';
export interface UpcomingPayment {
  id: string;
  groupId: string;
  groupName: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  amount: number;
  dueDate: FirebaseFirestoreTypes.Timestamp;
  status: PaymentStatus;
  referenceId?: string;
  screenshotUrl?: string;
  reminderSent: boolean;
  reminderSentDate?: FirebaseFirestoreTypes.Timestamp;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

export interface OverduePayment extends UpcomingPayment {
  daysOverdue: number;
  penaltyAmount: number;
  penaltyApplied: boolean;
  lastReminderDate?: FirebaseFirestoreTypes.Timestamp;
  reminderCount: number;
}

export interface PaymentHistory {
  id: string;
  paymentId: string;
  groupId: string;
  memberId: string;
  memberName: string;
  amount: number;
  paidDate: FirebaseFirestoreTypes.Timestamp;
  dueDate: FirebaseFirestoreTypes.Timestamp;
  method: 'cash' | 'bank_transfer' | 'upi' | 'card';
  transactionId?: string;
  referenceId?: string;
  screenshotUrl?: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  notes?: string;
  receiptUrl?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

export interface ReminderAutomation {
  id: string;
  groupId?: string; // Optional: if null, applies globally
  type: 'pre_due' | 'on_due' | 'post_due' | 'overdue';
  triggerDays: number; // Days before/after due date
  enabled: boolean;
  message: string;
  channels: ReminderChannel[];
  sendTime: string; // HH:mm format
  lastSent?: FirebaseFirestoreTypes.Timestamp;
  sentCount: number;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

export interface CollectionStats {
  totalUpcoming: number;
  totalOverdue: number;
  totalCollected: number;
  totalPending: number;
  overdueAmount: number;
  collectionRate: number;
  pendingConfirmations: number;
  averageDelayDays: number;
}
