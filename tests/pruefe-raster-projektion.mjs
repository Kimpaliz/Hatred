/* [Aufgabe: Prüfwesen] Prüft echte Hexkoordinaten bis zu Maus, Licht und Teilchen.

   ── Warum es das gibt ──────────────────────────────────────────────

   Ein sechseckiger Regelkern genügt nicht, wenn das Bild noch Quadrate
   benutzt. Deshalb werden Mittelpunkte, beide Seiten aller sechs
   Kanten, negative Zeilen und die wirklichen Runtime-Aufrufe geprüft.
   Die Schattenprobe vergleicht jeden Lichtpunkt mit der Sichtlinie.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/raster.mjs`, `spiel/gitter.mjs`, `spiel/sicht.mjs`, die Kamera,
   Licht, Partikel und Abspieler unter `runtime/`, `helfer.mjs` sowie
   `buehne-browser.mjs` — von dort kommt das Blatt, das den Pixelpuffer
   des Lichts mitschreibt. */

import { abschnitt, behaupte, gleich, nahe, tiefGleich, ende } from "./helfer.mjs";
import { feldMitte, feldEcken, weltNachFeld, weltMasse,
  FELD_BREITE, FELD_RADIUS, ZEILEN_HOEHE } from "../spiel/raster.mjs";
import { macheKarte, nachbarn, HINDERNIS } from "../spiel/gitter.mjs";
import { sichtlinie } from "../spiel/sicht.mjs";
import { macheKamera } from "../runtime/kamera.js";
import { macheLichtwerk, LICHTPUNKT, aufStufen } from "../runtime/licht.js";
import { GRUNDHELLE } from "../runtime/palette.js";
import { machePartikelwerk } from "../runtime/partikel.js";
import { macheBildflaeche, bildpunkt } from "./buehne-browser.mjs";
import { macheAbspieler, TEMPO } from "../runtime/abspieler.js";
import { spawnSync } from "node:child_process";

abschnitt("Ungültige Projektion beendet sich ohne ein erfundenes Trefferfeld");
/* Die alte Schleife hängt bei unendlichen und sehr großen Zeilen.
   Ein eigener Prozess mit Zeitlimit fängt auch diesen Fehler ein,
   ohne dass die gesamte Prüfkette dabei unbegrenzt stehen bleibt. */
const rasterUrl = new URL("../spiel/raster.mjs", import.meta.url).href;
const ungueltigeProbe = `
  import { weltNachFeld } from ${JSON.stringify(rasterUrl)};
  let falsch = 0, geprueft = 0;
  const unsicher = Number.MAX_SAFE_INTEGER + 1;
  for (const wert of [NaN, Infinity, -Infinity, 1e100, -1e100, unsicher, -unsicher]) {
    for (const [x, y] of [[wert, 0], [0, wert]]) {
      const feld = weltNachFeld(x, y);
      if (!Number.isNaN(feld.x) || !Number.isNaN(feld.y)) falsch++;
      geprueft++;
    }
  }
  console.log(JSON.stringify({ falsch, geprueft }));
  process.exitCode = falsch === 0 ? 0 : 1;
`;
const prozess = spawnSync(process.execPath, ["--input-type=module", "-e", ungueltigeProbe], {
  encoding: "utf8", timeout: 2000
});
behaupte(prozess.error?.code !== "ETIMEDOUT", "ungültige Eingaben hängen nicht bis zum Zeitlimit");
gleich(prozess.status, 0, "alle ungültigen Eingaben geben zwei NaN statt Feldkoordinaten zurück");
gleich(prozess.stdout.trim(), '{"falsch":0,"geprueft":14}',
  "NaN, Unendlichkeiten, extreme und unsichere Zahlen wurden auf beiden Achsen geprüft");

const EPS = 1e-8;
const karte = macheKarte(64, 50);
const masse = weltMasse(karte);

abschnitt("Echte regelmäßige Sechsecke");
gleich(FELD_BREITE, 16, "die vereinbarte Feldbreite bleibt 16");
nahe(ZEILEN_HOEHE, 8 * Math.sqrt(3), EPS, "Zeilen sind nicht quadratisch angeordnet");
nahe(FELD_RADIUS, 16 / Math.sqrt(3), EPS, "Spitzenradius gehört zum regelmäßigen Hex");
nahe(feldMitte(1, 1).x, 32, EPS, "ungerade Zeile ist um acht Pixel versetzt");
nahe(feldMitte(1, -1).x, 32, EPS, "negative ungerade Zeile hat denselben Versatz");
nahe(feldMitte(1, 0.5).x, 28, EPS, "animierter Zeilenwechsel hat halben Versatz");
nahe(feldMitte(1, -0.5).x, 28, EPS, "negative Zwischenzeile bleibt stetig");
let kanten = 0;
for (let y = -10; y <= 10; y++) {
  for (let x = -10; x <= 10; x++) {
    const mitte = feldMitte(x, y);
    tiefGleich(weltNachFeld(mitte.x, mitte.y), { x, y }, "Feldmitte findet ihr Hex zurück");
    const ecken = feldEcken(x, y);
    for (let i = 0; i < 6; i++) {
      const a = ecken[i];
      const b = ecken[(i + 1) % 6];
      nahe(Math.hypot(a.x - b.x, a.y - b.y), FELD_RADIUS, EPS, "jede Kante gleich lang");
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = mx - mitte.x;
      const dy = my - mitte.y;
      tiefGleich(weltNachFeld(mx - dx * 0.01, my - dy * 0.01), { x, y },
        "innen neben der Kante gehört das Pixel zum eigenen Hex");
      const draussen = weltNachFeld(mx + dx * 0.01, my + dy * 0.01);
      behaupte(draussen.x !== x || draussen.y !== y,
        "außen neben derselben Kante gehört das Pixel zum Nachbarn");
      kanten++;
    }
  }
}
for (const y of [20, 21]) {
  const a = feldMitte(20, y);
  for (const feld of nachbarn(karte, 20, y)) {
    const b = feldMitte(feld.x, feld.y);
    nahe(Math.hypot(b.x - a.x, b.y - a.y), 16, EPS,
      "jeder der sechs Regelnachbarn steht genau eine Feldbreite entfernt");
  }
}
gleich(masse.breite, 1032, "Weltbreite enthält die versetzte letzte Spalte");
gleich(masse.hoehe, Math.ceil(49 * ZEILEN_HOEHE + 2 * FELD_RADIUS),
  "Welthöhe enthält beide äußeren Spitzen");

abschnitt("Kamera, Zoom, Spitzen und negative Bildkoordinaten");
const kamera = macheKamera({ karte, fensterBreite: 481, fensterHoehe: 317 });
let rueckrechnungen = 0;
for (let zoom = 1; zoom <= 12; zoom++) {
  kamera.setzeZoom(zoom);
  for (const ziel of [{ x: 30, y: 31 }, { x: 0, y: 0 }, { x: 63, y: 49 }]) {
    kamera.folge(ziel.x, ziel.y, true);
    for (const feld of [{ x: -1, y: -1 }, { x: 0, y: 0 }, ziel, { x: 21, y: 20 }]) {
      const mitte = feldMitte(feld.x, feld.y);
      const anker = kamera.feldNachBild(feld.x, feld.y);
      gleich(anker.x, (Math.round(mitte.x - 8) - kamera.eckeX) * zoom,
        "Spriteanker x bleibt acht Pixel links der Hexmitte");
      gleich(anker.y, (Math.round(mitte.y - 8) - kamera.eckeY) * zoom,
        "Spriteanker y bleibt acht Pixel über der Hexmitte");
      const punkte = [mitte, ...feldEcken(feld.x, feld.y).map((ecke) => ({
        x: mitte.x + (ecke.x - mitte.x) * 0.96,
        y: mitte.y + (ecke.y - mitte.y) * 0.96
      }))];
      for (const punkt of punkte) {
        tiefGleich(kamera.bildNachFeld((punkt.x - kamera.eckeX) * zoom,
          (punkt.y - kamera.eckeY) * zoom), feld,
        "Mitte und sechs Spitzen treffen bei jedem Zoom ihr eigenes Hex");
        rueckrechnungen++;
      }
    }
    const sichtbar = kamera.sichtbareFelder();
    let fehlt = 0;
    for (let py = 0; py < kamera.sichtHoehe(); py += 3) {
      for (let px = 0; px < kamera.sichtBreite(); px += 3) {
        const feld = weltNachFeld(kamera.eckeX + px + 0.5, kamera.eckeY + py + 0.5);
        if (!karte.drin(feld.x, feld.y)) continue;
        if (feld.x < sichtbar.vonX || feld.x > sichtbar.bisX
          || feld.y < sichtbar.vonY || feld.y > sichtbar.bisY) fehlt++;
      }
    }
    gleich(fehlt, 0, "Ausschnitt vergisst keine angeschnittenen Hexspitzen");
  }
}

abschnitt("Hexschatten und genaue Kartenkontur");
const lichtKarte = macheKarte(12, 10);
for (let y = 0; y < lichtKarte.hoehe; y++) {
  lichtKarte.hindernis[lichtKarte.index(5, y)] = HINDERNIS.wand;
}
const licht = macheLichtwerk(lichtKarte);
const quelle = { x: 3, y: 3, farbe: "#ffffff", weite: 12, staerke: 1, flackern: 0 };
licht.setzeQuellen([quelle]).rechne(0);
const punkte = licht.lichtpunkte();
const ursprung = feldMitte(3, 3);
let falscheLichtpunkte = 0;
let schattenpunkte = 0;
let hellePunkte = 0;
for (let py = 0; py < punkte.hoehe; py++) {
  for (let px = 0; px < punkte.breite; px++) {
    const wx = (px + 0.5) * LICHTPUNKT;
    const wy = (py + 0.5) * LICHTPUNKT;
    const feld = weltNachFeld(wx, wy);
    const frei = lichtKarte.drin(feld.x, feld.y)
      && sichtlinie(lichtKarte, 3, 3, feld.x, feld.y);
    const d2 = (wx - ursprung.x) ** 2 + (wy - ursprung.y) ** 2;
    const anteil = frei ? Math.max(0, 1 - d2 / (12 * 16) ** 2) : 0;
    const erwartet = aufStufen(GRUNDHELLE + anteil);
    if (Math.abs(punkte.r[py * punkte.breite + px] - erwartet) > 1e-6) falscheLichtpunkte++;
    if (frei && anteil > 0) hellePunkte++;
    if (!frei && lichtKarte.drin(feld.x, feld.y)) schattenpunkte++;
  }
}
gleich(falscheLichtpunkte, 0, "jeder Lichtpunkt verwendet echte Hexsicht und Weltabstand");
behaupte(schattenpunkte > 100 && hellePunkte > 100,
  "die Gegenprobe enthält helle Punkte und einen tatsächlich geworfenen Wandschatten");
const mitschnitt = [];
const flaeche = {
  canvas: { width: 500, height: 500 },
  fillRect(x, y, w, h) { mitschnitt.push({ x, y, w, h }); }
};
const konturKarte = macheKarte(7, 5);
const randLicht = macheLichtwerk(konturKarte);
randLicht.setzeQuellen([{ x: 1, y: 1, art: "fackel" }]).rechne(0);
gleich(randLicht.zeichneAuf(flaeche), mitschnitt.length, "jede gezeichnete Spanne wird gezählt");
let ausserhalb = 0;
for (const rect of mitschnitt) {
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const feld = weltNachFeld(x + 0.5, y + 0.5);
      if (!konturKarte.drin(feld.x, feld.y)) ausserhalb++;
    }
  }
}
gleich(ausserhalb, 0,
  "weder Abdunkelung noch additive Glut bemalen den Raum außerhalb der Hexkarte");

/* Dasselbe noch einmal über den Weg, den der Browser seit dem
   08.09.2026 wirklich geht: `runtime/licht.js` füllt je Lage einen
   Pixelpuffer und zieht ihn mit `drawImage` aufs Blatt. Oben stehen
   Rechtecke; darin stünde die Kontur eines Tages richtig und im Puffer
   trotzdem falsch, und niemand sähe es. Gezählt wird deshalb dieselbe
   Sache an den **Bildpunkten**: kein deckender Bildpunkt darf außerhalb
   der Hexkarte liegen. */
const pufferFlaeche = macheBildflaeche(500, 500);
const pufferKarte = macheKarte(7, 5);
const pufferLicht = macheLichtwerk(pufferKarte);
pufferLicht.setzeQuellen([{ x: 1, y: 1, art: "fackel" }]).rechne(0);
gleich(pufferLicht.zeichneAuf(pufferFlaeche), 2,
  "über den Puffer sind es zwei Zeichenaufrufe statt tausender Spannen");
let ausserhalbPuffer = 0;
let innenPuffer = 0;
for (const lage of pufferFlaeche.lagen()) {
  for (let py = 0; py < lage.puffer.hoehe; py++) {
    for (let px = 0; px < lage.puffer.breite; px++) {
      if (bildpunkt(lage, px, py).a === 0) continue;
      const feld = weltNachFeld(lage.x + px + 0.5, lage.y + py + 0.5);
      if (konturKarte.drin(feld.x, feld.y)) innenPuffer++; else ausserhalbPuffer++;
    }
  }
}
gleich(ausserhalbPuffer, 0,
  "auch im Pixelpuffer endet das Licht genau an der Hexkontur");
behaupte(innenPuffer > 1000,
  `und der Puffer ist wirklich bemalt, nicht leer (${innenPuffer} deckende Bildpunkte)`);

abschnitt("Partikelkollision auf versetzter Zeile");
for (const startY of [4, 5]) {
  const start = feldMitte(4, startY);
  for (const ziel of nachbarn(karte, 4, startY)) {
    const zielMitte = feldMitte(ziel.x, ziel.y);
    const winkel = Math.atan2(zielMitte.y - start.y, zielMitte.x - start.x);
    for (const wand of [false, true]) {
      const raum = macheKarte(12, 12);
      if (wand) raum.hindernis[raum.index(ziel.x, ziel.y)] = HINDERNIS.wand;
      const werk = machePartikelwerk(1, 7);
      werk.stosseAus("funken", start.x, start.y, { anzahl: 1, tempo: [600, 600],
        leben: [2, 2], richtung: winkel, streuung: 0 });
      const korn = werk.teilchen()[0];
      korn.schwere = 0;
      werk.schritt(16 / 600, raum);
      const jetzt = weltNachFeld(korn.x, korn.y);
      if (wand) behaupte(jetzt.x !== ziel.x || jetzt.y !== ziel.y,
        "ein Hexnachbar mit Wand stoppt den Funken");
      else tiefGleich(jetzt, { x: ziel.x, y: ziel.y },
        "derselbe Funke erreicht den freien Hexnachbarn");
      const punkt = werk.leuchtende()[0];
      const mitte = feldMitte(punkt.x, punkt.y);
      nahe(mitte.x, korn.x, EPS, "Partikelfeld x projiziert zur wirklichen Quellposition");
      nahe(mitte.y, korn.y, EPS, "Partikelfeld y projiziert zur wirklichen Quellposition");
      gleich(punkt.weltX, korn.x, "bewegtes Licht erhält den exakten Weltpunkt x");
      gleich(punkt.weltY, korn.y, "bewegtes Licht erhält den exakten Weltpunkt y");
    }
  }
}

abschnitt("Abspieler: Ausstoß und gerader Stoß über mehrere Hexzeilen");
const ausstoss = [];
const spieler = { id: 1, x: 5, y: 5, lebt: true };
const zustand = { karte, wesen: [spieler], nachId: new Map([[1, spieler]]) };
const abspieler = macheAbspieler({ partikelwerk: {
  stosseAus(art, x, y) { ausstoss.push({ art, x, y }); }
} });
abspieler.lege([{ art: "hindernisWeg", x: 4, y: 3 }]);
abspieler.schritt(0.01, zustand);
const erwartet = feldMitte(4, 3);
nahe(ausstoss[0].x, erwartet.x, EPS, "Abspieler-Ausstoß x liegt auf der Hexmitte");
nahe(ausstoss[0].y, erwartet.y, EPS, "Abspieler-Ausstoß y liegt auf der Hexmitte");
abspieler.leere();
abspieler.lege([{ art: "gestossen", wer: 1, von: { x: 4, y: 2 }, nach: { x: 4, y: 4 } }]);
abspieler.schritt(TEMPO.stoss / 2, zustand);
const figur = abspieler.schau(zustand).nachId.get(1);
const bild = feldMitte(figur.x, figur.y);
const von = feldMitte(4, 2);
const nach = feldMitte(4, 4);
nahe(bild.x, (von.x + nach.x) / 2, EPS, "der Stoß macht keinen Versatzknick");
nahe(bild.y, (von.y + nach.y) / 2, EPS, "die Stoßmitte liegt auf der geraden Weltstrecke");

console.log(`  Gemessen: ${kanten} Hexkanten, ${rueckrechnungen} Pixel-Rückrechnungen, `
  + `${punkte.breite * punkte.hoehe} Lichtpunkte, ${mitschnitt.length} Konturspannen.`);
ende("Echte Hexprojektion");
