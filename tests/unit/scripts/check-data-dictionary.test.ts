import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compare, readDictionary, readSchema } from "../../../scripts/check-data-dictionary.mjs";

// Each case starts an in-process Postgres, which takes a few seconds on a cold worker.
vi.setConfig({ testTimeout: 30_000 });

// readSchema applies the migrations to an in-process Postgres and reads its catalog,
// so these cases exercise real Postgres behaviour, not a parser.
let dir = "";

function migration(name: string, sql: string): void {
  writeFileSync(path.join(dir, name), sql);
}

async function tables(): Promise<Record<string, string[]>> {
  const { schema } = await readSchema(dir);
  return Object.fromEntries([...schema].map(([table, columns]) => [table, [...columns].sort()]));
}

function dictionary(yaml: string) {
  const file = path.join(dir, "dictionary.yml");
  writeFileSync(file, yaml);
  return readDictionary(file);
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "dictionary-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("readSchema (from the catalog of an in-process Postgres)", () => {
  it("reports only what the migrations add, not the Supabase model's own auth.users", async () => {
    migration("20260101000000_a.sql", "create table notes (id uuid primary key, owner uuid references auth.users (id), body text);");
    expect(await tables()).toEqual({ notes: ["body", "id", "owner"] });
  });

  it.each([
    ["CTAS with a short column list", "create table t (a) as select 1 as x, 'e'::text as email;", { t: ["a", "email"] }],
    ["SELECT INTO after a CTE", "create table people (id int, email text); with s as (select * from people) select * into backup from s;", { backup: ["email", "id"], people: ["email", "id"] }],
    ["INHERITS", "create table parent (id int, email text); create table child (extra int) inherits (parent);", { child: ["email", "extra", "id"], parent: ["email", "id"] }],
    ["LIKE", "create table people (id int, email text); create table copy (like people);", { copy: ["email", "id"], people: ["email", "id"] }],
    ["a typed table", "create type person as (id int, email text); create table typed of person;", { typed: ["email", "id"] }],
    ["a column named exclude", "create table t (exclude text, id int);", { t: ["exclude", "id"] }],
    ["a materialized view, which stores copies", "create table people (id int, email text); create materialized view emails as select email from people;", { emails: ["email"], people: ["email", "id"] }],
    ["quoted and non-ASCII names, and an apostrophe in a comment", `-- the owner's table\ncreate table "user data" ("first name" text, café int);`, { "user data": ["café", "first name"] }],
  ])("sees the real columns of %s", async (_label, sql, expected) => {
    migration("20260101000000_a.sql", sql);
    expect(await tables()).toEqual(expected);
  });

  it("reports a column a migration adds to a relation the Supabase model already has", async () => {
    migration("20260101000000_a.sql", "alter table auth.users add column phone text;");
    expect(await tables()).toEqual({ "auth.users": ["phone"] });
  });

  it("does not report temporary tables, which never reach the database", async () => {
    migration("20260101000000_a.sql", "create temp table scratch (id int, email text); create table kept (id int);");
    expect(await tables()).toEqual({ kept: ["id"] });
  });

  it("keeps a public table whose name contains a dot apart from the model's auth.users", async () => {
    migration("20260101000000_a.sql", 'create table public."auth.users" (id uuid, email text);');
    expect(await tables()).toEqual({ 'public."auth.users"': ["email", "id"] });
  });

  it("loads a bundled extension a migration names, and fails closed on one Postgres here lacks", async () => {
    migration("20260101000000_a.sql", "create extension if not exists btree_gist; create table slots (id int, during tsrange);");
    expect(await tables()).toEqual({ slots: ["during", "id"] });
    migration("20260102000000_b.sql", "create extension if not exists vector;");
    await expect(readSchema(dir)).rejects.toThrow(/20260102000000_b\.sql did not apply/);
  });

  it("applies ALTER and DROP in file order", async () => {
    migration("20260101000000_a.sql", "create table things (id uuid primary key, old text); create table gone (id int);");
    migration("20260102000000_b.sql", "alter table things add column label text, drop column old; drop table gone;");
    expect(await tables()).toEqual({ things: ["id", "label"] });
  });

  it("fails closed, naming the file, when a migration does not apply", async () => {
    migration("20260101000000_a.sql", "create table broken (id uuid references nowhere (id));");
    await expect(readSchema(dir)).rejects.toThrow(/20260101000000_a\.sql did not apply/);
  });
});

describe("readDictionary keys", () => {
  it("treats public.x as x, keeps other schemas, and keeps a quoted dotted public name whole", () => {
    const rows = dictionary(`tables:
  - { name: public.notes, retention: P1Y, columns: [] }
  - { name: private.notes, retention: P1Y, columns: [] }
  - { name: auth.users, retention: P1Y, columns: [] }
  - { name: 'public."auth.users"', retention: P1Y, columns: [] }
`);
    expect([...rows.keys()]).toEqual(["notes", "private.notes", "auth.users", 'public."auth.users"']);
  });

  it("matches a catalog table whose dictionary row is written with the public. prefix", async () => {
    migration("20260101000000_a.sql", "create table notes (id uuid);");
    const rows = dictionary(`tables:
  - name: public.notes
    retention: P1Y
    columns:
      - { name: id, class: none, erasure: delete }
`);
    expect(compare((await readSchema(dir)).schema, rows).failures).toEqual([]);
  });
});

describe("compare", () => {
  it("passes when every column has a valid row and the table states retention", async () => {
    migration("20260101000000_a.sql", "create table notes (id uuid primary key, body text);");
    const rows = dictionary(`tables:
  - name: notes
    retention: life of account
    columns:
      - { name: id, class: none, erasure: delete }
      - { name: body, class: personal, erasure: delete }
`);
    expect(compare((await readSchema(dir)).schema, rows)).toEqual({ failures: [], tableCount: 1, columnCount: 2 });
  });

  it("fails a missing row, an unknown class, a personal column with no erasure and a missing retention", async () => {
    migration("20260101000000_a.sql", "create table people (id uuid, email text, nickname text);");
    const rows = dictionary(`tables:
  - name: people
    columns:
      - { name: id, class: identifier, erasure: delete }
      - { name: email, class: personal, erasure: none }
`);
    expect(compare((await readSchema(dir)).schema, rows).failures).toEqual([
      "people: table has no retention",
      "people.id: class 'identifier' is not one of none, personal, special, financial, secret",
      "people.email: personal column must name an erasure method",
      "people.nickname: no dictionary row",
    ]);
  });

  it("fails a migrated table with no dictionary entry at all", async () => {
    migration("20260101000000_a.sql", "create table orphan (id uuid);");
    const { failures } = compare((await readSchema(dir)).schema, dictionary("tables: []\n"));
    expect(failures).toContain("orphan: table has no dictionary entry");
  });
});
