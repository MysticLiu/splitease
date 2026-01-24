import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Card, CardContent } from '../components/ui/Card';
import { ExpenseList } from '../components/expenses/ExpenseList';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { BalanceSummary } from '../components/balances/BalanceSummary';
import { DebtList } from '../components/balances/DebtList';
import { SettleUpModal } from '../components/balances/SettleUpModal';
import { MemberList, MemberListDisplay } from '../components/groups/MemberList';
import { useApp } from '../context/AppContext';
import { calculateBalances } from '../utils/balanceCalculator';
import { simplifyDebts } from '../utils/debtSimplifier';

export function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const {
    getGroup,
    getGroupExpenses,
    getGroupSettlements,
    createExpense,
    updateExpense,
    deleteExpense,
    createSettlement,
    addMember,
    deleteGroup,
  } = useApp();

  const [activeTab, setActiveTab] = useState('expenses');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [settlingDebt, setSettlingDebt] = useState(null);

  const group = getGroup(groupId);
  const expenses = getGroupExpenses(groupId);
  const settlements = getGroupSettlements(groupId);

  // Calculate balances and debts
  const balances = useMemo(() => {
    if (!group) return {};
    return calculateBalances(expenses, settlements, group.members);
  }, [expenses, settlements, group]);

  const debts = useMemo(() => {
    return simplifyDebts(balances);
  }, [balances]);

  // Handle group not found
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

  const handleAddExpense = (data) => {
    createExpense(groupId, data.description, data.amount, data.paidBy, data.splitType, data.splits);
    setShowExpenseModal(false);
  };

  const handleEditExpense = (data) => {
    updateExpense(editingExpense.id, {
      description: data.description,
      amount: data.amount,
      paidBy: data.paidBy,
      splitType: data.splitType,
      splits: data.splits,
    });
    setEditingExpense(null);
  };

  const handleDeleteExpense = (expenseId) => {
    deleteExpense(expenseId);
  };

  const handleSettle = (fromId, toId, amount) => {
    createSettlement(groupId, fromId, toId, amount);
  };

  const handleDeleteGroup = () => {
    deleteGroup(groupId);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={group.name} showBack onBack={() => navigate('/')} />

      <PageContainer>
        {/* Group info card */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{group.name}</h2>
                {group.description && (
                  <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                )}
                <MemberListDisplay members={group.members} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsModal(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <TabButton
            active={activeTab === 'expenses'}
            onClick={() => setActiveTab('expenses')}
          >
            Expenses ({expenses.length})
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

        {/* Tab content */}
        {activeTab === 'expenses' && (
          <div>
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowExpenseModal(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Expense
              </Button>
            </div>
            <ExpenseList
              expenses={expenses}
              members={group.members}
              onEdit={(expense) => setEditingExpense(expense)}
              onDelete={handleDeleteExpense}
            />
          </div>
        )}

        {activeTab === 'balances' && (
          <BalanceSummary members={group.members} balances={balances} />
        )}

        {activeTab === 'settle' && (
          <DebtList
            debts={debts}
            members={group.members}
            onSettle={(debt) => setSettlingDebt(debt)}
          />
        )}
      </PageContainer>

      {/* Add expense modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Add Expense"
        size="lg"
      >
        <ExpenseForm
          members={group.members}
          onSubmit={handleAddExpense}
          onCancel={() => setShowExpenseModal(false)}
        />
      </Modal>

      {/* Edit expense modal */}
      <Modal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Edit Expense"
        size="lg"
      >
        {editingExpense && (
          <ExpenseForm
            members={group.members}
            initialData={editingExpense}
            onSubmit={handleEditExpense}
            onCancel={() => setEditingExpense(null)}
          />
        )}
      </Modal>

      {/* Settle up modal */}
      <SettleUpModal
        isOpen={!!settlingDebt}
        onClose={() => setSettlingDebt(null)}
        debt={settlingDebt}
        members={group.members}
        onConfirm={handleSettle}
      />

      {/* Settings modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Group Settings"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Members</h4>
            <MemberList
              members={group.members}
              onAdd={(name) => addMember(groupId, name)}
              editable
              showAddForm
            />
            <p className="text-xs text-gray-500 mt-2">
              You can add members at any time. Removing members after expenses exist
              isn&apos;t supported.
            </p>
          </div>

          <hr />

          <div>
            <h4 className="font-medium text-red-600 mb-2">Danger Zone</h4>
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Group
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Group"
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete "{group.name}"? This will permanently delete all
          expenses and settlements. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteGroup} className="flex-1">
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function TabButton({ children, active, onClick }) {
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
