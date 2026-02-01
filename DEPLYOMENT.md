# Deployment Guide (Short)

## Purpose
- Keep the project runnable without any local machine.
- Track whether cloud setup remains complete and current.

## Source of truth
- Code: GitHub repo
- Frontend: Vercel (builds from GitHub)
- Backend + auth + DB: Supabase

## Required Vercel env vars
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase setup
- Run `supabase/schema.sql` in the Supabase SQL editor.
- Add redirect URLs for both localhost and the Vercel domain.
- Confirm RLS is enabled on all tables (already in schema).

## Progress checklist
- [ ] GitHub repo is up to date with all required files.
- [ ] Vercel project connected to GitHub.
- [ ] Vercel env vars set for Production + Preview.
- [ ] Supabase schema applied and auth redirects configured.
- [ ] Production site loads and auth works end-to-end.

## Quick verify (manual)
- Sign in / sign up.
- Create a group.
- Add an expense.
- View balances and record a settlement.
