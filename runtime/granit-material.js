/* [Aufgabe: Bild] Scotophobias Granit und Höhlenboden als reine Weltpunktprobe.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Quelle: Kimpaliz/granithoehle, d3460e97399b9748e1043a488c119dd3b7ec528c,
   `spiel/oberflaeche.mjs`: Grundrauschen 82–90, Fels 101–110,
   Boden 238–254 und Geröll 308–317. Die Formeln und Saataufschläge
   bleiben gleich. Raster, Normalen, Licht und Höhenstufen gehören zum
   aufrufenden Geländezeichner; diese Probe kennt nur den Weltpunkt.

   `x` und `y` sind durchgehende Weltbildpunkte, auch unter null und
   über Kachelgrenzen. Sie dürfen niemals auf eine Kachel zurückgesetzt
   werden: Sonst wiederholen sich Maserung und Körnung alle 16 Punkte.
   `distanz` ist der Abstand zur Rasterwand, im Fels positiv und auf
   dem Boden negativ. Der schmale Materialübergang bei −0,6 stammt aus
   der Quelle. Farben sind Bytes, die Reliefhöhe bleibt ein Float32-Wert
   wie in deren Oberflächenpuffer. Sie versetzt keine Bildschirmposition.

   Die Probe enthält ausschließlich trockenen Fels, Boden und Geröll.
   Wasser zeichnet der Auftraggeber anhand der tatsächlichen Rasterkarte;
   das optische Grundwasser der Quelle würde daneben falsche Seen setzen.
   Keine Kristalle, Säure, Gase oder Leuchtadern werden mitübernommen.

   Das mehrfache Rauschen wird beim Aufbau eines Geländeblocks berechnet
   und gespeichert. Je Bild laufen nur Licht und bewegte Oberflächen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/welt-rauschen.mjs` trägt dieselben hash/fbm/sstep-Formeln wie
   Scotophobia. Der Geländezeichner ruft `granitProbe` mit Weltkoordinaten;
   `werkzeuge/pruefe-granit-material.mjs` prüft Quellwerte und Blocknähte. */

import { hash, fbm, sstep } from "../spiel/welt-rauschen.mjs";

/* Uint8Array schneidet positive Nachkommastellen ab; auf dieselbe Weise
   schreibt die Quelle ihre Albedo. Uint8ClampedArray würde anders runden. */
const farbByte = (wert) => Math.trunc(Math.max(0, Math.min(255, wert)));

export function granitProbe(x, y, saat, distanz) {
  const s = Math.fround(distanz);
  const fein = hash(x, y, saat + 9);
  const korn = fbm(x * 0.42, y * 0.42, saat + 31, 2);
  const wx = x + 26 * (fbm(x * 0.013, y * 0.013, saat + 41, 2) - 0.5);
  const wy = y + 26 * (fbm(x * 0.013 + 7, y * 0.013 + 7, saat + 42, 2) - 0.5);
  const mischung = sstep(0.44, 0.60, fbm(x * 0.0055, y * 0.0055, saat + 201, 2));
  const gelaende = 15 * (fbm(x * 0.0065, y * 0.0065, saat + 301, 2) - 0.5)
    + 6 * (fbm(x * 0.019, y * 0.019, saat + 303, 2) - 0.5);
  let r, g, b, hoehe;

  if (s > -0.6) {
    const auf = sstep(-0.6, 4.5, s);
    const maserung = fbm(wx * 0.05, wy * 0.05, saat + 61, 4);
    const t = 0.62 * maserung + 0.28 * korn + 0.10 * fein;
    const rA = 33 + 50 * t + 46 * auf;
    const gA = 34 + 50 * t + 45 * auf;
    const bA = 43 + 54 * t + 43 * auf;
    const rB = 30 + 40 * t + 34 * auf;
    const gB = 35 + 48 * t + 39 * auf;
    const bB = 47 + 60 * t + 45 * auf;
    r = rA + (rB - rA) * mischung;
    g = gA + (gB - gA) * mischung;
    b = bA + (bB - bA) * mischung;
    if (fein > 0.982) { r += 40; g += 39; b += 38; }
    else if (fein < 0.04) { r -= 14; g -= 14; b -= 10; }
    hoehe = Math.fround((7.6 * auf + 3.2 * fbm(x * 0.09, y * 0.09, saat + 51, 2)
      + 1.1 * fbm(x * 0.3, y * 0.3, saat + 53, 2) + 0.3 * korn)
      * (1 - 0.22 * mischung) + gelaende);
  } else {
    const m1 = fbm(wx * 0.030, wy * 0.030, saat + 3, 3);
    const m2 = fbm(wx * 0.10, wy * 0.10, saat + 5, 2);
    const ader = Math.abs(fbm(wx * 0.026, wy * 0.048, saat + 13, 2) * 2 - 1);
    const t = 0.58 * m1 + 0.38 * m2 + 0.04 * fein;
    const staub = Math.max(0, Math.min(1, (m1 - 0.50) * 2.8));
    const kern = Math.max(0, 1 - ader * 10);
    const rA = 50 + 80 * t + 30 * staub + 18 * kern;
    const gA = 46 + 70 * t + 17 * staub + 20 * kern;
    const bA = 48 + 58 * t - 14 * staub + 26 * kern;
    const rB = 44 + 68 * t + 8 * staub + 20 * kern;
    const gB = 49 + 76 * t + 10 * staub + 24 * kern;
    const bB = 60 + 84 * t + 3 * staub + 30 * kern;
    r = rA + (rB - rA) * mischung;
    g = gA + (gB - gA) * mischung;
    b = bA + (bB - bA) * mischung;
    if (fein > 0.984) { r += 34; g += 33; b += 30; }
    else if (fein < 0.04) { r -= 15; g -= 15; b -= 11; }
    hoehe = Math.fround((2.2 * m2 + 1.3 * fbm(wx * 0.05, wy * 0.05, saat + 71, 2)
      + 0.26 * korn + 0.16 * fein) * (1 - 0.25 * mischung) + gelaende);

    /* Geröll läuft über neun Weltbildpunkte aus. Die erste Rundung
       darüber und die zweite hier bilden die Float32-Schreibfolge nach. */
    const wandNaehe = 1 - sstep(1.5, 9, -s);
    if (wandNaehe > 0.02) {
      const koerner = fbm(x * 0.46, y * 0.46, saat + 341, 2);
      const brocken = koerner > 0.46 ? (koerner - 0.46) * 2.6 : 0;
      hoehe = Math.fround(hoehe + brocken * 1.55 * wandNaehe);
      const zieh = brocken * 0.34 * wandNaehe;
      r += (r * 0.34 + 46) * zieh;
      g += (g * 0.32 + 44) * zieh;
      b += (b * 0.30 + 46) * zieh;
    }
  }
  return { r: farbByte(r), g: farbByte(g), b: farbByte(b), hoehe };
}
