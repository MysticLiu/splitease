import type { Debt } from '../types';

/**
 * Simplify debts to minimize number of transactions
 * Uses a greedy algorithm: match largest creditor with largest debtor
 *
 * @param {Object} balances - Map of memberId -> net balance
 * @returns {Array} Simplified list of {from, to, amount} transactions
 */
export function simplifyDebts(balances: Record<string, number>): Debt[] {
  // Separate into creditors (positive balance) and debtors (negative)
  const creditors: Array<{ memberId: string; amount: number }> = []; // People who are owed money
  const debtors: Array<{ memberId: string; amount: number }> = [];   // People who owe money

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

  const transactions: Debt[] = [];

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
