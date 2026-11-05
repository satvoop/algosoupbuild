# Security

## Reporting a vulnerability

Email the owner listed in the repository settings with the subject "Security". Please do
not open a public issue. Expect an acknowledgement within two working days.

## Baseline this repo enforces

* Secrets: the gate scans every line a change adds (committed and uncommitted) and every
  untracked file, each read as text; CI also runs gitleaks over each pull request's and
  push's commits. Both are required checks.
* Dependencies: Dependabot alerts and weekly update PRs; CI fails on a high or critical
  advisory in runtime dependencies (`npm audit --omit=dev --audit-level=high`).
* Database: RLS on by default for every new table; function execute revoked from PUBLIC,
  anon and authenticated, and anonymous table access revoked, by default; definer functions
  pin `search_path`. Proven by behaviour in the gate (an in-process Postgres) and in CI
  (a real Postgres 17).
* Web: HSTS, nosniff, frame denial, referrer and permissions policies, and an enforced
  Content Security Policy on production builds (inline scripts allowed until nonces are
  added; see `docs/runbooks/deploy.md`).
* Keys: the Supabase secret key is server-only and Production-scoped; CI never holds a real
  credential.

Target: OWASP ASVS 5.0 Level 1 at minimum, Level 2 for anything holding personal data or
money.
