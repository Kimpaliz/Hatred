/* [Aufgabe: Prüfwesen] Granitformeln, Weltkoordinaten und nähtefreies Blockrelief.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Die festen Referenzen stammen aus dem echten `oberflaeche()` von
   Kimpaliz/granithoehle, d3460e97399b9748e1043a488c119dd3b7ec528c,
   gemessen am 08.09.2026. Dort: P=CS+2*PAD, Distanzfeld mit dem Wert
   füllen, Ursprung (x-PAD,y-PAD), Saat, water=-100 und ringFest=0;
   auswerten bei PAD*P+PAD. Alle zwölf Proben haben Material 0. Das tiefe
   Grundwasser verhindert, dass Wasser oder Säure den trockenen Stein
   verändern. So prüft keine zweite Abschrift der Formel sich selbst.

   Der Nahtfall baut benachbarte Bildblöcke mitsamt einem Randbildpunkt
   unabhängig auf. Farbe und Relief an den Überlappungen müssen genau
   gleich sein. Erst der Rand erlaubt dem Zeichner, dieselbe Normale
   beiderseits einer Blockgrenze zu berechnen. Zusätzlich dürfen Saat
   und Aufrufreihenfolge keine gemeinsame, veränderliche Antwort liefern.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/granit-material.js` ist der Prüfling, `helfer.mjs` zählt.
   Die sichtbare Einbindung prüft der Geländezeichner gesondert. */

import { abschnitt, behaupte, gleich, tiefGleich, ende } from "./helfer.mjs";
import { granitProbe } from "../runtime/granit-material.js";

const REFERENZEN = [
  [-65, -33, 7, -16, 85, 96, 108, -3.506990909576416],
  [-64, -32, 7, -8, 87, 98, 110, -3.4142849445343018],
  [-63, -31, 7, -2, 102, 113, 126, -2.457477331161499],
  [15, 16, 42, -1, 69, 77, 91, 7.613317489624023],
  [16, 16, 42, 0, 56, 66, 86, 8.606472969055176],
  [17, 16, 42, 1, 63, 74, 95, 9.717568397521973],
  [127, 63, 7, 4.5, 85, 99, 124, 9.720399856567383],
  [128, 64, 7, 12, 71, 85, 114, 10.079394340515137],
  [129, 65, 7, 25, 86, 101, 125, 10.242490768432617],
  [300, -120, 4711, -20, 63, 70, 83, 2.8355722427368164],
  [1000, -800, 19, -3, 127, 113, 100, 4.81438684463501],
  [234, -654, 3, 3, 88, 88, 97, 6.857358455657959]
];

abschnitt("Echte Quellproben");
for (const [x, y, saat, distanz, r, g, b, hoehe] of REFERENZEN) {
  tiefGleich(granitProbe(x, y, saat, distanz), { r, g, b, hoehe },
    `Quellprobe (${x}, ${y}), Saat ${saat}, Wandabstand ${distanz}`);
}

/* Eine schräge Rasterwand schneidet auch die Blockgrenzen, damit die
   Überlappung beide Materialzweige und Geröll am Wandfuß anfasst. */
const abstand = (x, y) => (x + y) / 3 - 5;
const punkt = (x, y, saat) => granitProbe(x, y, saat, abstand(x, y));
function block(x0, y0, kante, saat) {
  const p = new Map();
  for (let y = -1; y <= kante; y++) {
    for (let x = -1; x <= kante; x++) {
      p.set(`${x0 + x},${y0 + y}`, punkt(x0 + x, y0 + y, saat));
    }
  }
  return p;
}

abschnitt("Blocknähte einschließlich Normalenrand");
let nahtProben = 0;
for (const kante of [16, 32, 64]) {
  const links = block(-kante, -kante, kante, 7);
  for (const [x0, y0] of [[0, -kante], [-kante, 0], [0, 0]]) {
    const nachbar = block(x0, y0, kante, 7);
    for (const [ort, wert] of nachbar) {
      if (!links.has(ort)) continue;
      tiefGleich(wert, links.get(ort), `${kante}-Block, gemeinsamer Punkt ${ort}`);
      nahtProben++;
    }
  }
}
behaupte(nahtProben > 400, "Mehr als 400 gemeinsame Randpunkte tatsächlich geprüft");

abschnitt("Reihenfolge, Saat und periodische Kachelwiederholung");
const vorher = REFERENZEN.map(([x, y, saat, d]) => granitProbe(x, y, saat, d));
for (const [x, y, saat, d] of [...REFERENZEN].reverse()) {
  granitProbe(x + 1024, y - 1024, saat + 1, d);
  const wieder = granitProbe(x, y, saat, d);
  const i = REFERENZEN.findIndex((p) => p[0] === x && p[1] === y);
  tiefGleich(wieder, vorher[i], `Fremde Probe verschiebt (${x}, ${y}) nicht`);
}
const ort = granitProbe(31, 31, 7, 4);
behaupte(JSON.stringify(ort) !== JSON.stringify(granitProbe(31, 31, 8, 4)),
  "Andere Saat liefert anderes Material");
for (const verschiebung of [16, 32, 64]) {
  behaupte(JSON.stringify(ort) !== JSON.stringify(granitProbe(31 + verschiebung, 31, 7, 4)),
    `Keine Wiederholung nach ${verschiebung} Weltbildpunkten`);
}
ort.r = -1;
behaupte(granitProbe(31, 31, 7, 4).r >= 0, "Rückgabe teilt keinen veränderlichen Speicher");

abschnitt("Werteformat und Wandfuß");
for (const [x, y, saat] of REFERENZEN) {
  const fern = granitProbe(x, y, saat, -20);
  const nah = granitProbe(x, y, saat, -2);
  behaupte(nah.hoehe >= fern.hoehe, "Geröll senkt den Boden nicht ab");
  for (const wert of [fern, nah]) {
    for (const kanal of ["r", "g", "b"]) {
      behaupte(Number.isInteger(wert[kanal]) && wert[kanal] >= 0 && wert[kanal] <= 255,
        `${kanal} ist ein Farbbyte`);
    }
    gleich(wert.hoehe, Math.fround(wert.hoehe), "Relief hat das Float32-Format der Quelle");
  }
}
console.log(`  ${REFERENZEN.length} Quellproben, ${nahtProben} gemeinsame Randpunkte`);
ende("Granitmaterial");
