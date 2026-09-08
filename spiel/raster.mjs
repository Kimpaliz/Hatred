/* [Aufgabe: Regelkern] Die gemeinsame Geometrie des Sechseckrasters in Weltbildpunkten.

   ── Warum es das gibt ──────────────────────────────────────────────

   Die Höhle wird in echten Weltpunkten erzeugt und senkrecht von oben
   gezeichnet. Regelkern und Bild benutzen dieselben versetzten Zeilen;
   eine zweite quadratische Projektion würde Treffer, Licht und Wände
   gegeneinander verschieben. Die Maße enthalten keinerlei Höhenversatz.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/bauart.mjs` liefert die Feldbreite. Höhlenerzeugung, Terrain,
   `runtime/kamera.js`, `runtime/licht.js` und `runtime/partikel.js`
   teilen sich Feldmitten, Feldkonturen und die Rückrechnung. */

import { PIXEL_JE_FELD } from "./bauart.mjs";

export const FELD_BREITE = PIXEL_JE_FELD;
export const ZEILEN_HOEHE = FELD_BREITE * Math.sqrt(3) / 2;
export const FELD_RADIUS = FELD_BREITE / Math.sqrt(3);

/* Bei animierten Zwischenzeilen läuft der Versatz stetig zwischen den
   beiden Endfeldern. Math.floor statt trunc hält das auch links/oben
   außerhalb der Karte korrekt. Ganze Felder behalten die odd-r-Lage. */
export function feldMitte(x, y) {
  const zeile = Math.floor(y);
  const teil = y - zeile;
  const von = zeile & 1;
  const versatz = von + ((1 - von) - von) * teil;
  return {
    x: x * FELD_BREITE + versatz * FELD_BREITE / 2 + FELD_BREITE / 2,
    y: y * ZEILEN_HOEHE + FELD_RADIUS
  };
}

/* Voronoi-Zuordnung zu den echten Feldmitten: Die nächste Zeile und
   ihre beiden Nachbarn reichen aus. Gleich weit entfernte Grenzpunkte
   gehen deterministisch zuerst an die kleinere Zeile, dann Spalte. */
export function weltNachFeld(px, py) {
  /* Unterpixel bleiben erlaubt. Jenseits sicher darstellbarer
     Weltpunkte wäre die Feldzuordnung dagegen nur eine Scheingenauigkeit. */
  if (!Number.isFinite(px) || !Number.isFinite(py)
    || Math.abs(px) > Number.MAX_SAFE_INTEGER || Math.abs(py) > Number.MAX_SAFE_INTEGER) {
    return { x: NaN, y: NaN };
  }
  const mitteY = Math.round((py - FELD_RADIUS) / ZEILEN_HOEHE);
  let bestesX = 0;
  let bestesY = mitteY;
  let besterAbstand = Infinity;
  /* Der Zähler ist unabhängig von den Weltkoordinaten immer klein:
     genau drei Durchläufe, auch wenn große Zahlen nicht mehr um eins steigen. */
  for (let versatz = -1; versatz <= 1; versatz++) {
    const y = mitteY + versatz;
    const x = Math.round((px - FELD_BREITE / 2 - (y & 1) * FELD_BREITE / 2)
      / FELD_BREITE);
    const mitte = feldMitte(x, y);
    const dx = px - mitte.x;
    const dy = py - mitte.y;
    const abstand = dx * dx + dy * dy;
    if (abstand < besterAbstand) {
      besterAbstand = abstand;
      bestesX = x;
      bestesY = y;
    }
  }
  return { x: bestesX, y: bestesY };
}

/* Im Uhrzeigersinn ab der Nordspitze; ungerundet, damit Nachbarn
   dieselbe Kante erhalten. Erst die Rasterausgabe rundet Bildpunkte. */
export function feldEcken(x, y) {
  const mitte = feldMitte(x, y);
  const halb = FELD_BREITE / 2;
  const radius = FELD_RADIUS;
  return [
    { x: mitte.x, y: mitte.y - radius },
    { x: mitte.x + halb, y: mitte.y - radius / 2 },
    { x: mitte.x + halb, y: mitte.y + radius / 2 },
    { x: mitte.x, y: mitte.y + radius },
    { x: mitte.x - halb, y: mitte.y + radius / 2 },
    { x: mitte.x - halb, y: mitte.y - radius / 2 }
  ];
}

/* Einschließlich äußerer Spitzen und des Versatzes ungerader Zeilen.
   Aufrunden verhindert abgeschnittene Pixel am rechten/unteren Rand. */
export function weltMasse(karte) {
  if (karte.breite <= 0 || karte.hoehe <= 0) return { breite: 0, hoehe: 0 };
  return {
    breite: Math.ceil(karte.breite * FELD_BREITE + (karte.hoehe > 1 ? FELD_BREITE / 2 : 0)),
    hoehe: Math.ceil((karte.hoehe - 1) * ZEILEN_HOEHE + 2 * FELD_RADIUS)
  };
}
