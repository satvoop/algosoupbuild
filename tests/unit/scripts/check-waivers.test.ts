import { describe, expect, it } from "vitest";
import { checkRows, parseRows } from "../../../scripts/check-waivers.mjs";

const TABLE = `# Waivers

| Key | Owner | Expires | Reason |
| --- | :---: | --- | --- |
| a | Sat | 2026-12-31 | fine |
| b |  | 2026-12-31 | no owner |
| c | Sat | 31/12/2026 | bad date |
| d | Sat | 2026-01-01 | expired |
`;

describe("parseRows", () => {
  it("skips the header and separator rows, including aligned separators", () => {
    expect(parseRows(TABLE).map((row) => row[0])).toEqual(["a", "b", "c", "d"]);
  });

  it("returns nothing for a table with no waivers", () => {
    expect(parseRows("| Key | Owner | Expires | Reason |\n| --- | --- | --- | --- |\n")).toEqual([]);
  });
});

describe("checkRows", () => {
  it("fails a missing owner, a malformed date and a past expiry", () => {
    expect(checkRows(parseRows(TABLE), "2026-11-03")).toEqual([
      "b: no owner",
      "c: expiry '31/12/2026' is not a YYYY-MM-DD date",
      "d: expired on 2026-01-01 (owner Sat)",
    ]);
  });

  it("treats a waiver as valid through its expiry day and failed the day after", () => {
    const rows = [["k", "Sat", "2026-11-03", "r"]];
    expect(checkRows(rows, "2026-11-03")).toEqual([]);
    expect(checkRows(rows, "2026-11-04")).toEqual(["k: expired on 2026-11-03 (owner Sat)"]);
  });
});
