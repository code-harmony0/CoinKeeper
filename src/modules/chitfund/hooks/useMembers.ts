/**
 * useMembers Hook
 * Dummy data and logic for Member Management
 */

import { useState, useEffect } from 'react';

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string; // URL or local asset
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  riskScore: number; // 0-100 (High is good or bad? Let's say High Score = Low Risk, like credit score)
  // Actually, usually Risk Score: High = Bad. Let's use "Trust Score": High = Good.
  // Or "Risk Level": Low, Medium, High.
  riskLevel: 'low' | 'medium' | 'high';
  joinedDate: Date;
  totalContributed: number;
  groups: string[]; // Group IDs
}

const DUMMY_MEMBERS: Member[] = [
  {
    id: 'm1',
    name: 'Aarav Patel',
    email: 'aarav.p@example.com',
    phone: '+91 98765 43210',
    status: 'active',
    riskLevel: 'low',
    riskScore: 85, // Trust Score
    joinedDate: new Date('2023-01-15'),
    totalContributed: 125000,
    groups: ['g1', 'g2'],
  },
  {
    id: 'm2',
    name: 'Priya Sharma',
    email: 'priya.s@example.com',
    phone: '+91 98765 43211',
    status: 'active',
    riskLevel: 'low',
    riskScore: 92,
    joinedDate: new Date('2023-02-20'),
    totalContributed: 80000,
    groups: ['g1'],
  },
  {
    id: 'm3',
    name: 'Rohan Gupta',
    email: 'rohan.g@example.com',
    phone: '+91 98765 43212',
    status: 'pending',
    riskLevel: 'medium',
    riskScore: 65,
    joinedDate: new Date('2023-11-05'),
    totalContributed: 10000,
    groups: ['g3'],
  },
  {
    id: 'm4',
    name: 'Vikram Singh',
    email: 'vikram.s@example.com',
    phone: '+91 98765 43213',
    status: 'suspended',
    riskLevel: 'high',
    riskScore: 30,
    joinedDate: new Date('2022-12-01'),
    totalContributed: 45000,
    groups: [],
  },
  {
    id: 'm5',
    name: 'Ananya Iyer',
    email: 'ananya.i@example.com',
    phone: '+91 98765 43214',
    status: 'active',
    riskLevel: 'low',
    riskScore: 88,
    joinedDate: new Date('2023-05-10'),
    totalContributed: 60000,
    groups: ['g2'],
  },
];

export const useMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setMembers(DUMMY_MEMBERS);
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const getMemberById = (id: string) => {
    return members.find((m) => m.id === id);
  };

  const addMember = (newMember: Partial<Member>) => {
    const member: Member = {
      id: `m${Date.now()}`,
      name: newMember.name || 'New Member',
      email: newMember.email || '',
      phone: newMember.phone || '',
      status: 'pending',
      riskLevel: 'medium',
      riskScore: 50,
      joinedDate: new Date(),
      totalContributed: 0,
      groups: newMember.groups || [],
      ...newMember,
    };
    setMembers((prev) => [member, ...prev]);
    return member;
  };

  const suspendMember = (id: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: 'suspended', riskLevel: 'high', riskScore: 20 } : m
      )
    );
  };

  return {
    members,
    isLoading,
    getMemberById,
    addMember,
    suspendMember,
  };
};
