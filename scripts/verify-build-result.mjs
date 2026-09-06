import { readFile } from "node:fs/promises";

const filename = process.argv[2] || "dashboard-game-result.json";
const value = JSON.parse(await readFile(filename, "utf8"));
const keys = (object) => Object.keys(object).sort().join(",");
const exact = (object, expected) => keys(object) === [...expected].sort().join(",");

if (!exact(value, ["schemaVersion", "image", "commitSha", "version", "provenance"])
  || value.schemaVersion !== 1
  || !exact(value.image, ["reference", "digest"])
  || !/^ghcr\.io\/[a-z0-9._-]+\/[a-z0-9._-]+$/.test(value.image.reference)
  || !/^sha256:[0-9a-f]{64}$/.test(value.image.digest)
  || !/^[0-9a-f]{40,64}$/.test(value.commitSha)
  || value.version !== "2.0.0"
  || !exact(value.provenance, ["sourceUrl", "builtAt", "testsPassed"])
  || value.provenance.sourceUrl !== `https://github.com/${process.env.GITHUB_REPOSITORY}/commit/${value.commitSha}`
  || !Number.isFinite(Date.parse(value.provenance.builtAt))
  || value.provenance.testsPassed !== true) {
  throw new Error("dashboard-game-result.json verletzt den geschlossenen v1-Vertrag.");
}

console.log("dashboard-game-result v1 ist gültig.");
