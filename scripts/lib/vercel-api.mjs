// Calls the Vercel REST API through the signed-in Vercel CLI (`vercel api`), so this code
// never handles a token. Measured on CLI 64.7.0 (2026-11-03): a success prints the response
// body as one JSON line on stdout (hint lines may follow); an HTTP error exits 1 with nothing
// on stdout and "Error: <message> (<status>)" on stderr.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const TIMEOUT_MS = 120_000;

export class VercelApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function firstJson(text) {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  throw new VercelApiError("no JSON object in the Vercel CLI output", undefined);
}

// The CLI's own error line, without hint markup. Only stderr is used: stdout carries response
// bodies, which can echo request values.
function errorLine(stderr) {
  // Not truncated here: a caller redacts values first, then shortens (a cut made before
  // redaction would leave the part of a long value that crossed it).
  const lines = stderr.split("\n").map((line) => line.replace(/<[^>]*\/>/g, "").trim());
  return lines.filter(Boolean).join(" ");
}

// The body goes through a private temp file (never argv, which other users can read).
export function vercelApi({ bin, scope }, method, apiPath, body) {
  const dir = mkdtempSync(path.join(tmpdir(), "vercel-api-"));
  try {
    const args = ["api", "-X", method, apiPath, "--scope", scope, "--raw"];
    if (body !== undefined) {
      const file = path.join(dir, "body.json");
      writeFileSync(file, JSON.stringify(body), { mode: 0o600 });
      args.push("--input", file);
    }
    const result = spawnSync(bin, args, { encoding: "utf8", timeout: TIMEOUT_MS });
    if (result.error) throw new VercelApiError(`could not run ${bin}: ${result.error.message}`, undefined);
    if (result.status !== 0) {
      const line = errorLine(result.stderr ?? "");
      const status = /\((\d{3})\)\s*$/.exec(line)?.[1];
      throw new VercelApiError(`${method} ${apiPath} failed (rc ${result.status}): ${line}`, status ? Number(status) : undefined);
    }
    return firstJson(result.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// The project's variables (keys, types, targets). Fails closed: a shape this code does not
// understand, a paginated list, or Production entries hidden from this account would let a
// readable entry go unseen, so each one throws instead of reading as "none".
export function listProjectEnv(options, project) {
  const response = vercelApi(options, "GET", `/v10/projects/${encodeURIComponent(project)}/env`);
  if (!Array.isArray(response.envs)) throw new VercelApiError("env list: response has no 'envs' array", undefined);
  if (response.pagination?.next != null) throw new VercelApiError("env list is paginated: not supported, nothing changed", undefined);
  if ((response.hiddenProductionEnvCount ?? 0) > 0) {
    throw new VercelApiError(`env list hides ${response.hiddenProductionEnvCount} Production entries from this account: use an account that can see them`, undefined);
  }
  return response.envs;
}
