/* [Aufgabe: Prüfwesen] Der wirkliche Topdown-Zeichenweg mit Licht, Wesen und Sichtnebel.

   ── Warum es das gibt ──────────────────────────────────────────────

   Gemessen werden ausgegebene Pixel und Zeichenaufrufe. Alte Vorgaben
   für Südflanken, Schachbrettboden und einzelne Treppen widersprechen
   der senkrechten Granithöhle. Die bleibenden Verträge sind harte Pixel,
   gleiche Bilder bei gleicher Zeit und ein Sichtnebel über allen Effekten.
   Sprites müssen ihre Farbe, Richtung und Anzahl auch im neuen Bild behalten.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/zeichnen.js` ist der Prüfling, Kamera und Raster werden echt
   geladen. Zwei benachbarte Bildprüfungen importieren das mitschreibende
   Blatt aus dieser Datei; der direkte Einstieg allein startet Prüfungen.
   `pruefe-granit-feld.mjs` misst Treppennähte und den Geländeaufbau. */

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { abschnitt, behaupte, gleich, tiefGleich, wirft, ende } from "./helfer.mjs";
import { macheKarte, BODEN, HINDERNIS, FLUESSIG } from "../spiel/gitter.mjs";
import { feldMitte, weltNachFeld } from "../spiel/raster.mjs";
import { macheKamera } from "../runtime/kamera.js";
import { macheZeichner, GLUT_TAKT } from "../runtime/zeichnen.js";
import { FARBEN, helligkeit } from "../runtime/palette.js";
import { DINGE, HELDEN_BILDER, SPIELER_FARBEN } from "../runtime/sprite-daten.js";
import { macheSpriteBild } from "../runtime/sprites.js";

export function probeKarte(breite = 12, hoehe = 12, saat = 7) {
  const karte = macheKarte(breite, hoehe);
  karte.saat = saat;
  for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
    karte.setze(x, y, { boden: BODEN.stein, ebene: 1, hindernis: HINDERNIS.keins });
  }
  return karte;
}

/* Nur tatsächlich gemalte Bildschirmpixel werden gespeichert. Ein
   negativer Rechteckanfang ist erlaubt; abgeschnitten wird am Fenster. */
export function bildProbe(karte, optionen = {}) {
  const aufrufe = [], pixel = new Map();
  const ctx = { canvas: { width: 192, height: 192 }, fillStyle: "#000000",
    imageSmoothingEnabled: true,
    fillRect(x, y, b, h) {
      aufrufe.push([x, y, b, h, this.fillStyle, this.imageSmoothingEnabled]);
      for (let py = Math.max(0, y); py < Math.min(192, y + h); py++) {
        for (let px = Math.max(0, x); px < Math.min(192, x + b); px++) {
          pixel.set(`${px},${py}`, this.fillStyle);
        }
      }
    }
  };
  const kamera = macheKamera({ fensterBreite: 192, fensterHoehe: 192, karte });
  if (optionen.gross) kamera.setzeZoom(optionen.gross);
  kamera.folge(6, 6, true);
  const zeichner = macheZeichner({ ctx, kamera, ...optionen });
  function weltPixel(x, y) {
    const px = (Math.floor(x) - kamera.eckeX) * kamera.vergroesserung;
    const py = (Math.floor(y) - kamera.eckeY) * kamera.vergroesserung;
    return pixel.get(`${px},${py}`);
  }
  function neu() { aufrufe.length = 0; pixel.clear(); }
  return { karte, ctx, kamera, zeichner, aufrufe, pixel, weltPixel, neu };
}

function pruefeZeichnen() {
  abschnitt("Anlegen und harte Pixel");
  wirft(() => macheZeichner({}), "Fehlende Zeichenfläche wird abgelehnt");
  wirft(() => macheZeichner({ ctx: { fillRect() {} } }), "Fehlende Kamera wird abgelehnt");
  for (const gross of [1, 2, 3]) {
    const p = bildProbe(probeKarte(), { gross });
    p.karte.setze(6, 6, { hindernis: HINDERNIS.wand });
    p.zeichner.bild({ karte: p.karte, wesen: [] }, {}, 4);
    behaupte(p.aufrufe.length > 200, "Echte Terrainpixel werden ausgegeben");
    behaupte(p.aufrufe.every((r) => r.slice(0, 4).every(Number.isInteger)),
      `Keine halben Rechtecke bei Vergrößerung ${gross}`);
    behaupte(p.aufrufe.every((r) => r[5] === false), "Glättung vor jedem Zeichenaufruf aus");
  }

  abschnitt("Gleicher Weltstand und gleiche Zeit");
  const a = bildProbe(probeKarte()), b = bildProbe(probeKarte());
  for (const p of [a, b]) p.zeichner.bild({ karte: p.karte, wesen: [] }, {}, 2);
  tiefGleich(a.aufrufe, b.aufrufe, "Unabhängige Zeichner geben dieselben Aufrufe aus");
  const vorher = [...a.aufrufe];
  a.neu();
  a.zeichner.bild({ karte: a.karte, wesen: [] }, {}, 2);
  tiefGleich(a.aufrufe, vorher, "Gespeichertes Terrain bleibt bildgleich");

  abschnitt("Gegenstände liegen über dem gesamten Nachbarterrain");
  for (const y of [5, 6]) {
    const p = bildProbe(probeKarte());
    p.karte.setze(6, y, { hindernis: HINDERNIS.gitter });
    p.zeichner.zeichneWelt(p.karte, null, null, 0);
    const soll = macheSpriteBild(DINGE.gitter, 0, SPIELER_FARBEN[0], 0);
    const e = p.kamera.feldNachBild(6, y);
    let falsch = 0;
    for (let sy = 0; sy < soll.hoehe; sy++) for (let sx = 0; sx < soll.breite; sx++) {
      const farbe = soll.punkte[sy * soll.breite + sx];
      if (!farbe) continue;
      const px = e.x + sx + Math.floor((16 - soll.breite) / 2);
      const py = e.y + sy + Math.floor((16 - soll.hoehe) / 2);
      if (p.pixel.get(`${px},${py}`) !== farbe) falsch++;
    }
    gleich(falsch, 0, `Gitter in Zeile ${y} wird nicht von späterem Terrain übermalt`);
  }

  abschnitt("Sichtnebel liegt auch über Licht und Partikeln");
  const karte = probeKarte(), sichtbar = new Set([karte.index(6, 6)]);
  let lichtQuellen = 0;
  const lichtwerk = { setzeQuellen() { lichtQuellen++; }, rechne() {},
    zeichneAuf(ctx) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 192, 192); return 1; } };
  const partikelwerk = { schritt() {}, leuchtende: () => [], stosseAus: () => 1,
    zeichne(ctx) { ctx.fillStyle = "#ff0000"; ctx.fillRect(0, 0, 192, 192); return 1; } };
  const nebel = bildProbe(karte, { lichtwerk, partikelwerk });
  nebel.zeichner.bild({ karte, wesen: [] }, { sichtbar }, 1);
  const mitte = feldMitte(7, 6);
  gleich(nebel.weltPixel(mitte.x, mitte.y), FARBEN.leere,
    "Ungesehenes bleibt nach übermalendem Licht und Partikeln schwarz");
  const offen = feldMitte(6, 6);
  gleich(nebel.weltPixel(offen.x, offen.y), "#ff0000", "Sichtbare Effekte bleiben sichtbar");
  nebel.zeichner.bild({ karte, wesen: [] }, { sichtbar }, 2);
  gleich(lichtQuellen, 1, "Lichtquellen werden nur beim Kartenwechsel neu gesetzt");
  nebel.zeichner.bild({ karte: probeKarte(), wesen: [] }, {}, 3);
  gleich(lichtQuellen, 2, "Neue Karte bekommt ihre Lichtquellen");

  abschnitt("Erinnerung behält dunklere Terrainstruktur");
  const hell = bildProbe(karte), matt = bildProbe(karte);
  hell.zeichner.bild({ karte, wesen: [] }, {}, 0);
  matt.zeichner.bild({ karte, wesen: [] },
    { sichtbar: new Set(), erinnert: new Set([karte.index(6, 6)]) }, 0);
  const h = hell.weltPixel(offen.x, offen.y), m = matt.weltPixel(offen.x, offen.y);
  behaupte(helligkeit(m) < helligkeit(h) && helligkeit(m) > 0,
    "Erinnertes Gelände ist sichtbar und dunkler");

  abschnitt("Wesen: Farbe, Richtung, Anzahl und Sicht");
  for (const blick of [0, 1, 2, 3]) for (let platz = 1; platz <= 4; platz++) {
    const p = bildProbe(karte);
    const w = { x: 6, y: 6, art: "spaeher", seite: "helden", spielerPlatz: platz, blick };
    gleich(p.zeichner.zeichneWesen(karte, [w]), 1, "Ein sichtbares Wesen gezeichnet");
    const soll = macheSpriteBild(HELDEN_BILDER.spaeher, blick, SPIELER_FARBEN[platz - 1]);
    const e = p.kamera.feldNachBild(6, 6), gross = p.kamera.vergroesserung;
    let falsch = 0, punkte = 0;
    for (let y = 0; y < soll.hoehe; y++) for (let x = 0; x < soll.breite; x++) {
      const farbe = soll.punkte[y * soll.breite + x];
      if (!farbe) continue;
      punkte++;
      const px = e.x + (x + Math.floor((16 - soll.breite) / 2)) * gross;
      const py = e.y + (y + Math.floor((16 - soll.hoehe) / 2)) * gross;
      if (p.pixel.get(`${px},${py}`) !== farbe) falsch++;
    }
    behaupte(punkte > 50 && falsch === 0, "Tatsächliche Spritepixel haben Farbe und Richtung");
    gleich(p.zeichner.zeichneWesen(karte, [w], new Set()), 0, "Ungesehenes Wesen fehlt");
    gleich(p.zeichner.zeichneWesen(karte, [{ ...w, lebt: false }]), 0, "Totes Wesen fehlt");
  }

  abschnitt("Quellpartikel laufen im Takt und bleiben im Sichtbereich");
  const heiss = probeKarte(), aus = [];
  for (let i = 0; i < heiss.anzahl; i++) heiss.fluessig[i] = FLUESSIG.lava;
  const q = bildProbe(heiss, { partikelwerk: { stosseAus(art, x, y) {
    aus.push({ art, ...weltNachFeld(x, y) }); return 1;
  } } });
  const n = q.zeichner.stosseQuellenAus(heiss, null, 1);
  behaupte(n > 0, "Sichtbare Lava erzeugt tatsächlich Glut");
  gleich(q.zeichner.stosseQuellenAus(heiss, null, 1 + GLUT_TAKT / 4), 0,
    "Weitere Bilder desselben Takts verdoppeln Partikel nicht");
  gleich(q.zeichner.stosseQuellenAus(heiss, new Set(), 1 + GLUT_TAKT), 0,
    "Unsichtbare Lava erzeugt keine Partikel");
  behaupte(aus.every((p) => p.art === "glut" && heiss.drin(p.x, p.y)),
    "Partikel entstehen an tatsächlichen Hexfeldmitten");
  ende("Senkrechter Weltzeichner");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  pruefeZeichnen();
}
