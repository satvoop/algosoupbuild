// Types for scripts/lib/rls-probe.mjs, so tests stay strictly typed.
export type ProbeError = { code?: string; message?: string };
export type SelectResult = { rows: Record<string, unknown>[]; error: ProbeError | null };
export type ReadPort = { select(table: string, column: string, value: string): Promise<SelectResult> };
export type AdminPort = {
  createUser(email: string, password: string): Promise<string>;
  insertRow(table: string, row: Record<string, unknown>): Promise<void>;
  deleteRows(table: string, column: string, value: string): Promise<void>;
  countRows(table: string, column: string, value: string): Promise<number>;
  deleteUser(id: string): Promise<void>;
  userExists(id: string): Promise<boolean>;
};
export type ProbePorts = { admin: AdminPort; anon: ReadPort; signIn(email: string, password: string): Promise<ReadPort> };
export type ProbeOptions = { table: string; ownerColumn: string; markerColumn: string; row: Record<string, unknown>; anonRead: boolean };
export type ProbeRun = { marker: string; owner: { email: string; password: string }; stranger: { email: string; password: string } };
export type Leg = { leg: string; ok: boolean; detail: string };

export const ANON_DENIED: string;
export function anonLeg(result: SelectResult, opts: ProbeOptions): Leg;
export function ownerLeg(result: SelectResult, opts: ProbeOptions, marker: string): Leg;
export function strangerLeg(result: SelectResult): Leg;
export function cleanupLeg(ports: ProbePorts, opts: ProbeOptions, marker: string, userIds: string[]): Promise<Leg>;
export function runProbe(ports: ProbePorts, opts: ProbeOptions, run: ProbeRun): Promise<{ legs: Leg[]; setupError: string | null }>;
