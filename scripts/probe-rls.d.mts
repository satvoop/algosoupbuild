// Types for scripts/probe-rls.mjs, so tests stay strictly typed.
import type { ProbeOptions, ProbePorts, ProbeRun } from "./lib/rls-probe.mjs";

export type ProbeEnv = { url: string; publishable: string; secret: string };
export type ProbeDeps = {
  fetch: typeof fetch;
  readText(file: string): string;
  randomHex(bytes: number): string;
  log(line: string): void;
};

export function parseArgs(argv: string[]): ProbeOptions & { varsFile: string };
export function readEnv(text: string): ProbeEnv;
export function buildPorts(env: ProbeEnv, fetchImpl: typeof fetch): ProbePorts;
export function newRun(randomHex: (bytes: number) => string): ProbeRun;
export function main(argv: string[], deps: ProbeDeps): Promise<number>;
