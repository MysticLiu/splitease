# SplitEase Project Guide (Persistent Context)

## Overview
- SplitEase is a Splitwise-style expense sharing app.
- Frontend-only app with Supabase for auth + database + RLS.
- All money amounts are stored as integer cents.

## Tech stack and versions
- React 18.3, React Router 7.12
- Vite 5.4, TypeScript 5.9
- Tailwind CSS 3.4
- Supabase JS 2.49 (auth + database + RLS)
- Playwright 1.58 for E2E

## Project structure
- `src/`
  - `App.tsx` routes + auth guard
  - `context/AppContext.tsx` data layer (Supabase calls + cached state)
  - `lib/supabaseClient.ts` Supabase client setup
  - `pages/` route-level screens (Auth, Home, Groups, Group Detail, Profile)
  - `components/` UI + domain components
    - `groups/`, `expenses/`, `balances/`, `layout/`, `ui/`
  - `utils/` formatters, validators, balance logic
  - `types/` shared type definitions
- `supabase/schema.sql` database schema, triggers, RPCs, RLS
- `tests/` Playwright E2E tests

## Commands
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:e2e`
- `npm run test:e2e:ui`

## Environment
- `.env.local` must define:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- `.env.e2e` for Playwright (see `.env.e2e.example`)

## Supabase schema highlights
- Tables: `profiles`, `groups`, `group_members`, `group_invites`, `expenses`, `settlements`
- RPCs: `create_group_with_owner`, `create_group_invite`, `find_profile_by_email`
- Triggers: `handle_new_user` (create profile + auto-accept invites), `set_updated_at`, `touch_group`
- RLS enabled on all tables; membership checks via `is_group_member` / `is_group_admin`
- Group member limit enforced in DB (10 active members)

## Style and code conventions
- Prefer `useApp()` from `AppContext` for data access.
- Keep amounts in cents; format with `formatCurrency` and parse with `parseCurrencyToCents`.
- Tailwind-first styling, using the existing UI components (`Button`, `Input`, `Modal`, etc.).
- Favor simple, readable React components with explicit props.

## Do-not-touch rules
- Do not edit `supabase/schema.sql` without coordinating DB changes and re-applying in Supabase.
- Do not commit generated artifacts (`dist/`, `node_modules/`, `test-results/`).

## Scoped instructions (claude.md)
- None found in subdirectories.
