import { describe, expect, it } from 'vitest';
import { calculateBalances } from '../../src/utils/balanceCalculator';
import { simplifyDebts } from '../../src/utils/debtSimplifier';
import type { Expense, Member } from '../../src/types';

const members: Member[] = [
  {
    id: 'a',
    name: 'Alex',
    email: 'alex@example.com',
    role: 'owner',
    isActive: true,
    avatarUrl: '',
    avatarColor: '#111111',
  },
  {
    id: 'b',
    name: 'Blair',
    email: 'blair@example.com',
    role: 'member',
    isActive: true,
    avatarUrl: '',
    avatarColor: '#222222',
  },
  {
    id: 'c',
    name: 'Casey',
    email: 'casey@example.com',
    role: 'member',
    isActive: true,
    avatarUrl: '',
    avatarColor: '#333333',
  },
];

const expenses: Expense[] = [
  {
    id: 'exp-1',
    groupId: 'group-1',
    description: 'Dinner',
    amount: 6000,
    paidBy: 'a',
    splitType: 'equal',
    splits: members.map((member) => ({
      memberId: member.id,
      amount: 0,
      percentage: 0,
      isIncluded: true,
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'exp-2',
    groupId: 'group-1',
    description: 'Groceries',
    amount: 3000,
    paidBy: 'b',
    splitType: 'equal',
    splits: members.map((member) => ({
      memberId: member.id,
      amount: 0,
      percentage: 0,
      isIncluded: true,
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

describe('settlement flow integration', () => {
  it('produces debt transactions that settle all balances to zero', () => {
    const balances = calculateBalances(expenses, [], members);
    const debts = simplifyDebts(balances);

    const afterSettlement = { ...balances };
    for (const debt of debts) {
      afterSettlement[debt.from] += debt.amount;
      afterSettlement[debt.to] -= debt.amount;
    }

    expect(Object.values(afterSettlement).every((value) => value === 0)).toBe(true);
  });
});
