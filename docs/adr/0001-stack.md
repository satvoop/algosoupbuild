# ADR 0001: Stack

Status: accepted (template default; a product may supersede it with its own ADR).
Date: 2026-11-03.

## Decision

* **Next.js App Router on Vercel.** One framework for UI and API routes; preview deploy per
  PR; production promoted from `main`.
* **Supabase (Postgres, Auth, RLS).** Authorization lives in the database as policies, so a
  bug in a route cannot read past a policy. Migrations are plain SQL under version control.
* **TypeScript strict.** Types are the first test.
* **Vitest** for unit tests, **Playwright** for browser journeys, run against local, preview
  or live by `BASE_URL`.
* **Tailwind CSS 4.** No component library by default; add one with its own ADR.

## Versions

Pinned exactly in `package.json`, each at least two weeks old when chosen, runtime audit clean.
ESLint stays on 9 while the Next lint plugins need peer overrides on 10 (see `docs/waivers.md`).

Node.js: one major everywhere, Node 24 (LTS), in `.nvmrc` (CI and local) and `engines.node`
`24.x`. Amended 2026-11-03 (TEMPLATE-4): the earlier range `>=22 <25` let Vercel build on 24
while CI tested on 22, because `engines.node` overrides the project setting
(https://vercel.com/docs/functions/runtimes/node-js/node-js-versions). A unit test fails if the
two pins disagree; `scripts/check-vercel.mjs` also checks the project setting.

Environment variables: the name is the contract (amended 2026-11-03, TEMPLATE-7). `NEXT_PUBLIC_*`
is public (Next.js inlines it into the bundle) and goes plain to every Vercel environment; every
other name is server-only and goes Sensitive, Production only, which Vercel makes write-only
(https://vercel.com/docs/environment-variables/sensitive-environment-variables).
`scripts/setup-vercel.mjs` writes them and `scripts/check-vercel.mjs` fails a project that
stores one any other way.

Dev dependencies beyond the framework, and why:
* `yaml` (eemeli/yaml): parses `docs/architecture/data-dictionary.yml` for the gate's
  dictionary check. Zero dependencies of its own, actively maintained, full YAML 1.2.
  Hand-parsing YAML would be a worse risk than one small, well-known package.
* `@electric-sql/pglite` (ElectricSQL, Apache-2.0, zero dependencies): Postgres compiled to
  WebAssembly, run in-process by the gate. The dictionary check applies the migrations to
  it and reads the real catalog, and the secure defaults are tested by behaviour against
  it, locally, with no server. Chosen after four review rounds showed a regex SQL parser
  keeps missing forms that create columns (CTAS column lists, INHERITS, SELECT INTO in a
  CTE). Postgres 18 locally versus 17 on Supabase; CI repeats the defaults proof on a real
  Postgres 17 (`scripts/prove-db-defaults.sh`).
* `supabase` (CLI): migrations, linking, type generation, run as
  `./node_modules/.bin/supabase` so the version is the locked one.

## Consequences

* Two deploy surfaces (Vercel code, Supabase schema) do not deploy atomically. A migration
  that new code depends on ships first, is probed live, then the code ships.
* Free tiers are fine for demos. Production needs Supabase Pro (backups, no pausing) and a
  Vercel plan with spend controls; see `docs/runbooks/deploy.md`.
