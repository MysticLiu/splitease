/**
 * Calculate share amounts based on split type
 */
export function calculateShares(expense) {
  const shares = {};
  const includedSplits = expense.splits.filter(s => s.isIncluded);

  if (includedSplits.length === 0) {
    return shares;
  }

  switch (expense.splitType) {
    case 'equal': {
      const perPerson = Math.floor(expense.amount / includedSplits.length);
      const remainder = expense.amount % includedSplits.length;

      includedSplits.forEach((split, index) => {
        // Distribute remainder cents to first N members
        shares[split.memberId] = perPerson + (index < remainder ? 1 : 0);
      });
      break;
    }

    case 'custom':
      includedSplits.forEach(split => {
        shares[split.memberId] = split.amount || 0;
      });
      break;

    case 'percentage':
      includedSplits.forEach(split => {
        shares[split.memberId] = Math.round(expense.amount * (split.percentage || 0) / 100);
      });
      // Handle rounding errors by adjusting first member
      const total = Object.values(shares).reduce((a, b) => a + b, 0);
      const diff = expense.amount - total;
      if (diff !== 0) {
        shares[includedSplits[0].memberId] += diff;
      }
      break;

    default:
      break;
  }

  return shares;
}

/**
 * Calculate each member's net balance in a group
 * Positive = is owed money, Negative = owes money
 *
 * @param {Array} expenses - All expenses for the group
 * @param {Array} settlements - All settlements for the group
 * @param {Array} members - All members in the group
 * @returns {Object} Map of memberId -> net balance in cents
 */
export function calculateBalances(expenses, settlements, members) {
  // Initialize all balances to 0
  const balances = {};
  members.forEach(m => balances[m.id] = 0);

  // Process each expense
  expenses.forEach(expense => {
    const payerId = expense.paidBy;

    // The payer is owed the full amount initially
    balances[payerId] = (balances[payerId] || 0) + expense.amount;

    // Calculate what each person owes based on split type
    const shares = calculateShares(expense);

    // Subtract each person's share (including the payer's own share)
    Object.entries(shares).forEach(([memberId, shareAmount]) => {
      balances[memberId] = (balances[memberId] || 0) - shareAmount;
    });
  });

  // Process settlements (reduce what people owe)
  settlements.forEach(settlement => {
    balances[settlement.fromMemberId] = (balances[settlement.fromMemberId] || 0) + settlement.amount;
    balances[settlement.toMemberId] = (balances[settlement.toMemberId] || 0) - settlement.amount;
  });

  return balances;
}

/**
 * Get the total amount owed within a group
 */
export function getTotalOwed(balances) {
  return Object.values(balances)
    .filter(b => b > 0)
    .reduce((a, b) => a + b, 0);
}
