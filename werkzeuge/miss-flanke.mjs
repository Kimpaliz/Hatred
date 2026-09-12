/* [Aufgabe: Werkzeug] Misst die Flanke: Trägt jede Kante, hinter der
   etwas Höheres steht, wirklich eine Südseite — und liest sie sich als
   eigene Fläche?

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Die Abnahme von W10 (Vorgang #35) nennt vier Zahlen, und keine davon
   lässt sich ansehen. „Sieht 3D aus" ist eine Meinung; „unter 100 % der
   höheren Kanten liegen mindestens 5 Bildpunkte Flanke" ist eine
   Messung. Diese Datei rechnet genau die vier nach:

   **Abdeckung.** Wie viele der Kanten, hinter denen ein höheres Feld
   steht, tragen eine Flanke von mindestens `MINDEST_HOCH` Bildpunkten.
   Gezählt wird an mehreren Stellen je Kante, nicht nur in der Mitte:
   Eine Flanke, die an der Kantenmitte sitzt und an den Enden ausfranst,
   wäre sonst grün.

   **Treppen.** Dieselbe Zählung über Kanten, an denen eine Treppe
   hinaufführt. Dort gehört **keine** Flanke hin — man geht da hoch.

   **Sprung durch Körnung.** Der Helligkeitsabstand zwischen der Flanke
   und der Oberseite über ihr, geteilt durch das Rauschen innerhalb
   einer Bodenfläche. Unter 1 ginge die Flanke im Rauschen unter.

   Gezählt wird der **Betrag**, nicht die Richtung. Die Abnahme von W10
   verlangte zuerst „dunkler als die Oberseite" und wurde am 12.09.2026
   auf „hebt sich ab" geändert — mit dem Grund in `docs/ROADMAP.md`
   W10: Unter massivem Fels (Oberseite gemessen 23 von 255) müsste eine
   dunklere Flanke bei ~8 liegen, so dunkel wie ein Abgrund (8,94), und
   die Wand verliert dabei ihren Körper. Das Vorzeichen wird weiter
   ausgegeben, getrennt nach Etage und Fels: Es soll sich aus einem
   Grund drehen, nicht aus Zufall.

   **Farbfamilie.** Der Abstand in der Farbe, nicht in der Helligkeit:
   `(r − b) / Helligkeit` für die Flanke gegen denselben Wert für den
   Boden darunter. Granit ist grau (der Wert liegt nahe null), Erde ist
   warm (deutlich darüber). Ohne diese Zahl könnte man die Abnahme mit
   einem grauen Schatten erfüllen — und genau das wäre kein Seitenbild,
   sondern eine dunklere Stelle im Boden.

   Gemessen wird im **Bildpuffer**, also ohne Licht und ohne Nebel.

   ── Wie man es ruft ────────────────────────────────────────────────

       node werkzeuge/miss-flanke.mjs [saat]

   Die Ausgabe gehört außerhalb des Projekts (Fehlerbuch C2).

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/granit-feld.js` (`macheGranitFeld`, `feldDaten`, Rolle 6 ist
   die Flanke), `spiel/raster.mjs` (`feldMitte`, `weltNachFeld`),
   `spiel/gitter.mjs` (`HINDERNIS`, `RAMPE`, `richtungen`),
   `spiel/landschaft.mjs` (`baueLandschaft`) und
   `werkzeuge/miss-wandkontrast.mjs`, dessen Abnahme weiter gelten muss. */

import { macheGranitFeld } from "../runtime/granit-feld.js";
import { baueLandschaft } from "../spiel/landschaft.mjs";
import { HINDERNIS, RAMPE, richtungen } from "../spiel/gitter.mjs";
import { feldMitte, FELD_BREITE, FELD_RADIUS } from "../spiel/raster.mjs";

const SAAT = Number(process.argv[2]) || 4711;
const BREITE = 56, HOEHE = 40;
const RAND = 3;
/* Die Abnahme von W10, wörtlich: „mindestens 5 Bildpunkte". */
const MINDEST_HOCH = 5;
/* An wie vielen Stellen je Kante gezählt wird. Die Enden bleiben außen
   vor: Dort treffen drei Felder zusammen, und welches dort gewinnt,
   ist eine Frage von Bruchteilen eines Bildpunktes. */
const STELLEN = [0.25, 0.375, 0.5, 0.625, 0.75];
const FLANKE = 6;               /* die Rolle, die die Flanke trägt */

const hell = (p) => (p & 255) * 0.2126 + ((p >>> 8) & 255) * 0.7152
  + ((p >>> 16) & 255) * 0.0722;
const rotBlau = (p) => ((p & 255) - ((p >>> 16) & 255)) / Math.max(1, hell(p));
const mittel = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

const karte = baueLandschaft({ saat: SAAT, breite: BREITE, hoehe: HOEHE, spielerZahl: 2 });
const gelaende = macheGranitFeld({ kasten() {}, ton: (farbe) => farbe });

const fels = (x, y) => karte.hindernisBei(x, y) === HINDERNIS.wand;
const loch = (x, y) => karte.hindernisBei(x, y) === HINDERNIS.abgrund;
const bildhoehe = (x, y) => karte.ebeneBei(x, y) + (fels(x, y) ? 1.5 : 0);

function steigtHinauf(x, y) {
  const rampe = karte.rampeBei(x, y);
  if (rampe === RAMPE.keine || karte.blocktBewegung(x, y)) return false;
  const r = richtungen(y).find((n) => n.rampe === rampe);
  if (!r) return false;
  const nx = x + r.dx, ny = y + r.dy;
  return !karte.blocktBewegung(nx, ny) && karte.ebeneBei(nx, ny) === karte.ebeneBei(x, y) + 1;
}

/* Ein Bildpunkt eines Feldes, in Weltkoordinaten nachgeschlagen. Gibt
   null zurück, wenn der Punkt nicht diesem Feld gehört. */
function punktVon(feld, wx, wy) {
  const fein = feld.fein || 1;
  const px = Math.floor((wx - feld.x0) * fein), py = Math.floor((wy - feld.y0) * fein);
  const bb = feld.bildBreite || feld.breite, bh = feld.bildHoehe || feld.hoehe;
  if (px < 0 || py < 0 || px >= bb || py >= bh) return null;
  const i = py * bb + px;
  return feld.pixel[i] ? { farbe: feld.pixel[i], rolle: feld.rollen[i] } : null;
}

/* Wie viele Bildpunkte Flanke unter dieser Stelle der Kante liegen:
   senkrecht nach unten zählen, solange die Rolle 6 trägt. */
function flankenHoehe(feld, wx, kantenY) {
  const fein = feld.fein || 1;
  let hoch = 0;
  for (let k = 1; k <= 16; k++) {
    const p = punktVon(feld, wx, kantenY + k / fein);
    if (!p || p.rolle !== FLANKE) break;
    hoch++;
  }
  return hoch;
}

const SCHRAEG = Math.sqrt(3) / 2;
function kanteZwischen(x, y, nx, ny) {
  const a = feldMitte(x, y), b = feldMitte(nx, ny);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const qx = -(b.y - a.y) * FELD_RADIUS / (2 * FELD_BREITE);
  const qy = (b.x - a.x) * FELD_RADIUS / (2 * FELD_BREITE);
  return { ax: mx - qx, ay: my - qy, bx: mx + qx, by: my + qy };
}

/* Getrennt nach dem, was über der Kante steht: Über einer Etage ist die
   Oberseite heller Boden, über massivem Fels ist sie dunkles Gestein.
   Beides in einen Topf zu werfen verwischt genau den Unterschied, um
   den es hier geht. */
const art = () => ({ sprung: [], familieFlanke: [], familieBoden: [], hoehen: [] });
const nachArt = { etage: art(), fels: art() };
const hoehen = [], sprung = [], familieFlanke = [], familieBoden = [];
let kantenGesamt = 0, kantenMitFlanke = 0, treppenKanten = 0, treppenMitFlanke = 0;
let bodenKorn = 0, bodenN = 0;

/* Die Körnung des Bodens: dieselbe Größe, mit der `miss-wandkontrast`
   den Wandsprung teilt — die mittlere Abweichung innerhalb einer
   Bodenfläche, ohne Flanke und ohne Kontur. */
{
  const werte = [];
  for (let y = RAND; y < karte.hoehe - RAND; y++) {
    for (let x = RAND; x < karte.breite - RAND; x++) {
      if (karte.hindernisBei(x, y) !== HINDERNIS.keins) continue;
      const feld = gelaende.feldDaten(karte, x, y);
      const eigen = [];
      for (let i = 0; i < feld.pixel.length; i++) {
        if (feld.pixel[i] && feld.rollen[i] === 0) eigen.push(hell(feld.pixel[i]));
      }
      if (eigen.length < 40) continue;
      const m = mittel(eigen);
      werte.push(Math.sqrt(mittel(eigen.map((v) => (v - m) * (v - m)))));
    }
  }
  bodenKorn = mittel(werte);
  bodenN = werte.length;
}

for (let y = RAND; y < karte.hoehe - RAND; y++) {
  for (let x = RAND; x < karte.breite - RAND; x++) {
    if (loch(x, y)) continue;
    const unten = gelaende.feldDaten(karte, x, y);
    const meine = bildhoehe(x, y);
    for (const r of richtungen(y)) {
      if (r.dy >= 0) continue;
      const nx = x + r.dx, ny = y + r.dy;
      if (!karte.drin(nx, ny)) continue;
      if (bildhoehe(nx, ny) <= meine + 0.4) continue;

      /* Dieselbe Auskunft wie `treppe()` in `runtime/granit-feld.js`:
         Eine Rampe zählt nur, wenn sie wirklich hinaufführt — Ziel
         begehbar und genau eine Ebene höher. Ein Rampenzeichen, das
         nirgendwo hinführt, ist Boden, und dort gehört eine Flanke hin. */
      const treppe = steigtHinauf(x, y);
      const k = kanteZwischen(x, y, nx, ny);
      const oben = gelaende.feldDaten(karte, nx, ny);
      let stellenMitFlanke = 0, stellen = 0;
      for (const anteil of STELLEN) {
        const wx = k.ax + anteil * (k.bx - k.ax);
        const ky = k.ay + anteil * (k.by - k.ay);
        const hoch = flankenHoehe(unten, wx, ky);
        stellen++;
        if (hoch >= MINDEST_HOCH) stellenMitFlanke++;
        if (treppe) continue;
        const eimer = nachArt[fels(nx, ny) ? "fels" : "etage"];
        hoehen.push(hoch);
        eimer.hoehen.push(hoch);
        if (hoch === 0) continue;
        /* Der Vergleich: die Flanke gegen die Oberseite unmittelbar
           über derselben Stelle, und gegen den Boden unter ihr. */
        const fein = unten.fein || 1;
        const pF = punktVon(unten, wx, ky + 2 / fein);
        const pO = punktVon(oben, wx, ky - 2 / fein);
        const pB = punktVon(unten, wx, ky + (hoch + 3) / fein);
        if (pF && pF.rolle === FLANKE && pO) {
          const wert = hell(pO.farbe) - hell(pF.farbe);
          sprung.push(wert);
          eimer.sprung.push(wert);
        }
        if (pF && pF.rolle === FLANKE && pB && pB.rolle === 0) {
          familieFlanke.push(rotBlau(pF.farbe));
          familieBoden.push(rotBlau(pB.farbe));
          eimer.familieFlanke.push(rotBlau(pF.farbe));
          eimer.familieBoden.push(rotBlau(pB.farbe));
        }
      }
      if (treppe) {
        treppenKanten++;
        if (stellenMitFlanke > 0) treppenMitFlanke++;
      } else {
        kantenGesamt++;
        if (stellenMitFlanke === stellen) kantenMitFlanke++;
      }
    }
  }
}

const anteil = (a, b) => (b ? (100 * a / b).toFixed(1) : "—");
const sprungMittel = mittel(sprung);
const dunkler = sprung.filter((v) => v > 0).length;
/* Abheben heißt: der Betrag reicht über die Körnung hinaus. Die
   Richtung steht darunter, getrennt nach Etage und Fels. */
const ABHEBEN = 1.5;
const hebtAb = (werte) => werte.filter((v) => Math.abs(v) >= ABHEBEN * bodenKorn).length;

console.log(`Flanke, Saat ${SAAT}, Karte ${BREITE} × ${HOEHE}, Rand ${RAND} ausgelassen.`);
console.log("Gemessen im Bildpuffer — ohne Licht und ohne Nebel.\n");
console.log(`Kanten mit einem höheren Feld dahinter: ${kantenGesamt}`);
console.log(`  mit Flanke ≥ ${MINDEST_HOCH} Bildpunkten an allen ${STELLEN.length} Stellen: `
  + `${anteil(kantenMitFlanke, kantenGesamt)} %  (Abnahme: 100)`);
console.log(`  mittlere Flankenhöhe: ${mittel(hoehen).toFixed(2)} Bildpunkte  `
  + `(n=${hoehen.length})`);
console.log(`\nTreppenkanten: ${treppenKanten}`);
console.log(`  davon mit Flanke: ${anteil(treppenMitFlanke, treppenKanten)} %  (Abnahme: 0)`);
console.log(`\nFlanke gegen die Oberseite darüber (n=${sprung.length}):`);
console.log(`  mittlerer Sprung: ${sprungMittel.toFixed(2)} von 255  `
  + `(positiv = die Flanke ist dunkler)`);
console.log(`  Körnung im Boden: ${bodenKorn.toFixed(2)}  (n=${bodenN} Felder)`);
console.log(`  Sprung durch Körnung: ${(sprungMittel / bodenKorn).toFixed(2)}  `
  + `(dem Betrag nach ${(Math.abs(sprungMittel) / bodenKorn).toFixed(2)}; Abnahme: ≥ ${ABHEBEN})`);
console.log(`  die Flanke hebt sich ab an ${anteil(hebtAb(sprung), sprung.length)} % der Stellen  `
  + `(Abnahme: ≥ 95)`);
console.log(`  davon dunkler als die Oberseite: ${anteil(dunkler, sprung.length)} %  `
  + `(keine Abnahme — Richtung, siehe Kopfnotiz)`);
console.log(`\nFarbfamilie (r − b) je Helligkeit, n=${familieFlanke.length}:`);
console.log(`  Flanke: ${mittel(familieFlanke).toFixed(3)}`);
console.log(`  Boden darunter: ${mittel(familieBoden).toFixed(3)}`);
console.log(`  Abstand: ${(mittel(familieFlanke) - mittel(familieBoden)).toFixed(3)}  `
  + `(0 hieße: dieselbe Farbfamilie, nur dunkler)`);

console.log("\nGetrennt nach dem, was über der Kante steht:");
for (const [name, e] of [["unter einer Etage", nachArt.etage], ["unter Fels", nachArt.fels]]) {
  const m = mittel(e.sprung);
  const dunkel = e.sprung.filter((v) => v > 0).length;
  console.log(`  ${name} (n=${e.sprung.length}):`);
  console.log(`    Flankenhöhe ${mittel(e.hoehen).toFixed(2)}  ·  Sprung ${m.toFixed(2)}  ·  `
    + `durch Körnung ${(m / bodenKorn).toFixed(2)}  ·  `
    + `hebt sich ab in ${anteil(hebtAb(e.sprung), e.sprung.length)} %  ·  `
    + `dunkler in ${anteil(dunkel, e.sprung.length)} %`);
  console.log(`    Farbabstand zum Boden darunter: `
    + `${(mittel(e.familieFlanke) - mittel(e.familieBoden)).toFixed(3)}`);
}
