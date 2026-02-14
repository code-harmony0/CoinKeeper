import React, { createContext, useContext, useState } from 'react';
import { ChitGroup } from '../types/chitFund';

// Mock initial data
const INITIAL_GROUPS: ChitGroup[] = [
  {
    id: '1',
    name: 'Family Savings',
    amount: 10000,
    totalMembers: 12,
    frequency: 'monthly',
    startDate: '2024-01-01',
    nextDrawDate: '2024-06-01',
    status: 'active',
    currentCycle: 5,
    totalCycles: 12,
    potAmount: 120000,
    adminId: 'user1',
    members: [
      { id: '1', name: 'Alex', status: 'paid', paidDate: '2024-05-02' },
      { id: '2', name: 'Sarah', status: 'pending' },
      { id: '3', name: 'Mike', status: 'paid', paidDate: '2024-05-01' },
    ],
  },
  {
    id: '2',
    name: 'Office Colleagues',
    amount: 5000,
    totalMembers: 20,
    frequency: 'monthly',
    startDate: '2024-03-15',
    nextDrawDate: '2024-06-15',
    status: 'active',
    currentCycle: 3,
    totalCycles: 20,
    potAmount: 100000,
    adminId: 'user1',
    members: [],
  },
];

interface ChitFundsContextType {
  groups: ChitGroup[];
  createGroup: (group: Omit<ChitGroup, 'id' | 'members' | 'status' | 'currentCycle'>) => void;
  joinGroup: (groupId: string) => void;
  loading: boolean;
}

const ChitFundsContext = createContext<ChitFundsContextType | undefined>(undefined);

export const ChitFundsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [groups, setGroups] = useState<ChitGroup[]>(INITIAL_GROUPS);
  const [loading] = useState(false);

  const createGroup = (newGroup: Omit<ChitGroup, 'id' | 'members' | 'status' | 'currentCycle'>) => {
    const group: ChitGroup = {
      ...newGroup,
      id: Math.random().toString(36).substr(2, 9),
      members: [],
      status: 'active',
      currentCycle: 1,
    };
    setGroups(prev => [group, ...prev]);
  };

  const joinGroup = (groupId: string) => {
    // Mock join logic
    console.log('Joined group:', groupId);
  };

  return (
    <ChitFundsContext.Provider value={{ groups, createGroup, joinGroup, loading }}>
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
