export const SPLIT_TYPES = {
  EQUAL: 'equal',
  CUSTOM: 'custom',
  PERCENTAGE: 'percentage',
} as const;

export type SplitType = typeof SPLIT_TYPES[keyof typeof SPLIT_TYPES];

export const SPLIT_TYPE_LABELS: Record<SplitType, string> = {
  [SPLIT_TYPES.EQUAL]: 'Split Equally',
  [SPLIT_TYPES.CUSTOM]: 'Custom Amounts',
  [SPLIT_TYPES.PERCENTAGE]: 'By Percentage',
};
