# Branch Protection Setup

Apply this in GitHub repository settings for `main`:

1. Go to `Settings` -> `Branches` -> `Add branch protection rule`.
2. Branch name pattern: `main`.
3. Enable `Require a pull request before merging`.
4. Enable `Require status checks to pass before merging`.
5. Add these required checks:
   - `lint`
   - `typecheck`
   - `build`
   - `unit-tests`
   - `integration-tests`
   - `e2e-core`
6. Enable `Require branches to be up to date before merging`.
7. Enable `Do not allow bypassing the above settings`.

This enforces Phase 0 quality gates at merge time.
