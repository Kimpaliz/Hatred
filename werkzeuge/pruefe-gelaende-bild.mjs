/* [Aufgabe: Prüfwesen] Misst Felsdetails, Tritte und Ebenenränder im gemalten Gelände.

   ── Warum die fertigen Bildpunkte ─────────────────────────────────

   Eine neue Farbtabelle beweist weder Fels noch eine richtig gerichtete
   Treppe. Deshalb malt hier der echte Weltzeichner in ein Blatt, das
   seine Rechtecke mitschreibt. Die Kamera begrenzt nur den Ausschnitt
   auf ein Feld; Nachbarn bleiben für Höhen und Rampen in der Karte.
   Ein Übermalen des Nachbarfelds kann dadurch nicht verborgen werden.

   Der alte Zeichner muss an neuen Facetten und Seitenrändern scheitern.
   Flache Nachbarfelder und der Kartenrand sind die Gegenproben: Eine
   Linie um jedes Feld erfüllte den Auftrag nicht. Die Regelkarte bleibt
   unverändert; auch ein zweites Bild darf die Steine nicht umwürfeln.

   ── Arbeitet zusammen mit ────────────────────────────────────────

   `runtime/zeichnen.js` (echter Weltzeichner), `runtime/palette.js`
   (Töne und Nebeldämpfung), `runtime/licht.js` (Kachelmaß),
   `spiel/gitter.mjs` (Karte und Richtungen), `spiel/hoehen.mjs`
   (Aufstiegsvektor), `werkzeuge/pruefe-zeichnen.mjs` (Grundflächen)
   und `werkzeuge/helfer.mjs` (Behauptungen und Rückgabewert). */

import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";
import { BODEN, HINDERNIS, RAMPE, macheKarte, richtungen } from "../spiel/gitter.mjs";
import { rampeZeigtNach } from "../spiel/hoehen.mjs";
import {
  FARBEN, ERINNERT_HELLE, EBENEN_TON, abdunkeln, bodenTon, helligkeit, mische
} from "../runtime/palette.js";
import { KACHEL } from "../runtime/licht.js";
import { macheZeichner, WAND_FLANKE, STRICH_HELLE } from "../runtime/zeichnen.js";

const SEITEN = [
  { name: "Nord", dx: 0, dy: -1 }, { name: "Ost", dx: 1, dy: 0 },
  { name: "Süd", dx: 0, dy: 1 }, { name: "West", dx: -1, dy: 0 }
];
let bilder = 0;
let rechteckMaximum = 0;
let wandMaximum = 0;

function macheProbe({ x = 6, y = 6, gross = 1, saat = 4711, ebene = 1 } = {}) {
  const karte = macheKarte(14, 14);
  karte.saat = saat;
  for (let yy = 0; yy < karte.hoehe; yy++) {
    for (let xx = 0; xx < karte.breite; xx++) {
      karte.setze(xx, yy, { boden: BODEN.stein, ebene });
    }
  }
  const aufrufe = [];
  let farbe = "#000000";
  let weich = true;
  const ctx = {
    canvas: { width: KACHEL * gross, height: KACHEL * gross },
    set fillStyle(wert) { farbe = wert; },
    get fillStyle() { return farbe; },
    set imageSmoothingEnabled(wert) { weich = wert; },
    get imageSmoothingEnabled() { return weich; },
    fillRect(px, py, breite, hoehe) { aufrufe.push({ px, py, breite, hoehe, farbe, weich }); }
  };
  const kamera = {
    vergroesserung: gross,
    feldNachBild(xx, yy) { return { x: (xx - x) * KACHEL * gross, y: (yy - y) * KACHEL * gross }; },
    sichtbareFelder() { return { vonX: x, bisX: x, vonY: y, bisY: y }; }
  };
  const zeichner = macheZeichner({ ctx, kamera });
  function zeichne({ sichtbar = null, erinnert = null, zeit = 0 } = {}) {
    aufrufe.length = 0;
    zeichner.zeichneWelt(karte, sichtbar, erinnert, zeit);
    bilder++;
    rechteckMaximum = Math.max(rechteckMaximum, aufrufe.length);
    return aufrufe.map((r) => ({ ...r }));
  }
  return { karte, x, y, gross, zeichne };
}

function pixelbild(aufrufe, gross = 1) {
  const bild = new Array(KACHEL * KACHEL).fill(null);
  for (const r of aufrufe) {
    for (let y = r.py / gross; y < (r.py + r.hoehe) / gross; y++) {
      for (let x = r.px / gross; x < (r.px + r.breite) / gross; x++) {
        if (x >= 0 && x < KACHEL && y >= 0 && y < KACHEL) bild[y * KACHEL + x] = r.farbe;
      }
    }
  }
  return bild;
}

function pruefeGrenzen(aufrufe, gross, name) {
  const kante = KACHEL * gross;
  behaupte(aufrufe.every((r) => [r.px, r.py, r.breite, r.hoehe].every(Number.isInteger)),
    `${name}: alle Rechtecke haben ganze Bildpunkte`);
  behaupte(aufrufe.every((r) => !r.weich), `${name}: keine geglätteten Rechtecke`);
  behaupte(aufrufe.every((r) => r.px >= 0 && r.py >= 0 && r.px + r.breite <= kante
    && r.py + r.hoehe <= kante), `${name}: kein Rechteck übermalt ein Nachbarfeld`);
}

/* Eine Schnittlinie durch die Mitte einer Feldseite vermeidet Ecken,
   an denen zwei berechtigte Lippen übereinanderliegen dürfen. */
function seitenschnitt(bild, seite) {
  const mitte = Math.floor(KACHEL / 2);
  return Array.from({ length: KACHEL / 2 }, (_, n) => {
    const x = seite.dx < 0 ? n : seite.dx > 0 ? KACHEL - 1 - n : mitte;
    const y = seite.dy < 0 ? n : seite.dy > 0 ? KACHEL - 1 - n : mitte;
    return bild[y * KACHEL + x];
  });
}

abschnitt("Fels: Grundflächen und sichtbare Facetten");
const felsMuster = new Set();
for (const gross of [1, 2, 3]) {
  for (const saat of [7, 4711, 20260907]) {
    const probe = macheProbe({ gross, saat });
    probe.karte.setze(probe.x, probe.y, { hindernis: HINDERNIS.wand });
    const vorher = probe.karte.summe();
    const aufrufe = probe.zeichne();
    wandMaximum = Math.max(wandMaximum, aufrufe.length);
    const name = `Fels mit Saat ${saat}, Vergrößerung ${gross}`;
    pruefeGrenzen(aufrufe, gross, name);
    const oben = aufrufe.filter((r) => r.px === 0 && r.py === 0
      && r.breite === KACHEL * gross && r.hoehe === (KACHEL - WAND_FLANKE) * gross);
    const unten = aufrufe.filter((r) => r.px === 0
      && r.py === (KACHEL - WAND_FLANKE) * gross
      && r.breite === KACHEL * gross && r.hoehe === WAND_FLANKE * gross);
    gleich(oben.length, 1, `${name}: eine unveränderte Oberseiten-Grundfläche`);
    gleich(unten.length, 1, `${name}: eine unveränderte Flanken-Grundfläche`);
    const bild = pixelbild(aufrufe, gross);
    const innen = bild.filter((_, i) => i % KACHEL >= 2 && i % KACHEL <= 13
      && Math.floor(i / KACHEL) >= 2 && Math.floor(i / KACHEL) <= 10);
    behaupte(new Set(innen).size >= 4, `${name}: mindestens vier Töne im Felsinneren`);
    behaupte(aufrufe.length <= 64, `${name}: höchstens 64 Rechtecke für das ganze Feld`);
    felsMuster.add(innen.map((f) => f === oben[0]?.farbe ? "." : "#").join(""));
    gleich(JSON.stringify(probe.zeichne({ zeit: 90 })), JSON.stringify(aufrufe),
      `${name}: Felsdetails bleiben bei anderer Zeit gleich`);
    gleich(probe.karte.summe(), vorher, `${name}: Zeichnen verändert keine Kartenwerte`);
  }
}
behaupte(felsMuster.size >= 2, "Verschiedene Saaten ändern die Form der Felsdetails");

abschnitt("Ebenenränder: vier Seiten, drei Tiefen und echte Öffnungen");
for (const seite of SEITEN) {
  const tiefen = [];
  for (const unterschied of [1, 2, 3]) {
    const probe = macheProbe({ ebene: 3 });
    const flach = pixelbild(probe.zeichne());
    probe.karte.setze(probe.x + seite.dx, probe.y + seite.dy, { ebene: 3 - unterschied });
    const vorher = probe.karte.summe();
    const aufrufe = probe.zeichne();
    const bild = pixelbild(aufrufe);
    const schnitt = seitenschnitt(bild, seite);
    const ohne = seitenschnitt(flach, seite);
    const tiefe = schnitt.reduce((tiefer, farbe, i) => farbe !== ohne[i] ? i + 1 : tiefer, 0);
    tiefen.push(tiefe);
    behaupte(tiefe >= 2, `${seite.name}, ${unterschied} Ebenen: sichtbare Felslippe`);
    pruefeGrenzen(aufrufe, 1, `${seite.name}, ${unterschied} Ebenen`);
    gleich(probe.karte.summe(), vorher, `${seite.name}: Randmalerei verändert keine Höhe`);
    probe.karte.setze(probe.x + seite.dx, probe.y + seite.dy, { ebene: 3 });
    gleich(JSON.stringify(pixelbild(probe.zeichne())), JSON.stringify(flach),
      `${seite.name}: bei gleicher Höhe verschwindet die zusätzliche Lippe`);
  }
  behaupte(tiefen[0] < tiefen[1] && tiefen[1] < tiefen[2],
    `${seite.name}: die Dicke unterscheidet alle drei Höhenunterschiede (${tiefen.join(", ")})`);
}

/* Der Rampencode gehört zum tieferen Feld. Für jede Seite wird sein
   tatsächlicher Rückweg gesucht; die Zeilenparität ist Teil der Karte. */
for (const seite of SEITEN) {
  const probe = macheProbe({ ebene: 2 });
  const nx = probe.x + seite.dx;
  const ny = probe.y + seite.dy;
  probe.karte.setze(nx, ny, { ebene: 1 });
  const geschlossen = seitenschnitt(pixelbild(probe.zeichne()), seite);
  const richtung = richtungen(ny).find((r) => nx + r.dx === probe.x && ny + r.dy === probe.y);
  probe.karte.setze(nx, ny, { rampe: richtung.rampe });
  const offen = seitenschnitt(pixelbild(probe.zeichne()), seite);
  behaupte(JSON.stringify(offen) !== JSON.stringify(geschlossen),
    `${seite.name}: direkte Rampe öffnet die blockhafte Randlippe`);
}

abschnitt("Kartenrand: keine erfundene Stufe nach außerhalb");
for (const seite of SEITEN) {
  const x = seite.dx < 0 ? 0 : seite.dx > 0 ? 13 : 6;
  const y = seite.dy < 0 ? 0 : seite.dy > 0 ? 13 : 6;
  const probe = macheProbe({ x, y, ebene: 3 });
  const aufrufe = probe.zeichne();
  const lippen = aufrufe.filter((r) => {
    if (seite.dy < 0) return r.py === 0 && r.breite === KACHEL && r.hoehe >= 2 && r.hoehe <= 5;
    if (seite.dy > 0) return r.py + r.hoehe === KACHEL && r.breite === KACHEL
      && r.hoehe >= 2 && r.hoehe <= 5;
    if (seite.dx < 0) return r.px === 0 && r.hoehe === KACHEL && r.breite >= 2 && r.breite <= 5;
    return r.px + r.breite === KACHEL && r.hoehe === KACHEL && r.breite >= 2 && r.breite <= 5;
  });
  gleich(lippen.length, 0, `${seite.name}: außen entsteht keine Felslippe`);
}

abschnitt("Treppen: zwölf Richtungsfälle, breite Tritte und richtige Lichtfolge");
for (const y of [6, 7]) {
  for (const richtung of richtungen(y)) {
    for (const gross of [1, 3]) {
      const probe = macheProbe({ y, gross });
      const { x } = probe;
      probe.karte.setze(x, y, { rampe: richtung.rampe });
      probe.karte.setze(x + richtung.dx, y + richtung.dy, { ebene: 2 });
      const hinauf = rampeZeigtNach(probe.karte, x, y);
      const summe = probe.karte.summe();
      const aufrufe = probe.zeichne();
      const bild = pixelbild(aufrufe, gross);
      const name = `${richtung.name}, Zeile ${y}, Vergrößerung ${gross}`;
      pruefeGrenzen(aufrufe, gross, name);
      const grund = bodenTon(BODEN.stein, 1, false);
      const stein = abdunkeln(FARBEN.stufenStein || FARBEN.steinKante, EBENEN_TON[1]);
      const kanten = STRICH_HELLE.map((v) => mische(grund, stein, v));
      const tritte = [0.16, 0.32, 0.48].map((v) => mische(grund, stein, v));
      const gruppen = kanten.map((farbe) => bild.map((f, i) => f === farbe ? i : -1)
        .filter((i) => i >= 0));
      behaupte(gruppen.every((g) => g.length >= 4), `${name}: drei sichtbare Stufenkanten`);
      const mitte = (KACHEL - 1) / 2;
      for (const farbe of tritte) {
        const punkte = bild.filter((f, i) => f === farbe
          && Math.abs((i % KACHEL - mitte) * -hinauf.dy
            + (Math.floor(i / KACHEL) - mitte) * hinauf.dx) <= 3);
        behaupte(punkte.length >= 8, `${name}: Trittfläche ${farbe} ist breiter als ein Strich`);
      }
      if (gruppen.every((g) => g.length > 0)) {
        const lagen = gruppen.map((g) => g.reduce((sum, i) => sum
          + (i % KACHEL) * hinauf.dx + Math.floor(i / KACHEL) * hinauf.dy, 0) / g.length);
        behaupte(lagen[0] > lagen[1] && lagen[1] > lagen[2],
          `${name}: hellere Kanten stehen weiter aufwärts (${lagen.join(", ")})`);
      }
      behaupte(bild.includes(FARBEN.kontur), `${name}: dunkle Setzstufen sind sichtbar`);
      behaupte(aufrufe.length <= 140, `${name}: höchstens 140 Rechtecke für das ganze Feld`);
      gleich(probe.karte.summe(), summe, `${name}: die Rampe ändert keine Regelwerte`);
    }
  }
}

abschnitt("Nebel: alle neuen Details werden gemeinsam gedämpft");
for (const hindernis of [HINDERNIS.wand, HINDERNIS.abgrund]) {
  const probe = macheProbe();
  probe.karte.setze(probe.x, probe.y, { hindernis });
  const hell = probe.zeichne();
  const i = probe.karte.index(probe.x, probe.y);
  const matt = probe.zeichne({ sichtbar: new Set(), erinnert: new Set([i]) });
  gleich(matt.length, hell.length, `${hindernis}: im Nebel bleibt die Detailgeometrie gleich`);
  behaupte(matt.every((r, n) => r.px === hell[n]?.px && r.py === hell[n]?.py
    && r.breite === hell[n]?.breite && r.hoehe === hell[n]?.hoehe
    && r.farbe === abdunkeln(hell[n]?.farbe, ERINNERT_HELLE)),
  `${hindernis}: jedes Detail trägt die normale Nebeldämpfung`);
  const dunkel = probe.zeichne({ sichtbar: new Set(), erinnert: new Set() });
  gleich(dunkel.length, 1, `${hindernis}: ungesehen entsteht nur die Leerfläche`);
  gleich(dunkel[0]?.farbe, FARBEN.leere, `${hindernis}: ungesehen werden keine Details verraten`);
}

abschnitt("Abgrund: gebrochene Lippen und dunkles Inneres");
{
  const probe = macheProbe();
  probe.karte.setze(probe.x, probe.y, { hindernis: HINDERNIS.abgrund });
  const aufrufe = probe.zeichne();
  pruefeGrenzen(aufrufe, 1, "Abgrund");
  const bild = pixelbild(aufrufe);
  const mitte = bild[8 * KACHEL + 8];
  for (const seite of SEITEN) {
    const schnitt = seitenschnitt(bild, seite);
    behaupte(schnitt.some((f) => helligkeit(f) > helligkeit(mitte) + 5),
      `Abgrund ${seite.name}: Lippe sichtbar heller als die Tiefe`);
  }
  behaupte(aufrufe.length <= 64, "Abgrund braucht höchstens 64 Rechtecke pro Feld");
}

console.log(`  Gemessen: ${bilder} Feldbilder, höchstens ${rechteckMaximum} Rechtecke je Feld, `
  + `${wandMaximum} je Felsfeld, ${felsMuster.size} Felsmuster.`);
ende("Geländebild: Fels, Stufen und Ränder");
