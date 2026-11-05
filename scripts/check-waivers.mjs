#!/usr/bin/env node
// Every waiver in docs/waivers.md names an owner and an expiry date, and an
// expired waiver fails the gate instead of quietly lapsing into being ignored.
// Rows: | Key | Owner | Expires (YYYY-MM-DD) | Reason |. A waiver is valid through
// its expiry date and fails the day after.
// Exit 0 = pass, 1 = fail, 2 = could not run.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "./lib/is-main.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WAIVERS = path.join(ROOT, "docs", "waivers.md");

export function parseRows(markdown) {
  return markdown
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .map((line) => line.trim().split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 4)
    .filter((cells) => cells[0].toLowerCase() !== "key" && !/^:?-+:?$/.test(cells[0]));
}

export function checkRows(rows, today) {
  const failures = [];
  for (const [key, owner, expires] of rows) {
    if (!owner) failures.push(`${key}: no owner`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || Number.isNaN(Date.parse(expires))) {
      failures.push(`${key}: expiry '${expires}' is not a YYYY-MM-DD date`);
    } else if (expires < today) {
      failures.push(`${key}: expired on ${expires} (owner ${owner || "none"})`);
    }
  }
  return failures;
}

function main() {
  try {
    const rows = parseRows(readFileSync(WAIVERS, "utf8"));
    const failures = checkRows(rows, new Date().toISOString().slice(0, 10));
    for (const row of rows) console.log(`      waiver ${row[0]} owner=${row[1]} expires=${row[2]}`);
    if (failures.length > 0) {
      console.log(`FAIL  waivers  ${rows.length} waivers compared`);
      for (const failure of failures) console.log(`      ${failure}`);
      process.exit(1);
    }
    console.log(`PASS  waivers  ${rows.length} waivers compared, none expired`);
  } catch (error) {
    console.log(`FAIL  waivers  could not run: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
}

if (isMain(import.meta.url)) main();
