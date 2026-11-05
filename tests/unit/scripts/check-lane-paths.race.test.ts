import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanRepos, commitFile, git, idOf, onLane, repoWithMap, run, runWithEnv, toLead, treeOf, wrappedGit } from "./helpers/lane-repo";

afterEach(cleanRepos);

// A lane ready to merge, plus `other`: the same merge already made by another writer (a
// retried or concurrent --merge), which the branch can be moved to mid-run.
function raceRepo(): { dir: string; head: string; before: string; checked: string; other: string } {
  const { dir } = repoWithMap();
  onLane(dir, "ui");
  commitFile(dir, "src/app/board/page.tsx");
  const head = git(dir, "rev-parse", "HEAD");
  toLead(dir);
  const before = git(dir, "rev-parse", "HEAD");
  const checked = run(dir, "ui", head).out;
  const other = git(dir, "commit-tree", "-p", before, "-p", head, "-m", "another writer", treeOf(checked));
  return { dir, head, before, checked, other };
}

// Move the lead's branch to `to` at the nth git call that matches the case pattern `when`. A
// raw move leaves the index at the old HEAD, so the worktree then reads as changed.
function moveAt(dir: string, when: string, nth: number, to: string): Record<string, string> {
  const count = path.join(dir, ".git", "move-count");
  const move = `n=$(($(cat "${count}" 2>/dev/null || echo 0) + 1)); echo $n > "${count}"; [ $n -eq ${nth} ] && git -C "${dir}" update-ref refs/heads/dev ${to}`;
  return wrappedGit(dir, `  ${when}) ${move} ;;`);
}

describe("check-lane-paths CLI: --merge when another writer moves the lead's branch", () => {
  it("refuses before merging when the branch moves between the check and the merge", () => {
    const { dir, head, checked, other } = raceRepo();
    const { rc, out } = runWithEnv(dir, moveAt(dir, '*"rev-parse HEAD"', 2, other), "ui", head, "--merge", idOf(checked));
    expect(out).toContain("the lead's HEAD moved during the check; run it again");
    expect(out).not.toContain("reset --hard");
    expect(rc).toBe(2);
    expect(git(dir, "rev-parse", "HEAD")).toBe(other);
  });

  it("records nothing and names no reset when the branch moves to a commit that already has the lane", () => {
    const { dir, head, before, checked, other } = raceRepo();
    const { rc, out } = runWithEnv(dir, moveAt(dir, '*"merge --no-ff"*', 1, other), "ui", head, "--merge", idOf(checked));
    expect(out).toContain(`Nothing was recorded, and HEAD is now ${other}, not the checked lead HEAD ${before}`);
    expect(out).not.toContain("reset --hard");
    expect(out).not.toContain("MERGED");
    expect(rc).toBe(2);
    expect(git(dir, "rev-parse", "HEAD")).toBe(other);
  });
});

describe("check-lane-paths CLI: --merge when a git step fails", () => {
  it("keeps git's merge reason when checking for a merge in progress fails too", () => {
    const { dir, head, checked } = raceRepo();
    const flag = path.join(dir, ".git", "merge-failed");
    const env = wrappedGit(dir, [
      `  *"merge --no-ff"*) touch "${flag}"; echo 'wrapped merge failure' >&2; exit 1 ;;`,
      `  *"--verify MERGE_HEAD"*) [ -f "${flag}" ] && { echo 'probe broke' >&2; exit 128; } ;;`,
    ].join("\n"));
    const { rc, out } = runWithEnv(dir, env, "ui", head, "--merge", idOf(checked));
    expect(out).toContain("git merge failed (wrapped merge failure)");
    expect(out).toContain("probe broke");
    expect(rc).toBe(2);
  });

  it("keeps the reason and says where HEAD is when the probe fails while aborting", () => {
    const { dir, head, before, checked } = raceRepo();
    const flag = path.join(dir, ".git", "tree-failed");
    const env = wrappedGit(dir, [
      `  *"commit-tree"*) touch "${flag}"; echo 'tree broke' >&2; exit 1 ;;`,
      `  *"--verify MERGE_HEAD"*) [ -f "${flag}" ] && { echo 'probe broke' >&2; exit 128; } ;;`,
    ].join("\n"));
    const { rc, out } = runWithEnv(dir, env, "ui", head, "--merge", idOf(checked));
    expect(out).toContain("the commit failed (commit signing?): tree broke");
    expect(out).toContain("Checking for a merge in progress failed too");
    expect(out).toContain("probe broke");
    expect(out).toContain(`HEAD is still the checked lead HEAD ${before}`);
    expect(rc).toBe(2);
  });

  it("says the merge is recorded, with rc 2, when git merge --quit fails after it", () => {
    const { dir, head, before, checked } = raceRepo();
    const env = wrappedGit(dir, `  *"merge --quit"*) echo 'quit broke' >&2; exit 1 ;;`);
    const { rc, out } = runWithEnv(dir, env, "ui", head, "--merge", idOf(checked));
    const merge = git(dir, "rev-parse", "HEAD");
    expect(out).toContain(`merged as ${merge}, but git merge --quit failed (quit broke)`);
    expect(out).not.toContain("MERGED");
    expect(rc).toBe(2);
    expect(git(dir, "rev-list", "--parents", "-n", "1", "HEAD").split(" ").slice(1)).toEqual([before, head]);
    expect(existsSync(path.join(dir, ".git", "MERGE_HEAD"))).toBe(true);
  });
});
