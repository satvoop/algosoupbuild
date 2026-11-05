STAGE 5 REVIEW (independent)
Repo: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/s5cal/repo   Diff: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/s5cal/inputs/change-2.patch (calibration fixture, first line begins "CALIBRATION FIXTURE"; `git apply --check` rc 0 against base f008f66)   Spec: /tmp/claude-1000/-home/8e6484db-2dc7-4b55-bd6f-cc9e3d3683c4/scratchpad/s5cal/inputs/spec.md (AC1-AC6)   Lane: none   Head: none   Change id: none
Gate line quoted: MISSING (calibration: true honoured, since the patch is named change-2.patch and its first line begins CALIBRATION FIXTURE, so L1 is N/A)

ACCEPTANCE CRITERIA
- [UNVERIFIED] AC1 signed in with a valid ticker gives 201 `{ "ticker": "<TICKER>" }`, trimmed and upper-cased -- src/app/api/watchlist/route.ts:14 returns `NextResponse.json({ ok: true })` with the default 200 and the wrong body. route.ts:10 inserts `body.ticker` raw, with no trim and no upper-casing. test: src/app/api/watchlist/route.test.ts:16 asserts 200, so it locks in the wrong status.
- [UNVERIFIED] AC2 a ticker not matching `^[A-Z]{1,5}$`, or a malformed body, gives 400 `invalid_ticker` and stores nothing -- there is no validation in route.ts. On a malformed body, route.ts:6 `request.json()` throws before the try, so the response is an unhandled 500, not a 400. A bad ticker reaches the insert, the DB CHECK rejects it, the error is ignored and the route returns 200. test: none.
- [UNVERIFIED] AC3 signed out gives 401 `unauthenticated` and stores nothing -- route.ts:8 never checks for `data.user`. route.ts:10 inserts with `user_id: undefined` and route.ts:14 returns 200. Only RLS and NOT NULL stop the row, and the route still reports success. test: none.
- [UNVERIFIED] AC4 a duplicate ticker gives 409 `duplicate` -- route.ts:10 discards the insert's `{ error }`, so a 23505 from `watchlist_items_user_ticker_key` returns 200. test: none.
- [UNVERIFIED] AC5 any other storage error gives 500 `insert_failed`, never a success -- supabase-js returns `{ error }` and does not throw. The catch at route.ts:11-13 never sees storage errors, and route.ts:14 always returns success. This is exactly the "never a success" case the AC forbids. test: none.
- [UNVERIFIED] AC6 every response above has a test -- route.test.ts has one case (line 13), which asserts the wrong status (200 instead of 201). There are no tests for 400, 401, 409 or 500. test: route.test.ts.

LENSES
- [N/A] L1 -- calibration run with a saved fixture patch named change-2.patch whose first line begins CALIBRATION FIXTURE; there is no gate log.
- [PASS] L2 -- no secret or `.env` value on any added line. Only the RLS-bound server client is used (src/lib/supabase/server.ts), and nothing server-only reaches a client component.
- [N/A] L3 -- a saved patch file has no branch or PR target to check.
- [FAIL] L4 -- route.test.ts:3-8 mocks the whole Supabase client, both auth and insert, so the auth seam and the storage seam are UNTESTED. There is no error-path test for the new route. route.test.ts:16 asserts a status the spec does not allow.
- [FAIL] L5 -- route.ts:11-13 is a silent catch (`catch { // ignore }`). route.ts:6 and route.ts:10 take external input with no boundary validation. route.ts:10 ignores the returned error.
- [N/A] L6 -- the diff has no migration, no data-model.md change and no dictionary change. The table, its UNIQUE and its policies are on the approved base (supabase/migrations/20261104000000_watchlist_items.sql).
- [N/A] L7 -- not a lane review.

FINDINGS
- S3 src/app/api/watchlist/route.ts:14 -- every request returns 200 `{ ok: true }`, whatever happened; AC1-AC5 each name a different status and body, and none of them is produced.
- S3 src/app/api/watchlist/route.ts:10-13 -- the insert's `{ error }` result is discarded and the catch swallows anything thrown; a duplicate, a CHECK violation, an RLS denial or an outage is reported to the user as success (AC4, AC5).
- S3 src/app/api/watchlist/route.ts:8 -- there is no signed-out branch, and `data.user?.id` is passed as `undefined`; an anonymous caller gets a success response instead of 401 (AC3).
- S3 src/app/api/watchlist/route.ts:6 -- `request.json()` sits outside any handling and there is no ticker validation, trim or upper-casing; a malformed body crashes to an unhandled 500, and a lower-case valid ticker such as "aapl" is rejected by the DB CHECK and silently "succeeds" (AC1, AC2).
- S3 src/app/api/watchlist/route.test.ts:13-17 -- the only test asserts 200, where AC1 requires 201, and there are no tests for 400, 401, 409 or 500 (AC6).
- S2 src/app/api/watchlist/route.test.ts:3-8 -- the mock replaces both `auth.getUser` and `from().insert` with fixed successes, so neither seam the route depends on is exercised; the test can only fail if the route stops returning 200, and it would pass even if the insert were deleted.
- S1 src/app/api/watchlist/route.ts:9-13 -- the try/catch can be removed outright; supabase-js does not throw on storage errors, so the block adds nothing but a silent swallow.

UNREQUESTED CHANGES
- src/app/api/watchlist/route.ts:14 -- the response body `{ ok: true }` is not in the spec's contract (AC1 specifies `{ "ticker": "<TICKER>" }`); S3, already counted under AC1.

QUESTIONS (no line to cite)
- Class sweep: a grep for `catch {`, `request.json` and `getUser` in src/ and scripts/ found no sibling instances outside this diff, so the silent-catch pattern is new here, not repeated.

VERDICT: BLOCK
Reason: AC1-AC6 are all unverified: the route returns 200 `{ ok: true }` on every path (route.ts:14), with the storage error discarded (route.ts:10-13), no auth check (route.ts:8) and no validation (route.ts:6), and its only test asserts the wrong status.

Note to dispatcher: the agent file describes the calibration pair as "one defective, one correct". This change-2 fixture is defective on its merits, and I reviewed it as such rather than to an expected label. If change-2 is meant to be the correct fixture, the inputs may be swapped or mislabelled, and that is worth checking before the calibration run is recorded.
