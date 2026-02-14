import { firestore } from '@react-native-firebase/firestore';

// Base interface for Firestore documents
interface FirestoreDocument {
  id: string;
  createdAt: firestore.FieldValue;
  updatedAt?: firestore.FieldValue;
}

// User Profile (already defined in authService, but for consistency)
// export interface UserProfile {
//   id: string;
//   phoneNumber: string;
//   name?: string;
//   isAdmin: boolean;
// }

// --- Chit Group ---
export type ChitGroupStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface ChitGroup extends FirestoreDocument {
  name: string;
  fundValue: number; // Total value of the chit fund
  numMembers: number; // Total number of members
  durationMonths: number; // Duration of the chit in months
  monthlyContribution: number; // Contribution per member per month
  adminId: string; // UID of the admin managing this group
  status: ChitGroupStatus;
  startDate: firestore.FieldValue; // Start date of the chit
  endDate: firestore.FieldValue; // End date of the chit
  // Other fields like rules, description, etc.
}

// --- Chit Member ---
export interface ChitMember extends FirestoreDocument {
  groupId: string; // ID of the chit group
  userId: string; // UID of the member
  role: 'member' | 'admin'; // Member-specific role (e.g., for reporting)
  status: 'active' | 'pending_approval' | 'defaulted' | 'completed';
  joinedDate: firestore.FieldValue;
  // Other fields like member-specific notes, etc.
}

// --- Chit Contribution ---
export interface ChitContribution extends FirestoreDocument {
  groupId: string;
  memberId: string; // userId of the member making the contribution
  month: number; // Which month's contribution (1 to durationMonths)
  amount: number; // Amount contributed
  paymentDate: firestore.FieldValue; // Date of payment
  status: 'paid' | 'due' | 'overdue';
  // Other fields like proofOfPayment, transactionId, etc.
}

// --- Chit Draw ---
export interface ChitDraw extends FirestoreDocument {
  groupId: string;
  month: number; // Which month's draw
  winnerId: string; // userId of the member who won the draw
  drawDate: firestore.FieldValue;
  amountReceived: number; // Amount received by the winner after deductions/commission
  auctionAmount?: number; // Amount bid during auction (if applicable)
  commission?: number; // Admin commission (if applicable)
  // Other fields like proof of receipt, etc.
}
