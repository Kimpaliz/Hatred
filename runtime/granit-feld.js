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
  const farben = new Map();

  function wort(wert, matt) {
    const key = `${wert}|${matt ? 1 : 0}`;
    if (!farben.has(key)) farben.set(key, ton(farbwort(wert), matt));
    return farben.get(key);
  }

  function baue(karte, x, y, ring) {
    const grenzen = feldPixelGrenzen(x, y);
    const { x0, y0, breite, hoehe } = grenzen;
    const land = landschaft(karte, ring.felder);
    const pixel = new Uint32Array(breite * hoehe);
    const rollen = new Uint8Array(pixel.length);
    const pb = breite + 2, ph = hoehe + 2;
    const proben = new Array(pb * ph);
    const abstaende = new Float32Array(pb * ph);
    for (let py = -1; py <= hoehe; py++) for (let px = -1; px <= breite; px++) {
      const wx = x0 + px + 0.5, wy = y0 + py + 0.5;
      const f = weltNachFeld(wx, wy);
      const d = distanzZu(land.waende, wx, wy) * (fels(karte, f.x, f.y) ? 1 : -1);
      const p = (py + 1) * pb + px + 1;
      abstaende[p] = d;
      proben[p] = granitProbe(wx, wy, karte.saat >>> 0, d);
    }
    const istWand = fels(karte, x, y), istLoch = loch(karte, x, y);
    const mitte = feldMitte(x, y);
    const rampe = treppe(karte, x, y);
    const ebene = karte.ebeneBei(x, y);
    const nass = NASS[karte.fluessigBei(x, y)];
    for (let py = 0; py < hoehe; py++) for (let px = 0; px < breite; px++) {
      const wx = x0 + px + 0.5, wy = y0 + py + 0.5;
      const f = weltNachFeld(wx, wy);
      if (f.x !== x || f.y !== y) continue;
      const i = py * breite + px, p = (py + 1) * pb + px + 1;
      const s = proben[p], d = abstaende[p];
      /* Wie in Granithöhle: Normalen aus dem echten Materialhöhenfeld.
         Licht kommt von oben; kein geometrischer Versatz und keine Flanke. */
      const nx = (proben[p - 1].hoehe - proben[p + 1].hoehe) * 0.88;
      const ny = (proben[p - pb].hoehe - proben[p + pb].hoehe) * 0.88;
      const norm = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const relief = Math.max(0.44, 0.78 + (nx * -0.28 + ny * -0.32) * norm);
      const ao = istWand ? Math.max(0.08, 1 - Math.max(0, d - 1) / 19)
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
    return { ...grenzen, pixel, rollen, hash: ring.hash, bilder: [null, null] };
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

  function blattFuer(feld, matt) {
    const fach = matt ? 1 : 0;
    if (feld.bilder[fach]) return feld.bilder[fach];
    let blatt = null;
    if (typeof OffscreenCanvas !== "undefined") {
      blatt = new OffscreenCanvas(feld.breite, feld.hoehe);
    } else if (ctx?.canvas?.ownerDocument?.createElement) {
      blatt = ctx.canvas.ownerDocument.createElement("canvas");
      blatt.width = feld.breite; blatt.height = feld.hoehe;
    }
    const ziel = blatt?.getContext("2d");
    if (!ziel || typeof ziel.createImageData !== "function") return null;
    const bild = ziel.createImageData(feld.breite, feld.hoehe);
    for (let i = 0; i < feld.pixel.length; i++) {
      const wert = feld.pixel[i];
      if (wert === 0) continue;
      const hex = wort(wert, matt);
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
      const blatt = blattFuer(feld, gedaempft);
      if (blatt) {
        ctx.imageSmoothingEnabled = false;
        const gross = kamera.vergroesserung;
        ctx.drawImage(blatt, ecke.x, ecke.y, feld.breite * gross, feld.hoehe * gross);
        schnelleBilder++;
        return 1;
      }
    }
    let anzahl = 0;
    for (let py = 0; py < feld.hoehe; py++) {
      let px = 0;
      while (px < feld.breite) {
        const wert = feld.pixel[py * feld.breite + px];
        let bis = px + 1;
        while (bis < feld.breite && feld.pixel[py * feld.breite + bis] === wert) bis++;
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
  function leereSpeicher() { karten = new WeakMap(); farben.clear(); }
  return { zeichneFeld, feldDaten, statistik, leereSpeicher };
}
