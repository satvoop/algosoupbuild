# Algosoup market analyst (proof of concept)

A password-protected tool for a trader to analyse prediction markets. It loads the top 10
Polymarket events by volume, lets the trader keep a watchlist, pulls current news for each
watched event, and runs stored **analysis strategies** (prompts with a defined output) over
that data. Every run is stored with the exact prompt and inputs it used, so the same method
can be re-run on the same market over time and on other markets.

Live: https://algosoupbuild.vercel.app (shared password, handed out by the owner).

## What this is, and is not

This is a **proof of concept for analysing data that is relevant to a trader**. Here the only
data source beyond Polymarket is a free news API (Currents), and the only analysis engine is a
single LLM call per strategy. The point is the shape, not the signal quality:

* **Sources are pluggable.** News comes through a `NewsSource` interface
  (`src/lib/news/types.ts`); Currents is one implementation (`src/lib/news/currents.ts`).
  A paid news feed, a social or on-chain feed, or a polling source is added by implementing
  the interface and extending the `provider` check in a migration. Each fetch is logged
  (`news_fetches`) with the queries and model that produced it.
* **Strategies are data, not code.** A strategy is a row: name, prompt template with
  placeholders, and an output type (free text, or JSON checked against a stored schema).
  The Strategies page is the menu of analysis types; three starters ship: News summary,
  Option mention count (counts mentions per option and lets the strategy decide what a high
  or low count signals) and Bull/bear case.
* **Results are records.** `analysis_runs` keeps the rendered prompt, an inputs snapshot
  (odds and articles), the output, the model and the status. Runs are append-only.

Not built (each is a Backlog card on the board):

* Multi-pronged strategies: chaining several steps and sources into one strategy, with a
  combiner step (a `strategy_steps` table).
* **The next step:** an algorithm that matches the odds on the prediction market against the
  probabilities produced by different strategies, to flag mispriced options. A useful version
  needs structured probability outputs, more and better data, and backtesting against
  resolved markets; there was not enough time in this build to make it meaningful.
* Scheduled re-runs, strategy versioning, a run comparison view, per-user accounts.

## How it works

1. **Password.** `APP_PASSWORD` (server env). A correct entry sets an HMAC-signed, httpOnly
   cookie for 7 days; `src/proxy.ts` guards every page and API. Changing the password signs
   everyone out.
2. **Markets.** "Load top 10" calls Polymarket's public Gamma API
   (`/events?order=volume&ascending=false&closed=false&limit=10`). Events, not single markets,
   because the top single markets are near-duplicate legs of one event. Not stored.
3. **Watchlist.** "Add to watchlist" stores the event with an odds snapshot. Remove is a soft
   remove; news and runs are kept.
4. **News refresh** (the news prompt was designed by a live experiment, 2026-11-05):
   the event title plus two LLM-written keyword queries (years stripped) go to Currents,
   results are de-duplicated by URL and title, and one Claude Haiku call scores every article
   0-1 for relevance; articles at 0.5 or above are kept. If the scorer's reply is unusable the
   unfiltered list is kept and marked so. About 5 s and 3 Currents calls per refresh.
   Prompts: `src/lib/news/prompts.ts`.
5. **Run a strategy.** The template is filled with `{{event_title}}`, `{{options}}`,
   `{{articles}}` and `{{article_count}}`, Claude is called at temperature 0 with a 30 s
   timeout, and the run is stored. With no news the run still happens and says so. A JSON
   output missing the schema's `required` keys is stored as a failed run with the raw text.

Stack: Next.js 16, TypeScript strict, Supabase Postgres (server-only access with the secret
key; RLS on and no client privileges), Vercel. Data model: `docs/architecture/data-model.md`.
Design: `docs/design/design-pass.md`. Spec: `docs/specs/product-spec.md`.

## Configuration

Server-only variables (values `[see .env]`): `APP_PASSWORD`, `SUPABASE_SECRET_KEY`,
`ANTHROPIC_API_KEY`, `CURRENTS_API_KEY`; public: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Known gaps

* No rate limit on the password form; the password guards paid API spend.
* UI states and the returning-visitor journey are proven by a human walk, not automated tests.
* Currents free tier: 250 requests/day (about 80 refreshes), attribution required (shown).
  Polymarket's terms should get a legal read before any commercial use.
* LLM output varies even at temperature 0; "repeatable" means same method and recorded inputs,
  not identical text.
* The design hypothesis (strategies re-run across markets and dates) needs real users over
  days to test.

---

# Template notes

## What you get

| Area | What is in place |
| --- | --- |
| Gate | `scripts/gate.sh`: typecheck, lint (no `any`), tests, build, secret scan, branch rules, waivers, data dictionary, build-error ban. Exit code is the result, last line `GATE_RC=` |
| Proof | `scripts/prove-gate-fails.sh` plants a defect per step and proves each goes red |
| CI | The same gate and proof on every PR, the database defaults proven against real Postgres, gitleaks, runtime `npm audit`, Playwright |
| Database | Supabase migrations; RLS on automatically for new tables; function execute and anonymous table access revoked by default |
| Data record | `docs/architecture/data-model.md` + `data-dictionary.yml`, checked against what the migrations really create (applied to an in-process Postgres) |
| Web | Security headers and an enforced Content Security Policy on production builds |
| Ops | `/api/health` returns the deployed commit; `scripts/release.sh`; deploy and incident runbooks |
| Delivery | Stage profile (`.claude/harness.md`), one-hour flow (`docs/process/timeboxed-delivery.md`, `/timebox`) |
| Design | Lean design pass (`docs/design/design-pass.md`, `product-design` at Timebox depth), critique checklist, optional modules, copy pass |
| Reviewers | Fresh-context agents in `.claude/agents/`: `design-critic`, `data-model-reviewer`, `stage5-reviewer`, each with a calibration pair in `docs/reviews/calibration/` |

## Run it

```bash
npm ci
cp .env.example .env.local   # fill from the password manager
npm run dev
```

## Check it

```bash
bash "$PWD/scripts/gate.sh" > gate.log 2>&1; echo "rc=$?"; grep GATE_RC gate.log
bash "$PWD/scripts/prove-gate-fails.sh" > prove.log 2>&1; echo "rc=$?"; grep PROVE_RC prove.log
./node_modules/.bin/playwright test                  # local build
BASE_URL=https://<domain> ./node_modules/.bin/playwright test   # a deployment
```

## Start a new project from it

1. "Use this template" on GitHub with "Include all branches" left OFF (or
   `gh repo create <owner>/<name> --private --template satvoop/enterprise-template`), then
   `bash scripts/bootstrap-repo.sh --repo <owner>/<name>`. Bootstrap creates `main` from `dev`
   so the two share history; copying both branches gives them unrelated histories, and
   bootstrap stops on that.
2. Follow `docs/runbooks/deploy.md` for Supabase and Vercel.
3. Write the first spec in `docs/specs/` and the data model before any table.

## Reading order

1. `CLAUDE.md`: the rules every agent and person works to
2. `docs/adr/0001-stack.md`: why this stack
3. `docs/process/timeboxed-delivery.md`: the delivery flow
4. `docs/design/README.md`: the design pass the flow starts with
5. `docs/runbooks/deploy.md`: setup and release
6. `docs/architecture/data-model.md`: the data model record
