import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type PaymentConfirmationStatus = 'pending' | 'confirmed' | 'rejected' | 'overdue' | 'disputed';
export type PaymentMethod = 'upi' | 'bank' | 'cash';

export interface PaymentConfirmation {
  id: string;
  groupId: string;
  groupName: string;
  memberId: string;
  memberName: string;
  cycleNumber: number;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceId?: string;
  screenshotUrl?: string;
  status: PaymentConfirmationStatus;
  confirmedBy?: string;
  confirmedByName?: string;
  confirmedAt?: FirebaseFirestoreTypes.Timestamp;
  disputeReason?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

export interface PaymentConfirmationStats {
  totalPending: number;
  totalConfirmed: number;
  totalRejected: number;
  totalDisputed: number;
  totalOverdue: number;
  pendingAmount: number;
  confirmedAmount: number;
  overdueAmount: number;
  confirmationRate: number;
}
