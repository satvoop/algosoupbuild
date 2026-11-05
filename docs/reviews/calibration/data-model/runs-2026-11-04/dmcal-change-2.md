DATA MODEL REVIEW (independent)
Record: docs/architecture/data-model.md (as patched)   Dictionary: docs/architecture/data-dictionary.yml (as patched)   Migrations: supabase/migrations/20261104000000_watchlist_items.sql (new), supabase/migrations/20261103000000_secure_defaults.sql (base, read for the platform defaults)
Check line quoted: "PASS  data-dictionary  2 migrations applied, 1 tables, 4 columns compared" (rc 0). I ran `node scripts/check-data-dictionary.mjs` on the patch applied to a clone at /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/dmcal/work-2/repo, log at /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/dmcal/work-2/dict.log, line `DICT_RC=0`. Calibration run: there is no gate log.

Calibration flag honoured: the diff is the saved file change-2.patch and its first line begins "CALIBRATION FIXTURE". I did not read change-1.patch or docs/reviews/calibration/. Deviation from read-only: all writes went to the work-2 clone, which the dispatcher allowed. That covers `npm ci --ignore-scripts` from the lockfile, the test run, and the mutation runs. The repo checkout was not touched.

Evidence runs (work-2):
* watchlist-items.db.test.ts on the patch as written: 9/9 passed, `VITEST_RC=0` (work-2/vitest.log).
* Mutation run (work-2/mutate.py, log work-2/mutate.log, `MUT_RC=0`, migration restored and asserted byte-identical afterwards). Every mutation turned the suite red (rc=1): each of the 3 policies removed; each loosened to `true`; each loosened to `(select auth.uid()) is not null`; an owner UPDATE policy added; RLS disabled; anon granted SELECT with a `true` policy; UNIQUE removed; ON DELETE CASCADE removed. 14 of 14 mutants killed.
* Catalog probe (work-2/probe.log, `PROBE_RC=0`). relrowsecurity=true and relforcerowsecurity=false, owner postgres. anon holds no grant. authenticated holds DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE. An authenticated owner can insert its own row with created_at='2000-01-01'.

TRACE
- [TRACED] watchlist_items -- spec Data bullet 1; record s1 line 29; dictionary line 30; migration line 4
- [TRACED] user_id (owner, the auth user) -- spec Data bullet 1; migration line 6 `user_id uuid not null references auth.users (id) on delete cascade`; record line 34 and line 42; dictionary line 38
- [TRACED] ticker, 1 to 5 capital letters -- spec Data bullet 2; migration line 7 `check (ticker ~ '^[A-Z]{1,5}$')`; record line 40; dictionary line 39; test lines 93-98 (reject aapl, ABCDEF, BRK.B, A1, empty) and 107-114 (accept A, ABCDE)
- [TRACED] created_at, the time a row was added -- spec Data bullet 1; migration line 8 `timestamptz not null default now()`; record line 29 ("when added"); dictionary line 40; test line 116
- [TRACED] id -- migration line 5 `bigint generated always as identity primary key`; record line 29; dictionary line 37
- [TRACED] a user follows a ticker once -- spec Data bullet 2; migration line 10 `constraint watchlist_items_user_ticker_key unique (user_id, ticker)`; record line 41; test line 99 (23505), test line 113 (another user may hold the same ticker)
- [TRACED] own rows only for read, add and remove -- spec Data bullet 3; migration lines 15-22; record lines 48-50; tests 63, 69, 75
- [TRACED] anonymous visitors read nothing -- spec Data bullet 3; secure_defaults line 25 `revoke all on tables from anon`; record line 52; test line 86 (42501 on all four operations)
- [TRACED] rows live as long as the account and go when it is deleted -- spec Data bullet 4; migration line 6 `on delete cascade`; record line 64; dictionary line 35; test line 127
- [TRACED] AC7 -- for each of the 3 policies, the allow fails when the policy is removed and the deny fails when it is loosened to `true` or to any signed-in user (measured by the mutation run). The deny shows the owner's rows unchanged (test lines 30-52, ownerTickers is read by the table owner in the same transaction). UPDATE has no policy and has a changes-nothing test (line 81). anon has no policy and has a changes-nothing test on every operation (line 86).

LENSES
- [PASS] D1 Dictionary -- dictionary lines 30-40: all 4 columns have a row with a class, and the table has retention. Record s0 lines 20-23 match the classes the diff adds (personal yes, money no, tenants no). Script line: "PASS  data-dictionary  2 migrations applied, 1 tables, 4 columns compared".
- [PASS] D2 Row security -- RLS is on through the secure-defaults event trigger (secure_defaults lines 31-59; the probe reads relrowsecurity=true). No `true` predicate on any write policy (migration lines 15-22). One allow test and one deny test per policy, all killed by the mutation run. Writes are checked without RETURNING (test lines 54-56). One policy per operation, each `to authenticated`; no FOR ALL; `(select auth.uid())` is wrapped. FORCE RLS is not set, and record line 56 states why ("the table owner is `postgres`, which bypasses RLS by design on Supabase"). The probe confirms the owner is postgres.
- [N/A] D3 Server-owned columns -- no column that money, approval or fulfilment depends on (migration lines 5-8). See the S0 on created_at.
- [PASS] D4 One owner per fact -- user_id is a foreign key reference, not a copy. No second home for any fact, and no cache or snapshot columns.
- [N/A] D5 Money and points -- no money or points column. Record line 22: "tickers only, no prices stored". Measured: 4 columns, none numeric.
- [PASS] D6 Indexes -- the only foreign key (user_id) and the only policy predicate column (user_id) lead the composite UNIQUE at migration line 10. The comment at line 9 says so ("Leads with user_id, so it also serves the foreign key and every policy predicate").
- [PASS] D7 Personal, special, secret -- user_id has class personal (dictionary line 38) and is a surrogate identifier pointing at auth.users. Its erasure is `delete`, by CASCADE (migration line 6) or by the user's own delete (record line 64), and the test at line 127 proves the cascade. No special or secret columns, no card data, and no hiding status.
- [PASS] D8 Migration discipline -- the header (line 1) says "Applied once.", and the body (plain create table and create policy, not re-runnable) matches. Lint debt is named in docs/waivers.md line 10: "| migration-lint | Sat | 2027-01-31 |". No rename, drop or type change. The migration ships without route code, as the Atomicity NO rule in .claude/harness.md requires. The filename sorts after the base migration. That it was created with `npm run db:new` is UNMEASURED (see QUESTIONS).
- [N/A] D9 Generated types -- the platform condition: package.json `db:types` is `supabase gen types typescript --linked`, which reads the linked project, and that project has no table until db:push. .claude/harness.md line 107 says "`npm run db:types` once the first table exists; clients are untyped until then". src/lib/supabase/database.types.ts does not exist yet. Record line 13 puts regeneration after the apply. This becomes a live check at the step after the apply, not at this gate.
- [PASS] D10 Lifecycle -- retention "life of account" (dictionary line 35, record line 64) and erasure method delete. No consent and no audit rows. No server-owned state change: rows are never updated (no UPDATE policy, test line 81).
- [PASS] D11 Identity, types, naming -- `bigint generated always as identity` primary key, timestamptz, text with a CHECK, snake_case table and columns. No enum. No updated_at, which is right for rows that are never edited.
- [N/A] D12 Sub-models -- no ledger, no agent run or memory, and one owner scope with no tenant (record line 23).

FINDINGS
- S0 supabase/migrations/20261104000000_watchlist_items.sql line 8 -- authenticated can set created_at on insert. The probe stored '2000-01-01' for the owner's own row. The column then records the client's claim, not "the time it was added". Nothing decides on it and only the owner's own row is affected, so D3 does not apply. Revoking INSERT on the created_at column from authenticated, or pinning it in a trigger, would close it.
- S0 platform defaults (supabase/tests/supabase-shim.sql line 23 and secure_defaults line 25) -- authenticated holds TRUNCATE, REFERENCES and TRIGGER on the new table, and TRUNCATE is not subject to RLS. The Data API cannot issue TRUNCATE, and EXECUTE on functions is revoked by default, so no client path exists today. This is a template default, not this diff, and is noted for the template owner.
- S0 dictionary line 39 -- ticker has class none, but a person's watchlist is personal data by association with user_id. Erasure is still complete because the whole row goes with the account, so there is no practical gap.

CLASS SWEEP
- tables with a personal column: watchlist_items only; no sibling.
- owner-scoped write policies: select, insert and delete on watchlist_items, all of the same shape and all mutation-tested; UPDATE is intentionally absent and tested.
- client-settable defaulted columns: created_at (S0 above); id is `generated always`, so a client cannot set it.

QUESTIONS (no line to cite)
- Was the migration file created with `npm run db:new`? The 000000 time part looks hand-typed. It is harmless while it sorts after the last applied migration, but provenance cannot be measured from a patch.
- Live proof is owed after db:push: scripts/probe-rls.mjs per table (owner sees its row, an unrelated user sees none, anon refused 42501), per .claude/harness.md lines 101-104. The local suite does not prove hosted behaviour.

VERDICT: APPROVE
Reason: no S3 or S2 finding. All 12 D rows pass or are N/A with the platform condition named. The dictionary check passes (rc 0). Every policy's allow and deny pair was shown to fail under removal and under both loosenings (14 of 14 mutants killed), which meets AC7.
