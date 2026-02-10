import type { SplitType } from '../constants/splitTypes';
export type { SplitType } from '../constants/splitTypes';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  isActive: boolean;
  avatarUrl: string;
  avatarColor: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  members: Member[];
}

export interface ExpenseSplit {
  memberId: string;
  amount: number;
  percentage: number;
  isIncluded: boolean;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
  createdAt: number;
  updatedAt: number;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  createdAt: number;
}

export interface Invite {
  id: string;
  groupId: string;
  email: string;
  status: 'pending' | 'accepted' | 'canceled';
  invitedBy: string;
  createdAt: number;
  acceptedAt: number | null;
}

export interface Debt {
  from: string;
  to: string;
  amount: number;
}
