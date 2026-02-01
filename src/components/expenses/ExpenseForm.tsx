import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input, CurrencyInput } from '../ui/Input';
import { PayerSelector } from './PayerSelector';
import { SplitSelector } from './SplitSelector';
import { SPLIT_TYPES } from '../../constants/splitTypes';
import {
  validateDescription,
  validateAmount,
  validateCustomSplits,
  validatePercentageSplits,
} from '../../utils/validators';
import { parseCurrencyToCents } from '../../utils/formatters';
import type { Expense, ExpenseSplit, Member } from '../../types';
import type { SplitType } from '../../constants/splitTypes';

type ExpenseFormData = {
  description: string;
  amount: number;
  paidBy: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
};

type ExpenseFormProps = {
  members: Member[];
  onSubmit: (data: ExpenseFormData) => void;
  onCancel?: () => void;
  initialData?: Expense | null;
};

export function ExpenseForm({ members, onSubmit, onCancel, initialData = null }: ExpenseFormProps) {
  const [description, setDescription] = useState(initialData?.description || '');
  const [amountStr, setAmountStr] = useState(
    initialData ? (initialData.amount / 100).toFixed(2) : ''
  );
  const [paidBy, setPaidBy] = useState(initialData?.paidBy || members[0]?.id || '');
  const [splitType, setSplitType] = useState<SplitType>(initialData?.splitType || SPLIT_TYPES.EQUAL);
  const [splits, setSplits] = useState<ExpenseSplit[]>(initialData?.splits || []);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (members.length === 0) return;
    const includeDefault = !initialData;
    const defaultPercentage = Math.round((100 / members.length) * 100) / 100;
    setSplits((prev) => {
      const map = new Map(prev.map((s) => [s.memberId, s]));
      return members.map((member) =>
        map.get(member.id) || {
          memberId: member.id,
          amount: 0,
          percentage: defaultPercentage,
          isIncluded: includeDefault,
        }
      );
    });
  }, [members, initialData]);

  // Set default payer when members change
  useEffect(() => {
    if (!members.length) return;
    if (!paidBy || !members.some((m) => m.id === paidBy)) {
      setPaidBy(members[0].id);
    }
  }, [members, paidBy]);

  const amount = parseCurrencyToCents(amountStr);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    // Validate description
    const descError = validateDescription(description);
    if (descError) newErrors.description = descError;

    // Validate amount
    const amountError = validateAmount(amount);
    if (amountError) newErrors.amount = amountError;

    // Validate payer
    if (!paidBy) newErrors.paidBy = 'Please select who paid';

    // Validate splits based on type
    if (splitType === SPLIT_TYPES.CUSTOM) {
      const splitError = validateCustomSplits(splits, amount);
      if (splitError) newErrors.splits = splitError;
    } else if (splitType === SPLIT_TYPES.PERCENTAGE) {
      const splitError = validatePercentageSplits(splits);
      if (splitError) newErrors.splits = splitError;
    } else {
      // Equal split - just check at least one person is included
      if (splits.filter((s) => s.isIncluded).length === 0) {
        newErrors.splits = 'At least one person must be included';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      description: description.trim(),
      amount,
      paidBy,
      splitType,
      splits,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Description"
        placeholder="What was this expense for?"
        value={description}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setDescription(e.target.value);
          setErrors({ ...errors, description: null });
        }}
        error={errors.description}
        autoFocus
      />

      <CurrencyInput
        label="Amount"
        placeholder="0.00"
        value={amountStr}
        onChange={(val) => {
          setAmountStr(val);
          setErrors({ ...errors, amount: null });
        }}
        error={errors.amount}
      />

      <PayerSelector
        members={members}
        value={paidBy}
        onChange={(id) => {
          setPaidBy(id);
          setErrors({ ...errors, paidBy: null });
        }}
      />
      {errors.paidBy && <p className="text-sm text-red-600 -mt-4">{errors.paidBy}</p>}

      <SplitSelector
        members={members}
        totalAmount={amount}
        splitType={splitType}
        onSplitTypeChange={(type) => {
          setSplitType(type);
          setErrors({ ...errors, splits: null });
        }}
        splits={splits}
        onSplitsChange={(newSplits) => {
          setSplits(newSplits);
          setErrors({ ...errors, splits: null });
        }}
        error={errors.splits}
      />

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1">
          {initialData ? 'Save Changes' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}
