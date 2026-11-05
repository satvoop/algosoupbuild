// True when this module is the script node was started with. Compares real paths, so a
// script reached through a symlink or a relative path still runs. A plain string compare
// of process.argv[1] is false there, and the script then exits 0 with no output at all,
// which reads as a pass.

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function isMain(moduleUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    return realpathSync(argv1) === realpathSync(fileURLToPath(moduleUrl));
  } catch (error) {
    // A start path that no longer exists cannot be this module; anything else is real.
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}
