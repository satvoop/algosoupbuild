#!/usr/bin/env node
// First-time Vercel setup for a repo generated from this template. Run it right after
// bootstrap and BEFORE any branch is pushed: Vercel makes a new project's first deployment
// production, whatever branch it came from
// (https://vercel.com/docs/deployments/environments, "First deployment"), so this script
// makes that first deployment `main`.
//
//   node scripts/setup-vercel.mjs --repo owner/name --scope <team> --vars-file .env.local [--project <name>]
//   node scripts/setup-vercel.mjs --repo owner/name --scope <team> --vars-file .env.local --env-only [--keys A,B]
//
// * Every variable in the file goes to Vercel where its name says (scripts/lib/vars-file.mjs):
//   NEXT_PUBLIC_* plain to every environment, anything else Sensitive, Production only. An
//   entry already stored with another type or targets is corrected in place (PATCH); the CLI
//   refuses DELETE non-interactively, so anything PATCH cannot fix stops the run unwritten.
// * --env-only: variables only, for a project that is already deployed (add or rotate a key).
//   Every value in the file goes to Vercel, so the file must hold PRODUCTION values; --keys
//   limits the run to the named keys.
//
// * Everything that can be checked locally is checked before the first API call.
// * Re-runnable: a project that exists with NO production deployment is resumed (a failed
//   earlier run); a project that already has one is left alone (use check-vercel.mjs).
// * `vercel api` only. Never `vercel link`, which (CLI 64.7.0, measured 2026-11-03) appends
//   `.env*` to .gitignore and writes a live VERCEL_OIDC_TOKEN to .env.local.
// * Every outcome is appended to docs/ops/vercel-<date>.md. Variable values are never printed.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "./lib/is-main.mjs";
import { STANDARD_PROTECTION, nodePinProblems } from "./check-vercel.mjs";
import { VercelApiError, listProjectEnv, vercelApi } from "./lib/vercel-api.mjs";
import { readVarsFile } from "./lib/vars-file.mjs";
import { envSteps } from "./lib/env-plan.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POLL_LIMIT = 120;
const message = (error) => (error instanceof Error ? error.message : String(error));
const STOP = "STOP: the project exists without a main deployment. Push NO branch (its first deployment would be production). Fix the cause and re-run this script: it resumes.";

export function parseArgs(argv) {
  const options = { bin: process.env.VERCEL_BIN ?? "vercel" };
  // Not "--env-file": Node 24 reads that flag even after the script name and exits 9 if the
  // file is missing (measured 2026-11-03, Node 24.22.1), before this code runs.
  const names = { "--repo": "repo", "--scope": "scope", "--vars-file": "envFile", "--project": "project", "--keys": "keys" };
  const rest = argv.filter((arg) => arg !== "--env-only");
  options.envOnly = rest.length !== argv.length;
  for (let i = 0; i < rest.length; i += 2) {
    const key = names[rest[i]];
    if (!key) throw new Error(`unknown option: ${rest[i]}`);
    if (rest[i + 1] === undefined) throw new Error(`option ${rest[i]} needs a value`);
    options[key] = rest[i + 1];
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(options.repo ?? "") || !options.scope || !options.envFile) {
    throw new Error("usage: setup-vercel.mjs --repo owner/name --scope <team> --vars-file <file> [--project <name>] [--env-only]");
  }
  if (options.keys !== undefined && !options.envOnly) throw new Error("--keys works only with --env-only");
  options.project ??= options.repo.split("/")[1].toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(options.project)) throw new Error(`invalid project name '${options.project}'`);
  return options;
}

export function preflight(options) {
  const nvmrc = readFileSync(path.join(ROOT, ".nvmrc"), "utf8");
  const engines = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")).engines?.node ?? "";
  const problems = nodePinProblems(nvmrc, engines);
  if (problems.length > 0) throw new Error(problems.join("; "));
  const pollMs = Number(process.env.VERCEL_POLL_MS ?? 5000);
  if (!Number.isInteger(pollMs) || pollMs < 1) throw new Error("VERCEL_POLL_MS must be a positive integer");
  const { vars, skipped } = readVarsFile(readFileSync(options.envFile, "utf8"));
  for (const key of skipped) console.log(`SKIP  ${key} is empty in the vars file: not sent`);
  return { nodeMajor: nvmrc.trim(), vars: selectVars(vars, options.keys), pollMs };
}

// --keys A,B: only those keys. Names that do not parse as names are refused without echo.
export function selectVars(vars, keys) {
  if (keys === undefined) return vars;
  const wanted = keys.split(",").map((key) => key.trim()).filter(Boolean);
  if (wanted.length === 0 || wanted.some((key) => !/^[A-Z][A-Z0-9_]*$/.test(key))) throw new Error("--keys takes names like A,B (capitals, digits, underscore)");
  const absent = wanted.filter((key) => !vars.some((item) => item.key === key));
  if (absent.length > 0) throw new Error(`--keys names not set in the vars file: ${absent.join(", ")}`);
  return vars.filter((item) => wanted.includes(item.key));
}

class StepError extends Error {
  constructor(step, text) {
    super(text);
    this.step = step;
  }
}

// Sends the steps in order; a failure names the step it stopped at.
function applySteps(options, steps, record, onResponse = () => {}) {
  let current = "";
  try {
    for (const step of steps) {
      current = step.step;
      const response = step.method === "KEEP" ? {} : send(options, step);
      onResponse(step, response);
      record(step.step, 0, step.note ?? "");
    }
  } catch (error) {
    throw new StepError(current, message(error));
  }
}

export function plan({ repo, project, nodeMajor, vars }, existing = []) {
  const [org, name] = repo.split("/");
  return [
    { step: `node ${nodeMajor}.x`, method: "PATCH", path: `/v9/projects/${encodeURIComponent(project)}`, body: { nodeVersion: `${nodeMajor}.x` } },
    ...envSteps(project, vars, existing),
    { step: "first deployment (main)", method: "POST", path: "/v13/deployments",
      body: { name: project, project, target: "production", gitSource: { type: "github", org, repo: name, ref: "main" } } },
  ];
}

export const createBody = ({ repo, project }) => ({
  name: project, framework: "nextjs", gitRepository: { type: "github", repo }, ssoProtection: { deploymentType: STANDARD_PROTECTION },
});

// Returns "create" (no project), "resume" (project, no production deployment) or throws.
function projectState(options) {
  try {
    const project = vercelApi(options, "GET", `/v9/projects/${encodeURIComponent(options.project)}`);
    const ref = project.targets?.production?.meta?.githubCommitRef;
    if (ref !== undefined) throw new Error(`project already has a production deployment (ref '${ref}'): run check-vercel.mjs instead`);
    return "resume";
  } catch (error) {
    if (error instanceof VercelApiError && error.status === 404) return "create";
    throw error;
  }
}

function recorder(repo, secrets) {
  const file = path.join(ROOT, "docs", "ops", `vercel-${new Date().toISOString().slice(0, 10)}.md`);
  mkdirSync(path.dirname(file), { recursive: true });
  const head = existsSync(file) ? "\n" : "# Vercel setup record\n";
  writeFileSync(file, `${head}\nRepo: \`${repo}\`. Run ${new Date().toISOString()}.\n\n| Step | rc | Note |\n| --- | --- | --- |\n`, { flag: "a" });
  // Longest first: a short value replaced first could split a longer one so it no longer
  // matches. Shortened only after redaction, so no part of a long value survives the cut. The
  // cap only bounds a runaway CLI error: it holds a refusal naming about 50 keys with their
  // rotation advice, far more than a vars file carries.
  const ordered = [...secrets].sort((left, right) => right.length - left.length);
  const redact = (text) => ordered.reduce((out, value) => out.replaceAll(value, "[redacted]"), text).replaceAll("|", "/").slice(0, 4000);
  return (step, rc, note) => {
    writeFileSync(file, `| ${step} | ${rc} | ${redact(note)} |\n`, { flag: "a" });
    console.log(`STEP ${step} rc=${rc} ${redact(note)}`);
  };
}

function send(options, { method, path: apiPath, body }) {
  const response = vercelApi(options, method, apiPath, body);
  const failed = Array.isArray(response.failed) ? response.failed : [];
  if (failed.length > 0) throw new Error(`API reported ${failed.length} failed item(s): ${failed.map((item) => item.error?.code ?? "unknown").join(", ")}`);
  return response;
}

async function waitReady(options, id, pollMs) {
  for (let attempt = 0; attempt < POLL_LIMIT; attempt += 1) {
    const deployment = vercelApi(options, "GET", `/v13/deployments/${encodeURIComponent(id)}`);
    if (deployment.readyState === "READY") return deployment.url ?? "";
    if (["ERROR", "CANCELED"].includes(deployment.readyState)) throw new Error(`deployment ${id} ended ${deployment.readyState}`);
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`deployment ${id} not ready after ${POLL_LIMIT} polls`);
}


async function run(options, local, record) {
  const state = projectState(options);
  if (state === "create") send(options, { method: "POST", path: "/v11/projects", body: createBody(options) });
  record("create project", 0, state === "resume" ? "exists with no production deployment: resuming" : "");
  let current = "read existing env";
  try {
    let deploymentId = "";
    const steps = plan({ ...options, ...local }, listProjectEnv(options, options.project));
    applySteps(options, steps, record, (step, response) => { if (step.path === "/v13/deployments") deploymentId = response.id; });
    current = "first deployment ready";
    record(current, 0, await waitReady(options, deploymentId, local.pollMs));
    return 0;
  } catch (error) {
    record(error instanceof StepError ? error.step : current, 1, message(error));
    console.error(STOP);
    return 1;
  }
}

function requireProject(options) {
  try {
    vercelApi(options, "GET", `/v9/projects/${encodeURIComponent(options.project)}`);
  } catch (error) {
    if (error instanceof VercelApiError && error.status === 404) {
      throw new Error(`no project '${options.project}' yet: run setup-vercel.mjs without --env-only first`);
    }
    throw error;
  }
}

// Variables only, on a project that already exists. No create, no Node change, no deployment:
// a new value reaches production on the next deployment of main.
function envOnly(options, local, record) {
  let current = "project exists";
  try {
    requireProject(options);
    record(current, 0, "");
    current = "read existing env";
    applySteps(options, envSteps(options.project, local.vars, listProjectEnv(options, options.project), options.keys !== undefined), record);
    console.log("ENV_ONLY_RC=0 (values reach production on the next deployment of main)");
    return 0;
  } catch (error) {
    record(error instanceof StepError ? error.step : current, 1, message(error));
    console.log("ENV_ONLY_RC=1");
    return 1;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const local = preflight(options);
  const record = recorder(options.repo, local.vars.map((item) => item.value));
  try {
    return options.envOnly ? envOnly(options, local, record) : await run(options, local, record);
  } catch (error) {
    record("create project", 1, message(error));
    return 1;
  }
}

if (isMain(import.meta.url)) {
  main().then(
    (rc) => { process.exitCode = rc; },
    (error) => { console.error(`FAIL  ${message(error)}`); process.exitCode = 1; },
  );
}
