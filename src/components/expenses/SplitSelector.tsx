import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { Check, Percent } from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar } from '../ui/Avatar';
import { CurrencyInput } from '../ui/Input';
import { SPLIT_TYPES, SPLIT_TYPE_LABELS } from '../../constants/splitTypes';
import { formatCurrency } from '../../utils/formatters';
import type { ExpenseSplit, Member } from '../../types';
import type { SplitType } from '../../constants/splitTypes';

type SplitSelectorProps = {
  members: Member[];
  totalAmount: number;
  splitType: SplitType;
  disabled?: boolean;
  onSplitTypeChange: (type: SplitType) => void;
  splits: ExpenseSplit[];
  onSplitsChange: (splits: ExpenseSplit[]) => void;
  error?: string | null;
};

export function SplitSelector({
  members,
  totalAmount,
  splitType,
  disabled = false,
  onSplitTypeChange,
  splits,
  onSplitsChange,
  error,
}: SplitSelectorProps) {
  const splitsByMember = new Map(splits.map((split) => [split.memberId, split]));

  const includedMembers = members.filter(
    (member) => splitsByMember.get(member.id)?.isIncluded
  );
  const includedCount = includedMembers.length;
  const equalBaseAmount = includedCount > 0 ? Math.floor(totalAmount / includedCount) : 0;
  const equalRemainder = includedCount > 0 ? totalAmount % includedCount : 0;
  const equalShareByMember: Record<string, number> = {};
  if (splitType === SPLIT_TYPES.EQUAL && includedCount > 0) {
    includedMembers.forEach((member, index) => {
      equalShareByMember[member.id] =
        equalBaseAmount + (index < equalRemainder ? 1 : 0);
    });
  }

  const handleToggleMember = (memberId: string) => {
    onSplitsChange(
      splits.map((s) =>
        s.memberId === memberId ? { ...s, isIncluded: !s.isIncluded } : s
      )
    );
  };

  const handleAmountChange = (memberId: string, amount: string) => {
    const parsed = amount ? Number.parseFloat(amount) : 0;
    const normalized = Number.isFinite(parsed) ? parsed : 0;
    onSplitsChange(
      splits.map((s) =>
        s.memberId === memberId ? { ...s, amount: Math.round(normalized * 100) } : s
      )
    );
  };

  const handlePercentageChange = (memberId: string, percentage: string) => {
    const parsed = percentage ? Number.parseFloat(percentage) : 0;
    const normalized = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
    onSplitsChange(
      splits.map((s) =>
        s.memberId === memberId ? { ...s, percentage: normalized } : s
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Split type selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Split Method
        </label>
        <div className="flex gap-2">
          {Object.entries(SPLIT_TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => onSplitTypeChange(type as SplitType)}
              disabled={disabled}
              className={clsx(
                'flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                splitType === type
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Split details based on type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {splitType === SPLIT_TYPES.EQUAL
            ? 'Include in split'
            : splitType === SPLIT_TYPES.CUSTOM
            ? 'Enter amounts'
            : 'Enter percentages'}
        </label>

        <div className="space-y-2">
          {members.map((member) => {
            const split: ExpenseSplit = splitsByMember.get(member.id) || {
              memberId: member.id,
              isIncluded: true,
              amount: 0,
              percentage: 0,
            };

            return (
              <MemberSplitRow
                key={member.id}
                member={member}
                split={split}
                splitType={splitType}
                disabled={disabled}
                equalShareAmount={equalShareByMember[member.id] ?? 0}
                onToggle={() => handleToggleMember(member.id)}
                onAmountChange={(val) => handleAmountChange(member.id, val)}
                onPercentageChange={(val) => handlePercentageChange(member.id, val)}
              />
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <SplitSummary
        splits={splits}
        splitType={splitType}
        totalAmount={totalAmount}
        equalRemainder={equalRemainder}
        equalIncludedCount={includedCount}
        error={error}
      />
    </div>
  );
}

type MemberSplitRowProps = {
  member: Member;
  split: ExpenseSplit;
  splitType: SplitType;
  disabled: boolean;
  equalShareAmount: number;
  onToggle: () => void;
  onAmountChange: (value: string) => void;
  onPercentageChange: (value: string) => void;
};

function MemberSplitRow({
  member,
  split,
  splitType,
  disabled,
  equalShareAmount,
  onToggle,
  onAmountChange,
  onPercentageChange,
}: MemberSplitRowProps) {
  const [localAmount, setLocalAmount] = useState('');
  const [localPercentage, setLocalPercentage] = useState('');

  // Sync local state with external state
  useEffect(() => {
    if (splitType === SPLIT_TYPES.CUSTOM) {
      setLocalAmount((split.amount / 100).toFixed(2));
    }
  }, [split.amount, splitType]);

  useEffect(() => {
    if (splitType === SPLIT_TYPES.PERCENTAGE) {
      setLocalPercentage(split.percentage.toString());
    }
  }, [split.percentage, splitType]);

  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 rounded-lg transition-colors',
        split.isIncluded ? 'bg-gray-50' : 'bg-gray-100 opacity-60'
      )}
    >
      {/* Toggle checkbox */}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={clsx(
          'w-5 h-5 rounded border flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          split.isIncluded
            ? 'bg-indigo-600 border-indigo-600 text-white'
            : 'bg-white border-gray-300'
        )}
      >
        {split.isIncluded && <Check className="w-3 h-3" />}
      </button>

      {/* Member info */}
      <Avatar
        name={member.name}
        color={member.avatarColor}
        size="sm"
        src={member.avatarUrl}
      />
      <span className="flex-1 text-sm font-medium text-gray-900">{member.name}</span>

      {/* Amount display/input */}
      {splitType === SPLIT_TYPES.EQUAL && (
        <span className="text-sm font-medium text-gray-600">
          {split.isIncluded ? formatCurrency(equalShareAmount) : '-'}
        </span>
      )}

      {splitType === SPLIT_TYPES.CUSTOM && (
        <CurrencyInput
          value={localAmount}
          onChange={(val) => {
            setLocalAmount(val);
            onAmountChange(val);
          }}
          placeholder="0.00"
          className="w-28"
          disabled={disabled || !split.isIncluded}
        />
      )}

      {splitType === SPLIT_TYPES.PERCENTAGE && (
        <div className="flex items-center gap-1 w-24">
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={localPercentage}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setLocalPercentage(e.target.value);
              onPercentageChange(e.target.value);
            }}
            disabled={disabled || !split.isIncluded}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
          <Percent className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
}

type SplitSummaryProps = {
  splits: ExpenseSplit[];
  splitType: SplitType;
  totalAmount: number;
  equalRemainder: number;
  equalIncludedCount: number;
  error?: string | null;
};

function SplitSummary({
  splits,
  splitType,
  totalAmount,
  equalRemainder,
  equalIncludedCount,
  error,
}: SplitSummaryProps) {
  const includedSplits = splits.filter((s) => s.isIncluded);

  let summary = '';
  let isValid = true;

  if (splitType === SPLIT_TYPES.EQUAL) {
    if (equalRemainder > 0) {
      const centsLabel = equalRemainder === 1 ? 'cent' : 'cents';
      const peopleLabel = equalRemainder === 1 ? 'person' : 'people';
      summary = `Split equally among ${equalIncludedCount} people (${equalRemainder} ${centsLabel} remainder distributed to first ${equalRemainder} ${peopleLabel})`;
    } else {
      summary = `Split equally among ${includedSplits.length} people`;
    }
  } else if (splitType === SPLIT_TYPES.CUSTOM) {
    const total = includedSplits.reduce((sum, s) => sum + (s.amount || 0), 0);
    const remaining = totalAmount - total;
    if (remaining === 0) {
      summary = 'Amounts match the total';
    } else if (remaining > 0) {
      summary = `${formatCurrency(remaining)} remaining to assign`;
      isValid = false;
    } else {
      summary = `${formatCurrency(Math.abs(remaining))} over the total`;
      isValid = false;
    }
  } else if (splitType === SPLIT_TYPES.PERCENTAGE) {
    const totalPercentage = includedSplits.reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) < 0.01) {
      summary = 'Percentages add up to 100%';
    } else {
      summary = `Total: ${totalPercentage.toFixed(1)}% (should be 100%)`;
      isValid = false;
    }
  }

  return (
    <div className="pt-2 border-t">
      <p
        className={clsx(
          'text-sm',
          isValid ? 'text-gray-600' : 'text-amber-600'
        )}
      >
        {summary}
      </p>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
