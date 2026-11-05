# Bug: setup-vercel cannot repair a wrongly stored key (TEMPLATE-8)

## B1 Capture

* **Symptom.** When an existing variable is stored the wrong way (a server key that is readable,
  on Preview, or on a custom environment), `setup-vercel.mjs` plans to DELETE the entry and
  write it again. The Vercel CLI refuses the DELETE, so the run stops with rc 1 and the entry
  stays as it was.
* **How it was found.** The TEMPLATE-7 live probe on dev 5b5b06c, run against a throwaway
  project with dummy values. A direct `vercel api -X DELETE /v9/projects/<p>/env/<id>` returned
  rc 1, and stderr read: `Error: DELETE operations require confirmation. Use
  --dangerously-skip-permissions to skip confirmation in non-interactive mode.` (CLI 64.7.0,
  Node 24.22.1.)
* **Reproduction.**
  1. Store a server key plain on a project, for example by POSTing it with `type: plain`.
  2. Run `node scripts/setup-vercel.mjs --repo <o>/<p> --scope <team> --vars-file .env.local --env-only --keys <KEY>`.
  3. Planned steps are a DELETE then a POST. The DELETE fails with the confirmation error, and
     nothing is written.
* **Measured on the same probe** (the evidence for the fix direction):
  * `PATCH /v9/projects/<p>/env/<id>` with `{"type":"sensitive"}` changed a plain entry to
    sensitive in place, keeping the same id.
  * `PATCH` with `{"target":[...]}` changed its targets in place.
  * Both returned rc 0 with no confirmation prompt.
* **Severity: P1.** A live probe found it (parking escalation), and it breaks the repair path
  of a security hardening feature. It fails closed:
  * the run stops before any write;
  * no value is exposed;
  * `check-vercel.mjs` still reports the bad entry (proven live: `CHECK_RC=1`, `<KEY> is 'plain', expected 'sensitive'`);
  * a fresh project, the normal path, never needs a DELETE.

Correction (B7, 2026-11-03): "the run stops before any write" holds only for a single-key
`--env-only --keys` run. A full run on 5b5b06c wrote the Node setting and the keys before the
first DELETE (measured in the B2 red log: `node 24.x rc=0` and two public env steps `rc=0`
before the refused DELETE). No value was exposed either way. The capture lines above stay as
first written.

B1 approved by Sat on 2026-11-03 at P1, together with the fix direction: "Approve, fix with PATCH".

## B2 Reproduce

The test fake now refuses every DELETE with the real CLI's measured message
(`tests/unit/scripts/helpers/fake-vercel.ts`). On dev 5b5b06c, 6 of 123 cases go red, and these
are the repair-path cases:
* "deletes a readable server entry first, then writes it, and says to rotate it"
* "rewrites a public key that has one correct entry, whatever other entries it has"
* "says to consider rotating a sensitive server key that reached a custom environment"
* "says to consider rotating a sensitive server key that reached Preview"
* "names a key it deleted but could not rewrite"
* "fixes a wrongly stored entry the same way"

## B3 Root cause and blast radius

5 Whys:
1. Why did the repair fail? The CLI refused the DELETE step.
2. Why did the code use DELETE? Vercel documents no in-place type change, so delete-and-rewrite
   was chosen from the docs.
3. Why was that not caught? The fake CLI answered DELETE with success. It modelled the CLI's
   output shapes, not its confirmation policy.
4. Why was the policy not modelled? Every CLI behaviour the fake encodes was measured live, and
   no live run had issued a DELETE: a fresh project never needs one.
5. Why had no live run exercised it? The TEMPLATE-7 live probe was sequenced after the merge,
   and it is the probe that found this.

The systemic cause is a test double trusted on a path no live run had exercised.

Barrier analysis:

| Barrier | Should it have caught this? | Why it did not |
| --- | --- | --- |
| Unit tests | Yes | The fake allowed DELETE. |
| Review (4 rounds) | Partly | The live probe was asked for; the CLI's DELETE policy was not visible from the code. |
| Type system, gate | No | This is behaviour at runtime. |
| Live probe | Yes, and it did | It ran after the merge to dev. Merging before the probe was the planned order. |

Class sweep: one DELETE in `scripts/` (`setup-vercel.mjs` env repair). Every other write the
scripts make (project create, project PATCH, env POST, deployment POST) has run live, either
in the TEMPLATE-4 probe or in tonight's. The `gh` calls in `bootstrap-repo.sh` are a different
CLI with their own measured behaviour. The tests carried DELETE expectations in
`setup-vercel-env.test.ts`, and these change with the fix.

Class: mock-reality divergence.

## B4 Fix plan (approved direction: PATCH in place)

* **Minimum:** swap DELETE+POST for PATCH on a single wrong entry.
* **Recommended (this fix):**
  * PATCH `{type, target, value}` on a single wrong entry. Both type and target were measured
    live to change in place, keeping the entry's id.
  * Refuse before any write when an entry needs removal, naming the key and saying "remove it
    in the dashboard". That covers:
    * an extra entry next to a correct one;
    * several wrong entries;
    * a branch-scoped server entry;
    * a custom-environment server entry.

    Clearing a branch scope or a custom-environment sync through PATCH is unmeasured, and this
    account has no custom environments to test on.
  * Drop the ABSENT bookkeeping: with no deletes, a key can no longer be left absent.
  * The fake keeps refusing DELETE. That is the prevention.
* **Maximum:** also measure clearing `gitBranch` and custom-environment syncs through PATCH.
  Out of reach on this plan tier.
* **Rollback:** `git revert` of a scripts-only change. No migration.
* **Risks:** PATCH on an entry with a value but no `value` in the body. We always send the value.
* **Live probe:** the dummy `LIVE7_PLAIN_KEY` on the throwaway project (left sensitive on
  production and preview) gets `--env-only --keys LIVE7_PLAIN_KEY`. Expected result: a PATCH to
  production only, then `check-vercel` reads `CHECK_RC=0` for it. The probe reaches the
  `envSteps` PATCH branch in `scripts/setup-vercel.mjs`.

B7 round 1 (fresh-context review, APPROVE with findings), closed in this fix:
* The refusal now carries each key's rotation advice: ROTATE when an entry was readable,
  "consider rotating" when an entry reached a non-production deployment.
* PATCH is limited to the measured directions: a server entry made sensitive and
  production-only, or a readable public entry whose targets alone change. Anything else is
  refused, including a public key stored sensitive and an unmeasured type such as `secret`.
* A public entry synced to a custom environment is left alone, as check-vercel's union rule
  does.
* The planning code moved to `scripts/lib/env-plan.mjs`, keeping `setup-vercel.mjs` under the
  file-size limit.

Found by the live probe: Vercel's env-list response echoes plain values. Neither script
prints that response, and a grep confirms it: `listProjectEnv` results feed planning and
checks only.

## B5 Architecture impact

No ADR change. The runbook line about deleting and rewriting entries changes to correcting
them in place, and a new line covers the refusal for extra entries.

## B6 Build and verify

Final head 787fb58:
* Gate: `GATE_RC=0` (151 tests). `prove-gate-fails.sh`: `PROVE_RC=0` (14 PROVEN).
* Red proofs, each with the sha1 of the script under test:
  * 9 cases red on 5b5b06c;
  * 8 red on a01dfb5;
  * 1 red on ec70891.
* Live, on a throwaway project with dummy values:
  * an entry on Preview was corrected in place, keeping its id;
  * a plain entry was corrected and flagged ROTATE;
  * a key with a second entry was refused with no writes, its entries unchanged, and the
    ROTATE advice in the refusal;
  * no dummy value appeared in any script output or record.

## B7 Review

A fresh-context reviewer ran three rounds, all APPROVE.
* Round 1's findings are listed above.
* Round 2 found the 400-character record cap cutting a long refusal. Fixed: the cap is now
  4000, applied after redaction.

## B8 Prevention

The test fake refuses every DELETE with the message the real CLI returned
(`tests/unit/scripts/helpers/fake-vercel.ts`). A reintroduced DELETE step turns the repair
tests red: on 5b5b06c, the code that issued DELETE, 9 cases fail. The class
(mock-reality divergence) is already listed in the debugger's patterns, so this is a
recurrence, which is why it sits at P1 at minimum.

The rule this bug adds to the record: a test double's behaviour for a write method is
measured live before code depends on it. Every write the template scripts make now has a
live measurement on record:
* project create, project PATCH and deployment POST: the TEMPLATE-4 probe;
* env POST, env PATCH, and DELETE refused: the TEMPLATE-7 and TEMPLATE-8 probes.

## Postmortem (P1)

* **Timeline (2026-11-03):**
  * TEMPLATE-7 merged to dev at 21:35.
  * The live probe found the DELETE refusal within minutes, and TEMPLATE-8 was carded.
  * Sat approved the P1 and the PATCH direction.
  * The fix was built and reviewed over three rounds.
* **What went well:**
  * The live probe was planned before release, so it caught this before main.
  * PATCH was measured in the same probe, which made the fix direction clear at once.
* **What went poorly:**
  * The fake CLI was trusted on a path no live run had exercised.
  * Four review rounds on TEMPLATE-7 could not see it from the code.
* **Where we got lucky:**
  * It fails safe: nothing is exposed, and check-vercel still flags the bad entry.
  * A fresh project, the normal path, never needs the repair.
