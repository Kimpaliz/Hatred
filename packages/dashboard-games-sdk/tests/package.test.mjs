import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("package metadata, exports, bin and declarations are consistent", async () => {
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.equal(packageJson.name, "@dashboard/games-sdk");
  assert.equal(packageJson.version, "2.0.0");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.bin["dashboard-games-verify"], "./bin/dashboard-games-verify.mjs");
  for (const descriptor of Object.values(packageJson.exports)) {
    if (typeof descriptor === "string") continue;
    await Promise.all(Object.values(descriptor).map((path) => readFile(join(root, path))));
  }
  const flatLegacyFiles = (await readdir(root)).filter((name) => /\.(?:js|d\.ts)$/.test(name));
  assert.deepEqual(flatLegacyFiles, []);
});
