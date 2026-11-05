// Types for the local check database helpers, so tests stay strictly typed.
import type { PGlite } from "@electric-sql/pglite";

export const ROOT: string;
export const SHIM: string;
export function createCheckDatabase(sqlTexts?: string[]): Promise<PGlite>;
export function migrationFiles(dir: string): string[];
export function readMigrations(dir: string): string[];
export function applyMigrations(db: PGlite, dir: string): Promise<number>;
export function relationKey(schema: string, relation: string): string;
export function relationColumns(db: PGlite): Promise<Map<string, Set<string>>>;
