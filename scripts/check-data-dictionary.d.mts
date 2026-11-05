// Types for the zero-build Node check, so the unit tests stay strictly typed.
export interface DictionaryColumn {
  name: string;
  class?: string;
  erasure?: string;
  [key: string]: unknown;
}
export interface DictionaryTable {
  retention?: string;
  columns: Map<string, DictionaryColumn>;
}
export function readSchema(migrationsDir: string): Promise<{
  schema: Map<string, Set<string>>;
  fileCount: number;
}>;
export function readDictionary(file: string): Map<string, DictionaryTable>;
export function compare(
  schema: Map<string, Set<string>>,
  dictionary: Map<string, DictionaryTable>,
): { failures: string[]; tableCount: number; columnCount: number };
