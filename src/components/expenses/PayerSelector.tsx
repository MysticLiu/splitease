import { Avatar } from '../ui/Avatar';
import { Select } from '../ui/Select';
import type { Member } from '../../types';

type PayerSelectorProps = {
  members: Member[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
};

export function PayerSelector({ members, value, onChange, label = 'Paid by' }: PayerSelectorProps) {
  const options = members.map((member) => ({
    value: member.id,
    label: member.name,
  }));

  const selectedMember = members.find((m) => m.id === value);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-3">
        {selectedMember && (
          <Avatar
            name={selectedMember.name}
            color={selectedMember.avatarColor}
            size="md"
            src={selectedMember.avatarUrl}
          />
        )}
        <Select
          options={options}
          value={value}
          onChange={onChange}
          placeholder="Select who paid"
          className="flex-1"
        />
      </div>
    </div>
  );
}
