/* [Aufgabe: Werkzeug] Das ganze Spiel in **einer** HTML-Datei.

       node werkzeuge/eine-datei.mjs [--nach <pfad>]

   ── Wozu, wenn der Ordner doch schon läuft ─────────────────────────

   Zum **Weitergeben**. Eine einzelne Datei lässt sich verschicken, auf
   einen Stick legen und öffnen, ohne dass jemand Node startet — und sie
   lässt sich an eine Adresse stellen, die Jannik seinen Freunden
   schickt, ohne dass er dafür etwas einrichten muss.

   ⚠️ **Sie ist nicht die Wahrheit.** Die Wahrheit ist der Ordner. Diese
   Datei wird aus ihm erzeugt und darf nie von Hand geändert werden —
   sonst gibt es zwei Fassungen, und die eine hat einen Fehler, den die
   andere nicht hat. Genau deshalb ist der Ausgabepfad standardmäßig
   **außerhalb** des Projekts.

   ── Wie es geht, und warum ausgerechnet so ─────────────────────────

   Alle Module werden in Abhängigkeitsreihenfolge hintereinandergehängt
   und die `import`-Zeilen entfernt. Das geht, weil in **einem**
   Modulblock jede oberste Deklaration für alle sichtbar ist — ein
   Import wäre also nur die Wiederholung von etwas, das ohnehin schon da
   ist.

   Die eine Bedingung dafür ist, dass kein Name zweimal ganz oben steht.
   Das prüft dieses Werkzeug und **bricht ab**, wenn es passiert, statt
   eine Datei auszuliefern, in der die spätere Deklaration die frühere
   still überschreibt. Ein Bündler, der einen Namenszusammenstoß
   verschweigt, ist schlimmer als gar keiner.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `index.html` (der Einstieg, dessen Modulverweis gesucht wird) und
   allem unter `spiel/`, `netz/`, `runtime/`. Ändert nichts. */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/* ── Die Zerlegung einer Moduldatei ─────────────────────────────────
   Absichtlich mit Mustern statt mit einem echten Zerteiler: Das
   Projekt schreibt seine Module in einer engen Form (`export const`,
   `export function`, `import { … } from "…"`), und alles, was davon
   abweicht, soll hier **auffallen** statt geräuschlos durchzurutschen. */

const EINFUHR = /^\s*import\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["'];?\s*$/gm;
const AUSFUHR_DECK = /^(\s*)export\s+(const|let|var|function\*?|async\s+function\*?|class)\s/gm;
const AUSFUHR_LISTE = /^\s*export\s*\{[^}]*\}\s*;?\s*$/gm;

function lies(pfad) {
  return readFileSync(pfad, "utf8");
}

function abhaengigkeiten(quelle, vonPfad) {
  const raus = [];
  for (const treffer of quelle.matchAll(EINFUHR)) {
    const ziel = treffer[1];
    if (!ziel.startsWith(".")) {
      throw new Error(`${relative(WURZEL, vonPfad)}: fremder Import "${ziel}" — ` +
        "dieses Projekt hat keine Abhängigkeiten.");
    }
    raus.push(resolve(dirname(vonPfad), ziel));
  }
  return raus;
}

/* Tiefensuche mit Zyklusmeldung. Ein Zyklus zwischen zwei Modulen ist
   im Browser erlaubt und hier nicht — die Reihenfolge wäre dann nicht
   mehr eindeutig, und `const` aus dem zweiten Modul wäre im ersten
   noch nicht belegt. */
function reihenfolge(start) {
  const fertig = [];
  const zustand = new Map(); /* pfad → "laeuft" | "fertig" */

  function besuche(pfad, weg) {
    const z = zustand.get(pfad);
    if (z === "fertig") return;
    if (z === "laeuft") {
      const kreis = [...weg, pfad].map((p) => relative(WURZEL, p)).join(" → ");
      throw new Error(`Ringschluss zwischen Modulen: ${kreis}`);
    }
    zustand.set(pfad, "laeuft");
    const quelle = lies(pfad);
    for (const naechstes of abhaengigkeiten(quelle, pfad)) {
      besuche(naechstes, [...weg, pfad]);
    }
    zustand.set(pfad, "fertig");
    fertig.push({ pfad, quelle });
  }

  besuche(start, []);
  return fertig;
}

/* Alle Namen, die eine Datei ganz oben deklariert. Nur oberste Ebene:
   Das Muster verlangt, dass die Zeile ohne Einrückung beginnt. */
const OBERSTE = /^(?:export\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm;
const OBERSTE_ASYNC = /^(?:export\s+)?async\s+function\*?\s+([A-Za-z_$][\w$]*)/gm;

function obersteNamen(quelle) {
  const namen = new Set();
  for (const t of quelle.matchAll(OBERSTE)) namen.add(t[1]);
  for (const t of quelle.matchAll(OBERSTE_ASYNC)) namen.add(t[1]);
  return namen;
}

function entkleide(quelle) {
  return quelle
    .replace(EINFUHR, "")
    .replace(AUSFUHR_LISTE, "")
    .replace(AUSFUHR_DECK, "$1$2 ");
}

/* ── Der Lauf ───────────────────────────────────────────────────── */

const zielArg = process.argv.indexOf("--nach");
const ZIEL = zielArg > -1 && process.argv[zielArg + 1]
  ? process.argv[zielArg + 1]
  : join(WURZEL, "..", "hatred-eine-datei.html");

const seite = lies(join(WURZEL, "index.html"));
const einstieg = seite.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/);
if (!einstieg) {
  console.error("index.html hat kein <script type=\"module\" src=\"…\">.");
  process.exit(1);
}

let module_;
try {
  module_ = reihenfolge(resolve(WURZEL, einstieg[1]));
} catch (fehler) {
  console.error(`Abbruch: ${fehler.message}`);
  process.exit(1);
}

/* Namenszusammenstöße finden, BEVOR etwas geschrieben wird. */
const woher = new Map();
const stoesse = [];
for (const m of module_) {
  for (const name of obersteNamen(m.quelle)) {
    const alt = woher.get(name);
    if (alt) stoesse.push(`${name}: ${relative(WURZEL, alt)} und ${relative(WURZEL, m.pfad)}`);
    else woher.set(name, m.pfad);
  }
}
if (stoesse.length) {
  console.error("Abbruch — dieselben Namen ganz oben in zwei Dateien:");
  for (const s of stoesse) console.error(`  · ${s}`);
  console.error("\nIn einer einzigen Datei überschriebe die spätere die frühere.");
  console.error("Benenne eine der beiden um; der Ordner läuft dann weiter wie bisher.");
  process.exit(1);
}

const teile = module_.map((m) =>
  `/* ── ${relative(WURZEL, m.pfad)} ${"─".repeat(Math.max(0, 60 - m.pfad.length))} */\n` +
  entkleide(m.quelle));

const kopf = seite.split(/<script[^>]*type=["']module["'][^>]*>\s*<\/script>/)[0]
  .replace(/<script[^>]*type=["']module["'][^>]*src=["'][^"']+["']\s*>[\s\S]*?<\/script>/g, "");

const ausgabe = kopf.replace(/<\/body>/i,
  `<script type="module">\n${teile.join("\n\n")}\n</script>\n</body>`);

writeFileSync(ZIEL, ausgabe, "utf8");
const kb = (Buffer.byteLength(ausgabe, "utf8") / 1024).toFixed(1);
console.log(`  ✓ ${module_.length} Module → ${ZIEL} (${kb} kB)`);
