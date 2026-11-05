import { describe, expect, it } from "vitest";
import { runProbe, type Leg, type ProbeOptions, type ProbeRun } from "../../../scripts/lib/rls-probe.mjs";
import { CORRECT, FakeProject, fakePorts, type ProjectModel } from "./helpers/fake-supabase";

const OPTS: ProbeOptions = { table: "notes", ownerColumn: "user_id", markerColumn: "title", row: { body: "probe" }, anonRead: false };
const RUN: ProbeRun = {
  marker: "rls-probe-0011223344556677",
  owner: { email: "rls-probe-0011223344556677-owner@example.test", password: "owner-pass" },
  stranger: { email: "rls-probe-0011223344556677-stranger@example.test", password: "stranger-pass" },
};

function project(change: Partial<ProjectModel> = {}): FakeProject {
  return new FakeProject({ table: "notes", ownerColumn: "user_id", markerColumn: "title", ...CORRECT, ...change });
}

async function legsOf(fake: FakeProject, opts: ProbeOptions = OPTS): Promise<Record<string, Leg>> {
  const { legs, setupError } = await runProbe(fakePorts(fake), opts, RUN);
  expect(setupError).toBeNull();
  return Object.fromEntries(legs.map((leg) => [leg.leg, leg]));
}

describe("rls-probe legs", () => {
  it("passes every leg on an owner-only table with anon denied, and leaves nothing behind", async () => {
    const fake = project();
    const legs = await legsOf(fake);
    expect(Object.keys(legs)).toEqual(["anon", "owner", "stranger", "cleanup"]);
    for (const leg of Object.values(legs)) expect(leg.ok, leg.detail).toBe(true);
    expect(fake.rows).toHaveLength(0);
    expect(fake.users.size).toBe(0);
    expect(fake.inserted[0]).toEqual({ body: "probe", user_id: "00000000-0000-4000-8000-000000000001", title: RUN.marker });
  });

  it("fails the stranger leg when RLS is off and authenticated can select", async () => {
    const legs = await legsOf(project({ rls: false }));
    expect(legs.stranger?.ok).toBe(false);
    expect(legs.stranger?.detail).toContain("sees 1 of the owner's rows");
  });

  it("fails the owner leg when authenticated has no select grant", async () => {
    const legs = await legsOf(project({ rls: false, authenticatedGrant: false }));
    expect(legs.owner?.ok).toBe(false);
    expect(legs.owner?.detail).toContain("42501");
  });

  it("fails the anon leg when anon is granted select on an RLS table with no policy ([] is not 42501)", async () => {
    const legs = await legsOf(project({ anonGrant: true }));
    expect(legs.anon?.ok).toBe(false);
    expect(legs.anon?.detail).toContain("returned 0 rows, not 42501");
  });

  it("fails the owner leg when the policy admits no one", async () => {
    const legs = await legsOf(project({ policy: "none" }));
    expect(legs.owner?.ok).toBe(false);
    expect(legs.stranger?.ok).toBe(true);
  });

  it("fails the stranger leg when the policy is using (true)", async () => {
    const legs = await legsOf(project({ policy: "true" }));
    expect(legs.owner?.ok).toBe(true);
    expect(legs.stranger?.ok).toBe(false);
  });

  it("fails the cleanup leg, naming the row, when the planted row is left behind", async () => {
    const legs = await legsOf(project({ keepRows: true }));
    expect(legs.cleanup?.ok).toBe(false);
    expect(legs.cleanup?.detail).toContain(`1 planted rows left in notes (marker ${RUN.marker})`);
  });

  it("fails the cleanup leg, naming each user, when the probe users are left behind", async () => {
    const legs = await legsOf(project({ keepUsers: true }));
    expect(legs.cleanup?.ok).toBe(false);
    expect(legs.cleanup?.detail).toContain("probe user 00000000-0000-4000-8000-000000000001 left behind");
    expect(legs.cleanup?.detail).toContain("probe user 00000000-0000-4000-8000-000000000002 left behind");
  });

  it("fails the stranger leg when its query errors: no rows from an error is not 'sees none'", async () => {
    const legs = await legsOf(project({ strangerError: true }));
    expect(legs.owner?.ok).toBe(true);
    expect(legs.stranger?.ok).toBe(false);
    expect(legs.stranger?.detail).toContain("57014");
  });

  it("fails the anon leg on an error that is not 42501 (a missing table gives 42P01)", async () => {
    const legs = await legsOf(project({ anonErrorCode: "42P01" }));
    expect(legs.anon?.ok).toBe(false);
    expect(legs.anon?.detail).toContain("42P01");
  });

  it("fails the anon leg on a 42501 that is not the table's (a denied role switch)", async () => {
    const legs = await legsOf(project({ anonErrorMessage: "permission denied to set role \"anon\"" }));
    expect(legs.anon?.ok).toBe(false);
    expect(legs.anon?.detail).toContain("permission denied to set role");
  });

  it("fails the owner leg when it sees more than its one planted row", async () => {
    const legs = await legsOf(project({ ownerResult: "duplicate" }));
    expect(legs.owner?.ok).toBe(false);
    expect(legs.owner?.detail).toContain("saw 2 rows");
  });

  it("fails the owner leg when the row it sees is not the planted one", async () => {
    const legs = await legsOf(project({ ownerResult: "wrong-marker" }));
    expect(legs.owner?.ok).toBe(false);
    expect(legs.owner?.detail).toContain("not exactly its own row");
  });

  it("with --anon read, passes a table granted to anon and fails one that refuses anon", async () => {
    const read = { ...OPTS, anonRead: true };
    expect((await legsOf(project({ anonGrant: true }), read)).anon?.ok).toBe(true);
    expect((await legsOf(project(), read)).anon?.ok).toBe(false);
  });

  it("reports a setup failure and still runs cleanup", async () => {
    const { legs, setupError } = await runProbe(fakePorts(project(), { failCreate: true }), OPTS, RUN);
    expect(setupError).toContain("signups are disabled");
    expect(legs.map((leg) => leg.leg)).toEqual(["cleanup"]);
    expect(legs[0]?.ok).toBe(true);
  });
});
