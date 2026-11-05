DATA MODEL REVIEW (independent)
Record: docs/architecture/data-model.md (as patched, change-1.patch:27-46)   Dictionary: docs/architecture/data-dictionary.yml (as patched, change-1.patch:2-26)   Migrations: supabase/migrations/20261104000000_watchlist_items.sql (change-1.patch:47-66)
Check line quoted: MISSING. No gate log exists (calibration run), and the check could not be run: the repo copy has no node_modules (PGlite absent). Decided from the patch per the calibration rule. The check's own failing line for this patch would be `${table}.${column}: no dictionary row` (scripts/check-data-dictionary.mjs:64), i.e. `watchlist_items.ticker: no dictionary row`. UNMEASURED by run.

Calibration flag honoured: the diff is the saved patch change-1.patch, and its first line begins "CALIBRATION FIXTURE". No designing-session material was given. I did not read change-2.patch.

TRACE
- [TRACED] watchlist_items (table) -- record section 1 (change-1.patch:35) -> "spec AC1". But AC1 is a route criterion; the table serves the Data section (spec.md:15).
- [UNTRACED] watchlist_items.ticker -- in the SQL (change-1.patch:58) but missing from the dictionary (change-1.patch:24-26 lists only id, user_id, created_at) and from the record.
- [UNTRACED] spec.md:16 "A ticker is 1 to 5 capital letters" -- no CHECK. The column is `ticker varchar(10) not null` (change-1.patch:58), which admits "aapl12345x".
- [UNTRACED] spec.md:16 "A user follows a ticker once" -- no UNIQUE (user_id, ticker) anywhere in the migration. AC4 (409 duplicate) has nothing in the database to serve it.
- [UNTRACED] spec.md:17 "reads ... only their own rows" -- the SELECT policy is `using (true)` (change-1.patch:63).
- [UNTRACED] spec.md:17 "adds ... only their own rows" -- the INSERT policy is `with check (true)` (change-1.patch:66).
- [UNTRACED] spec.md:17 "removes only their own rows" -- there is no DELETE policy, and the record lists only "SELECT, INSERT" (change-1.patch:43).
- [UNTRACED] spec.md:18 "go when it is deleted" -- `references auth.users (id)` has no ON DELETE (change-1.patch:57), so it defaults to NO ACTION. The dictionary says `user_id ... erasure: none` (change-1.patch:25), and there is no row in the record's Relationships or section 4 Lifecycle.
- [UNTRACED] spec.md:30 AC7 -- one test only (change-1.patch:82-93). No deny test, and no test for the operations that have no policy (UPDATE, DELETE).

LENSES
- [FAIL] D1 Dictionary -- change-1.patch:58 vs 24-26. `ticker` has no dictionary row, which is the check's own failure line (scripts/check-data-dictionary.mjs:64). The record's section 0 depth line and its Classes table (docs/architecture/data-model.md:11-21) are not updated in the patch: "Product: OPEN until the first spec", and every class cell is blank while the diff adds persisted state.
- [FAIL] D2 Row security -- change-1.patch:66 `for insert to authenticated with check (true)`. That is an explicit S3 ask: any signed-in user can insert a row with any user_id. change-1.patch:63 `for select to authenticated using (true)` lets every signed-in user read every user's watchlist.
  * Tests: the only test (change-1.patch:82-93) runs as the PGlite connection user (postgres, which bypasses RLS) with no SET ROLE or JWT claims. It would pass with both policies removed.
  * There is no deny test for either policy, and the record's deny cell reads "covered by RLS" (change-1.patch:43), which is not a test.
  * S1 items: `auth.uid()` is not used at all. FORCE RLS: the dictionary says `forced: false` (change-1.patch:21), but the record never states that the owner bypasses RLS.
- [N/A] D3 Server-owned columns -- no column that money, approval or fulfilment depends on. user_id spoofing is covered under D2.
- [PASS] D4 One owner per fact -- user_id references auth.users (change-1.patch:57). No second home for any fact.
- [N/A] D5 Money and points -- no money or points columns.
- [FAIL] D6 Indexes -- the FK column `user_id` (change-1.patch:57) has no index. It is also the column an owner-only policy predicate must read. No composite leads with it, because there is no (user_id, ticker) UNIQUE either.
- [PASS] D7 Personal, special, secret -- user_id is a surrogate uuid only (class none, consistent with the template example at data-dictionary.yml:22). No secrets or card data. See QUESTIONS on whether the ticker list is personal data.
- [FAIL] D8 Migration discipline -- the header (change-1.patch:53) declares neither idempotent nor applied-once. The body is not re-runnable (`create table` without `if not exists`, bare `create policy`). Lint debt is named: docs/waivers.md:10 `migration-lint | Sat | 2027-01-31` (PASS on that sub-item). Use of `npm run db:new` is unverifiable (see QUESTIONS).
- [FAIL] D9 Generated types -- this is the first table. .claude/harness.md:107 says "Types: `npm run db:types` once the first table exists", but the patch adds no src/lib/supabase/database.types.ts and src/lib/supabase/ has none. The gate's typecheck step (scripts/gate.sh:72-77) cannot prove what was never generated.
- [FAIL] D10 Lifecycle -- the dictionary retention is "life of account" (change-1.patch:22), but nothing in the schema implements erasure.
  * The FK at change-1.patch:57 has no ON DELETE CASCADE, so deleting the auth.users row is blocked by NO ACTION.
  * user_id `erasure: none` (change-1.patch:25) contradicts spec.md:18.
  * The record's section 4 Lifecycle has no row (data-model.md:45-48, unchanged by the patch).
- [FAIL] D11 Identity, types, naming --
  * `id serial primary key` (change-1.patch:56): serial is banned, and it is int4, not the `bigint` the dictionary claims (change-1.patch:19, 24). The record says "serial" (change-1.patch:35), so the record, the dictionary and the SQL disagree three ways.
  * `ticker varchar(10)` with no CHECK (change-1.patch:58).
  * `created_at timestamp default now()` (change-1.patch:59): not timestamptz, and nullable, while the dictionary says `type: timestamptz ... nullable: false` (change-1.patch:26).
  * PK present, snake_case PASS. No updated_at, which is N/A only if rows are never updated (unstated).
- [N/A] D12 Sub-models -- no ledger, no agent tables. Tenancy is "owner" (single owner per row, change-1.patch:20), not multi-tenant.

FINDINGS
- S3 change-1.patch:66 -- INSERT `with check (true)`. Any signed-in user can write rows owned by any other user, which breaks spec.md:17 and the checklist's explicit D2 S3 ask.
- S3 change-1.patch:63 -- SELECT `using (true)`. Every signed-in user reads every user's watchlist. Raised to S3: a cross-user data leak that violates spec.md:17 outright, and the record claims "owner only" (change-1.patch:43), so the record is contradicted by the SQL.
- S3 change-1.patch:82-93 -- AC7 is unmet. The single "allow" test runs as the superuser, so it passes with the policies removed. There is no deny test for SELECT or INSERT, and no "changes nothing" test for UPDATE or DELETE. This is the D2 S3 test ask.
- S3 change-1.patch:58 vs 24-26 -- the `ticker` column has no dictionary row. The gate's data-dictionary step fails (D1).
- S3 change-1.patch:53 -- the migration header has no idempotent or applied-once declaration, and the body is not re-runnable (D8, severity per checklist).
- S3 change-1.patch:57 + 25 -- no ON DELETE CASCADE, and erasure is `none`. Account deletion is blocked or leaves rows behind, which contradicts spec.md:18. Raised from D10's S2 to S3: the erasure path for an account does not exist, and erasure is a compliance blocker.
- S3 change-1.patch:55-60 -- no UNIQUE (user_id, ticker). "A user follows a ticker once" (spec.md:16) is unenforced, and AC4's 409 has nothing to catch. An app-level pre-check races. This is a trace failure (a uniqueness the model cannot serve).
- S2 change-1.patch:58 -- no CHECK (ticker ~ '^[A-Z]{1,5}$'). The Data invariant at spec.md:16 is left to the route alone, and varchar(10) admits values the spec forbids. Record section 2 Invariants has no rows.
- S2 change-1.patch:57 -- no index on user_id, the FK column and the owner-policy predicate column (D6).
- S2 docs/architecture/data-model.md:11-21 -- the depth line and Classes table are not updated for the first persisted table (D1 sub-ask).
- S2 change-1.patch (no types file) -- types not regenerated after the first table (D9).
- S1 change-1.patch:56 -- `serial`. Use `bigint generated always as identity`. The dictionary already claims bigint_identity (change-1.patch:19).
- S1 change-1.patch:59 -- `timestamp` without time zone, and nullable. It must be `timestamptz not null default now()` to match the dictionary row (change-1.patch:26).
- S1 change-1.patch:43 -- the record does not state that FORCE RLS is off because the owner (postgres) bypasses RLS. It also does not list one policy per operation for DELETE, or the deliberate absence of UPDATE.
- S1 change-1.patch:35 -- record identity "serial", dictionary "bigint_identity", SQL `serial` (int4): the record and the dictionary contradict each other and the SQL. All three change in the same commit.

CLASS SWEEP
- Policies on watchlist_items:
  * SELECT and INSERT are both `true`: the same defect twice.
  * UPDATE and DELETE have no policy, so they are denied by default, which is correct for UPDATE. DELETE is required by the spec and is missing.
  * No policy anywhere uses `(select auth.uid())`.
- Timestamp columns: created_at is the only one, and it is defective. No sibling.
- FK columns: user_id is the only one. It is unindexed and has no ON DELETE. No sibling.
- Text columns: ticker is the only one, as varchar(n) with no CHECK. No sibling.
- Tables with a personal column: watchlist_items only. Classified none (surrogate).
- One table in the diff, so there are no other siblings. The secure_defaults migration creates no app tables.

QUESTIONS (no line to cite)
- Was the migration created with `npm run db:new`? The timestamp 20261104000000 (all zeros for time) reads as hand-named. Probe: the commit's file-creation history, or `supabase migration list` in the worktree.
- Is a user's followed-ticker list personal data under UK GDPR (an investment interest tied to an identified account)? If yes, the dictionary class for ticker, once its row exists, and the record's Classes table need a decision. The erasure method would be delete via the cascade.
- Is UPDATE meant to be impossible, with rows immutable and removed only by delete and re-add? If so, the record should say so, and AC7 requires a test that UPDATE changes nothing.

VERDICT: BLOCK
Reason: the INSERT policy is `with check (true)` and SELECT is `using (true)` (change-1.patch:63,66), so any signed-in user can read and forge other users' rows, and no deny test exists that could catch it (AC7, D2 S3).
