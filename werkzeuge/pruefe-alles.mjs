/* [Aufgabe: Prüfwesen] Die ganze Prüfkette: startet jede
   Fachprüfungen und Projektwächter als eigene Prozesse.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Ein Befehl, der alles prüft, ist die Bedingung dafür, dass überhaupt
   geprüft wird. Steht in der Anleitung „führe die neun Prüfungen aus",
   führt nach zwei Wochen jeder sieben davon aus — und immer eine
   andere.

   Drei Entscheidungen stecken darin:

   · **Gefunden statt aufgezählt.** Die Liste der Prüfungen entsteht bei
     jedem Lauf neu aus dem Ordner. Eine geschriebene Liste veraltet
     lautlos: Wer eine neue Prüfung baut und den Eintrag vergisst,
     bekommt eine Kette, die grün meldet, ohne seine Prüfung je zu
     starten — der schlimmste denkbare Fehler an dieser Stelle.
   · **Je ein eigener Prozess.** `tests/helfer.mjs` zählt seine
     Behauptungen in Modulvariablen und beendet den Prozess in `ende()`.
     Zwei Prüfungen im selben Prozess mischten ihre Zähler, und die
     erste `ende()` beendete die zweite gleich mit. Ein eigener Prozess
     je Prüfung kostet ein paar Zehntelsekunden und schenkt dafür
     völlige Trennung: Selbst eine Prüfung, die abstürzt oder eine
     Endlosschleife dreht, reißt die anderen nicht mit.
   · **Alle laufen, auch nach dem ersten Rot.** Wer beim ersten Fehler
     abbricht, sieht nach jeder Runde genau einen — und braucht fünf
     Läufe für fünf Fehler. Der Rückgabewert ist trotzdem 1, sobald
     **eine** rot ist.

   Geprüft wird hier der Fall, der ohne diese Arbeit falsch wäre: Eine
   Kette, die nichts findet, meldet nicht „alles grün", sondern schlägt
   an — sonst wäre ein vertippter Ordnername der bequemste Weg, die
   ganze Prüfung abzuschalten. Ebenso zählt ein Prozess, der an einem
   Signal stirbt oder gar nicht startet, als rot und nicht als
   „unbekannt".

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   tests/pruefe-*.mjs, werkzeuge/pruefe-*.mjs und deren Unterordner.
   tests/pruefe-pruefkette.mjs prüft Entdeckung, Auswahl und Fehlerfälle.
   Die Arbeitsweiseprüfung läuft zuletzt, wenn alle anderen beendet sind. */

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ICH = fileURLToPath(import.meta.url);
const WURZEL = dirname(dirname(ICH));
const argumente = process.argv.slice(2);
const erlaubt = new Set(["--tests", "--checks", "--list", "--help"]);
const unbekannt = argumente.filter((a) => !erlaubt.has(a));
if (unbekannt.length) {
  console.error(`Unbekannte Option: ${unbekannt.join(", ")}. Siehe --help.`);
  process.exit(1);
}
if (argumente.includes("--help")) {
  console.log("node werkzeuge/pruefe-alles.mjs [--tests] [--checks] [--list]");
  console.log("Ohne Bereichsflag: alle Prüfungen. --list listet nur Dateipfade auf.");
  process.exit(0);
}

const eingeschraenkt = argumente.includes("--tests") || argumente.includes("--checks");
const ordner = [];
if (!eingeschraenkt || argumente.includes("--tests")) ordner.push("tests");
if (!eingeschraenkt || argumente.includes("--checks")) ordner.push("werkzeuge");
function sammle(rel) {
  const dateien = [];
  for (const eintrag of readdirSync(join(WURZEL, rel), { withFileTypes: true })) {
    const pfad = `${rel}/${eintrag.name}`;
    if (eintrag.isDirectory()) dateien.push(...sammle(pfad));
    else if (eintrag.isFile() && /^pruefe-.+\.mjs$/.test(eintrag.name)
      && pfad !== "werkzeuge/pruefe-alles.mjs") dateien.push(pfad);
  }
  return dateien;
}
let pruefungen;
try {
  pruefungen = ordner.flatMap((rel) => {
    const gefunden = sammle(rel);
    if (!gefunden.length) throw new Error(`Keine einzige Prüfung in ${rel}/ gefunden.`);
    return gefunden;
  }).sort();
} catch (fehler) {
  console.error(`Prüfkette abgebrochen: ${fehler.message}`);
  process.exit(1);
}
const arbeitsweise = "werkzeuge/pruefe-arbeitsweise.mjs";
if (pruefungen.includes(arbeitsweise)) {
  pruefungen = [...pruefungen.filter((p) => p !== arbeitsweise), arbeitsweise];
}
if (argumente.includes("--list")) {
  console.log(pruefungen.join("\n"));
  process.exit(0);
}

const titelVon = (name) => name.replace(/pruefe-/, "").replace(/\.mjs$/, "");
const zeitVon = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);

console.log(`\nHatred — Prüfkette, ${pruefungen.length} Prüfungen\n`);

const berichte = [];
const beginn = Date.now();

for (const name of pruefungen) {
  console.log(`  ┌ ${titelVon(name)}`);
  const start = Date.now();
  const lauf = spawnSync(process.execPath, [join(WURZEL, name)], {
    stdio: "inherit",
    cwd: WURZEL,
    timeout: 120000,
    killSignal: "SIGKILL"
  });
  const dauer = Date.now() - start;

  /* Drei Arten zu scheitern, und alle drei zählen gleich: ein
     Rückgabewert über 0, ein Tod am Signal (dann ist `status` null),
     und ein Prozess, der gar nicht erst startete (`error`). */
  let grund = null;
  if (lauf.error) grund = `konnte nicht starten (${lauf.error.message})`;
  else if (lauf.signal) grund = `am Signal ${lauf.signal} gestorben`;
  else if (lauf.status !== 0) grund = `Rückgabewert ${lauf.status}`;

  berichte.push({ name, titel: titelVon(name), dauer, grund });
  if (grund) console.log(`  └ ✗ ${titelVon(name)}: ${grund}`);
}

const rot = berichte.filter((b) => b.grund !== null);
const gesamt = Date.now() - beginn;

console.log("\n  ── Übersicht ──────────────────────────────────────────────");
const breite = Math.max(...berichte.map((b) => b.titel.length));
for (const b of berichte) {
  const zeichen = b.grund === null ? "✓" : "✗";
  const schluss = b.grund === null ? "" : `   ${b.grund}`;
  console.log(`  ${zeichen} ${b.titel.padEnd(breite)}  ${zeitVon(b.dauer).padStart(7)}${schluss}`);
}

console.log("");
if (rot.length === 0) {
  console.log(`  ✓ Alle ${berichte.length} Prüfungen grün — ${zeitVon(gesamt)}.\n`);
  process.exit(0);
}
console.log(`  ✗ ${rot.length} von ${berichte.length} Prüfungen rot: ` +
  `${rot.map((b) => b.titel).join(", ")} — ${zeitVon(gesamt)}.\n`);
process.exit(1);
