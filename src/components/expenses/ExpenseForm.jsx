import { useState, useEffect } from 'react';
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

export function ExpenseForm({ members, onSubmit, onCancel, initialData = null }) {
  const [description, setDescription] = useState(initialData?.description || '');
  const [amountStr, setAmountStr] = useState(
    initialData ? (initialData.amount / 100).toFixed(2) : ''
  );
  const [paidBy, setPaidBy] = useState(initialData?.paidBy || members[0]?.id || '');
  const [splitType, setSplitType] = useState(initialData?.splitType || SPLIT_TYPES.EQUAL);
  const [splits, setSplits] = useState(initialData?.splits || []);
  const [errors, setErrors] = useState({});

  // Initialize splits for all members when component mounts
  useEffect(() => {
    if (!initialData && members.length > 0 && splits.length === 0) {
      setSplits(
        members.map((m) => ({
          memberId: m.id,
          amount: 0,
          percentage: Math.round((100 / members.length) * 100) / 100,
          isIncluded: true,
        }))
      );
    }
  }, [members, initialData]);

  // Set default payer when members change
  useEffect(() => {
    if (!paidBy && members.length > 0) {
      setPaidBy(members[0].id);
    }
  }, [members, paidBy]);

  const amount = parseCurrencyToCents(amountStr);

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};

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
        onChange={(e) => {
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
