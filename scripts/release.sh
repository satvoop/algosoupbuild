#!/usr/bin/env bash
# Opens the release PR that makes main's tree identical to dev's.
#
#   bash /absolute/path/scripts/release.sh <slug>
#
# Why a tree copy: main only ever receives squash commits, so dev's history and
# main's diverge after the first release, and a direct dev -> main PR then
# conflicts or is blocked as out of date. Instead, release/<slug> is cut from
# origin/main and its tree is replaced by origin/dev's (read-tree carries
# deletions too). The PR is always up to date with main and shows exactly the
# change going live. Merge it server-side with the SHA guard (docs/runbooks/deploy.md).

set -uo pipefail
cd "$(dirname "$0")/.." || exit 99
SLUG="${1:-}"
[ -n "$SLUG" ] || { echo "usage: release.sh <slug>"; exit 2; }
BRANCH="release/$SLUG"

[ -z "$(git status --porcelain)" ] || { echo "DIRTY: commit or clean the tree first"; exit 1; }
git fetch --prune origin || exit 1
if git diff --quiet origin/main origin/dev; then echo "main already has dev's tree: nothing to release"; exit 0; fi

git switch -q -c "$BRANCH" origin/main || exit 1
git read-tree -u --reset origin/dev || exit 1
git -c commit.gpgsign=false commit -q -m "release: $SLUG ($(date -u +%Y-%m-%d))" \
  -m "Tree of origin/dev at $(git rev-parse --short origin/dev)." || exit 1
git diff --quiet origin/dev HEAD || { echo "release tree differs from origin/dev: stopping"; exit 1; }

git push -u origin "$BRANCH" || exit 1
gh pr create --base main --head "$BRANCH" --title "release: $SLUG" \
  --body "Release of \`dev\` at $(git rev-parse --short origin/dev). The tree equals \`origin/dev\` (checked before push). Gate line: run the gate on this branch and quote GATE_RC here." || exit 1
git switch -q dev || exit 1
echo "release PR opened from $BRANCH"
