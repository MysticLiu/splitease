import { useState } from 'react';
import { X, Plus, UserPlus } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { validateMemberName, validateMembersCount } from '../../utils/validators';

export function MemberList({
  members,
  onAdd,
  onRemove,
  maxMembers = 10,
  editable = true,
  showAddForm = true,
}) {
  const [newMemberName, setNewMemberName] = useState('');
  const [error, setError] = useState(null);

  const handleAdd = () => {
    const existingNames = members.map((m) => m.name);
    const nameError = validateMemberName(newMemberName, existingNames);
    if (nameError) {
      setError(nameError);
      return;
    }

    const countError = validateMembersCount(members.length + 1);
    if (countError) {
      setError(countError);
      return;
    }

    onAdd(newMemberName.trim());
    setNewMemberName('');
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      {/* Member list */}
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Avatar name={member.name} color={member.avatarColor} size="sm" />
              <span className="text-sm font-medium text-gray-900">{member.name}</span>
            </div>
            {editable && onRemove && members.length > 2 && (
              <button
                type="button"
                onClick={() => onRemove(member.id)}
                className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                title="Remove member"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add member form */}
      {editable && showAddForm && members.length < maxMembers && (
        <div className="flex gap-2">
          <Input
            placeholder="Add member name"
            value={newMemberName}
            onChange={(e) => {
              setNewMemberName(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            error={error}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleAdd}
            variant="secondary"
            className="shrink-0"
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Member count indicator */}
      <p className="text-xs text-gray-500">
        {members.length} of {maxMembers} members
      </p>
    </div>
  );
}

// Simplified version for display only
export function MemberListDisplay({ members }) {
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-full"
        >
          <Avatar name={member.name} color={member.avatarColor} size="xs" />
          <span className="text-xs font-medium text-gray-700">{member.name}</span>
        </div>
      ))}
    </div>
  );
}
