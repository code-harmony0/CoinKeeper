import { firestore } from '@react-native-firebase/firestore';
import { addDocument, getDocument, updateDocument, deleteDocument, onSnapshotCollection } from './firestoreService';
import { ChitGroup, ChitMember, ChitContribution, ChitDraw, ChitGroupStatus } from '../types/chit';
import { UserProfile } from './authService';

export const chitService = {
  // --- Chit Group Management ---
  createGroup: async (groupData: Omit<ChitGroup, 'id' | 'createdAt' | 'status'> & { adminId: string }): Promise<ChitGroup> => {
    try {
      const data: Omit<ChitGroup, 'id'> = {
        ...groupData,
        status: 'pending', // Initial status
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      const newGroup = await addDocument<Omit<ChitGroup, 'id'>>('groups', data);
      return newGroup as ChitGroup;
    } catch (error) {
      console.error('Error creating chit group:', error);
      throw error;
    }
  },

  getGroup: async (groupId: string): Promise<ChitGroup | null> => {
    return getDocument<ChitGroup>('groups', groupId);
  },

  updateGroup: async (groupId: string, updates: Partial<ChitGroup>): Promise<void> => {
    try {
      const data: Partial<ChitGroup> = {
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      await updateDocument('groups', groupId, data);
    } catch (error) {
      console.error(`Error updating chit group ${groupId}:`, error);
      throw error;
    }
  },

  deleteGroup: async (groupId: string): Promise<void> => {
    try {
      // TODO: Implement logic to also delete all associated members, contributions, draws
      await deleteDocument('groups', groupId);
    } catch (error) {
      console.error(`Error deleting chit group ${groupId}:`, error);
      throw error;
    }
  },

  onGroupsSnapshot: (
    onResult: (groups: ChitGroup[]) => void,
    onError?: (error: Error) => void,
    adminId?: string // Optional: filter groups by adminId
  ) => {
    const whereClause = adminId ? [['adminId', '==', adminId]] : undefined;
    return onSnapshotCollection<ChitGroup>(
      'groups',
      onResult,
      onError,
      whereClause,
      ['createdAt', 'desc']
    );
  },

  // --- Chit Member Management ---
  addMember: async (memberData: Omit<ChitMember, 'id' | 'createdAt'>): Promise<ChitMember> => {
    try {
      const data: Omit<ChitMember, 'id'> = {
        ...memberData,
        createdAt: firestore.FieldValue.serverTimestamp(),
        joinedDate: firestore.FieldValue.serverTimestamp(),
        status: 'pending_approval', // New members usually need approval
      };
      const newMember = await addDocument<Omit<ChitMember, 'id'>>('members', data);
      return newMember as ChitMember;
    } catch (error) {
      console.error('Error adding chit member:', error);
      throw error;
    }
  },

  updateMember: async (memberId: string, updates: Partial<ChitMember>): Promise<void> => {
    try {
      const data: Partial<ChitMember> = {
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      await updateDocument('members', memberId, data);
    } catch (error) {
      console.error(`Error updating chit member ${memberId}:`, error);
      throw error;
    }
  },

  onMembersSnapshot: (
    groupId: string,
    onResult: (members: ChitMember[]) => void,
    onError?: (error: Error) => void
  ) => {
    return onSnapshotCollection<ChitMember>(
      'members',
      onResult,
      onError,
      [['groupId', '==', groupId]],
      ['joinedDate', 'asc']
    );
  },

  // --- Chit Contribution Management ---
  addContribution: async (contributionData: Omit<ChitContribution, 'id' | 'createdAt'>): Promise<ChitContribution> => {
    try {
      const data: Omit<ChitContribution, 'id'> = {
        ...contributionData,
        createdAt: firestore.FieldValue.serverTimestamp(),
        paymentDate: firestore.FieldValue.serverTimestamp(), // Assuming payment is made at time of recording
        status: 'paid',
      };
      const newContribution = await addDocument<Omit<ChitContribution, 'id'>>('contributions', data);
      return newContribution as ChitContribution;
    } catch (error) {
      console.error('Error adding chit contribution:', error);
      throw error;
    }
  },

  onContributionsSnapshot: (
    groupId: string,
    onResult: (contributions: ChitContribution[]) => void,
    onError?: (error: Error) => void,
    memberId?: string // Optional: filter by member
  ) => {
    const whereClauses = [['groupId', '==', groupId]];
    if (memberId) {
      whereClauses.push(['memberId', '==', memberId]);
    }
    return onSnapshotCollection<ChitContribution>(
      'contributions',
      onResult,
      onError,
      whereClauses as any, // Type assertion due to complex tuple type
      ['paymentDate', 'desc']
    );
  },

  // --- Chit Draw Management ---
  recordDraw: async (drawData: Omit<ChitDraw, 'id' | 'createdAt'>): Promise<ChitDraw> => {
    try {
      const data: Omit<ChitDraw, 'id'> = {
        ...drawData,
        createdAt: firestore.FieldValue.serverTimestamp(),
        drawDate: firestore.FieldValue.serverTimestamp(),
      };
      const newDraw = await addDocument<Omit<ChitDraw, 'id'>>('draws', data);
      return newDraw as ChitDraw;
    } catch (error) {
      console.error('Error recording chit draw:', error);
      throw error;
    }
  },

  onDrawsSnapshot: (
    groupId: string,
    onResult: (draws: ChitDraw[]) => void,
    onError?: (error: Error) => void
  ) => {
    return onSnapshotCollection<ChitDraw>(
      'draws',
      onResult,
      onError,
      [['groupId', '==', groupId]],
      ['drawDate', 'desc']
    );
  },

  // --- Admin Specific Actions ---
  approveMember: async (memberId: string): Promise<void> => {
    return chitService.updateMember(memberId, { status: 'active' });
  },

  // Placeholder for more complex business logic, e.g., manual draw process
  performManualDraw: async (groupId: string, month: number, winnerId: string, amountReceived: number) => {
    // This would involve complex calculations, updating group state, etc.
    console.log(`Performing manual draw for group ${groupId}, month ${month}. Winner: ${winnerId}, Amount: ${amountReceived}`);
    // Record the draw
    await chitService.recordDraw({
      groupId,
      month,
      winnerId,
      amountReceived,
      // ... other draw details
    });
    // TODO: Update group current state (e.g., current month of draw)
    // TODO: Notify other members
  },

  // Add more complex validation and business rules here for each operation.
};
