import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { envProblems, nodePinProblems, projectProblems, type VercelProject } from "../../../scripts/check-vercel.mjs";

const ROOT = path.resolve(__dirname, "../../..");

// Recorded from the dry run (2026-11-03): a project created by `vercel link --yes`, read back
// before any setting was changed, after the first push (an unmerged release branch).
const DRY_RUN_DEFAULTS: VercelProject = {
  nodeVersion: "26.x",
  ssoProtection: { deploymentType: "all_except_custom_domains" },
  link: { productionBranch: "main" },
  env: [],
  targets: { production: { readyState: "READY", meta: { githubCommitRef: "release/dryrun-1" } } },
};

const SCRIPTED: VercelProject = {
  nodeVersion: "24.x",
  ssoProtection: { deploymentType: "prod_deployment_urls_and_all_previews" },
  link: { productionBranch: "main" },
  env: [
    { key: "NEXT_PUBLIC_SUPABASE_URL", type: "plain", target: ["production", "preview", "development"] },
    { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", type: "plain", target: ["development", "preview", "production"] },
  ],
  targets: { production: { readyState: "READY", meta: { githubCommitRef: "main" } } },
};

const ALL = ["production", "preview", "development"];

describe("envProblems: each variable where its name says it may go", () => {
  const good = [...(SCRIPTED.env ?? []), { key: "EXAMPLE_API_KEY", type: "sensitive", target: ["production"] }];

  it("passes public plain everywhere and a server key sensitive in production only", () => {
    expect(envProblems(good, ["NEXT_PUBLIC_SUPABASE_URL", "EXAMPLE_API_KEY"])).toEqual([]);
  });

  it("accepts a public variable stored as encrypted (the dashboard's readable type)", () => {
    expect(envProblems([{ key: "NEXT_PUBLIC_X", type: "encrypted", target: ALL }])).toEqual([]);
  });

  it.each([
    ["a server key stored readable", { key: "EXAMPLE_API_KEY", type: "plain", target: ["production"] }, "EXAMPLE_API_KEY is 'plain', expected 'sensitive'"],
    ["a server key on preview", { key: "EXAMPLE_API_KEY", type: "sensitive", target: ["production", "preview"] }, "EXAMPLE_API_KEY targets [preview,production], expected [production]"],
    ["a public variable missing an environment", { key: "NEXT_PUBLIC_X", type: "plain", target: ["production"] }, "NEXT_PUBLIC_X targets [production], expected [development,preview,production]"],
    ["a public variable stored as sensitive", { key: "NEXT_PUBLIC_X", type: "sensitive", target: ALL }, "NEXT_PUBLIC_X is 'sensitive', expected 'plain'"],
  ])("flags %s", (_label, variable, reason) => {
    expect(envProblems([variable])).toEqual([reason]);
  });

  // Shapes the Stage 5 review measured misfiring on the first version.
  it.each([
    ["Vercel's own system variable", { key: "VERCEL_URL", type: "system", target: ["production"] }],
    ["a public key split over two entries", [{ key: "NEXT_PUBLIC_X", type: "plain", target: ["production"] }, { key: "NEXT_PUBLIC_X", type: "plain", target: ["preview", "development"] }]],
    ["a public branch override next to the main entry", [{ key: "NEXT_PUBLIC_X", type: "plain", target: ALL }, { key: "NEXT_PUBLIC_X", type: "plain", target: ["preview"], gitBranch: "feat/x" }]],
    ["a server target given as a string", { key: "EXAMPLE_API_KEY", type: "sensitive", target: "production" }],
  ])("passes %s", (_label, entries) => {
    expect(envProblems(Array.isArray(entries) ? entries : [entries])).toEqual([]);
  });

  it.each([
    ["a server key synced to a custom environment", { key: "EXAMPLE_API_KEY", type: "sensitive", target: ["production"], customEnvironmentIds: ["env_c"] }, "EXAMPLE_API_KEY is synced to a custom environment, expected Production only"],
    ["a server key scoped to a branch", { key: "EXAMPLE_API_KEY", type: "sensitive", target: ["preview"], gitBranch: "feat/x" }, "EXAMPLE_API_KEY targets [preview] (branch-scoped), expected [production]"],
    ["a readable secret carrying the undocumented system flag", { key: "SUPABASE_SECRET_KEY", type: "encrypted", target: ["production"], system: true }, "SUPABASE_SECRET_KEY is 'encrypted', expected 'sensitive'"],
    ["a hand-made VERCEL_* secret stored readable", { key: "VERCEL_MY_TOKEN", type: "plain", target: ["production"] }, "VERCEL_MY_TOKEN is 'plain', expected 'sensitive'"],
  ])("flags %s", (_label, variable, reason) => {
    expect(envProblems([variable])).toEqual([reason]);
  });

  it("flags an expected variable that is not on the project", () => {
    expect(envProblems(SCRIPTED.env ?? [], ["NEXT_PUBLIC_SUPABASE_URL", "EXAMPLE_API_KEY"])).toEqual(["environment variable EXAMPLE_API_KEY is missing"]);
  });

  it("feeds projectProblems, so a release check catches a readable server key", () => {
    const leaky: VercelProject = { ...SCRIPTED, env: [...(SCRIPTED.env ?? []), { key: "SUPABASE_SECRET_KEY", type: "encrypted", target: ["production"] }] };
    expect(projectProblems(leaky, "24")).toEqual(["SUPABASE_SECRET_KEY is 'encrypted', expected 'sensitive'"]);
  });
});

describe("projectProblems", () => {
  it("fails the dry run's defaults on every item the template depends on", () => {
    const problems = projectProblems(DRY_RUN_DEFAULTS, "24").join("\n");
    expect(problems).toContain("protection is 'all_except_custom_domains'");
    expect(problems).toContain("Node.js version is '26.x', expected '24.x'");
    expect(problems).toContain("NEXT_PUBLIC_SUPABASE_URL is missing");
    expect(problems).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing");
    expect(problems).toContain("production serves 'release/dryrun-1', expected 'main'");
  });

  it("passes a project set up the way the template needs", () => {
    expect(projectProblems(SCRIPTED, "24")).toEqual([]);
  });

  it("reports a project with no production deployment yet", () => {
    expect(projectProblems({ ...SCRIPTED, targets: {} }, "24")).toEqual(["no production deployment yet (deploy main first)"]);
  });

  it("reports a production deployment that is not READY", () => {
    const failed: VercelProject = { ...SCRIPTED, targets: { production: { readyState: "ERROR", meta: { githubCommitRef: "main" } } } };
    expect(projectProblems(failed, "24")).toEqual(["production deployment is 'ERROR', expected 'READY'"]);
  });

  // Measured live 2026-11-03: a project created with its repo connected, whose first push was a
  // feature branch. That branch became the production deployment.
  it("reports a project whose first deployment came from a branch", () => {
    const branchFirst: VercelProject = { ...SCRIPTED, targets: { production: { readyState: "READY", meta: { githubCommitRef: "chore/preview-probe-3" } } } };
    expect(projectProblems(branchFirst, "24")).toEqual(["production serves 'chore/preview-probe-3', expected 'main'"]);
  });

  it("reports protection switched off and a production branch other than main", () => {
    const problems = projectProblems({ ...SCRIPTED, ssoProtection: null, link: { productionBranch: "dev" } }, "24");
    expect(problems).toEqual([
      "production branch is 'dev', expected 'main'",
      "protection is 'off', expected 'prod_deployment_urls_and_all_previews' (production public, previews protected)",
    ]);
  });
});

describe("nodePinProblems", () => {
  it("rejects a range in engines that can resolve to another major than .nvmrc", () => {
    expect(nodePinProblems("22\n", ">=22 <25")).toHaveLength(1);
  });

  it("rejects an .nvmrc that is not a single major", () => {
    expect(nodePinProblems("lts/*", "24.x")[0]).toContain("one major version");
  });

  it("accepts one major in both places", () => {
    expect(nodePinProblems("24\n", "24.x")).toEqual([]);
  });

  it("holds for this repo: CI (.nvmrc) and Vercel (engines) build on the same major", () => {
    const nvmrc = readFileSync(path.join(ROOT, ".nvmrc"), "utf8");
    const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as { engines?: { node?: string } };
    expect(nodePinProblems(nvmrc, pkg.engines?.node ?? "")).toEqual([]);
  });
});
