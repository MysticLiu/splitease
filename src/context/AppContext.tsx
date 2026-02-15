import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { AppContext } from './AppContext.shared';
import type { AppContextValue } from './AppContext.shared';
import { useAuthDomain } from './modules/auth';
import { useGroupsDomain } from './modules/groups';
import { useExpensesDomain } from './modules/expenses';
import { useSettlementsDomain } from './modules/settlements';

export function AppProvider({ children }: { children: ReactNode }) {
  const auth = useAuthDomain();
  const expenses = useExpensesDomain({ userId: auth.userId });
  const settlements = useSettlementsDomain({ userId: auth.userId });
  const removeGroupExpenses = expenses.removeGroupExpenses;
  const removeGroupSettlements = settlements.removeGroupSettlements;

  const handleGroupDeleted = useCallback(
    (groupId: string) => {
      removeGroupExpenses(groupId);
      removeGroupSettlements(groupId);
    },
    [removeGroupExpenses, removeGroupSettlements]
  );

  const groups = useGroupsDomain({
    userId: auth.userId,
    userEmail: auth.userEmail,
    onGroupDeleted: handleGroupDeleted,
  });

  const value = useMemo<AppContextValue>(
    () => ({
      session: auth.session,
      profile: groups.profile,
      loading: auth.loading,
      signUp: auth.signUp,
      signInWithPassword: auth.signInWithPassword,
      signInWithGoogle: auth.signInWithGoogle,
      signOut: auth.signOut,
      getGroups: groups.getGroups,
      getGroup: groups.getGroup,
      loadGroups: groups.loadGroups,
      createGroup: groups.createGroup,
      deleteGroup: groups.deleteGroup,
      addMemberByEmail: groups.addMemberByEmail,
      removeMember: groups.removeMember,
      getGroupInvites: groups.getGroupInvites,
      deleteInvite: groups.deleteInvite,
      getGroupExpenses: expenses.getGroupExpenses,
      getGroupSettlements: settlements.getGroupSettlements,
      getTotals: settlements.getTotals,
      updateProfile: groups.updateProfile,
      createExpense: expenses.createExpense,
      updateExpense: expenses.updateExpense,
      deleteExpense: expenses.deleteExpense,
      createSettlement: settlements.createSettlement,
      deleteSettlement: settlements.deleteSettlement,
      expensesByGroup: expenses.expensesByGroup,
      settlementsByGroup: settlements.settlementsByGroup,
      invitesByGroup: groups.invitesByGroup,
    }),
    [
      auth.session,
      groups.profile,
      auth.loading,
      auth.signUp,
      auth.signInWithPassword,
      auth.signInWithGoogle,
      auth.signOut,
      groups.getGroups,
      groups.getGroup,
      groups.loadGroups,
      groups.createGroup,
      groups.deleteGroup,
      groups.addMemberByEmail,
      groups.removeMember,
      groups.getGroupInvites,
      groups.deleteInvite,
      expenses.getGroupExpenses,
      settlements.getGroupSettlements,
      settlements.getTotals,
      groups.updateProfile,
      expenses.createExpense,
      expenses.updateExpense,
      expenses.deleteExpense,
      settlements.createSettlement,
      settlements.deleteSettlement,
      expenses.expensesByGroup,
      settlements.settlementsByGroup,
      groups.invitesByGroup,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
