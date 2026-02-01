import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { getAvatarColor } from '../utils/formatters';
import type {
  Expense,
  ExpenseSplit,
  Group,
  Invite,
  Member,
  Profile,
  Settlement,
  SplitType,
} from '../types';

type GroupInviteResult = {
  status: 'pending' | 'member_added' | string;
  group: Group | null;
};

type ExpenseUpdates = {
  description: string;
  amount: number;
  paidBy: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
};

type AuthResult = { error: AuthError | null };

type AppContextValue = {
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

const AppContext = createContext<AppContextValue | null>(null);

const toTimestamp = (value?: string | number | null) =>
  value ? new Date(value).getTime() : Date.now();

const mapMember = (memberRow: any): Member => {
  const profile = memberRow.profiles || {};
  const name = profile.full_name || profile.email || 'Unknown';
  return {
    id: memberRow.user_id,
    name,
    email: profile.email || '',
    role: memberRow.role,
    isActive: memberRow.is_active !== false,
    avatarUrl: profile.avatar_url || '',
    avatarColor: getAvatarColor(name),
  };
};

const normalizeGroup = (groupRow: any): Group => ({
  id: groupRow.id,
  name: groupRow.name,
  description: groupRow.description || '',
  ownerId: groupRow.owner_id,
  createdAt: toTimestamp(groupRow.created_at),
  updatedAt: toTimestamp(groupRow.updated_at),
  members: (groupRow.group_members || []).map(mapMember),
});

const normalizeExpense = (row: any): Expense => ({
  id: row.id,
  groupId: row.group_id,
  description: row.description,
  amount: row.amount,
  paidBy: row.paid_by,
  splitType: row.split_type,
  splits: (row.splits || []) as ExpenseSplit[],
  createdAt: toTimestamp(row.created_at),
  updatedAt: toTimestamp(row.updated_at),
});

const normalizeSettlement = (row: any): Settlement => ({
  id: row.id,
  groupId: row.group_id,
  fromMemberId: row.from_user_id,
  toMemberId: row.to_user_id,
  amount: row.amount,
  createdAt: toTimestamp(row.created_at),
});

const normalizeInvite = (row: any): Invite => ({
  id: row.id,
  groupId: row.group_id,
  email: row.email,
  status: row.status,
  invitedBy: row.invited_by,
  createdAt: toTimestamp(row.created_at),
  acceptedAt: toTimestamp(row.accepted_at),
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expensesByGroup, setExpensesByGroup] = useState<Record<string, Expense[]>>({});
  const [settlementsByGroup, setSettlementsByGroup] = useState<Record<string, Settlement[]>>({});
  const [invitesByGroup, setInvitesByGroup] = useState<Record<string, Invite[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session || null);
        setLoading(false);
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = useCallback(async (): Promise<Profile | null> => {
    if (!session?.user?.id) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('id', session.user.id)
      .single();
    if (error) {
      console.error('Failed to load profile:', error.message);
      return null;
    }
    const nextProfile = {
      id: data.id,
      email: data.email,
      fullName: data.full_name || data.email || 'User',
      avatarUrl: data.avatar_url || '',
    };
    setProfile(nextProfile);
    return nextProfile;
  }, [session?.user?.id]);

  const loadGroups = useCallback(async (): Promise<Group[]> => {
    if (!session?.user?.id) return [];
    const { data, error } = await supabase
      .from('groups')
      .select(
        'id, name, description, owner_id, created_at, updated_at, group_members ( user_id, role, is_active, profiles!group_members_user_id_fkey ( id, email, full_name, avatar_url ) )'
      )
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('Failed to load groups:', error.message);
      return [];
    }
    const normalized = (data || []).map(normalizeGroup);
    setGroups(normalized);
    return normalized;
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      setGroups([]);
      setExpensesByGroup({});
      setSettlementsByGroup({});
      setInvitesByGroup({});
      return;
    }
    loadProfile();
    loadGroups();
  }, [session?.user?.id, loadGroups, loadProfile]);

  const signUp = async (email: string, password: string, fullName: string) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  };

  const signInWithPassword = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signInWithGoogle = async () => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  const getGroups = () => groups.slice().sort((a, b) => b.updatedAt - a.updatedAt);

  const getGroup = async (groupId: string) => {
    const existing = groups.find((g) => g.id === groupId);
    if (existing) return existing;
    const { data, error } = await supabase
      .from('groups')
      .select(
        'id, name, description, owner_id, created_at, updated_at, group_members ( user_id, role, is_active, profiles!group_members_user_id_fkey ( id, email, full_name, avatar_url ) )'
      )
      .eq('id', groupId)
      .single();
    if (error) {
      console.error('Failed to load group:', error.message);
      return null;
    }
    const normalized = normalizeGroup(data);
    setGroups((prev) => {
      const next = prev.filter((g) => g.id !== normalized.id);
      return [normalized, ...next];
    });
    return normalized;
  };

  const createGroup = async (name: string, description: string = '') => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    const { data: rpcData, error } = await supabase
      .rpc('create_group_with_owner', {
        name_input: name?.trim(),
        description_input: description?.trim() || '',
      })
      .single();
    if (error) throw error;

    const data = rpcData as any;
    if (!data?.id) {
      throw new Error('Failed to create group.');
    }

    const groupId = data.id;
    if (groupId) {
      const hydrated = await getGroup(groupId);
      if (hydrated) return hydrated;
    }

    const normalized = normalizeGroup({
      ...data,
      group_members: [
        {
          user_id: session.user.id,
          role: 'owner',
          is_active: true,
          profiles: {
            id: session.user.id,
            email: profile?.email || session.user.email,
            full_name: profile?.fullName || session.user.email,
            avatar_url: profile?.avatarUrl || '',
          },
        },
      ],
    });
    setGroups((prev) => [normalized, ...prev]);
    return normalized;
  };

  const deleteGroup = async (groupId: string) => {
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) throw error;
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setExpensesByGroup((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
    setSettlementsByGroup((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  };

  const getGroupInvites = useCallback(async (groupId: string) => {
    const { data, error } = await supabase
      .from('group_invites')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load invites:', error.message);
      return [];
    }
    const normalized = (data || []).map(normalizeInvite);
    setInvitesByGroup((prev) => ({ ...prev, [groupId]: normalized }));
    return normalized;
  }, []);

  const addMemberByEmail = async (groupId: string, email: string): Promise<GroupInviteResult> => {
    const { data, error } = await supabase.rpc('create_group_invite', {
      group_id_input: groupId,
      email_input: email,
    });
    if (error) throw error;
    const status = data?.[0]?.status || 'pending';
    let group = null;
    if (status === 'member_added') {
      const updated = await loadGroups();
      group = updated.find((g) => g.id === groupId) || null;
    }
    await getGroupInvites(groupId);
    return { status, group };
  };

  const removeMember = async (groupId: string, userId: string) => {
    const { error } = await supabase
      .from('group_members')
      .update({
        is_active: false,
        removed_at: new Date().toISOString(),
      })
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) throw error;
    const updated = await loadGroups();
    return updated.find((group) => group.id === groupId) || null;
  };

  const deleteInvite = async (inviteId: string, groupId: string) => {
    const { error } = await supabase.from('group_invites').delete().eq('id', inviteId);
    if (error) throw error;
    setInvitesByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((invite) => invite.id !== inviteId),
    }));
  };

  const updateProfile = async ({ fullName, avatarUrl }: { fullName: string; avatarUrl: string }) => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        avatar_url: avatarUrl,
      })
      .eq('id', session.user.id)
      .select('id, email, full_name, avatar_url')
      .single();
    if (error) throw error;
    const nextProfile = {
      id: data.id,
      email: data.email,
      fullName: data.full_name || data.email || 'User',
      avatarUrl: data.avatar_url || '',
    };
    setProfile(nextProfile);
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        members: group.members.map((member) =>
          member.id === session.user.id
            ? {
                ...member,
                name: nextProfile.fullName,
                email: nextProfile.email,
                avatarUrl: nextProfile.avatarUrl,
                avatarColor: getAvatarColor(nextProfile.fullName),
              }
            : member
        ),
      }))
    );
    return nextProfile;
  };

  const getGroupExpenses = useCallback(
    async (groupId: string) => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to load expenses:', error.message);
        return [];
      }
      const normalized = (data || []).map(normalizeExpense);
      setExpensesByGroup((prev) => ({ ...prev, [groupId]: normalized }));
      return normalized;
    },
    []
  );

  const getGroupSettlements = useCallback(
    async (groupId: string) => {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to load settlements:', error.message);
        return [];
      }
      const normalized = (data || []).map(normalizeSettlement);
      setSettlementsByGroup((prev) => ({ ...prev, [groupId]: normalized }));
      return normalized;
    },
    []
  );

  const getTotals = useCallback(async (): Promise<{ expenses: number; settlements: number }> => {
    const { count: expenseCount, error: expenseError } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true });
    if (expenseError) {
      console.error('Failed to count expenses:', expenseError.message);
    }
    const { count: settlementCount, error: settlementError } = await supabase
      .from('settlements')
      .select('id', { count: 'exact', head: true });
    if (settlementError) {
      console.error('Failed to count settlements:', settlementError.message);
    }
    return {
      expenses: expenseCount || 0,
      settlements: settlementCount || 0,
    };
  }, []);

  const createExpense = async (
    groupId: string,
    description: string,
    amount: number,
    paidBy: string,
    splitType: SplitType,
    splits: ExpenseSplit[]
  ) => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        description,
        amount,
        paid_by: paidBy,
        split_type: splitType,
        splits,
        created_by: session.user.id,
      })
      .select('*')
      .single();
    if (error) throw error;
    const normalized = normalizeExpense(data);
    setExpensesByGroup((prev) => ({
      ...prev,
      [groupId]: [normalized, ...(prev[groupId] || [])],
    }));
    return normalized;
  };

  const updateExpense = async (expenseId: string, updates: ExpenseUpdates) => {
    const { data, error } = await supabase
      .from('expenses')
      .update({
        description: updates.description,
        amount: updates.amount,
        paid_by: updates.paidBy,
        split_type: updates.splitType,
        splits: updates.splits,
      })
      .eq('id', expenseId)
      .select('*')
      .single();
    if (error) throw error;
    const normalized = normalizeExpense(data);
    setExpensesByGroup((prev) => {
      const groupId = normalized.groupId;
      const current = prev[groupId] || [];
      const next = current.map((expense) => (expense.id === normalized.id ? normalized : expense));
      return { ...prev, [groupId]: next };
    });
    return normalized;
  };

  const deleteExpense = async (expenseId: string, groupId: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) throw error;
    setExpensesByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((expense) => expense.id !== expenseId),
    }));
  };

  const createSettlement = async (
    groupId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number
  ) => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('settlements')
      .insert({
        group_id: groupId,
        from_user_id: fromMemberId,
        to_user_id: toMemberId,
        amount,
        created_by: session.user.id,
      })
      .select('*')
      .single();
    if (error) throw error;
    const normalized = normalizeSettlement(data);
    setSettlementsByGroup((prev) => ({
      ...prev,
      [groupId]: [normalized, ...(prev[groupId] || [])],
    }));
    return normalized;
  };

  const deleteSettlement = async (settlementId: string, groupId: string) => {
    const { error } = await supabase.from('settlements').delete().eq('id', settlementId);
    if (error) throw error;
    setSettlementsByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((settlement) => settlement.id !== settlementId),
    }));
  };

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      profile,
      loading,
      signUp,
      signInWithPassword,
      signInWithGoogle,
      signOut,
      getGroups,
      getGroup,
      loadGroups,
      createGroup,
      deleteGroup,
      addMemberByEmail,
      removeMember,
      getGroupInvites,
      deleteInvite,
      getGroupExpenses,
      getGroupSettlements,
      getTotals,
      updateProfile,
      createExpense,
      updateExpense,
      deleteExpense,
      createSettlement,
      deleteSettlement,
      expensesByGroup,
      settlementsByGroup,
      invitesByGroup,
    }),
    [
      session,
      profile,
      loading,
      groups,
      expensesByGroup,
      settlementsByGroup,
      invitesByGroup,
      loadGroups,
      getGroupInvites,
      getGroupExpenses,
      getGroupSettlements,
      getTotals,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
