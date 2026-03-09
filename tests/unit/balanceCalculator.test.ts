import { describe, expect, it } from 'vitest';
import { calculateBalances, calculateShares } from '../../src/utils/balanceCalculator';
import type { Expense, Member, Settlement } from '../../src/types';

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

function buildExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'exp-1',
    groupId: 'group-1',
    description: 'Dinner',
    amount: 100,
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
    ...overrides,
  };
}

describe('balanceCalculator', () => {
  it('distributes remainder cents for equal splits', () => {
    const expense = buildExpense({ amount: 100, splitType: 'equal' });
    const shares = calculateShares(expense);

    expect(shares).toEqual({
      a: 34,
      b: 33,
      c: 33,
    });
  });

  it('keeps balances net zero after expenses and settlements', () => {
    const expense = buildExpense({ amount: 1200, splitType: 'equal', paidBy: 'a' });
    const settlements: Settlement[] = [
      {
        id: 'set-1',
        groupId: 'group-1',
        fromMemberId: 'b',
        toMemberId: 'a',
        amount: 200,
        createdAt: Date.now(),
      },
    ];

    const balances = calculateBalances([expense], settlements, members);
    const net = Object.values(balances).reduce((sum, value) => sum + value, 0);

    expect(net).toBe(0);
    expect(balances.a).toBe(600);
    expect(balances.b).toBe(-200);
    expect(balances.c).toBe(-400);
  });
});
