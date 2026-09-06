// Freigabe-Check vor dem ersten Web-Deploy (AGENTS.md, Abschnitt 5).
//
// Bewusst kein CI-Gate: Waehrend der Entwicklung ist ein Vorlagenzustand normal,
// deshalb laeuft dieser Check nicht in `npm run verify`. Vor dem ersten Deploy und
// vor jedem Deploy, der Branding, Menue oder Manifest veraendert, muss er ohne
// "FEHLT" durchgehen. Er prueft nur maschinell Pruefbares; Menuefuehrung,
// Anleitung und Reconnect werden zusaetzlich von Hand durchgespielt.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

// Stand der Vorlage. Wer diese Werte noch traegt, hat das Spiel nicht gebrandet.
const TEMPLATE = {
  packageName: "dashboard-golden-path-game",
  gameId: "golden-path-game",
  gameName: "Golden Path Game",
  summary: "Sichere Fullstack-Vorlage für ein Dashboard-Multiplayer-Spiel.",
  description:
    "Referenzimplementierung für Launch, Einladungen, Gastzugang und den Games-v1-Plattformvertrag.",
  readmeHeading: "# Dashboard Golden Path Game",
  playfield: "Spielfläche der Vorlage",
  mediaDigests: {
    "cover.png": "6d4e7857856e251380e71295597373adf9f83cc1502a1fa8e62df68cfed94a92",
    "hero.png": "389b931f9915d317f4cccc61172ef29347e1bffc3a9d5c90d5669471afd87d22",
    "icon.png": "aa4f3fe7c5404c49e77e503954d522f8814d27a1cfa7a74cdd82f65c563269b1"
  }
};

const MEDIA_RULES = {
  cover: { maxBytes: 300 * 1024, minWidth: 960, minHeight: 540, shape: "landscape" },
  hero: { maxBytes: 400 * 1024, minWidth: 1280, minHeight: 720, shape: "landscape" },
  icon: { maxBytes: 80 * 1024, minWidth: 128, minHeight: 128, shape: "square" }
};

const SOURCE_EXTENSIONS = new Set([".html", ".htm", ".mjs", ".js", ".jsx", ".ts", ".tsx", ".svelte", ".vue"]);

function read(relative) {
  return readFileSync(path.join(root, relative), "utf8");
}

function collectSources(relative) {
  const absolute = path.join(root, relative);
  let entries;
  try {
    entries = readdirSync(absolute, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) found.push(...collectSources(child));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      found.push({ file: child, text: read(child) });
    }
  }
  return found;
}

function pngSize(buffer) {
  const signature = Buffer.from("89504e470d0a1a0a", "hex");
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) return null;
  if (buffer.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const manifest = read(".dashboard/game.yml");
const packageJson = JSON.parse(read("package.json"));
const field = (name) => new RegExp(`^[ \\t]*${name}:[ \\t]*(.+?)[ \\t]*$`, "m").exec(manifest)?.[1] ?? "";
const sources = collectSources("src");
const sourceText = sources.map((entry) => entry.text).join("\n");
// Menue und Versionsanzeige sind Browserthemen: nur Clientquellen zaehlen, damit eine
// Serverroute /version.json den Punkt nicht faelschlich erfuellt.
const clientSources = sources.filter(
  (entry) => /(^|[\\/])client([\\/]|$)/.test(entry.file) || /\.html?$/.test(entry.file)
);
const clientText = (clientSources.length > 0 ? clientSources : sources).map((entry) => entry.text).join("\n");
const checks = [];

function check(title, run) {
  let problems;
  try {
    problems = run() ?? [];
  } catch (error) {
    problems = [error.message];
  }
  checks.push({ title, problems });
}

check("Identität im Manifest ist eigen", () => {
  const problems = [];
  const id = field("id");
  const name = field("name");
  if (!id || id === TEMPLATE.gameId) problems.push(`.dashboard/game.yml: "id" ist noch "${TEMPLATE.gameId}".`);
  if (!name || name === TEMPLATE.gameName) problems.push(`.dashboard/game.yml: "name" ist noch "${TEMPLATE.gameName}".`);
  if (field("summary") === TEMPLATE.summary) problems.push('.dashboard/game.yml: "summary" ist noch der Vorlagentext.');
  if (field("description") === TEMPLATE.description) {
    problems.push('.dashboard/game.yml: "description" ist noch der Vorlagentext.');
  }
  if (packageJson.name === TEMPLATE.packageName) {
    problems.push(`package.json: "name" ist noch "${TEMPLATE.packageName}".`);
  }
  return problems;
});

check("README beschreibt dieses Spiel", () => {
  const readme = read("README.md");
  if (readme.startsWith(TEMPLATE.readmeHeading)) {
    return ["README.md trägt noch die Überschrift der Vorlage und beschreibt das Template statt des Spiels."];
  }
  return [];
});

check("Keine offenen Vorlagenmarker im Quellcode", () => {
  const problems = [];
  for (const entry of sources) {
    if (entry.text.includes("TODO(gameplay)")) problems.push(`${entry.file} enthält noch "TODO(gameplay)".`);
    if (entry.text.includes(TEMPLATE.playfield)) {
      problems.push(`${entry.file} zeigt noch die Platzhalter-Spielfläche der Vorlage.`);
    }
    if (entry.text.includes(TEMPLATE.gameName) && field("name") !== TEMPLATE.gameName) {
      problems.push(`${entry.file} nennt noch "${TEMPLATE.gameName}" statt des eigenen Spielnamens.`);
    }
  }
  return problems;
});

check("Medien sind eigenes Artwork im Budget", () => {
  const problems = [];
  for (const [role, rule] of Object.entries(MEDIA_RULES)) {
    const relative = field(`${role}Path`);
    if (!relative) {
      problems.push(`.dashboard/game.yml: "${role}Path" fehlt.`);
      continue;
    }
    let file;
    try {
      file = readFileSync(path.join(root, relative));
    } catch {
      problems.push(`${relative} fehlt, ist aber im Manifest eingetragen.`);
      continue;
    }
    const digest = createHash("sha256").update(file).digest("hex");
    if (digest === TEMPLATE.mediaDigests[path.basename(relative)]) {
      problems.push(`${relative} ist noch das Platzhalterbild der Vorlage.`);
    }
    if (file.length > rule.maxBytes) {
      problems.push(
        `${relative} ist ${Math.round(file.length / 1024)} KB und sprengt das Budget von`
        + ` ${Math.round(rule.maxBytes / 1024)} KB.`
      );
    }
    const size = pngSize(file);
    if (!size) continue; // Nur PNG laesst sich hier ohne Abhaengigkeit vermessen.
    if (size.width < rule.minWidth || size.height < rule.minHeight) {
      problems.push(
        `${relative} ist ${size.width}×${size.height}; mindestens ${rule.minWidth}×${rule.minHeight} sind gefordert.`
      );
    }
    if (rule.shape === "square" && size.width !== size.height) {
      problems.push(`${relative} ist nicht quadratisch (${size.width}×${size.height}).`);
    }
    if (rule.shape === "landscape" && size.width <= size.height) {
      problems.push(`${relative} ist kein Querformat (${size.width}×${size.height}).`);
    }
  }
  return problems;
});

check("Version ist deployfähig und dokumentiert", () => {
  const problems = [];
  const version = packageJson.version ?? "";
  const manifestVersion = field("version");
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    problems.push(`package.json trägt keine SemVer-Version: ${version || "(fehlt)"}.`);
  }
  if (manifestVersion !== version) {
    problems.push(`.dashboard/game.yml meldet ${manifestVersion || "(keine Version)"}, package.json meldet ${version}.`);
  }
  if (/^0\./.test(version)) {
    problems.push(`Der erste Web-Deploy trägt mindestens 1.0.0, aktuell ist es ${version}.`);
  }
  let changelog = "";
  try {
    changelog = read("CHANGELOG.md");
  } catch {
    problems.push("CHANGELOG.md fehlt.");
  }
  if (changelog && !new RegExp(`^##[ \\t]+v?${version.replace(/\./g, "\\.")}(\\b|$)`, "m").test(changelog)) {
    problems.push(`CHANGELOG.md hat keinen Abschnitt für ${version}.`);
  }
  return problems;
});

check("Client hat eine Menüstruktur", () => {
  if (/data-menu\s*=\s*["']main["']/.test(clientText) || /<nav[\s>]/.test(clientText)) return [];
  return [
    'Kein Hauptmenü gefunden. Erwartet wird ein Wurzelelement data-menu="main" oder ein <nav>-Element'
    + " mit Start/Lobby, Einladen, Anleitung, Einstellungen und Rückweg in den Hub."
  ];
});

check("Client zeigt die laufende Version", () => {
  const problems = [];
  if (!/data-app-version/.test(clientText) && !/id\s*=\s*["']app-version["']/.test(clientText)) {
    problems.push('Kein Versionselement gefunden (data-app-version oder id="app-version").');
  }
  if (!/version\.json/.test(clientText)) {
    problems.push("Der Client liest /version.json nicht und kann den laufenden Stand nicht anzeigen.");
  }
  return problems;
});

check("Manifest- und Runtimevertrag sind vollständig", () => {
  const problems = [];
  for (const expected of [
    "schemaVersion: 2",
    "apiCompatibility: games-v1",
    "type: fullstack",
    "healthPath: /healthz",
    "versionPath: /version.json",
    "websocketPath: /ws"
  ]) {
    if (!manifest.includes(expected)) problems.push(`.dashboard/game.yml: "${expected}" fehlt.`);
  }
  if (/^\s*persistentProgress:\s*true\s*$/m.test(manifest) && !/getProgress|putProgress/.test(sourceText)) {
    problems.push(
      'Das Manifest meldet "persistentProgress: true", der Servercode ruft aber weder getProgress noch putProgress.'
    );
  }
  if (/^\s*multiplayer:\s*true\s*$/m.test(manifest) && !/ws-token|WebSocket/i.test(sourceText)) {
    problems.push('Das Manifest meldet "multiplayer: true", im Code fehlt aber der WebSocket-Pfad.');
  }
  return problems;
});

check("Workflow und Freigabepfad liegen bereit", () => {
  const problems = [];
  let workflow = "";
  try {
    workflow = read(".github/workflows/dashboard-game.yml");
  } catch {
    problems.push(".github/workflows/dashboard-game.yml fehlt an seinem festen Pfad.");
  }
  if (workflow && !/^\s{2}workflow_dispatch:\s*$/m.test(workflow)) {
    problems.push("Der Workflow ist nicht ohne Pflicht-Inputs über workflow_dispatch startbar.");
  }
  if (workflow && !/dashboard-game-result/.test(workflow)) {
    problems.push("Der Workflow lädt kein Artefakt \"dashboard-game-result\" hoch.");
  }
  for (const relative of ["Dockerfile", "package-lock.json", "AGENTS.md", "GAME_PROJECT_CONTEXT.md"]) {
    try {
      if (statSync(path.join(root, relative)).size === 0) problems.push(`${relative} ist leer.`);
    } catch {
      problems.push(`${relative} fehlt.`);
    }
  }
  return problems;
});

const open = checks.filter((entry) => entry.problems.length > 0);
const width = Math.max(...checks.map((entry) => entry.title.length));

console.log("\nFreigabe-Check für den ersten Web-Deploy (AGENTS.md, Abschnitt 5)\n");
for (const entry of checks) {
  const state = entry.problems.length === 0 ? "OK   " : "FEHLT";
  console.log(`  ${state}  ${entry.title.padEnd(width)}`);
  for (const problem of entry.problems) console.log(`         → ${problem}`);
}

if (open.length === 0) {
  console.log(
    "\nAlle maschinell prüfbaren Punkte sind erfüllt."
    + "\nJetzt von Hand: Menüführung, Anleitung, Reconnect und eine volle Runde"
    + "\nmit zwei Browsern und einem eingeladenen Gast.\n"
  );
} else {
  console.log(
    `\n${open.length} von ${checks.length} Punkten offen. Details stehen in AGENTS.md, Abschnitt 5.`
    + "\nBis dahin wird das Spiel nicht im Dashboard angebunden.\n"
  );
  process.exitCode = 1;
}
