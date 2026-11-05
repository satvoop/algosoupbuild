# Data-model review checklist (D1-D12)

Read at Gate 1 by the `data-model-reviewer` (on the record, the dictionary, the migration and
its tests) and at review by the `stage5-reviewer` (lens L6, on the diff). Each row says
whether this repo enforces it with a script (quote that script's own line) or whether the
reviewer reads and decides. Severity: S3 blocks; S2 needs an owner and a date; S1 is fixed
in this PR; S0 is a note.

| # | Check | Ask | Severity on FAIL | Deterministic line in this repo |
| --- | --- | --- | --- | --- |
| D1 | Dictionary | Does every table and column in the migrations have a row in `data-dictionary.yml`, with a class? Does the record's depth line (section 0) match the classes the diff adds? | S3 | Yes: the gate's `data-dictionary` step (`scripts/check-data-dictionary.mjs`) |
| D2 | Row security | S3: RLS on every table in `public`; no `USING (true)` or `WITH CHECK (true)` on INSERT, UPDATE or DELETE; one allow and one deny test per policy or definer function. The allow fails if its policy is removed (RLS then denies by default); the deny fails if its policy is loosened, to `true` or to any signed-in user, and proves the row unchanged. A write checked with `RETURNING` is also filtered by the SELECT policy, so it can pass for the wrong reason. S1: one policy per operation with `TO <role>`; `FOR ALL` only where USING and WITH CHECK are the same predicate; `auth.uid()` wrapped as `(select auth.uid())`; FORCE RLS where the table owner is an application role (not where the owner bypasses RLS, which the record states). | S3 for the S3 asks, S1 for the rest | Partly: the db tests in the gate (a local model of Supabase); live, per table, `scripts/probe-rls.mjs` (anon refused with `42501`, the owner sees its row, an unrelated user sees none). An anon `42501` alone proves the revoke, not RLS. |
| D3 | Server-owned columns | On a table with a column that money, approval or fulfilment depends on, which columns does the write policy pin, and which trigger or CHECK enforces the rest? An ownership-only policy (`user_id = auth.uid()`) on such a table is FAIL. | S3 | No |
| D4 | One owner per fact | Does the diff add a second home for a fact? A copy is a cache (marked at the write site, and read by no decision path: grep the READERS) or a snapshot (a historical fact, marked, never synced). Anything else FAILs. Where two homes coexist through a migration window, is every live writer and reader named, and the contract step carded? What does NULL mean in each place, and do all layers agree? | S2 | No |
| D5 | Money and points | Integer minor units or `numeric` with a stated scale, never float or `money`; no `DEFAULT 0`; a CHECK. Money that moves goes through a ledger, not a mutable balance. | S3 | Partly: a grep for `DEFAULT 0` on money columns |
| D6 | Indexes | Every new foreign key column is indexed, and every column a policy predicate reads, leading a composite where an owner column exists. | S2 | No (no advisor in the local check) |
| D7 | Personal, special, secret | For each personal or special column: is it an identifier (kept in an isolation table, or a surrogate only), a published copy (marked, and erased with its content), or published content (a written erasure decision)? Does the dictionary name its erasure method per store, and is it kept out of logs? A hiding status (`archived`, `removed`) that keeps personal columns without that decision FAILs. A secret is not stored in an app table, or is envelope-encrypted with a named key and rotation. Card data: a processor token, last4, brand and expiry only. | S3 | Partly: the dictionary check requires the erasure field |
| D8 | Migration discipline | Created with `npm run db:new`; linted, or the lint debt named with an owner and a date (no line at all is FAIL); the header declares idempotent (re-runnable) or applied-once, and the body matches; no rename, drop or type change without an approval quoted; a breaking change goes expand, migrate, contract, with the contract step carded; an applied migration is never edited. Where apply and deploy are not atomic, the migration ships alone and is probed live before code that needs it. | S3 | Partly: lint debt named in `docs/waivers.md` (`migration-lint`) |
| D9 | Generated types | Types regenerated after a schema change (`npm run db:types`) and compiled by the gate. | S2 | Yes: the gate's typecheck step |
| D10 | Lifecycle | Each new table has a retention line and an erasure method. Consent is a versioned statement plus events, not a boolean. Audit rows are append-only. A state change on a server-owned row is recorded, not overwritten. | S2 | Partly: the dictionary check requires the retention field |
| D11 | Identity, types, naming | A primary key on every table; `bigint` identity or UUID with the reason, never `serial`; `timestamptz`; `text` with a CHECK over `varchar(n)`; an enum only for a fixed set; snake_case; `updated_at` maintained by a trigger. | S1 | No |
| D12 | Sub-models | A ledger: entries sum to zero per transaction by constraint (not convention), posted rows immutable at the grant level, corrections by reversal, balances derived, an idempotency key on every external write, an outbox for events. Agents: run and step carry an idempotency key, the approval record is a correlation token and not authorisation, memory changes only by append with provenance. Tenants: a tenant id on every tenant-scoped row, composite foreign keys. N/A with the reason when none is present. | S3 for sum-to-zero, immutability, approval-as-authorisation and a missing tenant id; S2 for the rest | Partly: constraints and REVOKEs are visible in the DDL |

Sources: Supabase RLS and API security docs; OWASP ASVS 5.0 (V14), OWASP Logging Cheat
Sheet; UK ICO guidance on storage limitation, erasure and consent; PCI DSS 3.3.1; the
PostgreSQL wiki "Don't Do This".

## How the reviewer runs it

1. **Trace first, both ways.** Every entity in the record traces to an acceptance criterion
   in the spec, and every column in the migration appears in the record and the dictionary.
   Every criterion that reads or writes data names the table, column or constraint that
   serves it.
2. **D1-D12 in order**: PASS, FAIL (file:line or record section), or N/A with the reason. A
   deterministic row quotes the script's own line; a summary of it is S2. A skipped row is
   FAIL.
3. **The class.** A FAIL on one table is checked on every sibling with the same shape (every
   money column, every table with a `status`, every table with a personal column).
4. **Verdict**: APPROVE or BLOCK. Any S3 is BLOCK. There is no approve-with-conditions.

```
DATA MODEL REVIEW (independent)
Record: <path>   Dictionary: <path>   Migrations: <paths>
Check line quoted: <data-dictionary step line or MISSING>

TRACE
- [TRACED | UNTRACED] <entity or column> -- <where>

LENSES
- [PASS | FAIL | N/A] D<n> <name> -- <file:line or section>; <line quoted, or "prose">

FINDINGS
- S<n> <file:line or section> -- <what is wrong>; <why it matters>

CLASS SWEEP
- <family>: <tables checked>; <siblings with the same defect>

QUESTIONS (no line to cite)
- <question>

VERDICT: APPROVE | BLOCK
Reason: <one sentence naming the deciding finding>
```
