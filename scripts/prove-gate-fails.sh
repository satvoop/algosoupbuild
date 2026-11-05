#!/usr/bin/env bash
# Proves every gate step can go red, for the right reason. A check that cannot fail
# is decoration that reads as evidence.
#
#   bash /absolute/path/scripts/prove-gate-fails.sh > prove.log 2>&1; rc=$?
#
# How it stays honest:
# * Isolation. Each leg runs in a throwaway copy under .prove-work/ that is its OWN
#   git repository (fresh `git init`; the real .git, which in a worktree is only a
#   pointer to the shared repository, is never copied). Nothing a leg does can
#   reach the real branches. .env files are never copied.
# * Real dependencies, never the real install. node_modules is copied ONCE into
#   .prove-work/, and each sandbox hard-links that copy. The bundler sees real
#   files (a symlink out of the tree breaks resolution), and a tool that writes
#   into node_modules (caches) writes into the copy, never the real one.
# * Control first. The full gate must be green on an unmutated copy before any
#   mutation counts; otherwise a step could be "red on the defect" when it is red
#   for some other reason. CONTROL-RED stops the run.
# * Attribution. A mutation counts only if the gate exits non-zero AND its summary
#   blames the step the defect was planted for. A plant that itself fails is
#   reported as PLANT-FAILED, never as a result.
#
# Per leg: PROVEN, NOT-PROVEN, MISATTRIB or PLANT-FAILED. Last line PROVE_RC=<0|1>.

set -uo pipefail
cd "$(dirname "$0")/.." || { echo "PROVE_RC=99"; exit 99; }
REPO="$PWD"
WORK="$REPO/.prove-work"
rm -rf "$WORK"; mkdir -p "$WORK"; trap 'rm -rf "$WORK"' EXIT
[ -d "$REPO/node_modules" ] || { echo "node_modules missing: run npm ci first"; echo "PROVE_RC=2"; exit 2; }
echo "PROVE_TREE=$(git rev-parse HEAD 2>/dev/null || echo none) BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) DIRTY_FILES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ') DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cp -a "$REPO/node_modules" "$WORK/node_modules.copy" || { echo "could not copy node_modules"; echo "PROVE_RC=2"; exit 2; }

GIT="git -c user.name=prove -c user.email=prove@example.test -c commit.gpgsign=false"
proven=0 failed=0

sandbox_for() {
  local dir="$WORK/$1"
  mkdir -p "$dir" || return 1
  tar -C "$REPO" --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude=./.prove-work --exclude=./.cache \
    --exclude='./.env*' --exclude=./test-results --exclude=./playwright-report -cf - . | tar -C "$dir" -xf - || return 1
  cp -al "$WORK/node_modules.copy" "$dir/node_modules" || return 1
  ( cd "$dir" && $GIT init -q -b dev && $GIT add -A && $GIT commit -q -m base \
      && git update-ref refs/remotes/origin/dev HEAD && git switch -q -c feat/prove ) || return 1
  echo "$dir"
}

run_gate() {
  ( cd "$1" && env -u GITHUB_HEAD_REF -u GITHUB_REF_NAME -u GATE_BASE bash scripts/gate.sh --skip-install "${@:2}" 2>&1 )
}

control() {
  local dir output rc
  dir="$(sandbox_for control)" || { echo "CONTROL-RED could not build the sandbox"; return 1; }
  output="$(run_gate "$dir")"; rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "CONTROL-RED the full gate is red on an unmutated copy, so no mutation result would mean anything:"
    printf '%s\n' "$output" | grep -E '^(FAIL|GATE_RC)' | sed 's/^/      /'; return 1
  fi
  echo "CONTROL     full gate green on an unmutated copy ($(printf '%s' "$output" | grep -c '^PASS  [a-z-]*$') steps PASS)"
}

# mutate <step> <description> <shell run inside the sandbox>
mutate() {
  local step="$1" description="$2" plant="$3" dir output rc
  dir="$(sandbox_for "$step-$proven-$failed")" || { echo "PLANT-FAILED $step could not build the sandbox"; failed=$((failed + 1)); return; }
  if ! ( cd "$dir" && eval "$plant" ) >/dev/null 2>&1; then
    echo "PLANT-FAILED $step the plant did not apply: $description"; failed=$((failed + 1)); return
  fi
  output="$(run_gate "$dir" --only "$step")"; rc=$?
  if [ "$rc" -eq 0 ]; then
    echo "NOT-PROVEN  $step  stayed green after: $description"; failed=$((failed + 1))
  elif ! printf '%s' "$output" | grep -q "^FAIL  $step$"; then
    echo "MISATTRIB   $step  red, but not blamed on $step after: $description"; failed=$((failed + 1))
  else
    echo "PROVEN      $step  red on: $description"; proven=$((proven + 1))
  fi
}

control || { echo "PROVE_RC=1"; exit 1; }

# Assembled from fragments so this file never contains a literal the secret scan matches.
FAKE_KEY="sk_""live_""$(printf 'x%.0s' $(seq 1 24))"
FAKE_URI="postgresql://app:""$(printf 'p%.0s' $(seq 1 12))""@db.example.test:5432/postgres"

mutate typecheck "a string assigned to a number" \
  "printf 'export const planted: number = \"text\";\n' > src/lib/planted.ts"
mutate lint "an explicit any" \
  "printf 'export const planted: any = 1;\n' > src/lib/planted.ts"
mutate test "a failing assertion" \
  "printf 'import { expect, it } from \"vitest\";\nit(\"planted\", () => { expect(1).toBe(2); });\n' > tests/unit/planted.test.ts"
mutate build "a page importing a module that does not exist" \
  "mkdir -p src/app/planted && printf 'import missing from \"./missing\";\nexport default function P() { return missing; }\n' > src/app/planted/page.tsx"
mutate secrets "a live payment key in a new untracked file after a binary file" \
  "mkdir -p public && printf '\\000\\001binary' > public/planted.bin && printf 'const key = \"%s\";\n' '$FAKE_KEY' > src/lib/zz-planted.ts"
mutate secrets "a database URI with a password, committed on the branch" \
  "printf 'const db = \"%s\";\n' '$FAKE_URI' > src/lib/planted.ts && $GIT add -A && $GIT commit -q -m planted"
mutate secrets "a live payment key inside a committed file git treats as binary" \
  "printf '\\000binary %s\n' '$FAKE_KEY' > src/lib/planted.dat && $GIT add -A && $GIT commit -q -m planted"
mutate secrets "a committed line that starts with '++ ' and carries a key" \
  "printf '++ %s\n' '$FAKE_KEY' > docs/planted.txt && $GIT add -A && $GIT commit -q -m planted"
mutate secrets "a base with no common history (red either way; the named reason is pinned by gate-base.test.ts)" \
  "git update-ref refs/remotes/origin/dev \"\$($GIT commit-tree HEAD^{tree} -m unrelated-root)\""
mutate branch "work on main" \
  "git switch -q -c main"
mutate waivers "a waiver that expired in 2000" \
  "printf '| planted | owner | 2000-01-01 | planted by prove-gate-fails |\n' >> docs/waivers.md"
mutate data-dictionary "a migrated table with no dictionary row" \
  "printf 'create table public.planted (id uuid primary key, email text not null);\n' > supabase/migrations/29991231000000_planted.sql"
mutate data-dictionary "a migration that does not apply" \
  "printf 'create table public.planted (id uuid references nowhere (id));\n' > supabase/migrations/29991231000000_planted.sql"
mutate config "ignoreBuildErrors switched on" \
  "printf '// typescript: { ignoreBuildErrors: true }\n' >> next.config.ts"

echo
echo "proven=$proven not_proven=$failed"
if [ "$failed" -eq 0 ]; then echo "PROVE_RC=0"; exit 0; fi
echo "PROVE_RC=1"
exit 1
