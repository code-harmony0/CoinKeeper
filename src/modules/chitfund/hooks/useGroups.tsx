/**
 * useGroups Hook
 * Comprehensive hook for group management operations
 */

import { useState, useEffect, useCallback } from 'react';
import { groupService } from '../services/groupService';
import type {
  Group,
  CreateGroupData,
  UpdateGroupData,
  GroupMember,
  AddMemberData,
  GroupTransaction,
  GroupDraw,
  Contribution,
  GroupFilters,
  GroupStats,
  GroupStatus,
} from '../types/group';

/**
 * Main hook for managing groups list
 */
export function useGroups(adminId?: string) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = groupService.onGroupsSnapshot(
      (fetchedGroups) => {
        setGroups(fetchedGroups);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
      { adminId, archived: false }
    );

    return () => unsubscribe();
  }, [adminId]);

  const createGroup = useCallback(
    async (data: CreateGroupData) => {
      if (!adminId) {
        throw new Error('Admin ID is required to create a group');
      }

      setError(null);
      try {
        const newGroup = await groupService.createGroup(data, adminId);
        return newGroup;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      }
    },
    [adminId]
  );

  const updateGroup = useCallback(async (groupId: string, updates: UpdateGroupData) => {
    setError(null);
    try {
      await groupService.updateGroup(groupId, updates);
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  const archiveGroup = useCallback(async (groupId: string) => {
    setError(null);
    try {
      await groupService.archiveGroup(groupId);
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  const closeGroup = useCallback(async (groupId: string) => {
    setError(null);
    try {
      await groupService.closeGroup(groupId);
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  return {
    groups,
    isLoading,
    error,
    createGroup,
    updateGroup,
    archiveGroup,
    closeGroup,
  };
}

/**
 * Hook for a single group details
 */
export function useGroupDetails(groupId: string) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [transactions, setTransactions] = useState<GroupTransaction[]>([]);
  const [draws, setDraws] = useState<GroupDraw[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!groupId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Fetch group data
    groupService
      .getGroup(groupId)
      .then((fetchedGroup) => {
        setGroup(fetchedGroup);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });

    // Set up real-time listeners
    const unsubscribeMembers = groupService.onMembersSnapshot(
      groupId,
      setMembers,
      setError
    );

    const unsubscribeTransactions = groupService.onTransactionsSnapshot(
      groupId,
      setTransactions,
      setError
    );

    const unsubscribeDraws = groupService.onDrawsSnapshot(
      groupId,
      setDraws,
      setError
    );

    const unsubscribeContributions = groupService.onContributionsSnapshot(
      groupId,
      setContributions,
      setError
    );

    return () => {
      unsubscribeMembers();
      unsubscribeTransactions();
      unsubscribeDraws();
      unsubscribeContributions();
    };
  }, [groupId]);

  const addMember = useCallback(
    async (data: AddMemberData) => {
      setError(null);
      try {
        const newMember = await groupService.addMember(data);
        return newMember;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      }
    },
    []
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      setError(null);
      try {
        await groupService.removeMember(memberId, groupId);
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      }
    },
    [groupId]
  );

  return {
    group,
    members,
    transactions,
    draws,
    contributions,
    isLoading,
    error,
    addMember,
    removeMember,
  };
}

/**
 * Hook for filtering and sorting groups
 */
export function useGroupFilters(groups: Group[], filters: GroupFilters) {
  const [filteredGroups, setFilteredGroups] = useState<Group[]>(groups);

  useEffect(() => {
    let result = [...groups];

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      result = result.filter((group) => filters.status!.includes(group.status));
    }

    // Apply search query
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter((group) =>
        group.name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'members':
          aValue = a.activeMembers;
          bValue = b.activeMembers;
          break;
        case 'amount':
          aValue = a.totalPooled;
          bValue = b.totalPooled;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt?.toMillis() || 0;
          bValue = b.createdAt?.toMillis() || 0;
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredGroups(result);
  }, [groups, filters]);

  return filteredGroups;
}

/**
 * Hook for group statistics
 */
export function useGroupStats(adminId?: string) {
  const [stats, setStats] = useState<GroupStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    groupService
      .getGroupStats(adminId)
      .then((fetchedStats) => {
        setStats(fetchedStats);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, [adminId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedStats = await groupService.getGroupStats(adminId);
      setStats(fetchedStats);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [adminId]);

  return {
    stats,
    isLoading,
    error,
    refresh,
  };
}
