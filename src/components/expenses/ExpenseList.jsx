import { Receipt } from 'lucide-react';
import { ExpenseCard } from './ExpenseCard';

export function ExpenseList({ expenses, members, onEdit, onDelete }) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <Receipt className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No expenses yet</h3>
        <p className="text-gray-500">Add your first expense to start tracking</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          members={members}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
