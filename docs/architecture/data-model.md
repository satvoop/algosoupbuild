# Data model record

Skill: `data-model` v1.0.0 (foundation mode, Timebox depth)

One record per product. Column-level facts live in `data-dictionary.yml`, which the gate checks against the migrations.

## 0. Depth and platform

**Product:** Algosoup market analyst PoC: a password-gated tool that watches Polymarket events, pulls news per event and runs stored analysis strategies over it (`docs/design/design-pass.md`). **Platform:** Postgres on Supabase.
**Migrations:** `supabase/migrations/`. **Types:** `npm run db:types`.
**Check:** `scripts/check-data-dictionary.mjs` (gate step `data-dictionary`).

**Classes present:**
| Class | Present | Evidence |
| --- | --- | --- |
| Persisted state | yes | watchlist, news, strategies, runs (design pass section 12) |
| Personal data | no | shared password, no accounts; event titles and news are public data about public events. News may name public figures; nothing is collected about users. |
| Money or points | no | prices are displayed snapshots, never balances |
| More than one tenant | no | one shared workspace `[decision]` "Shared password, server-only DB" |
| AI in production | single prompt-and-response | every LLM call is logged: news query + filter calls on `news_fetches`, strategy calls on `analysis_runs`. Vendor: Anthropic receives event titles, options, news snippets and strategy prompts (no personal data). |

## 1. Domain

| Entity | What it is (one line) | Owns these facts | Identity | Traces to |
| --- | --- | --- | --- | --- |
| watchlist_items | a Polymarket event the workspace tracks | the choice to track, the odds snapshot at add, soft removal | uuid (gen_random_uuid) | Home "Add to watchlist", Watchlist (S3, S8) |
| news_fetches | one "Refresh news" execution | the queries the LLM wrote, models, provider, status, error | uuid | Watchlist item "Refresh news" (S4); critic finding 6 |
| news_articles | an article kept by one fetch | provider fields copied, relevance score | uuid | Watchlist item article list (S4) |
| strategies | a named, stored analysis method | name, prompt template, output type, output schema, seeded flag, archive | uuid | Strategies screen (S5, S6) |
| analysis_runs | one execution of a strategy on an item | rendered prompt, inputs snapshot, output, model, status, strategy name at run time | uuid | Watchlist item "Run" and history (S7, S8) |

**Relationships:**
| Child | Parent | Cardinality | ON DELETE | Why |
| --- | --- | --- | --- | --- |
| news_fetches | watchlist_items | many to one | RESTRICT | items are soft-removed (`removed_at`); history is never cascaded away (P1, critic finding 2) |
| news_articles | news_fetches | many to one | RESTRICT | articles belong to the fetch that kept them; a run's snapshot references them |
| analysis_runs | strategies | many to one | RESTRICT | strategies are archived, not deleted; runs also copy `strategy_name` and `prompt_rendered` so an edit never rewrites history (finding 15) |
| analysis_runs | watchlist_items | many to one | RESTRICT | as above |

## 2. Invariants in the database

| Table | Invariant | Mechanism | What breaks without it |
| --- | --- | --- | --- |
| watchlist_items | one row per Polymarket event | UNIQUE (polymarket_event_id) | adding twice duplicates (S3) |
| watchlist_items | options is a JSON array | CHECK jsonb_typeof = 'array' | renderers and prompts break |
| news_fetches | status is ok or error; error text present on error | CHECK | a failed fetch reads as empty news |
| news_fetches | provider is a known adapter | CHECK provider in ('currents') | unknown source rows; new sources extend the check in a migration |
| news_articles | relevance in [0,1] | CHECK | filter threshold meaningless |
| news_articles | url is http(s) | CHECK url ~ '^https?://' | javascript: links rendered as anchors |
| strategies | name unique and non-empty; output_type text or json; json requires an object schema | UNIQUE, CHECK | runs cannot be validated (finding 3) |
| analysis_runs | status ok requires an output; error requires error text | CHECK | a run with no result reads as success |

## 3. Access model (RLS)

`[decision]` "Shared password, server-only DB". No client role touches any table. RLS is on for all five tables (secure defaults), there are NO policies, and the migration revokes all table privileges from `anon` and `authenticated`. The only access path is server route handlers using the secret-key client (`src/lib/supabase/admin.ts`) after the password-cookie check in `src/proxy.ts`/middleware.

| Table | Role | Operation | Policy | Allow check | Deny check |
| --- | --- | --- | --- | --- | --- |
| all five | anon | all | none (revoked) | n/a | anon select returns `42501` (live probe) |
| all five | authenticated | all | none (revoked) | n/a | revoke asserted in the db test |
| all five | service role (server) | all | bypasses RLS | server route test against fixture client | n/a |

Secure defaults already in place: RLS auto-on for new `public` tables; function execute and anonymous table access revoked by default.

## 4. Lifecycle

| Table | Retention | Erasure method | Who can trigger it |
| --- | --- | --- | --- |
| watchlist_items | indefinite: analysis history | soft remove (`removed_at`); hard delete only by the owner in SQL | the owner |
| news_fetches, news_articles | indefinite: run inputs must stay reproducible | delete by the owner in SQL | the owner |
| strategies | indefinite | archive (`archived_at`) | any password holder |
| analysis_runs | indefinite: the strategy record | delete by the owner in SQL | the owner |

## 5. Out of scope for now

Multi-step strategies (a `strategy_steps` table), more providers (extend `news_fetches.provider` and add a `sources` registry), per-user ownership (an `owner_id` column and RLS owner policies), strategy versions (a `strategy_versions` table). Each is a Backlog card.
