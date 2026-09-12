/* [Aufgabe: Werkzeug] Was kostet es, die Feldbilder einer ganzen Karte
   zu bauen?

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Der teure Teil des Bildes ist nicht das Zeichnen, sondern der
   **Materialpass**: Je sichtbarem Feld entsteht einmal ein Pixelpuffer
   aus Rauschen, Wandabstand, Normalen und Verdeckung. Danach wird er
   wiederverwendet. Wer an `runtime/granit-feld.js` oder
   `runtime/granit-material.js` dreht, ändert genau diese Zahl — und
   merkt es sonst erst, wenn das Spiel beim Betreten eines neuen
   Kerkerteils stockt.

   Der Anlass: W9 (12.09.2026) hat den Puffer viermal so fein gemacht.
   Die Kosten standen im Changelog, aber ohne Befehl daneben — also als
   Behauptung (`docs/REGELN.md` 11). Ein Prüfer hat das gefunden.

   ── Wie gemessen wird, und warum genau so ──────────────────────────

   · **Alle** Felder der Standardkarte (56 × 40 = 2.240), nicht ein
     Ausschnitt: Der Zwischenspeicher fasst 4.096 Felder, ein Ausschnitt
     träfe also nur den warmen Fall.
   · **Vier Läufe**, jeder mit frischem Zwischenspeicher, und gemeldet
     wird der **Median** der beiden mittleren. Eine Zahl aus einem
     einzigen Lauf ist keine Messung (Fehlerbuch C9); die erste Zahl
     eines frisch gestarteten Node ist regelmäßig die schlechteste.
   · Ohne Zeichenblatt und ohne Farbübersetzung (`ton` gibt durch): Was
     hier gemessen wird, ist der Bau, nicht das Malen.

   Zwei Stände vergleicht man, indem man das Werkzeug in beiden Bäumen
   **abwechselnd** laufen lässt — erst hier, dann dort, dann wieder hier.
   Nacheinander gemessene Blöcke unterscheiden sich sonst um die Laune
   der Maschine und nicht um den Umbau.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/granit-feld.js` (`macheGranitFeld`, `feldDaten` — der
   Materialpass, dessen Zeit hier steht), `spiel/landschaft.mjs`
   (`baueLandschaft`) und die übrigen `miss-*`-Werkzeuge, die dieselbe
   Karte und dieselbe Saat nehmen. */

import { macheGranitFeld } from "../runtime/granit-feld.js";
import { baueLandschaft } from "../spiel/landschaft.mjs";

const SAAT = Number(process.argv[2]) || 4711;
const BREITE = 56, HOEHE = 40;
const LAEUFE = 4;

const karte = baueLandschaft({ saat: SAAT, breite: BREITE, hoehe: HOEHE, spielerZahl: 2 });
const zeiten = [];

for (let lauf = 0; lauf < LAEUFE; lauf++) {
  /* Frischer Zeichner je Lauf: sonst misst der zweite Lauf den
     Zwischenspeicher des ersten und nicht den Bau. */
  const gelaende = macheGranitFeld({ kasten() {}, ton: (farbe) => farbe });
  const start = process.hrtime.bigint();
  for (let y = 0; y < HOEHE; y++) {
    for (let x = 0; x < BREITE; x++) gelaende.feldDaten(karte, x, y);
  }
  zeiten.push(Number(process.hrtime.bigint() - start) / 1e6);
}

zeiten.sort((a, b) => a - b);
const median = (zeiten[LAEUFE / 2 - 1] + zeiten[LAEUFE / 2]) / 2;
const felder = BREITE * HOEHE;

console.log(`Feldbauzeit, Saat ${SAAT}, ${felder} Feldpuffer, ${LAEUFE} Läufe.`);
console.log(`  einzeln: ${zeiten.map((t) => t.toFixed(1)).join(" | ")} ms`);
console.log(`  Median:  ${median.toFixed(1)} ms  `
  + `(${(median * 1000 / felder).toFixed(0)} µs je Feld)`);
