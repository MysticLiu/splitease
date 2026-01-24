import { GroupCard } from './GroupCard';

export function GroupList({ groups }) {
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
