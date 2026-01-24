import { BalanceCard } from './BalanceCard';
import { formatCurrency } from '../../utils/formatters';
import { getTotalOwed } from '../../utils/balanceCalculator';

export function BalanceSummary({ members, balances }) {
  const totalOwed = getTotalOwed(balances);

  // Sort members: those who are owed first, then those who owe
  const sortedMembers = [...members].sort((a, b) => {
    const balA = balances[a.id] || 0;
    const balB = balances[b.id] || 0;
    return balB - balA;
  });

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm text-gray-500">Total to settle</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalOwed > 0 ? formatCurrency(totalOwed) : 'All settled!'}
          </p>
        </div>
        {totalOwed === 0 && (
          <div className="text-4xl">
            ✓
          </div>
        )}
      </div>

      {/* Individual balances */}
      <div className="space-y-2">
        {sortedMembers.map((member) => (
          <BalanceCard
            key={member.id}
            member={member}
            balance={balances[member.id] || 0}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500 pt-2">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Is owed money</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>Owes money</span>
        </div>
      </div>
    </div>
  );
}
