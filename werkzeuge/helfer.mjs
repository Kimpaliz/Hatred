/* [Aufgabe: Prüfwesen] Das kleinste Prüfgerüst, das diese Kette braucht.

   ── Warum kein fertiges Prüfwerkzeug ────────────────────────────────

   Ein Testläufer aus dem Paketverzeichnis brächte hundert Dateien mit,
   die niemand liest, und eine Version, die veraltet. Was hier gebraucht
   wird, sind vier Dinge: eine Behauptung, ein Name, ein Zähler und ein
   Rückgabewert für die Schale. Das sind sechzig Zeilen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   Jeder Datei `werkzeuge/pruefe-*.mjs` und `werkzeuge/pruefe-alles.mjs`,
   das die Einzelprüfungen als eigene Prozesse startet. */

let bestanden = 0;
let gefallen = 0;
const fehler = [];
let bereich = "";

export function abschnitt(name) { bereich = name; }

/* Eine einzelne Behauptung. `bedingung` muss wahr sein. */
export function behaupte(bedingung, was) {
  if (bedingung) { bestanden++; return true; }
  gefallen++;
  fehler.push(`${bereich ? bereich + " → " : ""}${was}`);
  return false;
}

export function gleich(ist, soll, was) {
  const ok = Object.is(ist, soll);
  return behaupte(ok, `${was}: ist ${anzeige(ist)}, soll ${anzeige(soll)}`);
}

export function nahe(ist, soll, spanne, was) {
  const ok = Math.abs(ist - soll) <= spanne;
  return behaupte(ok, `${was}: ist ${anzeige(ist)}, soll ${anzeige(soll)} ± ${spanne}`);
}

export function tiefGleich(ist, soll, was) {
  const a = JSON.stringify(ist), b = JSON.stringify(soll);
  return behaupte(a === b, `${was}:\n    ist  ${a}\n    soll ${b}`);
}

/* Erwartet, dass `fn` wirft. Ohne diese Prüfung würde eine Schutzwand,
   die aus Versehen entfernt wurde, niemandem auffallen. */
export function wirft(fn, was) {
  try { fn(); } catch { return behaupte(true, was); }
  return behaupte(false, `${was}: hat nicht geworfen`);
}

function anzeige(w) {
  if (typeof w === "number" && !Number.isInteger(w)) return w.toFixed(4);
  if (typeof w === "string") return `"${w}"`;
  return String(w);
}

/* Am Ende jeder Prüfdatei. Beendet den Prozess mit 0 oder 1 — nur so
   sieht `pruefe-alles.mjs` den Unterschied. */
export function ende(titel) {
  const strich = "─".repeat(Math.max(0, 58 - titel.length));
  if (gefallen === 0) {
    console.log(`  ✓ ${titel} ${strich} ${bestanden} Behauptungen`);
    process.exit(0);
  }
  console.log(`  ✗ ${titel} ${strich} ${gefallen} von ${bestanden + gefallen} gefallen`);
  for (const f of fehler) console.log(`      · ${f}`);
  process.exit(1);
}


/* ══════════════════════════════════════════════════════════════════
   Ab hier: das Alpha-Code-Gerüst, wörtlich aus dem Skill `alpha-code`
   (florianfinn/claude-skills, `plugins/alpha-code/skills/alpha-code/
   werkzeuge/helfer.mjs`).

   ── Warum beides in einer Datei ────────────────────────────────────

   Es sind zwei verschiedene Melder, und beide werden gebraucht. Oben
   `behaupte`/`gleich` für die **Fachprüfungen** dieses Spiels — sie
   behaupten über Zahlen und wollen `ist/soll` im Fehlertext. Hier
   unten `macheMelder` für die **Wächter der Arbeitsweise**, die aus
   dem Skill kommen und unverändert bleiben sollen, damit eine
   Verbesserung am Skill hier ankommt.

   Zwei Dateien wären sauberer getrennt, aber jeder Wächter müsste dann
   wissen, welche er nimmt — und der Skill schreibt `./helfer.mjs`.
   Die Namen stoßen nicht zusammen: oben `ende` als Funktion, unten
   `ende` nur *innerhalb* des von `macheMelder` gelieferten Objekts.
   ══════════════════════════════════════════════════════════════════ */

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
