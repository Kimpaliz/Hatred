/* [Aufgabe: Bild] Zusammenhängender Granit als Weltpixel auf dem echten Hexraster.

   ── Warum ein Pixelfeld statt einzelner Wandbilder ──────────────────

   Scotophobias Granithöhle gewinnt ihre Oberfläche aus Weltkoordinaten,
   Abstand zum Fels, Materialhöhe, Normalen und Umgebungsverdeckung.
   Diese Größen bleiben über Feldgrenzen hinweg stetig. Das Regelraster
   bestimmt den Besitzer jedes Pixels, keine gezeichnete Südflanke.
   Treppen haben eine weltweite Stufenphase und keine inneren Wangen.

   Der teure Materialpass läuft einmal je sichtbarem Feld. Eine Signatur
   der drei Nachbarringe erkennt auch direkte Änderungen der Kartenreihen.
   Im Browser werden transparente Feldbilder ungeglättet vergrößert; der
   Rechteckweg bleibt für Prüfbretter und kleine Zeichenflächen erhalten.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/granit-material.js` liefert die ursprünglichen Oberflächen;
   `spiel/raster.mjs` teilt Weltpixel zu, `spiel/gitter.mjs` die Regeln.
   `runtime/zeichnen.js` reicht Kamera, Zeichenblatt und Nebelfarben.
   `werkzeuge/pruefe-granit-feld.mjs` prüft die tatsächlich gemalten Pixel. */

import { granitProbe } from "./granit-material.js";
import { FELD_BREITE, FELD_RADIUS, feldMitte, weltNachFeld } from "../spiel/raster.mjs";
import { HINDERNIS, RAMPE, richtungen, abstand } from "../spiel/gitter.mjs";

/* Auch die ganze Standardkarte mit 56 × 40 Feldern passt hinein.
   Sonst würde jeder Übersichtsframe sämtliche Pixelpuffer erneut erzeugen. */
const SPEICHER_GRENZE = 4096;
const DISTANZ_GRENZE = 28;
const STUFEN_WEITE = FELD_BREITE / 4;
const NACHBAR_RINGE = 3;

/* ── Der Bildmaßstab ────────────────────────────────────────────────
   Janniks Entscheidung E6 vom 12.09.2026: *„3 ja"* — ein Feld ist im
   Bild 32 Bildpunkte breit. Die **Welt** bleibt dabei bei 16 je Feld
   (`spiel/bauart.mjs`), denn der Welterzeuger rechnet in Weltpunkten:
   Wer dort verdoppelt, halbiert die Raumbreite in Feldern und ändert
   damit Spiel, Zustandssumme und Netz. Gemessen am 12.09.2026 mit
   blind verdoppeltem `PIXEL_JE_FELD`: `lauf`, `ki` und `abgrund` rot.

   Deshalb entsteht die Auflösung hier: Jeder Weltpunkt wird `FEIN`-mal
   je Achse abgetastet, der Puffer eines Feldes ist `FEIN²`-mal so groß,
   und `x0`/`y0`/`breite`/`hoehe` bleiben die **Welt**-Boundingbox, die
   Kamera und Prüfungen kennen. Was in Bildpunkten zählt, heißt
   `bildBreite`/`bildHoehe`.

   Gezeichnet wird ganzzahlig (Fehlerbuch D1): Bei einer Vergrößerung,
   die ein Vielfaches von `FEIN` ist, kommt der feine Puffer aufs Blatt
   und jeder Abtastpunkt bekommt gleich viele Bildschirmpunkte. Bei
   einer ungeraden Stufe (1, 3, 5 …) wäre das nicht so — dann wird ein
   grober Puffer gezeichnet, ein Punkt je Weltpunkt. Das ist dem Bild
   von vor dem 12.09.2026 **ähnlich, nicht gleich**: Genommen wird der
   erste der FEIN Abtastpunkte, also die Weltkoordinate `x0 + k + 0,25`
   statt der Weltpunktmitte `x0 + k + 0,5`. Gemessen mit
   `node werkzeuge/miss-bildabdruck.mjs` (640 × 360, Saat 3 — dort wählt
   die Kamera Stufe 1, also genau diesen Weg): 4.680.806 Rechtecke
   vorher gegen 4.918.850 nachher. Beide Wege prüft
   `tests/pruefe-granit-feld.mjs`, jeder auf seiner Zoomstufe.
   Die Automatik wählt gerade Stufen (`runtime/kamera.js`). */
export const FEIN = 2;
const NASS = [null, [23, 46, 58], [63, 17, 20], [24, 53, 31],
  [101, 31, 11], [15, 16, 23]];
const SCHRAEG = Math.sqrt(3) / 2;
const TREPPEN_ACHSEN = [null, [1, 0], [0.5, SCHRAEG], [-0.5, SCHRAEG],
  [-1, 0], [-0.5, -SCHRAEG], [0.5, -SCHRAEG]];

/* Eine Pixelmitte gehört genau einem Hexfeld. Die Boundingbox selbst
   darf Nachbarn überschneiden, denn außerhalb des Besitzes bleibt Alpha 0. */
export function feldPixelGrenzen(x, y) {
  const m = feldMitte(x, y);
  const x0 = Math.floor(m.x - FELD_BREITE / 2);
  const y0 = Math.floor(m.y - FELD_RADIUS);
  return { x0, y0, breite: Math.ceil(m.x + FELD_BREITE / 2) - x0,
    hoehe: Math.ceil(m.y + FELD_RADIUS) - y0 };
}

function fels(karte, x, y) {
  return karte.hindernisBei(x, y) === HINDERNIS.wand;
}

function loch(karte, x, y) {
  return karte.hindernisBei(x, y) === HINDERNIS.abgrund;
}

function treppe(karte, x, y) {
  const art = karte.rampeBei(x, y);
  if (art === RAMPE.keine || karte.blocktBewegung(x, y)) return null;
  const r = richtungen(y).find((n) => n.rampe === art);
  if (!r) return null;
  const nx = x + r.dx, ny = y + r.dy;
  if (karte.blocktBewegung(nx, ny)) return null;
  if (karte.ebeneBei(nx, ny) !== karte.ebeneBei(x, y) + 1) return null;
  /* Die sechs Richtungen sind globale Konstanten. Subtrahierte große
     Feldmitten verlören Stellen und ließen schräge Tritte gegeneinander driften. */
  const [dx, dy] = TREPPEN_ACHSEN[art];
  return { nx, ny, dx, dy, art, ebene: karte.ebeneBei(x, y) };
}

function verbunden(a, x, y, b, nx, ny) {
  return (a && a.nx === nx && a.ny === ny) || (b && b.nx === x && b.ny === y)
    || (a && b && a.art === b.art && a.ebene === b.ebene);
}

/* Gemeinsame Kanten entstehen aus denselben beiden Feldmitten, nicht
   aus separat gerundeten Polygonpunkten. Das gilt für alle sechs Seiten. */
function kante(x, y, nx, ny) {
  const a = feldMitte(x, y), b = feldMitte(nx, ny);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const qx = -(b.y - a.y) * FELD_RADIUS / (2 * FELD_BREITE);
  const qy = (b.x - a.x) * FELD_RADIUS / (2 * FELD_BREITE);
  return { ax: mx - qx, ay: my - qy, bx: mx + qx, by: my + qy };
}

function kantenAbstand(k, x, y) {
  const dx = k.bx - k.ax, dy = k.by - k.ay;
  const t = Math.max(0, Math.min(1, ((x - k.ax) * dx + (y - k.ay) * dy)
    / (dx * dx + dy * dy)));
  return Math.hypot(x - k.ax - t * dx, y - k.ay - t * dy);
}

function umgebung(karte, x, y) {
  const felder = [];
  let hash = karte.saat >>> 0;
  for (let ny = y - NACHBAR_RINGE; ny <= y + NACHBAR_RINGE; ny++) {
    for (let nx = x - NACHBAR_RINGE; nx <= x + NACHBAR_RINGE; nx++) {
      if (abstand(x, y, nx, ny) > NACHBAR_RINGE) continue;
      const h = karte.hindernisBei(nx, ny), e = karte.ebeneBei(nx, ny);
      const r = karte.rampeBei(nx, ny), b = karte.bodenBei(nx, ny);
      const f = karte.fluessigBei(nx, ny);
      for (const wert of [h, e, r, b, f]) hash = Math.imul(hash ^ wert, 16777619) >>> 0;
      felder.push({ x: nx, y: ny, h, e, f });
    }
  }
  return { hash, felder };
}

/* Wie viele Felder weit vom offenen Raum entfernt ein Felsfeld liegt.
   Flutfüllung über die Felder des Rings: alles Offene ist Tiefe 0, sein
   Felsnachbar Tiefe 1, und so weiter. Was der Ring nicht mehr erreicht,
   ist Tiefe 4 oder tiefer — für das Bild dasselbe. */
function felstiefe(karte, felder, mx, my) {
  if (!fels(karte, mx, my)) return 0;
  const drin = new Map();
  for (const f of felder) drin.set(f.x + "," + f.y, f);
  let welle = felder.filter((f) => f.h !== HINDERNIS.wand);
  const gesehen = new Set(welle.map((f) => f.x + "," + f.y));
  for (let tiefe = 1; tiefe <= NACHBAR_RINGE; tiefe++) {
    const naechste = [];
    for (const f of welle) {
      for (const r of richtungen(f.y)) {
        const nx = f.x + r.dx, ny = f.y + r.dy, k = nx + "," + ny;
        if (gesehen.has(k) || !drin.has(k)) continue;
        gesehen.add(k);
        if (nx === mx && ny === my) return tiefe;
        naechste.push(drin.get(k));
      }
    }
    if (!naechste.length) break;
    welle = naechste;
  }
  return NACHBAR_RINGE + 1;
}

function landschaft(karte, felder) {
  const waende = [], brueche = [], ufer = [];
  const bekannt = new Set(felder.map((f) => `${f.x},${f.y}`));
  for (const f of felder) {
    const a = treppe(karte, f.x, f.y);
    for (const r of richtungen(f.y)) {
      const nx = f.x + r.dx, ny = f.y + r.dy;
      if (!bekannt.has(`${nx},${ny}`)) continue;
      if (ny < f.y || (ny === f.y && nx < f.x)) continue;
      const wandHier = f.h === HINDERNIS.wand, wandDort = fels(karte, nx, ny);
      const k = kante(f.x, f.y, nx, ny);
      if (wandHier !== wandDort) waende.push(k);
      if (wandHier || wandDort) continue;
      const e = karte.ebeneBei(nx, ny);
      const b = treppe(karte, nx, ny);
      const grube = (f.h === HINDERNIS.abgrund) !== loch(karte, nx, ny);
      if ((f.e !== e || grube) && !verbunden(a, f.x, f.y, b, nx, ny)) {
        brueche.push({ ...k, x: f.x, y: f.y, nx, ny,
          hoch: Math.max(f.e, e), tief: Math.min(f.e, e), grube });
      }
      if (f.f !== karte.fluessigBei(nx, ny)) ufer.push(k);
    }
  }
  return { waende, brueche, ufer };
}

function distanzZu(kanten, x, y) {
  let distanz = DISTANZ_GRENZE;
  for (const k of kanten) distanz = Math.min(distanz, kantenAbstand(k, x, y));
  return distanz;
}

function farbByte(wert) { return Math.max(0, Math.min(255, Math.round(wert / 5) * 5)); }

function packe(r, g, b) {
  return (farbByte(r) | (farbByte(g) << 8) | (farbByte(b) << 16) | 0xff000000) >>> 0;
}

function farbwort(wert) {
  return `#${(wert & 255).toString(16).padStart(2, "0")}`
    + `${((wert >>> 8) & 255).toString(16).padStart(2, "0")}`
    + `${((wert >>> 16) & 255).toString(16).padStart(2, "0")}`;
}

export function macheGranitFeld({ kasten, ton, ctx = null, kamera = null }) {
  let karten = new WeakMap();
  let neuGebaut = 0, treffer = 0, schnelleBilder = 0, rechtecke = 0;
  /* Zwei Tabellen (normal, gedämpft) mit dem Farbwert selbst als
     Schlüssel. Bis zum 12.09.2026 war der Schlüssel eine Zeichenkette
     `${wert}|${matt}` mit `has` **und** `get` — je Rechteck eine neue
     Zeichenkette und zwei Suchen. Der Rechteckweg ruft das für jedes
     Rechteck jedes Bildes; gemessen mit `node --cpu-prof` über
     `tests/pruefe-app.mjs` war das mit 30,5 s von 133 s der größte
     einzelne Posten. Die Ausgabe ist byteweise dieselbe. */
  const farben = [new Map(), new Map()];

  function wort(wert, matt) {
    const tabelle = farben[matt ? 1 : 0];
    let hex = tabelle.get(wert);
    if (hex === undefined) { hex = ton(farbwort(wert), matt); tabelle.set(wert, hex); }
    return hex;
  }

/* ── Wie massives Gestein aussieht ──────────────────────────────────
   Drei Zahlen, alle gemessen mit `node werkzeuge/miss-wandkontrast.mjs`
   im Fall „flach, Wände ein Feld dick" — dem harten Fall, weil eine
   Gangwand kein Inneres hat, in dem sie dunkel werden könnte.

   `FELS_KANTE` ist der Wert, der zählt: Er steht gegen die 0,70, auf
   die der Boden an derselben Naht fällt. 0,34 gegen 0,70 ist gut das
   Doppelte und übersteht die Streuung von `relief`, die beide Seiten
   trifft — gemessen kippt keine einzige von 302 Grenzen.

   `FELS_REST` ist bewusst der **alte** Tiefwert. Der Umbau soll den
   Rand berichtigen, nicht das Innere: Bei 0,10 wurde massiver Fels um
   0,02 heller, und `tests/pruefe-granit-feld.mjs` schlug an — „(6,6):
   hoher Innenfels hat auch an den Feldkanten keine helle Palette-Wange".
   Sie hatte recht.

   Warum nicht dunkler: Bei 0,30 verliert der Fels seine Körnung.
   `farbByte` rastet jeden Kanal auf Vielfache von 5, und so tief unten
   bleiben davon zu wenige Stufen übrig; `tests/pruefe-koernung.mjs`
   schlägt dann an. Gemessen über zwölf Einstellungen ist 0,34 der
   dunkelste Wert, bei dem die Körnung noch trägt. */
const FELS_KANTE = 0.34;    /* Fels an der Naht, gegen Boden dort 0,70      */

/* ── Und wie er nach innen dunkler wird ─────────────────────────────
   Janniks Wortlaut: *„von der seite aus die man sehen kann bis hin ins
   tiefe gestein wird die textur davon immer dunkler pxliger."*

   Gezählt wird in **Feldern**, nicht in Bildpunkten: Tiefe 1 ist die
   Sichtseite, also ein Felsfeld mit offenem Nachbarn. Weiter als drei
   Ringe schaut das Feld nicht — und das ist Absicht, nicht Faulheit:
   Der Zwischenspeicher je Feld unterschreibt genau diese 37 Felder
   (`nachbarRing`). Eine Tiefe, die weiter blickt, würde lautlos
   veralten, sobald sich etwas außerhalb ändert. Alles ab vier Feldern
   ist deshalb eine einzige Stufe — und die steht auf dem **alten**
   Ruhewert 0,08, denn das tiefe Gestein war nie das Problem.

   `FELS_STUFE` ist der Ruhewert je Tiefe. Der **zweite** Teil von
   Janniks Satz — *„pxliger"* — steht hier bewusst **nicht**. Ein
   Versuch, das Materialrauschen nach innen gröber zu rastern, war
   gemessen wirkungslos: mittlere Krume je Tiefe 1,56 / 2,01 / 2,34 /
   3,47 mit Rasterung gegen 1,56 / 2,04 / 2,53 / 3,24 ohne — bei Tiefe 3
   sogar **feiner**. Die Ursache ist nicht das Raster, sondern der
   Farbumfang: Tiefes Gestein steht bei RGB(10,10,10), und `farbByte`
   rastet ohnehin auf Vielfache von 5. Da ist nichts mehr zu vergröbern.
   Wer es will, muss dem Fels unten **mehr** Farbabstand geben statt
   weniger — das ist eine eigene Arbeit und keine Zeile hier. */
const FELS_STUFE = [0.22, 0.15, 0.11, 0.08];  /* Ruhewert bei Tiefe 1,2,3,4+ */
const FELS_REST = 0.08;     /* tief im Gestein — unverändert gegenüber vorher */
const FELS_TIEFE = 5.5;     /* Bildpunkte, über die es dorthin fällt        */

  function baue(karte, x, y, ring) {
    const grenzen = feldPixelGrenzen(x, y);
    const { x0, y0 } = grenzen;
    /* Ab hier zählen `breite`/`hoehe` in Bildpunkten: FEIN je Weltpunkt. */
    const breite = grenzen.breite * FEIN, hoehe = grenzen.hoehe * FEIN;
    const land = landschaft(karte, ring.felder);
    const pixel = new Uint32Array(breite * hoehe);
    const rollen = new Uint8Array(pixel.length);
    /* Tiefe des Feldes, daraus sein Ruhewert. Einmal je Feld — die
       Flutfüllung läuft nicht je Bildpunkt. */
    const tiefe = fels(karte, x, y) ? felstiefe(karte, ring.felder, x, y) : 0;
    const felsRuhe = FELS_STUFE[tiefe ? Math.min(FELS_STUFE.length, tiefe) - 1 : 0];
    const pb = breite + 2, ph = hoehe + 2;
    const proben = new Array(pb * ph);
    const abstaende = new Float32Array(pb * ph);
    /* Der **Wandabstand** wird je Weltpunkt gerechnet, nicht je feinem
       Abtastpunkt: Er ist ein Distanzfeld mit Steigung 1, der
       Unterschied zweier Abtastpunkte desselben Weltpunkts liegt unter
       einem halben Weltpunkt — unsichtbar. Das Materialrauschen dagegen
       wird fein abgetastet, denn genau das ist die Detailtiefe.
       Gemessen am 12.09.2026: Ohne diese Teilung kostete FEIN 2 das
       3,3-Fache, das Rauschen allein macht davon die Hälfte aus.

       Die **Feldzugehörigkeit** bleibt bewusst je Abtastpunkt
       (`weltNachFeld` in der Malschleife unten). Sie entscheidet, welcher
       Punkt zum Feld gehört — je Weltpunkt gerechnet, bekäme die
       Hexkante wieder die grobe Treppe von vorher, und der feinere
       Puffer wäre an seiner sichtbarsten Stelle wirkungslos. */
    const wb = grenzen.breite + 2, wh = grenzen.hoehe + 2;
    const weltD = new Float32Array(wb * wh);
    for (let wy = -1; wy <= grenzen.hoehe; wy++) for (let wx = -1; wx <= grenzen.breite; wx++) {
      const ax = x0 + wx + 0.5, ay = y0 + wy + 0.5;
      const f = weltNachFeld(ax, ay);
      weltD[(wy + 1) * wb + wx + 1] =
        distanzZu(land.waende, ax, ay) * (fels(karte, f.x, f.y) ? 1 : -1);
    }
    for (let py = -1; py <= hoehe; py++) for (let px = -1; px <= breite; px++) {
      const wx = x0 + (px + 0.5) / FEIN, wy = y0 + (py + 0.5) / FEIN;
      const p = (py + 1) * pb + px + 1;
      const d = weltD[(Math.floor(py / FEIN) + 1) * wb + Math.floor(px / FEIN) + 1];
      abstaende[p] = d;
      proben[p] = granitProbe(wx, wy, karte.saat >>> 0, d);
    }
    const istWand = fels(karte, x, y), istLoch = loch(karte, x, y);
    const mitte = feldMitte(x, y);
    const rampe = treppe(karte, x, y);
    const ebene = karte.ebeneBei(x, y);
    const nass = NASS[karte.fluessigBei(x, y)];
    for (let py = 0; py < hoehe; py++) for (let px = 0; px < breite; px++) {
      const wx = x0 + (px + 0.5) / FEIN, wy = y0 + (py + 0.5) / FEIN;
      const f = weltNachFeld(wx, wy);
      if (f.x !== x || f.y !== y) continue;
      const i = py * breite + px, p = (py + 1) * pb + px + 1;
      const s = proben[p], d = abstaende[p];
      /* Wie in Granithöhle: Normalen aus dem echten Materialhöhenfeld.
         Licht kommt von oben; kein geometrischer Versatz und keine Flanke. */
      /* Die Nachbarproben liegen 1/FEIN Weltpunkt auseinander; mal FEIN
         bleibt die Steigung dieselbe wie bei einem Abtastpunkt je Weltpunkt. */
      const nx = (proben[p - 1].hoehe - proben[p + 1].hoehe) * 0.88 * FEIN;
      const ny = (proben[p - pb].hoehe - proben[p + pb].hoehe) * 0.88 * FEIN;
      const norm = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const relief = Math.max(0.44, 0.78 + (nx * -0.28 + ny * -0.32) * norm);
      /* Massives Gestein verliert von der Naht an Licht — je tiefer,
         desto weniger kommt zurück. Bis zum 12.09.2026 stand hier das
         Gegenteil: `1 - (d-1)/19` ist an der Naht **1,00** und erreicht
         0,08 erst neunzehn Bildpunkte tief. Eine Gangwand ist ein Feld
         dick, also sechzehn Bildpunkte — sie wurde nie tief genug, um
         dunkel zu werden, und stand mit 1,00 gegen den Boden davor, den
         derselbe Term auf 0,70 abdunkelt. Der Fels war damit um den
         Faktor 1,43 **heller** als der Boden, und zwar genau an der
         Stelle, an der man die Wand erkennen soll. Gemessen war er in
         77,8 % der Grenzen der hellere von beiden. */
      const ao = istWand
        ? felsRuhe + (FELS_KANTE - felsRuhe) * Math.exp(-Math.max(0, d) / FELS_TIEFE)
        : 0.70 + 0.30 * Math.min(1, -d / 7);
      let faktor = relief * ao * (0.63 + ebene * 0.27);
      let r = s.r, g = s.g, b = s.b;
      let rolle = istWand ? 1 : 0;
      if (nass && !istWand && !istLoch) {
        const korn = 0.88 + s.hoehe * 0.013;
        r = nass[0] * korn; g = nass[1] * korn; b = nass[2] * korn;
        faktor = 0.78 + ebene * 0.18;
        if (distanzZu(land.ufer, wx, wy) < 1.5) faktor *= 0.72;
      }
      if (istLoch) {
        r = 7; g = 9; b = 13; faktor = 0.75 + Math.min(1, s.hoehe * 0.02);
        rolle = 2;
      }
      if (rampe) {
        /* Weltphase statt Feldphase: gemeinsame Tritte reichen ohne
           eingefügte Wange bis an alle benachbarten Treppenfelder. */
        const proj = wx * rampe.dx + wy * rampe.dy;
        const phase = ((proj % STUFEN_WEITE) + STUFEN_WEITE) % STUFEN_WEITE;
        const stufe = phase < 0.80 ? 0.30 : phase < 1.65 ? 1.37 : 0.96;
        r = 95 + s.r * 0.18; g = 91 + s.g * 0.18; b = 80 + s.b * 0.18;
        faktor = stufe * (0.64 + ebene * 0.18);
        rolle = 5;
      }
      /* Eine Treppe darf seitliche echte Kliffs nicht übermalen.
         Kompatible Nachbarläufe und ihr oberer Anschluss fehlen bereits
         im Kantenpuffer; dort entsteht keine künstliche Zwischenwange. */
      if (!istWand) {
        const rx = wx - mitte.x, ry = wy - mitte.y;
        const naechsteSeite = FELD_BREITE / 2 - Math.max(Math.abs(rx),
          Math.abs(rx * 0.5 + ry * SCHRAEG), Math.abs(-rx * 0.5 + ry * SCHRAEG));
        for (const k of land.brueche) {
          if (!((k.x === x && k.y === y) || (k.nx === x && k.ny === y))) continue;
          const distanz = kantenAbstand(k, wx, wy);
          /* Ein Seitenkliff darf nicht quer in den benachbarten offenen
             Treppeneingang auslaufen. Jeder Randpixel folgt seiner nächsten Seite. */
          if (distanz > naechsteSeite + 0.01) continue;
          if (ebene >= k.hoch && !istLoch && distanz < 1.15) {
            r = 108 + ebene * 12; g = 103 + ebene * 12; b = 91 + ebene * 11;
            faktor = 1; rolle = 3; break;
          }
          if ((ebene <= k.tief || istLoch) && distanz < 2 + k.hoch - k.tief) {
            faktor *= distanz < 1.2 ? 0.21 : 0.57; rolle = 4;
          }
        }
      }
      pixel[i] = packe(r * faktor, g * faktor, b * faktor);
      rollen[i] = rolle;
    }
    neuGebaut++;
    return { ...grenzen, fein: FEIN, bildBreite: breite, bildHoehe: hoehe,
      pixel, rollen, hash: ring.hash, bilder: [null, null, null, null] };
  }

  function feldDaten(karte, x, y) {
    let speicher = karten.get(karte);
    if (!speicher) { speicher = new Map(); karten.set(karte, speicher); }
    const key = karte.index(x, y), ring = umgebung(karte, x, y);
    let feld = speicher.get(key);
    if (!feld || feld.hash !== ring.hash) feld = baue(karte, x, y, ring);
    else treffer++;
    speicher.delete(key);
    speicher.set(key, feld);
    if (speicher.size > SPEICHER_GRENZE) speicher.delete(speicher.keys().next().value);
    return feld;
  }

  /* Ein Blatt je Feld, in vier Fächern: fein/grob × normal/gedämpft.
     `grob` nimmt jeden FEIN-ten Abtastpunkt — ein Bildpunkt je Weltpunkt —
     für Zoomstufen, bei denen der feine Puffer keine ganzen
     Bildschirmpunkte ergäbe. */
  function blattFuer(feld, matt, grob = false) {
    const fach = (matt ? 1 : 0) + (grob ? 2 : 0);
    if (feld.bilder[fach]) return feld.bilder[fach];
    const schritt = grob ? feld.fein : 1;
    const breite = feld.bildBreite / schritt, hoehe = feld.bildHoehe / schritt;
    let blatt = null;
    if (typeof OffscreenCanvas !== "undefined") {
      blatt = new OffscreenCanvas(breite, hoehe);
    } else if (ctx?.canvas?.ownerDocument?.createElement) {
      blatt = ctx.canvas.ownerDocument.createElement("canvas");
      blatt.width = breite; blatt.height = hoehe;
    }
    const ziel = blatt?.getContext("2d");
    if (!ziel || typeof ziel.createImageData !== "function") return null;
    const bild = ziel.createImageData(breite, hoehe);
    for (let py = 0; py < hoehe; py++) for (let px = 0; px < breite; px++) {
      const wert = feld.pixel[(py * schritt) * feld.bildBreite + px * schritt];
      if (wert === 0) continue;
      const hex = wort(wert, matt), i = py * breite + px;
      bild.data[i * 4] = Number.parseInt(hex.slice(1, 3), 16);
      bild.data[i * 4 + 1] = Number.parseInt(hex.slice(3, 5), 16);
      bild.data[i * 4 + 2] = Number.parseInt(hex.slice(5, 7), 16);
      bild.data[i * 4 + 3] = 255;
    }
    ziel.putImageData(bild, 0, 0);
    feld.bilder[fach] = blatt;
    return blatt;
  }

  function zeichneFeld(karte, x, y, i, ecke, gedaempft) {
    const feld = feldDaten(karte, x, y);
    if (ctx && kamera && typeof ctx.drawImage === "function") {
      const gross = kamera.vergroesserung;
      /* Fein nur, wenn jeder Abtastpunkt ganze Bildschirmpunkte bekommt. */
      const grob = gross % feld.fein !== 0;
      const blatt = blattFuer(feld, gedaempft, grob);
      if (blatt) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(blatt, ecke.x, ecke.y, feld.breite * gross, feld.hoehe * gross);
        schnelleBilder++;
        return 1;
      }
    }
    /* Der Rechteckweg kennt nur Weltpunkte: ein Abtastpunkt je Weltpunkt. */
    let anzahl = 0;
    const s = feld.fein, bb = feld.bildBreite, pixel = feld.pixel;
    for (let py = 0; py < feld.hoehe; py++) {
      const zeile = (py * s) * bb;
      let px = 0;
      while (px < feld.breite) {
        const wert = pixel[zeile + px * s];
        let bis = px + 1;
        while (bis < feld.breite && pixel[zeile + bis * s] === wert) bis++;
        if (wert) {
          kasten(ecke.x, ecke.y, px, py, bis - px, 1, wort(wert, gedaempft));
          anzahl++;
        }
        px = bis;
      }
    }
    rechtecke += anzahl;
    return anzahl;
  }

  function statistik() { return { neuGebaut, treffer, schnelleBilder, rechtecke }; }
  function leereSpeicher() { karten = new WeakMap(); farben[0].clear(); farben[1].clear(); }
  return { zeichneFeld, feldDaten, statistik, leereSpeicher };
}
