STAGE 5 REVIEW (independent)
Repo: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/s5cal/repo   Diff: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/s5cal/inputs/change-1.patch (applies cleanly to HEAD f008f66 "data-model change-2 base"; reviewed in a copy under work-1/tree)   Spec: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/s5cal/inputs/spec.md (AC1-AC6)   Lane: none   Head: none   Change id: none
Gate line quoted: N/A. calibration: true honoured: the diff is a saved patch named change-1.patch and its line 1 begins "CALIBRATION FIXTURE". No gate log exists, so L1 is N/A. tsc, lint and vitest were not run: the repo has no node_modules, and installing would be a write. Typecheck, lint and test results are UNMEASURED.

ACCEPTANCE CRITERIA
- [VERIFIED] AC1 Signed in, valid ticker: 201 { ticker }, trimmed and upper-cased first -- src/app/api/watchlist/parse-ticker.ts:8, src/app/api/watchlist/route.ts:24,30; test: src/app/api/watchlist/route.test.ts:37-42 (" aapl " gives 201 {ticker:"AAPL"} and the inserted row {user_id:"user-1", ticker:"AAPL"}). It fails if the trim or the upper-casing is removed, or if the status changes.
- [VERIFIED] AC2 ^[A-Z]{1,5}$ after normalising, else (or for a malformed body) 400 invalid_ticker and nothing stored -- parse-ticker.ts:1,5,7,9; route.ts:5-13,21-22; test: route.test.ts:52-59 (malformed JSON, "TOOLONG", 42, {}; asserts inserted == []) and :77-82. The regex matches the spec character for character. I ran parseTicker in node: "ABCDE" is accepted, "ABCDEF" null, "A1" null, "" null, an array null, a bare string null, " ibm\t" gives "IBM". The bound tests are weak (see the S1 finding).
- [VERIFIED] AC3 Signed out: 401 unauthenticated, nothing stored -- route.ts:18-19 (the auth check runs before the body is read and before the insert); test: route.test.ts:44-50. It fails if the check is removed (data.user.id throws) or moved after the insert (inserted is not empty).
- [VERIFIED] AC4 Duplicate: 409 duplicate -- route.ts:25. This relies on the base constraint watchlist_items_user_ticker_key unique (user_id, ticker) at supabase/migrations/20261104000000_watchlist_items.sql:10, which I confirmed. Normalising before the insert means " aapl" and "AAPL" collide as they should. Test: route.test.ts:61-66. It fails if the 23505 branch is removed (the request then gives 500).
- [VERIFIED] AC5 Any other storage error: 500 insert_failed, never a success -- route.ts:26-29; test: route.test.ts:68-73 (42501). It fails if the error branch is removed (the request then gives 201).
- [VERIFIED] AC6 Every response has a test -- route.test.ts covers 201 (:37), 401 (:44), 400 for a malformed body and an invalid ticker (:52), 409 (:61) and 500 (:68).

LENSES
- [N/A] L1 -- calibration: true, validly flagged (change-1.patch, first line "CALIBRATION FIXTURE"). No gate log.
- [PASS] L2 -- no secret, key or env value on any added line. The route reads no env var. console.error logs only the Postgres error code (route.ts:27), with no PII.
- [N/A] L3 -- a saved patch has no branch or PR target to check.
- [PASS] L4 -- the new route has happy-path and error-path tests, and every test above fails under the mutation named. Two caveats:
  * readJson's rethrow branch (route.ts:11) is never taken (S1 below).
  * The Supabase server client seam is UNTESTED end to end. route.test.ts:10-20 mocks createSupabaseServerClient whole, and src/lib/supabase/server.test.ts mocks @supabase/ssr. So no layer exercises a real cookie session through auth.uid() to the RLS insert policy. The policy itself is the base's concern (tests/unit/migrations/watchlist-items.db.test.ts).
  * No live third-party call is made.
- [PASS] L5 -- no any or ts-ignore. The catch handles one named case (SyntaxError) or rethrows (route.ts:8-12). Input is validated at the boundary (parse-ticker.ts:4-9). POST is 16 lines and the files are 10, 31 and 83 lines. No TODOs. One caveat: the getUser error is discarded (S1 below).
- [N/A] L6 -- no migration, data-model.md or dictionary change in the diff.
- [N/A] L7 -- not a lane review.

FINDINGS
- S2 src/app/api/watchlist/route.test.ts:10-20 -- every test layer mocks the Supabase server client, so whether the real session reaches the RLS insert policy (auth.uid() = user_id) is UNTESTED. A route that works only against a mock is not evidence that a signed-in user can add a ticker. It needs an owner and a date for an integration or journey test (Stage 4b, a signed-in Playwright add).
- S1 src/app/api/watchlist/route.test.ts:53,78-81 -- the tests never pin the regex bounds. No test accepts a 1-letter or a 5-letter ticker, or rejects a 6-letter one. ^[A-Z]{1,4}$, {2,5} and {1,6} all pass the whole suite. A wrong bound would 400 real tickers (e.g. "F", "GOOGL"), or turn a 6-letter input into a DB check failure and a 500 instead of a 400.
- S1 src/app/api/watchlist/route.ts:11 -- readJson's rethrow branch has no test. The lens requires each branch of a new function to be taken.
- S1 src/app/api/watchlist/route.ts:18 -- the error from auth.getUser() is dropped by destructuring. An auth outage therefore reads as 401 "unauthenticated" rather than a server error, and that case is not named. CLAUDE.md requires every error path to be handled explicitly. A signed-out request also returns an error, so the conflation may be intended, but it should be stated.
- S1 src/app/api/watchlist/route.test.ts:13 -- the mock's from() ignores the table name. A route writing to the wrong table would pass every test. route.ts:24 is correct by inspection against the migration, but nothing proves it.
- S0 src/app/api/watchlist/route.test.ts:33 -- the console.error spy is created each run, never restored and never asserted. It silences errors without checking that the 500 path logs.
- S0 src/app/api/watchlist/parse-ticker.ts:1 -- the ticker rule now lives in two places: here and the CHECK at supabase/migrations/20261104000000_watchlist_items.sql:7. This is acceptable as defence in depth. It is a sync point if the rule changes.

UNREQUESTED CHANGES
- None. The parse-ticker.ts extraction serves AC1 and AC2 directly.

QUESTIONS (no line to cite)
- Typecheck, lint and test results are UNMEASURED in this run (no install). Has the change been run under tsc -p tsconfig.json and vitest? In particular, does the "ticker" in body narrowing at parse-ticker.ts:6 compile under strict mode, and do the top-level awaits in the test file run?

VERDICT: APPROVE
Reason: AC1-AC6 are each satisfied by a cited line and a test that fails without it, and there is no S3 finding. The S1 bound and branch test gaps are to be fixed in this PR, and the S2 untested Supabase seam needs an owner and a date.
