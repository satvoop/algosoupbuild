# Profile: <PROJECT_NAME>

machine_version: 3.1.0

The project's orchestrator profile. Each `## slot:` fills one named slot of the
twelve-stage delivery machine; the time-boxed variant of the same flow is
`docs/process/timeboxed-delivery.md` (run with `/timebox`). A slot holds this project's
facts only; it never restates a stage.

## slot: identity

- Project: <PROJECT_NAME>. Repo `<OWNER>/<REPO>`. Working branch `dev`, production `main`.
- Stack: Next.js App Router, TypeScript strict, Supabase (Postgres, Auth, RLS), Vercel,
  Vitest, Playwright. See `docs/adr/0001-stack.md`.
- Journey evidence: Playwright against the deployment (`BASE_URL`), plus a walk of the core
  flow in the browser with the build SHA recorded.
- Does NOT have (until a spec adds it): multi-tenancy, payments, outbound email, background jobs.

## slot: approval_chain

The owner only. The Design gate (the design pass), Gate 1 (spec + data model) and Gate 2
(live) in the time-boxed flow; every stage gate in the full flow.

## slot: notion

- Tasks data source: `<NOTION_TASKS_DATA_SOURCE>`
- Sub-tasks data source: `<NOTION_SUBTASKS_DATA_SOURCE>`
- Board: `<NOTION_BOARD_URL>`
- A public repo keeps these three as placeholders: run `scripts/bootstrap-repo.sh` without
  `--notion-*` (the script does not know the repo's visibility, so this is the operator's
  call). The board is then named in the operator's local config file, outside the repo, and
  `/timebox` step 3 reads it from there. Board IDs in a public repo tell a reader where the
  private board lives.
- Title prefix: none (the board belongs to this project alone). No Project select.
- The page BODY carries the discipline: Current Stage, Next Action, Owner, Stage Checklist,
  Artifacts, Blockers, Decisions, Gate Log.
- Pipeline Stage values: Backlog, Spec, Planning, In Progress, Tested, Review, Deploying,
  Shipped, Bug.
- Read and write ONLY these data sources. Never search the wider workspace.

## slot: gate_cmd

`bash "$(git rev-parse --show-toplevel)/scripts/gate.sh" > gate.log 2>&1; rc=$?` -- branch
on `$rc`, quote the `GATE_RC=` line from the log, never pipe it. CI runs the same script plus
`scripts/prove-gate-fails.sh` (`PROVE_RC=` line).

## slot: branch_prefix

`feat/<slug>`, `fix/<slug>`, `chore/<slug>` off `dev`; `release/<slug>` for `dev` -> `main`.

## slot: checklist

- "Design Phase -- lean design pass (docs/design/design-pass.md) filled; design-critic verdict quoted; Design gate approved"
- "Stage 0 Vision -- five challenges (market fit, differentiation, scalability, user value, timing) in one line each; what kills it"
- "Stage 0b PO -- folded into Frame for a one-owner, one-hour build (stated)"
- "Epic Scoping -- slices listed in dependency order; schema is Group 0"
- "Stage 1 Spec -- acceptance criteria per element, edge cases, data model delta"
- "Stage 2 PM -- slices created as Sub-tasks with owned paths"
- "Stage 3 Architecture -- the data model record and slice list; diagram only if a flow crosses more than two parts"
- "Stage 4 Build -- feature branch off dev, gate green after every slice"
- "Stage 4b Test -- unit tests per route (happy and error); Playwright smoke; core flow walked"
- "Stage 5 Review -- gate plus owner approval; stage5-reviewer APPROVE on the full diff (serial, step 12b) or per lane"
- "Stage 5b Compliance -- clean tree, no secrets on added lines, every deferral recorded, copy pass CLEAN"
- "Stage 6 Deploy -- dev -> main by squash with SHA guard; health SHA equals merge commit"

## slot: artifacts

- "Design pass: not yet"
- "Spec: not yet"
- "Data model record: not yet"
- "Branch: not yet"
- "PR (dev): not yet"
- "PR (main): not yet"
- "Live URL: not yet"

## slot: design_phase

The time-boxed flow runs the lean design pass: the `product-design` skill at its Timebox
depth (v2.6.0), filled in `docs/design/design-pass.md` at `/timebox` steps 6a-6e (Frame and
the five challenges, Define, Develop, `design-critic` in a fresh context, the Design gate).
Every skipped step is listed in the pass with its reason; `docs/design/README.md` has the
trace. The user stories become the spec's acceptance criteria. The full flow runs the whole
product-design process.

## slot: data_model

- Platform: Postgres on Supabase. Migrations `supabase/migrations/`, applied with
  `npm run db:push`; an apply is verified by a state probe (the new table or column answers;
  a deny case is refused), never by the CLI's report alone.
- Record `docs/architecture/data-model.md`; dictionary `docs/architecture/data-dictionary.yml`;
  check `scripts/check-data-dictionary.mjs`, gate step `data-dictionary`, negative test in
  `scripts/prove-gate-fails.sh`.
- The dictionary check applies every migration to an in-process Postgres (PGlite) and reads
  the catalog; a migration that needs a Supabase object the model lacks fails the check with
  its own error (add the object to `supabase/tests/supabase-shim.sql`). Extensions the
  local Postgres cannot load (vector, pg_net, pg_graphql, pgjwt, supabase_vault, pg_cron)
  also fail it: see "Extensions the local check cannot load" in `docs/runbooks/deploy.md`.
- Secure defaults: RLS auto-on for new public tables; function execute revoked from PUBLIC,
  anon and authenticated, and anon table access revoked, by default. Proven by behaviour in
  the gate (`tests/unit/migrations/secure-defaults.db.test.ts`), in CI on real Postgres 17
  (`scripts/prove-db-defaults.sh`). On the live project, an anon `42501 permission denied`
  (not an empty `[]`) proves the anon revoke only, not RLS: RLS on and the policy are proven
  live per table by `scripts/probe-rls.mjs` (owner sees its row, an unrelated user sees none;
  `docs/runbooks/deploy.md`).
- Migration lint: named debt `migration-lint` in `docs/waivers.md` (owner Sat, 2027-01-31).
- Seed: synthetic only, `supabase/seed.sql`, applied to a remote demo with `npm run db:push:seed`.
- Types: `npm run db:types` once the first table exists; clients are untyped until then.
- Atomicity: NO. Vercel and Supabase deploy separately; a migration new code depends on ships
  and is probed first.

## slot: stage0_extra

- Is this a real workflow with state, or a wrapper around a model call? Only the first ships.
- What does the user do on day one that they could not do before, in one sentence?

## slot: deploy_steps

**Step 0 (once per project, before any branch is pushed): Vercel.**
`node scripts/setup-vercel.mjs --repo <OWNER>/<REPO> --scope <team> --vars-file .env.local`, then
`node scripts/check-vercel.mjs --project <name> --scope <team> --vars-file .env.local` reads
`CHECK_RC=0`. A new project's first deployment is production whatever branch it came from, so
`main` goes first. The operator puts `.env.local` in place from their own terminal; the agent
never reads it (names decide where values go: see `CLAUDE.md`, Secrets). A key added or
rotated later: `setup-vercel.mjs ... --env-only --keys <NAME>`.

**Step A: Feature -> dev.** PR with the `GATE_RC=0` line quoted. Merge server-side:
`gh api -X PUT repos/<OWNER>/<REPO>/pulls/<n>/merge -f merge_method=squash -f sha="$(gh pr view <n> --json headRefOid --jq .headRefOid)"`;
confirm with `gh pr view <n> --json state,mergedAt`.

**Step B: dev -> main.** `bash "$(git rev-parse --show-toplevel)/scripts/release.sh" <slug>`
cuts `release/<slug>` from `origin/main` with `origin/dev`'s exact tree and opens the PR (a
direct dev -> main PR conflicts after the first squash release). Merge it the same way.

**Step C: Verify live.** `/api/health` returns the merge SHA; Playwright smoke with
`BASE_URL` and `EXPECTED_SHA`; core flow walked in the browser.

**Step D: Clean up.** Feature branches deleted (automatic on merge); end on `dev`, clean tree.

## slot: rules_extra

- A defect found while building gets a Bug card before the fix.
- Anything cut from scope is a Backlog card and a line in the README's known gaps.
