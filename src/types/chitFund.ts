export interface ChitMember {
  id: string;
  name: string;
  avatar?: string;
  status: 'paid' | 'pending' | 'late';
  paidDate?: string;
}

export interface ChitGroup {
  id: string;
  name: string;
  amount: number;
  totalMembers: number;
  frequency: 'monthly' | 'weekly';
  startDate: string;
  nextDrawDate: string;
  status: 'active' | 'completed' | 'pending';
  members: ChitMember[];
  currentCycle: number;
  totalCycles: number;
  potAmount: number;
  adminId: string;
}
