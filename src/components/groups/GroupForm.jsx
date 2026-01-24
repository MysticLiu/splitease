import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MemberList } from './MemberList';
import { validateGroupName, validateMembersCount } from '../../utils/validators';
import { getAvatarColor } from '../../utils/formatters';

export function GroupForm({ onSubmit, onCancel, initialData = null }) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [members, setMembers] = useState(
    initialData?.members || [
      { id: crypto.randomUUID(), name: 'You', avatarColor: getAvatarColor('You'), createdAt: Date.now() },
    ]
  );
  const [errors, setErrors] = useState({});

  const handleAddMember = (memberName) => {
    setMembers([
      ...members,
      {
        id: crypto.randomUUID(),
        name: memberName,
        avatarColor: getAvatarColor(memberName),
        createdAt: Date.now(),
      },
    ]);
  };

  const handleRemoveMember = (memberId) => {
    setMembers(members.filter((m) => m.id !== memberId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};

    const nameError = validateGroupName(name);
    if (nameError) newErrors.name = nameError;

    const membersError = validateMembersCount(members.length);
    if (membersError) newErrors.members = membersError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      memberNames: members.map((m) => m.name),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Group Name"
        placeholder="e.g., Trip to Paris, Roommates"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setErrors({ ...errors, name: null });
        }}
        error={errors.name}
        autoFocus
      />

      <Input
        label="Description (optional)"
        placeholder="What is this group for?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Members
        </label>
        <MemberList
          members={members}
          onAdd={handleAddMember}
          onRemove={handleRemoveMember}
          maxMembers={10}
        />
        {errors.members && (
          <p className="mt-1 text-sm text-red-600">{errors.members}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1">
          {initialData ? 'Save Changes' : 'Create Group'}
        </Button>
      </div>
    </form>
  );
}
