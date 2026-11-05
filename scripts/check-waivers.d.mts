// Types for the zero-build Node check, so the unit tests stay strictly typed.
export function parseRows(markdown: string): string[][];
export function checkRows(rows: string[][], today: string): string[];
