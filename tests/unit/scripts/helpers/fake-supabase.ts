import type { AdminPort, ProbePorts, ReadPort, SelectResult } from "../../../../scripts/lib/rls-probe.mjs";

// A model of one hosted table for the RLS probe tests. Each setting is one defect the probe must
// catch: RLS off, a grant given or missing, a policy that admits no one or everyone, cleanup that
// leaves something behind.
export type ProjectModel = {
  table: string;
  ownerColumn: string;
  markerColumn: string;
  rls: boolean;
  anonGrant: boolean;
  authenticatedGrant: boolean;
  policy: "owner" | "none" | "true";
  keepRows: boolean;
  keepUsers: boolean;
  strangerError: boolean;
  anonErrorCode: string;
  anonErrorMessage?: string;
  ownerResult?: "duplicate" | "wrong-marker";
  failCreate?: boolean;
};

export const CORRECT: Omit<ProjectModel, "table" | "ownerColumn" | "markerColumn"> = {
  rls: true, anonGrant: false, authenticatedGrant: true, policy: "owner",
  keepRows: false, keepUsers: false, strangerError: false, anonErrorCode: "42501",
};

export class FakeProject {
  rows: Record<string, unknown>[] = [];
  users = new Map<string, { email: string; password: string }>();
  inserted: Record<string, unknown>[] = [];
  private next = 0;

  constructor(readonly model: ProjectModel) {}

  createUser(email: string, password: string): string {
    this.next += 1;
    const id = `00000000-0000-4000-8000-${String(this.next).padStart(12, "0")}`;
    this.users.set(id, { email, password });
    return id;
  }

  userFor(email: string, password: string): string | null {
    for (const [id, user] of this.users) if (user.email === email && user.password === password) return id;
    return null;
  }

  private denied(): SelectResult {
    const message = this.model.anonErrorMessage ?? `permission denied for table ${this.model.table}`;
    return { rows: [], error: { code: this.model.anonErrorCode, message } };
  }

  // What a select of the marker returns for anon (uid null) or a signed-in user.
  select(uid: string | null, value: string): SelectResult {
    const m = this.model;
    const matching = this.rows.filter((row) => row[m.markerColumn] === value);
    if (uid === null) {
      if (!m.anonGrant) return this.denied();
      return { rows: m.rls ? [] : matching, error: null };
    }
    if (!m.authenticatedGrant) return { rows: [], error: { code: "42501", message: `permission denied for table ${m.table}` } };
    if (m.strangerError && this.isStranger(uid)) return { rows: [], error: { code: "57014", message: "canceling statement due to statement timeout" } };
    if (!m.rls || m.policy === "true") return { rows: matching, error: null };
    if (m.policy === "none") return { rows: [], error: null };
    const own = matching.filter((row) => row[m.ownerColumn] === uid);
    if (m.ownerResult === "duplicate") return { rows: [...own, ...own], error: null };
    if (m.ownerResult === "wrong-marker") return { rows: own.map((row) => ({ ...row, [m.markerColumn]: `${String(row[m.markerColumn])}-other` })), error: null };
    return { rows: own, error: null };
  }

  private isStranger(uid: string): boolean {
    return [...this.users.keys()].indexOf(uid) === 1;
  }

  deleteRows(value: string): void {
    if (!this.model.keepRows) this.rows = this.rows.filter((row) => row[this.model.markerColumn] !== value);
  }

  deleteUser(id: string): void {
    if (!this.model.keepUsers) this.users.delete(id);
  }
}

export function fakePorts(project: FakeProject, opts: { failCreate?: boolean } = {}): ProbePorts {
  const read = (uid: string | null): ReadPort => ({ select: async (_table, _column, value) => project.select(uid, value) });
  const admin: AdminPort = {
    createUser: async (email, password) => {
      if (opts.failCreate) throw new Error("creating a user failed: signups are disabled");
      return project.createUser(email, password);
    },
    insertRow: async (_table, row) => {
      project.inserted.push(row);
      project.rows.push(row);
    },
    deleteRows: async (_table, _column, value) => project.deleteRows(value),
    countRows: async (_table, column, value) => project.rows.filter((row) => row[column] === value).length,
    deleteUser: async (id) => project.deleteUser(id),
    userExists: async (id) => project.users.has(id),
  };
  return {
    admin,
    anon: read(null),
    signIn: async (email, password) => {
      const uid = project.userFor(email, password);
      if (uid === null) throw new Error(`sign-in as ${email} failed: Invalid login credentials`);
      return read(uid);
    },
  };
}
