import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { ChitGroup } from '../types/chitFund';

interface ChitFundsContextType {
  groups: ChitGroup[];
  createGroup: (group: Omit<ChitGroup, 'id' | 'members' | 'status' | 'currentCycle'>) => void;
  joinGroup: (groupId: string) => void;
  refreshGroups: () => Promise<void>;
  loading: boolean;
}

const ChitFundsContext = createContext<ChitFundsContextType | undefined>(undefined);

export const ChitFundsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time Firestore listener for chit groups
  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = firestore()
      .collection('groups')
      .where('archived', '==', false)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          const docs = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
              id: doc.id,
              name: d.name || '',
              amount: d.contributionAmount || d.amount || 0,
              totalMembers: d.maxMembers || d.totalMembers || 0,
              frequency: d.cycleTime === 'weekly' ? 'weekly' : 'monthly',
              startDate: d.startDate?.toDate?.()
                ? d.startDate.toDate().toISOString()
                : d.startDate || '',
              nextDrawDate: d.nextDrawDate?.toDate?.()
                ? d.nextDrawDate.toDate().toISOString()
                : d.nextDrawDate || '',
              status: d.status === 'active' ? 'active' : d.status === 'completed' ? 'completed' : 'pending',
              currentCycle: d.currentCycle || 1,
              totalCycles: d.durationMonths || d.totalCycles || d.maxMembers || 12,
              potAmount: d.totalPooled || d.potAmount || 0,
              adminId: d.createdBy || d.adminId || '',
              members: [],
            } as ChitGroup;
          });
          setGroups(docs);
          setLoading(false);
        },
        error => {
          console.error('[useChitFunds] Snapshot error:', error);
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, []);

  const createGroup = useCallback(
    async (newGroup: Omit<ChitGroup, 'id' | 'members' | 'status' | 'currentCycle'>) => {
      try {
        const user = auth().currentUser;
        if (!user) return;

        await firestore().collection('groups').add({
          name: newGroup.name,
          contributionAmount: newGroup.amount,
          maxMembers: newGroup.totalMembers,
          cycleTime: newGroup.frequency,
          startDate: firestore.Timestamp.fromDate(new Date(newGroup.startDate)),
          status: 'active',
          currentCycle: 1,
          totalPooled: 0,
          activeMembers: 0,
          archived: false,
          closed: false,
          createdBy: user.uid,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        console.error('[useChitFunds] Create error:', error);
      }
    },
    [],
  );

  const joinGroup = useCallback(async (groupId: string) => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      await firestore().collection('group_members').add({
        groupId,
        userId: user.uid,
        userName: user.displayName || 'Member',
        status: 'active',
        contributionStatus: 'pending',
        totalContributed: 0,
        missedPayments: 0,
        joinedDate: firestore.FieldValue.serverTimestamp(),
      });

      await firestore()
        .collection('groups')
        .doc(groupId)
        .update({
          activeMembers: firestore.FieldValue.increment(1),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('[useChitFunds] Join error:', error);
    }
  }, []);

  const refreshGroups = useCallback(async () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 300);
  }, []);

  return (
    <ChitFundsContext.Provider value={{ groups, createGroup, joinGroup, refreshGroups, loading }}>
      {children}
    </ChitFundsContext.Provider>
  );
};

export const useChitFunds = () => {
  const context = useContext(ChitFundsContext);
  if (context === undefined) {
    throw new Error('useChitFunds must be used within a ChitFundsProvider');
  }
  return context;
};
