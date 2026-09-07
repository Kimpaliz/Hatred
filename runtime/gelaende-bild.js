/* [Aufgabe: Bild] Felsbrüche, Treppenstufen und die Ränder der Höhenebenen.

   ── Warum eine eigene Datei ─────────────────────────────────────────

   Eine Wand braucht große Facetten und feine Brüche, eine Treppe breite
   Trittflächen und dunkle Setzstufen. Die bisherige Körnung allein trägt
   diese Formen nicht. Der Weltzeichner reicht seine Farbspeicher und
   seinen ganzzahligen Rechteckweg; die Regeln werden hier nur gelesen.

   Die Kamera zeigt quadratische Felder. Deshalb liegen Höhenlippen an
   vier Bildseiten, während eine Treppe nach dem echten, zeilenabhängigen
   Aufstiegsvektor des Sechseckgitters ausgerichtet wird. Ihre Raster
   entstehen einmal je Richtung, als zusammengefasste Pixelzeilen.
   Felsmuster entstehen einmal je Variante. Nichts davon wächst mit der
   Kartengröße oder wird je Bild neu gewürfelt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/zeichnen.js` reicht Zeichenweg, Grundtöne und bildliche Höhe;
   `runtime/palette.js` trägt alle Farben, `runtime/licht.js` das Feldmaß;
   `spiel/hoehen.mjs` liefert die wirkliche Rampenrichtung. Die Ausgabe
   prüft `werkzeuge/pruefe-gelaende-bild.mjs` am mitschreibenden Blatt. */

import { FARBEN, KOERNUNG_STUFEN, EBENEN_TON } from "./palette.js";
import { KACHEL } from "./licht.js";
import { HINDERNIS } from "../spiel/gitter.mjs";
import { rampeZeigtNach } from "../spiel/hoehen.mjs";
import { ganzHash } from "../spiel/rauschen.mjs";

const SEITEN = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const FELS_MUSTER = Array.from({ length: 8 }, (_, v) => {
  const x = v % 3;
  const y = (v >> 1) % 3;
  const muster = [
    [1 + x, 2, 6, 3, 0], [7 + x, 5 + y, 5, 3, 1],
    [3, 8, 5, 2, 0], [2 + x, 4, 6, 1, 2],
    [8 + x, 4, 1, 3 + y, 2], [8 + x, 7 + y, 4, 1, 2],
    [4 + y, 2, 3, 1, 3], [11 - x, 9, 2, 1, 3],
    [2 + y, 13, 5, 1, 2], [10 - x, 12, 1, 3, 2]
  ];
  return muster.map(([dx, dy, b, h, art]) => [
    v & 4 ? KACHEL - dx - b : dx, dy, b, h, art
  ]);
});

export function macheGelaendeBild({
  kasten, ton, ebenenTon, mischTon, bodenFarbe, wandTon, koernungsStufe,
  hoeheBei, lagen, laenge, rand, helle
}) {
  const rampenSpeicher = new Map();
  const treppenFarben = new Map();
  const felsFarben = new Array(EBENEN_TON.length * KOERNUNG_STUFEN);

  function male(ecke, x, y, b, h, farbe, gedaempft) {
    kasten(ecke.x, ecke.y, x, y, b, h, ton(farbe, gedaempft));
  }

  function zeichneFels(karte, x, y, ecke, gedaempft) {
    const ebene = karte.ebeneBei(x, y);
    const hash = ganzHash(karte.saat >>> 0, x, y);
    const korn = koernungsStufe(karte, x, y);
    const platz = ebene * KOERNUNG_STUFEN + korn;
    let farben = felsFarben[platz];
    if (!farben) {
      const basis = wandTon(ebene, false, korn);
      farben = [
        mischTon(basis, ebenenTon(FARBEN.steinKante, ebene), 0.35),
        mischTon(basis, ebenenTon(FARBEN.felsSpalt, ebene), 0.35),
        ebenenTon(FARBEN.felsSpalt, ebene),
        mischTon(basis, ebenenTon(FARBEN.felsAder, ebene), 0.55)
      ];
      felsFarben[platz] = farben;
    }
    for (const [dx, dy, b, h, art] of FELS_MUSTER[hash & 7]) {
      male(ecke, dx, dy, b, h, farben[art], gedaempft);
    }
    /* Lichtsaum nur zur offenen Nachbarfläche. Ein zusammenhängender
       Felsblock bekommt dadurch keine hellen Kachelrahmen im Inneren. */
    for (let s = 0; s < SEITEN.length; s++) {
      const [dx, dy] = SEITEN[s];
      if (!karte.drin(x + dx, y + dy)) continue;
      if (karte.hindernisBei(x + dx, y + dy) === HINDERNIS.wand) continue;
      seitenStreifen(ecke, s, 1, 2, 5, 1, farben[3], gedaempft);
      seitenStreifen(ecke, s, 2, 9, 4, 1, farben[0], gedaempft);
    }
  }

  /* Ein Streifen von einer Feldseite nach innen. Jede Zeichnung bleibt
     im eigenen Feld; sie kann weder Nachbarn noch fremden Nebel übermalen. */
  function seitenStreifen(ecke, seite, tiefe, anfang, laenge0, dicke, farbe, matt) {
    if (seite === 0) male(ecke, anfang, tiefe, laenge0, dicke, farbe, matt);
    if (seite === 1) male(ecke, KACHEL - tiefe - dicke, anfang, dicke, laenge0, farbe, matt);
    if (seite === 2) male(ecke, anfang, KACHEL - tiefe - dicke, laenge0, dicke, farbe, matt);
    if (seite === 3) male(ecke, tiefe, anfang, dicke, laenge0, farbe, matt);
  }

  function treppeVerbindet(karte, x, y, nx, ny) {
    const von = rampeZeigtNach(karte, x, y);
    const nach = rampeZeigtNach(karte, nx, ny);
    return (von && x + von.dx === nx && y + von.dy === ny)
      || (nach && nx + nach.dx === x && ny + nach.dy === y);
  }

  function zeichneRaender(karte, x, y, ecke, gedaempft) {
    const hier = hoeheBei(karte, x, y);
    for (let s = 0; s < SEITEN.length; s++) {
      const [dx, dy] = SEITEN[s];
      const nx = x + dx, ny = y + dy;
      if (!karte.drin(nx, ny)) continue;
      const delta = hier - hoeheBei(karte, nx, ny);
      if (delta <= 0 || treppeVerbindet(karte, x, y, nx, ny)) continue;
      const dicke = Math.min(5, 2 + delta);
      const ebene = karte.ebeneBei(x, y);
      const dunkel = ebenenTon(FARBEN.felsSpalt, ebene);
      const licht = ebenenTon(FARBEN.steinKante, ebene);
      const hash = ganzHash(karte.saat >>> 0, x * 4 + s, y);
      const bruch = 4 + (hash % 5);
      seitenStreifen(ecke, s, 0, 0, KACHEL, dicke, dunkel, gedaempft);
      seitenStreifen(ecke, s, dicke - 1, 0, bruch, 1, licht, gedaempft);
      seitenStreifen(ecke, s, dicke - 2, bruch, KACHEL - bruch, 1, licht, gedaempft);
      seitenStreifen(ecke, s, 0, bruch + 1, 2, 2, FARBEN.konturHell, gedaempft);
      if (delta > 1) {
        seitenStreifen(ecke, s, 1, 1, bruch - 1, 1,
          mischTon(dunkel, licht, 0.35), gedaempft);
      }
    }
  }

  function zeichneTiefe(karte, x, y, ecke, gedaempft) {
    male(ecke, 2, 2, 12, 12, FARBEN.leere, gedaempft);
    for (let s = 0; s < SEITEN.length; s++) {
      const [dx, dy] = SEITEN[s];
      if (!karte.drin(x + dx, y + dy)) continue;
      if (karte.hindernisBei(x + dx, y + dy) === HINDERNIS.abgrund) continue;
      seitenStreifen(ecke, s, 1, 2, 12, 1, FARBEN.felsSpalt, gedaempft);
      seitenStreifen(ecke, s, 0, 3, 5, 1, FARBEN.steinKante, gedaempft);
      seitenStreifen(ecke, s, 1, 10, 3, 1, FARBEN.steinKante, gedaempft);
    }
  }

  /* Die Projektion dient nur zum Bauen der acht kleinen Raster. Im
     Zeichenlauf werden waagerechte Streifen aus ganzen Pixeln gelesen. */
  function rampenMuster(dx, dy) {
    const schluessel = (dx + 1) * 3 + dy + 1;
    if (rampenSpeicher.has(schluessel)) return rampenSpeicher.get(schluessel);
    const mitte = (KACHEL - 1) / 2;
    const norm = Math.abs(dx) + Math.abs(dy);
    const halbeBreite = laenge / 2;
    const streifen = [];
    function rolle(x, y) {
      const p = ((x - mitte) * dx + (y - mitte) * dy) / norm + mitte;
      const q = Math.abs((x - mitte) * -dy + (y - mitte) * dx);
      if (p < rand - 2 || p >= KACHEL - rand + 2 || q > halbeBreite + 1) return 0;
      if (q > halbeBreite) return 1;
      if (q > halbeBreite - 1) return 2;
      const n = Math.min(lagen.length - 1, Math.max(0, Math.floor((p - lagen[0] + 2) / 4)));
      const inStufe = p - lagen[n] + 2;
      if (inStufe < 1) return 1;
      if (inStufe >= 3) return 6 + n;
      return 3 + n;
    }
    for (let y = 0; y < KACHEL; y++) {
      let start = 0, art = rolle(0, y);
      for (let x = 1; x <= KACHEL; x++) {
        const neu = x < KACHEL ? rolle(x, y) : -1;
        if (neu === art) continue;
        if (art !== 0) streifen.push({ x: start, y, breite: x - start, art });
        start = x; art = neu;
      }
    }
    rampenSpeicher.set(schluessel, streifen);
    return streifen;
  }

  function zeichneTreppe(karte, x, y, i, ecke, gedaempft) {
    const hinauf = rampeZeigtNach(karte, x, y);
    if (!hinauf) return;
    const key = karte.boden[i] * 4 + karte.ebene[i];
    let farben = treppenFarben.get(key);
    if (!farben) {
      const grund = bodenFarbe(karte.boden[i], karte.ebene[i], false);
      const stein = ebenenTon(FARBEN.stufenStein, karte.ebene[i]);
      farben = [null, FARBEN.kontur, mischTon(grund, stein, 0.32)];
      for (let n = 0; n < lagen.length; n++) {
        farben.push(mischTon(grund, stein, 0.16 + n * 0.16));
      }
      for (let n = 0; n < lagen.length; n++) {
        farben.push(mischTon(grund, stein, helle[lagen.length - 1 - n]));
      }
      treppenFarben.set(key, farben);
    }
    for (const s of rampenMuster(hinauf.dx, hinauf.dy)) {
      male(ecke, s.x, s.y, s.breite, 1, farben[s.art], gedaempft);
    }
  }

  return { zeichneFels, zeichneRaender, zeichneTiefe, zeichneTreppe };
}
