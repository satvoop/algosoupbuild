# Review: server keys to Vercel by name (TEMPLATE-7)

Branch `feat/vercel-server-env`, range `origin/dev..c02e904`. Reviewer: fresh-context Stage 5
agent, four rounds. Lenses: COMMON 1-5 and this repo's `CLAUDE.md`.

## What changed

* `scripts/lib/vars-file.mjs` (new): the vars file is parsed and each key classified by name.
  `NEXT_PUBLIC_*` goes plain to every environment; any other name goes Sensitive, Production
  only. `VERCEL_*` names and malformed lines are refused, and errors name a key or a line
  number, never the rejected text.
* `scripts/setup-vercel.mjs`: sends every key in the file, not only the two public ones.
  * Before sending, it reads the project's env list, which fails closed on an unknown shape,
    pagination or hidden Production entries.
  * It deletes entries stored the wrong way, says ROTATE when a server key was readable, and
    names any key left ABSENT by a failed rewrite.
  * It keeps a deliberately split public key.
  * `--env-only [--keys A,B]` handles a project that is already deployed.
* `scripts/check-vercel.mjs`: `envProblems` judges every non-system entry.
  * A server key must be Sensitive, Production only, and on no branch or custom environment.
  * A public key must be readable and cover every environment, across all its entries.
  * `--vars-file` expects every name in the file.
* Docs: runbook, ADR 0001, `CLAUDE.md` Secrets, `.env.example`, `.claude/harness.md`.

## Rounds

| Round | Head | Verdict | Findings |
| --- | --- | --- | --- |
| 1 | 4bb2257 | BLOCK | S3: the invalid-name error echoed text that could be a value. Nine S1s: truncation before redaction, redaction order, a string `target`, a silent `?? []` env-list fallback, delete-then-failed-rewrite not reported, no rotation note, churn of encrypted and branch public entries, envProblems misfiring on system, branch and split entries, `--env-only` resending every value. Weak or missing tests; harness check without `--vars-file`. S2: custom environments ignored. |
| 2 | 6d3f0a7 | APPROVE | All round-1 findings fixed, each pinned by a test red on 4bb2257's scripts (27 cases). New S1s: the `system` boolean skipped any entry; a split public key was deleted by setup but passed by check. |
| 3 | 2727630 | APPROVE | Both fixed (4 cases red on 6d3f0a7). New S1: a split key was kept even when one entry was already correct, and silently not rewritten when named in `--keys`. |
| 4 | c02e904 | APPROVE | Fixed (3 cases red on 2727630, checked by sha1). One S0 left (below). |

## Evidence on c02e904

* `GATE_TREE=c02e9045d2820d4d637184bc0a3c994ab963356a ... DIRTY_FILES=0`, `GATE_RC=0`, 147 tests.
* `prove-gate-fails.sh`: `PROVE_RC=0`, 14 checks PROVEN.
* Redaction proven to fail: with redaction removed, the echo case goes red.

## Accepted (S0), with reasons

* The ABSENT warning can also name a key that still has a correct entry. Over-warning fails
  safe.
* An all-capitals value ending in `=` on its own line parses as an empty name and is shown in
  the SKIP line. This needs an unusual value shape, and the base64 rule makes it unlikely.
* A public entry synced only to a custom environment is deleted when another entry for the key
  is correct. It is visible in the record, and no value is exposed.
* The 0600 request-body temp file stays in `/tmp` if the process is SIGKILLed (behaviour
  existed before this change).

## Open for the live probe (after the dev merge)

The real env-list shape (array or string `target`, `type: "system"` entries, pagination) and
whether PATCH can change a type in place are both unmeasured. The live probe on a throwaway
project with dummy keys records them.

## Decision for the owner

Server keys go to Production only. A Preview deployment of a feature that needs one throws
`MissingEnvError`. This is fine for a flow that smoke-tests production; widening it would be a
per-key choice.
