import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CurrencyInput } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { formatCurrency } from '../../utils/formatters';

export function SettleUpModal({ isOpen, onClose, debt, members, onConfirm }) {
  const [amountStr, setAmountStr] = useState('');

  const fromMember = members.find((m) => m.id === debt?.from);
  const toMember = members.find((m) => m.id === debt?.to);

  // Default to full amount
  const defaultAmount = debt?.amount || 0;
  const amount = amountStr
    ? Math.round(parseFloat(amountStr) * 100)
    : defaultAmount;

  const handleConfirm = () => {
    if (amount > 0) {
      onConfirm(debt.from, debt.to, amount);
      setAmountStr('');
      onClose();
    }
  };

  if (!debt || !fromMember || !toMember) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Settlement" size="sm">
      <div className="space-y-6">
        {/* Visual representation */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="text-center">
            <Avatar name={fromMember.name} color={fromMember.avatarColor} size="lg" />
            <p className="mt-2 text-sm font-medium text-gray-900">{fromMember.name}</p>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(amount)}
            </span>
            <ArrowRight className="w-6 h-6 text-gray-400" />
          </div>

          <div className="text-center">
            <Avatar name={toMember.name} color={toMember.avatarColor} size="lg" />
            <p className="mt-2 text-sm font-medium text-gray-900">{toMember.name}</p>
          </div>
        </div>

        {/* Amount input */}
        <CurrencyInput
          label="Settlement amount"
          placeholder={(defaultAmount / 100).toFixed(2)}
          value={amountStr}
          onChange={setAmountStr}
        />

        <p className="text-sm text-gray-500">
          Original amount owed: {formatCurrency(defaultAmount)}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex-1">
            Record Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
