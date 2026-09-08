/* [Aufgabe: Prüfwesen] Quellwerte der Granithöhle und ihre gemeinsame Rasterabtastung.

   ── Warum es das gibt ──────────────────────────────────────────────

   Eine ähnliche Höhle beweist keine Übernahme. Die Referenzwerte wurden
   am 08.09.2026 aus Granithöhle d3460e9 mit sector=215 und corr=1,15
   gelesen. Dieser Test braucht die andere Installation nicht. Die
   zweite Probe prüft die tatsächlich benutzten Wand- und Höhenstellen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   welt-feld.mjs trägt die Quellformel, raster.mjs ihre Abtastpositionen,
   landschaft.mjs den Rasteradapter. Die übrige Landschaftsprüfung hält
   Start, Ausgang und jede begehbare Kachel über viele Saaten erreichbar. */

import { abschnitt, gleich, nahe, behaupte, ende } from "./helfer.mjs";
import { macheWeltfeld, WELTFASSUNG } from "../spiel/welt-feld.mjs";
import { macheKarte, FLUESSIG } from "../spiel/gitter.mjs";
import { feldMitte } from "../spiel/raster.mjs";
import {
  rastereWaende, roheEbenen, baueLandschaft, setzeRand, setzeEbenen, raeumeAuf,
  verfuelleNebenraeume, setzeRampen, grabeAbgruende, waehleStarts,
  beckenGebiete, setzeWasser
} from "../spiel/landschaft.mjs";

const PUNKTE = [[-350, -280], [-120, 210], [0, 0], [45, 91],
  [100, 180], [200, 100], [310, 390], [600, 480]];
const QUELLE = [
  [3, [-15.331556543633113, -9.319560942370408, 21.862274376498366,
    16.41962560452392, 6.692728359044603, 13.877784206224309,
    -25.677379803165586, -3.7015471095197694]],
  [7, [32.144658394157624, -32.505881743954674, 6.2003510227473395,
    10.005341442358084, -42.96827720891113, 5.368635334786342,
    14.877950876350148, -10.367350310389414]],
  [42, [-2.2572875570086026, 20.369677937775027, 36.53863092085102,
    29.55721785094571, -38.035976504796174, 40.197877158741576,
    -3.2819027353095165, -0.2825317466536914]]
];
abschnitt("Die echte Scotophobia-Formel");
for (const [saat, werte] of QUELLE) {
  const welt = macheWeltfeld(saat);
  PUNKTE.forEach(([x, y], i) => nahe(welt.feldBei(x, y), werte[i], 1e-9,
    `Saat ${saat}, Weltpunkt ${x}/${y} entspricht der Quelle`));
}
behaupte(WELTFASSUNG >= 2, "der Netz-Handschlag unterscheidet die neue Weltform");

abschnitt("Wände und Höhen fragen denselben Weltort");
const karte = macheKarte(10, 12), wandProben = [], hoehenProben = [];
const welt = { feldBei(x, y) { wandProben.push([x, y]); return x - y; },
  ebeneBei(x, y) { hoehenProben.push([x, y]); return 1; } };
rastereWaende(karte, welt); roheEbenen(karte, welt);
for (let y = 0; y < karte.hoehe; y++) for (let x = 0; x < karte.breite; x++) {
  const i = karte.index(x, y), m = feldMitte(x, y);
  gleich(JSON.stringify(wandProben[i * 9 + 4]), JSON.stringify([m.x, m.y]),
    `Wandmitte ${x}/${y}`);
  gleich(JSON.stringify(hoehenProben[i]), JSON.stringify([m.x, m.y]),
    `Höhenmitte ${x}/${y}`);
}

abschnitt("Der enge Höhlenausschnitt behält einen trockenen Einstieg");
for (const spielerZahl of [1, 2, 3, 4]) {
  const k = baueLandschaft({ saat: 5, breite: 40, hoehe: 28, spielerZahl,
    bauart: { schwelle: 0.8 } });
  gleich(k.starts.length, spielerZahl, "alle angeforderten Plätze vorhanden");
  for (const s of k.starts) {
    behaupte(!k.blocktBewegung(s.x, s.y), "Start ist begehbar");
    gleich(k.fluessigBei(s.x, s.y), 0, "Start liegt trocken");
  }
}

abschnitt("Der Wasserfallback gibt ein vollständiges Startbecken frei");
/* Gleiche Höhen machen den zusammenhängenden Boden zu einem Becken.
   Die Höhlenform selbst bleibt die Originalform. Vor dem Fallback muss
   die echte Startsuche scheitern; trockene Starts allein beweisen ihn nicht. */
const bauart = { hoehenSchwellen: [0, 0, 1], wandAnhebung: 0 };
const nass = macheKarte(40, 28), beckenWelt = macheWeltfeld(7, bauart);
rastereWaende(nass, beckenWelt); setzeRand(nass); setzeEbenen(nass, beckenWelt);
raeumeAuf(nass); verfuelleNebenraeume(nass); setzeRampen(nass, 7); grabeAbgruende(nass, 7);
const reserve = waehleStarts(nass, 4), becken = beckenGebiete(nass);
gleich(becken.length, 1, "Der kontrollierte Ausschnitt enthält ein einziges Becken");
const boden = becken.flatMap((b) => b.boden);
gleich(setzeWasser(nass, beckenWelt).felder, boden.length,
  "Vor dem Fallback füllt echtes setzeWasser den gesamten Beckenboden");
let keineTrockenen = false;
try { waehleStarts(nass, 1); } catch (e) {
  keineTrockenen = e.message === "waehleStarts: keine erreichbare trockene Kachel";
}
behaupte(keineTrockenen, "Selbst ein einziger Start braucht jetzt zwingend den Fallback");
for (const spielerZahl of [1, 2, 3, 4]) {
  const k = baueLandschaft({ saat: 7, breite: 40, hoehe: 28, spielerZahl, bauart });
  gleich(k.starts.length, spielerZahl, "alle angeforderten Plätze vorhanden");
  gleich(JSON.stringify(k.starts), JSON.stringify(reserve.slice(0, spielerZahl)),
    "Die zuvor trockene Startreserve wird verwendet");
  behaupte(boden.every((i) => k.fluessig[i] === FLUESSIG.keine),
    "Der gesamte Beckenboden wird trocken, auch weit von den Starts entfernt");
  for (const s of k.starts) {
    behaupte(!k.blocktBewegung(s.x, s.y), "Start ist begehbar");
    gleich(k.fluessigBei(s.x, s.y), 0, "Start liegt trocken");
  }
}
ende("Granitgenerierung und Rasteradapter");
