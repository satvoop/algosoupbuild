import { afterEach, describe, expect, it } from "vitest";
import { MissingEnvError, requireEnv } from "./env";

const NAME = "TEMPLATE_TEST_VARIABLE";

describe("requireEnv", () => {
  afterEach(() => {
    delete process.env[NAME];
  });

  it("returns the value when the variable is set", () => {
    process.env[NAME] = "value";
    expect(requireEnv(NAME)).toBe("value");
  });

  it("throws a named error when the variable is missing", () => {
    expect(() => requireEnv(NAME)).toThrow(MissingEnvError);
    expect(() => requireEnv(NAME)).toThrow(NAME);
  });

  it("treats a blank value as missing", () => {
    process.env[NAME] = "   ";
    expect(() => requireEnv(NAME)).toThrow(MissingEnvError);
  });
});
