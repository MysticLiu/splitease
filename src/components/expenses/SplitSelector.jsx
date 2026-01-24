import { useState, useEffect } from 'react';
import { Check, Percent } from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar } from '../ui/Avatar';
import { CurrencyInput } from '../ui/Input';
import { SPLIT_TYPES, SPLIT_TYPE_LABELS } from '../../constants/splitTypes';
import { formatCurrency } from '../../utils/formatters';

export function SplitSelector({
  members,
  totalAmount,
  splitType,
  onSplitTypeChange,
  splits,
  onSplitsChange,
  error,
}) {
  // Initialize splits when members change
  useEffect(() => {
    if (splits.length === 0 && members.length > 0) {
      onSplitsChange(
        members.map((m) => ({
          memberId: m.id,
          amount: 0,
          percentage: 100 / members.length,
          isIncluded: true,
        }))
      );
    }
  }, [members, onSplitsChange, splits.length]);

  const handleToggleMember = (memberId) => {
    onSplitsChange(
      splits.map((s) =>
        s.memberId === memberId ? { ...s, isIncluded: !s.isIncluded } : s
      )
    );
  };

  const handleAmountChange = (memberId, amount) => {
    onSplitsChange(
      splits.map((s) =>
        s.memberId === memberId ? { ...s, amount: Math.round(parseFloat(amount || 0) * 100) } : s
      )
    );
  };

  const handlePercentageChange = (memberId, percentage) => {
    onSplitsChange(
      splits.map((s) =>
        s.memberId === memberId ? { ...s, percentage: parseFloat(percentage || 0) } : s
      )
    );
  };

  const includedCount = splits.filter((s) => s.isIncluded).length;
  const perPersonAmount = includedCount > 0 ? Math.floor(totalAmount / includedCount) : 0;

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
              onClick={() => onSplitTypeChange(type)}
              className={clsx(
                'flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
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
            const split = splits.find((s) => s.memberId === member.id) || {
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
                perPersonAmount={perPersonAmount}
                totalAmount={totalAmount}
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
        error={error}
      />
    </div>
  );
}

function MemberSplitRow({
  member,
  split,
  splitType,
  perPersonAmount,
  totalAmount,
  onToggle,
  onAmountChange,
  onPercentageChange,
}) {
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
      {/* Toggle checkbox (for equal and percentage) */}
      {(splitType === SPLIT_TYPES.EQUAL || splitType === SPLIT_TYPES.PERCENTAGE) && (
        <button
          type="button"
          onClick={onToggle}
          className={clsx(
            'w-5 h-5 rounded border flex items-center justify-center transition-colors',
            split.isIncluded
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white border-gray-300'
          )}
        >
          {split.isIncluded && <Check className="w-3 h-3" />}
        </button>
      )}

      {/* Member info */}
      <Avatar name={member.name} color={member.avatarColor} size="sm" />
      <span className="flex-1 text-sm font-medium text-gray-900">{member.name}</span>

      {/* Amount display/input */}
      {splitType === SPLIT_TYPES.EQUAL && (
        <span className="text-sm font-medium text-gray-600">
          {split.isIncluded ? formatCurrency(perPersonAmount) : '-'}
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
        />
      )}

      {splitType === SPLIT_TYPES.PERCENTAGE && split.isIncluded && (
        <div className="flex items-center gap-1 w-24">
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={localPercentage}
            onChange={(e) => {
              setLocalPercentage(e.target.value);
              onPercentageChange(e.target.value);
            }}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Percent className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
}

function SplitSummary({ splits, splitType, totalAmount, error }) {
  const includedSplits = splits.filter((s) => s.isIncluded);

  let summary = '';
  let isValid = true;

  if (splitType === SPLIT_TYPES.EQUAL) {
    summary = `Split equally among ${includedSplits.length} people`;
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
