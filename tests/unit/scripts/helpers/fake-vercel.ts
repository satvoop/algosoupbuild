import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// setup-vercel.mjs and check-vercel.mjs against a stand-in `vercel` that records every call and its request body.
// Shapes measured on CLI 64.7.0 (2026-11-03): success prints one JSON line (a hint line may
// follow); an HTTP error exits 1, prints nothing on stdout and "Error: <message> (<status>)"
// on stderr. The env API answers 201 with a `failed` array (OpenAPI schema).
const ROOT = path.resolve(__dirname, "../../../..");
export const URL_VALUE = "https://planted-project.supabase.example";
export const KEY_VALUE = "planted_publishable_value";
export const SERVER_VALUE = "planted_server_value_9c1e";
const dirs: string[] = [];

const FAKE_VERCEL = `#!/usr/bin/env bash
d="$FAKE_VERCEL_DIR"; method=GET; p=""; input=""
args=("$@"); i=1
while [ $i -lt \${#args[@]} ]; do
  case "\${args[$i]}" in -X) method="\${args[$((i+1))]}"; i=$((i+2)) ;; --input) input="\${args[$((i+1))]}"; i=$((i+2)) ;;
    --scope) i=$((i+2)) ;; --raw) i=$((i+1)) ;; *) [ -z "$p" ] && p="\${args[$i]}"; i=$((i+1)) ;; esac
done
printf '%s %s %s\\n' "$1" "$method" "$p" >> "$d/calls.log"
[ -n "$input" ] && { cat "$input"; echo; } >> "$d/bodies.log"
fail() { echo "<cli-hint value=\\"x\\" />" >&2; echo "Error: $1" >&2; exit 1; }
case "$method $p" in
  "GET /v9/projects/r") case "\${FAKE_STATE:-absent}" in absent) fail "Project not found. (404)" ;;
      created) echo '{"id":"prj_1","name":"r"}' ;; live) [ -n "\${FAKE_PROJECT:-}" ] && { echo "$FAKE_PROJECT"; exit 0; }; echo '{"id":"prj_1","targets":{"production":{"meta":{"githubCommitRef":"main"}}}}' ;; esac ;;
  "POST /v11/projects") [ -n "\${FAKE_FAIL_CREATE:-}" ] && fail 'Project "r" already exists. (409)'; echo '{"id":"prj_1","name":"r"}' ;;
  "POST /v10/projects/r/env?upsert=true") [ -n "\${FAKE_FAIL_KEY:-}" ] && grep -qF "$FAKE_FAIL_KEY" "$input" && fail "Upstream error. (500)"
    [ -n "\${FAKE_ENV_ERROR:-}" ] && fail "Invalid value $FAKE_ECHO for env. (400)"
    [ -n "\${FAKE_ENV_FAILED:-}" ] && { echo "{\\"created\\":[],\\"failed\\":[{\\"error\\":{\\"code\\":\\"ENV_CONFLICT\\",\\"value\\":\\"$FAKE_ECHO\\"}}]}"; exit 0; }
    echo '{"created":{},"failed":[]}' ;;
  "GET /v10/projects/r/env") if [ -n "\${FAKE_ENVS:-}" ]; then echo "$FAKE_ENVS"; else echo '{"envs":[]}'; fi ;;
  # Measured live 2026-11-03 (CLI 64.7.0): every DELETE is refused non-interactively.
  "DELETE "*) fail "DELETE operations require confirmation. Use --dangerously-skip-permissions to skip confirmation in non-interactive mode." ;;
  "PATCH /v9/projects/r/env/"*) [ -n "\${FAKE_PATCH_ERROR:-}" ] && fail "Invalid value $FAKE_ECHO for env. (400)"; echo '{}' ;;
  "POST /v13/deployments") echo '{"id":"dpl_1"}' ;;
  "GET /v13/deployments/dpl_1") echo "{\\"id\\":\\"dpl_1\\",\\"readyState\\":\\"\${FAKE_READY:-READY}\\",\\"url\\":\\"r-abc.vercel.app\\"}" ;;
  *) echo '{}' ;;
esac
echo '<cli-hint value="not json"/>'
`;

export type Options = { script?: "setup-vercel.mjs" | "check-vercel.mjs"; state?: "absent" | "created" | "live"; env?: Record<string, string>; fake?: Record<string, string>; engines?: string; args?: string[] | ((dir: string) => string[]) };
export type Run = { rc: number | null; out: string; calls: string[]; bodies: Record<string, unknown>[]; record: string };

export function setup(options: Options = {}): Run {
  const dir = mkdtempSync(path.join(tmpdir(), "setup-vercel-"));
  dirs.push(dir);
  for (const sub of ["scripts/lib", "bin", "fake"]) mkdirSync(path.join(dir, sub), { recursive: true });
  for (const file of ["scripts/setup-vercel.mjs", "scripts/check-vercel.mjs", "scripts/lib/vercel-api.mjs", "scripts/lib/vars-file.mjs", "scripts/lib/env-plan.mjs", "scripts/lib/is-main.mjs"]) copyFileSync(path.join(ROOT, file), path.join(dir, file));
  writeFileSync(path.join(dir, ".nvmrc"), "24\n");
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ engines: { node: options.engines ?? "24.x" } }));
  const envText = options.env ?? { NEXT_PUBLIC_SUPABASE_URL: URL_VALUE, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY_VALUE };
  writeFileSync(path.join(dir, ".env.local"), Object.entries(envText).map(([key, value]) => `${key}=${value}`).join("\n"));
  writeFileSync(path.join(dir, "bin", "vercel"), FAKE_VERCEL);
  chmodSync(path.join(dir, "bin", "vercel"), 0o755);
  const env = { ...process.env, VERCEL_BIN: path.join(dir, "bin", "vercel"), FAKE_VERCEL_DIR: path.join(dir, "fake"), VERCEL_POLL_MS: "1", FAKE_STATE: options.state ?? "absent", FAKE_ECHO: KEY_VALUE, ...options.fake };
  const given = typeof options.args === "function" ? options.args(dir) : options.args;
  const args = given ?? ["--repo", "o/r", "--scope", "team", "--vars-file", path.join(dir, ".env.local")];
  const result = spawnSync(process.execPath, [path.join(dir, "scripts", options.script ?? "setup-vercel.mjs"), ...args], { env, encoding: "utf8", cwd: dir });
  const read = (file: string) => (existsSync(file) ? readFileSync(file, "utf8") : "");
  const ops = path.join(dir, "docs", "ops");
  const record = existsSync(ops) ? readdirSync(ops).map((name) => read(path.join(ops, name))).join("") : "";
  const bodies = read(path.join(dir, "fake", "bodies.log")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>);
  return { rc: result.status, out: `${result.stdout}${result.stderr}`, calls: read(path.join(dir, "fake", "calls.log")).trim().split("\n").filter(Boolean), bodies, record };
}

export const ENV_POST = "api POST /v10/projects/r/env?upsert=true";
export const WRITES = ["api GET /v10/projects/r/env", "api PATCH /v9/projects/r", "api POST /v10/projects/r/env?upsert=true", "api POST /v10/projects/r/env?upsert=true", "api POST /v13/deployments", "api GET /v13/deployments/dpl_1"];

// Call from each test file's afterEach.
export function cleanup(): void {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
}
