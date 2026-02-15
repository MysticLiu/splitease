import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/ui/Button';
import { GroupList } from '../components/groups/GroupList';
import { CreateGroupModal } from '../components/groups/CreateGroupModal';
import { useApp } from '../context/useApp';

export function GroupsPage() {
  const navigate = useNavigate();
  const { getGroups } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const groups = getGroups();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <PageContainer>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">All Groups</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Group
          </Button>
        </div>

        {groups.length > 0 ? (
          <GroupList groups={groups} />
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border">
            <p className="text-gray-500 mb-4">No groups yet. Create one to get started!</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>
        )}
      </PageContainer>

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(group) => navigate(`/groups/${group.id}`)}
      />
    </div>
  );
}
