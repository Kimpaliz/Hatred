/* [Aufgabe: Prüfwesen] Die Granitstruktur wird im tatsächlichen Weltbild benutzt.

   ── Warum es das gibt ──────────────────────────────────────────────

   Ein grüner Materialtest genügt nicht, wenn der Weltzeichner weiter
   alte Muster ausgibt. Deshalb werden seine finalen Pixel gegen das
   Granitfeld verglichen, dann verschobene Kameras auf denselben Weltort
   zurückgerechnet. Die frühere Forderung, jede Nachbarkachel anders
   einzufärben, würde eine zusammenhängende Oberfläche wieder auftrennen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `pruefe-zeichnen.mjs` stellt das Blatt, `runtime/granit-feld.js` den
   erwarteten Terrainpuffer. Die ursprünglichen Materialformeln und
   Blocknähte sind Gegenstand von `pruefe-granit-material.mjs`. */

import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";
import { bildProbe, probeKarte } from "./pruefe-zeichnen.mjs";
import { macheGranitFeld } from "../runtime/granit-feld.js";
import { feldMitte } from "../spiel/raster.mjs";
import { HINDERNIS } from "../spiel/gitter.mjs";

const farbe = (w) => "#" + [w & 255, (w >>> 8) & 255, (w >>> 16) & 255]
  .map((n) => n.toString(16).padStart(2, "0")).join("");
abschnitt("Tatsächliches Granitfeld im Weltzeichner");
for (const art of [HINDERNIS.keins, HINDERNIS.wand]) {
  const karte = probeKarte();
  karte.setze(6, 6, { hindernis: art });
  const p = bildProbe(karte);
  p.zeichner.zeichneWelt(karte);
  const feld = macheGranitFeld({ kasten() {}, ton: (f) => f }).feldDaten(karte, 6, 6);
  let gleichViele = 0, falsch = 0;
  const farben = new Set();
  for (let y = 0; y < feld.hoehe; y++) for (let x = 0; x < feld.breite; x++) {
    const wert = feld.pixel[y * feld.breite + x];
    if (!wert) continue;
    const ist = p.weltPixel(feld.x0 + x, feld.y0 + y);
    if (ist === farbe(wert)) gleichViele++; else falsch++;
    farben.add(ist);
  }
  behaupte(gleichViele > 180 && falsch === 0,
    `Alle finalen Pixel für Hindernis ${art} stammen aus dem Granitfeld`);
  behaupte(farben.size > 12, "Innerhalb eines Feldes entstehen echte Materialabstufungen");
  const vorher = p.zeichner.gelaendeStatistik().neuGebaut;
  p.zeichner.zeichneWelt(karte);
  gleich(p.zeichner.gelaendeStatistik().neuGebaut, vorher,
    "Unveränderte Karte baut das teure Material nicht nochmals");
}

abschnitt("Textur bleibt beim Kameraschwenk an der Welt verankert");
const karte = probeKarte(30, 24), p = bildProbe(karte);
const mitte = feldMitte(6, 6), werte = [];
for (const ziel of [6, 7, 6]) {
  p.kamera.folge(ziel, 6, true);
  p.neu(); p.zeichner.zeichneWelt(karte);
  werte.push(p.weltPixel(mitte.x, mitte.y));
}
behaupte(werte[0] && werte.every((w) => w === werte[0]),
  "Derselbe Weltpunkt behält beim Hin- und Zurückschwenken seine Farbe");

abschnitt("Saat wirkt im gezeichneten Material");
const a = bildProbe(probeKarte(12, 12, 7)), b = bildProbe(probeKarte(12, 12, 8));
a.zeichner.zeichneWelt(a.karte); b.zeichner.zeichneWelt(b.karte);
let anders = 0;
for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
  if (a.weltPixel(mitte.x + x, mitte.y + y) !== b.weltPixel(mitte.x + x, mitte.y + y)) {
    anders++;
  }
}
behaupte(anders > 20, "Eine andere Saat ändert die tatsächlich gezeichnete Maserung");
ende("Durchgehende Granitstruktur");
