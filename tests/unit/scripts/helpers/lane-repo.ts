import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Temp git repos for the check-lane-paths CLI tests. Lanes are branches cut from dev (the
// lead's branch); the check runs with dev checked out, as it does from the lead worktree.

export const SCRIPT = path.resolve(__dirname, "../../../../scripts/check-lane-paths.mjs");

export const MAP = `# lane  owned globs
lead  package.json  package-lock.json  src/lib/contracts/**  supabase/**  docs/specs/**  scripts/**  .gitmodules  .gitattributes  vendor/**
api   src/app/api/board/**  tests/unit/api/**
ui    src/app/board/**  src/components/board/**  tests/**/board*.test.ts
`;

const dirs: string[] = [];

export function cleanRepos(): void {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
}

export function git(cwd: string, ...args: string[]): string {
  return gitAt(undefined, cwd, ...args);
}

// The same, with both commit dates pinned: git's choice between equal merge bases follows
// commit dates, so a test of that choice has to set them.
export function gitAt(date: string | undefined, cwd: string, ...args: string[]): string {
  const env = date ? { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : process.env;
  const result = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.test", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    env,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

export function commitFile(dir: string, file: string, content = `${file}\n`): void {
  mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  writeFileSync(path.join(dir, file), content);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", `change ${file}`);
}

export function repoWithMap(): { dir: string; base: string } {
  const dir = mkdtempSync(path.join(tmpdir(), "lane-paths-"));
  dirs.push(dir);
  mkdirSync(path.join(dir, "scripts", "lib"), { recursive: true });
  copyFileSync(SCRIPT, path.join(dir, "scripts", "check-lane-paths.mjs"));
  for (const lib of ["is-main.mjs", "lane-merge.mjs"]) {
    copyFileSync(path.join(path.dirname(SCRIPT), "lib", lib), path.join(dir, "scripts", "lib", lib));
  }
  mkdirSync(path.join(dir, "docs", "specs"), { recursive: true });
  writeFileSync(path.join(dir, "docs", "specs", "lanes.txt"), MAP);
  writeFileSync(path.join(dir, "package.json"), "v1\n");
  git(dir, "init", "-q", "-b", "dev");
  // The check's --merge commits with plain git, so the repo carries its own identity.
  git(dir, "config", "user.name", "t");
  git(dir, "config", "user.email", "t@example.test");
  git(dir, "config", "commit.gpgsign", "false");
  // Planted hooks live in .git/hooks; a global core.hooksPath must not hide them.
  git(dir, "config", "core.hooksPath", ".git/hooks");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "group 0");
  return { dir, base: git(dir, "rev-parse", "HEAD") };
}

// An environment whose `git` runs `cases` (shell case arms on "$*", e.g. a branch move at one
// exact call) and then the real git. The check's own calls carry "-C <dir> -c ..." first.
export function wrappedGit(dir: string, cases: string): Record<string, string> {
  const real = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
  if (!real) throw new Error("no git on PATH");
  const bin = path.join(dir, ".git", "wrap-bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(path.join(bin, "git"), `#!/bin/sh\ncase "$*" in\n${cases}\nesac\nexec "${real}" "$@"\n`, { mode: 0o755 });
  return { PATH: `${bin}${path.delimiter}${process.env.PATH ?? ""}` };
}

// The change id and the merge tree from the check's PASS line.
export function idOf(out: string): string {
  const match = /change ([0-9a-f]{64})/.exec(out);
  if (!match?.[1]) throw new Error(`no change id in: ${out}`);
  return match[1];
}

export function treeOf(out: string): string {
  const match = /^PASS .* diff [0-9a-f]+ ([0-9a-f]{40,64}) /m.exec(out);
  if (!match?.[1]) throw new Error(`no merge tree in: ${out}`);
  return match[1];
}

export function onLane(dir: string, lane: string, from = "dev"): void {
  git(dir, "switch", "-q", "-c", lane, from);
}

export function toLead(dir: string): void {
  git(dir, "switch", "-q", "dev");
}

export function setMap(dir: string, from: string, to: string, message: string): void {
  writeFileSync(path.join(dir, "docs", "specs", "lanes.txt"), MAP.replace(from, to));
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", message);
}

export function run(dir: string, ...args: string[]): { rc: number | null; out: string } {
  return runWithEnv(dir, {}, ...args);
}

export function runWithEnv(dir: string, env: Record<string, string>, ...args: string[]): { rc: number | null; out: string } {
  const result = spawnSync("node", [path.join(dir, "scripts", "check-lane-paths.mjs"), ...args], {
    cwd: tmpdir(),
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  return { rc: result.status, out: result.stdout + result.stderr };
}
