import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Check } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { formatCurrency } from '../../utils/formatters';

export function BalanceCard({ member, balance }) {
  const isPositive = balance > 0;
  const isNegative = balance < 0;
  const isSettled = balance === 0;

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
      <div className="flex items-center gap-3">
        <Avatar name={member.name} color={member.avatarColor} size="md" />
        <span className="font-medium text-gray-900">{member.name}</span>
      </div>

      <div
        className={clsx(
          'flex items-center gap-1 font-semibold',
          isPositive && 'text-emerald-600',
          isNegative && 'text-red-500',
          isSettled && 'text-gray-400'
        )}
      >
        {isPositive && <TrendingUp className="w-4 h-4" />}
        {isNegative && <TrendingDown className="w-4 h-4" />}
        {isSettled && <Check className="w-4 h-4" />}

        {isSettled ? (
          <span>settled</span>
        ) : (
          <span>
            {isPositive ? '+' : ''}
            {formatCurrency(balance)}
          </span>
        )}
      </div>
    </div>
  );
}
