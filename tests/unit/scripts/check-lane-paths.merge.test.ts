import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanRepos, commitFile, git, idOf, onLane, repoWithMap, run, runWithEnv, toLead, treeOf } from "./helpers/lane-repo";

afterEach(cleanRepos);

describe("check-lane-paths CLI: --merge binds the merge to the reviewed change", () => {
  it("merges the reviewed change, asserts the tree, and prints the merge commit", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    const head = git(dir, "rev-parse", "HEAD");
    toLead(dir);
    const before = git(dir, "rev-parse", "HEAD");
    const checked = run(dir, "ui", head).out;
    const { rc, out } = run(dir, "ui", head, "--merge", idOf(checked));
    const merge = git(dir, "rev-parse", "HEAD");
    expect(out).toContain(`MERGED  ${merge} (lane ui at ${head}, tree ${treeOf(checked)}, parents ${before} ${head})`);
    expect(rc).toBe(0);
    expect(git(dir, "rev-parse", "HEAD^{tree}")).toBe(treeOf(checked));
    expect(git(dir, "log", "-1", "--format=%s")).toBe(`Merge lane ui at ${head} (change ${idOf(checked)})`);
    expect(existsSync(path.join(dir, ".git", "MERGE_HEAD"))).toBe(false);
    expect(git(dir, "status", "--porcelain", "--untracked-files=no")).toBe("");
  });

  it("refuses when the lead's HEAD moved and the change the merge brings in is no longer the reviewed one", () => {
    const { dir, base } = repoWithMap();
    commitFile(dir, "src/app/api/board/route.ts", "base\n");
    const head0 = git(dir, "rev-parse", "HEAD");
    onLane(dir, "api");
    commitFile(dir, "src/app/api/board/route.ts", "base\nSECURITY-CHECK\n");
    const apiHead = git(dir, "rev-parse", "HEAD");
    onLane(dir, "ui", head0);
    git(dir, "merge", "-q", "--no-ff", "-m", "take api wip", apiHead);
    commitFile(dir, "src/app/api/board/route.ts", "base\n");
    commitFile(dir, "src/app/board/page.tsx");
    const uiHead = git(dir, "rev-parse", "HEAD");
    toLead(dir);
    const uiId = idOf(run(dir, "ui", uiHead).out);
    expect(run(dir, "api", apiHead, "--merge", idOf(run(dir, "api", apiHead).out)).rc).toBe(0);
    const { rc, out } = run(dir, "ui", uiHead, "--merge", uiId);
    expect(out).toContain("src/app/api/board/route.ts: outside lane 'ui' (owned by api)");
    expect(rc).toBe(1);
    expect(git(dir, "show", "HEAD:src/app/api/board/route.ts")).toContain("SECURITY-CHECK");
    expect(base).not.toBe(head0);
  });

  it("refuses a change id that is not the one this HEAD produces, and merges nothing", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    const before = git(dir, "rev-parse", "HEAD");
    const { rc, out } = run(dir, "ui", "ui", "--merge", "0".repeat(64));
    expect(out).toContain("is not the reviewed one");
    expect(rc).toBe(1);
    expect(git(dir, "rev-parse", "HEAD")).toBe(before);
  });

  it("refuses to merge into a dirty lead worktree", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    const patch = idOf(run(dir, "ui", "ui").out);
    writeFileSync(path.join(dir, "package.json"), "dirty\n");
    const { rc, out } = run(dir, "ui", "ui", "--merge", patch);
    expect(out).toContain("the lead worktree has uncommitted changes");
    expect(rc).toBe(2);
  });

  it("merges a second lane with its pre-move id after another lane moved the lead's HEAD", () => {
    const { dir, base } = repoWithMap();
    onLane(dir, "api");
    commitFile(dir, "src/app/api/board/route.ts");
    onLane(dir, "ui", base);
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    const apiId = idOf(run(dir, "api", "api").out);
    const uiId = idOf(run(dir, "ui", "ui").out);
    expect(run(dir, "api", "api", "--merge", apiId).rc).toBe(0);
    const { rc, out } = run(dir, "ui", "ui", "--merge", uiId);
    expect(out).toContain("MERGED");
    expect(rc).toBe(0);
  });

  it("refuses a whitespace-only change made after the review: the id is exact, not whitespace-blind", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/conf.yml", "a:\n  b: 2\n");
    toLead(dir);
    const reviewed = idOf(run(dir, "ui", "ui").out);
    git(dir, "switch", "-q", "ui");
    commitFile(dir, "src/app/board/conf.yml", "a:\nb: 2\n");
    toLead(dir);
    const { rc, out } = run(dir, "ui", "ui", "--merge", reviewed);
    expect(out).toContain("is not the reviewed one");
    expect(rc).toBe(1);
  });

  it("reports git's own reason, and changes nothing, when an untracked file stops the merge", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx", "lane\n");
    toLead(dir);
    const before = git(dir, "rev-parse", "HEAD");
    const id = idOf(run(dir, "ui", "ui").out);
    mkdirSync(path.join(dir, "src", "app", "board"), { recursive: true });
    writeFileSync(path.join(dir, "src", "app", "board", "page.tsx"), "scratch\n");
    const { rc, out } = run(dir, "ui", "ui", "--merge", id);
    expect(out).toContain("git merge did not start");
    expect(out).toContain("would be overwritten by merge");
    expect(out).toContain("no merge is in progress");
    expect(out).not.toContain("reset --hard");
    expect(rc).toBe(2);
    expect(git(dir, "rev-parse", "HEAD")).toBe(before);
    expect(git(dir, "status", "--porcelain", "--untracked-files=no")).toBe("");
  });

  it("refuses to start while a merge is already in progress, and leaves it alone", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    const id = idOf(run(dir, "ui", "ui").out);
    git(dir, "merge", "--no-ff", "--no-commit", "-s", "ours", "ui");
    const { rc, out } = run(dir, "ui", "ui", "--merge", id);
    expect(out).toContain("a merge is already in progress");
    expect(rc).toBe(2);
    expect(git(dir, "rev-parse", "MERGE_HEAD")).toBe(git(dir, "rev-parse", "ui"));
  });

  it("refuses to merge onto a detached HEAD, which update-ref would move silently", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    git(dir, "switch", "-q", "--detach");
    const before = git(dir, "rev-parse", "HEAD");
    const { rc, out } = run(dir, "ui", "ui", "--merge", idOf(run(dir, "ui", "ui").out));
    expect(out).toContain("not on a branch (HEAD resolves to 'HEAD'");
    expect(rc).toBe(2);
    expect(git(dir, "rev-parse", "HEAD")).toBe(before);
    expect(git(dir, "rev-parse", "dev")).toBe(before);
  });

  it("refuses a HEAD that points at a tag, which update-ref would move instead of a branch", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    const id = idOf(run(dir, "ui", "ui").out);
    git(dir, "tag", "v1");
    git(dir, "symbolic-ref", "HEAD", "refs/tags/v1");
    const before = git(dir, "rev-parse", "v1");
    const { rc, out } = run(dir, "ui", "ui", "--merge", id);
    expect(out).toContain("not on a branch (HEAD resolves to 'refs/tags/v1'");
    expect(rc).toBe(2);
    expect(git(dir, "rev-parse", "v1")).toBe(before);
  });

  it("refuses --map together with --merge: a merge reads only the committed map", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "package.json", "v9\n");
    toLead(dir);
    const wide = path.join(dir, "wide-lanes.txt");
    writeFileSync(wide, "lead  docs/specs/**  scripts/**  .gitmodules  .gitattributes\nui  package.json\n");
    const id = idOf(run(dir, "ui", "ui", "--map", wide).out);
    const { rc, out } = run(dir, "ui", "ui", "--map", wide, "--merge", id);
    expect(out).toContain("drop --map");
    expect(rc).toBe(2);
    expect(git(dir, "show", "HEAD:package.json")).toBe("v1");
  });

  it("checks and merges a change far over 1 MiB", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/fixture.json", `${"x".repeat(1_500_000)}\n`);
    toLead(dir);
    const id = idOf(run(dir, "ui", "ui").out);
    const { rc, out } = run(dir, "ui", "ui", "--merge", id);
    expect(out).toContain("MERGED");
    expect(rc).toBe(0);
  });

  it("gives the same exact id whatever the user's diff config or environment", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/caf\u00e9.tsx");
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    const plain = idOf(run(dir, "ui", "ui").out);
    writeFileSync(path.join(dir, "order.txt"), "src/app/board/page.tsx\n");
    for (const [key, value] of [
      ["diff.external", "false"],
      ["color.ui", "always"],
      ["diff.noprefix", "true"],
      ["diff.context", "0"],
      ["core.quotePath", "false"],
      ["diff.orderFile", path.join(dir, "order.txt")],
      ["diff.relative", "true"],
    ] as const) {
      git(dir, "config", key, value);
    }
    expect(idOf(runWithEnv(dir, { GIT_DIFF_OPTS: "-u0" }, "ui", "ui").out)).toBe(plain);
  });

  it("sees a gitlink change even when git config says to ignore submodules", () => {
    const { dir, base } = repoWithMap();
    git(dir, "update-index", "--add", "--cacheinfo", `160000,${base},vendor/lib`);
    git(dir, "commit", "-q", "-m", "lead adds a gitlink");
    // An empty folder is an unpopulated submodule; without it `git add -A` would delete the gitlink.
    mkdirSync(path.join(dir, "vendor", "lib"), { recursive: true });
    git(dir, "config", "diff.ignoreSubmodules", "all");
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    git(dir, "update-index", "--cacheinfo", `160000,${git(dir, "rev-parse", "HEAD")},vendor/lib`);
    git(dir, "commit", "-q", "-m", "lane bumps the gitlink");
    toLead(dir);
    const { rc, out } = run(dir, "ui", "ui");
    expect(out).toContain("vendor/lib: outside lane 'ui' (owned by lead)");
    expect(rc).toBe(1);
  });
});
