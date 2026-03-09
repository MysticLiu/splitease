import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { normalizeExpense } from './normalizers';
import type { Expense, ExpenseSplit, SplitType } from '../../types';
import type { ExpenseUpdates } from '../AppContext.shared';

type ExpensesDomainArgs = {
  userId: string;
};

export type ExpensesDomain = {
  expensesByGroup: Record<string, Expense[]>;
  getGroupExpenses: (groupId: string) => Promise<Expense[]>;
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
  removeGroupExpenses: (groupId: string) => void;
};

export function useExpensesDomain({ userId }: ExpensesDomainArgs): ExpensesDomain {
  const [expensesByGroup, setExpensesByGroup] = useState<Record<string, Expense[]>>({});

  useEffect(() => {
    if (!userId) {
      setExpensesByGroup({});
    }
  }, [userId]);

  const getGroupExpenses = useCallback(async (groupId: string) => {
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

  const removeGroupExpenses = useCallback((groupId: string) => {
    setExpensesByGroup((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      expensesByGroup,
      getGroupExpenses,
      createExpense,
      updateExpense,
      deleteExpense,
      removeGroupExpenses,
    }),
    [
      expensesByGroup,
      getGroupExpenses,
      createExpense,
      updateExpense,
      deleteExpense,
      removeGroupExpenses,
    ]
  );
}
