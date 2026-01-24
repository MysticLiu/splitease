/**
 * Simplify debts to minimize number of transactions
 * Uses a greedy algorithm: match largest creditor with largest debtor
 *
 * @param {Object} balances - Map of memberId -> net balance
 * @returns {Array} Simplified list of {from, to, amount} transactions
 */
export function simplifyDebts(balances) {
  // Separate into creditors (positive balance) and debtors (negative)
  const creditors = []; // People who are owed money
  const debtors = [];   // People who owe money

  Object.entries(balances).forEach(([memberId, balance]) => {
    if (balance > 0) {
      creditors.push({ memberId, amount: balance });
    } else if (balance < 0) {
      debtors.push({ memberId, amount: -balance }); // Store as positive
    }
  });

  // Sort both by amount descending (greedy: handle largest first)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  // Match debtors to creditors
  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    // Transfer the minimum of what's owed and what's available
    const transferAmount = Math.min(creditor.amount, debtor.amount);

    if (transferAmount > 0) {
      transactions.push({
        from: debtor.memberId,
        to: creditor.memberId,
        amount: transferAmount
      });
    }

    // Update remaining amounts
    creditor.amount -= transferAmount;
    debtor.amount -= transferAmount;

    // Move to next if fully settled
    if (creditor.amount === 0) i++;
    if (debtor.amount === 0) j++;
  }

  return transactions;
}

/**
 * Get detailed debt breakdown from individual expenses
 * Shows exactly who owes whom based on each expense
 */
export function getDetailedDebts(expenses, settlements, members) {
  // Track individual debts: debtMatrix[debtor][creditor] = amount
  const debtMatrix = {};
  members.forEach(m1 => {
    debtMatrix[m1.id] = {};
    members.forEach(m2 => {
      debtMatrix[m1.id][m2.id] = 0;
    });
  });

  // Build debt matrix from expenses
  expenses.forEach(expense => {
    const includedSplits = expense.splits.filter(s => s.isIncluded);

    includedSplits.forEach(split => {
      if (split.memberId !== expense.paidBy) {
        let shareAmount = 0;

        switch (expense.splitType) {
          case 'equal':
            shareAmount = Math.floor(expense.amount / includedSplits.length);
            break;
          case 'custom':
            shareAmount = split.amount || 0;
            break;
          case 'percentage':
            shareAmount = Math.round(expense.amount * (split.percentage || 0) / 100);
            break;
        }

        if (shareAmount > 0) {
          debtMatrix[split.memberId][expense.paidBy] += shareAmount;
        }
      }
    });
  });

  // Subtract settlements
  settlements.forEach(s => {
    debtMatrix[s.fromMemberId][s.toMemberId] -= s.amount;
  });

  // Net out mutual debts and create transaction list
  const debts = [];
  const processed = new Set();

  members.forEach(m1 => {
    members.forEach(m2 => {
      const key = [m1.id, m2.id].sort().join('-');
      if (m1.id !== m2.id && !processed.has(key)) {
        processed.add(key);
        const owes12 = debtMatrix[m1.id][m2.id];
        const owes21 = debtMatrix[m2.id][m1.id];
        const net = owes12 - owes21;

        if (net > 0) {
          debts.push({ from: m1.id, to: m2.id, amount: net });
        } else if (net < 0) {
          debts.push({ from: m2.id, to: m1.id, amount: -net });
        }
      }
    });
  });

  return debts;
}
