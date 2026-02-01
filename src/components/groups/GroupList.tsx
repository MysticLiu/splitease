import { GroupCard } from './GroupCard';
import type { Group } from '../../types';

export function GroupList({ groups }: { groups: Group[] }) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  );
}
