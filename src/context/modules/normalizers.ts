import { getAvatarColor } from '../../utils/formatters';
import type {
  Expense,
  ExpenseSplit,
  Group,
  Invite,
  Member,
  Settlement,
} from '../../types';

const toTimestamp = (value?: string | number | null) =>
  value ? new Date(value).getTime() : Date.now();

const toNullableTimestamp = (value?: string | number | null) =>
  value ? new Date(value).getTime() : null;

export const mapMember = (memberRow: any): Member => {
  const profile = memberRow.profiles || {};
  const name = profile.full_name || profile.email || 'Unknown';
  return {
    id: memberRow.user_id,
    name,
    email: profile.email || '',
    role: memberRow.role,
    isActive: memberRow.is_active !== false,
    avatarUrl: profile.avatar_url || '',
    avatarColor: getAvatarColor(name),
  };
};

export const normalizeGroup = (groupRow: any): Group => ({
  id: groupRow.id,
  name: groupRow.name,
  description: groupRow.description || '',
  ownerId: groupRow.owner_id,
  createdAt: toTimestamp(groupRow.created_at),
  updatedAt: toTimestamp(groupRow.updated_at),
  members: (groupRow.group_members || []).map(mapMember),
});

export const normalizeExpense = (row: any): Expense => ({
  id: row.id,
  groupId: row.group_id,
  description: row.description,
  amount: row.amount,
  paidBy: row.paid_by,
  splitType: row.split_type,
  splits: (row.splits || []) as ExpenseSplit[],
  createdAt: toTimestamp(row.created_at),
  updatedAt: toTimestamp(row.updated_at),
});

export const normalizeSettlement = (row: any): Settlement => ({
  id: row.id,
  groupId: row.group_id,
  fromMemberId: row.from_user_id,
  toMemberId: row.to_user_id,
  amount: row.amount,
  createdAt: toTimestamp(row.created_at),
});

export const normalizeInvite = (row: any): Invite => ({
  id: row.id,
  groupId: row.group_id,
  email: row.email,
  status: row.status,
  invitedBy: row.invited_by,
  createdAt: toTimestamp(row.created_at),
  acceptedAt: toNullableTimestamp(row.accepted_at),
});

export const GROUP_BASE_SELECT =
  'id, name, description, owner_id, created_at, updated_at';

export const GROUP_WITH_MEMBERS_SELECT =
  'id, name, description, owner_id, created_at, updated_at, group_members ( user_id, role, is_active, profiles!group_members_user_id_fkey ( id, email, full_name, avatar_url ) )';
