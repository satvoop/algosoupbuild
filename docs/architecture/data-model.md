# Data model record

Skill: `data-model` v1.0.0

One record per product. Decisions and pointers, not prose. Column-level facts live in
`data-dictionary.yml`, which the gate checks against the migrations. A section that cannot
be answered yet reads `OPEN until <gate>`.

## 0. Depth and platform

**Product:** OPEN until the first spec. **Platform:** Postgres on Supabase.
**Migrations:** `supabase/migrations/`. **Types:** `npm run db:types`.
**Check:** `scripts/check-data-dictionary.mjs` (gate step `data-dictionary`).

**Classes present:**
| Class | Present | Evidence |
| --- | --- | --- |
| Persisted state | | |
| Personal data | | |
| Money or points | | |
| More than one tenant | | |

## 1. Domain

| Entity | What it is (one line) | Owns these facts | Identity | Traces to (screen, flow, rule) |
| --- | --- | --- | --- | --- |

**Relationships:**
| Child | Parent | Cardinality | ON DELETE | Why |
| --- | --- | --- | --- | --- |

## 2. Invariants in the database

| Table | Invariant | Mechanism (NOT NULL / CHECK / FK / UNIQUE / trigger) | What breaks without it |
| --- | --- | --- | --- |

## 3. Access model (RLS)

| Table | Role | Operation | Policy (USING / WITH CHECK) | Allow check | Deny check |
| --- | --- | --- | --- | --- | --- |

Secure defaults already in place: RLS auto-on for new `public` tables; function execute and
anonymous table access revoked by default (`supabase/migrations/*_secure_defaults.sql`).

## 4. Lifecycle

| Table | Retention | Erasure method | Who can trigger it |
| --- | --- | --- | --- |

## 5. Out of scope for now

OPEN until the first spec.
