# Reviewer calibration

A reviewer is only evidence if it can say no. Each pair below holds one defective change
and one correct change, both against `spec.md` and both applying cleanly to this template
(the `design-critic/` pair holds two design passes instead, and its README says how to run
it).
A reviewer passes calibration when it BLOCKs the defective change and APPROVEs the correct
one. Run every pair before the template is first used for a timed build (the operator's
dry run does it, under the clean config that installs the agents), and again after any
later edit to a reviewer's agent file, `docs/reviews/lenses.md`,
`docs/architecture/review-checklist.md`, `docs/design/critique-checklist.md`,
`docs/design/design-pass.md` or a fixture. Until that first run is recorded,
the reviewers are uncalibrated, and a review file says so.

| Pair | Reviewer | Files | Scope (`spec.md`) |
| --- | --- | --- | --- |
| `data-model/` | `data-model-reviewer` | `change-1.patch`, `change-2.patch` (migration, dictionary, record, RLS tests) | Data section, AC7 |
| `stage5/` | `stage5-reviewer` | `change-1.patch`, `change-2.patch` (the route and its tests) | AC1-AC6, on a base with `data-model/change-2.patch` merged |
| `design-critic/` | `design-critic` | `defective-design-pass.md`, `correct-design-pass.md` (a toy product's design pass; not against `spec.md`) | The whole pass; run and key in `design-critic/README.md` |

## How to run one

1. Make a scratch copy with no history, so the reviewer cannot read the key below from git:
   `git archive HEAD | tar -x -C <copy>`, delete `docs/reviews/calibration/` from the copy,
   then `git init` it and commit. Never use a clone or a worktree: `git show` would still
   reach this file. For the `stage5/` pair, also apply `data-model/change-2.patch` to the
   copy and commit it: that is the base the route is reviewed on.
2. Copy `spec.md` and the pair's two patches into a separate scratch folder.
3. Dispatch the reviewer in a fresh context (never a fork), once per patch: `repo` is the
   scratch copy, the diff is the patch file, the spec is `spec.md` with the pair's scope,
   and `calibration: true`. The agents honour that flag only for a patch file named
   `change-1.patch` or `change-2.patch` whose first line begins `CALIBRATION FIXTURE` (every
   patch here starts with that line; `git apply` skips it). In a calibration run there is no
   gate log, so L1 is N/A.
4. Record the verdict and the deciding finding for each run in the review file of the change
   that triggered the re-run. A reviewer that APPROVEs a defective change, or BLOCKs a
   correct one on a finding that is not in the key, fails calibration, and its prompt is
   fixed before it reviews anything else. Findings on a correct change that the key lists
   as expected notes do not count against it, at the severity the key gives.

## Key (do not give this file to the reviewer)

* `stage5/change-1.patch` is correct: expect APPROVE.
* `stage5/change-2.patch` is defective: expect BLOCK. Planted:
  * no input validation (AC2), and `request.json()` throws on a malformed body;
  * no signed-out check (AC3): it inserts with `user_id` undefined;
  * a silent `catch {}`, and a 200 `{ ok: true }` whatever happened (AC4, AC5);
  * one happy-path test, which asserts 200 where the spec says 201 (AC1, AC6);
  * `body` is untyped (`request.json()` returns `any`).
* `data-model/change-1.patch` is defective: expect BLOCK. Planted:
  * D2: `using (true)` on SELECT and `with check (true)` on INSERT;
  * D1: no dictionary row for `ticker` (the gate's `data-dictionary` step fails);
  * D7: `user_id` classed `none` with erasure `none`;
  * D11: `serial`, `varchar(10)` with no CHECK, `timestamp` without a time zone;
  * no UNIQUE (user_id, ticker) and no ON DELETE for the account;
  * the record's access table says "owner only", which the SQL contradicts;
  * the only test runs as the table owner, so it never exercises a policy (AC7).
* `data-model/change-2.patch` is correct: expect APPROVE. Expected notes, none blocking:
  * D9: no generated types. The record says they are generated after the migration is
    applied (step 10), so they cannot exist at Gate 1. N/A or S0.
  * The table owner `postgres` bypasses RLS, so the CHECK and UNIQUE test runs as the owner
    on purpose; FORCE is not set, and the record says why. S0.
* `stage5/change-1.patch`, expected notes, none blocking:
  * the unit tests mock the Supabase client, so the database seam is untested here; the
    data-model pair covers it. S0, or S1 naming the seam.
  * `parseTicker` lives in `parse-ticker.ts`, because a route module exports handlers only
    (`next build --webpack` rejects any other export).

## Measured when the fixtures were made (2026-11-04, seventh pass)

* `data-model/change-2`:
  * dictionary check `PASS  data-dictionary  2 migrations applied, 1 tables, 4 columns compared`;
  * its nine tests pass, with typecheck and lint clean;
  * every one of 23 mutants of its migration fails a test, and the harness confirms each
    mutant changed the file before it counts:
    * policies: SELECT, INSERT and DELETE each removed, each loosened to `true`, and each
      loosened to any signed-in user;
    * an `update ... using (true) with check (true)` policy added;
    * anon given SELECT, and anon given INSERT, each with a policy;
    * constraints: the CHECK widened to `{1,10}`, narrowed to `{4}` and to `{2,5}`, and
      swapped for `ticker = upper(ticker)`; the UNIQUE dropped, and made global
      (`unique (ticker)`); `on delete cascade` dropped; every NOT NULL column made
      nullable in turn (`user_id`, `ticker`, `created_at`; a CHECK passes on NULL, so only
      NOT NULL refuses a missing ticker); `created_at` defaulting to a fixed old date;
  * the constraint tests check both sides: what the spec forbids is refused, and what it
    allows (one and five letters, the same ticker for another user) is accepted;
  * run against `data-model/change-1`'s migration, 5 of the 9 fail.
* The write checks use no `RETURNING`. Postgres applies the SELECT policy to returned rows,
  so with `RETURNING` the INSERT deny passed even with `with check (true)`: the select
  policy refused it. A mutant found that.
* `data-model/change-1`: `FAIL  data-dictionary  2 migrations applied, 1 tables, 4 columns compared`
  (`watchlist_items.ticker: no dictionary row`). Its own test passes.
* `stage5/change-1`, applied with `data-model/change-2`: 6 tests pass; typecheck, lint and
  `next build --webpack` clean. `stage5/change-2` passes typecheck, lint and its one test
  (measured by the first review of this folder), so every planted defect is one only a
  reviewer can catch.
