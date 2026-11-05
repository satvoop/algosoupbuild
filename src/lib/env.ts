/**
 * Validated environment access. A missing variable fails loudly, by name, at
 * first use, instead of an `undefined` travelling into a request.
 */
export class MissingEnvError extends Error {
  constructor(public readonly variable: string) {
    super(`Missing required environment variable: ${variable}`);
    this.name = "MissingEnvError";
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new MissingEnvError(name);
  }
  return value;
}

/** Variables the browser may see. Everything else is server-only. */
export const PUBLIC_ENV = {
  supabaseUrl: "NEXT_PUBLIC_SUPABASE_URL",
  supabasePublishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
} as const;

export const SERVER_ENV = {
  supabaseSecretKey: "SUPABASE_SECRET_KEY",
  appPassword: "APP_PASSWORD",
  anthropic: "ANTHROPIC_API_KEY",
  currents: "CURRENTS_API_KEY",
} as const;
