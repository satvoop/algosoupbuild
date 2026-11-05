// Types for the zero-build Node check, so the unit tests stay strictly typed.
export function globToRegExp(glob: string): RegExp;
export function parseLanes(text: string): { lanes: Map<string, string[]>; errors: string[] };
export function checkPaths(lanes: Map<string, string[]>, lane: string, files: string[]): string[];
export function checkProtected(lanes: Map<string, string[]>): string[];
