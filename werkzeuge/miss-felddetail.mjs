/* [Aufgabe: Werkzeug] Wie viel Zeichnung steckt in einem Feld, und wie
   dunkel wird der Fels nach innen?

   ── Warum es das gibt / Warum so ───────────────────────────────────

   `werkzeuge/miss-wandkontrast.mjs` beantwortet eine Frage: Hebt sich
   die Wand vom Boden ab? Sie beantwortet **nicht**, ob ein Feld mehr
   Zeichnung trägt als vorher und ob der Fels nach innen wirklich
   dunkler wird. Genau diese Zahlen standen am 12.09.2026 im Changelog —
   ohne Befehl daneben, also als Behauptung (`docs/REGELN.md` 11). Ein
   Prüfer hat das gefunden. Diese Datei schließt die Lücke.

   ── Die drei Zahlen ────────────────────────────────────────────────

   **Farben je Bodenfeld.** Wie viele verschiedene Farbwerte ein
   Bodenfeld trägt. Sie ist das Maß für „feiner": Ein Feld, das nur
   größer gemalt wird, trägt dieselben Farben; eines, das feiner
   abgetastet wird, trägt mehr.

   **Helligkeitsschritt zum Nachbarpunkt.** Der mittlere Betrag, um den
   sich zwei waagerecht benachbarte **gezeichnete** Punkte unterscheiden.
   Sie ist die Gegenprobe zur ersten Zahl: Mehr Farben bei größerem
   Schritt wäre Rauschen, mehr Farben bei kleinerem Schritt ist
   Auflösung. Zum Vergleich steht daneben derselbe Wert über den Abstand
   **eines Weltpunkts**, damit beide Stände vergleichbar bleiben, auch
   wenn sich die Abtastdichte ändert.

   **Helligkeit je Felstiefe.** Die mittlere Helligkeit der Felsfelder,
   aufgeschlüsselt danach, wie viele Felder sie vom offenen Raum entfernt
   liegen (Flutfüllung über die **ganze** Karte, nicht nur über den Ring
   des Zeichners). Die Abnahme von Vorgang #25 verlangt, dass sie streng
   monoton fällt; diese Zahl ist der Nachweis.

   Gemessen wird im **Bildpuffer**, also ohne Licht und ohne Nebel —
   dieselbe Sicht wie beim Kartenknopf. Was das Licht daraus macht, ist
   eine andere Frage und gehört nicht hierher.

   ── Wie man es ruft ────────────────────────────────────────────────

       node werkzeuge/miss-felddetail.mjs [saat]

   Ohne Saat die 4711, mit der auch die übrigen Messungen des Projekts
   arbeiten. Die Ausgabe gehört außerhalb des Projekts (Fehlerbuch C2).

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/granit-feld.js` (`macheGranitFeld`, `feldDaten` — der
   Bildpuffer, den es liest), `spiel/landschaft.mjs` (`baueLandschaft`),
   `spiel/gitter.mjs` (`HINDERNIS`, `richtungen`) und
   `werkzeuge/miss-wandkontrast.mjs`, das die andere Hälfte derselben
   Frage misst. */

import { macheGranitFeld } from "../runtime/granit-feld.js";
import { baueLandschaft } from "../spiel/landschaft.mjs";
import { HINDERNIS, richtungen } from "../spiel/gitter.mjs";

const SAAT = Number(process.argv[2]) || 4711;
const BREITE = 56, HOEHE = 40;
/* ── Zwei Ausschnitte, und das ist Absicht ──────────────────────────
   Die **Bodenzahlen** werden über einen Ausschnitt gemittelt, der vier
   Felder Rand auslässt: Am Kartenrand sind Räume angeschnitten, und ein
   angeschnittener Raum verschiebt den Mittelwert, ohne dass sich am
   Bild etwas geändert hätte. Welcher Ausschnitt es ist, spielt für den
   Vergleich keine Rolle — nur dass vorher und nachher derselbe genommen
   wird; deshalb steht er hier fest und nicht als Aufrufoption.

   Die **Felstiefen** laufen über die ganze Karte, ohne Rand. Ihre
   Abnahme (Vorgang #25) ist über alle Felsfelder formuliert, und die
   Flutfüllung, die die Tiefe bestimmt, braucht ohnehin die ganze
   Karte. */
const BODEN_RAND = 4;
const TIEFEN = 4;

const hell = (p) => (p & 255) * 0.2126 + ((p >>> 8) & 255) * 0.7152
  + ((p >>> 16) & 255) * 0.0722;
const mittel = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

const karte = baueLandschaft({ saat: SAAT, breite: BREITE, hoehe: HOEHE, spielerZahl: 2 });
const gelaende = macheGranitFeld({ kasten() {}, ton: (farbe) => farbe });

/* Die echte Tiefe über die ganze Karte, unabhängig vom Nachbarring des
   Zeichners: alles Offene ist 0, sein Felsnachbar 1, und so weiter. */
function echteTiefen() {
  const tiefe = new Int32Array(karte.breite * karte.hoehe).fill(-1);
  const welle = [];
  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) {
      if (karte.hindernisBei(x, y) !== HINDERNIS.wand) {
        tiefe[y * karte.breite + x] = 0;
        welle.push([x, y]);
      }
    }
  }
  for (let i = 0; i < welle.length; i++) {
    const [x, y] = welle[i];
    for (const r of richtungen(y)) {
      const nx = x + r.dx, ny = y + r.dy;
      if (!karte.drin(nx, ny)) continue;
      const j = ny * karte.breite + nx;
      if (tiefe[j] !== -1) continue;
      tiefe[j] = tiefe[y * karte.breite + x] + 1;
      welle.push([nx, ny]);
    }
  }
  return tiefe;
}

const tiefen = echteTiefen();
const jeTiefe = Array.from({ length: TIEFEN }, () => []);
let farbenSumme = 0, bodenFelder = 0, ohneTiefe = 0;
let feinSumme = 0, feinAnzahl = 0, weltSumme = 0, weltAnzahl = 0;

for (let y = 0; y < karte.hoehe; y++) {
  for (let x = 0; x < karte.breite; x++) {
    const hindernis = karte.hindernisBei(x, y);
    const imAusschnitt = x >= BODEN_RAND && y >= BODEN_RAND
      && x < karte.breite - BODEN_RAND && y < karte.hoehe - BODEN_RAND;
    if (hindernis !== HINDERNIS.wand && !(hindernis === HINDERNIS.keins && imAusschnitt)) {
      continue;
    }
    const feld = gelaende.feldDaten(karte, x, y);
    const schritt = feld.fein || 1;
    const bb = feld.bildBreite || feld.breite, bh = feld.bildHoehe || feld.hoehe;

    if (hindernis === HINDERNIS.wand) {
      const tiefe = tiefen[y * karte.breite + x];
      if (tiefe <= 0) { ohneTiefe++; continue; }
      const werte = [];
      for (let i = 0; i < feld.pixel.length; i++) {
        if (feld.pixel[i]) werte.push(hell(feld.pixel[i]));
      }
      jeTiefe[Math.min(TIEFEN, tiefe) - 1].push(mittel(werte));
      continue;
    }

    const farben = new Set();
    for (let py = 0; py < bh; py++) {
      for (let px = 0; px < bb - 1; px++) {
        const a = feld.pixel[py * bb + px];
        if (!a) continue;
        farben.add(a);
        const b = feld.pixel[py * bb + px + 1];
        if (b) { feinSumme += Math.abs(hell(a) - hell(b)); feinAnzahl++; }
      }
    }
    for (let py = 0; py < bh; py += schritt) {
      for (let px = 0; px + schritt < bb; px += schritt) {
        const a = feld.pixel[py * bb + px], b = feld.pixel[py * bb + px + schritt];
        if (a && b) { weltSumme += Math.abs(hell(a) - hell(b)); weltAnzahl++; }
      }
    }
    farbenSumme += farben.size;
    bodenFelder++;
  }
}

console.log(`Felddetail, Saat ${SAAT}, Karte ${BREITE} × ${HOEHE}.`);
console.log("Gemessen im Bildpuffer — ohne Licht und ohne Nebel.\n");
console.log(`${bodenFelder} Bodenfelder (${BODEN_RAND} Felder Rand ausgelassen):`);
console.log(`  verschiedene Farben je Feld:            ${(farbenSumme / bodenFelder).toFixed(1)}`);
console.log(`  Helligkeitsschritt zum Nachbarpunkt:   ${(feinSumme / feinAnzahl).toFixed(2)}`
  + `  (n=${feinAnzahl})`);
console.log(`  derselbe Schritt über einen Weltpunkt: ${(weltSumme / weltAnzahl).toFixed(2)}`
  + `  (n=${weltAnzahl})\n`);
console.log("Helligkeit je Felstiefe über die GANZE Karte "
  + "(1 = Sichtseite, 4 = tief im Gestein):");
let vorher = Infinity, monoton = true;
for (let t = 0; t < TIEFEN; t++) {
  const wert = mittel(jeTiefe[t]);
  if (jeTiefe[t].length && wert >= vorher) monoton = false;
  if (jeTiefe[t].length) vorher = wert;
  console.log(`  Tiefe ${t + 1 === TIEFEN ? "4+" : t + 1}: `
    + `${String(jeTiefe[t].length).padStart(4)} Felder  ${wert.toFixed(2)}`);
}
console.log(`\nStreng monoton fallend: ${monoton ? "ja" : "NEIN"}`);
console.log(`Felsfelder ohne Tiefe: ${ohneTiefe}`);
