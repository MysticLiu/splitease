import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { normalizeSettlement } from './normalizers';
import type { Settlement } from '../../types';

type SettlementsDomainArgs = {
  userId: string;
};

export type SettlementsDomain = {
  settlementsByGroup: Record<string, Settlement[]>;
  getGroupSettlements: (groupId: string) => Promise<Settlement[]>;
  getTotals: () => Promise<{ expenses: number; settlements: number }>;
  createSettlement: (
    groupId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number
  ) => Promise<Settlement>;
  deleteSettlement: (settlementId: string, groupId: string) => Promise<void>;
  removeGroupSettlements: (groupId: string) => void;
};

export function useSettlementsDomain({ userId }: SettlementsDomainArgs): SettlementsDomain {
  const [settlementsByGroup, setSettlementsByGroup] = useState<Record<string, Settlement[]>>({});

  useEffect(() => {
    if (!userId) {
      setSettlementsByGroup({});
    }
  }, [userId]);

  const getGroupSettlements = useCallback(async (groupId: string) => {
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
  }, []);

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

  const removeGroupSettlements = useCallback((groupId: string) => {
    setSettlementsByGroup((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      settlementsByGroup,
      getGroupSettlements,
      getTotals,
      createSettlement,
      deleteSettlement,
      removeGroupSettlements,
    }),
    [
      settlementsByGroup,
      getGroupSettlements,
      getTotals,
      createSettlement,
      deleteSettlement,
      removeGroupSettlements,
    ]
  );
}
