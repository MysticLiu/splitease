import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Card, CardContent } from '../components/ui/Card';
import { ExpenseList } from '../components/expenses/ExpenseList';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import {
  BalanceSummary,
  DebtList,
  SettlementHistory,
  SettleUpModal,
} from '../components/balances';
import { MemberListDisplay } from '../components/groups/MemberList';
import { GroupMembersManager } from '../components/groups/GroupMembersManager';
import { useApp } from '../context/useApp';
import { calculateBalances } from '../utils/balanceCalculator';
import { simplifyDebts } from '../utils/debtSimplifier';
import { getErrorMessage } from '../utils/errors';
import type { Debt, Expense, ExpenseSplit, Group, Invite, Settlement, SplitType } from '../types';

type ActiveTab = 'expenses' | 'balances' | 'settle';

type ExpenseFormPayload = {
  description: string;
  amount: number;
  paidBy: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
};

const EMPTY_EXPENSES: Expense[] = [];
const EMPTY_SETTLEMENTS: Settlement[] = [];
const EMPTY_INVITES: Invite[] = [];

export function GroupDetailPage() {
  const { groupId: rawGroupId } = useParams();
  const groupId = rawGroupId ?? '';
  const navigate = useNavigate();
  const {
    session,
    getGroup,
    getGroupExpenses,
    getGroupSettlements,
    createExpense,
    updateExpense,
    deleteExpense,
    createSettlement,
    deleteSettlement,
    addMemberByEmail,
    removeMember,
    getGroupInvites,
    deleteInvite,
    deleteGroup,
    expensesByGroup,
    settlementsByGroup,
    invitesByGroup,
  } = useApp();

  const [activeTab, setActiveTab] = useState<ActiveTab>('expenses');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [settlingDebt, setSettlingDebt] = useState<Debt | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [deletingSettlementId, setDeletingSettlementId] = useState<string | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  const expenses: Expense[] = expensesByGroup[groupId] ?? EMPTY_EXPENSES;
  const settlements: Settlement[] = settlementsByGroup[groupId] ?? EMPTY_SETTLEMENTS;
  const invites: Invite[] = invitesByGroup[groupId] ?? EMPTY_INVITES;

  useEffect(() => {
    let mounted = true;
    const loadGroup = async () => {
      setLoadingGroup(true);
      setActionError(null);
      if (!groupId) {
        setActionError('Group not found.');
        setLoadingExpenses(false);
        setLoadingSettlements(false);
        setLoadingInvites(false);
        setLoadingGroup(false);
        return;
      }
      const groupData = await getGroup(groupId);
      if (!mounted) return;
      if (!groupData) {
        setActionError('Failed to load group.');
        setLoadingExpenses(false);
        setLoadingSettlements(false);
        setLoadingInvites(false);
        setLoadingGroup(false);
        return;
      }
      setGroup(groupData);
      setLoadingGroup(false);

      // Load related data without blocking the main view.
      setLoadingExpenses(true);
      setLoadingSettlements(true);
      setLoadingInvites(true);

      void getGroupExpenses(groupId).finally(() => {
        if (mounted) setLoadingExpenses(false);
      });
      void getGroupSettlements(groupId).finally(() => {
        if (mounted) setLoadingSettlements(false);
      });
      void getGroupInvites(groupId).finally(() => {
        if (mounted) setLoadingInvites(false);
      });
    };

    loadGroup();
    return () => {
      mounted = false;
    };
  }, [groupId, getGroup, getGroupExpenses, getGroupSettlements, getGroupInvites]);

  const balances = useMemo<Record<string, number>>(() => {
    if (!group) return {};
    return calculateBalances(expenses, settlements, group.members);
  }, [expenses, settlements, group]);

  const debts = useMemo(() => simplifyDebts(balances), [balances]);

  if (loadingGroup) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack onBack={() => navigate('/')} />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">Loading group...</div>
        </PageContainer>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack onBack={() => navigate('/')} />
        <PageContainer>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Group not found</h2>
            <p className="text-gray-500 mb-4">This group may have been deleted</p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </PageContainer>
      </div>
    );
  }

  const activeMembers = group.members.filter((member) => member.isActive);

  const handleAddExpense = async (data: ExpenseFormPayload) => {
    if (isAddingExpense) return;
    setIsAddingExpense(true);
    setActionError(null);
    try {
      await createExpense(groupId, data.description, data.amount, data.paidBy, data.splitType, data.splits);
      setShowExpenseModal(false);
    } catch (error) {
      setActionError(getErrorMessage(error, 'Failed to add expense.'));
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleEditExpense = async (data: ExpenseFormPayload) => {
    if (!editingExpense) return;
    if (isEditingExpense) return;
    setIsEditingExpense(true);
    setActionError(null);
    try {
      await updateExpense(editingExpense.id, {
        description: data.description,
        amount: data.amount,
        paidBy: data.paidBy,
        splitType: data.splitType,
        splits: data.splits,
      });
      setEditingExpense(null);
    } catch (error) {
      setActionError(getErrorMessage(error, 'Failed to update expense.'));
    } finally {
      setIsEditingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (deletingExpenseId) return;
    setDeletingExpenseId(expenseId);
    setActionError(null);
    try {
      await deleteExpense(expenseId, groupId);
    } catch (error) {
      setActionError(getErrorMessage(error, 'Failed to delete expense.'));
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleSettle = async (fromId: string, toId: string, amount: number) => {
    if (isSettling) return;
    setIsSettling(true);
    setActionError(null);
    try {
      await createSettlement(groupId, fromId, toId, amount);
    } catch (error) {
      setActionError(getErrorMessage(error, 'Failed to record settlement.'));
    } finally {
      setIsSettling(false);
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (deletingSettlementId) return;
    setDeletingSettlementId(settlementId);
    setActionError(null);
    try {
      await deleteSettlement(settlementId, groupId);
    } catch (error) {
      setActionError(getErrorMessage(error, 'Failed to delete settlement.'));
    } finally {
      setDeletingSettlementId(null);
    }
  };

  const handleDeleteGroup = async () => {
    if (isDeletingGroup) return;
    setIsDeletingGroup(true);
    setActionError(null);
    try {
      await deleteGroup(groupId);
      navigate('/');
    } catch (error) {
      setActionError(getErrorMessage(error, 'Failed to delete group.'));
    } finally {
      setIsDeletingGroup(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={group.name} showBack onBack={() => navigate('/')} />

      <PageContainer>
        <Card className="mb-6">
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{group.name}</h2>
                {group.description && (
                  <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                )}
                <MemberListDisplay members={activeMembers} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsModal(true)}
                aria-label="Open group settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 mb-6">
          <TabButton
            active={activeTab === 'expenses'}
            onClick={() => setActiveTab('expenses')}
          >
            Expenses ({loadingExpenses ? '...' : expenses.length})
          </TabButton>
          <TabButton
            active={activeTab === 'balances'}
            onClick={() => setActiveTab('balances')}
          >
            Balances
          </TabButton>
          <TabButton
            active={activeTab === 'settle'}
            onClick={() => setActiveTab('settle')}
          >
            Settle Up
          </TabButton>
        </div>

        {actionError && (
          <p className="mb-4 text-sm text-red-600">{actionError}</p>
        )}

        {activeTab === 'expenses' && (
          <div>
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowExpenseModal(true)} disabled={isAddingExpense}>
                <Plus className="w-4 h-4 mr-1" />
                Add Expense
              </Button>
            </div>
            {loadingExpenses ? (
              <p className="text-sm text-gray-500 py-6">Loading expenses...</p>
            ) : (
              <ExpenseList
                expenses={expenses}
                members={group.members}
                onEdit={(expense) => setEditingExpense(expense)}
                onDelete={handleDeleteExpense}
                deletingExpenseId={deletingExpenseId}
              />
            )}
          </div>
        )}

        {activeTab === 'balances' && (
          loadingExpenses || loadingSettlements ? (
            <p className="text-sm text-gray-500 py-6">Loading balances...</p>
          ) : (
            <BalanceSummary members={group.members} balances={balances} />
          )
        )}

        {activeTab === 'settle' && (
          <div className="space-y-6">
            <DebtList
              debts={debts}
              members={group.members}
              onSettle={(debt) => setSettlingDebt(debt)}
              loading={loadingExpenses || loadingSettlements}
            />
            <SettlementHistory
              settlements={settlements}
              members={group.members}
              onDelete={handleDeleteSettlement}
              deletingSettlementId={deletingSettlementId}
              loading={loadingSettlements}
            />
          </div>
        )}
      </PageContainer>

      <Modal
        isOpen={showExpenseModal}
        onClose={() => {
          if (!isAddingExpense) setShowExpenseModal(false);
        }}
        title="Add Expense"
        size="lg"
      >
        <ExpenseForm
          members={activeMembers}
          onSubmit={handleAddExpense}
          onCancel={() => setShowExpenseModal(false)}
          submitting={isAddingExpense}
        />
      </Modal>

      <Modal
        isOpen={!!editingExpense}
        onClose={() => {
          if (!isEditingExpense) setEditingExpense(null);
        }}
        title="Edit Expense"
        size="lg"
      >
        {editingExpense && (
          <ExpenseForm
            members={group.members}
            initialData={editingExpense}
            onSubmit={handleEditExpense}
            onCancel={() => setEditingExpense(null)}
            submitting={isEditingExpense}
          />
        )}
      </Modal>

      <SettleUpModal
        isOpen={!!settlingDebt}
        onClose={() => setSettlingDebt(null)}
        debt={settlingDebt}
        members={group.members}
        onConfirm={handleSettle}
      />

      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Group Settings"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Members</h4>
            <GroupMembersManager
              members={activeMembers}
              invites={invites}
              loadingInvites={loadingInvites}
              ownerId={group.ownerId}
              currentUserId={session?.user?.id}
              onAdd={async (email) => {
                const result = await addMemberByEmail(groupId, email);
                if (result.status === 'member_added') {
                  if (!result.group) throw new Error('Unable to refresh group members.');
                  setGroup(result.group);
                }
                return result;
              }}
              onRemove={async (memberId) => {
                const updated = await removeMember(groupId, memberId);
                if (memberId === session?.user?.id) {
                  navigate('/groups');
                  return;
                }
                if (!updated) throw new Error('Unable to refresh group members.');
                setGroup(updated);
              }}
              onRemoveInvite={(inviteId) => deleteInvite(inviteId, groupId)}
            />
            <p className="text-xs text-gray-500 mt-2">
              Members can be added or removed at any time.
            </p>
          </div>

          <hr />

          {group.ownerId === session?.user?.id && (
            <div>
              <h4 className="font-medium text-red-600 mb-2">Danger Zone</h4>
              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full"
                disabled={isDeletingGroup}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Group
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (!isDeletingGroup) setShowDeleteConfirm(false);
        }}
        title="Delete Group"
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete &quot;{group.name}&quot;? This will permanently
          delete all expenses and settlements. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(false)}
            className="flex-1"
            disabled={isDeletingGroup}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteGroup}
            className="flex-1"
            disabled={isDeletingGroup}
          >
            {isDeletingGroup ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

type TabButtonProps = {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
};

function TabButton({ children, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-white text-gray-600 hover:bg-gray-100 border'
      }`}
    >
      {children}
    </button>
  );
}
