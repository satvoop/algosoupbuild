// Plans the env-variable writes for one project: one step per key in the vars file, or a refusal
// naming the keys that need the dashboard. Pure: no API calls; scripts/setup-vercel.mjs sends.
import { isReadable, sameTargets, storedCorrectly, targetList } from "./vars-file.mjs";

// An entry stored the wrong way is corrected IN PLACE with PATCH (type, targets, value): measured
// live 2026-11-03, the entry keeps its id. The CLI refuses DELETE non-interactively (TEMPLATE-8),
// so an entry PATCH cannot fix -- a second entry for the key, a branch scope or a custom-
// environment sync on a server key, or a change no live run has measured -- is refused before
// anything is written, by key name and with its rotation advice, for the operator to fix in the
// dashboard. PATCH is used only in the measured directions: a server entry made sensitive and
// production-only, or a readable public entry whose targets alone change. A PUBLIC entry scoped
// to a branch or synced to a custom environment is a deliberate override and is left alone.
// A public key split over readable entries that together cover every environment is kept
// (check-vercel passes it), unless one entry already holds it the standard way. A server key
// found readable is flagged for rotation: its value was exposed.
const keptSplit = (type, mine, target) =>
  type === "plain" && mine.length > 1 && !mine.some((entry) => storedCorrectly(entry, { type, target }))
  && mine.every((entry) => isReadable(entry.type)) && sameTargets([...new Set(mine.flatMap((entry) => targetList(entry.target)))], target);

function fixNote(type, old) {
  if (type !== "sensitive") return "";
  if (isReadable(old.type)) return "it was readable: ROTATE this key at its provider";
  const wider = targetList(old.target).some((name) => name !== "production") || (old.customEnvironmentIds ?? []).length > 0 || Boolean(old.gitBranch);
  return wider ? "it reached non-production deployments: consider rotating it" : "";
}

const SERVER_FROM = ["plain", "encrypted", "sensitive"];
function patchable(entry, type) {
  if (entry.gitBranch || (entry.customEnvironmentIds ?? []).length > 0) return false;
  return type === "sensitive" ? SERVER_FROM.includes(entry.type) : isReadable(entry.type);
}

// The refusal names the key, its entry count and any rotation advice: never a value.
function manualReason(key, type, mine, wrong) {
  const notes = [...new Set(wrong.map((entry) => fixNote(type, entry)).filter(Boolean))];
  return `${key} (${mine.length} entr${mine.length === 1 ? "y" : "ies"}${notes.length > 0 ? `; ${notes.join("; ")}` : ""})`;
}

// One key's step, or the reason it needs the dashboard. Never a DELETE.
function keyStep(at, { key, value, type, target }, mine, named) {
  if (keptSplit(type, mine, target)) {
    if (named) throw new Error(`${key} is split over ${mine.length} entries in Vercel, so it is not rewritten: change it in the dashboard, or remove the extra entries there and re-run`);
    return { step: { step: `env ${key} (kept: split over ${mine.length} entries)`, method: "KEEP", note: "value not rewritten; change it in the Vercel dashboard" } };
  }
  const wrong = mine.filter((entry) => !storedCorrectly(entry, { type, target }));
  if (wrong.length > 0 && (mine.length > 1 || !patchable(wrong[0], type))) return { manual: manualReason(key, type, mine, wrong) };
  const old = wrong[0];
  if (old) {
    // A public entry keeps its (readable) type: only its targets were wrong.
    const body = type === "sensitive" ? { type, target, value } : { target, value };
    return { step: { step: `env ${key} (fix ${old.type} entry in place)`, method: "PATCH", path: `/v9/projects/${at}/env/${encodeURIComponent(old.id)}`, body, note: fixNote(type, old) } };
  }
  return { step: { step: `env ${key} (${type})`, method: "POST", path: `/v10/projects/${at}/env?upsert=true`, body: { key, value, type, target } } };
}

// named: the operator listed these keys with --keys, so keeping one unwritten is refused.
export function envSteps(project, vars, existing, named = false) {
  const at = encodeURIComponent(project);
  const steps = [];
  const manual = [];
  for (const variable of vars) {
    const override = (entry) => Boolean(entry.gitBranch) || (entry.customEnvironmentIds ?? []).length > 0;
    const mine = existing.filter((entry) => entry.key === variable.key && !(variable.type === "plain" && override(entry)));
    const { step, manual: reason } = keyStep(at, variable, mine, named);
    if (reason) manual.push(reason);
    else steps.push(step);
  }
  if (manual.length > 0) {
    throw new Error(`nothing written: these keys have entries the CLI cannot remove (it refuses DELETE non-interactively). Fix or remove the wrong entries in the Vercel dashboard, then re-run: ${manual.join(", ")}`);
  }
  return steps;
}
