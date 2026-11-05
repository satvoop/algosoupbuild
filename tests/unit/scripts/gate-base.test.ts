import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// The secret scan must pick a base that shares history with the branch under test.
// Shape taken from a repo generated with --include-all-branches (dry run 2026-11-03):
// main and dev are separate root commits, and release/<slug> is cut from main.
const GATE = path.resolve(__dirname, "../../../scripts/gate.sh");
// Assembled from fragments so this file never contains a literal the scan matches.
const FAKE_KEY = "sk_" + "live_" + "x".repeat(24);
const dirs: string[] = [];

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.test", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

// dev: root R (a.txt) then D (adds b.txt). main: its own root M with R's tree.
function unrelatedRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "gate-base-"));
  dirs.push(dir);
  mkdirSync(path.join(dir, "scripts"));
  copyFileSync(GATE, path.join(dir, "scripts", "gate.sh"));
  writeFileSync(path.join(dir, "a.txt"), "a\n");
  git(dir, "init", "-q", "-b", "dev");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "root dev");
  const rootTree = git(dir, "rev-parse", "HEAD^{tree}");
  writeFileSync(path.join(dir, "b.txt"), "b\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "dev work");
  git(dir, "update-ref", "refs/remotes/origin/dev", "HEAD");
  const mainRoot = git(dir, "commit-tree", rootTree, "-m", "Initialize main");
  git(dir, "update-ref", "refs/remotes/origin/main", mainRoot);
  return dir;
}

function cutRelease(dir: string): void {
  git(dir, "switch", "-q", "-c", "release/probe", "origin/main");
  git(dir, "read-tree", "-u", "--reset", "origin/dev");
  git(dir, "commit", "-q", "-m", "release: probe");
}

function scan(dir: string, base?: string): { rc: number | null; out: string } {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of ["GATE_BASE", "GITHUB_HEAD_REF", "GITHUB_REF_NAME"]) delete env[key];
  if (base) env.GATE_BASE = base;
  const result = spawnSync("bash", [path.join(dir, "scripts", "gate.sh"), "--only", "secrets", "--skip-install"], { env, encoding: "utf8" });
  return { rc: result.status, out: `${result.stdout}${result.stderr}` };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("gate secret scan base", () => {
  it("a release branch is scanned against main, even when main and dev share no history", () => {
    const dir = unrelatedRepo();
    cutRelease(dir);
    const { rc, out } = scan(dir);
    expect(out).toContain("BASE=origin/main");
    expect(out).toMatch(/PASS {2}\d+ added lines .* scanned against origin\/main/);
    expect(rc).toBe(0);
  });

  it("a feature branch is still scanned against dev", () => {
    const dir = unrelatedRepo();
    git(dir, "switch", "-q", "-c", "feat/probe", "origin/dev");
    writeFileSync(path.join(dir, "c.txt"), "c\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "feat");
    const { rc, out } = scan(dir);
    expect(out).toContain("scanned against origin/dev");
    expect(rc).toBe(0);
  });

  it("a key committed on a release branch is still caught", () => {
    const dir = unrelatedRepo();
    cutRelease(dir);
    writeFileSync(path.join(dir, "leak.txt"), `const key = "${FAKE_KEY}";\n`);
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "leak");
    const { rc, out } = scan(dir);
    expect(out).toContain("FAIL  potential secret material");
    expect(rc).toBe(1);
  });

  it("a base with no common history fails closed and says why", () => {
    const dir = unrelatedRepo();
    git(dir, "switch", "-q", "-c", "feat/probe", "origin/dev");
    const { rc, out } = scan(dir, "origin/main");
    expect(out).toContain("no common ancestor with origin/main");
    expect(rc).toBe(1);
  });
});
