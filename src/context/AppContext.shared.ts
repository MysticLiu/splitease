import { createContext } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';
import type {
  Expense,
  ExpenseSplit,
  Group,
  Invite,
  Profile,
  Settlement,
  SplitType,
} from '../types';

export type GroupInviteResult = {
  status: 'pending' | 'member_added' | string;
  group: Group | null;
};

export type ExpenseUpdates = {
  description: string;
  amount: number;
  paidBy: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
};

type AuthResult = { error: AuthError | null };

export type AppContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<unknown>;
  signOut: () => Promise<unknown>;
  getGroups: () => Group[];
  getGroup: (groupId: string) => Promise<Group | null>;
  loadGroups: () => Promise<Group[]>;
  createGroup: (name: string, description?: string) => Promise<Group>;
  deleteGroup: (groupId: string) => Promise<void>;
  addMemberByEmail: (groupId: string, email: string) => Promise<GroupInviteResult>;
  removeMember: (groupId: string, userId: string) => Promise<Group | null>;
  getGroupInvites: (groupId: string) => Promise<Invite[]>;
  deleteInvite: (inviteId: string, groupId: string) => Promise<void>;
  getGroupExpenses: (groupId: string) => Promise<Expense[]>;
  getGroupSettlements: (groupId: string) => Promise<Settlement[]>;
  getTotals: () => Promise<{ expenses: number; settlements: number }>;
  updateProfile: (updates: { fullName: string; avatarUrl: string }) => Promise<Profile>;
  createExpense: (
    groupId: string,
    description: string,
    amount: number,
    paidBy: string,
    splitType: SplitType,
    splits: ExpenseSplit[]
  ) => Promise<Expense>;
  updateExpense: (expenseId: string, updates: ExpenseUpdates) => Promise<Expense>;
  deleteExpense: (expenseId: string, groupId: string) => Promise<void>;
  createSettlement: (
    groupId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number
  ) => Promise<Settlement>;
  deleteSettlement: (settlementId: string, groupId: string) => Promise<void>;
  expensesByGroup: Record<string, Expense[]>;
  settlementsByGroup: Record<string, Settlement[]>;
  invitesByGroup: Record<string, Invite[]>;
};

export const AppContext = createContext<AppContextValue | null>(null);
