import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { SDK_VERSION } from "@dashboard/games-sdk/contract";

const root = process.cwd();
const required = [
  ".dashboard/game.yml",
  ".github/workflows/dashboard-game.yml",
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

const pngSignature = Buffer.from("89504e470d0a1a0a", "hex");
for (const name of ["cover", "hero", "icon"]) {
  const file = await readFile(path.join(root, `public/dashboard/${name}.png`));
  if (file.length < 24 || !file.subarray(0, 8).equals(pngSignature) || file.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`public/dashboard/${name}.png ist kein gültiges PNG.`);
  }
}

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (packageJson.version !== "2.0.0" || SDK_VERSION !== "2.0.0") {
  throw new Error("Template und lokales SDK müssen auf Version 2.0.0 gepinnt sein.");
}
if (packageJson.dependencies?.["@dashboard/games-sdk"] !== "file:packages/dashboard-games-sdk") {
  throw new Error("Das SDK muss aus dem eingecheckten Workspace bezogen werden.");
}

const browserSource = await readFile(path.join(root, "src/client/app.mjs"), "utf8");
if (/DASHBOARD_GAME_API_KEY|returnTo/i.test(browserSource)) {
  throw new Error("Browsercode darf weder Service-Key noch freie returnTo-Parameter enthalten.");
}

console.log("Repository, Manifestmedien und SDK-Pin sind konsistent.");
