import { afterEach, describe, expect, it } from "vitest";
import { KEY_VALUE, URL_VALUE, WRITES, cleanup, setup, type Options } from "./helpers/fake-vercel";

afterEach(cleanup);

describe("setup-vercel: the normal run", () => {
  it("checks, creates, configures and makes main the FIRST deployment, through the API only", () => {
    const run = setup();
    expect(run.calls).toEqual(["api GET /v9/projects/r", "api POST /v11/projects", ...WRITES]);
    expect(run.rc).toBe(0);
  });

  it("sends the settings the template depends on", () => {
    const { bodies } = setup();
    expect(bodies[0]).toMatchObject({ name: "r", framework: "nextjs", gitRepository: { type: "github", repo: "o/r" }, ssoProtection: { deploymentType: "prod_deployment_urls_and_all_previews" } });
    expect(bodies[1]).toEqual({ nodeVersion: "24.x" });
    expect(bodies[2]).toMatchObject({ key: "NEXT_PUBLIC_SUPABASE_URL", value: URL_VALUE, target: ["production", "preview", "development"] });
    expect(bodies[3]).toMatchObject({ key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value: KEY_VALUE });
    expect(bodies[4]).toMatchObject({ project: "r", target: "production", gitSource: { type: "github", org: "o", repo: "r", ref: "main" } });
  });

  it("never prints the values, and records each step", () => {
    const run = setup();
    expect(run.out).not.toContain(KEY_VALUE);
    expect(run.record).toContain("| first deployment ready | 0 | r-abc.vercel.app |");
    expect(run.record).not.toContain(KEY_VALUE);
  });

  it("strips matching quotes from a value, as dotenv does", () => {
    const run = setup({ env: { NEXT_PUBLIC_SUPABASE_URL: `"${URL_VALUE}"`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `'${KEY_VALUE}'` } });
    expect(run.bodies[2]).toMatchObject({ value: URL_VALUE });
    expect(run.bodies[3]).toMatchObject({ value: KEY_VALUE });
  });
});

describe("setup-vercel: nothing is called when a local check fails", () => {
  it.each([
    ["engines and .nvmrc disagree", { engines: ">=22 <25" }, "engines.node must be '24.x'"],
    ["a value carries an inline comment", { env: { NEXT_PUBLIC_SUPABASE_URL: `${URL_VALUE} # prod`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY_VALUE } }, "whitespace or '#'"],
    ["a variable is missing", { env: { NEXT_PUBLIC_SUPABASE_URL: URL_VALUE } }, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing"],
    ["the repo is malformed", { args: ["--repo", "no-slash", "--scope", "team", "--vars-file", "x"] }, "usage:"],
  ] as [string, Options, string][])("%s", (_label, options, reason) => {
    const run = setup(options);
    expect(run.out).toContain(reason);
    expect(run.calls).toEqual([]);
    expect(run.rc).toBe(1);
  });
});

describe("setup-vercel: re-runs and failures", () => {
  it("resumes a project that exists with no production deployment", () => {
    const run = setup({ state: "created" });
    expect(run.calls).toEqual(["api GET /v9/projects/r", ...WRITES]);
    expect(run.record).toContain("exists with no production deployment: resuming");
    expect(run.rc).toBe(0);
  });

  it("leaves a project that already has production alone", () => {
    const run = setup({ state: "live" });
    expect(run.calls).toEqual(["api GET /v9/projects/r"]);
    expect(run.out).toContain("already has a production deployment");
    expect(run.rc).toBe(1);
  });

  it("a failed create stops before anything else, with the CLI's reason", () => {
    const run = setup({ fake: { FAKE_FAIL_CREATE: "1" } });
    expect(run.calls).toEqual(["api GET /v9/projects/r", "api POST /v11/projects"]);
    expect(run.out).toContain('already exists. (409)');
    expect(run.rc).toBe(1);
  });

  it("an env item reported as failed inside a 201 stops the run, records it, and leaks no value", () => {
    const run = setup({ fake: { FAKE_ENV_FAILED: "1" } });
    expect(run.calls).not.toContain("api POST /v13/deployments");
    expect(run.record).toContain("| env NEXT_PUBLIC_SUPABASE_URL (plain) | 1 | API reported 1 failed item(s): ENV_CONFLICT |");
    expect(run.out).toContain("Push NO branch");
    expect(`${run.out}${run.record}`).not.toContain(KEY_VALUE);
    expect(run.rc).toBe(1);
  });

  it("a deployment that ends in ERROR is recorded as a failure", () => {
    const run = setup({ fake: { FAKE_READY: "ERROR" } });
    expect(run.record).toContain("| first deployment ready | 1 | deployment dpl_1 ended ERROR |");
    expect(run.out).toContain("Push NO branch");
    expect(run.rc).toBe(1);
  });
});
