import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getAvatarColor } from '../utils/formatters';

const AppContext = createContext(null);

const toTimestamp = (value) => (value ? new Date(value).getTime() : Date.now());

const mapMember = (memberRow) => {
  const profile = memberRow.profiles || {};
  const name = profile.full_name || profile.email || 'Unknown';
  return {
    id: memberRow.user_id,
    name,
    email: profile.email || '',
    role: memberRow.role,
    avatarColor: getAvatarColor(name),
  };
};

const normalizeGroup = (groupRow) => ({
  id: groupRow.id,
  name: groupRow.name,
  description: groupRow.description || '',
  ownerId: groupRow.owner_id,
  createdAt: toTimestamp(groupRow.created_at),
  updatedAt: toTimestamp(groupRow.updated_at),
  members: (groupRow.group_members || []).map(mapMember),
});

const normalizeExpense = (row) => ({
  id: row.id,
  groupId: row.group_id,
  description: row.description,
  amount: row.amount,
  paidBy: row.paid_by,
  splitType: row.split_type,
  splits: row.splits || [],
  createdAt: toTimestamp(row.created_at),
  updatedAt: toTimestamp(row.updated_at),
});

const normalizeSettlement = (row) => ({
  id: row.id,
  groupId: row.group_id,
  fromMemberId: row.from_user_id,
  toMemberId: row.to_user_id,
  amount: row.amount,
  createdAt: toTimestamp(row.created_at),
});

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [expensesByGroup, setExpensesByGroup] = useState({});
  const [settlementsByGroup, setSettlementsByGroup] = useState({});
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

  const loadProfile = useCallback(async () => {
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

  const loadGroups = useCallback(async () => {
    if (!session?.user?.id) return [];
    const { data, error } = await supabase
      .from('groups')
      .select(
        'id, name, description, owner_id, created_at, updated_at, group_members ( user_id, role, profiles ( id, email, full_name ) )'
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
      return;
    }
    loadProfile();
    loadGroups();
  }, [session?.user?.id, loadGroups, loadProfile]);

  const signUp = async (email, password, fullName) => {
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

  const signInWithPassword = async (email, password) => {
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

  const getGroup = async (groupId) => {
    const existing = groups.find((g) => g.id === groupId);
    if (existing) return existing;
    const { data, error } = await supabase
      .from('groups')
      .select(
        'id, name, description, owner_id, created_at, updated_at, group_members ( user_id, role, profiles ( id, email, full_name ) )'
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

  const createGroup = async (name, description = '') => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    const { data: groupRow, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        owner_id: session.user.id,
      })
      .select(
        'id, name, description, owner_id, created_at, updated_at, group_members ( user_id, role, profiles ( id, email, full_name ) )'
      )
      .single();
    if (groupError) throw groupError;

    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: groupRow.id,
      user_id: session.user.id,
      role: 'owner',
    });
    if (memberError) throw memberError;

    const normalized = normalizeGroup({
      ...groupRow,
      group_members: [
        {
          user_id: session.user.id,
          role: 'owner',
          profiles: {
            id: session.user.id,
            email: profile?.email || session.user.email,
            full_name: profile?.fullName || session.user.email,
          },
        },
      ],
    });
    setGroups((prev) => [normalized, ...prev]);
    return normalized;
  };

  const deleteGroup = async (groupId) => {
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

  const addMemberByEmail = async (groupId, email) => {
    const { data, error } = await supabase.rpc('find_profile_by_email', { email_input: email });
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No user found with that email.');
    }
    const userId = data[0].id;
    const { error: insertError } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: userId,
      role: 'member',
    });
    if (insertError) throw insertError;
    await loadGroups();
    return userId;
  };

  const removeMember = async (groupId, userId) => {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) throw error;
    await loadGroups();
  };

  const getGroupExpenses = useCallback(
    async (groupId) => {
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
    async (groupId) => {
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

  const getTotals = useCallback(async () => {
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

  const createExpense = async (groupId, description, amount, paidBy, splitType, splits) => {
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

  const updateExpense = async (expenseId, updates) => {
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

  const deleteExpense = async (expenseId, groupId) => {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) throw error;
    setExpensesByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((expense) => expense.id !== expenseId),
    }));
  };

  const createSettlement = async (groupId, fromMemberId, toMemberId, amount) => {
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

  const deleteSettlement = async (settlementId, groupId) => {
    const { error } = await supabase.from('settlements').delete().eq('id', settlementId);
    if (error) throw error;
    setSettlementsByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((settlement) => settlement.id !== settlementId),
    }));
  };

  const value = useMemo(
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
      getGroupExpenses,
      getGroupSettlements,
      getTotals,
      createExpense,
      updateExpense,
      deleteExpense,
      createSettlement,
      deleteSettlement,
      expensesByGroup,
      settlementsByGroup,
    }),
    [
      session,
      profile,
      loading,
      groups,
      expensesByGroup,
      settlementsByGroup,
      loadGroups,
      getGroupExpenses,
      getGroupSettlements,
      getTotals,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
