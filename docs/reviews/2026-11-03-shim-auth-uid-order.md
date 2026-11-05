# Review: shim auth helpers (TEMPLATE-5)

Independent review by the `stage5-reviewer` agent (fresh context) of `origin/dev...5ae7903`,
spec `docs/bugs/2026-11-03-shim-auth-uid-order.md`, lenses COMMON 1-6 (this template is not one
of the registered project profiles). Verdict: **APPROVE**, with two S1 findings to fix in this PR.

## Findings and resolutions

* **S1 `supabase-shim.sql` nullif wrappers unpinned.** Removing all eight left the suite green: a
  fresh database returns NULL for an unset setting, never `''`. **Resolved:** new case "with every
  claim setting empty ('') every helper is NULL". Green on the fix; red on a mutant with the
  wrappers removed (`invalid input syntax for type uuid: ""`, 1 failed, 4 passed).
* **S1 the "every helper is NULL" case did not select `auth.email()`.** **Resolved:** both NULL
  cases now assert `auth.email()` is NULL too.
* **S0 "(PostgREST sets only the claims JSON)" uncited.** An outside-platform claim not read from
  PostgREST's own docs. **Resolved:** removed from the shim comment, the test name and the bug
  record; nothing depends on it.
* **S0 `query<T>` asserts the row shape through the generic.** Accepted: `toEqual` on the whole
  row catches shape drift.
* **S0 `docs/reviews/template-initial.md` still says the order is unverified.** Accepted: it is a
  record and is not edited; the bug record points at it.

## Questions answered

* **Gate evidence.** The gate log of record for 5ae7903 is the session scratchpad
  `shim-gate-clean.log`; its last line is `GATE_RC=0` (47 tests). The gate is re-run on the head
  that carries these resolutions and quoted in the PR.
* **Lens set.** COMMON 1-6 is right for the template until it has a profile of its own.
* **CI parity on Postgres 17.** Unmeasured: Actions cannot start on private repos (card CI-1).
  The new bodies use only `current_setting`, `nullif`, `coalesce` and `jsonb` casts; the same
  definitions run on hosted Postgres 17.11, where they were read.
