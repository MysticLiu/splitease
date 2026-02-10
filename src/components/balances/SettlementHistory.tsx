import { ArrowRight } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import type { Member, Settlement } from '../../types';

type SettlementHistoryProps = {
  settlements: Settlement[];
  members: Member[];
  onDelete?: (id: string) => Promise<void> | void;
  deletingSettlementId?: string | null;
  loading?: boolean;
};

export function SettlementHistory({
  settlements,
  members,
  onDelete,
  deletingSettlementId = null,
  loading = false,
}: SettlementHistoryProps) {
  const getMember = (id: string) => members.find((m) => m.id === id);

  const handleDelete = async (id: string) => {
    if (onDelete && window.confirm('Delete this settlement?')) {
      await onDelete(id);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Settlement history</h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading settlements...</p>
      ) : settlements.length === 0 ? (
        <p className="text-sm text-gray-500">No settlements recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {settlements.map((settlement) => {
            const from = getMember(settlement.fromMemberId);
            const to = getMember(settlement.toMemberId);
            const fromName = from?.name || 'Former member';
            const toName = to?.name || 'Former member';

            return (
              <div
                key={settlement.id}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar
                    name={fromName}
                    color={from?.avatarColor}
                    size="sm"
                    src={from?.avatarUrl}
                  />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {fromName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 shrink-0">
                  <ArrowRight className="w-4 h-4" />
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(settlement.amount)}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar
                    name={toName}
                    color={to?.avatarColor}
                    size="sm"
                    src={to?.avatarUrl}
                  />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {toName}
                  </span>
                </div>
                <span className="ml-auto text-xs text-gray-500">
                  {formatRelativeTime(settlement.createdAt)}
                </span>
                {onDelete && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDelete(settlement.id);
                    }}
                    className="text-xs text-red-500 hover:text-red-600"
                    disabled={deletingSettlementId === settlement.id}
                  >
                    {deletingSettlementId === settlement.id ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
