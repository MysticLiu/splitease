import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { GroupList } from '../components/groups/GroupList';
import { GroupForm } from '../components/groups/GroupForm';
import { useApp } from '../context/AppContext';

export function GroupsPage() {
  const navigate = useNavigate();
  const { getGroups, createGroup } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState(null);

  const groups = getGroups();

  const handleCreateGroup = async ({ name, description }) => {
    setCreateError(null);
    try {
      const group = await createGroup(name, description);
      setShowCreateModal(false);
      navigate(`/groups/${group.id}`);
    } catch (error) {
      setCreateError(error.message || 'Failed to create group.');
    }
  };

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

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Group"
      >
        <GroupForm
          onSubmit={handleCreateGroup}
          onCancel={() => setShowCreateModal(false)}
        />
        {createError && (
          <p className="mt-3 text-sm text-red-600">{createError}</p>
        )}
      </Modal>
    </div>
  );
}
