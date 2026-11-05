import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isMain } from "../../../scripts/lib/is-main.mjs";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function script(): { file: string; url: string; dir: string } {
  const dir = mkdtempSync(path.join(tmpdir(), "is-main-"));
  dirs.push(dir);
  const file = path.join(dir, "tool.mjs");
  writeFileSync(file, "export {};\n");
  return { file, url: pathToFileURL(file).href, dir };
}

describe("isMain", () => {
  it("is true for the script's own path, through a symlink, and through a relative path", () => {
    const { file, url, dir } = script();
    const link = path.join(dir, "link.mjs");
    symlinkSync(file, link);
    expect(isMain(url, file)).toBe(true);
    expect(isMain(url, link)).toBe(true);
    expect(isMain(url, path.relative(process.cwd(), file))).toBe(true);
  });

  it("is false for another file, a missing path and no start path", () => {
    const { url, dir } = script();
    const other = path.join(dir, "other.mjs");
    writeFileSync(other, "export {};\n");
    expect(isMain(url, other)).toBe(false);
    expect(isMain(url, path.join(dir, "gone.mjs"))).toBe(false);
    expect(isMain(url, "")).toBe(false);
  });

  it("rethrows any error other than a missing path", () => {
    const { file, url } = script();
    // A path through a regular file fails with ENOTDIR, which is not "missing".
    expect(() => isMain(url, path.join(file, "inside.mjs"))).toThrow(/ENOTDIR/);
  });
});
