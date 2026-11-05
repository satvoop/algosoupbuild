#!/usr/bin/env node
// Read-back of a Vercel project against what the template depends on. Exits non-zero on any
// miss, so it can gate a release or confirm scripts/setup-vercel.mjs did its job.
//
//   node scripts/check-vercel.mjs --project <name> --scope <team> [--vars-file .env.local]
//
// Why each item (Vercel's own docs, read 2026-11-03):
// * production branch main, and production actually serving main: a new project's first
//   deployment is production whatever branch it came from
//   (https://vercel.com/docs/deployments/environments, "First deployment").
// * Standard protection: previews behind Vercel login, production domains public
//   (https://vercel.com/docs/deployment-protection).
// * one Node major: `engines.node` overrides the project setting, and CI reads .nvmrc
//   (https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
// * every variable stored where its name says it may go (scripts/lib/vars-file.mjs): a server
//   key must be Sensitive (write-only) and Production only. With --vars-file, every name in the
//   file must also be on the project. Values are never read back or printed.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "./lib/is-main.mjs";
import { listProjectEnv, vercelApi } from "./lib/vercel-api.mjs";
import { PUBLIC_ENV, envSpec, isReadable, readVarsFile, targetList } from "./lib/vars-file.mjs";

export { PUBLIC_ENV };
export const STANDARD_PROTECTION = "prod_deployment_urls_and_all_previews";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function nodePinProblems(nvmrc, engines) {
  const major = nvmrc.trim();
  if (!/^\d+$/.test(major)) return [`.nvmrc must hold one major version, found '${major}'`];
  if (engines !== `${major}.x`) {
    return [`package.json engines.node must be '${major}.x' to match .nvmrc, found '${engines}' (Vercel builds with engines, CI with .nvmrc)`];
  }
  return [];
}

const sortedTargets = (list) => [...new Set(list)].sort().join(",");

// Vercel's own entries (type "system") are not ours to judge. Nothing else is skipped: the
// `system` boolean is undocumented, and a VERCEL_* name added by hand is still a secret.
const ours = (entry) => entry.type !== "system";

// A public key may be split over several entries and carry branch overrides: judged on the
// union of its non-branch targets. Each entry must still be a readable type.
function publicProblems(key, entries) {
  const problems = [];
  for (const entry of entries) if (!isReadable(entry.type)) problems.push(`${key} is '${entry.type}', expected 'plain'`);
  const have = sortedTargets(entries.filter((entry) => !entry.gitBranch).flatMap((entry) => targetList(entry.target)));
  const want = sortedTargets(envSpec(key).target);
  if (have !== want) problems.push(`${key} targets [${have}], expected [${want}]`);
  return problems;
}

// Every entry of a server key must be Sensitive, Production only, on no custom environment.
function serverProblems(key, entries) {
  const problems = [];
  for (const entry of entries) {
    if (entry.type !== "sensitive") problems.push(`${key} is '${entry.type}', expected 'sensitive'`);
    const have = sortedTargets(targetList(entry.target));
    if (have !== "production" || entry.gitBranch) problems.push(`${key} targets [${have}]${entry.gitBranch ? " (branch-scoped)" : ""}, expected [production]`);
    if ((entry.customEnvironmentIds ?? []).length > 0) problems.push(`${key} is synced to a custom environment, expected Production only`);
  }
  return problems;
}

export function envProblems(envs, expected = []) {
  const problems = [];
  const mine = envs.filter(ours);
  for (const key of expected) if (!mine.some((entry) => entry.key === key)) problems.push(`environment variable ${key} is missing`);
  for (const key of new Set(mine.map((entry) => entry.key))) {
    const entries = mine.filter((entry) => entry.key === key);
    problems.push(...(envSpec(key).type === "plain" ? publicProblems(key, entries) : serverProblems(key, entries)));
  }
  return problems;
}

export function projectProblems(project, nodeMajor, expected = PUBLIC_ENV) {
  const problems = [];
  const branch = project.link?.productionBranch;
  if (branch !== "main") problems.push(`production branch is '${branch}', expected 'main'`);
  const protection = project.ssoProtection?.deploymentType ?? "off";
  if (protection !== STANDARD_PROTECTION) {
    problems.push(`protection is '${protection}', expected '${STANDARD_PROTECTION}' (production public, previews protected)`);
  }
  if (project.nodeVersion !== `${nodeMajor}.x`) problems.push(`Node.js version is '${project.nodeVersion}', expected '${nodeMajor}.x'`);
  problems.push(...envProblems(project.env ?? [], expected));
  const production = project.targets?.production;
  const ref = production?.meta?.githubCommitRef;
  if (ref === undefined) problems.push("no production deployment yet (deploy main first)");
  else if (ref !== "main") problems.push(`production serves '${ref}', expected 'main'`);
  if (production && production.readyState !== "READY") problems.push(`production deployment is '${production.readyState}', expected 'READY'`);
  return problems;
}

function parseArgs(argv) {
  const options = { bin: process.env.VERCEL_BIN ?? "vercel" };
  for (let i = 0; i < argv.length; i += 2) {
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`option ${argv[i]} needs a value`);
    if (argv[i] === "--project") options.project = value;
    else if (argv[i] === "--scope") options.scope = value;
    else if (argv[i] === "--vars-file") options.envFile = value;
    else throw new Error(`unknown option: ${argv[i]}`);
  }
  if (!options.project || !options.scope) throw new Error("usage: check-vercel.mjs --project <name> --scope <team> [--vars-file <file>]");
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const nvmrc = readFileSync(path.join(ROOT, ".nvmrc"), "utf8");
  const engines = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")).engines?.node ?? "";
  // The vars file first, so a bad file fails before any network call. Only its names are used.
  const expected = options.envFile ? readVarsFile(readFileSync(options.envFile, "utf8")).vars.map((item) => item.key) : PUBLIC_ENV;
  const project = vercelApi(options, "GET", `/v9/projects/${encodeURIComponent(options.project)}`);
  // The env list carries each variable's type and targets; values are never printed.
  project.env = listProjectEnv(options, options.project);
  const problems = [...nodePinProblems(nvmrc, engines), ...projectProblems(project, nvmrc.trim(), expected)];
  for (const problem of problems) console.error(`FAIL  ${problem}`);
  if (problems.length === 0) console.error(`PASS  ${options.project}: main in production, Standard protection, Node ${nvmrc.trim()}.x, ${project.env.length} variables where their names say`);
  console.error(`CHECK_RC=${problems.length === 0 ? 0 : 1}`);
  return problems.length === 0 ? 0 : 1;
}

if (isMain(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`FAIL  ${(error instanceof Error ? error.message : String(error)).slice(0, 400)}`);
    console.error("CHECK_RC=2");
    process.exitCode = 2;
  }
}
