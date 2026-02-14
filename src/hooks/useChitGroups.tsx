import { useState, useEffect, useCallback } from 'react';
import { chitService } from '../services/chitService';
import { ChitGroup } from '../types/chit';
import { useAuth } from './useAuth'; // To get the current user's ID

/**
 * Hook to manage fetching and real-time listening for chit groups.
 * If the user is an admin, it fetches all groups they administer.
 * If the user is a regular member, it fetches groups they are a part of (not yet implemented in service).
 * Provides loading and error states.
 */
export const useChitGroups = () => {
  const { user, userProfile, isLoading: authLoading } = useAuth();
  const [chitGroups, setChitGroups] = useState<ChitGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return; // Wait for auth state to be stable
    }

    if (!user) {
      setChitGroups([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let unsubscribe: () => void;

    try {
        // For now, let's assume if user is admin, we fetch groups by adminId.
        // For regular users, we would need a separate query/collection to list their groups.
        // The service needs to be extended to support fetching groups for a given member userId.
        unsubscribe = chitService.onGroupsSnapshot(
            (groups) => {
                setChitGroups(groups);
                setIsLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching chit groups:', err);
                setError('Failed to load chit groups. Please try again.');
                setIsLoading(false);
            },
            userProfile?.isAdmin ? user.uid : undefined // Pass adminId if current user is admin
        );
    } catch (err: any) {
        console.error('Failed to subscribe to chit groups:', err);
        setError(err.message || 'Failed to initialize chit group subscription.');
        setIsLoading(false);
        // Fallback or handle initial error
        unsubscribe = () => {}; // Ensure unsubscribe is defined
    }


    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, userProfile, authLoading]);

  // Function to create a new chit group
  const createChitGroup = useCallback(async (groupData: Omit<ChitGroup, 'id' | 'createdAt' | 'status'>) => {
    if (!user || !userProfile?.isAdmin) {
      setError('Only authenticated admins can create chit groups.');
      throw new Error('Unauthorized');
    }
    setIsLoading(true);
    try {
      const newGroup = await chitService.createGroup({ ...groupData, adminId: user.uid });
      setError(null);
      return newGroup;
    } catch (err: any) {
      setError(err.message || 'Failed to create chit group.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, userProfile]);

  return { chitGroups, isLoading, error, createChitGroup };
};
