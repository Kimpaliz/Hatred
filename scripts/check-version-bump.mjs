// Regel: Jeder Pull Request hebt die Spielversion an.
//
// `package.json` und `.dashboard/game.yml` tragen dieselbe Version, und diese
// Version muss groesser sein als die des Zielbranches. Der Release-Workflow
// meldet genau sie zusammen mit dem Image-Digest an das Dashboard — ohne
// Anhebung zeigen zwei verschiedene Builds dieselbe Version.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

function fail(message) {
  console.error(`FEHLER: ${message}`);
  process.exit(1);
}

function parse(version, source) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? "");
  if (!match) fail(`${source} traegt keine SemVer-Version "major.minor.patch": ${version ?? "(fehlt)"}`);
  return match.slice(1, 4).map(Number);
}

function compare(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

const baseRef = process.argv[2]
  || process.env.VERSION_BASE_REF
  || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "origin/main");

const packageVersion = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
const head = parse(packageVersion, "package.json");

const manifest = readFileSync(path.join(root, ".dashboard/game.yml"), "utf8");
const manifestVersion = /^version:[ \t]*(\S+)[ \t]*$/m.exec(manifest)?.[1];
if (manifestVersion !== packageVersion) {
  fail(
    `.dashboard/game.yml meldet ${manifestVersion ?? "(keine Version)"}, package.json meldet`
    + ` ${packageVersion}. Beide muessen identisch sein.`
  );
}

let basePackage;
try {
  basePackage = execFileSync("git", ["show", `${baseRef}:package.json`], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
} catch {
  fail(
    `Basisversion nicht lesbar: "git show ${baseRef}:package.json" schlug fehl.`
    + " Hole den Zielbranch zuerst, etwa mit: git fetch --no-tags --depth=1 origin main"
  );
}
const baseVersion = JSON.parse(basePackage).version;
const base = parse(baseVersion, `package.json in ${baseRef}`);

if (compare(head, base) <= 0) {
  fail(
    `Jeder Pull Request hebt die Version an: ${baseRef} steht auf ${baseVersion}, dieser Branch auf`
    + ` ${packageVersion}. Hebe package.json und .dashboard/game.yml gemeinsam an.`
  );
}

const changelog = path.join(root, "CHANGELOG.md");
if (existsSync(changelog)) {
  const heading = new RegExp(`^#{1,3} +${packageVersion.replace(/\./g, "\\.")}(\\b|$)`, "m");
  if (!heading.test(readFileSync(changelog, "utf8"))) {
    fail(`CHANGELOG.md hat keinen Abschnitt fuer ${packageVersion}.`);
  }
}

console.log(`Version angehoben: ${baseVersion} → ${packageVersion} (Basis ${baseRef}).`);
