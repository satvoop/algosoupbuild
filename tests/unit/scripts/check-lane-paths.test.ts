import { describe, expect, it } from "vitest";
import { checkPaths, checkProtected, globToRegExp, parseLanes } from "../../../scripts/check-lane-paths.mjs";
import { MAP } from "./helpers/lane-repo";

function lanesOf(text: string): Map<string, string[]> {
  const parsed = parseLanes(text);
  expect(parsed.errors).toEqual([]);
  return parsed.lanes;
}

describe("globToRegExp", () => {
  it("lets ** cross directories, including none, and keeps * inside one segment", () => {
    expect(globToRegExp("src/app/board/**").test("src/app/board/page.tsx")).toBe(true);
    expect(globToRegExp("src/app/board/**").test("src/app/board/a/b/c.ts")).toBe(true);
    expect(globToRegExp("tests/**/board*.test.ts").test("tests/board.test.ts")).toBe(true);
    expect(globToRegExp("tests/**/board*.test.ts").test("tests/unit/ui/board-list.test.ts")).toBe(true);
    expect(globToRegExp("src/*.ts").test("src/a/b.ts")).toBe(false);
    expect(globToRegExp("src/app/board/**").test("src/app/boards/page.tsx")).toBe(false);
  });

  it("treats regex characters in a glob as literals", () => {
    expect(globToRegExp("src/app/(site)/page.tsx").test("src/app/(site)/page.tsx")).toBe(true);
    expect(globToRegExp("a.b").test("axb")).toBe(false);
  });
});

describe("parseLanes", () => {
  it("reads one lane per line and skips comments and blank lines", () => {
    expect([...lanesOf(MAP).keys()]).toEqual(["lead", "api", "ui"]);
  });

  it("treats # as a comment only at the start of a word, so a # inside a glob survives", () => {
    expect(lanesOf("lead a/**  # shared\napi src/y#z/**\n").get("api")).toEqual(["src/y#z/**"]);
  });

  it("refuses a glob whose first segment is a wildcard, in any spelling", () => {
    for (const glob of ["**", "**/*", "*/**", "*", "?rc/**", "s*/**"]) {
      expect(parseLanes(`lead a/**\napi ${glob}\n`).errors).toEqual([
        `line 2: glob '${glob}' starts with a wildcard; start it with a folder or file name`,
      ]);
    }
  });

  it("refuses a duplicate lane, a lane with no globs, an absolute or parent glob, and no lead", () => {
    expect(parseLanes("lead a/**\napi x/**\napi y/**\n").errors).toEqual(["line 3: lane 'api' is declared twice"]);
    expect(parseLanes("lead a/**\napi\n").errors).toEqual(["line 2: lane 'api' owns no paths"]);
    expect(parseLanes("lead a/**\napi /etc/**\n").errors).toEqual(["line 2: glob '/etc/**' must be relative to the repo root"]);
    expect(parseLanes("lead a/**\napi ../x/**\n").errors).toEqual(["line 2: glob '../x/**' must be relative to the repo root"]);
    expect(parseLanes("api x/**\n").errors).toEqual(["no 'lead' lane: shared files need an owner"]);
  });
});

describe("checkPaths", () => {
  const lanes = lanesOf(MAP);

  it("passes a lane that changed only its own paths", () => {
    expect(checkPaths(lanes, "ui", ["src/app/board/page.tsx", "tests/unit/board-list.test.ts"])).toEqual([]);
  });

  it("fails a path another lane owns, and names the owner", () => {
    expect(checkPaths(lanes, "ui", ["src/app/board/page.tsx", "package.json"])).toEqual([
      "package.json: outside lane 'ui' (owned by lead)",
    ]);
  });

  it("fails a path nobody owns", () => {
    expect(checkPaths(lanes, "api", ["src/app/layout.tsx"])).toEqual(["src/app/layout.tsx: outside lane 'api' (owned by no lane)"]);
  });

  it("fails a path that more than one lane owns, even when this lane is one of them", () => {
    const overlap = lanesOf("lead a/**\napi src/**\nui src/app/**\n");
    expect(checkPaths(overlap, "ui", ["src/app/page.tsx"])).toEqual([
      "src/app/page.tsx: owned by more than one lane (api, ui); the ownership map is ambiguous",
    ]);
  });

  it("fails an unknown lane and an empty change set, so a pass is never vacuous", () => {
    expect(checkPaths(lanes, "nope", ["x"])).toEqual(["lane 'nope' is not in the ownership map"]);
    expect(checkPaths(lanes, "ui", [])).toEqual(["0 files compared: the merge changes nothing"]);
  });
});

describe("checkProtected", () => {
  it("passes a map where the lead alone owns the map file and the check's own scripts", () => {
    expect(checkProtected(lanesOf(MAP))).toEqual([]);
  });

  it("fails a map that gives them to a lane, or to nobody", () => {
    const laneOwnsMap = lanesOf("lead package.json scripts/** .gitmodules .gitattributes\nui docs/** src/app/board/**\n");
    expect(checkProtected(laneOwnsMap)).toEqual([
      "docs/specs/lanes.txt must be owned by lead alone (owned by ui): a lane that owns it can widen its own paths",
    ]);
    const nobody = lanesOf("lead package.json docs/specs/**\nui src/app/board/**\n");
    const why = "must be owned by lead alone (owned by no lane): a lane that owns it can widen its own paths";
    expect(checkProtected(nobody)).toEqual([
      `scripts/check-lane-paths.mjs ${why}`,
      `scripts/lib/is-main.mjs ${why}`,
      `scripts/lib/lane-merge.mjs ${why}`,
      `.gitmodules ${why}`,
      `.gitattributes ${why}`,
    ]);
  });
});
