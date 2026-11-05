import { describe, expect, it } from "vitest";
import { main, parseArgs, readEnv, type ProbeDeps } from "../../../scripts/probe-rls.mjs";
import { CORRECT, FakeProject, type ProjectModel } from "./helpers/fake-supabase";
import { FakeSupabaseHttp, PUBLISHABLE, SECRET, URL_BASE } from "./helpers/fake-supabase-http";

const ARGS = ["--table", "notes", "--owner-column", "user_id", "--marker-column", "title", "--row", '{"body":"probe"}', "--vars-file", "/fake/.env.local"];
const VARS = `NEXT_PUBLIC_SUPABASE_URL=${URL_BASE}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE}\nSUPABASE_SECRET_KEY=${SECRET}\n`;

async function runCli(change: Partial<ProjectModel> = {}, args: string[] = ARGS, vars = VARS) {
  const project = new FakeProject({ table: "notes", ownerColumn: "user_id", markerColumn: "title", ...CORRECT, ...change });
  const http = new FakeSupabaseHttp(project);
  const lines: string[] = [];
  let counter = 0;
  const deps: ProbeDeps = {
    fetch: http.fetch,
    readText: () => vars,
    randomHex: (bytes) => { counter += 1; return String(counter).repeat(bytes * 2).slice(0, bytes * 2); },
    log: (line) => lines.push(line),
  };
  const rc = await main(args, deps);
  return { rc, out: lines.join("\n"), project, http };
}

describe("probe-rls CLI over supabase-js (fake HTTP, no network)", () => {
  it("passes on a correct table: four PASS lines, RLS_PROBE_RC=0, nothing left behind", async () => {
    const { rc, out, project, http } = await runCli();
    expect(http.unexpected).toEqual([]);
    expect(out).toContain("PROBE_TARGET=probe-test.supabase.co TABLE=notes ANON=denied");
    expect(out).toMatch(/PASS  anon {5}select refused: 42501 permission denied for table notes/);
    expect(out).toMatch(/PASS  owner {4}sees its planted row/);
    expect(out).toMatch(/PASS  stranger sees none/);
    expect(out).toMatch(/PASS  cleanup  planted row and 2 users removed/);
    expect(out.endsWith("RLS_PROBE_RC=0")).toBe(true);
    expect(rc).toBe(0);
    expect(project.rows).toHaveLength(0);
    expect(project.users.size).toBe(0);
    expect(project.inserted[0]).toMatchObject({ body: "probe", title: expect.stringMatching(/^rls-probe-/) });
  });

  it("never prints a key value", async () => {
    for (const change of [{}, { rls: false }, { keepUsers: true }]) {
      const { out } = await runCli(change);
      expect(out).not.toContain(PUBLISHABLE);
      expect(out).not.toContain(SECRET);
    }
  });

  it("exits 1 with a FAIL line when RLS is off", async () => {
    const { rc, out } = await runCli({ rls: false });
    expect(out).toMatch(/FAIL  stranger sees 1 of the owner's rows/);
    expect(out.endsWith("RLS_PROBE_RC=1")).toBe(true);
    expect(rc).toBe(1);
  });

  it("exits 1 when anon reads [] instead of being refused", async () => {
    const { rc, out } = await runCli({ anonGrant: true });
    expect(out).toContain("FAIL  anon");
    expect(rc).toBe(1);
  });

  it("exits 1 and names what is left when cleanup leaves the users", async () => {
    const { rc, out } = await runCli({ keepUsers: true });
    expect(out).toMatch(/FAIL  cleanup  .*probe user .* left behind/);
    expect(rc).toBe(1);
  });

  it("exits 2 when the run cannot plant (user creation refused), after the cleanup leg", async () => {
    const { rc, out } = await runCli({ failCreate: true });
    expect(out).toContain("FAIL  rls-probe could not run: creating rls-probe-");
    expect(out).toContain("Signups not allowed");
    expect(out).toMatch(/PASS  cleanup  planted row and 0 users removed/);
    expect(out.endsWith("RLS_PROBE_RC=2")).toBe(true);
    expect(rc).toBe(2);
  });

  it("exits 2, naming the missing names only, when the vars file lacks the secret key", async () => {
    const vars = `NEXT_PUBLIC_SUPABASE_URL=${URL_BASE}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE}\n`;
    const { rc, out } = await runCli({}, ARGS, vars);
    expect(out).toContain("the vars file has no value for SUPABASE_SECRET_KEY");
    expect(out).not.toContain(PUBLISHABLE);
    expect(out.endsWith("RLS_PROBE_RC=2")).toBe(true);
    expect(rc).toBe(2);
  });
});

describe("probe-rls arguments", () => {
  const base = ["--table", "notes", "--owner-column", "user_id", "--marker-column", "title"];

  it("reads the required flags and defaults", () => {
    const opts = parseArgs(base);
    expect(opts).toMatchObject({ table: "notes", ownerColumn: "user_id", markerColumn: "title", row: {}, anonRead: false });
    expect(opts.varsFile.endsWith(".env.probe")).toBe(true);
  });

  it.each([
    [["--table", "notes", "--owner-column", "user_id"], "markerColumn must be a plain lower-case identifier"],
    [["--table", "Notes; drop", "--owner-column", "user_id", "--marker-column", "title"], "table must be a plain lower-case identifier"],
    [[...base, "--row", "{not json"], "--row is not valid JSON"],
    [[...base, "--row", "[1]"], "--row must be a JSON object"],
    [[...base, "--anon", "write"], "--anon takes only 'read'"],
    [[...base, "--constructor", "x"], "unknown argument --constructor"],
    [[...base, "toString", "x"], "unknown argument toString"],
    [[...base, "--table"], "--table needs a value"],
  ])("refuses %j", (argv, message) => {
    expect(() => parseArgs(argv)).toThrow(message);
  });

  it("reads the three values and names any that are missing", () => {
    expect(readEnv(VARS)).toEqual({ url: URL_BASE, publishable: PUBLISHABLE, secret: SECRET });
    expect(() => readEnv(`NEXT_PUBLIC_SUPABASE_URL=${URL_BASE}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE}\nSUPABASE_SECRET_KEY=\n`)).toThrow("SUPABASE_SECRET_KEY");
  });
});
