import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getAvatarColor } from '../../utils/formatters';
import { getErrorCode, getErrorMessage } from '../../utils/errors';
import {
  GROUP_BASE_SELECT,
  GROUP_WITH_MEMBERS_SELECT,
  normalizeGroup,
  normalizeInvite,
} from './normalizers';
import type { GroupInviteResult } from '../AppContext.shared';
import type { Group, Invite, Profile } from '../../types';

type GroupsDomainArgs = {
  userId: string;
  userEmail: string;
  onGroupDeleted?: (groupId: string) => void;
};

export type GroupsDomain = {
  profile: Profile | null;
  groups: Group[];
  invitesByGroup: Record<string, Invite[]>;
  getGroups: () => Group[];
  getGroup: (groupId: string) => Promise<Group | null>;
  loadGroups: () => Promise<Group[]>;
  createGroup: (name: string, description?: string) => Promise<Group>;
  deleteGroup: (groupId: string) => Promise<void>;
  addMemberByEmail: (groupId: string, email: string) => Promise<GroupInviteResult>;
  removeMember: (groupId: string, userId: string) => Promise<Group | null>;
  getGroupInvites: (groupId: string) => Promise<Invite[]>;
  deleteInvite: (inviteId: string, groupId: string) => Promise<void>;
  updateProfile: (updates: { fullName: string; avatarUrl: string }) => Promise<Profile>;
};

const isRecoverableCreateGroupRpcError = (error: unknown) => {
  const code = getErrorCode(error);
  if (code === 'PGRST202') {
    return true;
  }

  const message = getErrorMessage(error, '').toLowerCase();
  if (!message) return false;

  if (
    message.includes('on conflict specification') ||
    message.includes('unique or exclusion constraint') ||
    message.includes('profiles_pkey') ||
    message.includes('group_members')
  ) {
    return true;
  }

  if (!message.includes('create_group_with_owner')) return false;

  return (
    message.includes('not found') ||
    message.includes('does not exist') ||
    message.includes('permission denied') ||
    message.includes('schema cache') ||
    message.includes('no function matches')
  );
};

const normalizeCreateGroupError = (error: unknown) => {
  const code = getErrorCode(error);
  const message = getErrorMessage(error, '').toLowerCase();

  if (code === '23503' || message.includes('groups_owner_id_fkey') || message.includes('profiles')) {
    return (
      'Your account profile is missing in the database. ' +
      'In Supabase SQL Editor, re-run `supabase/schema.sql` (or at minimum the profiles backfill section), then try again.'
    );
  }

  if (
    code === '42501' ||
    message.includes('row-level security') ||
    message.includes('not authorized') ||
    message.includes('permission denied')
  ) {
    return (
      'Database permissions are not configured correctly for group creation. ' +
      'Please re-apply `supabase/schema.sql` in your Supabase project.'
    );
  }

  if (
    message.includes('on conflict specification') ||
    message.includes('unique or exclusion constraint') ||
    message.includes('profiles_pkey')
  ) {
    return (
      'Your Supabase schema is out of sync with the app and is missing a required conflict target for group creation. ' +
      'Please re-apply `supabase/schema.sql` in your Supabase project.'
    );
  }

  if (code === 'PGRST202' || message.includes('create_group_with_owner')) {
    return (
      'The `create_group_with_owner` RPC is missing or outdated in Supabase. ' +
      'Please re-apply `supabase/schema.sql` and try again.'
    );
  }

  if (message.includes('not authenticated') || message.includes('jwt')) {
    return 'Your session appears to be expired. Please sign out and sign in again.';
  }

  return getErrorMessage(error, 'Failed to create group.');
};

export function useGroupsDomain({
  userId,
  userEmail,
  onGroupDeleted,
}: GroupsDomainArgs): GroupsDomain {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitesByGroup, setInvitesByGroup] = useState<Record<string, Invite[]>>({});

  const loadProfile = useCallback(async (): Promise<Profile | null> => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to load profile:', error.message);
      return null;
    }
    if (!data) return null;

    const nextProfile = {
      id: data.id,
      email: data.email,
      fullName: data.full_name || data.email || 'User',
      avatarUrl: data.avatar_url || '',
    };

    setProfile(nextProfile);
    return nextProfile;
  }, [userId]);

  const loadGroups = useCallback(async (): Promise<Group[]> => {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('groups')
      .select(GROUP_WITH_MEMBERS_SELECT)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to load groups:', error.message);
      return [];
    }

    const normalized = (data || []).map(normalizeGroup);
    setGroups(normalized);
    return normalized;
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setGroups([]);
      setInvitesByGroup({});
      return;
    }

    void loadProfile();
    void loadGroups();
  }, [userId, loadProfile, loadGroups]);

  const getGroups = useCallback(
    () => groups.slice().sort((a, b) => b.updatedAt - a.updatedAt),
    [groups]
  );

  const getGroup = useCallback(
    async (groupId: string) => {
      const existing = groups.find((group) => group.id === groupId);
      if (existing) return existing;

      const { data, error } = await supabase
        .from('groups')
        .select(GROUP_WITH_MEMBERS_SELECT)
        .eq('id', groupId)
        .single();

      if (error) {
        console.error('Failed to load group:', error.message);
        return null;
      }

      const normalized = normalizeGroup(data);
      setGroups((prev) => {
        const next = prev.filter((group) => group.id !== normalized.id);
        return [normalized, ...next];
      });
      return normalized;
    },
    [groups]
  );

  const createGroup = useCallback(
    async (name: string, description: string = '') => {
      if (!userId) throw new Error('Not authenticated');

      const trimmedName = name?.trim() || '';
      const trimmedDescription = description?.trim() || '';
      if (!trimmedName) {
        throw new Error('Group name is required.');
      }

      const ensureProfileExists = async () => {
        if (profile) return profile;

        const loadedProfile = await loadProfile();
        if (loadedProfile) return loadedProfile;

        throw new Error(
          'Your account profile is missing in the database. ' +
            'In Supabase SQL Editor, run the profile backfill from `supabase/schema.sql` (section: "Backfill profiles for existing users"), then try again.'
        );
      };

      const createGroupDirectly = async () => {
        const { data: groupRow, error: groupError } = await supabase
          .from('groups')
          .insert({
            name: trimmedName,
            description: trimmedDescription || null,
            owner_id: userId,
          })
          .select(GROUP_BASE_SELECT)
          .single();
        if (groupError) throw groupError;

        const { error: memberError } = await supabase.from('group_members').insert({
          group_id: groupRow.id,
          user_id: userId,
          role: 'owner',
          is_active: true,
        });
        if (memberError) {
          await supabase.from('groups').delete().eq('id', groupRow.id);
          throw memberError;
        }

        return groupRow;
      };

      try {
        await ensureProfileExists();

        let data: any = null;
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('create_group_with_owner', {
            name_input: trimmedName,
            description_input: trimmedDescription,
          })
          .maybeSingle();

        if (rpcError) {
          if (!isRecoverableCreateGroupRpcError(rpcError)) {
            throw rpcError;
          }
          data = await createGroupDirectly();
        } else {
          data = rpcData;
        }

        if (!data?.id) {
          throw new Error('Unable to create group due to an unexpected server response.');
        }

        const groupId = data.id;
        if (groupId) {
          const hydrated = await getGroup(groupId);
          if (hydrated) return hydrated;
        }

        const fallbackName = profile?.fullName || userEmail || 'User';
        const normalized = normalizeGroup({
          ...data,
          group_members: [
            {
              user_id: userId,
              role: 'owner',
              is_active: true,
              profiles: {
                id: userId,
                email: profile?.email || userEmail,
                full_name: fallbackName,
                avatar_url: profile?.avatarUrl || '',
              },
            },
          ],
        });

        setGroups((prev) => [normalized, ...prev]);
        return normalized;
      } catch (error) {
        throw new Error(normalizeCreateGroupError(error));
      }
    },
    [getGroup, loadProfile, profile, userEmail, userId]
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) throw error;

      setGroups((prev) => prev.filter((group) => group.id !== groupId));
      setInvitesByGroup((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      onGroupDeleted?.(groupId);
    },
    [onGroupDeleted]
  );

  const getGroupInvites = useCallback(async (groupId: string) => {
    const { data, error } = await supabase
      .from('group_invites')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load invites:', error.message);
      return [];
    }

    const normalized = (data || []).map(normalizeInvite);
    setInvitesByGroup((prev) => ({ ...prev, [groupId]: normalized }));
    return normalized;
  }, []);

  const addMemberByEmail = useCallback(
    async (groupId: string, email: string): Promise<GroupInviteResult> => {
      const { data, error } = await supabase.rpc('create_group_invite', {
        group_id_input: groupId,
        email_input: email,
      });
      if (error) throw error;

      const status = data?.[0]?.status || 'pending';
      let group: Group | null = null;
      if (status === 'member_added') {
        const updated = await loadGroups();
        group = updated.find((item) => item.id === groupId) || null;
      }

      await getGroupInvites(groupId);
      return { status, group };
    },
    [getGroupInvites, loadGroups]
  );

  const removeMember = useCallback(
    async (groupId: string, memberId: string) => {
      const { error } = await supabase
        .from('group_members')
        .update({
          is_active: false,
          removed_at: new Date().toISOString(),
        })
        .eq('group_id', groupId)
        .eq('user_id', memberId);
      if (error) throw error;

      const updated = await loadGroups();
      return updated.find((group) => group.id === groupId) || null;
    },
    [loadGroups]
  );

  const deleteInvite = useCallback(async (inviteId: string, groupId: string) => {
    const { error } = await supabase.from('group_invites').delete().eq('id', inviteId);
    if (error) throw error;

    setInvitesByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((invite) => invite.id !== inviteId),
    }));
  }, []);

  const updateProfile = useCallback(
    async ({ fullName, avatarUrl }: { fullName: string; avatarUrl: string }) => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
        })
        .eq('id', userId)
        .select('id, email, full_name, avatar_url')
        .single();
      if (error) throw error;

      const nextProfile = {
        id: data.id,
        email: data.email,
        fullName: data.full_name || data.email || 'User',
        avatarUrl: data.avatar_url || '',
      };

      setProfile(nextProfile);
      setGroups((prev) =>
        prev.map((group) => ({
          ...group,
          members: group.members.map((member) =>
            member.id === userId
              ? {
                  ...member,
                  name: nextProfile.fullName,
                  email: nextProfile.email,
                  avatarUrl: nextProfile.avatarUrl,
                  avatarColor: getAvatarColor(nextProfile.fullName),
                }
              : member
          ),
        }))
      );

      return nextProfile;
    },
    [userId]
  );

  return useMemo(
    () => ({
      profile,
      groups,
      invitesByGroup,
      getGroups,
      getGroup,
      loadGroups,
      createGroup,
      deleteGroup,
      addMemberByEmail,
      removeMember,
      getGroupInvites,
      deleteInvite,
      updateProfile,
    }),
    [
      profile,
      groups,
      invitesByGroup,
      getGroups,
      getGroup,
      loadGroups,
      createGroup,
      deleteGroup,
      addMemberByEmail,
      removeMember,
      getGroupInvites,
      deleteInvite,
      updateProfile,
    ]
  );
}
