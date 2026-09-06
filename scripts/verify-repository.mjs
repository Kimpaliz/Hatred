import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { SDK_VERSION } from "@dashboard/games-sdk/contract";

const root = process.cwd();
const required = [
  ".dashboard/game.yml",
  ".github/workflows/dashboard-game.yml",
  ".github/pull_request_template.md",
  "AGENTS.md",
  "scripts/check-version-bump.mjs",
  "scripts/check-release-readiness.mjs",
  "Dockerfile",
  "package-lock.json",
  "src/client/index.html",
  "src/client/app.mjs",
  "src/server/index.mjs",
  "public/dashboard/cover.png",
  "public/dashboard/hero.png",
  "public/dashboard/icon.png"
];

for (const relative of required) {
  const info = await stat(path.join(root, relative));
  if (!info.isFile() || info.size === 0) throw new Error(`${relative} fehlt oder ist leer.`);
}

const manifest = await readFile(path.join(root, ".dashboard/game.yml"), "utf8");
for (const expected of [
  "schemaVersion: 2",
  "apiCompatibility: games-v1",
  "healthPath: /healthz",
  "versionPath: /version.json",
  "websocketPath: /ws",
  "coverPath: public/dashboard/cover.png",
  "heroPath: public/dashboard/hero.png",
  "iconPath: public/dashboard/icon.png"
]) {
  if (!manifest.includes(expected)) throw new Error(`Manifestvertrag fehlt: ${expected}`);
}

// Der Hub laedt dieses Artwork roh vom Spiel-Host, deshalb gilt neben dem Format
// auch ein Groessenbudget je Rolle. Verlustfreie Voll-PNGs verfehlen es um eine
// Groessenordnung; WebP oder AVIF in Anzeigegroesse halten es muehelos ein.
const pngSignature = Buffer.from("89504e470d0a1a0a", "hex");
const mediaBudget = { cover: 300 * 1024, hero: 400 * 1024, icon: 80 * 1024 };
for (const [name, budget] of Object.entries(mediaBudget)) {
  const file = await readFile(path.join(root, `public/dashboard/${name}.png`));
  if (file.length < 24 || !file.subarray(0, 8).equals(pngSignature) || file.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`public/dashboard/${name}.png ist kein gültiges PNG.`);
  }
  if (file.length > budget) {
    throw new Error(
      `public/dashboard/${name}.png ist ${Math.round(file.length / 1024)} KB und sprengt das Budget`
      + ` von ${Math.round(budget / 1024)} KB.`
    );
  }
}

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (SDK_VERSION !== "2.0.0") {
  throw new Error("Das lokale SDK muss auf Version 2.0.0 gepinnt sein.");
}
// Jeder Pull Request hebt die Version an; package.json und Manifest tragen dabei
// exakt dieselbe SemVer-Version. Diese Regel gilt auch fuer daraus erzeugte Spiele,
// deshalb wird hier auf Gleichheit statt auf eine feste Nummer geprueft.
const manifestVersion = /^version:[ \t]*(\S+)[ \t]*$/m.exec(manifest)?.[1];
if (!/^\d+\.\d+\.\d+$/.test(packageJson.version ?? "") || manifestVersion !== packageJson.version) {
  throw new Error(
    `package.json (${packageJson.version ?? "(fehlt)"}) und .dashboard/game.yml`
    + ` (${manifestVersion ?? "(fehlt)"}) müssen dieselbe SemVer-Version tragen.`
  );
}
if (packageJson.dependencies?.["@dashboard/games-sdk"] !== "file:packages/dashboard-games-sdk") {
  throw new Error("Das SDK muss aus dem eingecheckten Workspace bezogen werden.");
}

const browserSource = await readFile(path.join(root, "src/client/app.mjs"), "utf8");
if (/DASHBOARD_GAME_API_KEY|returnTo/i.test(browserSource)) {
  throw new Error("Browsercode darf weder Service-Key noch freie returnTo-Parameter enthalten.");
}

console.log("Repository, Manifestmedien und SDK-Pin sind konsistent.");
