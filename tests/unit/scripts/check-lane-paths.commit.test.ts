import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanRepos, commitFile, git, idOf, onLane, repoWithMap, run, runWithEnv, toLead, treeOf } from "./helpers/lane-repo";

afterEach(cleanRepos);

// A lane with one commit, the lead back on dev, and the check's PASS output.
function laneReady(): { dir: string; head: string; before: string; checked: string } {
  const { dir } = repoWithMap();
  onLane(dir, "ui");
  commitFile(dir, "src/app/board/page.tsx");
  const head = git(dir, "rev-parse", "HEAD");
  toLead(dir);
  return { dir, head, before: git(dir, "rev-parse", "HEAD"), checked: run(dir, "ui", head).out };
}

// A signing program for commit.gpgSign. `body` runs first; `sign` decides whether it then
// produces a signature git accepts or fails.
function signingProgram(dir: string, body: string, sign: boolean): void {
  const program = path.join(dir, ".git", "sign.sh");
  const tail = sign
    ? "cat > /dev/null\necho '[GNUPG:] SIG_CREATED D 1 8 00 0 X' >&2\nprintf -- '-----BEGIN PGP SIGNATURE-----\\nfake\\n-----END PGP SIGNATURE-----\\n'\n"
    : "echo 'signing says no' >&2\nexit 1\n";
  writeFileSync(program, `#!/bin/sh\n${body}${tail}`, { mode: 0o755 });
  git(dir, "config", "commit.gpgsign", "true");
  git(dir, "config", "gpg.program", program);
}

// A lane and a lead that both changed one file, merged by a driver that the porcelain
// `git merge` (which sets GIT_REFLOG_ACTION) runs differently from `git merge-tree`.
function driverRepo(porcelain: string): { dir: string; head: string; checked: string } {
  const { dir } = repoWithMap();
  commitFile(dir, "src/app/board/p.tsx", "a\nb\nc\n");
  onLane(dir, "ui");
  commitFile(dir, "src/app/board/p.tsx", "a\nb\nlane\n");
  const head = git(dir, "rev-parse", "HEAD");
  toLead(dir);
  commitFile(dir, "src/app/board/p.tsx", "lead\nb\nc\n");
  const driver = path.join(dir, ".git", "driver.sh");
  writeFileSync(driver, `#!/bin/sh\nprintf 'lead\\nb\\nlane\\n' > "$1"\n[ -n "$GIT_REFLOG_ACTION" ] && { ${porcelain}; }\nexit 0\n`, { mode: 0o755 });
  writeFileSync(path.join(dir, ".git", "info", "attributes"), "*.tsx merge=lanetest\n");
  git(dir, "config", "merge.lanetest.driver", `${driver} %A`);
  return { dir, head, checked: run(dir, "ui", head).out };
}

describe("check-lane-paths CLI: --merge records exactly the checked merge", () => {
  it("runs no repo hook, so the commit is the checked merge on the lead HEAD and the lane head", () => {
    const { dir, head, before, checked } = laneReady();
    const ran = path.join(dir, ".git", "hooks-ran.txt");
    // These six fire on a merge and commit when hooks are on; only pre-commit stages a change,
    // since a hook that runs git from post-index-change would loop.
    for (const name of ["pre-commit", "prepare-commit-msg", "commit-msg", "post-commit", "reference-transaction", "post-index-change"]) {
      const stage = name === "pre-commit" ? "echo v3 > package.json && git add package.json\n" : "";
      writeFileSync(path.join(dir, ".git", "hooks", name), `#!/bin/sh\necho ${name} >> "${ran}"\n${stage}`, { mode: 0o755 });
    }
    const { rc, out } = run(dir, "ui", head, "--merge", idOf(checked));
    expect(out).toContain("MERGED");
    expect(rc).toBe(0);
    expect(existsSync(ran)).toBe(false);
    expect(git(dir, "rev-parse", "HEAD^{tree}")).toBe(treeOf(checked));
    expect(git(dir, "rev-list", "--parents", "-n", "1", "HEAD").split(" ").slice(1)).toEqual([before, head]);
    expect(readFileSync(path.join(dir, "package.json"), "utf8")).toBe("v1\n");
  });

  it("signs the merge commit when commit.gpgSign is set, in any boolean spelling", () => {
    const { dir, head, checked } = laneReady();
    signingProgram(dir, "", true);
    git(dir, "config", "commit.gpgsign", "yes");
    const { rc, out } = run(dir, "ui", head, "--merge", idOf(checked));
    expect(out).toContain("MERGED");
    expect(rc).toBe(0);
    expect(git(dir, "cat-file", "commit", "HEAD")).toContain("gpgsig -----BEGIN PGP SIGNATURE-----");
  });

  it("aborts the merge when the commit fails, and says the worktree is as before", () => {
    const { dir, head, before, checked } = laneReady();
    signingProgram(dir, "", false);
    const { rc, out } = run(dir, "ui", head, "--merge", idOf(checked));
    expect(out).toContain("the commit failed");
    expect(out).toContain("signing says no");
    expect(out).toContain("nothing was recorded and the worktree is as before");
    expect(out).not.toContain("MERGED");
    expect(rc).toBe(2);
    expect(git(dir, "rev-parse", "HEAD")).toBe(before);
    expect(git(dir, "status", "--porcelain", "--untracked-files=no")).toBe("");
    expect(existsSync(path.join(dir, ".git", "MERGE_HEAD"))).toBe(false);
  });

  it("names the way back, with rc 2, when git cannot abort after a failed commit", () => {
    const { dir, head, before, checked } = laneReady();
    signingProgram(dir, `touch "${path.join(dir, ".git", "index.lock")}"\n`, false);
    const { rc, out } = run(dir, "ui", head, "--merge", idOf(checked));
    expect(out).toContain("git could not abort the merge");
    expect(out).toContain(`HEAD is still the checked lead HEAD ${before}`);
    expect(out).toContain("git reset --hard HEAD");
    expect(out).not.toContain("the worktree is as before");
    expect(rc).toBe(2);
    expect(git(dir, "rev-parse", "HEAD")).toBe(before);
  });

  it("never names a reset when git cannot abort and another writer moved the branch", () => {
    const { dir, head, before, checked } = laneReady();
    commitFile(dir, "package.json", "v2\n");
    const side = git(dir, "rev-parse", "HEAD");
    git(dir, "reset", "-q", "--keep", before);
    signingProgram(dir, `git -C "${dir}" update-ref HEAD ${side}\ntouch "${path.join(dir, ".git", "index.lock")}"\n`, false);
    const { rc, out } = run(dir, "ui", head, "--merge", idOf(checked));
    expect(out).toContain("git could not abort the merge");
    expect(out).toContain(`HEAD is now ${side}, not the checked lead HEAD ${before}`);
    expect(out).not.toContain("reset --hard");
    expect(rc).toBe(2);
    expect(git(dir, "rev-parse", "HEAD")).toBe(side);
  });

  it("does not sign when commit.gpgSign is unset anywhere", () => {
    const { dir, head, checked } = laneReady();
    signingProgram(dir, "", false);
    git(dir, "config", "--unset", "commit.gpgsign");
    const env = { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
    const { rc, out } = runWithEnv(dir, env, "ui", head, "--merge", idOf(checked));
    expect(out).toContain("MERGED");
    expect(rc).toBe(0);
    expect(git(dir, "cat-file", "commit", "HEAD")).not.toContain("gpgsig");
  });

  it("records nothing, and says HEAD moved, when another writer moves the branch during the merge", () => {
    const { dir, head, before, checked } = laneReady();
    commitFile(dir, "package.json", "v2\n");
    const side = git(dir, "rev-parse", "HEAD");
    git(dir, "reset", "-q", "--keep", before);
    signingProgram(dir, `git -C "${dir}" update-ref HEAD ${side}\n`, true);
    const { rc, out } = run(dir, "ui", head, "--merge", idOf(checked));
    expect(out).toContain("git update-ref refused to move the branch");
    expect(out).toContain(`Nothing was recorded, and HEAD is now ${side}, not the checked lead HEAD ${before}`);
    expect(out).toContain("do not reset it");
    expect(out).not.toContain("reset --hard");
    expect(out).not.toContain("MERGED");
    expect(out).not.toContain("the worktree is as before");
    expect(rc).toBe(2);
    expect(git(dir, "rev-parse", "HEAD")).toBe(side);
    expect(git(dir, "show", "HEAD:package.json")).toBe("v2");
    expect(existsSync(path.join(dir, ".git", "MERGE_HEAD"))).toBe(false);
  });

  it("aborts when the staged merge is not the checked tree (a merge driver that differs)", () => {
    const { dir, head, checked } = driverRepo(`echo porcelain >> "$1"`);
    const before = git(dir, "rev-parse", "HEAD");
    const { rc, out } = run(dir, "ui", head, "--merge", idOf(checked));
    expect(out).toContain(`is not the checked tree ${treeOf(checked)}`);
    expect(out).toContain("nothing was recorded and the worktree is as before");
    expect(rc).toBe(1);
    expect(git(dir, "rev-parse", "HEAD")).toBe(before);
    expect(git(dir, "status", "--porcelain", "--untracked-files=no")).toBe("");
  });

  it("aborts when git merge fails after the check passed (a merge driver that refuses)", () => {
    const { dir, head, checked } = driverRepo("exit 1");
    const before = git(dir, "rev-parse", "HEAD");
    const { rc, out } = run(dir, "ui", head, "--merge", idOf(checked));
    expect(out).toContain("git merge disagreed with the check");
    expect(out).toContain("nothing was recorded and the worktree is as before");
    expect(rc).toBe(1);
    expect(git(dir, "rev-parse", "HEAD")).toBe(before);
    expect(existsSync(path.join(dir, ".git", "MERGE_HEAD"))).toBe(false);
  });
});
