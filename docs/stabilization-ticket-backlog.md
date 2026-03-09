# SplitEase Stabilization Backlog

## Estimation Scale
- `S`: 0.5 to 1 day
- `M`: 1 to 2 days
- `L`: 2 to 4 days
- `XL`: 4 to 6 days

## Phase 0: Quality Gate Foundation

### `P0-01` CI Quality Gate Pipeline
- Priority: `P0`
- Estimate: `M`
- Status: `In Progress`
- File targets:
  - `.github/workflows/ci.yml`
  - `package.json`
- Scope:
  - Add required CI jobs: `lint`, `typecheck`, `build`, `unit-tests`, `integration-tests`, `e2e-core`.
  - Use Node 20 + npm cache + `npm ci`.
  - Ensure all jobs are independently visible for branch protection.

### `P0-02` Core E2E in CI (No Skipped Core Tests)
- Priority: `P0`
- Estimate: `S`
- Status: `In Progress`
- File targets:
  - `playwright.config.ts`
  - `tests/auth.spec.ts`
  - `tests/core.spec.ts`
  - `package.json`
- Scope:
  - Require `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_MEMBER_EMAIL` in CI.
  - Tag core tests and run CI script against `@core`.
  - Keep optional tests out of CI critical path.

### `P0-03` Script Guardrails
- Priority: `P0`
- Estimate: `S`
- Status: `In Progress`
- File targets:
  - `package.json`
  - `vitest.config.ts`
- Scope:
  - Add `test`, `test:unit`, `test:integration`, `test:e2e:ci`.
  - Ensure test harness fails if no tests exist.

### `P0-04` PR Quality Template
- Priority: `P0`
- Estimate: `S`
- Status: `In Progress`
- File targets:
  - `.github/pull_request_template.md`
- Scope:
  - Add mandatory regression checklist for auth/group/expense/settlement and quality commands.

### `P0-05` Branch Protection Enforcement
- Priority: `P0`
- Estimate: `S`
- Status: `Manual Follow-up`
- File targets:
  - `.github/BRANCH_PROTECTION.md`
- Scope:
  - Document exact required status checks.
  - Apply rule in GitHub settings for `main`.

### `P0-06` Initial Unit/Integration Test Baseline
- Priority: `P0`
- Estimate: `M`
- Status: `In Progress`
- File targets:
  - `tests/unit/*.test.ts`
  - `tests/integration/*.test.ts`
  - `vitest.config.ts`
- Scope:
  - Add initial passing baseline tests so CI gate is live immediately.
  - Phase 1/2 expands coverage depth.

## Phase 1: Money Logic Correctness

### `P1-01` Split Share Unit Coverage
- Priority: `P0`
- Estimate: `M`
- File targets:
  - `tests/unit/balanceCalculator.test.ts`
  - `src/utils/balanceCalculator.ts`
- Scope:
  - Equal/custom/percentage split edge cases.
  - Remainder and rounding correctness.

### `P1-02` Debt Simplification Invariant Coverage
- Priority: `P0`
- Estimate: `M`
- File targets:
  - `tests/unit/debtSimplifier.test.ts`
  - `src/utils/debtSimplifier.ts`
- Scope:
  - Conservation of debt and zero residual balances.
  - Deterministic behavior across ordering permutations.

### `P1-03` Formatter/Validator Boundary Coverage
- Priority: `P1`
- Estimate: `S`
- File targets:
  - `tests/unit/money-utils.test.ts`
  - `src/utils/formatters.ts`
  - `src/utils/validators.ts`
- Scope:
  - Parsing/formatting boundaries.
  - Validation failure messages and limits.

### `P1-04` Money Utility Coverage Gate
- Priority: `P1`
- Estimate: `S`
- File targets:
  - `package.json`
  - `vitest.config.ts`
- Scope:
  - Add coverage config and threshold for money utilities (`>=95%`).

## Phase 2: Domain Integration Hardening

### `P2-01` Auth Domain Integration Tests
- Priority: `P0`
- Estimate: `M`
- File targets:
  - `tests/integration/context/auth.integration.test.ts`
  - `src/context/modules/auth.ts`
  - `src/lib/supabaseClient.ts`
- Scope:
  - Session init, sign-in, sign-out, and auth failures.

### `P2-02` Groups Domain Integration Tests
- Priority: `P0`
- Estimate: `L`
- File targets:
  - `tests/integration/context/groups.integration.test.ts`
  - `src/context/modules/groups.ts`
- Scope:
  - Load/create/delete group, invites, member remove, profile update.

### `P2-03` Expenses Domain Integration Tests
- Priority: `P0`
- Estimate: `M`
- File targets:
  - `tests/integration/context/expenses.integration.test.ts`
  - `src/context/modules/expenses.ts`
- Scope:
  - Create/update/delete + cache state transitions.

### `P2-04` Settlements Domain Integration Tests
- Priority: `P0`
- Estimate: `M`
- File targets:
  - `tests/integration/context/settlements.integration.test.ts`
  - `src/context/modules/settlements.ts`
- Scope:
  - Create/delete/totals + cache transitions.

### `P2-05` Supabase Mock Harness
- Priority: `P0`
- Estimate: `M`
- File targets:
  - `tests/integration/mocks/supabase.mock.ts`
  - `tests/integration/setup.ts`
- Scope:
  - Centralized mock responses for success/failure/network/malformed payloads.

## Phase 3: Core Feature Completeness

### `P3-01` Group Edit Flow
- Priority: `P1`
- Estimate: `M`
- File targets:
  - `src/pages/GroupDetailPage.tsx`
  - `src/components/groups/GroupForm.tsx`
  - `src/context/modules/groups.ts`
- Scope:
  - Rename/edit description in settings modal.

### `P3-02` Leave Group Flow
- Priority: `P1`
- Estimate: `M`
- File targets:
  - `src/pages/GroupDetailPage.tsx`
  - `src/components/groups/GroupMembersManager.tsx`
  - `src/context/modules/groups.ts`
- Scope:
  - Non-owner self-removal with confirmation.

### `P3-03` Transfer Ownership Flow
- Priority: `P1`
- Estimate: `L`
- File targets:
  - `src/pages/GroupDetailPage.tsx`
  - `src/context/modules/groups.ts`
  - `src/types/index.ts`
- Scope:
  - Ownership transfer rules and confirmation UX.

### `P3-04` Invite Lifecycle Completeness
- Priority: `P1`
- Estimate: `M`
- File targets:
  - `src/components/groups/GroupMembersManager.tsx`
  - `src/context/modules/groups.ts`
  - `src/types/index.ts`
- Scope:
  - Pending/accepted/canceled visibility and revoke/resend behavior.

## Phase 4: Reliability UX and Error Recovery

### `P4-01` Global Error Boundary
- Priority: `P1`
- Estimate: `M`
- File targets:
  - `src/App.tsx`
  - `src/components/layout/`
- Scope:
  - Route-level crash fallback and safe navigation.

### `P4-02` Async UX Standardization
- Priority: `P1`
- Estimate: `L`
- File targets:
  - `src/pages/*.tsx`
  - `src/components/**/*.tsx`
  - `src/utils/errors.ts`
- Scope:
  - Consistent loading, disable, retry, and error messaging behavior.

### `P4-03` Confirmation Pattern Unification
- Priority: `P2`
- Estimate: `M`
- File targets:
  - `src/components/ui/Modal.tsx`
  - `src/pages/GroupDetailPage.tsx`
  - `src/components/expenses/ExpenseCard.tsx`
  - `src/components/balances/SettlementHistory.tsx`
- Scope:
  - Remove ad-hoc browser confirms and unify modal confirmations.

## Phase 5: Type Safety and Data Contract Hardening

### `P5-01` Generated Supabase Types
- Priority: `P1`
- Estimate: `M`
- File targets:
  - `src/types/supabase.ts` (generated)
  - `src/lib/supabaseClient.ts`
  - `src/context/modules/*.ts`
- Scope:
  - Wire generated DB types into queries and row mapping.

### `P5-02` Remove Loose `any` in Domain Modules
- Priority: `P1`
- Estimate: `M`
- File targets:
  - `src/context/modules/normalizers.ts`
  - `src/context/modules/groups.ts`
- Scope:
  - Replace unsafe row typing with explicit row interfaces/types.

### `P5-03` Runtime Env Validation
- Priority: `P2`
- Estimate: `S`
- File targets:
  - `src/lib/supabaseClient.ts`
  - `src/main.tsx`
- Scope:
  - Fail-fast env checks in development and production.

## Phase 6: Observability and Production Readiness

### `P6-01` Error Monitoring Integration
- Priority: `P1`
- Estimate: `M`
- File targets:
  - `src/main.tsx`
  - `src/App.tsx`
  - `src/context/modules/*.ts`
- Scope:
  - Add monitoring with user and route context.

### `P6-02` Structured Client Event Logging
- Priority: `P2`
- Estimate: `M`
- File targets:
  - `src/utils/errors.ts`
  - `src/context/modules/*.ts`
- Scope:
  - Consistent event names for group/expense/settlement actions.

### `P6-03` Release and Incident Runbook
- Priority: `P2`
- Estimate: `S`
- File targets:
  - `README.md`
  - `DEPLYOMENT.md`
- Scope:
  - Pre-release checks, rollback, and hotfix playbook.

## First 10 Execution Tickets
1. `P0-01` CI Quality Gate Pipeline
2. `P0-02` Core E2E in CI
3. `P0-03` Script Guardrails
4. `P0-06` Initial Unit/Integration Baseline
5. `P1-01` Split Share Unit Coverage
6. `P1-02` Debt Simplification Invariant Coverage
7. `P2-01` Auth Domain Integration Tests
8. `P2-02` Groups Domain Integration Tests
9. `P3-01` Group Edit Flow
10. `P4-01` Global Error Boundary
