/* [Aufgabe: Prüfwesen] Höhen und Wände bleiben aus sechs Richtungen erkennbar.

   ── Warum es das gibt ──────────────────────────────────────────────

   Die frühere Südflanke zeigte eine geneigte Wand. Jetzt bleibt jede
   Oberfläche an ihrem Weltort; Höhe wird am gemeinsamen Rand gelesen.
   Für jede der sechs Hexseiten wird deshalb eine einzelne Nachbarhöhe
   abgesenkt und die gemeinsame Kante im finalen Bild verglichen.
   Abgründe müssen als dunkle Öffnung erkennbar sein, ohne aufrechte Wand.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `pruefe-zeichnen.mjs` stellt das echte Zeichenblatt, `spiel/raster.mjs`
   die Weltmitten. `pruefe-granit-feld.mjs` prüft separat Treppenanschlüsse;
   hier werden weder die Stufenphase noch deren Cache erneut nachgebaut. */

import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";
import { bildProbe, probeKarte } from "./pruefe-zeichnen.mjs";
import { feldMitte, weltNachFeld } from "../spiel/raster.mjs";
import { richtungen, HINDERNIS } from "../spiel/gitter.mjs";
import { helligkeit } from "../runtime/palette.js";

abschnitt("Sichtbare Höhenkontur an jeder Hexseite");
for (const y of [5, 6]) for (const r of richtungen(y)) {
  const karte = probeKarte(), x = 6;
  karte.ebene.fill(2);
  const p = bildProbe(karte);
  p.zeichner.zeichneWelt(karte);
  const vorher = new Map(p.pixel);
  const a = feldMitte(x, y), b = feldMitte(x + r.dx, y + r.dy);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  karte.setze(x + r.dx, y + r.dy, { ebene: 0 });
  p.neu(); p.zeichner.zeichneWelt(karte);
  let kantenPixel = 0, hellere = 0;
  for (let py = Math.floor(my) - 2; py <= Math.floor(my) + 2; py++) {
    for (let px = Math.floor(mx) - 2; px <= Math.floor(mx) + 2; px++) {
      const f = weltNachFeld(px + 0.5, py + 0.5);
      if (f.x !== x || f.y !== y) continue;
      const sx = (px - p.kamera.eckeX) * p.kamera.vergroesserung;
      const sy = (py - p.kamera.eckeY) * p.kamera.vergroesserung;
      const alt = vorher.get(`${sx},${sy}`), neu = p.weltPixel(px, py);
      kantenPixel++;
      if (alt && neu && helligkeit(neu) > helligkeit(alt) + 12) hellere++;
    }
  }
  behaupte(kantenPixel > 0 && hellere >= 2,
    `Helle Höhenkante nach (${r.dx}, ${r.dy}) in Zeile ${y}`);
  const innenVorher = vorher.get(`${(Math.floor(a.x) - p.kamera.eckeX)
    * p.kamera.vergroesserung},${(Math.floor(a.y) - p.kamera.eckeY)
    * p.kamera.vergroesserung}`);
  gleich(p.weltPixel(a.x, a.y), innenVorher,
    "Die Mitte des Plateaus wird weder verschoben noch zur Wandvorderseite");
}

abschnitt("Abgrund bleibt eine lesbare dunkle Öffnung");
const karte = probeKarte(), p = bildProbe(karte), m = feldMitte(6, 6);
p.zeichner.zeichneWelt(karte);
const boden = p.weltPixel(m.x, m.y);
karte.setze(6, 6, { hindernis: HINDERNIS.abgrund });
p.neu(); p.zeichner.zeichneWelt(karte);
const loch = p.weltPixel(m.x, m.y);
behaupte(helligkeit(loch) < helligkeit(boden) * 0.3,
  "Abgrundmitte ist deutlich dunkler als der Boden an derselben Stelle");
behaupte(helligkeit(loch) > 0, "Der Abgrund ist von ungesehenem Schwarz unterscheidbar");

abschnitt("Wandwechsel betrifft die echte Rasterfläche");
karte.setze(6, 6, { hindernis: HINDERNIS.wand });
p.neu(); p.zeichner.zeichneWelt(karte);
behaupte(p.weltPixel(m.x, m.y) !== loch, "Fels übermalt den früheren Abgrund");
ende("Senkrechte Höhen und Fels");
