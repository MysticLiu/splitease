import { useState } from 'react';
import { Receipt, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Card, CardContent } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import { SPLIT_TYPE_LABELS } from '../../constants/splitTypes';
import { calculateShares } from '../../utils/balanceCalculator';

export function ExpenseCard({ expense, members, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const payer = members.find((m) => m.id === expense.paidBy);
  const shares = calculateShares(expense, members);

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Main row */}
          <div
            className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">{expense.description}</h4>
              <p className="text-sm text-gray-500">
                {payer?.name} paid {formatCurrency(expense.amount)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">{formatRelativeTime(expense.createdAt)}</p>
            </div>

            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="px-4 pb-4 pt-0 border-t bg-gray-50">
              <div className="py-3 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Split method:</span>
                  <span className="font-medium">{SPLIT_TYPE_LABELS[expense.splitType]}</span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Split breakdown:</p>
                  {members.map((member) => {
                    const share = shares[member.id] || 0;
                    const split = expense.splits.find((s) => s.memberId === member.id);

                    if (!split?.isIncluded && share === 0) return null;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar name={member.name} color={member.avatarColor} size="xs" />
                          <span className="text-sm text-gray-700">{member.name}</span>
                        </div>
                        <span
                          className={clsx(
                            'text-sm font-medium',
                            member.id === expense.paidBy ? 'text-emerald-600' : 'text-gray-900'
                          )}
                        >
                          {member.id === expense.paidBy
                            ? `+${formatCurrency(expense.amount - share)}`
                            : `-${formatCurrency(share)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(expense);
                    }}
                    className="flex-1"
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                    }}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Expense"
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete "{expense.description}"? This will recalculate all
          balances and cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onDelete(expense.id);
              setShowDeleteConfirm(false);
            }}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
