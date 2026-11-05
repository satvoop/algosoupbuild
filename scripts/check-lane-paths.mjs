#!/usr/bin/env node
// A lane in a parallel build may change only the paths it owns. Before the lead merges a
// lane, this checks every path the lane's merge would change against the ownership map in
// docs/specs/lanes.txt: one line per lane, "<lane> <glob> <glob> ...". The lane "lead"
// owns the shared files (package.json, the lockfile, contracts, migrations).
//
//   node <lead worktree>/scripts/check-lane-paths.mjs <lane> <lane head> [--map <file>]
//   node <lead worktree>/scripts/check-lane-paths.mjs <lane> <lane head> --merge <change id>
//
// Needs git 2.38+ (merge-tree --write-tree); an older git fails it with rc 2. The first form
// checks and prints a change id: the SHA-256 of git's raw tree-to-tree diff of the merge
// (every path with both modes and both blob ids), which porcelain diff config cannot touch
// and which stays small whatever the file sizes. The review approves that id. The
// second form re-runs the check at the current HEAD, refuses unless the change has exactly
// the reviewed id (so neither a HEAD that moved nor a later lane commit, whitespace included,
// can slip another change in), merges with --no-commit, asserts the staged tree, builds the
// commit from the checked tree and parents, and moves the branch only if it still points at
// the checked lead HEAD. A failed commit or a moved branch aborts the merge. The merge half
// lives in lib/lane-merge.mjs. Every git call here runs with repo hooks off; the gate re-run
// after each merge does what a hook would check.
//
// Run it from the lead's worktree, on the integration branch. Nothing is approximated: git
// computes the merge of the lane's head into this checkout's HEAD (`git merge-tree`, no
// checkout touched), and every path that merge would change is checked. A merge that would
// conflict fails. The map is read from this checkout's committed HEAD, never from a working
// tree or a lane commit; the map file and this script must be owned by the lead alone, so a
// lane's net change to them fails its own check, and a map change the lead commits applies
// at once. --map overrides the map, and the output names the diff and the map it used. A
// path outside the lane's globs fails, and so does a path two lanes both own (the map is
// ambiguous). A merge that changes nothing fails too (a lane already merged), so a pass is
// never vacuous. A rename counts its old path as well as its new one.
// Exit 0 = pass, 1 = fail, 2 = could not run. The last line is LANE_PATHS_RC=<n>.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "./lib/is-main.mjs";
import { mergeReviewed } from "./lib/lane-merge.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_PATH = "docs/specs/lanes.txt";

function escapeRegExp(text) {
  return text.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

// "**/" matches zero or more directories, a trailing "**" matches anything below,
// "*" and "?" stay inside one path segment.
export function globToRegExp(glob) {
  let pattern = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (glob.startsWith("**/", i)) {
      pattern += "(?:.*/)?";
      i += 2;
    } else if (glob.startsWith("**", i)) {
      pattern += ".*";
      i += 1;
    } else if (char === "*") {
      pattern += "[^/]*";
    } else if (char === "?") {
      pattern += "[^/]";
    } else {
      pattern += escapeRegExp(char);
    }
  }
  return new RegExp(`^${pattern}$`);
}

export function parseLanes(text) {
  const lanes = new Map();
  const errors = [];
  text.split("\n").forEach((raw, index) => {
    const line = raw.replace(/(^|\s)#.*$/, "").trim();
    if (line === "") return;
    const [lane, ...globs] = line.split(/\s+/);
    const where = `line ${index + 1}`;
    if (lanes.has(lane)) {
      errors.push(`${where}: lane '${lane}' is declared twice`);
      return;
    }
    if (globs.length === 0) errors.push(`${where}: lane '${lane}' owns no paths`);
    for (const glob of globs) {
      if (glob.startsWith("/") || glob.split("/").includes("..")) {
        errors.push(`${where}: glob '${glob}' must be relative to the repo root`);
      } else if (/[*?]/.test(glob.split("/")[0] ?? "")) {
        // "**", "*/**", "*" and the like own every top-level path, scripts and CI included.
        errors.push(`${where}: glob '${glob}' starts with a wildcard; start it with a folder or file name`);
      }
    }
    lanes.set(lane, globs);
  });
  if (errors.length === 0 && !lanes.has("lead")) errors.push("no 'lead' lane: shared files need an owner");
  return { lanes, errors };
}

function ownersOf(lanes, file) {
  const owners = [];
  for (const [lane, globs] of lanes) {
    if (globs.some((glob) => globToRegExp(glob).test(file))) owners.push(lane);
  }
  return owners;
}

export function checkPaths(lanes, lane, files) {
  if (!lanes.has(lane)) return [`lane '${lane}' is not in the ownership map`];
  if (files.length === 0) return ["0 files compared: the merge changes nothing"];
  const failures = [];
  for (const file of files) {
    const owners = ownersOf(lanes, file);
    if (owners.length > 1) {
      failures.push(`${file}: owned by more than one lane (${owners.join(", ")}); the ownership map is ambiguous`);
    } else if (owners[0] !== lane) {
      failures.push(`${file}: outside lane '${lane}' (owned by ${owners[0] ?? "no lane"})`);
    }
  }
  return failures;
}

// Plumbing output for a large lane can pass Node's 1 MiB default buffer. No repo hook runs;
// the gate re-run after each merge does what a hook would check.
function git(...args) {
  return execFileSync("git", ["-C", ROOT, "-c", "core.hooksPath=/dev/null", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });
}

// Files a lane must not own: the map, the check's own code, and the files that change how
// git diffs and merges (a lane that owns any of them can widen its own paths).
const PROTECTED = [MAP_PATH, "scripts/check-lane-paths.mjs", "scripts/lib/is-main.mjs", "scripts/lib/lane-merge.mjs", ".gitmodules", ".gitattributes"];

export function checkProtected(lanes) {
  const failures = [];
  for (const file of PROTECTED) {
    const owners = ownersOf(lanes, file);
    if (owners.length !== 1 || owners[0] !== "lead") {
      const who = owners.length > 0 ? owners.join(", ") : "no lane";
      failures.push(`${file} must be owned by lead alone (owned by ${who}): a lane that owns it can widen its own paths`);
    }
  }
  return failures;
}

// What merging the lane into the lead's HEAD would produce, computed by git itself without
// touching any checkout (git 2.38+): the same merge, virtual bases and all, that `git merge`
// does. Exit 1 with a tree on the first line means it conflicts; anything else is a failure.
function mergedTree(leadHead, headSha) {
  try {
    return { tree: git("merge-tree", "--write-tree", "--no-messages", leadHead, headSha).split("\n")[0].trim() };
  } catch (error) {
    const stdout = error && typeof error === "object" && "stdout" in error ? String(error.stdout) : "";
    const conflicted = error && typeof error === "object" && "status" in error && error.status === 1;
    if (conflicted && /^[0-9a-f]{40,64}$/.test(stdout.split("\n")[0] ?? "")) return { conflict: true };
    throw error;
  }
}

// Plumbing (diff-tree), so no porcelain diff config applies. --no-renames reports a rename as
// a delete plus an add, so both paths are checked. -z gives raw path bytes.
// --ignore-submodules=none makes sure a gitlink change is always seen.
const TREE_DIFF = ["diff-tree", "-r", "-z", "--no-renames", "--ignore-submodules=none"];

function changedFiles(from, to) {
  const out = git(...TREE_DIFF, "--name-only", from, to);
  return [...new Set(out.split("\0").filter((name) => name !== ""))].sort();
}

// The exact change, as an id: modes, both blob ids and the path of every changed entry, so
// nothing (whitespace included) is normalised away. The review approves it, and --merge
// refuses any other.
function changeId(from, to) {
  const raw = git(...TREE_DIFF, "--raw", "--full-index", from, to);
  return raw === "" ? "" : createHash("sha256").update(raw).digest("hex");
}

// The approved map is the one the lead committed at HEAD; --map is an explicit override.
function readMap(leadHead, mapFile) {
  if (mapFile) return { text: readFileSync(mapFile, "utf8"), label: mapFile };
  return { text: git("show", `${leadHead}:${MAP_PATH}`), label: `${leadHead}:${MAP_PATH} (lead HEAD)` };
}

function takeOption(args, name) {
  const at = args.indexOf(name);
  if (at === -1) return null;
  if (!args[at + 1]) throw new Error(`${name} needs a value`);
  return args.splice(at, 2)[1];
}

function parseArgs(argv) {
  const args = [...argv];
  const mapValue = takeOption(args, "--map");
  const reviewedChange = takeOption(args, "--merge");
  const [lane, head] = args;
  if (!lane || !head || args.length !== 2) {
    throw new Error("usage: check-lane-paths.mjs <lane> <lane head> [--map <file>] | <lane> <lane head> --merge <reviewed change id>");
  }
  if (head.includes("..")) throw new Error(`pass the lane's head, not a range ('${head}'): the merge is computed`);
  if (lane === "lead") throw new Error("'lead' is not a lane that hands back: name the lane whose head this is");
  if (mapValue && reviewedChange) throw new Error("--merge reads only the map committed at the lead's HEAD; drop --map");
  return { lane, head, mapFile: mapValue ? path.resolve(mapValue) : null, reviewedChange };
}

function loadMap(leadHead, mapFile) {
  const map = readMap(leadHead, mapFile);
  const parsed = parseLanes(map.text);
  const errors = parsed.errors.length > 0 ? parsed.errors : checkProtected(parsed.lanes);
  if (errors.length > 0) throw new Error(`ownership map ${map.label}: ${errors.join("; ")}`);
  return { lanes: parsed.lanes, label: map.label };
}

// Everything the verdict depends on, bound to one lead HEAD and one lane commit.
function evaluate(args) {
  const leadHead = git("rev-parse", "HEAD").trim();
  const map = loadMap(leadHead, args.mapFile);
  const headSha = git("rev-parse", "--verify", "--end-of-options", `${args.head}^{commit}`).trim();
  const merged = mergedTree(leadHead, headSha);
  if (merged.conflict) return { leadHead, headSha, conflict: true };
  const files = changedFiles(leadHead, merged.tree);
  const change = changeId(leadHead, merged.tree);
  const where = `diff ${leadHead} ${merged.tree} (${headSha} merged into lead HEAD), change ${change || "none"}, map ${map.label}`;
  return { leadHead, headSha, tree: merged.tree, files, change, where, failures: checkPaths(map.lanes, args.lane, files) };
}

function finish(rc) {
  console.log(`LANE_PATHS_RC=${rc}`);
  process.exit(rc);
}

function report(args, result) {
  if (result.conflict) {
    console.log(`FAIL  lane-paths ${args.lane}: merging ${result.headSha} into the lead's HEAD conflicts; the lane rebases onto it, resolves inside its own paths, and hands back again`);
    finish(1);
  }
  if (result.failures.length > 0) {
    console.log(`FAIL  lane-paths ${args.lane} ${result.files.length} files compared, ${result.where}`);
    for (const failure of result.failures) console.log(`      ${failure}`);
    finish(1);
  }
  console.log(`PASS  lane-paths ${args.lane} ${result.files.length} files compared, ${result.where}`);
}

function couldNotRun(error) {
  const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr).trim() : "";
  console.log(`FAIL  lane-paths could not run: ${error instanceof Error ? error.message : String(error)}${stderr ? ` (${stderr})` : ""}`);
  finish(2);
}

function main() {
  let args, result;
  try {
    args = parseArgs(process.argv.slice(2));
    result = evaluate(args);
  } catch (error) {
    couldNotRun(error);
  }
  report(args, result);
  if (args.reviewedChange) {
    try {
      mergeReviewed({ git, finish, lane: args.lane, reviewedChange: args.reviewedChange }, result);
    } catch (error) {
      couldNotRun(error);
    }
  }
  finish(0);
}

if (isMain(import.meta.url)) main();
