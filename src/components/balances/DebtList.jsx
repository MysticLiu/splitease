import { ArrowRight, Banknote } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';

export function DebtList({ debts, members, onSettle }) {
  if (debts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
          <Banknote className="w-6 h-6 text-emerald-600" />
        </div>
        <p className="text-gray-600 font-medium">All settled up!</p>
        <p className="text-sm text-gray-500">No payments needed</p>
      </div>
    );
  }

  const getMember = (id) => members.find((m) => m.id === id);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Suggested payments</h3>
      {debts.map((debt, index) => {
        const fromMember = getMember(debt.from);
        const toMember = getMember(debt.to);

        if (!fromMember || !toMember) return null;

        return (
          <div
            key={`${debt.from}-${debt.to}-${index}`}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border"
          >
            {/* From member */}
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={fromMember.name} color={fromMember.avatarColor} size="sm" />
              <span className="text-sm font-medium text-gray-900 truncate">
                {fromMember.name}
              </span>
            </div>

            {/* Arrow and amount */}
            <div className="flex items-center gap-2 text-gray-400 shrink-0">
              <ArrowRight className="w-4 h-4" />
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(debt.amount)}
              </span>
              <ArrowRight className="w-4 h-4" />
            </div>

            {/* To member */}
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={toMember.name} color={toMember.avatarColor} size="sm" />
              <span className="text-sm font-medium text-gray-900 truncate">
                {toMember.name}
              </span>
            </div>

            {/* Settle button */}
            <Button
              variant="success"
              size="sm"
              onClick={() => onSettle(debt)}
              className="shrink-0 ml-auto"
            >
              Settle
            </Button>
          </div>
        );
      })}
    </div>
  );
}
