// An in-process Postgres (PGlite) for checks that must know what the migrations
// ACTUALLY create, read from the database's own catalog rather than parsed from
// SQL text. Starts from supabase/tests/supabase-shim.sql (a minimal model of a
// hosted Supabase database).
//
// What this does NOT prove: that a migration applies on hosted Supabase. Here it
// runs as a superuser on Postgres 18; hosted runs a non-superuser on 17, so a
// migration can apply here and be refused there. `supabase db push --dry-run`
// against the project is what proves that.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const SHIM = path.join(ROOT, "supabase", "tests", "supabase-shim.sql");

// Every contrib extension PGlite 0.5.10 bundles. Extensions it does not bundle
// (vector, pg_net, pg_graphql, pgjwt, supabase_vault, pg_cron) cannot load here:
// a migration that creates one fails this check closed. See docs/runbooks/deploy.md.
const BUNDLED = [
  "amcheck", "auto_explain", "bloom", "btree_gin", "btree_gist", "citext", "cube", "dict_int",
  "dict_xsyn", "earthdistance", "file_fdw", "fuzzystrmatch", "hstore", "intarray", "isn", "lo",
  "ltree", "moddatetime", "pageinspect", "pg_buffercache", "pg_freespacemap", "pg_stat_statements",
  "pg_surgery", "pg_trgm", "pg_visibility", "pg_walinspect", "pgcrypto", "seg", "tablefunc", "tcn",
  "tsm_system_rows", "tsm_system_time", "unaccent", "uuid_ossp",
];

// Loading every bundle costs seconds at start-up, so only the ones the migration
// text names are loaded (a name in a comment loads one needlessly; harmless).
async function extensionsNamedIn(sqlTexts) {
  const text = sqlTexts.join("\n").toLowerCase().replace(/uuid-ossp/g, "uuid_ossp");
  const extensions = {};
  for (const name of BUNDLED.filter((candidate) => text.includes(candidate))) {
    const bundle = await import(`@electric-sql/pglite/contrib/${name}`);
    extensions[name] = bundle[name];
  }
  return extensions;
}

export async function createCheckDatabase(sqlTexts = []) {
  const db = new PGlite({ extensions: await extensionsNamedIn(sqlTexts) });
  await db.exec(readFileSync(SHIM, "utf8"));
  return db;
}

export function migrationFiles(dir) {
  return readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
}

export function readMigrations(dir) {
  return migrationFiles(dir).map((file) => readFileSync(path.join(dir, file), "utf8"));
}

export async function applyMigrations(db, dir) {
  const files = migrationFiles(dir);
  for (const file of files) {
    try {
      await db.exec(readFileSync(path.join(dir, file), "utf8"));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`${file} did not apply on the local check database: ${reason}`);
    }
  }
  return files.length;
}

// The dictionary name of a relation: bare in public, schema-qualified elsewhere,
// and any part containing a dot is double-quoted, so public."auth.users" can never
// be mistaken for the auth.users table.
export function relationKey(schema, relation) {
  const part = (name) => (name.includes(".") ? `"${name}"` : name);
  return schema === "public" && !relation.includes(".") ? relation : `${part(schema)}.${part(relation)}`;
}

// Every column of every table, partitioned table, foreign table and materialized
// view (they store copies of what they select). Fully qualified, so nothing a
// migration put on the search_path can shadow the catalog.
export async function relationColumns(db) {
  const result = await db.query(`
    select n.nspname as schema, c.relname as relation, a.attname as column_name
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    where c.relkind in ('r', 'p', 'f', 'm')
      and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
      and n.nspname not like 'pg\\_temp%' and n.nspname not like 'pg\\_toast\\_temp%'
    order by 1, 2, a.attnum`);
  const relations = new Map();
  for (const row of result.rows) {
    const key = relationKey(row.schema, row.relation);
    const columns = relations.get(key) ?? new Set();
    columns.add(row.column_name);
    relations.set(key, columns);
  }
  return relations;
}
