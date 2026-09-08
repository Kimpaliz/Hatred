/* [Aufgabe: Bild] Senkrechter Pixelzeichner über Scotophobias Granitfeld.

   ── Warum es das gibt ──────────────────────────────────────────────

   Die endgültige Hexkarte trägt die Regeln. Das Granitfeld baut daraus
   zusammenhängende Oberflächen mit Relief, Wanddistanz und Konturen.
   Der Bildlauf setzt gecachte Flächen, Wesen, Licht und Nebel zusammen.
   Keine Wandvorderseiten, verschobenen Höhenflächen oder Kachelmuster:
   Die Höhe verändert die Schattierung, niemals die Weltkoordinaten.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   runtime/granit-feld.js baut das Terrain; spiel/raster.mjs liefert
   die gemeinsame Geometrie für Kamera, Eingabe, Licht und Erzeugung.
   Sprites, Partikel und Oberfläche bleiben eigenständige Bildschichten.
   werkzeuge/pruefe-zeichnen.mjs prüft den vollständigen Zeichenweg. */

import { FARBEN, FLUESSIG_FARBEN, ERINNERT_HELLE, abdunkeln } from "./palette.js";
import { KACHEL } from "./licht.js";
import { SCHLEIM_RAMPE } from "./partikel.js";
import { DINGE, GEGNER_BILDER, HELDEN_BILDER, SPIELER_FARBEN, ZEICHEN }
  from "./sprite-daten.js";
import { RICHTUNG_NORD, bildAnzahl, macheSpriteBild } from "./sprites.js";
import { FLUESSIG, HINDERNIS, RAMPE, richtungen } from "../spiel/gitter.mjs";
import { feldMitte, feldEcken, weltNachFeld } from "../spiel/raster.mjs";
import { macheGranitFeld, feldPixelGrenzen } from "./granit-feld.js";
import { ganzHash } from "../spiel/rauschen.mjs";

export const GLUT_TAKT = 0.25;
export const QUELL_ANTEIL = 12;
const BILD_TAKT = 0.18;
export const DING_NAMEN = [null, null, "saeule", "fass", "kiste", "spiess",
  "altar", "gitter", "fackelsockel", "sarg", "truheZu", null];
const gedaempftSpeicher = new Map();
function ton(hex, gedaempft) {
  if (!gedaempft) return hex;
  let wert = gedaempftSpeicher.get(hex);
  if (wert === undefined) {
    wert = abdunkeln(hex, ERINNERT_HELLE);
    gedaempftSpeicher.set(hex, wert);
  }
  return wert;
}
function istDrin(menge, i) {
  if (menge === null || menge === undefined) return true;
  return typeof menge.has === "function" ? menge.has(i) : !!menge[i];
}
const spriteSpeicher = new Map();

function streifenVon(sprite, richtung, spielerFarbe, bildNummer) {
  let fach = spriteSpeicher.get(sprite);
  if (fach === undefined) {
    fach = new Map();
    spriteSpeicher.set(sprite, fach);
  }
  const schluessel = `${richtung}|${spielerFarbe ? spielerFarbe.name : "-"}|${bildNummer}`;
  let fertig = fach.get(schluessel);
  if (fertig !== undefined) return fertig;

  const bild = macheSpriteBild(sprite, richtung, spielerFarbe || SPIELER_FARBEN[0], bildNummer);
  const streifen = [];
  for (let y = 0; y < bild.hoehe; y++) {
    let x = 0;
    while (x < bild.breite) {
      const farbe = bild.punkte[y * bild.breite + x];
      if (!farbe) { x++; continue; }
      let bis = x + 1;
      while (bis < bild.breite && bild.punkte[y * bild.breite + bis] === farbe) bis++;
      streifen.push({ x, y, breite: bis - x, farbe });
      x = bis;
    }
  }
  fertig = { breite: bild.breite, hoehe: bild.hoehe, streifen };
  fach.set(schluessel, fertig);
  return fertig;
}


export function macheZeichner({ ctx, kamera, lichtwerk = null, partikelwerk = null }) {
  if (!ctx || typeof ctx.fillRect !== "function") {
    throw new Error("macheZeichner braucht eine Zeichenfläche");
  }
  if (!kamera || typeof kamera.feldNachBild !== "function") {
    throw new Error("macheZeichner braucht eine Kamera");
  }
  let letzteFarbe = null, letzteKarte = null, letzteZeit = null, letzterTakt = null;
  let rechtecke = 0;
  const masken = new Map();

  function kasten(sx, sy, dx, dy, breite, hoehe, wert) {
    if (breite <= 0 || hoehe <= 0) return;
    if (letzteFarbe !== wert) { ctx.fillStyle = wert; letzteFarbe = wert; }
    const gross = kamera.vergroesserung;
    ctx.fillRect(sx + dx * gross, sy + dy * gross, breite * gross, hoehe * gross);
    rechtecke++;
  }
  const gelaende = macheGranitFeld({ kasten, ton, ctx, kamera });
  function schirm(px, py) {
    return { x: (Math.round(px) - kamera.eckeX) * kamera.vergroesserung,
      y: (Math.round(py) - kamera.eckeY) * kamera.vergroesserung };
  }
  function setzeFenster(breite, hoehe) {
    if (ctx.canvas) {
      ctx.canvas.width = Math.max(1, Math.round(breite));
      ctx.canvas.height = Math.max(1, Math.round(hoehe));
    }
    ctx.imageSmoothingEnabled = false;
    letzteFarbe = null;
    return kamera.setzeFenster(breite, hoehe);
  }
  function leere() {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = FARBEN.leere;
    letzteFarbe = FARBEN.leere;
    ctx.fillRect(0, 0, kamera.fensterBreite, kamera.fensterHoehe);
    rechtecke++;
    return 1;
  }
  function kameraFenster() {
    return { x: kamera.eckeX, y: kamera.eckeY, vergroesserung: kamera.vergroesserung,
      breite: kamera.fensterBreite, hoehe: kamera.fensterHoehe };
  }

  /* Genau dieselbe Pixelzuordnung wie Terrain und Anklicken. Die Maske
     wird einmal gebaut, nie aus überlappenden Hexpolygonen gemischt. */
  function maske(x, y) {
    const key = x + ":" + y;
    let m = masken.get(key);
    if (m) return m;
    const g = feldPixelGrenzen(x, y), zeilen = [];
    for (let py = g.y0; py < g.y0 + g.hoehe; py++) {
      let start = null;
      for (let px = g.x0; px <= g.x0 + g.breite; px++) {
        const f = weltNachFeld(px + 0.5, py + 0.5);
        const dabei = px < g.x0 + g.breite && f.x === x && f.y === y;
        if (dabei && start === null) start = px;
        if (!dabei && start !== null) {
          zeilen.push({ x: start, y: py, breite: px - start }); start = null;
        }
      }
    }
    m = { ...g, zeilen };
    if (masken.size >= 4096) masken.clear();
    masken.set(key, m);
    return m;
  }
  function fuelleHex(x, y, farbe) {
    for (const s of maske(x, y).zeilen) {
      const p = schirm(s.x, s.y);
      kasten(p.x, p.y, 0, 0, s.breite, 1, farbe);
    }
  }
  function linie(a, b, farbe) {
    let x = Math.round(a.x), y = Math.round(a.y);
    const zx = Math.round(b.x), zy = Math.round(b.y);
    const dx = Math.abs(zx - x), dy = -Math.abs(zy - y);
    const sx = x < zx ? 1 : -1, sy = y < zy ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      const p = schirm(x, y); kasten(p.x, p.y, 0, 0, 1, 1, farbe);
      if (x === zx && y === zy) break;
      const doppelt = 2 * err;
      if (doppelt >= dy) { err += dy; x += sx; }
      if (doppelt <= dx) { err += dx; y += sy; }
    }
  }

  function zeichneGlanz(karte, x, y, i, zeit, matt) {
    const art = karte.fluessig[i], satz = FLUESSIG_FARBEN[art];
    if (!satz || karte.rampe[i] !== RAMPE.keine
      || karte.hindernis[i] === HINDERNIS.wand
      || karte.hindernis[i] === HINDERNIS.abgrund) return;
    const g = maske(x, y);
    for (const s of g.zeilen) {
      if ((s.y & 3) !== 0) continue;
      for (let px = s.x; px < s.x + s.breite; px++) {
        if ((px & 3) !== 0) continue;
        const w = Math.sin(px * 0.23 + s.y * 0.13 + zeit * 1.5)
          + Math.sin(px * 0.09 - s.y * 0.27 - zeit * 0.8);
        if (w < 1.6) continue;
        const p = schirm(px, s.y);
        kasten(p.x, p.y, 0, 0, 1, 1, ton(satz.glanz, matt));
      }
    }
  }
  function zeichneSprite(sprite, ecke, richtung, spielerFarbe, bildNummer, matt) {
    const bild = streifenVon(sprite, richtung, spielerFarbe, bildNummer);
    const vx = Math.floor((KACHEL - bild.breite) / 2);
    const vy = Math.floor((KACHEL - bild.hoehe) / 2);
    for (const s of bild.streifen) {
      kasten(ecke.x, ecke.y, vx + s.x, vy + s.y, s.breite, 1, ton(s.farbe, matt));
    }
  }
  function zeichneWelt(karte, sichtbar = null, erinnert = null, zeit = letzteZeit || 0) {
    if (!karte) return 0;
    ctx.imageSmoothingEnabled = false;
    const f = kamera.sichtbareFelder(1);
    const dinge = [];
    let anzahl = 0;
    for (let y = f.vonY; y <= f.bisY; y++) for (let x = f.vonX; x <= f.bisX; x++) {
      if (!karte.drin(x, y)) continue;
      const i = karte.index(x, y), gesehen = istDrin(sichtbar, i);
      const gemerkt = erinnert != null && istDrin(erinnert, i);
      if (!gesehen && !gemerkt) { fuelleHex(x, y, FARBEN.leere); anzahl++; continue; }
      const g = feldPixelGrenzen(x, y), ecke = schirm(g.x0, g.y0);
      gelaende.zeichneFeld(karte, x, y, i, ecke, !gesehen);
      letzteFarbe = null;
      zeichneGlanz(karte, x, y, i, zeit, !gesehen);
      const name = DING_NAMEN[karte.hindernis[i]];
      if (name && DINGE[name]) {
        const sprite = DINGE[name], bilder = bildAnzahl(sprite);
        const versatz = ganzHash(karte.saat >>> 0, x, y) % bilder;
        const nummer = ((Math.floor(zeit / BILD_TAKT) + versatz) % bilder + bilder) % bilder;
        dinge.push({ sprite, x, y, nummer, matt: !gesehen });
      }
      anzahl++;
    }
    /* Ein 16×16-Sprite kann die Spitze des nächsten Hexfeldes berühren.
       Deshalb erst alle Flächen, danach sämtliche Gegenstände zeichnen. */
    for (const d of dinge) {
      zeichneSprite(d.sprite, kamera.feldNachBild(d.x, d.y),
        RICHTUNG_NORD, null, d.nummer, d.matt);
    }
    return anzahl;
  }
  function zeichneWesen(karte, wesenListe, sichtbar = null, farben = SPIELER_FARBEN) {
    if (!karte || !wesenListe) return 0;
    let n = 0;
    for (const w of wesenListe) {
      if (!w || w.lebt === false || !karte.drin(Math.round(w.x), Math.round(w.y))) continue;
      if (!istDrin(sichtbar, karte.index(Math.round(w.x), Math.round(w.y)))) continue;
      const vorrat = w.seite === "brut" ? GEGNER_BILDER : HELDEN_BILDER;
      const sprite = vorrat[w.art] || GEGNER_BILDER[w.art] || HELDEN_BILDER[w.art];
      if (!sprite) continue;
      const satz = farben[w.spielerPlatz - 1] || SPIELER_FARBEN[0];
      zeichneSprite(sprite, kamera.feldNachBild(w.x, w.y),
        Number.isInteger(w.blick) ? w.blick : RICHTUNG_NORD, satz, 0, false);
      n++;
    }
    return n;
  }
  function zeichneMerker(karte, merker) {
    if (!karte || !merker) return 0;
    let n = 0;
    if (merker.reichweite) {
      const f = kamera.sichtbareFelder(1);
      for (let y = f.vonY; y <= f.bisY; y++) for (let x = f.vonX; x <= f.bisX; x++) {
        if (!istDrin(merker.reichweite, karte.index(x, y))) continue;
        const ecken = feldEcken(x, y), rs = richtungen(y);
        for (let s = 0; s < 6; s++) {
          const r = rs[s], nx = x + r.dx, ny = y + r.dy;
          if (karte.drin(nx, ny) && istDrin(merker.reichweite, karte.index(nx, ny))) continue;
          linie(ecken[(s + 1) % 6], ecken[(s + 2) % 6], FARBEN.apVoll);
        }
        n++;
      }
    }
    const male = (feld, zeichen) => {
      if (!feld || !karte.drin(feld.x, feld.y) || !ZEICHEN[zeichen]) return;
      zeichneSprite(ZEICHEN[zeichen], kamera.feldNachBild(feld.x, feld.y),
        RICHTUNG_NORD, null, 0, false); n++;
    };
    if (Array.isArray(merker.weg)) for (const f of merker.weg) male(f, "wegpunkt");
    if (merker.ziel) male(merker.ziel, "zielkreuz");
    if (Array.isArray(merker.marken)) for (const m of merker.marken) male(m, m.zeichen);
    return n;
  }
  function stosseQuellenAus(karte, sichtbar, zeit) {
    if (!partikelwerk || !karte) return 0;
    const takt = Math.floor((Number.isFinite(zeit) ? zeit : 0) / GLUT_TAKT);
    if (takt === letzterTakt) return 0;
    letzterTakt = takt;
    const f = kamera.sichtbareFelder(1);
    let n = 0;
    for (let y = f.vonY; y <= f.bisY; y++) for (let x = f.vonX; x <= f.bisX; x++) {
      const i = karte.index(x, y), art = karte.fluessig[i];
      if (art !== FLUESSIG.lava && art !== FLUESSIG.schleim) continue;
      if (!istDrin(sichtbar, i)) continue;
      if (ganzHash((karte.saat ^ takt) >>> 0, x, y) % 100 >= QUELL_ANTEIL) continue;
      const p = feldMitte(x, y);
      n += art === FLUESSIG.lava ? partikelwerk.stosseAus("glut", p.x, p.y)
        : partikelwerk.stosseAus("tropfen", p.x, p.y,
          { farben: SCHLEIM_RAMPE, leuchtet: true });
    }
    return n;
  }
  function deckeUngesehenes(karte, sichtbar, erinnert) {
    if (sichtbar == null) return;
    const f = kamera.sichtbareFelder(1);
    for (let y = f.vonY; y <= f.bisY; y++) for (let x = f.vonX; x <= f.bisX; x++) {
      const i = karte.index(x, y);
      if (istDrin(sichtbar, i) || (erinnert != null && istDrin(erinnert, i))) continue;
      fuelleHex(x, y, FARBEN.leere);
    }
  }
  function bild(zustand, ansicht = {}, zeit = 0) {
    const karte = zustand && zustand.karte;
    if (!karte) return 0;
    rechtecke = 0;
    const dt = letzteZeit === null ? 0 : Math.min(0.1, Math.max(0, zeit - letzteZeit));
    letzteZeit = zeit;
    if (lichtwerk && karte !== letzteKarte) {
      letzteKarte = karte; lichtwerk.setzeQuellen(karte.lichter || []);
    }
    if (ansicht.folgt) kamera.folge(ansicht.folgt.x, ansicht.folgt.y, dt === 0, dt || 1 / 60);
    leere();
    zeichneWelt(karte, ansicht.sichtbar, ansicht.erinnert, zeit);
    zeichneWesen(karte, zustand.wesen, ansicht.sichtbar, ansicht.spielerFarben);
    zeichneMerker(karte, ansicht.merker);
    stosseQuellenAus(karte, ansicht.sichtbar, zeit);
    if (partikelwerk) partikelwerk.schritt(dt, karte);
    if (lichtwerk) {
      lichtwerk.rechne(zeit, karte, partikelwerk ? partikelwerk.leuchtende() : []);
      rechtecke += lichtwerk.zeichneAuf(ctx, kameraFenster()); letzteFarbe = null;
    }
    if (partikelwerk) {
      rechtecke += partikelwerk.zeichne(ctx, kameraFenster()); letzteFarbe = null;
    }
    /* Auch Partikel dürfen den Sichtnebel nicht durchstoßen. */
    deckeUngesehenes(karte, ansicht.sichtbar, ansicht.erinnert);
    return rechtecke;
  }
  return { KACHEL, setzeFenster, leere, zeichneWelt, zeichneWesen, zeichneMerker, bild,
    stosseQuellenAus, kameraFenster, anzahlRechtecke: () => rechtecke,
    gelaendeStatistik: () => gelaende.statistik() };
}
