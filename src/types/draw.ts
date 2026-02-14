import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type DrawStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DrawMethod = 'lottery' | 'auction' | 'fixed_order';

export interface Draw {
  id: string;
  groupId: string;
  groupName: string;
  drawNumber: number;
  scheduledDate: FirebaseFirestoreTypes.Timestamp;
  completedDate?: FirebaseFirestoreTypes.Timestamp;
  status: DrawStatus;
  method: DrawMethod;
  totalPrizeAmount: number;
  participantIds: string[];
  participantCount: number;
  winnerId?: string;
  winnerName?: string;
  winningBid?: number;
  minBidAmount?: number;
  maxBidAmount?: number;
  bidsReceived: number;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
  createdBy: string;
}

export interface DrawBid {
  id: string;
  drawId: string;
  groupId: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  bidAmount: number;
  timestamp: FirebaseFirestoreTypes.Timestamp;
  status: 'pending' | 'accepted' | 'rejected' | 'won' | 'lost';
  rank?: number; // Ranking among all bids
  validationStatus: 'valid' | 'invalid';
  invalidReason?: string;
}

export interface DrawWinner {
  id: string;
  drawId: string;
  drawNumber: number;
  groupId: string;
  groupName: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  winningBid: number;
  prizeAmount: number;
  settlementStatus: SettlementStatus;
  settlementDate?: FirebaseFirestoreTypes.Timestamp;
  announcedDate: FirebaseFirestoreTypes.Timestamp;
  notificationSent: boolean;
  receiptGenerated: boolean;
  receiptUrl?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

export interface DrawSettlement {
  id: string;
  drawId: string;
  winnerId: string;
  winnerName: string;
  amount: number;
  method: 'bank_transfer' | 'upi' | 'cash' | 'cheque';
  status: SettlementStatus;
  transactionId?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
  upiId?: string;
  settlementDate?: FirebaseFirestoreTypes.Timestamp;
  initiatedBy: string;
  initiatedDate: FirebaseFirestoreTypes.Timestamp;
  failureReason?: string;
  retryCount: number;
  notes?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

export interface DrawStats {
  totalDraws: number;
  upcomingDraws: number;
  completedDraws: number;
  cancelledDraws: number;
  totalPrizeDisbursed: number;
  averageBidAmount: number;
  averageWinningBid: number;
  participationRate: number;
  settlementRate: number;
}
