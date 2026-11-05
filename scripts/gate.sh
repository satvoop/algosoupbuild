#!/usr/bin/env bash
# The pre-merge gate. One command, the same locally and in CI.
#
#   bash /absolute/path/scripts/gate.sh > gate.log 2>&1; rc=$?
#
# * The exit code IS the gate. Branch on $rc. Never pipe this script through tail,
#   head or grep: a pipeline returns the last command's status, so red reads green.
# * Quote the GATE_RC line, and the header line above it, from the log. The header
#   says which tree, which base and which options produced the result.
# * Self-locating: it checks the tree it lives in, wherever the shell is.
#
# Options:  --only <step>   run one step     --skip-install   skip `npm ci`
# Env:      GATE_BASE       ref the secret scan diffs against (CI sets it to the PR
#                           base or the pushed range's start); default origin/dev,
#                           or origin/main on a release/* branch
# Steps: install typecheck lint test build secrets branch waivers data-dictionary config

set -uo pipefail
cd "$(dirname "$0")/.." || { echo "GATE_RC=99"; exit 99; }

ONLY="" SKIP_INSTALL=0
while [ $# -gt 0 ]; do
  case "$1" in
    --only) [ $# -ge 2 ] || { echo "--only needs a step name"; echo "GATE_RC=98"; exit 98; }; ONLY="$2"; shift 2 ;;
    --skip-install) SKIP_INSTALL=1; shift ;;
    *) echo "unknown option: $1"; echo "GATE_RC=98"; exit 98 ;;
  esac
done

branch_name() {
  if [ -n "${GITHUB_HEAD_REF:-}" ]; then echo "$GITHUB_HEAD_REF"; return; fi
  if [ -n "${GITHUB_REF_NAME:-}" ]; then echo "$GITHUB_REF_NAME"; return; fi
  git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(not a git tree)"
}

base_ref() {
  # A first push of a branch reports an all-zero "before" SHA: fall back to dev.
  if [ -n "${GATE_BASE:-}" ] && ! [[ "$GATE_BASE" =~ ^0+$ ]]; then echo "$GATE_BASE"; return; fi
  # A release branch is cut from main and merges into main, so main is its base (as in CI).
  local candidate preferred=origin/dev
  case "$(branch_name)" in release/*) preferred=origin/main ;; esac
  for candidate in "$preferred" origin/dev origin/main; do
    git rev-parse --verify --quiet "$candidate" >/dev/null && { echo "$candidate"; return; }
  done
}

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
echo "GATE_TREE=$(git rev-parse HEAD 2>/dev/null || echo none) BRANCH=$(branch_name) DIRTY_FILES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ') BASE=$(base_ref) ONLY=${ONLY:-all} SKIP_INSTALL=$SKIP_INSTALL DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

overall=0 SUMMARY="" RAN=0
run_step() {
  local name="$1"; shift
  if [ -n "$ONLY" ] && [ "$ONLY" != "$name" ]; then return 0; fi
  RAN=1; echo; echo "=== STEP $name"
  local started=$SECONDS
  "$@"; local rc=$?
  echo "=== STEP_RC $name $rc ($((SECONDS - started))s)"
  local label="PASS"
  [ "$rc" -eq 0 ] || { label="FAIL"; overall=1; }
  [ "$rc" -eq 0 ] && [ "$name" = install ] && [ "$SKIP_INSTALL" -eq 1 ] && label="SKIP"
  SUMMARY="$SUMMARY
$label  $name"
}

step_install() {
  if [ "$SKIP_INSTALL" -eq 1 ]; then echo "SKIP  install not run (--skip-install): the lockfile install is unproven by this run"; return 0; fi
  npm ci --no-audit --no-fund
}

# Bounded to the named tsconfig, and it prints how many project files it checked:
# a typecheck that checks zero files passes, so zero is a failure here.
step_typecheck() {
  ./node_modules/.bin/tsc --noEmit -p tsconfig.json --listFiles > "$TMP/tsc.out" 2>&1; local rc=$?
  local files; files="$(grep -E '^/' "$TMP/tsc.out" | grep -vc '/node_modules/')"
  grep -vE '^/' "$TMP/tsc.out"
  [ "$files" -gt 0 ] || { echo "FAIL  typecheck compared 0 project files"; return 1; }
  echo "$([ "$rc" -eq 0 ] && echo PASS || echo FAIL)  typecheck $files project files compared"
  return "$rc"
}

step_lint() {
  ./node_modules/.bin/eslint --max-warnings=0 --format json --output-file "$TMP/lint.json" .; local rc=$?
  node -e '
    const r = require(process.argv[1]);
    for (const f of r) for (const m of f.messages) console.log(`${f.filePath}:${m.line}:${m.column} ${m.ruleId ?? "parse"} ${m.message}`);
    const problems = r.reduce((n, f) => n + f.messages.length, 0);
    console.log(`${problems === 0 ? "PASS" : "FAIL"}  lint ${r.length} files compared, ${problems} problems`);
    if (r.length === 0) { console.log("FAIL  lint compared 0 files"); process.exit(1); }
  ' "$TMP/lint.json" || return 1
  return "$rc"
}

step_test() { ./node_modules/.bin/vitest run; }
step_build() { ./node_modules/.bin/next build; }

secret_pattern() {
  # Assembled from fragments so this file never contains a literal it would match.
  local p="sk_""live_[A-Za-z0-9]{8,}|sk_""test_[A-Za-z0-9]{8,}|wh""sec_[A-Za-z0-9]{8,}|sb_""secret_[A-Za-z0-9_-]{10,}"
  p="$p|-----BEGIN [A-Z ]*PRIVATE"" KEY-----|gh""[pousr]_[A-Za-z0-9]{20,}|AK""IA[0-9A-Z]{16}"
  p="$p|ey""J[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}"
  p="$p|[a-z][a-z0-9+.-]*://[^/[:space:]:@]+:[^/[:space:]@]{6,}@"
  p="$p|(api[_-]?key|sec""ret|pass""word|bea""rer|to""ken)[\"' ]*[:=][\"' ]*[A-Za-z0-9/+_-]{16,}"
  echo "$p"
}

# Scans what this change ADDS: committed lines against the base, uncommitted lines,
# and every untracked file (each on its own, as text, so one binary file cannot
# switch grep into "binary file matches" and hide what follows it).
step_secrets() {
  local base pattern; base="$(base_ref)"; pattern="$(secret_pattern)"
  [ -n "$base" ] || { echo "FAIL  no base ref to diff against; an unscanned diff is not a pass"; return 1; }
  git rev-parse --verify --quiet "$base^{commit}" >/dev/null || { echo "FAIL  base '$base' does not resolve"; return 1; }
  # Without a common ancestor the added lines cannot be isolated, so nothing is scanned: fail.
  git merge-base "$base" HEAD >/dev/null || {
    echo "FAIL  HEAD has no common ancestor with $base, so its added lines cannot be isolated"
    echo "      (main and dev must share history: docs/runbooks/deploy.md, first-time setup)"; return 1; }
  # --text: a file git would call binary is still diffed line by line, so a key in it shows.
  # Added lines are marked with \x01 instead of '+', so no content line (say one that
  # starts "++ ") can be mistaken for a "+++ b/file" header and dropped.
  local mark=$'\x01'
  # --no-color/--no-ext-diff/--no-textconv: user config can never reshape the lines scanned.
  local opts=(--text --no-color --no-ext-diff --no-textconv --unified=0 --output-indicator-new="$mark")
  git diff "${opts[@]}" "$base"...HEAD > "$TMP/committed.diff" || { echo "FAIL  git diff against $base failed"; return 1; }
  git diff "${opts[@]}" HEAD > "$TMP/working.diff" || { echo "FAIL  git diff of the working tree failed"; return 1; }
  cat "$TMP/committed.diff" "$TMP/working.diff" | grep -a "^$mark" | cut -c2- > "$TMP/added.txt"
  local untracked=0 file; : > "$TMP/untracked-hits.txt"
  while IFS= read -r -d '' file; do
    untracked=$((untracked + 1))
    grep -a -nEi "$pattern" "$file" | awk -v f="$file" '{ print f ":" $0 }' >> "$TMP/untracked-hits.txt"
  done < <(git ls-files --others --exclude-standard -z)
  local hits; hits="$(grep -a -nEi "$pattern" "$TMP/added.txt"; cat "$TMP/untracked-hits.txt")"
  local lines; lines="$(wc -l < "$TMP/added.txt" | tr -d ' ')"
  if [ -n "$hits" ]; then
    echo "FAIL  potential secret material ($lines added lines, $untracked untracked files, base $base):"
    printf '%s\n' "$hits" | head -5 | cut -c1-120 | sed 's/^/      /'; return 1
  fi
  echo "PASS  $lines added lines and $untracked untracked files scanned against $base, no secret material"
}

step_branch() {
  local name; name="$(branch_name)"
  case "$name" in
    main) echo "FAIL  on main: main is production; work belongs on dev or a feature branch"; return 1 ;;
    dev|feat/*|fix/*|chore/*|release/*|dependabot/*) echo "PASS  branch '$name' matches the naming rules" ;;
    *) echo "FAIL  branch '$name' is not dev, feat/*, fix/*, chore/*, release/* or dependabot/*"; return 1 ;;
  esac
}

step_waivers() { node scripts/check-waivers.mjs; }
step_dictionary() { node scripts/check-data-dictionary.mjs; }

# Build-error suppression switches are banned outright.
step_config() {
  local files hits; files="$(ls next.config.* tsconfig*.json 2>/dev/null)"
  hits="$(grep -nE 'ignoreBuildErrors|ignoreDuringBuilds' $files)"
  [ $? -le 1 ] || { echo "FAIL  could not read config files"; return 1; }
  if [ -n "$hits" ]; then echo "FAIL  build-error suppression found:"; echo "$hits" | sed 's/^/      /'; return 1; fi
  echo "PASS  $(echo "$files" | wc -w | tr -d ' ') config files compared, no build-error suppression"
}

run_step install step_install
run_step typecheck step_typecheck
run_step lint step_lint
run_step test step_test
run_step build step_build
run_step secrets step_secrets
run_step branch step_branch
run_step waivers step_waivers
run_step data-dictionary step_dictionary
run_step config step_config

[ "$RAN" -eq 1 ] || { echo "unknown step: $ONLY"; echo "GATE_RC=97"; exit 97; }
echo; echo "=== GATE SUMMARY (ONLY=${ONLY:-all} SKIP_INSTALL=$SKIP_INSTALL)$SUMMARY"
echo "GATE_RC=$overall"
exit "$overall"
