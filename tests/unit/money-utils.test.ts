import { describe, expect, it } from 'vitest';
import { formatCurrency, parseCurrencyToCents } from '../../src/utils/formatters';
import {
  validateAmount,
  validateCustomSplits,
  validateDescription,
  validateGroupName,
  validatePercentageSplits,
} from '../../src/utils/validators';

describe('money utility guardrails', () => {
  it('parses currency text into cents', () => {
    expect(parseCurrencyToCents('$12.34')).toBe(1234);
    expect(parseCurrencyToCents('abc')).toBe(0);
  });

  it('formats cents as USD currency', () => {
    expect(formatCurrency(1234)).toBe('$12.34');
  });

  it('validates required group and description fields', () => {
    expect(validateGroupName('')).toBe('Group name is required');
    expect(validateDescription('')).toBe('Description is required');
    expect(validateGroupName('Trip Fund')).toBeNull();
    expect(validateDescription('Dinner')).toBeNull();
  });

  it('validates amounts and split constraints', () => {
    expect(validateAmount(0)).toBe('Amount must be greater than zero');
    expect(validateAmount(500)).toBeNull();

    expect(
      validateCustomSplits(
        [
          { isIncluded: true, amount: 300 },
          { isIncluded: true, amount: 200 },
        ],
        500
      )
    ).toBeNull();

    expect(
      validatePercentageSplits([
        { isIncluded: true, percentage: 70 },
        { isIncluded: true, percentage: 30 },
      ])
    ).toBeNull();
  });
});
