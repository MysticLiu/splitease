import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { AvatarGroup } from '../ui/Avatar';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import { calculateBalances, getTotalOwed } from '../../utils/balanceCalculator';
import { useApp } from '../../context/AppContext';

export function GroupCard({ group }) {
  const navigate = useNavigate();
  const { getGroupExpenses, getGroupSettlements } = useApp();

  const expenses = getGroupExpenses(group.id);
  const settlements = getGroupSettlements(group.id);
  const balances = calculateBalances(expenses, settlements, group.members);
  const totalOwed = getTotalOwed(balances);

  return (
    <Card
      hoverable
      onClick={() => navigate(`/groups/${group.id}`)}
      className="group"
    >
      <CardContent className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {group.name}
          </h3>

          <div className="flex items-center gap-4 mt-2">
            <AvatarGroup members={group.members} max={4} size="sm" />
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Users className="w-4 h-4" />
              {group.members.length}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm">
            {totalOwed > 0 ? (
              <span className="text-amber-600 font-medium">
                {formatCurrency(totalOwed)} to settle
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">All settled up!</span>
            )}
            <span className="text-gray-400">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors shrink-0" />
      </CardContent>
    </Card>
  );
}
