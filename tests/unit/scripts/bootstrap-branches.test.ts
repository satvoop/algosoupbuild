import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// bootstrap-repo.sh must leave a generated repo with main and dev sharing history.
// A stand-in `gh` replays the API answers measured on 2026-11-03: a missing branch exits 1
// with its JSON body on stdout and "gh: Not Found (HTTP 404)" on stderr; compare on unrelated
// branches exits 1 with "gh: No common ancestor between main and dev. (HTTP 404)".
const ROOT = path.resolve(__dirname, "../../..");
const DEV_SHA = "d".repeat(40);
const MAIN_SHA = "a".repeat(40);
const dirs: string[] = [];

const FAKE_GH = `#!/usr/bin/env bash
d="$FAKE_GH_DIR"; printf '%s\\n' "$*" >> "$d/calls.log"
[ "$1" = api ] || exit 0
[ -n "\${FAKE_AUTH_FAIL:-}" ] && { echo '{"message":"Bad credentials"}'; echo "gh: Bad credentials (HTTP 401)" >&2; exit 1; }
shift; method=GET; args=()
while [ $# -gt 0 ]; do case "$1" in -X) method="$2"; shift 2 ;; *) args+=("$1"); shift ;; esac; done
p="\${args[0]}"
case "$method $p" in
  "GET "*/branches/*) [ -f "$d/branches/\${p##*/branches/}" ]; exit $? ;;
  "GET "*/git/ref/heads/*) f="$d/branches/\${p##*/heads/}"
    [ -f "$f" ] || { echo '{"message":"Not Found"}'; echo "gh: Not Found (HTTP 404)" >&2; exit 1; }; cat "$f"; exit 0 ;;
  "GET "*/compare/*) [ -n "\${FAKE_COMPARE_LIMIT:-}" ] && { echo "gh: API rate limit exceeded (HTTP 403)" >&2; exit 1; }
    [ -f "$d/common" ] && { echo base; exit 0; }
    echo '{"message":"No common ancestor between main and dev."}'; echo "gh: No common ancestor between main and dev. (HTTP 404)" >&2; exit 1 ;;
  "POST "*/git/refs) [ -n "\${FAKE_CREATE_FAIL:-}" ] && { echo "gh: Reference already exists (HTTP 422)" >&2; exit 1; }
    for a in "\${args[@]}"; do case "$a" in ref=*) r="\${a#ref=refs/heads/}" ;; sha=*) s="\${a#sha=}" ;; esac; done
    printf '%s' "$s" > "$d/branches/$r"; exit 0 ;;
  *) exit 0 ;;
esac
`;

type World = { main?: boolean; dev?: boolean; common?: boolean; fail?: "auth" | "compare" | "create" };

function bootstrap(world: World): { rc: number | null; out: string; calls: string; dir: string } {
  const dir = mkdtempSync(path.join(tmpdir(), "bootstrap-"));
  dirs.push(dir);
  for (const sub of ["scripts", ".claude", "bin", "gh/branches"]) mkdirSync(path.join(dir, sub), { recursive: true });
  copyFileSync(path.join(ROOT, "scripts", "bootstrap-repo.sh"), path.join(dir, "scripts", "bootstrap-repo.sh"));
  copyFileSync(path.join(ROOT, ".claude", "harness.md"), path.join(dir, ".claude", "harness.md"));
  writeFileSync(path.join(dir, "bin", "gh"), FAKE_GH);
  chmodSync(path.join(dir, "bin", "gh"), 0o755);
  if (world.main) writeFileSync(path.join(dir, "gh/branches/main"), MAIN_SHA);
  if (world.dev) writeFileSync(path.join(dir, "gh/branches/dev"), DEV_SHA);
  if (world.common) writeFileSync(path.join(dir, "gh/common"), "");
  const env: NodeJS.ProcessEnv = { ...process.env, PATH: `${path.join(dir, "bin")}:${process.env.PATH ?? ""}`, FAKE_GH_DIR: path.join(dir, "gh") };
  if (world.fail === "auth") env.FAKE_AUTH_FAIL = "1";
  if (world.fail === "compare") env.FAKE_COMPARE_LIMIT = "1";
  if (world.fail === "create") env.FAKE_CREATE_FAIL = "1";
  const result = spawnSync("bash", [path.join(dir, "scripts", "bootstrap-repo.sh"), "--repo", "o/r"], { env, encoding: "utf8" });
  const log = path.join(dir, "gh", "calls.log");
  return { rc: result.status, out: `${result.stdout}${result.stderr}`, calls: existsSync(log) ? readFileSync(log, "utf8") : "", dir };
}

const created = (dir: string, branch: string): string | null => {
  const file = path.join(dir, "gh", "branches", branch);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
};

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("bootstrap branch setup", () => {
  it("a plain generate (dev only, the template's default branch) gets main created from dev", () => {
    const run = bootstrap({ dev: true });
    expect(run.calls).toContain("-X POST repos/o/r/git/refs -f ref=refs/heads/main");
    expect(created(run.dir, "main")).toBe(DEV_SHA);
    expect(run.rc).toBe(0);
  });

  it("main only gets dev created from main", () => {
    const run = bootstrap({ main: true });
    expect(created(run.dir, "dev")).toBe(MAIN_SHA);
    expect(run.rc).toBe(0);
  });

  it("main and dev with shared history are left alone", () => {
    const run = bootstrap({ main: true, dev: true, common: true });
    expect(run.calls).not.toContain("git/refs");
    expect(run.rc).toBe(0);
  });

  it("main and dev with no shared history stop the bootstrap before any setting changes", () => {
    const run = bootstrap({ main: true, dev: true });
    expect(run.out).toContain("share no history");
    expect(run.calls).not.toContain("repo edit");
    expect(run.rc).toBe(1);
  });

  it("neither branch present stops with that reason", () => {
    const run = bootstrap({});
    expect(run.out).toContain("STEP branches rc=1 neither main nor dev exists");
    expect(run.calls).not.toContain("repo edit");
  });

  it("an auth failure is reported as gh said it, not as a missing branch", () => {
    const run = bootstrap({ dev: true, fail: "auth" });
    expect(run.out).toContain("could not read branch main: gh: Bad credentials (HTTP 401)");
    expect(run.out).not.toContain("neither main nor dev");
    expect(run.calls).not.toContain("git/refs");
    expect(run.rc).toBe(1);
  });

  it("a failed compare that is not 'no common ancestor' does not tell anyone to regenerate", () => {
    const run = bootstrap({ main: true, dev: true, fail: "compare" });
    expect(run.out).toContain("could not compare main and dev: gh: API rate limit exceeded (HTTP 403)");
    expect(run.out).not.toContain("regenerate");
    expect(run.rc).toBe(1);
  });

  it("a failed branch creation is recorded with the reason", () => {
    const run = bootstrap({ dev: true, fail: "create" });
    expect(run.out).toContain("could not create main from dev: gh: Reference already exists (HTTP 422)");
    expect(readFileSync(path.join(run.dir, "docs", "ops", readdirSync(path.join(run.dir, "docs", "ops"))[0] ?? ""), "utf8")).toContain(
      "| branches | 1 | could not create main from dev",
    );
    expect(run.rc).toBe(1);
  });
});
