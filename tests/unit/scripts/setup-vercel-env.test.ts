import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ENV_POST, KEY_VALUE, SERVER_VALUE, URL_VALUE, cleanup, setup } from "./helpers/fake-vercel";

// Server keys: every value in the vars file reaches Vercel where its name says, and no value
// reaches the output, the record or an error. Cases named after the Stage 5 findings they pin.
afterEach(cleanup);

const WITH_SERVER = { NEXT_PUBLIC_SUPABASE_URL: URL_VALUE, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY_VALUE, EXAMPLE_API_KEY: SERVER_VALUE };
const envOnlyArgs = (extra: string[] = []) => (dir: string) => ["--repo", "o/r", "--scope", "team", "--env-only", "--vars-file", path.join(dir, ".env.local"), ...extra];
const envs = (list: Record<string, unknown>[], extra: Record<string, unknown> = {}) => JSON.stringify({ envs: list, ...extra });
const SERVER_ENTRY = (fields: Record<string, unknown>) => ({ id: "env_old", key: "EXAMPLE_API_KEY", ...fields });
const deletes = (calls: string[]) => calls.filter((call) => call.includes("DELETE"));

describe("setup-vercel: where each value goes", () => {
  it("sends a server key as sensitive, production only, and public keys as plain everywhere", () => {
    const { bodies, rc } = setup({ env: WITH_SERVER });
    expect(bodies[2]).toMatchObject({ key: "NEXT_PUBLIC_SUPABASE_URL", type: "plain", target: ["production", "preview", "development"] });
    expect(bodies[4]).toEqual({ key: "EXAMPLE_API_KEY", value: SERVER_VALUE, type: "sensitive", target: ["production"] });
    expect(rc).toBe(0);
  });

  // The real CLI refuses DELETE non-interactively (TEMPLATE-8; the fake refuses it too), so a
  // wrong entry is corrected in place with PATCH, measured live to keep the entry's id.
  it("fixes a readable server entry in place with PATCH, never DELETE, and says to rotate it", () => {
    const run = setup({ state: "created", env: WITH_SERVER, fake: { FAKE_ENVS: envs([SERVER_ENTRY({ type: "plain", target: ["production", "preview", "development"] })]) } });
    expect(deletes(run.calls)).toEqual([]);
    expect(run.calls).toContain("api PATCH /v9/projects/r/env/env_old");
    expect(run.bodies).toContainEqual({ type: "sensitive", target: ["production"], value: SERVER_VALUE });
    expect(run.bodies.filter((body) => body.key === "EXAMPLE_API_KEY")).toEqual([]);
    expect(run.record).toContain("| env EXAMPLE_API_KEY (fix plain entry in place) | 0 | it was readable: ROTATE this key at its provider |");
    expect(run.rc).toBe(0);
  });

  it("fixes a sensitive server entry that also reached Preview, and says to consider rotating it", () => {
    const run = setup({ state: "created", env: WITH_SERVER, fake: { FAKE_ENVS: envs([SERVER_ENTRY({ type: "sensitive", target: ["production", "preview"] })]) } });
    expect(run.calls).toContain("api PATCH /v9/projects/r/env/env_old");
    expect(run.bodies).toContainEqual({ type: "sensitive", target: ["production"], value: SERVER_VALUE });
    expect(run.record).toContain("| env EXAMPLE_API_KEY (fix sensitive entry in place) | 0 | it reached non-production deployments: consider rotating it |");
  });

  it("fixes a readable public entry's targets in place, keeping its type", () => {
    const run = setup({ state: "created", env: WITH_SERVER, fake: { FAKE_ENVS: envs([{ id: "env_pub", key: "NEXT_PUBLIC_SUPABASE_URL", type: "encrypted", target: ["production"] }]) } });
    expect(run.calls).toContain("api PATCH /v9/projects/r/env/env_pub");
    expect(run.bodies).toContainEqual({ target: ["production", "preview", "development"], value: URL_VALUE });
    expect(run.rc).toBe(0);
  });

  const CONSIDER = "it reached non-production deployments: consider rotating it";
  const ROTATE = "it was readable: ROTATE this key at its provider";
  it.each([
    ["synced to a custom environment", [SERVER_ENTRY({ type: "sensitive", target: ["production"], customEnvironmentIds: ["env_custom"] })], `EXAMPLE_API_KEY (1 entry; ${CONSIDER})`],
    ["scoped to a branch", [SERVER_ENTRY({ type: "sensitive", target: ["preview"], gitBranch: "feat/x" })], `EXAMPLE_API_KEY (1 entry; ${CONSIDER})`],
    ["with an extra entry next to a correct one", [SERVER_ENTRY({ type: "sensitive", target: ["production"] }), SERVER_ENTRY({ id: "env_extra", type: "sensitive", target: ["preview"] })], `EXAMPLE_API_KEY (2 entries; ${CONSIDER})`],
    ["stored as two wrong entries", [SERVER_ENTRY({ type: "plain", target: ["production"] }), SERVER_ENTRY({ id: "env_extra", type: "plain", target: ["preview"] })], `EXAMPLE_API_KEY (2 entries; ${ROTATE})`],
    ["stored under a type no live run has measured", [SERVER_ENTRY({ type: "secret", target: ["production"] })], "EXAMPLE_API_KEY (1 entry)"],
  ])("refuses a server key %s before any write, naming it with its rotation advice", (_label, list, reason) => {
    const run = setup({ state: "created", env: WITH_SERVER, fake: { FAKE_ENVS: envs(list) } });
    expect(run.out).toContain("nothing written: these keys have entries the CLI cannot remove");
    expect(run.out).toContain(reason);
    expect(run.calls.filter((call) => /POST|PATCH|DELETE/.test(call))).toEqual([]);
    expect(run.rc).toBe(1);
  });

  it.each([
    ["a server key already sensitive in production (target as an array)", SERVER_ENTRY({ type: "sensitive", target: ["production"] })],
    ["a server key already sensitive in production (target as a string)", SERVER_ENTRY({ type: "sensitive", target: "production" })],
    ["a public key stored encrypted, the dashboard's readable type", { id: "env_pub", key: "NEXT_PUBLIC_SUPABASE_URL", type: "encrypted", target: ["development", "preview", "production"] }],
    ["a public branch override, a deliberate preview setting", { id: "env_pub", key: "NEXT_PUBLIC_SUPABASE_URL", type: "plain", target: ["preview"], gitBranch: "feat/x" }],
  ])("keeps %s and still writes its value", (_label, entry) => {
    const run = setup({ state: "created", env: WITH_SERVER, fake: { FAKE_ENVS: envs([entry]) } });
    expect(deletes(run.calls)).toEqual([]);
    expect(run.bodies.map((body) => body.key)).toContain(entry.key);
    expect(run.rc).toBe(0);
  });
});

describe("setup-vercel: agrees with check-vercel on what is already right", () => {
  it("keeps a public key split over two readable entries that cover every environment, and does not rewrite it", () => {
    const split = [
      { id: "env_p", key: "NEXT_PUBLIC_SUPABASE_URL", type: "plain", target: ["production"] },
      { id: "env_d", key: "NEXT_PUBLIC_SUPABASE_URL", type: "plain", target: ["preview", "development"] },
    ];
    const run = setup({ state: "created", env: WITH_SERVER, fake: { FAKE_ENVS: envs(split) } });
    expect(deletes(run.calls)).toEqual([]);
    expect(run.bodies.map((body) => body.key)).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(run.record).toContain("| env NEXT_PUBLIC_SUPABASE_URL (kept: split over 2 entries) | 0 | value not rewritten; change it in the Vercel dashboard |");
    expect(run.rc).toBe(0);
  });

  it("leaves a public custom-environment entry alone, as check-vercel does, and still writes the value", () => {
    const entries = [
      { id: "env_all", key: "NEXT_PUBLIC_SUPABASE_URL", type: "plain", target: ["production", "preview", "development"] },
      { id: "env_c", key: "NEXT_PUBLIC_SUPABASE_URL", type: "plain", target: [], customEnvironmentIds: ["env_custom"] },
    ];
    const run = setup({ state: "created", env: WITH_SERVER, fake: { FAKE_ENVS: envs(entries) } });
    expect(run.bodies).toContainEqual(expect.objectContaining({ key: "NEXT_PUBLIC_SUPABASE_URL", value: URL_VALUE }));
    expect(run.calls.filter((call) => call.includes("PATCH /v9/projects/r/env/"))).toEqual([]);
    expect(run.record).not.toContain("kept: split");
    expect(run.rc).toBe(0);
  });

  it("names every refused key and its rotation advice in full, however many there are", () => {
    const names = ["ALPHA_API_KEY", "BRAVO_API_KEY", "CHARLIE_API_KEY", "DELTA_API_KEY", "ECHO_API_KEY", "FOXTROT_API_KEY"];
    const env = { ...WITH_SERVER, ...Object.fromEntries(names.map((name) => [name, `${SERVER_VALUE}_${name}`])) };
    const list = names.flatMap((name, index) => [
      { id: `ok_${index}`, key: name, type: "sensitive", target: ["production"] },
      { id: `bad_${index}`, key: name, type: "plain", target: ["preview"] },
    ]);
    const run = setup({ state: "created", env, fake: { FAKE_ENVS: envs(list) } });
    for (const name of names) {
      expect(run.out).toContain(`${name} (2 entries; it was readable: ROTATE this key at its provider)`);
      expect(run.record).toContain(`${name} (2 entries; it was readable: ROTATE this key at its provider)`);
    }
    expect(run.rc).toBe(1);
  });

  it("refuses a public key stored sensitive (no live run has measured that change) before any write", () => {
    const run = setup({ state: "created", env: WITH_SERVER, fake: { FAKE_ENVS: envs([{ id: "env_pub", key: "NEXT_PUBLIC_SUPABASE_URL", type: "sensitive", target: ["production", "preview", "development"] }]) } });
    expect(run.out).toContain("NEXT_PUBLIC_SUPABASE_URL (1 entry)");
    expect(run.calls.filter((call) => /POST|PATCH|DELETE/.test(call))).toEqual([]);
    expect(run.rc).toBe(1);
  });

  it("refuses, before any write, a split key the operator named in --keys", () => {
    const split = [
      { id: "env_p", key: "NEXT_PUBLIC_SUPABASE_URL", type: "plain", target: ["production"] },
      { id: "env_d", key: "NEXT_PUBLIC_SUPABASE_URL", type: "plain", target: ["preview", "development"] },
    ];
    const run = setup({ state: "live", env: WITH_SERVER, args: envOnlyArgs(["--keys", "NEXT_PUBLIC_SUPABASE_URL"]), fake: { FAKE_ENVS: envs(split) } });
    expect(run.out).toContain("NEXT_PUBLIC_SUPABASE_URL is split over 2 entries in Vercel");
    expect(run.calls.filter((call) => call.includes("POST") || call.includes("DELETE"))).toEqual([]);
    expect(run.rc).toBe(1);
  });

});

describe("setup-vercel: no value is ever printed", () => {
  it("redacts a server value that Vercel echoes back in an error", () => {
    const run = setup({ env: WITH_SERVER, fake: { FAKE_ECHO: SERVER_VALUE, FAKE_ENV_ERROR: "1" } });
    expect(run.out).toContain("Invalid value [redacted] for env. (400)");
    expect(`${run.out}${run.record}`).not.toContain(SERVER_VALUE);
    expect(run.rc).toBe(1);
  });

  it("redacts a long value whole, however long the error line", () => {
    const long = `${"Q".repeat(300)}tail_marker`;
    const run = setup({ env: { ...WITH_SERVER, EXAMPLE_PRIVATE_KEY_B64: long }, fake: { FAKE_ECHO: long, FAKE_ENV_ERROR: "1" } });
    expect(`${run.out}${run.record}`).not.toContain("QQQQQQQQ");
    expect(`${run.out}${run.record}`).not.toContain("tail_marker");
  });

  it("redacts longest first, so a short value cannot split a longer one", () => {
    const run = setup({ env: { FLAG: "1", ...WITH_SERVER }, fake: { FAKE_ECHO: `x${SERVER_VALUE}x`, FAKE_ENV_ERROR: "1" } });
    expect(`${run.out}${run.record}`).not.toContain("planted_server");
  });

  it.each([
    ["a value pasted on its own line", `EXAMPLE_API_KEY=\n${SERVER_VALUE}=`],
    ["a value after a space", `EXAMPLE_API_KEY ${SERVER_VALUE}=x`],
  ])("refuses %s before any call, without echoing it", (_label, line) => {
    const run = setup({ env: { NEXT_PUBLIC_SUPABASE_URL: URL_VALUE, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY_VALUE, [line]: "" } });
    expect(run.out).toContain("is not a valid name");
    expect(run.out).not.toContain(SERVER_VALUE);
    expect(run.calls).toEqual([]);
    expect(run.rc).toBe(1);
  });
});

describe("setup-vercel: fails closed and says what state it left", () => {
  it("a failed in-place fix stops the run before any deployment and leaks no value", () => {
    const run = setup({ state: "created", env: WITH_SERVER, fake: { FAKE_ENVS: envs([SERVER_ENTRY({ type: "plain", target: ["production"] })]), FAKE_PATCH_ERROR: "1", FAKE_ECHO: SERVER_VALUE } });
    expect(run.record).toContain("| env EXAMPLE_API_KEY (fix plain entry in place) | 1 |");
    expect(run.out).toContain("[redacted]");
    expect(`${run.out}${run.record}`).not.toContain(SERVER_VALUE);
    expect(run.calls).not.toContain("api POST /v13/deployments");
    expect(run.rc).toBe(1);
  });

  it.each([
    ["an env list it does not understand", '{"items":[]}', "no 'envs' array"],
    ["a paginated env list", envs([], { pagination: { next: 123 } }), "paginated"],
    ["Production entries hidden from this account", envs([], { hiddenProductionEnvCount: 2 }), "hides 2 Production entries"],
  ])("stops on %s before writing anything", (_label, response, reason) => {
    const run = setup({ state: "created", env: WITH_SERVER, fake: { FAKE_ENVS: response } });
    expect(run.out).toContain(reason);
    expect(run.calls.filter((call) => call.includes("POST") || call.includes("PATCH") || call.includes("DELETE"))).toEqual([]);
    expect(run.rc).toBe(1);
  });
});

describe("setup-vercel: --env-only on a deployed project", () => {
  it("writes the variables and nothing else: no create, no Node change, no deployment", () => {
    const run = setup({ state: "live", env: WITH_SERVER, args: envOnlyArgs() });
    expect(run.calls).toEqual(["api GET /v9/projects/r", "api GET /v10/projects/r/env", ENV_POST, ENV_POST, ENV_POST]);
    expect(run.out).toContain("ENV_ONLY_RC=0");
    expect(run.rc).toBe(0);
  });

  it("fixes a wrongly stored entry the same way", () => {
    const run = setup({ state: "live", env: WITH_SERVER, args: envOnlyArgs(), fake: { FAKE_ENVS: envs([SERVER_ENTRY({ type: "encrypted", target: ["production"] })]) } });
    expect(run.calls).toEqual(["api GET /v9/projects/r", "api GET /v10/projects/r/env", ENV_POST, ENV_POST, "api PATCH /v9/projects/r/env/env_old"]);
    expect(run.out).toContain("ROTATE");
  });

  it("--keys sends only the named keys", () => {
    const run = setup({ state: "live", env: WITH_SERVER, args: envOnlyArgs(["--keys", "EXAMPLE_API_KEY"]) });
    expect(run.bodies.map((body) => body.key)).toEqual(["EXAMPLE_API_KEY"]);
    expect(run.rc).toBe(0);
  });

  it.each([
    ["a name not in the file", ["--keys", "OTHER_KEY"], "--keys names not set in the vars file: OTHER_KEY"],
    ["text that is not a name", ["--keys", `${SERVER_VALUE.toLowerCase()}-x`], "--keys takes names like"],
  ])("--keys refuses %s before any call", (_label, extra, reason) => {
    const run = setup({ state: "live", env: WITH_SERVER, args: envOnlyArgs(extra) });
    expect(run.out).toContain(reason);
    expect(run.out).not.toContain(SERVER_VALUE.toLowerCase());
    expect(run.calls).toEqual([]);
  });

  it("refuses when the project does not exist yet", () => {
    const run = setup({ state: "absent", env: WITH_SERVER, args: envOnlyArgs() });
    expect(run.calls).toEqual(["api GET /v9/projects/r"]);
    expect(run.out).toContain("no project 'r' yet: run setup-vercel.mjs without --env-only first");
    expect(run.rc).toBe(1);
  });
});

describe("check-vercel: the CLI with --vars-file", () => {
  const LIVE = JSON.stringify({ nodeVersion: "24.x", ssoProtection: { deploymentType: "prod_deployment_urls_and_all_previews" }, link: { productionBranch: "main" }, targets: { production: { readyState: "READY", meta: { githubCommitRef: "main" } } } });
  const PUBLIC = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", type: "plain", target: ["production", "preview", "development"] },
    { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", type: "plain", target: ["production", "preview", "development"] },
  ];
  const check = (list: Record<string, unknown>[], vars = true) =>
    setup({ script: "check-vercel.mjs", state: "live", env: WITH_SERVER, fake: { FAKE_PROJECT: LIVE, FAKE_ENVS: envs(list) },
      args: (dir) => ["--project", "r", "--scope", "team", ...(vars ? ["--vars-file", path.join(dir, ".env.local")] : [])] });

  it("passes when every name in the file is on the project the right way", () => {
    const run = check([...PUBLIC, { key: "EXAMPLE_API_KEY", type: "sensitive", target: ["production"] }]);
    expect(run.out).toContain("CHECK_RC=0");
    expect(run.rc).toBe(0);
  });

  it("fails a server key that is in the file but not on the project, and never prints a value", () => {
    const run = check(PUBLIC);
    expect(run.out).toContain("FAIL  environment variable EXAMPLE_API_KEY is missing");
    expect(run.out).not.toContain(SERVER_VALUE);
    expect(run.rc).toBe(1);
  });

  it("without --vars-file still fails a readable server key on the project", () => {
    const run = check([...PUBLIC, { key: "EXAMPLE_API_KEY", type: "plain", target: ["production"] }], false);
    expect(run.out).toContain("EXAMPLE_API_KEY is 'plain', expected 'sensitive'");
    expect(run.rc).toBe(1);
  });
});
