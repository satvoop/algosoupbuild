import { spawnSync } from "node:child_process";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanRepos, commitFile, git, gitAt, onLane, repoWithMap, run, setMap, toLead } from "./helpers/lane-repo";

afterEach(cleanRepos);

const UI_LINE = "ui    src/app/board/**";

describe("check-lane-paths CLI: what a merge would bring in", () => {
  it("passes a lane that stayed inside its globs, and names the lead HEAD, the merge tree and the map", () => {
    const { dir, base } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    const { rc, out } = run(dir, "ui", "ui");
    expect(out).toMatch(new RegExp(`PASS  lane-paths ui 1 files compared, diff ${base} [0-9a-f]{40} \\([0-9a-f]{40} merged into lead HEAD\\), change [0-9a-f]{64}, map ${base}:docs/specs/lanes.txt \\(lead HEAD\\)`));
    expect(out).toContain("LANE_PATHS_RC=0");
    expect(rc).toBe(0);
  });

  it("fails a lane that touched a lead-owned file", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    commitFile(dir, "src/lib/contracts/board.ts");
    toLead(dir);
    const { rc, out } = run(dir, "ui", "ui");
    expect(out).toContain("src/lib/contracts/board.ts: outside lane 'ui' (owned by lead)");
    expect(rc).toBe(1);
  });

  it("counts the old path of a rename, so moving another lane's file out is caught", () => {
    const { dir } = repoWithMap();
    commitFile(dir, "src/app/api/board/route.ts");
    onLane(dir, "ui");
    mkdirSync(path.join(dir, "src", "app", "board"), { recursive: true });
    git(dir, "mv", "src/app/api/board/route.ts", "src/app/board/route.ts");
    git(dir, "commit", "-q", "-m", "move");
    toLead(dir);
    const { rc, out } = run(dir, "ui", "ui");
    expect(out).toContain("src/app/api/board/route.ts: outside lane 'ui' (owned by api)");
    expect(rc).toBe(1);
  });

  it("catches a revert hidden by two merge bases (criss-cross): the merge, not a range, is compared", () => {
    const { dir, base } = repoWithMap();
    toLead(dir);
    commitFile(dir, "package.json", "v2\n");
    const leadChange = git(dir, "rev-parse", "HEAD");
    onLane(dir, "sibling", base);
    // Dated later than the lead's change, so a single `git merge-base` prefers it.
    mkdirSync(path.join(dir, "src", "app", "api", "board"), { recursive: true });
    writeFileSync(path.join(dir, "src", "app", "api", "board", "route.ts"), "r\n");
    git(dir, "add", "src/app/api/board/route.ts");
    gitAt("2099-01-01T00:00:00Z", dir, "commit", "-q", "-m", "sibling work");
    const sibling = git(dir, "rev-parse", "HEAD");
    toLead(dir);
    git(dir, "merge", "-q", "--no-ff", "-m", "merge sibling", "sibling");
    onLane(dir, "ui", base);
    git(dir, "merge", "-q", "--no-ff", "-m", "take sibling", sibling);
    git(dir, "merge", "-q", "--no-ff", "-m", "take lead change", leadChange);
    commitFile(dir, "package.json", "v1\n");
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    const bases = git(dir, "merge-base", "--all", "dev", "ui").split("\n");
    expect(bases.length).toBe(2);
    const { rc, out } = run(dir, "ui", "ui");
    expect(out).toContain("package.json: outside lane 'ui' (owned by lead)");
    expect(rc).toBe(1);
  });

  it("fails a merge that would conflict, and says the lane rebases", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx", "lane\n");
    toLead(dir);
    commitFile(dir, "src/app/board/page.tsx", "lead\n");
    const { rc, out } = run(dir, "ui", "ui");
    expect(out).toContain("into the lead's HEAD conflicts");
    expect(rc).toBe(1);
  });

  it("reads the map from the lead's HEAD, so a lane that edits lanes.txt cannot widen itself", () => {
    const { dir, base } = repoWithMap();
    onLane(dir, "ui");
    setMap(dir, UI_LINE, `ui    package.json  ${UI_LINE.slice(6)}`, "lane widens itself");
    commitFile(dir, "package.json", "v2\n");
    toLead(dir);
    const { rc, out } = run(dir, "ui", "ui");
    expect(out).toContain(`map ${base}:docs/specs/lanes.txt (lead HEAD)`);
    expect(out).toContain("package.json: outside lane 'ui' (owned by lead)");
    expect(out).toContain("docs/specs/lanes.txt: outside lane 'ui' (owned by lead)");
    expect(rc).toBe(1);
  });

  it("applies a map change the lead commits at once, with no rebase of the lane", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/components/shared/button.tsx");
    toLead(dir);
    expect(run(dir, "ui", "ui").rc).toBe(1);
    setMap(dir, UI_LINE, `ui    src/components/shared/**  ${UI_LINE.slice(6)}`, "lead gives ui the shared folder");
    expect(run(dir, "ui", "ui").rc).toBe(0);
  });

  it("refuses a lead map that gives the map file to a lane", () => {
    const { dir } = repoWithMap();
    setMap(dir, UI_LINE, `ui    docs/specs/lanes.txt  ${UI_LINE.slice(6)}`, "lead mis-authors the map");
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    const { rc, out } = run(dir, "ui", "ui");
    expect(out).toContain("docs/specs/lanes.txt must be owned by lead alone");
    expect(rc).toBe(2);
  });

  it("fails a lane that is already merged: merging it changes nothing", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    git(dir, "merge", "-q", "--no-ff", "-m", "merge ui", "ui");
    const { rc, out } = run(dir, "ui", "ui");
    expect(out).toContain("0 files compared: the merge changes nothing");
    expect(rc).toBe(1);
  });

  it("passes a lane cut before another lane merged, and a lane rebased onto a later contract commit", () => {
    const { dir, base } = repoWithMap();
    onLane(dir, "api");
    commitFile(dir, "src/app/api/board/route.ts");
    onLane(dir, "ui", base);
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    git(dir, "merge", "-q", "--no-ff", "-m", "merge api", "api");
    expect(run(dir, "ui", "ui").rc).toBe(0);
    commitFile(dir, "src/lib/contracts/board.ts");
    const contract = git(dir, "rev-parse", "HEAD");
    git(dir, "switch", "-q", "ui");
    git(dir, "rebase", "-q", contract);
    toLead(dir);
    expect(run(dir, "ui", "ui").rc).toBe(0);
  });
});

describe("check-lane-paths CLI: arguments and running", () => {
  it("prints LANE_PATHS_RC=2 for a head that does not resolve, a range, 'lead', or a missing argument", () => {
    const { dir, base } = repoWithMap();
    expect(run(dir, "ui", "nope").out).toContain("LANE_PATHS_RC=2");
    expect(run(dir, "ui", `${base}..HEAD`).out).toContain("pass the lane's head, not a range");
    expect(run(dir, "lead", "HEAD").out).toContain("'lead' is not a lane that hands back");
    expect(run(dir, "ui", git(dir, "rev-parse", "HEAD^{tree}")).out).toContain("LANE_PATHS_RC=2");
    expect(run(dir, "ui").rc).toBe(2);
  });

  it("prints LANE_PATHS_RC=2 for a lead HEAD with no map, and for --map with no file", () => {
    const { dir } = repoWithMap();
    git(dir, "rm", "-q", "docs/specs/lanes.txt");
    git(dir, "commit", "-q", "-m", "drop map");
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    expect(run(dir, "ui", "ui").out).toContain("LANE_PATHS_RC=2");
    expect(run(dir, "ui", "ui", "--map").out).toContain("--map needs a value");
  });

  it("--map reads an explicit file instead, and says so", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "package.json", "v2\n");
    toLead(dir);
    const wide = path.join(dir, "wide-lanes.txt");
    writeFileSync(wide, "lead  docs/specs/**  scripts/**  .gitmodules  .gitattributes\nui  package.json\n");
    const { rc, out } = run(dir, "ui", "ui", "--map", wide);
    expect(out).toContain(`map ${wide}`);
    expect(rc).toBe(0);
  });

  it("runs when reached through a symlink, instead of exiting 0 silently", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/page.tsx");
    toLead(dir);
    const link = path.join(dir, "linked-check.mjs");
    symlinkSync(path.join(dir, "scripts", "check-lane-paths.mjs"), link);
    const result = spawnSync("node", [link, "ui", "ui"], { cwd: tmpdir(), encoding: "utf8" });
    expect(result.stdout).toContain("LANE_PATHS_RC=0");
  });

  it("checks a non-ASCII path by its real name, not git's quoted form", () => {
    const { dir } = repoWithMap();
    onLane(dir, "ui");
    commitFile(dir, "src/app/board/café.tsx");
    toLead(dir);
    expect(run(dir, "ui", "ui").rc).toBe(0);
  });
});
