import { useState, useEffect, useCallback } from 'react';
import { chitService } from '../services/chitService';
import { ChitGroup, ChitMember, ChitContribution, ChitDraw } from '../types/chit';
import { useAuth } from './useAuth'; // To get the current user's ID and check permissions

/**
 * Hook to manage fetching and real-time listening for a single chit group,
 * including its members, contributions, and draws.
 * Provides loading and error states for each data type.
 */
export const useChitGroup = (groupId: string) => {
  const { user, userProfile, isLoading: authLoading } = useAuth();
  const [group, setGroup] = useState<ChitGroup | null>(null);
  const [members, setMembers] = useState<ChitMember[]>([]);
  const [contributions, setContributions] = useState<ChitContribution[]>([]);
  const [draws, setDraws] = useState<ChitDraw[]>([]);

  const [isLoadingGroup, setIsLoadingGroup] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingContributions, setIsLoadingContributions] = useState(true);
  const [isLoadingDraws, setIsLoadingDraws] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // --- Fetch Group Details ---
  useEffect(() => {
    if (!groupId || authLoading) return;

    let unsubscribeGroup: () => void;
    try {
      unsubscribeGroup = chitService.onGroupsSnapshot(
        (groups) => {
          const fetchedGroup = groups.find(g => g.id === groupId) || null;
          setGroup(fetchedGroup);
          setIsLoadingGroup(false);
          if (!fetchedGroup) setError('Chit group not found.');
        },
        (err) => {
          console.error(`Error fetching group ${groupId}:`, err);
          setError('Failed to load group details.');
          setIsLoadingGroup(false);
        },
        // Assuming admin can view any group, members only their own
        userProfile?.isAdmin ? user?.uid : undefined // This logic needs refinement based on actual access control
      );
    } catch (err: any) {
        console.error(`Failed to subscribe to group ${groupId}:`, err);
        setError(err.message || 'Failed to initialize group subscription.');
        setIsLoadingGroup(false);
        unsubscribeGroup = () => {};
    }

    return () => {
      if (unsubscribeGroup) unsubscribeGroup();
    };
  }, [groupId, user, userProfile, authLoading]);

  // --- Fetch Members ---
  useEffect(() => {
    if (!groupId || !group || authLoading) return;

    setIsLoadingMembers(true);
    const unsubscribeMembers = chitService.onMembersSnapshot(
      groupId,
      (fetchedMembers) => {
        setMembers(fetchedMembers);
        setIsLoadingMembers(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching members for group ${groupId}:`, err);
        setError('Failed to load group members.');
        setIsLoadingMembers(false);
      }
    );
    return () => unsubscribeMembers();
  }, [groupId, group, authLoading]);

  // --- Fetch Contributions ---
  useEffect(() => {
    if (!groupId || !group || authLoading) return;

    setIsLoadingContributions(true);
    const unsubscribeContributions = chitService.onContributionsSnapshot(
      groupId,
      (fetchedContributions) => {
        setContributions(fetchedContributions);
        setIsLoadingContributions(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching contributions for group ${groupId}:`, err);
        setError('Failed to load contributions.');
        setIsLoadingContributions(false);
      }
    );
    return () => unsubscribeContributions();
  }, [groupId, group, authLoading]);

  // --- Fetch Draws ---
  useEffect(() => {
    if (!groupId || !group || authLoading) return;

    setIsLoadingDraws(true);
    const unsubscribeDraws = chitService.onDrawsSnapshot(
      groupId,
      (fetchedDraws) => {
        setDraws(fetchedDraws);
        setIsLoadingDraws(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching draws for group ${groupId}:`, err);
        setError('Failed to load draws.');
        setIsLoadingDraws(false);
      }
    );
    return () => unsubscribeDraws();
  }, [groupId, group, authLoading]);

  // --- Actions ---
  const addMember = useCallback(async (userIdToAdd: string, role: ChitMember['role'] = 'member') => {
    if (!user || !group || group.adminId !== user.uid) {
      setError('Unauthorized: Only group admin can add members.');
      throw new Error('Unauthorized');
    }
    try {
      await chitService.addMember({ groupId, userId: userIdToAdd, role });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to add member.');
      throw err;
    }
  }, [user, group, groupId]);

  const approveMember = useCallback(async (memberId: string) => {
    if (!user || !group || group.adminId !== user.uid) {
        setError('Unauthorized: Only group admin can approve members.');
        throw new Error('Unauthorized');
    }
    try {
        await chitService.approveMember(memberId);
        setError(null);
    } catch (err: any) {
        setError(err.message || 'Failed to approve member.');
        throw err;
    }
  }, [user, group]);

  const addContribution = useCallback(async (contributionData: Omit<ChitContribution, 'id' | 'createdAt'>) => {
    if (!user || !group) {
        setError('Unauthorized: Must be logged in and part of group to contribute.');
        throw new Error('Unauthorized');
    }
    try {
        await chitService.addContribution(contributionData);
        setError(null);
    } catch (err: any) {
        setError(err.message || 'Failed to add contribution.');
        throw err;
    }
  }, [user, group]);

  const recordDraw = useCallback(async (drawData: Omit<ChitDraw, 'id' | 'createdAt'>) => {
    if (!user || !group || group.adminId !== user.uid) {
        setError('Unauthorized: Only group admin can record draws.');
        throw new Error('Unauthorized');
    }
    try {
        await chitService.recordDraw(drawData);
        setError(null);
    } catch (err: any) {
        setError(err.message || 'Failed to record draw.');
        throw err;
    }
  }, [user, group]);


  const isLoading = isLoadingGroup || isLoadingMembers || isLoadingContributions || isLoadingDraws;

  return {
    group,
    members,
    contributions,
    draws,
    isLoading,
    error,
    addMember,
    approveMember,
    addContribution,
    recordDraw
  };
};
