/**
 * Group Management Service
 * Firestore operations for admin group management
 */

import firestore from '@react-native-firebase/firestore';
import type {
  Group,
  CreateGroupData,
  UpdateGroupData,
  GroupMember,
  AddMemberData,
  GroupTransaction,
  GroupDraw,
  Contribution,
  GroupStatus,
} from '../types/group';

const COLLECTIONS = {
  GROUPS: 'groups',
  MEMBERS: 'group_members',
  TRANSACTIONS: 'group_transactions',
  DRAWS: 'group_draws',
  CONTRIBUTIONS: 'group_contributions',
};

export const groupService = {
  // ==================== GROUP CRUD ====================

  /**
   * Create a new group
   */
  createGroup: async (
    data: CreateGroupData,
    adminId: string,
  ): Promise<Group> => {
    try {
      const groupRef = firestore().collection(COLLECTIONS.GROUPS).doc();

      const groupData: Omit<Group, 'id'> = {
        name: data.name.trim(),
        contributionAmount: data.contributionAmount,
        cycleTime: data.cycleTime,
        maxMembers: data.maxMembers,
        activeMembers: 0,
        totalPooled: 0,
        autoDebit: data.autoDebit,
        status: 'pending',
        startDate: firestore.Timestamp.fromDate(data.startDate),
        createdAt: firestore.FieldValue.serverTimestamp() as any,
        updatedAt: firestore.FieldValue.serverTimestamp() as any,
        createdBy: adminId,
        archived: false,
        closed: false,
      };

      await groupRef.set(groupData);

      const snapshot = await groupRef.get();
      return {
        id: snapshot.id,
        ...snapshot.data(),
      } as Group;
    } catch (error) {
      console.error('[groupService] Error creating group:', error);
      throw new Error('Failed to create group');
    }
  },

  /**
   * Get a single group by ID
   */
  getGroup: async (groupId: string): Promise<Group | null> => {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.GROUPS)
        .doc(groupId)
        .get();

      if (!snapshot.exists) {
        return null;
      }

      return {
        id: snapshot.id,
        ...snapshot.data(),
      } as Group;
    } catch (error) {
      console.error('[groupService] Error fetching group:', error);
      throw new Error('Failed to fetch group');
    }
  },

  /**
   * Update group data
   */
  updateGroup: async (
    groupId: string,
    updates: UpdateGroupData,
  ): Promise<void> => {
    try {
      await firestore()
        .collection(COLLECTIONS.GROUPS)
        .doc(groupId)
        .update({
          ...updates,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('[groupService] Error updating group:', error);
      throw new Error('Failed to update group');
    }
  },

  /**
   * Archive a group (soft delete)
   */
  archiveGroup: async (groupId: string): Promise<void> => {
    try {
      await firestore().collection(COLLECTIONS.GROUPS).doc(groupId).update({
        archived: true,
        status: 'inactive',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('[groupService] Error archiving group:', error);
      throw new Error('Failed to archive group');
    }
  },

  /**
   * Close a group permanently
   */
  closeGroup: async (groupId: string): Promise<void> => {
    try {
      await firestore().collection(COLLECTIONS.GROUPS).doc(groupId).update({
        closed: true,
        status: 'closed',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('[groupService] Error closing group:', error);
      throw new Error('Failed to close group');
    }
  },

  /**
   * Real-time listener for all groups
   * PERFORMANCE NOTE: Status filtering is done in-memory. Consider using Firestore's 'in' query
   * if status values are limited to 10 or fewer values for better scalability.
   */
  onGroupsSnapshot: (
    callback: (groups: Group[]) => void,
    onError?: (error: Error) => void,
    filters?: {
      status?: GroupStatus[];
      archived?: boolean;
      adminId?: string;
    },
  ) => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.GROUPS)
        .orderBy('createdAt', 'desc');

      // Apply filters
      if (filters?.adminId) {
        query = query.where('createdBy', '==', filters.adminId) as any;
      }

      if (filters?.archived !== undefined) {
        query = query.where('archived', '==', filters.archived) as any;
      }

      const unsubscribe = query.onSnapshot(
        snapshot => {
          const groups = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Group[];

          // Apply status filter in memory (Firestore doesn't support array contains for non-array fields)
          const filteredGroups = filters?.status
            ? groups.filter(group => filters.status!.includes(group.status))
            : groups;

          callback(filteredGroups);
        },
        error => {
          console.error('[groupService] Groups snapshot error:', error);
          onError?.(error);
        },
      );

      return unsubscribe;
    } catch (error) {
      console.error('[groupService] Error setting up groups listener:', error);
      throw new Error('Failed to set up groups listener');
    }
  },

  // ==================== MEMBER MANAGEMENT ====================

  /**
   * Add a member to a group
   */
  addMember: async (data: AddMemberData): Promise<GroupMember> => {
    try {
      const memberRef = firestore().collection(COLLECTIONS.MEMBERS).doc();

      const memberData: Omit<GroupMember, 'id'> = {
        groupId: data.groupId,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        userPhone: data.userPhone,
        joinedDate: firestore.FieldValue.serverTimestamp() as any,
        contributionStatus: 'pending',
        totalContributed: 0,
        missedPayments: 0,
        status: 'active',
      };

      await memberRef.set(memberData);

      // Increment activeMembers count in group
      await firestore()
        .collection(COLLECTIONS.GROUPS)
        .doc(data.groupId)
        .update({
          activeMembers: firestore.FieldValue.increment(1),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      const snapshot = await memberRef.get();
      return {
        id: snapshot.id,
        ...snapshot.data(),
      } as GroupMember;
    } catch (error) {
      console.error('[groupService] Error adding member:', error);
      throw new Error('Failed to add member');
    }
  },

  /**
   * Remove a member from a group
   */
  removeMember: async (memberId: string, groupId: string): Promise<void> => {
    try {
      // Update member status
      await firestore().collection(COLLECTIONS.MEMBERS).doc(memberId).update({
        status: 'removed',
      });

      // Decrement activeMembers count in group
      await firestore()
        .collection(COLLECTIONS.GROUPS)
        .doc(groupId)
        .update({
          activeMembers: firestore.FieldValue.increment(-1),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('[groupService] Error removing member:', error);
      throw new Error('Failed to remove member');
    }
  },

  /**
   * Real-time listener for group members
   */
  onMembersSnapshot: (
    groupId: string,
    callback: (members: GroupMember[]) => void,
    onError?: (error: Error) => void,
  ) => {
    try {
      const unsubscribe = firestore()
        .collection(COLLECTIONS.MEMBERS)
        .where('groupId', '==', groupId)
        .where('status', '!=', 'removed')
        .orderBy('status', 'asc')
        .orderBy('joinedDate', 'desc')
        .onSnapshot(
          snapshot => {
            const members = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) as GroupMember[];

            callback(members);
          },
          error => {
            console.error('[groupService] Members snapshot error:', error);
            onError?.(error);
          },
        );

      return unsubscribe;
    } catch (error) {
      console.error('[groupService] Error setting up members listener:', error);
      throw new Error('Failed to set up members listener');
    }
  },

  // ==================== TRANSACTION MANAGEMENT ====================

  /**
   * Real-time listener for group transactions
   */
  onTransactionsSnapshot: (
    groupId: string,
    callback: (transactions: GroupTransaction[]) => void,
    onError?: (error: Error) => void,
  ) => {
    try {
      const unsubscribe = firestore()
        .collection(COLLECTIONS.TRANSACTIONS)
        .where('groupId', '==', groupId)
        .orderBy('date', 'desc')
        .limit(100)
        .onSnapshot(
          snapshot => {
            const transactions = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) as GroupTransaction[];

            callback(transactions);
          },
          error => {
            console.error('[groupService] Transactions snapshot error:', error);
            onError?.(error);
          },
        );

      return unsubscribe;
    } catch (error) {
      console.error(
        '[groupService] Error setting up transactions listener:',
        error,
      );
      throw new Error('Failed to set up transactions listener');
    }
  },

  // ==================== DRAW MANAGEMENT ====================

  /**
   * Real-time listener for group draws
   */
  onDrawsSnapshot: (
    groupId: string,
    callback: (draws: GroupDraw[]) => void,
    onError?: (error: Error) => void,
  ) => {
    try {
      const unsubscribe = firestore()
        .collection(COLLECTIONS.DRAWS)
        .where('groupId', '==', groupId)
        .orderBy('scheduledDate', 'desc')
        .onSnapshot(
          snapshot => {
            const draws = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) as GroupDraw[];

            callback(draws);
          },
          error => {
            console.error('[groupService] Draws snapshot error:', error);
            onError?.(error);
          },
        );

      return unsubscribe;
    } catch (error) {
      console.error('[groupService] Error setting up draws listener:', error);
      throw new Error('Failed to set up draws listener');
    }
  },

  // ==================== CONTRIBUTION MANAGEMENT ====================

  /**
   * Real-time listener for group contributions
   */
  onContributionsSnapshot: (
    groupId: string,
    callback: (contributions: Contribution[]) => void,
    onError?: (error: Error) => void,
  ) => {
    try {
      const unsubscribe = firestore()
        .collection(COLLECTIONS.CONTRIBUTIONS)
        .where('groupId', '==', groupId)
        .orderBy('dueDate', 'desc')
        .limit(200)
        .onSnapshot(
          snapshot => {
            const contributions = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) as Contribution[];

            callback(contributions);
          },
          error => {
            console.error(
              '[groupService] Contributions snapshot error:',
              error,
            );
            onError?.(error);
          },
        );

      return unsubscribe;
    } catch (error) {
      console.error(
        '[groupService] Error setting up contributions listener:',
        error,
      );
      throw new Error('Failed to set up contributions listener');
    }
  },

  // ==================== STATS & ANALYTICS ====================

  /**
   * Get group statistics
   */
  getGroupStats: async (adminId?: string) => {
    try {
      let query = firestore().collection(COLLECTIONS.GROUPS);

      if (adminId) {
        query = query.where('createdBy', '==', adminId) as any;
      }

      const snapshot = await query.get();
      const groups = snapshot.docs.map(doc => doc.data()) as Group[];

      const totalGroups = groups.length;
      const activeGroups = groups.filter(g => g.status === 'active').length;
      const inactiveGroups = groups.filter(g => g.status === 'inactive').length;
      const closedGroups = groups.filter(g => g.status === 'closed').length;
      const totalMembers = groups.reduce((sum, g) => sum + g.activeMembers, 0);
      const totalPooled = groups.reduce((sum, g) => sum + g.totalPooled, 0);
      const averageGroupSize = totalGroups > 0 ? totalMembers / totalGroups : 0;

      return {
        totalGroups,
        activeGroups,
        inactiveGroups,
        closedGroups,
        totalMembers,
        totalPooled,
        averageGroupSize: Math.round(averageGroupSize * 10) / 10,
      };
    } catch (error) {
      console.error('[groupService] Error fetching group stats:', error);
      throw new Error('Failed to fetch group stats');
    }
  },
};
