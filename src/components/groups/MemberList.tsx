import { Avatar } from '../ui/Avatar';
import type { Member } from '../../types';

export function MemberListDisplay({ members }: { members: Member[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-full"
        >
          <Avatar
            name={member.name}
            color={member.avatarColor}
            size="xs"
            src={member.avatarUrl}
          />
          <span className="text-xs font-medium text-gray-700">{member.name}</span>
        </div>
      ))}
    </div>
  );
}
