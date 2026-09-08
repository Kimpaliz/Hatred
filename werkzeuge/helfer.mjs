/* [Aufgabe: Werkzeug] Projektpfade, Konfiguration und Wächter-Meldungen.

   ── Warum es das gibt ──────────────────────────────────────────────

   Werkzeuge und Projektwächter teilen dieselbe Konfiguration. Die
   zustandsbehafteten Fachbehauptungen liegen getrennt in tests/helfer.mjs.
   So laden operative Werkzeuge kein Fachprüfgerüst.

   ── Arbeitet zusammen mit ──────────────────────────────────────────

   alpha-code.json, tests/helfer.mjs, vorgaenge.mjs und die Projektwächter
   unter werkzeuge/pruefe-*.mjs. */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/* Die Wurzel des Projekts, von `werkzeuge/` aus gesehen. */
export const WURZEL = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/* Eine Datei aus dem Projekt, Pfad relativ zur Wurzel. */
export const liesDatei = (pfad) => readFileSync(join(WURZEL, pfad), "utf8");

/* Die Alpha-Code-Einstellung des Projekts. Fehlt sie, gelten die
   Standardwerte — die Wächter sollen das Arbeiten nicht verhindern,
   bevor das Projekt eingerichtet ist. */
export function liesEinstellung() {
  const standard = {
    hauptzweig: "main",
    quellordner: ["."],
    endungen: [".js", ".mjs"],
    ausnahmen: ["node_modules", ".git", "vendor", "dist", "build", "daten"],
    /* Die Baseline-Tabelle der Großdateien. Ein nachgerüstetes Projekt
       darf sie unter seinem bestehenden Namen weiterführen. */
    altlasten: "docs/ALTLASTEN.md",
    /* Ab wann eine Datei zu groß ist. **1.000** ist der Standard
       (Ansage vom 04.09.2026). Wird die Grenze gerissen, wird die Datei
       **geteilt** — nicht geduldet und nicht angehoben; die neuen Teile
       nennen einander in ihrer Kopfnotiz (Regel 10). Projekte mit
       anderer Bauart setzen die Zahl selbst — sie gehört an **eine**
       Stelle und nicht in den Wächter einbetoniert. */
    zeilengrenze: 1000
    /* `sprache` gibt es bewusst nicht als Standard: Welche Sprache
       Bezeichner tragen und welche die Texte, ist eine Entscheidung
       des Projekts. Ohne den Block läuft `pruefe-sprache.mjs` nicht
       und sagt das auch. Aufbau siehe dort. */
  };
  const pfad = join(WURZEL, "alpha-code.json");
  if (!existsSync(pfad)) return standard;
  return { ...standard, ...JSON.parse(readFileSync(pfad, "utf8")) };
}

/* Der Melder einer Prüfung.

   `melde(gut, text, zusatz)` zählt jede Zusicherung mit. `ende()` druckt
   die Bilanz und setzt den Rückgabewert des Prozesses, den
   `pruefe-alles.mjs` auswertet. `still: true` druckt nur die Fehler —
   gezählt wird trotzdem alles. */
export function macheMelder({ still = false } = {}) {
  let gepruef = 0, fehler = 0;

  const melde = (gut, text, zusatz = "") => {
    gepruef++;
    if (!gut) fehler++;
    if (still && gut) return;
    console.log(`  ${gut ? "ok    " : "FEHLER"}  ${text}${zusatz ? "  ·  " + zusatz : ""}`);
  };

  const stand = () => ({ gepruef, fehler });

  const ende = () => {
    console.log(`\n${gepruef} Prüfungen, ${fehler} Fehler`);
    process.exit(fehler ? 1 : 0);
  };

  return { melde, stand, ende };
}

/* Alle Quelldateien des Projekts gemäß `alpha-code.json`, als Pfade
   relativ zur Wurzel (mit `/` als Trenner, auch unter Windows). Läuft
   selbst durch die Ordner statt ein Paket zu brauchen — die Wächter
   kommen ohne jede Abhängigkeit aus. */
export function quellDateien() {
  const e = liesEinstellung();
  const raus = [];
  const gesperrt = (rel, name) =>
    e.ausnahmen.some((a) => rel === a || rel.startsWith(a + "/") || name === a);
  const gehe = (rel) => {
    for (const name of readdirSync(join(WURZEL, rel))) {
      const relKind = rel === "." ? name : rel + "/" + name;
      if (gesperrt(relKind, name)) continue;
      if (statSync(join(WURZEL, relKind)).isDirectory()) gehe(relKind);
      else if (e.endungen.some((x) => name.endsWith(x))) raus.push(relKind);
    }
  };
  for (const o of e.quellordner) if (existsSync(join(WURZEL, o))) gehe(o);
  return raus;
}
