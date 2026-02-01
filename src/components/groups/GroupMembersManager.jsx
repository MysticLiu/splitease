import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatRelativeTime } from '../../utils/formatters';

export function GroupMembersManager({
  members,
  invites = [],
  ownerId,
  currentUserId,
  onAdd,
  onRemove,
  onRemoveInvite,
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const currentRole = members.find((member) => member.id === currentUserId)?.role;
  const canManage = currentUserId && (currentUserId === ownerId || currentRole === 'admin');
  const pendingInvites = invites.filter((invite) => invite.status === 'pending');

  const handleAdd = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter an email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const result = await onAdd(trimmed);
      setEmail('');
      if (result?.status === 'member_added') {
        setInfo('Member added.');
      } else {
        setInfo('Invite sent.');
      }
    } catch (err) {
      setError(err.message || 'Unable to add member.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (memberId) => {
    setLoading(true);
    setError(null);
    try {
      await onRemove(memberId);
    } catch (err) {
      setError(err.message || 'Unable to remove member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {members.map((member) => {
          const isOwner = member.id === ownerId;
          const isYou = member.id === currentUserId;
          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={member.name}
                  color={member.avatarColor}
                  size="sm"
                  src={member.avatarUrl}
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">{member.name}</span>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
                {isOwner && (
                  <span className="text-xs text-indigo-600 font-medium">Owner</span>
                )}
                {isYou && !isOwner && (
                  <span className="text-xs text-gray-500">You</span>
                )}
              </div>
              {canManage && !isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemove(member.id)}
                  className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                  title="Remove member"
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {canManage && (
        <div className="flex gap-2">
          <Input
            placeholder="Add member email"
            type="email"
            value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
            setInfo(null);
          }}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleAdd}
            variant="secondary"
            className="shrink-0"
            disabled={loading}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {pendingInvites.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs text-gray-500">Pending invites</p>
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between text-sm text-gray-700"
            >
              <span>{invite.email}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {formatRelativeTime(invite.createdAt)}
                </span>
                {onRemoveInvite && canManage && (
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:text-red-600"
                    onClick={() => onRemoveInvite(invite.id)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {info && <p className="text-sm text-emerald-600">{info}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
