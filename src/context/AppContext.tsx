import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { getAvatarColor } from '../utils/formatters';
import { AppContext } from './AppContext.shared';
import type { AppContextValue, ExpenseUpdates, GroupInviteResult } from './AppContext.shared';
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

const toTimestamp = (value?: string | number | null) =>
  value ? new Date(value).getTime() : Date.now();

const toNullableTimestamp = (value?: string | number | null) =>
  value ? new Date(value).getTime() : null;

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
  acceptedAt: toNullableTimestamp(row.accepted_at),
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expensesByGroup, setExpensesByGroup] = useState<Record<string, Expense[]>>({});
  const [settlementsByGroup, setSettlementsByGroup] = useState<Record<string, Settlement[]>>({});
  const [invitesByGroup, setInvitesByGroup] = useState<Record<string, Invite[]>>({});
  const [loading, setLoading] = useState(true);
  const userId = session?.user?.id ?? '';
  const userEmail = session?.user?.email ?? '';

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
    if (!userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('id', userId)
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
  }, [userId]);

  const loadGroups = useCallback(async (): Promise<Group[]> => {
    if (!userId) return [];
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
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setGroups([]);
      setExpensesByGroup({});
      setSettlementsByGroup({});
      setInvitesByGroup({});
      return;
    }
    void loadProfile();
    void loadGroups();
  }, [userId, loadGroups, loadProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    return supabase.auth.signOut();
  }, []);

  const getGroups = useCallback(
    () => groups.slice().sort((a, b) => b.updatedAt - a.updatedAt),
    [groups]
  );

  const getGroup = useCallback(
    async (groupId: string) => {
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
    },
    [groups]
  );

  const createGroup = useCallback(
    async (name: string, description: string = '') => {
      if (!userId) throw new Error('Not authenticated');
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
            user_id: userId,
            role: 'owner',
            is_active: true,
            profiles: {
              id: userId,
              email: profile?.email || userEmail,
              full_name: profile?.fullName || userEmail,
              avatar_url: profile?.avatarUrl || '',
            },
          },
        ],
      });
      setGroups((prev) => [normalized, ...prev]);
      return normalized;
    },
    [getGroup, profile?.avatarUrl, profile?.email, profile?.fullName, userEmail, userId]
  );

  const deleteGroup = useCallback(async (groupId: string) => {
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
    setInvitesByGroup((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);

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

  const addMemberByEmail = useCallback(
    async (groupId: string, email: string): Promise<GroupInviteResult> => {
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
    },
    [getGroupInvites, loadGroups]
  );

  const removeMember = useCallback(
    async (groupId: string, memberId: string) => {
      const { error } = await supabase
        .from('group_members')
        .update({
          is_active: false,
          removed_at: new Date().toISOString(),
        })
        .eq('group_id', groupId)
        .eq('user_id', memberId);
      if (error) throw error;
      const updated = await loadGroups();
      return updated.find((group) => group.id === groupId) || null;
    },
    [loadGroups]
  );

  const deleteInvite = useCallback(async (inviteId: string, groupId: string) => {
    const { error } = await supabase.from('group_invites').delete().eq('id', inviteId);
    if (error) throw error;
    setInvitesByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((invite) => invite.id !== inviteId),
    }));
  }, []);

  const updateProfile = useCallback(
    async ({ fullName, avatarUrl }: { fullName: string; avatarUrl: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
        })
        .eq('id', userId)
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
            member.id === userId
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
    },
    [userId]
  );

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

  const createExpense = useCallback(
    async (
      groupId: string,
      description: string,
      amount: number,
      paidBy: string,
      splitType: SplitType,
      splits: ExpenseSplit[]
    ) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          group_id: groupId,
          description,
          amount,
          paid_by: paidBy,
          split_type: splitType,
          splits,
          created_by: userId,
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
    },
    [userId]
  );

  const updateExpense = useCallback(async (expenseId: string, updates: ExpenseUpdates) => {
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
  }, []);

  const deleteExpense = useCallback(async (expenseId: string, groupId: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) throw error;
    setExpensesByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((expense) => expense.id !== expenseId),
    }));
  }, []);

  const createSettlement = useCallback(
    async (groupId: string, fromMemberId: string, toMemberId: string, amount: number) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('settlements')
        .insert({
          group_id: groupId,
          from_user_id: fromMemberId,
          to_user_id: toMemberId,
          amount,
          created_by: userId,
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
    },
    [userId]
  );

  const deleteSettlement = useCallback(async (settlementId: string, groupId: string) => {
    const { error } = await supabase.from('settlements').delete().eq('id', settlementId);
    if (error) throw error;
    setSettlementsByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((settlement) => settlement.id !== settlementId),
    }));
  }, []);

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
      signUp,
      signInWithPassword,
      signInWithGoogle,
      signOut,
      getGroups,
      getGroup,
      expensesByGroup,
      settlementsByGroup,
      invitesByGroup,
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
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
