/**
 * Copy package.json "version" (SSOT) into tauri.conf.json, Cargo.toml, and Cargo.lock.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Invalid package.json version: ${version}`);
}

const tauriPath = path.join(root, "src-tauri", "tauri.conf.json");
const tauri = JSON.parse(readFileSync(tauriPath, "utf8"));
tauri.version = version;
writeFileSync(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`);

const cargoPath = path.join(root, "src-tauri", "Cargo.toml");
const cargo = readFileSync(cargoPath, "utf8");
const nextCargo = cargo.replace(/^version = "[^"]+"/m, `version = "${version}"`);
if (nextCargo === cargo && !cargo.includes(`version = "${version}"`)) {
  throw new Error("Failed to patch src-tauri/Cargo.toml version");
}
writeFileSync(cargoPath, nextCargo);

const lockPath = path.join(root, "src-tauri", "Cargo.lock");
const lock = readFileSync(lockPath, "utf8");
const nextLock = lock.replace(
  /name = "deskcal"\r?\nversion = "[^"]+"/,
  `name = "deskcal"\nversion = "${version}"`,
);
if (nextLock === lock && !lock.includes(`version = "${version}"`)) {
  throw new Error("Failed to patch src-tauri/Cargo.lock deskcal version");
}
writeFileSync(lockPath, nextLock);

console.log(`Synced version ${version} → tauri.conf.json, Cargo.toml, Cargo.lock`);
