// Types for the Vercel read-back, so tests stay strictly typed. Only the fields it reads.
export type VercelProject = {
  nodeVersion?: string;
  ssoProtection?: { deploymentType: string } | null;
  link?: { productionBranch?: string };
  env?: VercelEnv[];
  targets?: { production?: { readyState?: string; meta?: { githubCommitRef?: string } } };
};

export type VercelEnv = { key: string; type?: string; target?: string[] | string; customEnvironmentIds?: string[]; gitBranch?: string; system?: boolean };

export const STANDARD_PROTECTION: string;
export const PUBLIC_ENV: string[];
export function nodePinProblems(nvmrc: string, engines: string): string[];
export function envProblems(envs: VercelEnv[], expected?: string[]): string[];
export function projectProblems(project: VercelProject, nodeMajor: string, expected?: string[]): string[];
