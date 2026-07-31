/**
 * Group Management Service
 * Firestore operations for admin group management
 */

import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  Timestamp,
} from '@react-native-firebase/firestore';
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

const db = getFirestore();

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
      const groupRef = doc(collection(db, COLLECTIONS.GROUPS));

      const groupData: Omit<Group, 'id'> = {
        name: data.name.trim(),
        contributionAmount: data.contributionAmount,
        cycleTime: data.cycleTime,
        maxMembers: data.maxMembers,
        activeMembers: 0,
        totalPooled: 0,
        autoDebit: data.autoDebit,
        status: 'pending',
        startDate: Timestamp.fromDate(data.startDate),
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        createdBy: adminId,
        archived: false,
        closed: false,
      };

      await setDoc(groupRef, groupData);

      const snapshot = await getDoc(groupRef);
      return {
        id: snapshot.id,
        ...(snapshot.data() as any),
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
      const snapshot = await getDoc(doc(db, COLLECTIONS.GROUPS, groupId));

      if (!snapshot.exists) {
        return null;
      }

      return {
        id: snapshot.id,
        ...(snapshot.data() as any),
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
      await updateDoc(doc(db, COLLECTIONS.GROUPS, groupId), {
        ...updates,
        updatedAt: serverTimestamp(),
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
      await updateDoc(doc(db, COLLECTIONS.GROUPS, groupId), {
        archived: true,
        status: 'inactive',
        updatedAt: serverTimestamp(),
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
      await updateDoc(doc(db, COLLECTIONS.GROUPS, groupId), {
        closed: true,
        status: 'closed',
        updatedAt: serverTimestamp(),
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
      let q = query(
        collection(db, COLLECTIONS.GROUPS),
        orderBy('createdAt', 'desc')
      );

      // Apply filters
      if (filters?.adminId) {
        q = query(q, where('createdBy', '==', filters.adminId));
      }

      if (filters?.archived !== undefined) {
        q = query(q, where('archived', '==', filters.archived));
      }

      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const groups = snapshot.docs.map((docSnap: any) => ({
            id: docSnap.id,
            ...docSnap.data(),
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
      const memberRef = doc(collection(db, COLLECTIONS.MEMBERS));

      const memberData: Omit<GroupMember, 'id'> = {
        groupId: data.groupId,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        userPhone: data.userPhone,
        joinedDate: serverTimestamp() as any,
        contributionStatus: 'pending',
        totalContributed: 0,
        missedPayments: 0,
        status: 'active',
      };

      await setDoc(memberRef, memberData);

      // Increment activeMembers count in group
      await updateDoc(doc(db, COLLECTIONS.GROUPS, data.groupId), {
        activeMembers: increment(1),
        updatedAt: serverTimestamp(),
      });

      const snapshot = await getDoc(memberRef);
      return {
        id: snapshot.id,
        ...(snapshot.data() as any),
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
      await updateDoc(doc(db, COLLECTIONS.MEMBERS, memberId), {
        status: 'removed',
      });

      // Decrement activeMembers count in group
      await updateDoc(doc(db, COLLECTIONS.GROUPS, groupId), {
        activeMembers: increment(-1),
        updatedAt: serverTimestamp(),
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
      const q = query(
        collection(db, COLLECTIONS.MEMBERS),
        where('groupId', '==', groupId),
        where('status', '!=', 'removed'),
        orderBy('status', 'asc'),
        orderBy('joinedDate', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const members = snapshot.docs.map((docSnap: any) => ({
            id: docSnap.id,
            ...docSnap.data(),
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
      const q = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        where('groupId', '==', groupId),
        orderBy('date', 'desc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const transactions = snapshot.docs.map((docSnap: any) => ({
            id: docSnap.id,
            ...docSnap.data(),
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
      const q = query(
        collection(db, COLLECTIONS.DRAWS),
        where('groupId', '==', groupId),
        orderBy('scheduledDate', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const draws = snapshot.docs.map((docSnap: any) => ({
            id: docSnap.id,
            ...docSnap.data(),
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
      const q = query(
        collection(db, COLLECTIONS.CONTRIBUTIONS),
        where('groupId', '==', groupId),
        orderBy('dueDate', 'desc'),
        limit(200)
      );

      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const contributions = snapshot.docs.map((docSnap: any) => ({
            id: docSnap.id,
            ...docSnap.data(),
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
      let q = query(collection(db, COLLECTIONS.GROUPS));

      if (adminId) {
        q = query(q, where('createdBy', '==', adminId));
      }

      const snapshot = await getDocs(q);
      const groups = snapshot.docs.map((docSnap: any) => docSnap.data()) as Group[];

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
