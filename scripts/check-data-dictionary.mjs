#!/usr/bin/env node
// Every table and column the migrations create must have a row in
// docs/architecture/data-dictionary.yml with a valid class and erasure method; a
// personal, special or secret column must name a real erasure method; every table
// must state its retention.
//
// How it knows what exists: it APPLIES every migration to an in-process Postgres
// and reads the catalog (scripts/lib/local-postgres.mjs). There is no SQL parsing,
// so no form of CREATE TABLE, SELECT INTO, INHERITS, LIKE or CTAS can slip past.
// Relations from the Supabase model itself (auth.users) are subtracted. Tables,
// partitioned and foreign tables and materialized views all count.
//
// Exit 0 = pass, 1 = a check failed, 2 = could not run (and that is not a pass:
// a migration that does not apply is reported with its own error).

import { readFileSync } from "node:fs";
import path from "node:path";
import { isMain } from "./lib/is-main.mjs";
import { parse } from "yaml";
import { ROOT, applyMigrations, createCheckDatabase, readMigrations, relationColumns } from "./lib/local-postgres.mjs";

const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const DICTIONARY = path.join(ROOT, "docs", "architecture", "data-dictionary.yml");
const CLASSES = new Set(["none", "personal", "special", "financial", "secret"]);
const ERASURE = new Set(["none", "delete", "null", "isolation_surrogate", "key_destruction", "tombstone"]);
const NEEDS_ERASURE = new Set(["personal", "special", "secret"]);

// What the migrations create: the catalog after the migrations, minus the catalog
// of the Supabase model alone.
export async function readSchema(migrationsDir) {
  const db = await createCheckDatabase(readMigrations(migrationsDir));
  try {
    const baseline = await relationColumns(db);
    const fileCount = await applyMigrations(db, migrationsDir);
    const after = await relationColumns(db);
    const schema = new Map();
    for (const [relation, columns] of after) {
      const known = baseline.get(relation) ?? new Set();
      const added = new Set([...columns].filter((column) => !known.has(column)));
      if (added.size > 0 || !baseline.has(relation)) schema.set(relation, added);
    }
    return { schema, fileCount };
  } finally {
    await db.close();
  }
}

export function readDictionary(file) {
  const doc = parse(readFileSync(file, "utf8")) ?? {};
  const tables = new Map();
  for (const table of doc.tables ?? []) {
    const columns = new Map();
    for (const column of table.columns ?? []) columns.set(String(column.name), column);
    // `public.notes` and `notes` are the same table; `public."auth.users"` keeps its
    // prefix, since without it the name would read as the auth.users table.
    const name = String(table.name);
    const key = /^public\.[^"]/.test(name) && !name.slice(7).includes(".") ? name.slice(7) : name;
    tables.set(key, { retention: table.retention, columns });
  }
  return tables;
}

function checkColumn(table, column, row, failures) {
  if (!row) return failures.push(`${table}.${column}: no dictionary row`);
  if (!CLASSES.has(row.class)) failures.push(`${table}.${column}: class '${row.class}' is not one of ${[...CLASSES].join(", ")}`);
  if (!ERASURE.has(row.erasure)) failures.push(`${table}.${column}: erasure '${row.erasure}' is not one of ${[...ERASURE].join(", ")}`);
  if (NEEDS_ERASURE.has(row.class) && row.erasure === "none") failures.push(`${table}.${column}: ${row.class} column must name an erasure method`);
}

export function compare(schema, dictionary) {
  const failures = [];
  let columnCount = 0;
  for (const [table, columns] of schema) {
    const entry = dictionary.get(table);
    if (!entry) failures.push(`${table}: table has no dictionary entry`);
    else if (!entry.retention) failures.push(`${table}: table has no retention`);
    for (const column of columns) {
      columnCount += 1;
      checkColumn(table, column, entry?.columns.get(column), failures);
    }
  }
  return { failures, tableCount: schema.size, columnCount };
}

async function main() {
  try {
    const { schema, fileCount } = await readSchema(MIGRATIONS);
    const { failures, tableCount, columnCount } = compare(schema, readDictionary(DICTIONARY));
    const counts = `${fileCount} migrations applied, ${tableCount} tables, ${columnCount} columns compared`;
    if (failures.length > 0) {
      console.log(`FAIL  data-dictionary  ${counts}`);
      for (const failure of failures) console.log(`      ${failure}`);
      process.exit(1);
    }
    console.log(`PASS  data-dictionary  ${counts}`);
  } catch (error) {
    console.log(`FAIL  data-dictionary  could not run: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
}

if (isMain(import.meta.url)) await main();
