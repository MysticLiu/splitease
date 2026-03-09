-- SplitEase Supabase schema (run in Supabase SQL editor)
-- Idempotent and backward-compatible with older enum-based schemas.

create extension if not exists "pgcrypto";

-- Profiles linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text;

update public.profiles
set display_name = coalesce(display_name, full_name, email, 'User')
where display_name is null;

-- Groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Group membership
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  is_active boolean not null default true,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_members
  add column if not exists role text,
  add column if not exists is_active boolean not null default true,
  add column if not exists removed_at timestamptz;

-- Convert legacy enum/varchar role columns to text.
alter table public.group_members alter column role drop default;
alter table public.group_members alter column role type text using role::text;

update public.group_members
set role = lower(coalesce(role, 'member'));

update public.group_members
set role = 'member'
where role not in ('owner', 'admin', 'member');

alter table public.group_members alter column role set not null;
alter table public.group_members alter column role set default 'member';

alter table public.group_members drop constraint if exists group_members_role_check;
alter table public.group_members
  add constraint group_members_role_check check (role in ('owner', 'admin', 'member'));

create unique index if not exists group_members_owner_unique
  on public.group_members (group_id)
  where role = 'owner' and is_active;

-- Group invites (for non-users)
create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.group_invites
  add column if not exists status text not null default 'pending';

-- Convert legacy enum/varchar status columns to text.
alter table public.group_invites alter column status drop default;
alter table public.group_invites alter column status type text using status::text;

update public.group_invites
set email = lower(trim(email)),
    status = lower(coalesce(status, 'pending'));

update public.group_invites
set status = 'pending'
where status not in ('pending', 'accepted', 'canceled');

alter table public.group_invites alter column status set default 'pending';

alter table public.group_invites drop constraint if exists group_invites_status_check;
alter table public.group_invites
  add constraint group_invites_status_check check (status in ('pending', 'accepted', 'canceled'));

alter table public.group_invites drop constraint if exists group_invites_email_lower_check;
alter table public.group_invites
  add constraint group_invites_email_lower_check check (email = lower(email));

create index if not exists group_invites_group_idx on public.group_invites (group_id);
create unique index if not exists group_invites_pending_unique
  on public.group_invites (group_id, email)
  where status = 'pending';

-- Expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  description text not null,
  amount integer not null,
  paid_by uuid not null references public.profiles(id) on delete restrict,
  split_type text not null,
  splits jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses drop constraint if exists expenses_amount_positive_check;
alter table public.expenses
  add constraint expenses_amount_positive_check check (amount > 0);

alter table public.expenses drop constraint if exists expenses_description_present_check;
alter table public.expenses
  add constraint expenses_description_present_check check (char_length(btrim(description)) > 0);

alter table public.expenses drop constraint if exists expenses_description_length_check;
alter table public.expenses
  add constraint expenses_description_length_check check (char_length(btrim(description)) <= 100);

alter table public.expenses drop constraint if exists expenses_split_type_check;
alter table public.expenses
  add constraint expenses_split_type_check check (split_type in ('equal', 'custom', 'percentage'));

alter table public.expenses drop constraint if exists expenses_splits_array_check;
alter table public.expenses
  add constraint expenses_splits_array_check check (jsonb_typeof(splits) = 'array');

-- Settlements
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete restrict,
  to_user_id uuid not null references public.profiles(id) on delete restrict,
  amount integer not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.settlements drop constraint if exists settlements_amount_positive_check;
alter table public.settlements
  add constraint settlements_amount_positive_check check (amount > 0);

alter table public.settlements drop constraint if exists settlements_distinct_users_check;
alter table public.settlements
  add constraint settlements_distinct_users_check check (from_user_id <> to_user_id);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_groups_updated_at on public.groups;
create trigger set_groups_updated_at
before update on public.groups
for each row execute procedure public.set_updated_at();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
before update on public.expenses
for each row execute procedure public.set_updated_at();

create or replace function public.touch_group()
returns trigger
language plpgsql
as $$
begin
  update public.groups
  set updated_at = now()
  where id = coalesce(new.group_id, old.group_id);
  return null;
end;
$$;

drop trigger if exists touch_group_on_expenses on public.expenses;
create trigger touch_group_on_expenses
after insert or update or delete on public.expenses
for each row execute procedure public.touch_group();

drop trigger if exists touch_group_on_settlements on public.settlements;
create trigger touch_group_on_settlements
after insert or update or delete on public.settlements
for each row execute procedure public.touch_group();

drop trigger if exists touch_group_on_members on public.group_members;
create trigger touch_group_on_members
after insert or update or delete on public.group_members
for each row execute procedure public.touch_group();

drop trigger if exists touch_group_on_invites on public.group_invites;
create trigger touch_group_on_invites
after insert or update or delete on public.group_invites
for each row execute procedure public.touch_group();

create or replace function public.enforce_group_member_limit()
returns trigger
language plpgsql
as $$
declare
  active_count int;
begin
  if tg_op = 'UPDATE' and old.is_active and not new.is_active then
    if exists (
      select 1 from public.groups g
      where g.id = new.group_id
        and g.owner_id = new.user_id
    ) then
      raise exception 'Cannot deactivate group owner';
    end if;

    if new.removed_at is null then
      new.removed_at = now();
    end if;
  end if;

  if new.is_active and (tg_op = 'INSERT' or (tg_op = 'UPDATE' and not old.is_active)) then
    new.removed_at = null;

    select count(*) into active_count
    from public.group_members
    where group_id = new.group_id
      and is_active;

    if active_count >= 10 then
      raise exception 'Group member limit reached (10).';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_group_member_limit on public.group_members;
create trigger enforce_group_member_limit
before insert or update of is_active on public.group_members
for each row execute procedure public.enforce_group_member_limit();

create or replace function public.upsert_profile_row(
  profile_id_input uuid,
  email_input text,
  full_name_input text,
  display_name_input text
)
returns void
language plpgsql
set search_path = public
as $$
begin
  update public.profiles p
  set email = coalesce(email_input, p.email),
      full_name = coalesce(p.full_name, full_name_input),
      display_name = coalesce(p.display_name, display_name_input)
  where p.id = profile_id_input;

  if found then
    return;
  end if;

  begin
    insert into public.profiles (id, email, full_name, display_name)
    values (
      profile_id_input,
      email_input,
      full_name_input,
      coalesce(display_name_input, full_name_input, email_input, 'User')
    );
  exception when unique_violation then
    update public.profiles p
    set email = coalesce(email_input, p.email),
        full_name = coalesce(p.full_name, full_name_input),
        display_name = coalesce(p.display_name, display_name_input)
    where p.id = profile_id_input;
  end;
end;
$$;

create or replace function public.upsert_group_member_row(
  group_id_input uuid,
  user_id_input uuid,
  role_input text default null,
  is_active_input boolean default true
)
returns void
language plpgsql
set search_path = public
as $$
declare
  next_is_active boolean := coalesce(is_active_input, true);
begin
  update public.group_members gm
  set role = coalesce(role_input, gm.role),
      is_active = next_is_active,
      removed_at = case
        when next_is_active then null
        else coalesce(gm.removed_at, now())
      end
  where gm.group_id = group_id_input
    and gm.user_id = user_id_input;

  if found then
    return;
  end if;

  begin
    insert into public.group_members (group_id, user_id, role, is_active, removed_at)
    values (
      group_id_input,
      user_id_input,
      coalesce(role_input, 'member'),
      next_is_active,
      case when next_is_active then null else now() end
    );
  exception when unique_violation then
    update public.group_members gm
    set role = coalesce(role_input, gm.role),
        is_active = next_is_active,
        removed_at = case
          when next_is_active then null
          else coalesce(gm.removed_at, now())
        end
    where gm.group_id = group_id_input
      and gm.user_id = user_id_input;
  end;
end;
$$;

-- Create profile on signup + auto-accept pending invites
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite record;
  resolved_name text;
begin
  resolved_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.email
  );

  perform public.upsert_profile_row(
    new.id,
    new.email,
    resolved_name,
    coalesce(resolved_name, new.email, 'User')
  );

  for invite in
    select gi.id, gi.group_id
    from public.group_invites gi
    where gi.status = 'pending'
      and lower(gi.email) = lower(new.email)
  loop
    begin
      perform public.upsert_group_member_row(invite.group_id, new.id, null, true);

      update public.group_invites
      set status = 'accepted', accepted_at = now()
      where id = invite.id;
    exception when others then
      -- Ignore invite failures (for example, member limit reached)
      null;
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill profiles for existing users (safe to re-run)
do $$
declare
  user_row record;
begin
  for user_row in
    select
      u.id,
      u.email,
      coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email) as full_name,
      coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email, 'User') as display_name
    from auth.users u
  loop
    perform public.upsert_profile_row(
      user_row.id,
      user_row.email,
      user_row.full_name,
      user_row.display_name
    );
  end loop;
end;
$$;

-- Drop helper functions first so parameter-name mismatches in legacy DBs do not fail reruns.
drop function if exists public.find_profile_by_email(text);
drop function if exists public.has_group_member(uuid, uuid) cascade;
drop function if exists public.is_group_member(uuid, uuid) cascade;
drop function if exists public.is_group_admin(uuid, uuid) cascade;
drop function if exists public.create_group_with_owner(text, text) cascade;
drop function if exists public.create_group_invite(uuid, text) cascade;

-- Helper RPC: lookup user by email (for invites)
create or replace function public.find_profile_by_email(email_input text)
returns table (id uuid, email text, full_name text)
language sql
security definer
set search_path = public
as $$
  select p.id,
         p.email,
         coalesce(p.display_name, p.full_name, p.email) as full_name
  from public.profiles p
  where lower(p.email) = lower(email_input)
  limit 1;
$$;

grant execute on function public.find_profile_by_email(text) to authenticated;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.expenses enable row level security;
alter table public.settlements enable row level security;

-- Helper: avoid RLS recursion when checking membership
create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = gid
      and gm.user_id = uid
      and gm.is_active
  );
$$;

grant execute on function public.is_group_member(uuid, uuid) to authenticated;

create or replace function public.has_group_member(gid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = gid
      and gm.user_id = uid
  );
$$;

grant execute on function public.has_group_member(uuid, uuid) to authenticated;

create or replace function public.is_group_admin(gid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups g
    where g.id = gid
      and g.owner_id = uid
  )
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = gid
      and gm.user_id = uid
      and gm.is_active
      and gm.role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_group_admin(uuid, uuid) to authenticated;

-- Helper RPC: create group + owner membership atomically
create or replace function public.create_group_with_owner(
  name_input text,
  description_input text default ''
)
returns table (
  id uuid,
  name text,
  description text,
  owner_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_group public.groups%rowtype;
  owner_email text;
  owner_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select u.email,
         coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email)
    into owner_email, owner_name
  from auth.users u
  where u.id = auth.uid();

  perform public.upsert_profile_row(
    auth.uid(),
    owner_email,
    owner_name,
    coalesce(owner_name, owner_email, 'User')
  );

  insert into public.groups (name, description, owner_id)
  values (trim(name_input), nullif(trim(description_input), ''), auth.uid())
  returning * into new_group;

  perform public.upsert_group_member_row(new_group.id, auth.uid(), 'owner', true);

  return query
  select
    new_group.id,
    new_group.name,
    new_group.description,
    new_group.owner_id,
    new_group.created_at,
    new_group.updated_at;
end;
$$;

grant execute on function public.create_group_with_owner(text, text) to authenticated;

create or replace function public.create_group_invite(group_id_input uuid, email_input text)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(email_input, '')));
  existing_profile uuid;
  existing_invite uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if normalized_email = '' then
    raise exception 'Email is required';
  end if;

  if not public.is_group_admin(group_id_input, auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select p.id into existing_profile
  from public.profiles p
  where lower(p.email) = normalized_email
  limit 1;

  if existing_profile is not null then
    perform public.upsert_group_member_row(group_id_input, existing_profile, null, true);

    return query select null::uuid, 'member_added'::text;
    return;
  end if;

  select gi.id into existing_invite
  from public.group_invites gi
  where gi.group_id = group_id_input
    and gi.status = 'pending'
    and gi.email = normalized_email
  limit 1;

  if existing_invite is not null then
    return query select existing_invite, 'pending'::text;
    return;
  end if;

  return query
  insert into public.group_invites (group_id, email, invited_by, status)
  values (group_id_input, normalized_email, auth.uid(), 'pending')
  returning public.group_invites.id, public.group_invites.status;
end;
$$;

grant execute on function public.create_group_invite(uuid, text) to authenticated;

create or replace function public.validate_expense_row()
returns trigger
language plpgsql
set search_path = public, auth
as $$
declare
  split jsonb;
  seen_member_ids text[] := array[]::text[];
  member_id_text text;
  member_id uuid;
  split_amount_numeric numeric;
  split_percentage numeric;
  included_count int := 0;
  custom_total int := 0;
  percentage_total numeric := 0;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
  else
    if new.group_id is distinct from old.group_id then
      raise exception 'Expense group cannot be changed.';
    end if;
    new.created_by := old.created_by;
  end if;

  new.description := btrim(coalesce(new.description, ''));
  new.split_type := lower(btrim(coalesce(new.split_type, '')));
  new.splits := coalesce(new.splits, '[]'::jsonb);

  if new.group_id is null then
    raise exception 'Expense group is required.';
  end if;

  if new.description = '' then
    raise exception 'Expense description is required.';
  end if;

  if char_length(new.description) > 100 then
    raise exception 'Expense description must be 100 characters or less.';
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'Expense amount must be greater than zero.';
  end if;

  if new.split_type not in ('equal', 'custom', 'percentage') then
    raise exception 'Expense split type must be equal, custom, or percentage.';
  end if;

  if coalesce(jsonb_typeof(new.splits), '') <> 'array' then
    raise exception 'Expense splits must be an array.';
  end if;

  if new.created_by is null then
    raise exception 'Expense creator is required.';
  end if;

  if not public.has_group_member(new.group_id, new.created_by) then
    raise exception 'Expense creator must belong to the group.';
  end if;

  if new.paid_by is null then
    raise exception 'Expense payer is required.';
  end if;

  if not public.has_group_member(new.group_id, new.paid_by) then
    raise exception 'Expense payer must belong to the group.';
  end if;

  for split in
    select value
    from jsonb_array_elements(new.splits)
  loop
    if jsonb_typeof(split) <> 'object' then
      raise exception 'Each expense split must be an object.';
    end if;

    member_id_text := btrim(coalesce(split->>'memberId', ''));
    if member_id_text = '' then
      raise exception 'Each expense split must include memberId.';
    end if;

    if member_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Expense split memberId must be a valid UUID.';
    end if;

    if member_id_text = any(seen_member_ids) then
      raise exception 'Expense splits cannot include the same member more than once.';
    end if;
    seen_member_ids := array_append(seen_member_ids, member_id_text);

    member_id := member_id_text::uuid;
    if not public.has_group_member(new.group_id, member_id) then
      raise exception 'Expense split members must belong to the group.';
    end if;

    if coalesce(jsonb_typeof(split->'isIncluded'), '') <> 'boolean' then
      raise exception 'Each expense split must include a boolean isIncluded value.';
    end if;

    if new.split_type = 'custom' then
      if coalesce(jsonb_typeof(split->'amount'), '') <> 'number' then
        raise exception 'Custom expense splits must include a numeric amount.';
      end if;

      split_amount_numeric := (split->>'amount')::numeric;
      if split_amount_numeric <> trunc(split_amount_numeric) then
        raise exception 'Custom split amounts must be whole cents.';
      end if;
      if split_amount_numeric < 0 then
        raise exception 'Custom split amounts cannot be negative.';
      end if;
    elsif new.split_type = 'percentage' then
      if coalesce(jsonb_typeof(split->'percentage'), '') <> 'number' then
        raise exception 'Percentage expense splits must include a numeric percentage.';
      end if;

      split_percentage := (split->>'percentage')::numeric;
      if split_percentage < 0 or split_percentage > 100 then
        raise exception 'Split percentages must be between 0 and 100.';
      end if;
    end if;

    if (split->>'isIncluded')::boolean then
      included_count := included_count + 1;

      if new.split_type = 'custom' then
        custom_total := custom_total + split_amount_numeric::int;
      elsif new.split_type = 'percentage' then
        percentage_total := percentage_total + split_percentage;
      end if;
    end if;
  end loop;

  if included_count = 0 then
    raise exception 'At least one group member must be included in an expense split.';
  end if;

  if new.split_type = 'custom' and custom_total <> new.amount then
    raise exception 'Custom split amounts must add up to the full expense amount.';
  end if;

  if new.split_type = 'percentage' and abs(percentage_total - 100::numeric) > 0.01 then
    raise exception 'Percentage splits must add up to 100.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_expense_row on public.expenses;
create trigger validate_expense_row
before insert or update on public.expenses
for each row execute procedure public.validate_expense_row();

create or replace function public.validate_settlement_row()
returns trigger
language plpgsql
set search_path = public, auth
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
  else
    if new.group_id is distinct from old.group_id then
      raise exception 'Settlement group cannot be changed.';
    end if;
    new.created_by := old.created_by;
  end if;

  if new.group_id is null then
    raise exception 'Settlement group is required.';
  end if;

  if new.created_by is null then
    raise exception 'Settlement creator is required.';
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'Settlement amount must be greater than zero.';
  end if;

  if new.from_user_id is null or new.to_user_id is null then
    raise exception 'Settlement participants are required.';
  end if;

  if new.from_user_id = new.to_user_id then
    raise exception 'Settlement payer and recipient must be different group members.';
  end if;

  if not public.has_group_member(new.group_id, new.created_by) then
    raise exception 'Settlement creator must belong to the group.';
  end if;

  if not public.has_group_member(new.group_id, new.from_user_id) then
    raise exception 'Settlement payer must belong to the group.';
  end if;

  if not public.has_group_member(new.group_id, new.to_user_id) then
    raise exception 'Settlement recipient must belong to the group.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_settlement_row on public.settlements;
create trigger validate_settlement_row
before insert or update on public.settlements
for each row execute procedure public.validate_settlement_row();

-- Profiles policies
drop policy if exists "Profiles: read own" on public.profiles;
create policy "Profiles: read own" on public.profiles
for select using (id = auth.uid());

drop policy if exists "Profiles: read group peers" on public.profiles;
create policy "Profiles: read group peers" on public.profiles
for select using (
  exists (
    select 1
    from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid()
      and gm1.is_active
      and gm2.user_id = public.profiles.id
      and gm2.is_active
  )
);

drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own" on public.profiles
for update using (id = auth.uid());

-- Groups policies
drop policy if exists "Groups: members can read" on public.groups;
create policy "Groups: members can read" on public.groups
for select using (public.is_group_member(public.groups.id, auth.uid()));

drop policy if exists "Groups: owners can create" on public.groups;
create policy "Groups: owners can create" on public.groups
for insert with check (auth.uid() = owner_id);

drop policy if exists "Groups: owners can update" on public.groups;
create policy "Groups: owners can update" on public.groups
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Groups: owners can delete" on public.groups;
create policy "Groups: owners can delete" on public.groups
for delete using (auth.uid() = owner_id);

-- Group members policies
drop policy if exists "Members: group members can read" on public.group_members;
create policy "Members: group members can read" on public.group_members
for select using (public.is_group_member(public.group_members.group_id, auth.uid()));

drop policy if exists "Members: group members can add" on public.group_members;
drop policy if exists "Members: admins can add" on public.group_members;
create policy "Members: admins can add" on public.group_members
for insert with check (
  public.is_group_admin(public.group_members.group_id, auth.uid())
  and public.group_members.is_active
);

drop policy if exists "Members: admins can update" on public.group_members;
create policy "Members: admins can update" on public.group_members
for update using (
  public.is_group_admin(public.group_members.group_id, auth.uid())
  and public.group_members.user_id <> (
    select g.owner_id from public.groups g where g.id = public.group_members.group_id
  )
) with check (
  public.is_group_admin(public.group_members.group_id, auth.uid())
  and public.group_members.user_id <> (
    select g.owner_id from public.groups g where g.id = public.group_members.group_id
  )
);

drop policy if exists "Members: group members can remove non-owners" on public.group_members;

-- Group invites policies
drop policy if exists "Invites: group members can read" on public.group_invites;
create policy "Invites: group members can read" on public.group_invites
for select using (public.is_group_member(public.group_invites.group_id, auth.uid()));

drop policy if exists "Invites: admins can add" on public.group_invites;
create policy "Invites: admins can add" on public.group_invites
for insert with check (
  public.is_group_admin(public.group_invites.group_id, auth.uid())
);

drop policy if exists "Invites: admins can update" on public.group_invites;
create policy "Invites: admins can update" on public.group_invites
for update using (
  public.is_group_admin(public.group_invites.group_id, auth.uid())
);

drop policy if exists "Invites: admins can delete" on public.group_invites;
create policy "Invites: admins can delete" on public.group_invites
for delete using (
  public.is_group_admin(public.group_invites.group_id, auth.uid())
);

-- Expenses policies
drop policy if exists "Expenses: group members can read" on public.expenses;
create policy "Expenses: group members can read" on public.expenses
for select using (public.is_group_member(public.expenses.group_id, auth.uid()));

drop policy if exists "Expenses: group members can add" on public.expenses;
create policy "Expenses: group members can add" on public.expenses
for insert with check (public.is_group_member(public.expenses.group_id, auth.uid()));

drop policy if exists "Expenses: group members can update" on public.expenses;
create policy "Expenses: group members can update" on public.expenses
for update using (public.is_group_member(public.expenses.group_id, auth.uid()));

drop policy if exists "Expenses: group members can delete" on public.expenses;
create policy "Expenses: group members can delete" on public.expenses
for delete using (public.is_group_member(public.expenses.group_id, auth.uid()));

-- Settlements policies
drop policy if exists "Settlements: group members can read" on public.settlements;
create policy "Settlements: group members can read" on public.settlements
for select using (public.is_group_member(public.settlements.group_id, auth.uid()));

drop policy if exists "Settlements: group members can add" on public.settlements;
create policy "Settlements: group members can add" on public.settlements
for insert with check (public.is_group_member(public.settlements.group_id, auth.uid()));

drop policy if exists "Settlements: group members can delete" on public.settlements;
create policy "Settlements: group members can delete" on public.settlements
for delete using (public.is_group_member(public.settlements.group_id, auth.uid()));
