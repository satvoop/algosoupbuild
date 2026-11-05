#!/usr/bin/env node
// Live RLS probe for one table on the hosted Supabase project named in the vars file:
//
//   node scripts/probe-rls.mjs --table <table> --owner-column <column> --marker-column <column>
//        [--row '<JSON object of the other required columns>'] [--anon read] [--vars-file <file>]
//
// It creates two users for the run, plants one row owned by the first (a unique text marker in
// the marker column), and checks: anon is refused with 42501 (or, with --anon read, allowed);
// the owner sees its row; the second user sees none; then it removes the row and the users and
// reads back that nothing is left. The legs are in lib/rls-probe.mjs, with why RLS on is read
// from the owner and stranger legs together.
//
// Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in
// the vars file (default .env.probe, gitignored; never .env.local, whose every name
// setup-vercel.mjs sends to Vercel Production). It reads the file itself and prints names, never
// values. It writes to the target project: two auth users and one row, removed afterwards.
// Exit 0 = every leg passed, 1 = a leg failed, 2 = could not run. Last line: RLS_PROBE_RC=<n>.

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { isMain } from "./lib/is-main.mjs";
import { runProbe } from "./lib/rls-probe.mjs";
import { readVarsFile } from "./lib/vars-file.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NAMES = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"];
const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
const USAGE = "usage: probe-rls.mjs --table <table> --owner-column <column> --marker-column <column> [--row <json>] [--anon read] [--vars-file <file>]";

function takeValue(args, at, name) {
  const value = args[at + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${name} needs a value. ${USAGE}`);
  return value;
}

function readRow(text) {
  let row;
  try {
    row = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("--row is not valid JSON");
    throw error;
  }
  if (row === null || typeof row !== "object" || Array.isArray(row)) throw new Error("--row must be a JSON object");
  return row;
}

export function parseArgs(argv) {
  const opts = { table: "", ownerColumn: "", markerColumn: "", row: {}, anonRead: false, varsFile: path.join(ROOT, ".env.probe") };
  const flags = { "--table": "table", "--owner-column": "ownerColumn", "--marker-column": "markerColumn" };
  for (let at = 0; at < argv.length; at += 2) {
    const name = argv[at] ?? "";
    const value = takeValue(argv, at, name);
    if (Object.hasOwn(flags, name)) opts[flags[name]] = value;
    else if (name === "--row") opts.row = readRow(value);
    else if (name === "--anon") {
      if (value !== "read") throw new Error(`--anon takes only 'read' (a table granted to anon on purpose). ${USAGE}`);
      opts.anonRead = true;
    }
    else if (name === "--vars-file") opts.varsFile = path.resolve(value);
    else throw new Error(`unknown argument ${name}. ${USAGE}`);
  }
  for (const key of ["table", "ownerColumn", "markerColumn"]) {
    if (!IDENTIFIER.test(opts[key])) throw new Error(`${key} must be a plain lower-case identifier. ${USAGE}`);
  }
  return opts;
}

// Values from the vars file; only names appear in any message.
export function readEnv(text) {
  const values = new Map(readVarsFile(text).vars.map((entry) => [entry.key, entry.value]));
  const missing = NAMES.filter((name) => !values.get(name));
  if (missing.length > 0) throw new Error(`the vars file has no value for ${missing.join(", ")}`);
  return { url: values.get(NAMES[0]), publishable: values.get(NAMES[1]), secret: values.get(NAMES[2]) };
}

function client(url, key, fetchImpl) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchImpl } });
}

function must({ data, error }, what) {
  if (error) throw new Error(`${what} failed: ${error.message ?? "no message"}`);
  return data;
}

function readPort(supabase) {
  return {
    async select(table, column, value) {
      const { data, error } = await supabase.from(table).select(column).eq(column, value);
      return { rows: data ?? [], error: error ? { code: error.code, message: error.message } : null };
    },
  };
}

export function buildPorts(env, fetchImpl) {
  const admin = client(env.url, env.secret, fetchImpl);
  return {
    anon: readPort(client(env.url, env.publishable, fetchImpl)),
    async signIn(email, password) {
      const user = client(env.url, env.publishable, fetchImpl);
      must(await user.auth.signInWithPassword({ email, password }), `sign-in as ${email}`);
      return readPort(user);
    },
    admin: {
      async createUser(email, password) {
        return must(await admin.auth.admin.createUser({ email, password, email_confirm: true }), `creating ${email}`).user.id;
      },
      async insertRow(table, row) {
        must(await admin.from(table).insert(row), `planting a row in ${table}`);
      },
      async deleteRows(table, column, value) {
        must(await admin.from(table).delete().eq(column, value), `deleting the planted row from ${table}`);
      },
      async countRows(table, column, value) {
        const { count, error } = await admin.from(table).select(column, { count: "exact", head: true }).eq(column, value);
        if (error) throw new Error(`counting planted rows in ${table} failed: ${error.message ?? "no message"}`);
        return count ?? 0;
      },
      async deleteUser(id) {
        must(await admin.auth.admin.deleteUser(id), `deleting probe user ${id}`);
      },
      async userExists(id) {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (error && error.status === 404) return false;
        if (error) throw new Error(`reading probe user ${id} failed: ${error.message ?? "no message"}`);
        return Boolean(data.user);
      },
    },
  };
}

export function newRun(randomHex) {
  const marker = `rls-probe-${randomHex(8)}`;
  const person = (role) => ({ email: `${marker}-${role}@example.test`, password: randomHex(24) });
  return { marker, owner: person("owner"), stranger: person("stranger") };
}

export async function main(argv, deps) {
  let opts, env;
  try {
    opts = parseArgs(argv);
    env = readEnv(deps.readText(opts.varsFile));
  } catch (error) {
    deps.log(`FAIL  rls-probe could not run: ${error instanceof Error ? error.message : String(error)}`);
    deps.log("RLS_PROBE_RC=2");
    return 2;
  }
  deps.log(`PROBE_TARGET=${new URL(env.url).host} TABLE=${opts.table} ANON=${opts.anonRead ? "read" : "denied"}`);
  const { legs, setupError } = await runProbe(buildPorts(env, deps.fetch), opts, newRun(deps.randomHex));
  for (const leg of legs) deps.log(`${leg.ok ? "PASS" : "FAIL"}  ${leg.leg.padEnd(8)} ${leg.detail}`);
  if (setupError) deps.log(`FAIL  rls-probe could not run: ${setupError}`);
  const rc = setupError ? 2 : legs.every((leg) => leg.ok) ? 0 : 1;
  deps.log(`RLS_PROBE_RC=${rc}`);
  return rc;
}

if (isMain(import.meta.url)) {
  const deps = {
    fetch: globalThis.fetch,
    readText: (file) => readFileSync(file, "utf8"),
    randomHex: (bytes) => randomBytes(bytes).toString("hex"),
    log: (line) => console.log(line),
  };
  main(process.argv.slice(2), deps).then(
    (rc) => { process.exitCode = rc; },
    (error) => {
      console.log(`FAIL  rls-probe could not run: ${error instanceof Error ? error.message : String(error)}`);
      console.log("RLS_PROBE_RC=2");
      process.exitCode = 2;
    },
  );
}
