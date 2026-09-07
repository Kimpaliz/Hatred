/* [Aufgabe: Prüfwesen] Baut die Einzeldatei und beweist, dass sie
   überhaupt **läuft** — nicht bloß, dass sie entstanden ist.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Am 06.09.2026 meldete `werkzeuge/eine-datei.mjs` „✓ 43 Module →
   780,8 kB", und die Datei war tot. In `runtime/oberflaeche.js` stand
   seit der Aufteilung der Leiste eine Weiterausfuhr:

       export { TASTEN, … } from "./oberflaeche-leiste.js";

   Kein Muster des Bündlers kannte diese Form, also blieb die Zeile
   wörtlich stehen — und ein `export` innerhalb einer Funktion ist ein
   Syntaxfehler. Der Browser meldete „Unexpected token 'export'", das
   Skript lief keine einzige Zeile, das Bild blieb schwarz. Die ganze
   Kette war dabei **grün**: 36 Prüfungen, keine davon hat die gebaute
   Datei je angefasst.

   Genau das ist der Fall, der ohne diese Prüfung falsch wäre. Die
   Größenmeldung des Bündlers ist keine Aussage über Lauffähigkeit —
   eine kaputte Datei ist genauso groß wie eine heile.

   Geprüft wird deshalb in dieser Reihenfolge:

   · **Ist es gültiges JavaScript?** Der Beweis läuft über
     `node --check` auf einer Datei mit der Endung `.mjs` — also als
     Modul zerteilt, so wie der Browser das Bündel lädt, und ohne es
     auszuführen. Das ist die Behauptung, die am 06.09. rot gewesen
     wäre, und die einzige, die **jede** unbekannte Modulform
     erwischt statt nur der einen bekannten.
   · **Ist ein Modulwort übrig?** Eine zweite, gröbere Behauptung. Sie
     ist streng genommen von der ersten mitgeprüft; sie steht daneben,
     weil ihre Fehlermeldung die Stelle nennt und „SyntaxError" nicht.
   · **Wird die Weiterausfuhr wirklich aufgelöst?** `TASTEN` muss im
     Bündel aus `oberflaeche-leiste.js` geholt und weitergereicht
     werden. Ohne diese Behauptung bliebe unbewiesen, ob die Form
     *verstanden* oder bloß *gestrichen* wurde — gestrichen wäre auch
     syntaktisch sauber und trotzdem falsch.
   · **Wird der Bündler laut, wenn er etwas nicht kennt?** Sein Muster
     für den übrigen Rest wird geholt und gegen beide Seiten gehalten:
     vier Formen, die es fangen muss (`export default`, `export *`,
     ein Standardimport, eine Weiterausfuhr), und fünf, die es in Ruhe
     lassen muss. Ein Muster, das immer anschlägt, wäre so wertlos wie
     keins — und ohne diese Behauptung wäre die laute Stelle in
     `eine-datei.mjs` bloß Zierde.

   ── Was hier bewusst nicht geprüft wird ────────────────────────────

   Ob das Spiel in einem **echten** Browser startet. Das braucht
   Chromium, und die Kette hat keine Abhängigkeiten (Regel 12). Der
   Nachweis wurde von Hand geführt und steht im Changelog vom
   06.09.2026 mit den Maßen; hier steht der Teil, der bei jeder
   Änderung mitläuft.

   ── Arbeitet zusammen mit ──────────────────────────────────────────

   `werkzeuge/eine-datei.mjs` (der Bündler, der hier läuft),
   `runtime/oberflaeche.js` (die Datei mit der Weiterausfuhr),
   `werkzeuge/helfer.mjs`, `werkzeuge/pruefe-alles.mjs`. */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Script } from "node:vm";
import { behaupte, gleich, abschnitt, ende, WURZEL } from "./helfer.mjs";

const ORDNER = mkdtempSync(join(tmpdir(), "hatred-einzeldatei-"));
const ZIEL = join(ORDNER, "gebaut.html");

/* ── Bauen ────────────────────────────────────────────────────────── */

abschnitt("bauen");

let meldung = "";
let gebaut = "";
try {
  meldung = execFileSync(process.execPath,
    [join(WURZEL, "werkzeuge", "eine-datei.mjs"), "--nach", ZIEL],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  gebaut = readFileSync(ZIEL, "utf8");
} catch (fehler) {
  behaupte(false, `der Bündler läuft durch: ${String(fehler.stderr || fehler.message).trim()}`);
  ende("Einzeldatei");
}

behaupte(gebaut.length > 100_000, `die gebaute Datei ist nicht leer: ${gebaut.length} Zeichen`);
behaupte(/\d+ Module/.test(meldung), `der Bündler meldet eine Modulzahl: ${meldung.trim()}`);

/* ── Das Skript herausschneiden ───────────────────────────────────── */

/* Das Bündel ist eine HTML-Seite mit genau einem `<script>`. Was
   dazwischen steht, ist das, was der Browser zerteilen muss. */
const stueck = gebaut.match(/<script\b[^>]*>([\s\S]*?)<\/script>/);
behaupte(stueck !== null, "die gebaute Seite enthält ein <script>");
const skript = stueck ? stueck[1] : "";

/* ── Die eine Behauptung, die am 06.09. rot gewesen wäre ──────────── */

abschnitt("lauffähig");

/* Zerteilt wird mit `node --check` und der Endung `.mjs` — also als
   **Modul**, denn genau so lädt der Browser das Bündel
   (`<script type="module">`). Der bequemere Weg über `new Script()`
   wäre falsch: Er zerteilt als klassisches Skript und fiele schon
   über das `import.meta.url`, mit dem `runtime/start.js` den
   Zwischenspeicher anmeldet — eine Meldung über einen Fehler, den es
   im Browser nicht gibt, ist schlimmer als keine. */
const ZERTEILT = join(ORDNER, "gebaut.mjs");
writeFileSync(ZERTEILT, skript);
let syntaxFehler = null;
try {
  execFileSync(process.execPath, ["--check", ZERTEILT],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (fehler) {
  syntaxFehler = String(fehler.stderr || fehler.message).split("\n")
    .find((z) => /Error|error/.test(z)) || "zerteilt nicht";
}
behaupte(syntaxFehler === null,
  `das gebündelte Skript ist gültiges JavaScript${syntaxFehler ? `: ${syntaxFehler.trim()}` : ""}`);

/* Zweite, gröbere Behauptung — sie nennt die Stelle. */
const uebrig = [];
skript.split("\n").forEach((zeile, i) => {
  if (!/^[ \t]*(import|export)\b/.test(zeile)) return;
  uebrig.push(`Zeile ${i + 1}: ${zeile.trim().slice(0, 60)}`);
});
gleich(uebrig.length, 0, `kein Modulwort bleibt stehen${uebrig.length ? ` — ${uebrig[0]}` : ""}`);

/* ── Die Weiterausfuhr ist aufgelöst, nicht gestrichen ────────────── */

abschnitt("weiterausfuhr");

const quelle = readFileSync(join(WURZEL, "runtime", "oberflaeche.js"), "utf8");
const weiter = quelle.match(/^\s*export\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/m);
behaupte(weiter !== null,
  "runtime/oberflaeche.js hat noch die Weiterausfuhr, die diese Prüfung deckt");

if (weiter) {
  const namen = weiter[1].split(",")
    .map((s) => s.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean);
  behaupte(namen.length > 0, `die Weiterausfuhr nennt Namen: ${namen.join(", ")}`);
  /* Der Wert muss aus dem anderen Modul kommen … */
  behaupte(skript.includes('__teile["runtime/oberflaeche-leiste.js"]'),
    "der Wert wird aus runtime/oberflaeche-leiste.js geholt");
  /* … und `oberflaeche.js` muss ihn weiterreichen: Sein Rückgabeblock
     führt den Namen. Gestrichen wäre er dort nicht zu finden. */
  const block = skript.split('__teile["runtime/oberflaeche.js"]')[1] || "";
  for (const name of namen) {
    behaupte(new RegExp(`^\\s{4}${name},?\\s*$`, "m").test(block),
      `runtime/oberflaeche.js reicht ${name} weiter`);
  }
}

/* ── Und der Bündler wird laut, wenn er etwas nicht kennt ─────────── */

abschnitt("laut werden");

/* `eine-datei.mjs` liest immer `index.html` als Einstieg — ein
   erfundenes Modul ließe sich also nur einschleusen, indem diese
   Prüfung im Projekt herumschreibt. Das tut sie nicht. Stattdessen
   wird das Muster selbst geholt und gegen beide Seiten gehalten: die
   Formen, die es fangen **muss**, und die, die es in Ruhe lassen muss.
   Ein Muster, das immer anschlägt, wäre so wertlos wie keins. */
const buendler = readFileSync(join(WURZEL, "werkzeuge", "eine-datei.mjs"), "utf8");
const musterZeile = buendler.match(/^const UEBRIG = (.+);$/m);
behaupte(musterZeile !== null, "eine-datei.mjs hat ein Muster für den übrigen Rest (UEBRIG)");
if (musterZeile) {
  const muster = new Script(`(${musterZeile[1]})`).runInNewContext();
  const faengt = [
    'export default function nix() {}',
    'export * from "./x.js";',
    '  import x from "./y.js";',
    'export { a } from "./z.js";'
  ];
  for (const zeile of faengt) {
    muster.lastIndex = 0;
    behaupte(muster.test(zeile), `erkennt als unverstanden: ${zeile.trim()}`);
  }
  const laesstInRuhe = [
    "const a = 1;",
    "    return { a };",
    "  /* die Ausfuhr heisst c */",
    "const exportiert = 3;",
    "  importiere(x);"
  ];
  for (const zeile of laesstInRuhe) {
    muster.lastIndex = 0;
    behaupte(!muster.test(zeile), `schlägt nicht an bei: ${zeile.trim()}`);
  }
}
behaupte(buendler.includes("Modulzeile(n) nicht verstanden"),
  "eine-datei.mjs wirft mit einer Meldung, die Datei und Zeile nennt");

rmSync(ORDNER, { recursive: true, force: true });
ende("Einzeldatei");
