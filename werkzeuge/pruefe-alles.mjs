/* [Aufgabe: Prüfwesen] Die ganze Prüfkette: startet jede
   `werkzeuge/pruefe-*.mjs` als eigenen Prozess und fasst zusammen.

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
   · **Je ein eigener Prozess.** `werkzeuge/helfer.mjs` zählt seine
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

   Jeder Datei `werkzeuge/pruefe-*.mjs` (als eigener Prozess gestartet,
   nie eingelesen) und mittelbar `werkzeuge/helfer.mjs`, dessen `ende()`
   den Rückgabewert liefert, den diese Datei einsammelt. */

import { readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ICH = fileURLToPath(import.meta.url);
const WERKZEUGE = dirname(ICH);

/* Die Kette findet sich selbst. `pruefe-alles.mjs` fällt heraus —
   sonst startete sie sich in sich selbst, ohne Ende. */
const pruefungen = readdirSync(WERKZEUGE)
  .filter((name) => /^pruefe-.+\.mjs$/.test(name))
  .filter((name) => name !== basename(ICH))
  .sort();

const titelVon = (name) => name.replace(/^pruefe-/, "").replace(/\.mjs$/, "");
const zeitVon = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);

console.log(`\nHatred — Prüfkette, ${pruefungen.length} Prüfungen\n`);

/* Findet die Kette nichts, ist das kein Erfolg, sondern ein Fund. */
if (pruefungen.length === 0) {
  console.log("  ✗ Keine einzige Prüfung gefunden — stimmt der Ordner werkzeuge/?\n");
  process.exit(1);
}

const berichte = [];
const beginn = Date.now();

for (const name of pruefungen) {
  console.log(`  ┌ ${titelVon(name)}`);
  const start = Date.now();
  const lauf = spawnSync(process.execPath, [join(WERKZEUGE, name)], {
    stdio: "inherit",
    cwd: dirname(WERKZEUGE)
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
