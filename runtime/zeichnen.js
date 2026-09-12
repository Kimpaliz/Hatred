/* [Aufgabe: Bild] Senkrechter Pixelzeichner über Scotophobias Granitfeld.

   ── Warum es das gibt ──────────────────────────────────────────────

   Die endgültige Hexkarte trägt die Regeln. Das Granitfeld baut daraus
   zusammenhängende Oberflächen mit Relief, Wanddistanz und Konturen.
   Der Bildlauf setzt gecachte Flächen, Wesen, Licht und Nebel zusammen.
   Seit W10 (Entscheidung E6, *„Der Blick ist leicht gekippt."*) zeigt
   alles Höhere seine **Südseite** — gemalt auf dem niedrigeren Feld, im
   Streifen unter der Kante, von `runtime/granit-feld.js`. Was weiterhin
   **nicht** passiert: verschobene Höhenflächen und Kachelmuster. Die
   Höhe verändert die Schattierung, niemals die Weltkoordinaten; sonst
   stünde eine Figur im Bild auf einem anderen Feld als in der Regel.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   runtime/granit-feld.js baut das Terrain; spiel/raster.mjs liefert
   die gemeinsame Geometrie für Kamera, Eingabe, Licht und Erzeugung.
   Sprites, Partikel und Oberfläche bleiben eigenständige Bildschichten.
   tests/pruefe-zeichnen.mjs prüft den vollständigen Zeichenweg. */

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
/* ── Der Sockel unter einer Figur (W11, Vorgang #36) ────────────────

   Eine Figur ist 16 × 16 groß und steht auf einem Sechseck, das 16 breit
   und 18,5 hoch ist. Wo genau ihr Fuß hingehört, sagt das Sprite nicht —
   und sobald Figuren über ihr Feld hinausragen (W12), sagt es das noch
   weniger. Der Sockel sagt es: eine flache Scheibe unter der Figur, die
   **ganz** in ihrem Feld liegt.

   Flach und nicht rund, weil der Blick seit Entscheidung E6 leicht
   gekippt ist: Ein Kreis auf dem Boden erscheint dann als Ellipse.

   Die drei Maße sind **nicht** nach Gefühl gewählt, sondern die größte
   Scheibe, die überall hineinpasst. Ein Sechseck ist nur auf Höhe
   seiner Mitte 8 Weltpunkte halbbreit; nach unten läuft es spitz zu,
   und dort sitzt die Scheibe. Eine Scheibe 6 × 3, vier Punkte tief,
   ragte deshalb an vier Stellen ins Nachbarfeld — gemessen am
   12.09.2026 an 281 von 33.220 Bildschirmecken bei Vergrößerung 3.
   Durchgerechnet wurden alle Maße von 4 × 2 bis 7 × 3 und jede Tiefe
   von 1 bis 5; 7 × 2 bei Tiefe 3 ist darunter die Scheibe, die den
   breitesten Saum neben der Figur frei lässt (im Mittel 12,9 von 28
   Randpunkten gegen 10,7 bei 6 × 3).

   Geprüft wird das nicht durch Wegschneiden: `tests/pruefe-zeichnen.mjs`
   rechnet für jede Ecke jedes Punktes nach, dass `bildNachFeld` auf das
   Feld der Figur führt. Würde der Zeichner die Scheibe am Hexrand
   abschneiden, wäre die Prüfung von selbst grün und prüfte nichts mehr
   (Fehlerbuch G1). */
const SOCKEL_BREIT = 7;   /* halbe Breite in Weltpunkten                  */
const SOCKEL_HOCH = 2;    /* halbe Höhe — flach, weil der Blick kippt     */
const SOCKEL_TIEF = 3;    /* so weit unter der Feldmitte: am Fuß, nicht   */
                          /* in der Bauchhöhe der Figur                   */

/* Einmal gerechnet, für alle Figuren gleich: Der Umriss sind die
   Punkte der gefüllten Ellipse, die mindestens einen Nachbarn außerhalb
   haben. So ist der Ring geschlossen, ohne oben und unten aufzureißen —
   was er täte, würde man je Zeile nur links und rechts einen Punkt
   setzen. */
function baueSockel() {
  const drin = (dx, dy) =>
    (dx / SOCKEL_BREIT) ** 2 + (dy / SOCKEL_HOCH) ** 2 <= 1;
  const kern = [], ring = [];
  for (let dy = -SOCKEL_HOCH; dy <= SOCKEL_HOCH; dy++) {
    for (let dx = -SOCKEL_BREIT; dx <= SOCKEL_BREIT; dx++) {
      if (!drin(dx, dy)) continue;
      const rand = !drin(dx - 1, dy) || !drin(dx + 1, dy)
        || !drin(dx, dy - 1) || !drin(dx, dy + 1);
      (rand ? ring : kern).push({ dx, dy: dy + SOCKEL_TIEF });
    }
  }
  return { kern, ring };
}
export const SOCKEL = baueSockel();

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
  /* Dieselbe Auswahl wie `zeichneWesen`: Wer nicht gezeichnet wird,
     bekommt auch keinen Sockel — sonst verriete ein Ring im Dunkeln,
     wo ein Gegner steht. */
  function sichtbaresWesen(karte, w, sichtbar) {
    if (!w || w.lebt === false) return false;
    const fx = Math.round(w.x), fy = Math.round(w.y);
    return karte.drin(fx, fy) && istDrin(sichtbar, karte.index(fx, fy));
  }
  function zeichneSockel(karte, wesenListe, sichtbar = null) {
    if (!karte || !wesenListe) return 0;
    let n = 0;
    for (const w of wesenListe) {
      if (!sichtbaresWesen(karte, w, sichtbar)) continue;
      /* `SOCKEL_TIEF` steckt schon in den Punkten; hier nur die Mitte. */
      const m = feldMitte(w.x, w.y);
      const cx = Math.round(m.x), cy = Math.round(m.y);
      for (const [punkte, farbe] of
        [[SOCKEL.kern, FARBEN.sockelKern], [SOCKEL.ring, FARBEN.sockelRand]]) {
        for (const p of punkte) {
          const s = schirm(cx + p.dx, cy + p.dy);
          kasten(s.x, s.y, 0, 0, 1, 1, farbe);
        }
      }
      n++;
    }
    return n;
  }
  function zeichneWesen(karte, wesenListe, sichtbar = null, farben = SPIELER_FARBEN) {
    if (!karte || !wesenListe) return 0;
    let n = 0;
    for (const w of wesenListe) {
      if (!sichtbaresWesen(karte, w, sichtbar)) continue;
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
    /* Boden → Flanke → Sockel → Figur → Licht: Der Sockel liegt auf dem
       Boden und unter der Figur, nie über ihr. */
    zeichneSockel(karte, zustand.wesen, ansicht.sichtbar);
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
  return { KACHEL, setzeFenster, leere, zeichneWelt, zeichneSockel, zeichneWesen,
    zeichneMerker, bild,
    stosseQuellenAus, kameraFenster, anzahlRechtecke: () => rechtecke,
    gelaendeStatistik: () => gelaende.statistik() };
}
