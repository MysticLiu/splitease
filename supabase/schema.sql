-- SplitEase Supabase schema (run in Supabase SQL editor)
-- NOTE: This will create tables, triggers, and RLS policies for multi-user sharing.

create extension if not exists "pgcrypto";

-- Profiles linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

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

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill profiles for existing users (safe to re-run)
insert into public.profiles (id, email, full_name)
select id,
       email,
       coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email)
from auth.users
on conflict (id) do nothing;

-- Helper RPC: lookup user by email (for invites)
create or replace function public.find_profile_by_email(email_input text)
returns table (id uuid, email text, full_name text)
language sql
security definer
set search_path = public
as $$
  select id, email, full_name
  from public.profiles
  where lower(email) = lower(email_input)
  limit 1;
$$;

grant execute on function public.find_profile_by_email(text) to authenticated;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.settlements enable row level security;

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
      and gm2.user_id = public.profiles.id
  )
);

drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own" on public.profiles
for update using (id = auth.uid());

-- Groups policies
drop policy if exists "Groups: members can read" on public.groups;
create policy "Groups: members can read" on public.groups
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.groups.id
      and gm.user_id = auth.uid()
  )
);

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
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.group_members.group_id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists "Members: group members can add" on public.group_members;
create policy "Members: group members can add" on public.group_members
for insert with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.group_members.group_id
      and gm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.groups g
    where g.id = public.group_members.group_id
      and g.owner_id = auth.uid()
  )
);

drop policy if exists "Members: group members can remove non-owners" on public.group_members;
create policy "Members: group members can remove non-owners" on public.group_members
for delete using (
  public.group_members.user_id <> (
    select g.owner_id from public.groups g where g.id = public.group_members.group_id
  )
  and exists (
    select 1 from public.group_members gm
    where gm.group_id = public.group_members.group_id
      and gm.user_id = auth.uid()
  )
);

-- Expenses policies
drop policy if exists "Expenses: group members can read" on public.expenses;
create policy "Expenses: group members can read" on public.expenses
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.expenses.group_id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists "Expenses: group members can add" on public.expenses;
create policy "Expenses: group members can add" on public.expenses
for insert with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.expenses.group_id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists "Expenses: group members can update" on public.expenses;
create policy "Expenses: group members can update" on public.expenses
for update using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.expenses.group_id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists "Expenses: group members can delete" on public.expenses;
create policy "Expenses: group members can delete" on public.expenses
for delete using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.expenses.group_id
      and gm.user_id = auth.uid()
  )
);

-- Settlements policies
drop policy if exists "Settlements: group members can read" on public.settlements;
create policy "Settlements: group members can read" on public.settlements
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.settlements.group_id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists "Settlements: group members can add" on public.settlements;
create policy "Settlements: group members can add" on public.settlements
for insert with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.settlements.group_id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists "Settlements: group members can delete" on public.settlements;
create policy "Settlements: group members can delete" on public.settlements
for delete using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.settlements.group_id
      and gm.user_id = auth.uid()
  )
);
