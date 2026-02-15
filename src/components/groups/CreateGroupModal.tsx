import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { GroupForm } from './GroupForm';
import { useApp } from '../../context/useApp';
import { getErrorMessage } from '../../utils/errors';
import type { Group } from '../../types';

type CreateGroupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (group: Group) => void;
};

export function CreateGroupModal({ isOpen, onClose, onCreated }: CreateGroupModalProps) {
  const { createGroup } = useApp();
  const [createError, setCreateError] = useState<string | null>(null);

  const handleClose = () => {
    setCreateError(null);
    onClose();
  };

  const handleCreateGroup = async ({ name, description }: { name: string; description: string }) => {
    setCreateError(null);
    try {
      const group = await createGroup(name, description);
      onCreated(group);
      handleClose();
    } catch (error) {
      setCreateError(getErrorMessage(error, 'Failed to create group.'));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Group">
      <GroupForm onSubmit={handleCreateGroup} onCancel={handleClose} />
      {createError && <p className="mt-3 text-sm text-red-600">{createError}</p>}
    </Modal>
  );
}
