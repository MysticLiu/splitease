import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Receipt, Wallet } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { GroupList } from '../components/groups/GroupList';
import { GroupForm } from '../components/groups/GroupForm';
import { useApp } from '../context/AppContext';

export function HomePage() {
  const navigate = useNavigate();
  const { getGroups, createGroup, state } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const groups = getGroups();
  const totalExpenses = Object.keys(state.expenses).length;
  const totalSettlements = Object.keys(state.settlements).length;

  const handleCreateGroup = ({ name, description, memberNames }) => {
    const group = createGroup(name, memberNames, description);
    setShowCreateModal(false);
    navigate(`/groups/${group.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <PageContainer>
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to SplitEase
          </h1>
          <p className="text-gray-600">
            Track and split expenses with friends, roommates, or groups
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={Users}
            label="Groups"
            value={groups.length}
            color="indigo"
          />
          <StatCard
            icon={Receipt}
            label="Expenses"
            value={totalExpenses}
            color="emerald"
          />
          <StatCard
            icon={Wallet}
            label="Settlements"
            value={totalSettlements}
            color="amber"
          />
        </div>

        {/* Groups section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Groups</h2>
            <Button onClick={() => setShowCreateModal(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New Group
            </Button>
          </div>

          {groups.length > 0 ? (
            <GroupList groups={groups} />
          ) : (
            <EmptyState onCreateGroup={() => setShowCreateModal(true)} />
          )}
        </div>
      </PageContainer>

      {/* Create group modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Group"
      >
        <GroupForm
          onSubmit={handleCreateGroup}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 border shadow-sm">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function EmptyState({ onCreateGroup }) {
  return (
    <div className="text-center py-12 bg-white rounded-xl border">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
        <Users className="w-8 h-8 text-indigo-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No groups yet</h3>
      <p className="text-gray-500 mb-4 max-w-sm mx-auto">
        Create a group to start tracking shared expenses with friends or roommates
      </p>
      <Button onClick={onCreateGroup}>
        <Plus className="w-4 h-4 mr-2" />
        Create Your First Group
      </Button>
    </div>
  );
}
