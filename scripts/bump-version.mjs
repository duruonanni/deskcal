/**
 * Bump package.json (SSOT) then sync derived version files.
 * Primary entry: npm run release (before tauri build).
 * Manual: npm run version:bump. Skip bump: DESKCAL_SKIP_VERSION_BUMP=1.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skipBump = process.env.DESKCAL_SKIP_VERSION_BUMP === "1";

if (skipBump) {
  execSync("node scripts/sync-version.mjs", { cwd: root, stdio: "inherit" });
} else {
  const bump = process.env.DESKCAL_VERSION_BUMP ?? "patch";
  if (!["patch", "minor", "major"].includes(bump)) {
    throw new Error(`Invalid DESKCAL_VERSION_BUMP=${bump}`);
  }

  execSync(`npm version ${bump} --no-git-tag-version`, {
    cwd: root,
    stdio: "inherit",
  });
  execSync("node scripts/sync-version.mjs", { cwd: root, stdio: "inherit" });
}
