import { describe, expect, it } from "vitest";
import { envSpec, readVarsFile } from "../../../scripts/lib/vars-file.mjs";

// The vars file is the single source for .env.local and for Vercel. Its names decide where a
// value may go: NEXT_PUBLIC_* is inlined into the browser bundle by Next.js, so it is public by
// definition; every other name is server-only.
const PUBLIC_PAIR = "NEXT_PUBLIC_SUPABASE_URL=https://p.example\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=pub_value\n";
const SERVER_VALUE = "planted_server_value_7f3a";

describe("envSpec: the naming contract", () => {
  it("sends NEXT_PUBLIC_* as plain to every environment", () => {
    expect(envSpec("NEXT_PUBLIC_MAPS_KEY")).toEqual({ type: "plain", target: ["production", "preview", "development"] });
  });

  it("sends every other name as sensitive, production only", () => {
    expect(envSpec("EXAMPLE_API_KEY")).toEqual({ type: "sensitive", target: ["production"] });
  });
});

describe("readVarsFile", () => {
  it("reads public and server variables, skipping comments and blank lines", () => {
    const { vars } = readVarsFile(`# comment\n\n${PUBLIC_PAIR}EXAMPLE_API_KEY=${SERVER_VALUE}\n`);
    expect(vars.map((item) => [item.key, item.type])).toEqual([
      ["NEXT_PUBLIC_SUPABASE_URL", "plain"],
      ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "plain"],
      ["EXAMPLE_API_KEY", "sensitive"],
    ]);
    expect(vars[2]?.value).toBe(SERVER_VALUE);
  });

  it("strips matching quotes, as dotenv does", () => {
    expect(readVarsFile(`${PUBLIC_PAIR}EXAMPLE_API_KEY="${SERVER_VALUE}"\n`).vars[2]?.value).toBe(SERVER_VALUE);
  });

  it("skips an optional name left empty (as .env.example ships it), and reports it", () => {
    const { vars, skipped } = readVarsFile(`${PUBLIC_PAIR}SUPABASE_SECRET_KEY=\n`);
    expect(vars.map((item) => item.key)).not.toContain("SUPABASE_SECRET_KEY");
    expect(skipped).toEqual(["SUPABASE_SECRET_KEY"]);
  });

  it.each([
    ["a lower-case or dashed name", `${PUBLIC_PAIR}example-api-key=${SERVER_VALUE}`, "line 3: the text before '=' is not a valid name"],
    ["an 'export' prefix", `${PUBLIC_PAIR}export EXAMPLE_API_KEY=${SERVER_VALUE}`, "line 3: the text before '=' is not a valid name"],
    ["a value pasted on its own line (base64 ends in '=')", `${PUBLIC_PAIR}EXAMPLE_PRIVATE_KEY_B64=\n${SERVER_VALUE}==`, "line 4: the text before '=' is not a valid name"],
    ["a value after a space", `${PUBLIC_PAIR}EXAMPLE_API_KEY ${SERVER_VALUE}=`, "line 3: the text before '=' is not a valid name"],
    ["a name Vercel reserves", `${PUBLIC_PAIR}VERCEL_OIDC_TOKEN=${SERVER_VALUE}`, "VERCEL_OIDC_TOKEN: VERCEL_* names are reserved"],
    ["a line that is not KEY=value", `${PUBLIC_PAIR}${SERVER_VALUE}`, "line 3 is not KEY=value"],
    ["a required public value left empty", "NEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=pub_value", "NEXT_PUBLIC_SUPABASE_URL is empty"],
    ["an empty name repeated", `${PUBLIC_PAIR}EXAMPLE_API_KEY=\nEXAMPLE_API_KEY=${SERVER_VALUE}`, "EXAMPLE_API_KEY appears twice"],
    ["a value with whitespace", `${PUBLIC_PAIR}EXAMPLE_API_KEY=${SERVER_VALUE} # prod`, "EXAMPLE_API_KEY has whitespace or '#'"],
    ["the same name twice", `${PUBLIC_PAIR}EXAMPLE_API_KEY=a\nEXAMPLE_API_KEY=b`, "EXAMPLE_API_KEY appears twice"],
    ["a required public variable missing", "NEXT_PUBLIC_SUPABASE_URL=https://p.example\n", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing"],
  ])("refuses %s, naming the key but never the value", (_label, text, reason) => {
    expect(() => readVarsFile(text)).toThrow(reason);
    try {
      readVarsFile(text);
    } catch (error) {
      expect(error instanceof Error ? error.message : "").not.toContain(SERVER_VALUE);
    }
  });
});
