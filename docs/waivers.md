# Waivers

A waiver is a named, dated exception to a rule. Every row names an owner and an expiry
date. The gate prints every waiver on every run and FAILS once one has expired, so an
exception cannot quietly become the norm. To extend one, change the date in a PR that
says why.

| Key | Owner | Expires | Reason |
| --- | --- | --- | --- |
| migration-lint | Sat | 2027-01-31 | No migration linter in the gate yet (`supabase db lint` needs a running database; squawk not yet evaluated). Until then: every migration is reviewed against `docs/architecture/data-model.md`, and the secure defaults are proven by behaviour in CI (`scripts/prove-db-defaults.sh`). |
| eslint-9-end-of-life | Sat | 2027-01-31 | ESLint 9 is out of support. ESLint 10 needs peer overrides for eslint-config-next 16.4 plugins (checked 2026-11-03). Moderate advisories are dev tooling only (minimatch via the lint chain); runtime `npm audit --omit=dev` is clean. Re-check when eslint-config-next supports 10. |
