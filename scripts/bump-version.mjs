/**
 * Patch-bump package.json (SSOT) then sync derived version files.
 * Used before each git commit for DeskCal.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bump = process.env.DESKCAL_VERSION_BUMP ?? "patch";
if (!["patch", "minor", "major"].includes(bump)) {
  throw new Error(`Invalid DESKCAL_VERSION_BUMP=${bump}`);
}

execSync(`npm version ${bump} --no-git-tag-version`, {
  cwd: root,
  stdio: "inherit",
});
execSync("node scripts/sync-version.mjs", { cwd: root, stdio: "inherit" });
