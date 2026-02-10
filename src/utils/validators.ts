// Validate group name
export function validateGroupName(name: string) {
  if (!name || name.trim().length === 0) {
    return 'Group name is required';
  }
  if (name.length > 50) {
    return 'Group name must be 50 characters or less';
  }
  return null;
}

// Validate expense amount
export function validateAmount(cents: number) {
  if (!cents || cents <= 0) {
    return 'Amount must be greater than zero';
  }
  if (cents > 100000000) { // $1,000,000 max
    return 'Amount is too large';
  }
  return null;
}

// Validate expense description
export function validateDescription(description: string) {
  if (!description || description.trim().length === 0) {
    return 'Description is required';
  }
  if (description.length > 100) {
    return 'Description must be 100 characters or less';
  }
  return null;
}

// Validate custom split amounts
type SplitInput = { isIncluded: boolean; amount?: number };
export function validateCustomSplits(splits: SplitInput[], totalAmount: number) {
  const includedSplits = splits.filter(s => s.isIncluded);

  if (includedSplits.length === 0) {
    return 'At least one person must be included';
  }

  const totalSplit = includedSplits.reduce((sum, s) => sum + (s.amount || 0), 0);

  if (totalSplit !== totalAmount) {
    const diff = totalAmount - totalSplit;
    const diffFormatted = (Math.abs(diff) / 100).toFixed(2);
    if (diff > 0) {
      return `Split amounts are $${diffFormatted} short of the total`;
    } else {
      return `Split amounts exceed the total by $${diffFormatted}`;
    }
  }

  return null;
}

// Validate percentage splits
type PercentageSplitInput = { isIncluded: boolean; percentage?: number };
export function validatePercentageSplits(splits: PercentageSplitInput[]) {
  const includedSplits = splits.filter(s => s.isIncluded);

  if (includedSplits.length === 0) {
    return 'At least one person must be included';
  }

  const totalPercentage = includedSplits.reduce((sum, s) => sum + (s.percentage || 0), 0);

  if (Math.abs(totalPercentage - 100) > 0.01) {
    return `Percentages must add up to 100% (currently ${totalPercentage.toFixed(1)}%)`;
  }

  return null;
}

