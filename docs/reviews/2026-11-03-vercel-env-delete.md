# Review: in-place env repair, never DELETE (TEMPLATE-8)

Branch `fix/template-vercel-env-delete`, range `origin/dev..787fb58`. The spec is the bug file
`docs/bugs/2026-11-03-vercel-env-delete.md`. Reviewer: a fresh-context Stage 5 agent, three
rounds. Lenses: COMMON 1-5 and this repo's `CLAUDE.md`.

## What changed

* `scripts/lib/env-plan.mjs` (new, split out of `setup-vercel.mjs`): plans one step per key.
  * PATCH for a single wrong entry, only in the directions measured live:
    * a server entry made sensitive and production-only;
    * a readable public entry whose targets alone change.
  * Anything else is refused before any write, naming each key, its entry count and its
    rotation advice.
  * A public entry scoped to a branch or synced to a custom environment is left alone.
* `scripts/setup-vercel.mjs`: no DELETE step remains. The ABSENT bookkeeping is gone. The
  record cap is 4000 characters, applied after redaction.
* `tests/unit/scripts/helpers/fake-vercel.ts`: refuses every DELETE with the real CLI's
  message, and accepts PATCH.
* The runbook describes in-place correction and the refusal.

This change supersedes the delete-and-rewrite and ABSENT lines in
`2026-11-03-vercel-server-env.md`. That file stays as the record of its review.

## Rounds

| Round | Head | Verdict | Findings |
| --- | --- | --- | --- |
| 1 | a01dfb5 | APPROVE | S2: the refusal dropped the rotation advice. S1: an unmeasured PATCH direction on a public key stored sensitive; a public custom-environment entry stopped the run although the check passes it; the bug file overstated the old failure mode; the probe log mis-explained a marker hit. S0s: test assertions, a runbook line break. |
| 2 | ec70891 | APPROVE | All closed (8 cases red on a01dfb5). S1: the 400-character cap cut a long refusal. |
| 3 | 787fb58 | APPROVE | Closed (1 case red on ec70891). S0s: comment wording, and a red log without a header. Both fixed. |

## Evidence

* `GATE_TREE=787fb58...`, `GATE_RC=0`, 151 tests. `PROVE_RC=0`, 14 checks PROVEN.
* Live legs P1-P3 and R1 on a throwaway project with dummy values. No dummy value appeared
  in any script output or record.

## Accepted (S0)

* A public override entry stored sensitive is skipped by setup but failed by check. The
  stricter check wins, so it fails safe.
* Integration-managed entries, and custom environments on this plan tier, are unmeasured.
  Either gives an API error or a refusal, never a silent write.
