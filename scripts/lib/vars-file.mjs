// The vars file (.env.local) is the single source for local runs and for Vercel. A variable's
// NAME decides where its value may go, the same contract Next.js uses: NEXT_PUBLIC_* is inlined
// into the browser bundle, so it is public by definition; every other name is server-only and
// goes to Vercel as a Sensitive variable (write-only after saving: no one can read it back from
// Vercel, https://vercel.com/docs/environment-variables/sensitive-environment-variables),
// Production only.
//
// Errors name the key or the line number, never a value: these messages reach logs and chat.

export const PUBLIC_PREFIX = "NEXT_PUBLIC_";
export const PUBLIC_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
export const PUBLIC_TARGETS = ["production", "preview", "development"];
export const SERVER_TARGETS = ["production"];

// Vercel's list endpoint types `target` as an array or a single string (OpenAPI spec).
export function targetList(target) {
  if (Array.isArray(target)) return [...target];
  return typeof target === "string" ? [target] : [];
}

export const sameTargets = (left, right) => targetList(left).sort().join(",") === targetList(right).sort().join(",");
export const isReadable = (type) => type === "plain" || type === "encrypted";

// Does an entry already stored on Vercel hold this key the way its name requires? A public value
// may be plain or encrypted (both readable by design); a server value must be sensitive, in
// Production only, and synced to no custom environment.
export function storedCorrectly(entry, spec) {
  if (spec.type === "plain") return isReadable(entry.type) && sameTargets(entry.target, spec.target);
  return entry.type === "sensitive" && sameTargets(entry.target, spec.target) && (entry.customEnvironmentIds ?? []).length === 0;
}

export function envSpec(key) {
  return key.startsWith(PUBLIC_PREFIX)
    ? { type: "plain", target: [...PUBLIC_TARGETS] }
    : { type: "sensitive", target: [...SERVER_TARGETS] };
}

function parseLine(line, number) {
  const assignment = /^([^=]+)=(.*)$/.exec(line);
  if (!assignment) throw new Error(`line ${number} is not KEY=value`);
  const key = assignment[1].trim();
  // The rejected text is never echoed: a value pasted on its own line, or after a space, would
  // otherwise be printed as a "name".
  if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
    throw new Error(`line ${number}: the text before '=' is not a valid name (capitals, digits, underscore; no 'export'). It is not shown, in case it is a value`);
  }
  if (key.startsWith("VERCEL_")) throw new Error(`${key}: VERCEL_* names are reserved by Vercel and never belong in this file`);
  // Matching quotes are stripped, as dotenv does. Whitespace or '#' left in a value would be
  // read differently by dotenv and by Vercel, so it is refused.
  const value = assignment[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  if (/[\s#]/.test(value)) throw new Error(`${key} has whitespace or '#' in its value; write the bare value`);
  return { key, value };
}

// Returns { vars: [{ key, value, type, target }] in file order, skipped: [names left empty] }.
// An empty value is skipped, not sent (.env.example ships optional names empty); the two
// public Supabase values are required. Throws on the first problem.
export function readVarsFile(text) {
  const vars = [];
  const skipped = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = (lines[index] ?? "").trim();
    if (line === "" || line.startsWith("#")) continue;
    const { key, value } = parseLine(line, index + 1);
    if ([...vars.map((item) => item.key), ...skipped].includes(key)) throw new Error(`${key} appears twice`);
    if (value === "") skipped.push(key);
    else vars.push({ key, value, ...envSpec(key) });
  }
  for (const key of PUBLIC_ENV) {
    if (skipped.includes(key)) throw new Error(`${key} is empty in the env file`);
    if (!vars.some((item) => item.key === key)) throw new Error(`${key} is missing in the env file`);
  }
  return { vars, skipped };
}
