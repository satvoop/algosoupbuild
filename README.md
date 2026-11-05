# Project template

A starting point for a production web product: Next.js + TypeScript (strict) + Supabase +
Vercel, with the delivery discipline built in rather than added later. Generated projects
start from this repo ("Use this template"); the first spec replaces this README's top
section with the product itself.

**Provenance.** This template was prepared in advance and contains no product code. A
project generated from it starts with the scaffolding below and nothing else; everything
product-specific is built in that project's own history.

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
