// Types for scripts/lib/vars-file.mjs, so tests stay strictly typed.
export type EnvSpec = { type: "plain" | "sensitive"; target: string[] };
export type VarsEntry = EnvSpec & { key: string; value: string };

export const PUBLIC_PREFIX: string;
export const PUBLIC_ENV: string[];
export const PUBLIC_TARGETS: string[];
export const SERVER_TARGETS: string[];
export type StoredEnv = { key: string; type?: string; target?: string[] | string; customEnvironmentIds?: string[]; gitBranch?: string; system?: boolean };
export function envSpec(key: string): EnvSpec;
export function targetList(target: unknown): string[];
export function sameTargets(left: unknown, right: unknown): boolean;
export function isReadable(type: string | undefined): boolean;
export function storedCorrectly(entry: StoredEnv, spec: EnvSpec): boolean;
export function readVarsFile(text: string): { vars: VarsEntry[]; skipped: string[] };
