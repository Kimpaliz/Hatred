/* [Aufgabe: Werkzeug] Rechnet den Fingerabdruck eines Zugangsworts aus
   und druckt die eine Zeile, die dafür in `runtime/torwaechter.js`
   ausgetauscht wird.

       node werkzeuge/zugangswort.mjs <neues wort>
       node werkzeuge/zugangswort.mjs --suche

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Jannik soll das Wort wechseln können, wenn es einmal zu weit
   herumgereicht wurde — ohne dass jemand für ihn rechnet und ohne dass
   er versteht, was ein Hash ist. Also nimmt dieses Werkzeug das neue
   Wort, druckt die fertige Zeile und sagt in einem Satz auf Deutsch,
   was damit geschieht.

   **Es rechnet nicht selbst.** Die Hashfunktion wird aus
   `runtime/torwaechter.js` geholt. Ein Nachbau hier wäre eine zweite
   Wahrheit über dieselbe Sache: Sie liefe Jahre lang gleich und
   irgendwann nicht mehr — und dann druckte dieses Werkzeug eine Zeile,
   mit der niemand mehr hereinkäme, ohne dass irgendetwas anschlüge.

   ── Warum es nicht `pruefe-` heißt ─────────────────────────────────

   `werkzeuge/pruefe-alles.mjs` startet **jede** Datei dieses Musters
   als eigene Prüfung. Ein Werkzeug, das nichts behauptet, wäre dort
   für immer grün und sähe aus wie eine Prüfung, die etwas prüft.

   ── Warum es ein Wort ablehnt, das schon im Baum steht ─────────────

   Am 07.09.2026 ist dieses Werkzeug beim ersten Anlauf mit einem Wort
   gefüttert worden, das **dreizehnmal** im Repository stand — es war,
   ohne dass es jemandem aufgefallen wäre, der Name einer Figur aus dem
   eigenen Katalog. Ein solches Wort ist kein Zugangswort: Es steht im
   ausgelieferten Code, und ein Wörterbuchangriff über die
   elftausendfünfhundert Wörter des Baums findet es in fünfeinhalb
   Minuten (gemessen mit `--suche`).

   Genau diese Stelle ist der einzige Ort im ganzen Projekt, an dem das
   Wort **im Klartext** vorliegt. Also wird hier gesucht, und zwar
   wörtlich statt über Fingerabdrücke: Das kostet Millisekunden statt
   Minuten und ist dabei genauer. Wer ein Wort nimmt, das schon
   dasteht, bekommt keine Zeile zum Austauschen, sondern eine Absage
   mit der Fundstelle.

   ── Warum `--suche` trotzdem mit dazugehört ────────────────────────

   Das Wort selbst darf in keiner Datei dieses Projekts stehen —
   `werkzeuge/pruefe-torwaechter.mjs` wacht bei jedem Lauf über die
   Dateien, in denen vom Tor die Rede ist. Der **ganze** Baum ist eine
   andere Größenordnung: Ein Versuch kostet 20,3 ms, und der Baum hat
   über elftausend verschiedene Wörter — das sind knapp vier Minuten.
   Genau deshalb steht die vollständige Suche hier und nicht in der
   Kette: Sie ist ein Wörterbuchangriff auf das eigene Tor, und dass er
   Minuten braucht statt Sekunden, ist der Beweis, dass die 200.000
   Runden wirken.

   ── Arbeitet zusammen mit ──────────────────────────────────────────

   `runtime/torwaechter.js` (`fingerabdruckVon`, `FINGERABDRUCK`,
   `RUNDEN`, `SALZ` — die eine Wahrheit über den Fingerabdruck),
   `werkzeuge/pruefe-torwaechter.mjs` (prüft, dass beide auf denselben
   Wert kommen) und `werkzeuge/helfer.mjs` (`WURZEL`). */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { WURZEL } from "./helfer.mjs";
import {
  FINGERABDRUCK, RUNDEN, SALZ, fingerabdruckVon, normalisiere
} from "../runtime/torwaechter.js";

/* Die Zeile, die in `runtime/torwaechter.js` ausgetauscht wird. Sie
   steht hier als Bauplan und nicht als abgeschriebener Text: So kann
   der Name der Konstanten nur an einer Stelle falsch sein. */
const ZEILE = (abdruck) => `export const FINGERABDRUCK = "${abdruck}";`;

/* Ordner, in denen nichts zu suchen ist. */
const AUSSEN = new Set([".git", "node_modules", "vendor", "dist", "build"]);

/* Alle Buchstabenfolgen des Baums, klein geschrieben und ohne
   Wiederholung. Mehr braucht ein Wörterbuchangriff nicht: Wer das Wort
   versehentlich hinschreibt, schreibt es als Wort. */
function woerterDesBaums() {
  const woerter = new Map();
  const gehe = (rel) => {
    for (const eintrag of readdirSync(join(WURZEL, rel), { withFileTypes: true })) {
      const kind = rel === "." ? eintrag.name : rel + "/" + eintrag.name;
      if (eintrag.isDirectory()) {
        if (!AUSSEN.has(eintrag.name)) gehe(kind);
        continue;
      }
      if (statSync(join(WURZEL, kind)).size > 2_000_000) continue;
      const roh = readFileSync(join(WURZEL, kind));
      if (roh.includes(0)) continue;
      for (const treffer of roh.toString("utf8").matchAll(/[A-Za-zÄÖÜäöüß]{3,40}/g)) {
        const wort = normalisiere(treffer[0]);
        if (!woerter.has(wort)) woerter.set(wort, kind);
      }
    }
  };
  gehe(".");
  return woerter;
}

/* Die wörtliche Suche nach einem Wort im ganzen Baum - möglich nur
   hier, weil nur hier das Wort im Klartext vorliegt. Groß und klein
   gilt als dasselbe, denn der Torwächter macht daraus ohnehin eins.
   Gezählt wird über alle Dateien; zurück kommen Anzahl und erste
   Fundstelle. */
function steckSchonImBaum(wort) {
  const gesucht = wort.toLowerCase();
  let treffer = 0;
  let zuerst = "";
  const gehe = (rel) => {
    for (const eintrag of readdirSync(join(WURZEL, rel), { withFileTypes: true })) {
      const kind = rel === "." ? eintrag.name : rel + "/" + eintrag.name;
      if (eintrag.isDirectory()) {
        if (!AUSSEN.has(eintrag.name)) gehe(kind);
        continue;
      }
      if (statSync(join(WURZEL, kind)).size > 2_000_000) continue;
      const roh = readFileSync(join(WURZEL, kind));
      if (roh.includes(0)) continue;
      const text = roh.toString("utf8").toLowerCase();
      let ab = text.indexOf(gesucht);
      while (ab >= 0) {
        treffer++;
        if (zuerst === "") zuerst = kind;
        ab = text.indexOf(gesucht, ab + 1);
      }
    }
  };
  gehe(".");
  return { treffer, zuerst };
}

function suche() {
  const woerter = woerterDesBaums();
  console.log(`\nWörterbuchangriff auf das eigene Tor: ${woerter.size} verschiedene Wörter `
    + `im Baum, ${RUNDEN} Runden je Versuch.\n`);
  const beginn = Date.now();
  const funde = [];
  let gezaehlt = 0;
  for (const [wort, datei] of woerter) {
    gezaehlt++;
    if (fingerabdruckVon(wort) === FINGERABDRUCK) funde.push(`${wort}  (zuerst in ${datei})`);
    if (gezaehlt % 500 === 0) {
      const anteil = Math.round((gezaehlt / woerter.size) * 100);
      console.log(`  ${gezaehlt} von ${woerter.size} (${anteil} %) ...`);
    }
  }
  const dauer = (Date.now() - beginn) / 1000;
  console.log(`\n  ${woerter.size} Wörter in ${dauer.toFixed(1)} s `
    + `(${(dauer * 1000 / woerter.size).toFixed(1)} ms je Versuch)`);
  if (funde.length === 0) {
    console.log("  ✓ Kein Wort dieses Baums öffnet das Tor.\n");
    return 0;
  }
  console.log("  ✗ Das Zugangswort steht im Repository:");
  for (const fund of funde) console.log(`      ${fund}`);
  console.log("");
  return 1;
}

function hilfe() {
  console.log(`
Das Zugangswort von Hatred wechseln

  node werkzeuge/zugangswort.mjs <neues wort>
      rechnet den Fingerabdruck aus und druckt die Zeile zum Austauschen

  node werkzeuge/zugangswort.mjs --suche
      durchsucht den ganzen Baum danach, ob das Wort irgendwo hineingeraten ist
`);
}

const eingabe = process.argv.slice(2);

if (eingabe.length === 0 || eingabe[0] === "--hilfe" || eingabe[0] === "-h") {
  hilfe();
  process.exit(eingabe.length === 0 ? 1 : 0);
}

if (eingabe[0] === "--suche") {
  process.exit(suche());
}

/* Mehrere Wortteile werden zusammengehängt: Wer `node … zwei worte`
   tippt, meint zwei Wörter mit einem Leerzeichen dazwischen, und die
   Schale reicht sie einzeln herein. */
const wort = eingabe.join(" ");
const sauber = normalisiere(wort);

if (sauber === "") {
  /* Hier steht bewusst kein Beispielwort: Ein Beispiel stünde damit im
     Baum, und die Suche weiter oben lehnte genau dieses Wort später ab
     — ausgerechnet das, das Jannik gerade gelesen hat. */
  console.log("\n  Da war kein Wort dabei: node werkzeuge/zugangswort.mjs <dein wort>\n");
  process.exit(1);
}

/* Erst suchen, dann rechnen. Ein Wort, das schon im Baum steht, ist
   keins - und dann hilft auch der schönste Fingerabdruck nicht. */
const schon = steckSchonImBaum(sauber);
if (schon.treffer > 0) {
  console.log(`
  Dieses Wort steht schon ${schon.treffer}-mal im Repository
  (zuerst in ${schon.zuerst}).

  Damit taugt es nicht als Zugangswort: Der Quelltext wird mit
  ausgeliefert, und wer die Wörter dieses Baums der Reihe nach gegen das
  Tor hält, hat es in wenigen Minuten. Nimm ein anderes Wort - am besten
  eins, das in keinem Wörterbuch steht, etwa zwei zusammengesetzte
  Wörter, die sonst nicht zusammengehören.

  Nachsehen kannst du es selbst:  node werkzeuge/zugangswort.mjs --suche
`);
  process.exit(1);
}

const beginn = Date.now();
const abdruck = fingerabdruckVon(sauber);
const dauer = Date.now() - beginn;

console.log(`
  Das neue Wort hat ${sauber.length} Zeichen. Gerechnet wurden ${RUNDEN} Runden
  über „${SALZ} + dein Wort"; das hat ${dauer} ms gedauert - genau so lange
  dauert später auch jeder einzelne Rateversuch eines Fremden.

  Tausche in runtime/torwaechter.js diese eine Zeile aus:

${ZEILE(abdruck)}

  Was du damit tust: Ab dann kommt nur noch mit diesem Wort jemand
  herein. Wer sich das alte Wort hat merken lassen, wird beim nächsten
  Start wieder gefragt - gemerkt wird der Fingerabdruck, und der ist
  ein anderer geworden.

  Zwei Dinge noch, und beide sind wichtig:
  · Schreib das Wort selbst in KEINE Datei - nicht ins Changelog, nicht
    in einen Kommentar. Nur der Fingerabdruck oben gehört ins
    Repository. Prüfen kann man das mit
    node werkzeuge/zugangswort.mjs --suche
  · Der Riegel hält Zufallsbesucher ab und sonst nichts: Der
    Fingerabdruck steht im ausgelieferten Code, und wer sich genug Zeit
    nimmt, probiert Wörter dagegen durch. Echter Schutz bräuchte einen
    Server - den will dieses Projekt ausdrücklich nicht.
`);
