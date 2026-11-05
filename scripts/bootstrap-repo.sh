#!/usr/bin/env bash
# One-time setup for a repo generated from this template ("Use this template", leaving
# "Include all branches" OFF: copying both branches gives main and dev unrelated histories).
#
#   bash scripts/bootstrap-repo.sh --repo owner/name \
#     [--notion-tasks <collection url>] [--notion-subtasks <collection url>] [--notion-board <url>]
#
# What it does, each step reported with its own rc:
#   1. create whichever of `main`/`dev` is missing from the other (server-side), stop if
#      both exist without shared history, and make `dev` the default branch
#   2. squash-only merges, delete head branches on merge
#   3. Dependabot alerts and security updates on
#   4. rulesets on main and dev (may need a paid plan on a private repo: the
#      result is recorded, never assumed)
#   5. fill the project, repo and (when given) Notion slots in .claude/harness.md
# The record is written to docs/ops/bootstrap-<date>.md. Core steps (1-2) stop
# the script on failure; optional steps (3-5) are recorded and carry on.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 99

REPO="" TASKS="" SUBTASKS="" BOARD=""
while [ $# -gt 0 ]; do
  [ $# -ge 2 ] || { echo "option $1 needs a value"; exit 2; }
  case "$1" in
    --repo) REPO="$2" ;;
    --notion-tasks) TASKS="$2" ;;
    --notion-subtasks) SUBTASKS="$2" ;;
    --notion-board) BOARD="$2" ;;
    *) echo "unknown option: $1"; exit 2 ;;
  esac
  shift 2
done

# Escapes a value for the replacement side of sed s#...#...#: & and # and \.
sed_escape() { printf '%s' "$1" | sed -e 's/[\\&#]/\\&/g'; }
[ -n "$REPO" ] || { echo "usage: --repo owner/name"; exit 2; }

RECORD="docs/ops/bootstrap-$(date -u +%Y-%m-%d).md"
mkdir -p docs/ops
printf '# Bootstrap record\n\nRepo: `%s`. Run %s.\n\n| Step | rc | Note |\n| --- | --- | --- |\n' "$REPO" "$(date -u +%Y-%m-%dT%H:%MZ)" > "$RECORD"
record() { printf '| %s | %s | %s |\n' "$1" "$2" "$3" >> "$RECORD"; echo "STEP $1 rc=$2 $3"; }

GH_ERR="$(mktemp)"; trap 'rm -f "$GH_ERR"' EXIT
gh_error() { tr '\n' ' ' < "$GH_ERR" | cut -c1-120; }

# Sets SHA to a branch's head, or to "" when the branch does not exist (HTTP 404). Any other
# failure (auth, rate limit, network) returns 1 with gh's own message in BRANCH_NOTE. On a 404
# `gh api` still prints the error body on stdout, so the decision is the exit code + stderr.
branch_sha() {
  SHA="$(gh api "repos/$REPO/git/ref/heads/$1" --jq .object.sha 2>"$GH_ERR")" && return 0
  SHA=""
  grep -q '(HTTP 404)' "$GH_ERR" && return 0
  BRANCH_NOTE="could not read branch $1: $(gh_error)"; return 1
}

create_branch() {
  gh api -X POST "repos/$REPO/git/refs" -f ref="refs/heads/$1" -f sha="$2" --silent 2>"$GH_ERR" && return 0
  BRANCH_NOTE="could not create $1 from $3: $(gh_error)"; return 1
}

# main and dev must exist AND share history: the release flow cuts release/* from main and
# the gate diffs it against main. A plain generate copies only the default branch (dev).
ensure_branches() {
  local main dev
  branch_sha main || return 1; main="$SHA"
  branch_sha dev || return 1; dev="$SHA"
  if [ -z "$main" ] && [ -z "$dev" ]; then BRANCH_NOTE="neither main nor dev exists"; return 1; fi
  if [ -z "$dev" ]; then create_branch dev "$main" main || return 1; BRANCH_NOTE="dev created from main"; return 0; fi
  if [ -z "$main" ]; then create_branch main "$dev" dev || return 1; BRANCH_NOTE="main created from dev"; return 0; fi
  if gh api "repos/$REPO/compare/main...dev" --jq .merge_base_commit.sha >/dev/null 2>"$GH_ERR"; then
    BRANCH_NOTE="main and dev exist and share history"; return 0
  fi
  if grep -q 'No common ancestor' "$GH_ERR"; then
    BRANCH_NOTE="main and dev share no history (generated with all branches?): regenerate without it"
  else
    BRANCH_NOTE="could not compare main and dev: $(gh_error)"
  fi
  return 1
}

ruleset_json() {
  local name="$1" branch="$2"
  cat <<JSON
{"name":"$name","target":"branch","enforcement":"active",
 "conditions":{"ref_name":{"include":["refs/heads/$branch"],"exclude":[]}},
 "rules":[{"type":"deletion"},{"type":"non_fast_forward"},{"type":"required_linear_history"},
  {"type":"pull_request","parameters":{"required_approving_review_count":0,"dismiss_stale_reviews_on_push":true,
   "require_code_owner_review":false,"require_last_push_approval":false,"required_review_thread_resolution":true,
   "allowed_merge_methods":["squash"]}},
  {"type":"required_status_checks","parameters":{"strict_required_status_checks_policy":true,
   "required_status_checks":[{"context":"gate"},{"context":"db-defaults"},{"context":"secret-scan"},{"context":"e2e"}]}}]}
JSON
}

apply_ruleset() {
  local branch="$1" out
  out="$(ruleset_json "protect-$branch" "$branch" | gh api -X POST "repos/$REPO/rulesets" --input - 2>&1)"
  local rc=$?
  record "ruleset $branch" "$rc" "$(printf '%s' "$out" | tr '\n' ' ' | cut -c1-120)"
}

fill_profile() {
  local file=".claude/harness.md" name="${REPO#*/}"
  sed -i "s#<OWNER>/<REPO>#$(sed_escape "$REPO")#g; s#<PROJECT_NAME>#$(sed_escape "$name")#g" "$file" || return 1
  if [ -n "$TASKS" ]; then
    sed -i "s#<NOTION_TASKS_DATA_SOURCE>#$(sed_escape "$TASKS")#g; s#<NOTION_SUBTASKS_DATA_SOURCE>#$(sed_escape "$SUBTASKS")#g; s#<NOTION_BOARD_URL>#$(sed_escape "$BOARD")#g" "$file" || return 1
  fi
  local left; left="$(grep -c '<[A-Z_]*>' "$file" || true)"
  record "profile slots" "$([ "$left" = 0 ] && echo 0 || echo 1)" "$left placeholders left in $file (commit the change)"
}

BRANCH_NOTE=""
ensure_branches; rc=$?; record "branches" "$rc" "$BRANCH_NOTE"; [ "$rc" -eq 0 ] || exit 1
gh repo edit "$REPO" --default-branch dev --enable-squash-merge --enable-merge-commit=false \
  --enable-rebase-merge=false --delete-branch-on-merge; rc=$?
record "merge settings" "$rc" "default dev, squash only, delete branch on merge"; [ "$rc" -eq 0 ] || exit 1
gh api -X PUT "repos/$REPO/vulnerability-alerts" --silent; record "dependabot alerts" "$?" ""
gh api -X PUT "repos/$REPO/automated-security-fixes" --silent; record "dependabot security updates" "$?" ""
apply_ruleset main
apply_ruleset dev
fill_profile

echo "record written to $RECORD"
