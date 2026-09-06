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

   Jedes Modul bekommt **seinen eigenen Namensraum**: Es wird in eine
   Funktion gewickelt, die ihre Ausfuhren zurückgibt, und in einer
   Merkliste abgelegt. Aus jeder `import`-Zeile wird ein Griff in diese
   Liste.

   Der erste Anlauf hängte alle Module einfach hintereinander und strich
   die Importe — das geht, weil in einem Modulblock jede oberste
   Deklaration für alle sichtbar ist. Es ging genau so lange gut, bis
   das Projekt groß wurde: **27 Namen** standen am 06.09.2026 in zwei
   Dateien zugleich (`hash`, `fbm`, `ZEICHEN`, `P`, `TRENNER`, …), und
   fast alle davon sind *private* Namen, die niemanden stören — außer
   einen Bündler, der alles in einen Topf wirft.

   Sie umzubenennen wäre die falsche Antwort gewesen: Der Ordner ist in
   Ordnung, das Werkzeug war es nicht. Ein Modul, das `P` heißen will,
   darf `P` heißen.

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

/* Nur zum Finden der Abhängigkeiten — das Umschreiben macht `wickle`
   weiter unten mit eigenen, genaueren Mustern. */
const EINFUHR = /^\s*import\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["'];?\s*$/gm;

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

/* ── Ein Modul in seinen eigenen Namensraum wickeln ────────────────

   Aus `import { a, b } from "./x.mjs";` wird `const { a, b } =
   __teile["x.mjs"];`, aus `export function f` wird `function f` plus
   ein Eintrag in der Ausfuhrliste. Mehr braucht es nicht — die
   Reihenfolge stellt schon die Tiefensuche sicher, also steht jedes
   Modul bereit, bevor das erste es anfasst. */

const EINFUHR_MIT_NAMEN =
  /^\s*import\s+(\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+["']([^"']+)["'];?\s*$/gm;
const EINFUHR_BLANK = /^\s*import\s+["'][^"']+["'];?\s*$/gm;
const AUSFUHR_DECK = /^(\s*)export\s+(const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm;
const AUSFUHR_ASYNC = /^(\s*)export\s+(async\s+function\*?)\s+([A-Za-z_$][\w$]*)/gm;
const AUSFUHR_LISTE = /^\s*export\s*\{([^}]*)\}\s*;?\s*$/gm;

function wickle(quelle, pfad) {
  const ausfuhren = new Set();
  let text = quelle;

  text = text.replace(EINFUHR_BLANK, "");
  text = text.replace(EINFUHR_MIT_NAMEN, (_, was, ziel) => {
    const schluessel = relative(WURZEL, resolve(dirname(pfad), ziel)).split("\\").join("/");
    if (was.startsWith("*")) {
      return `const ${was.split(/\s+/).pop()} = __teile[${JSON.stringify(schluessel)}];`;
    }
    if (was.startsWith("{")) {
      /* `import { a as b }` wird zu `const { a: b }` — beim Zerlegen
         heißt die Umbenennung `:` und nicht `as`. Ohne diese Zeile
         schreibt der Bündler ungültiges JavaScript, und der Browser
         meldet nur „Unexpected identifier 'as'" ohne zu sagen, wo. */
      return `const ${was.replace(/\s+as\s+/g, ": ")} = __teile[${JSON.stringify(schluessel)}];`;
    }
    /* Standardausfuhr — dieses Projekt benutzt sie nicht, aber ein
       stiller Fehlgriff wäre schlimmer als eine Meldung. */
    throw new Error(`${relative(WURZEL, pfad)}: Standardimport wird nicht unterstützt`);
  });

  text = text.replace(AUSFUHR_ASYNC, (_, ein, art, name) => {
    ausfuhren.add(name); return `${ein}${art} ${name}`;
  });
  text = text.replace(AUSFUHR_DECK, (_, ein, art, name) => {
    ausfuhren.add(name); return `${ein}${art} ${name}`;
  });
  /* `export { a, b as c };` — die Ausfuhr heißt `c`, der Wert steckt in
     `a`. Deshalb wird sie als Paar gemerkt und unten als `c: a`
     zurückgegeben. */
  const umbenannt = [];
  text = text.replace(AUSFUHR_LISTE, (_, liste) => {
    for (const teil of liste.split(",")) {
      const stueck = teil.trim();
      if (!stueck) continue;
      const [quelle, ziel] = stueck.split(/\s+as\s+/).map((x) => x.trim());
      if (ziel) umbenannt.push([ziel, quelle]);
      else ausfuhren.add(quelle);
    }
    return "";
  });

  const rueck = [...[...ausfuhren].map((n) => `    ${n}`),
    ...umbenannt.map(([ziel, quelle]) => `    ${ziel}: ${quelle}`)].join(",\n");
  return `__teile[${JSON.stringify(relative(WURZEL, pfad).split("\\").join("/"))}] = (() => {\n`
    + text.trimEnd() + `\n  return {\n${rueck}\n  };\n})();`;
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

const teile = module_.map((m) =>
  `/* ── ${relative(WURZEL, m.pfad)} ${"─".repeat(Math.max(0, 56 - m.pfad.length))} */\n`
  + wickle(m.quelle, m.pfad));

const kopf = seite
  .replace(/<script[^>]*type=["']module["'][^>]*src=["'][^"']+["']\s*>[\s\S]*?<\/script>/g, "");

const rumpf = "const __teile = {};\n\n" + teile.join("\n\n");
const ausgabe = kopf.replace(/<\/body>/i, `<script type="module">\n${rumpf}\n</script>\n</body>`);

writeFileSync(ZIEL, ausgabe, "utf8");
const kb = (Buffer.byteLength(ausgabe, "utf8") / 1024).toFixed(1);
console.log(`  ✓ ${module_.length} Module → ${ZIEL} (${kb} kB)`);
