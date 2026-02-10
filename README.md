# SplitEase

Split expenses with friends, roommates, or groups using React + Supabase.

## Features
- Email/password auth + Google sign-in
- Group creation and member management
- Expense tracking with equal/custom/percentage splits
- Balance calculation and settlement recording
- Invites for non-members (auto-accept on signup)

## Tech stack
- React + Vite
- Tailwind CSS
- Supabase (auth + database + RLS)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Supabase project.
3. In the Supabase SQL editor, run `supabase/schema.sql`.
4. Configure Auth redirect URLs in Supabase:
   - `http://localhost:5173` (development)
   - your production domain (when deployed)
5. Create `.env.local`:
   ```bash
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```
6. Start the dev server:
   ```bash
   npm run dev
   ```

## Type checking
```bash
npm run typecheck
```

## E2E tests (Playwright)
1. Install browsers:
   ```bash
   npx playwright install
   ```
2. Create `.env.e2e` (copy from `.env.e2e.example`) and fill in:
   - `E2E_EMAIL` / `E2E_PASSWORD` for an existing confirmed user
   - Optional locally / required in CI: `E2E_MEMBER_EMAIL` for an existing second user (tests member add + settle)
   - Optional: `E2E_ALLOW_SIGNUP=true` to run the signup test
3. Run:
   ```bash
   npm run test:e2e
   ```

### CI behavior
- In CI, Playwright now requires `E2E_EMAIL`, `E2E_PASSWORD`, and `E2E_MEMBER_EMAIL`.
- If any required variable is missing, CI fails fast instead of skipping core E2E coverage.

## Smoke test checklist
- Sign up and confirm email
- Create a group
- Add a member (invite)
- Add an expense with a custom split
- Record a settlement
- Update profile
