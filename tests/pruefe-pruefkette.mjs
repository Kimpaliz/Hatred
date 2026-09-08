/* [Aufgabe: Prüfwesen] Der Prüfeinstieg darf keine Prüfung verlieren.

   ── Warum es das gibt ──────────────────────────────────────────────

   Beim Trennen von Fachprüfungen und Projektwächtern wäre eine grüne
   Kette wertlos, wenn sie nur einen der beiden Ordner entdeckt. Diese
   Prüfung startet die echte Kette in einer Wegwerfkopie mit winzigen
   Prüfprozessen. Fehler müssen rot sein, spätere Prüfungen trotzdem laufen.

   ── Arbeitet zusammen mit ──────────────────────────────────────────

   werkzeuge/pruefe-alles.mjs (unverändert in die Probe kopiert),
   tests/helfer.mjs und das temporäre Systemverzeichnis. */

import {
  copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { behaupte, gleich, ende, WURZEL } from "./helfer.mjs";

const probe = mkdtempSync(join(tmpdir(), "hatred-kette-"));
const datei = (pfad, text) => writeFileSync(join(probe, pfad), text, "utf8");
const starte = (...argumente) => spawnSync(process.execPath, [
  join(probe, "werkzeuge/pruefe-alles.mjs"), ...argumente
], { cwd: tmpdir(), encoding: "utf8", timeout: 15000 });

try {
  mkdirSync(join(probe, "werkzeuge"));
  mkdirSync(join(probe, "tests/unterordner"), { recursive: true });
  copyFileSync(join(WURZEL, "werkzeuge/pruefe-alles.mjs"),
    join(probe, "werkzeuge/pruefe-alles.mjs"));
  datei("werkzeuge/pruefe-wache.mjs", 'console.log("WACHE GELAUFEN");');
  datei("werkzeuge/pruefe-arbeitsweise.mjs", 'console.log("ARBEITSWEISE GELAUFEN");');
  datei("tests/pruefe-spiel.mjs", 'console.log("SPIEL GELAUFEN");');
  datei("tests/unterordner/pruefe-weiter.mjs", 'console.log("WEITER GELAUFEN");');
  datei("tests/helfer.mjs", 'throw new Error("Helfer darf nicht gestartet werden");');

  const liste = starte("--list");
  gleich(liste.status, 0, "Dateiliste endet erfolgreich");
  behaupte(liste.stdout.includes("tests/pruefe-spiel.mjs"), "Liste enthält Fachprüfungen");
  behaupte(liste.stdout.includes("tests/unterordner/pruefe-weiter.mjs"),
    "Liste entdeckt Unterordner");
  behaupte(liste.stdout.includes("werkzeuge/pruefe-wache.mjs"), "Liste enthält Wächter");
  behaupte(!liste.stdout.includes("GELAUFEN"), "Auflisten startet keine Prüfung");
  behaupte(!liste.stdout.includes("helfer.mjs"), "Helfer wird nicht zur Prüfung");

  const alle = starte();
  gleich(alle.status, 0, "beide Bereiche laufen aus einem fremden Arbeitsordner");
  for (const name of ["WACHE", "SPIEL", "WEITER", "ARBEITSWEISE"]) {
    gleich(alle.stdout.split(`${name} GELAUFEN`).length - 1, 1,
      `${name} läuft genau einmal`);
  }
  behaupte(alle.stdout.indexOf("ARBEITSWEISE GELAUFEN")
    > alle.stdout.indexOf("WACHE GELAUFEN"), "Arbeitsweise läuft nach den Wächtern");
  behaupte(alle.stdout.indexOf("ARBEITSWEISE GELAUFEN")
    > alle.stdout.indexOf("WEITER GELAUFEN"), "Arbeitsweise läuft nach den Fachprüfungen");

  const fach = starte("--tests");
  gleich(fach.status, 0, "nur Fachprüfungen sind erfolgreich");
  behaupte(fach.stdout.includes("SPIEL GELAUFEN"), "Fachauswahl startet das Spiel");
  behaupte(!fach.stdout.includes("WACHE GELAUFEN"), "Fachauswahl startet keine Wächter");
  const waechter = starte("--checks");
  gleich(waechter.status, 0, "nur Wächter sind erfolgreich");
  behaupte(waechter.stdout.includes("WACHE GELAUFEN"), "Wächterauswahl läuft");
  behaupte(!waechter.stdout.includes("SPIEL GELAUFEN"), "Wächterauswahl startet keine Fachtests");
  const beide = starte("--tests", "--checks", "--list");
  gleich(beide.status, 0, "beide Bereichsflags zusammen sind erlaubt");
  behaupte(beide.stdout.includes("tests/pruefe-spiel.mjs")
    && beide.stdout.includes("werkzeuge/pruefe-wache.mjs"), "beide Flags wählen beide Bereiche");
  gleich(starte("--unbekannt").status, 1, "unbekannte Optionen schlagen fehl");

  datei("tests/pruefe-spiel.mjs", 'console.log("ABSICHTLICHER FEHLER"); process.exit(7);');
  const fehler = starte();
  gleich(fehler.status, 1, "eine fehlgeschlagene Prüfung macht die Kette rot");
  behaupte(fehler.stdout.includes("Rückgabewert 7"), "Fehler nennt den echten Rückgabewert");
  behaupte(fehler.stdout.includes("WEITER GELAUFEN"), "nach Fehler laufen weitere Prüfungen");
  behaupte(fehler.stdout.includes("WACHE GELAUFEN"), "nach Fehler laufen auch die Wächter");
  behaupte(fehler.stdout.includes("ARBEITSWEISE GELAUFEN"), "Arbeitsweise läuft auch nach Fehler");

  rmSync(join(probe, "tests/pruefe-spiel.mjs"));
  rmSync(join(probe, "tests/unterordner/pruefe-weiter.mjs"));
  gleich(starte("--tests").status, 1, "leerer Fachbereich ist kein Erfolg");
  gleich(starte().status, 1, "ein verschwundener Fachbereich wird nicht still übersprungen");
  gleich(starte("--checks").status, 0, "gezielte Wächter brauchen keinen gefüllten Fachbereich");
  rmSync(join(probe, "werkzeuge/pruefe-wache.mjs"));
  rmSync(join(probe, "werkzeuge/pruefe-arbeitsweise.mjs"));
  gleich(starte().status, 1, "eine vollständig leere Kette ist rot");
  gleich(starte("--checks").status, 1, "ein leerer Wächterbereich ist rot");
} finally {
  rmSync(probe, { recursive: true, force: true });
}

ende("Prüfkette und Bereichsauswahl");
