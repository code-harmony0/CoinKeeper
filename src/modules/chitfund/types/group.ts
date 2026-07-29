/**
 * Group Management Types
 * Comprehensive type definitions for the admin group management module
 */

import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type GroupStatus = 'active' | 'inactive' | 'closed' | 'pending';
export type GroupCycleTime = 'weekly' | 'monthly' | 'biweekly';
export type ContributionStatus = 'paid' | 'pending' | 'overdue' | 'failed';
export type DrawStatus = 'upcoming' | 'completed' | 'cancelled';

/**
 * Core Group entity
 */
export interface Group {
  id: string;
  name: string;
  contributionAmount: number;
  cycleTime: GroupCycleTime;
  maxMembers: number;
  activeMembers: number;
  totalPooled: number;
  autoDebit: boolean;
  status: GroupStatus;
  startDate: FirebaseFirestoreTypes.Timestamp;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
  createdBy: string; // Admin user ID
  archived: boolean;
  closed: boolean;
}

/**
 * Create Group payload
 */
export interface CreateGroupData {
  name: string;
  contributionAmount: number;
  cycleTime: GroupCycleTime;
  maxMembers: number;
  autoDebit: boolean;
  startDate: Date;
}

/**
 * Update Group payload
 */
export interface UpdateGroupData {
  name?: string;
  contributionAmount?: number;
  cycleTime?: GroupCycleTime;
  maxMembers?: number;
  autoDebit?: boolean;
  status?: GroupStatus;
  archived?: boolean;
  closed?: boolean;
}

/**
 * Group Member entity
 */
export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  joinedDate: FirebaseFirestoreTypes.Timestamp;
  contributionStatus: ContributionStatus;
  totalContributed: number;
  missedPayments: number;
  status: 'active' | 'inactive' | 'removed';
}

/**
 * Add Member payload
 */
export interface AddMemberData {
  groupId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
}

/**
 * Group Transaction entity
 */
export interface GroupTransaction {
  id: string;
  groupId: string;
  memberId: string;
  memberName: string;
  amount: number;
  type: 'income' | 'expense' | 'contribution';
  description: string;
  status: 'completed' | 'pending' | 'failed';
  date: FirebaseFirestoreTypes.Timestamp;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

/**
 * Group Draw entity (lottery/chit draw)
 */
export interface GroupDraw {
  id: string;
  groupId: string;
  drawNumber: number;
  scheduledDate: FirebaseFirestoreTypes.Timestamp;
  completedDate?: FirebaseFirestoreTypes.Timestamp;
  winnerId?: string;
  winnerName?: string;
  prizeAmount: number;
  status: DrawStatus;
  participants: string[]; // Array of member IDs
}

/**
 * Group Performance Metrics
 */
export interface GroupPerformance {
  groupId: string;
  monthlyData: MonthlyMetrics[];
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
  collectionRate: number; // Percentage of on-time payments
  averageContribution: number;
  trendDirection: 'up' | 'down' | 'stable';
}

/**
 * Monthly metrics for charts
 */
export interface MonthlyMetrics {
  month: string; // Format: "2025-01"
  contributions: number;
  expenses: number;
  netAmount: number;
  memberCount: number;
}

/**
 * Filter options for Groups List
 */
export interface GroupFilters {
  status?: GroupStatus[];
  searchQuery?: string;
  sortBy?: 'name' | 'members' | 'amount' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Group statistics for dashboard
 */
export interface GroupStats {
  totalGroups: number;
  activeGroups: number;
  inactiveGroups: number;
  closedGroups: number;
  totalMembers: number;
  totalPooled: number;
  averageGroupSize: number;
}

/**
 * Contribution record
 */
export interface Contribution {
  id: string;
  groupId: string;
  memberId: string;
  memberName: string;
  amount: number;
  dueDate: FirebaseFirestoreTypes.Timestamp;
  paidDate?: FirebaseFirestoreTypes.Timestamp;
  status: ContributionStatus;
  cycleNumber: number;
  paymentMethod?: string;
  transactionId?: string;
}
