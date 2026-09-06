/* [Aufgabe: Bild] Aus Textrastern werden gedrehte, eingefärbte Bildpunkte —
   reine Rechnung, ohne einen einzigen Browser-Aufruf.

   ── Warum das Raster gedreht wird und nicht das Zeichenblatt ───────

   `ctx.rotate()` wäre eine Zeile — und zerstört genau das, worum es
   geht: Der Browser rechnet dabei Zwischenwerte aus, aus harten
   Bildpunkten werden weiche Kanten, und aus Pixelgrafik wird ein
   verwaschenes Bild. Gedreht wird deshalb das **Raster**, in die vier
   Richtungen aus `spiel/gitter.mjs` — und weil 90, 180 und 270 Grad
   nichts anderes sind als Spiegeln und Vertauschen von Zeile und
   Spalte, ist die Drehung **verlustfrei**: Jeder Bildpunkt der Vorlage
   kommt genau einmal im Ergebnis vor, kein Wert wird erfunden, keiner
   fällt weg. Das ist der Grund, warum ein Merkmal aus drei Bildpunkten
   die Drehung überlebt — und `werkzeuge/pruefe-sprites.mjs` misst
   genau das nach, statt es zu glauben.

   ── Warum diese Datei ohne Browser läuft ───────────────────────────

   Alles bis `macheBilddaten` fasst weder `document` noch ein
   Zeichenblatt an. Nur so kann die Prüfkette die Sprites überhaupt
   messen: Ein Modul, das beim Laden ein Zeichenblatt anlegt, lässt
   sich aus Node nicht einlesen, und dann prüft niemand mehr die
   Grafik. `macheBilddaten` ist die eine Ausnahme — und sie bekommt
   das Zeichenblatt **gereicht**, statt sich eines zu holen.

   ── Warum hier keine Regel steht ───────────────────────────────────

   `runtime/` entscheidet nichts. Diese Datei weiß nicht, wer angreift
   und was trifft; sie weiß, wie ein Zeichenraster aussieht, wenn die
   Figur nach Osten schaut. Die Blickrichtung kommt als Zahl herein.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprite-daten.js` (die Raster und `SPIELER_FARBEN`),
   `runtime/palette.js` (`FARBEN`, `nachRGB`), `spiel/gitter.mjs`
   (dessen `RICHTUNGEN` die Reihenfolge nord·ost·süd·west vorgibt, an
   die sich `richtungAus` hält) und `werkzeuge/pruefe-sprites.mjs`,
   das jede Funktion dieser Datei ohne Browser misst. Gezeichnet wird
   das Ergebnis später von `runtime/zeichnen.js`. */

import { FARBEN, nachRGB } from "./palette.js";
import { SPIELER_FARBEN } from "./sprite-daten.js";

/* Dieselbe Reihenfolge wie `RICHTUNGEN` in `spiel/gitter.mjs`. Zwei
   Listen mit derselben Bedeutung laufen auseinander, sobald eine
   gepflegt wird — deshalb steht die Reihenfolge hier nur nach und
   `werkzeuge/pruefe-sprites.mjs` vergleicht sie mit dem Kern. */
export const RICHTUNG_NORD = 0;
export const RICHTUNG_OST = 1;
export const RICHTUNG_SUED = 2;
export const RICHTUNG_WEST = 3;

/* Die drei Platzhalter, die erst beim Zeichnen zu einer Spielerfarbe
   werden. Vier Spieler tragen denselben Umriss in vier Farben — ohne
   vier Raster, die auseinanderlaufen können. */
export const SPIELER_ZEICHEN = ["@hell", "@mittel", "@dunkel"];

const LEER = ".";

/* Welches Bild einer Bildfolge gemeint ist. `bild` ist Pflicht und
   immer `bilder[0]`; wer nur `bild` liest, merkt von einer Bildfolge
   nichts und läuft unverändert weiter. */
export function bildVon(sprite, bildNummer = 0) {
  if (Array.isArray(sprite.bilder) && sprite.bilder.length > 0) {
    const i = Math.max(0, Math.min(sprite.bilder.length - 1, bildNummer | 0));
    return sprite.bilder[i];
  }
  return sprite.bild;
}

export function bildAnzahl(sprite) {
  return Array.isArray(sprite.bilder) && sprite.bilder.length > 0 ? sprite.bilder.length : 1;
}

/* ── Prüfen ─────────────────────────────────────────────────────────
   Gibt die Mängel als Liste zurück, leer heißt in Ordnung. Kein
   Werfen: Wer zwanzig Sprites prüft, will alle zwanzig Befunde sehen
   und nicht den ersten. */
export function pruefeRaster(sprite) {
  const maengel = [];
  if (!sprite || typeof sprite !== "object") return ["kein Sprite-Objekt"];
  if (!sprite.zeichen || typeof sprite.zeichen !== "object") maengel.push("kein Feld `zeichen`");
  if (!Array.isArray(sprite.bild) || sprite.bild.length === 0) {
    maengel.push("kein Feld `bild` oder leer");
    return maengel;
  }
  if (Array.isArray(sprite.bilder)) {
    if (sprite.bilder.length === 0) maengel.push("`bilder` ist leer");
    else if (sprite.bilder[0].join("|") !== sprite.bild.join("|")) {
      maengel.push("`bild` zeigt nicht dasselbe Muster wie `bilder[0]`");
    }
  }

  const tabelle = sprite.zeichen || {};
  for (const [zeichen, farbe] of Object.entries(tabelle)) {
    if (zeichen.length !== 1) maengel.push(`Zeichen "${zeichen}" ist nicht genau ein Zeichen`);
    if (zeichen === LEER) maengel.push(`"${LEER}" ist immer durchsichtig, nie eine Farbe`);
    if (typeof farbe !== "string") {
      maengel.push(`Zeichen "${zeichen}" trägt keinen Farbnamen`);
      continue;
    }
    if (farbe.startsWith("@")) {
      if (!SPIELER_ZEICHEN.includes(farbe)) {
        maengel.push(`Zeichen "${zeichen}": "${farbe}" ist keine Spielerfarbe`);
      }
    } else if (!(farbe in FARBEN)) {
      maengel.push(`Zeichen "${zeichen}" zeigt auf "${farbe}" — kein Name aus FARBEN`);
    }
  }

  const bilder = Array.isArray(sprite.bilder) && sprite.bilder.length
    ? sprite.bilder
    : [sprite.bild];
  const breite = bilder[0][0].length;
  const hoehe = bilder[0].length;
  bilder.forEach((bild, n) => {
    if (bild.length !== hoehe) {
      maengel.push(`Bild ${n} ist ${bild.length} Zeilen hoch, Bild 0 aber ${hoehe}`);
    }
    bild.forEach((zeile, y) => {
      if (zeile.length !== breite) {
        maengel.push(`Bild ${n}, Zeile ${y} ist ${zeile.length} breit, erwartet ${breite}`);
      }
      for (const z of zeile) {
        if (z === LEER) continue;
        if (!(z in tabelle)) maengel.push(`Bild ${n}, Zeile ${y}: unbekanntes Zeichen "${z}"`);
      }
    });
  });
  return maengel;
}

/* ── Drehen ─────────────────────────────────────────────────────────
   Verlustfrei: 90 Grad sind Zeile und Spalte tauschen, 180 Grad sind
   zweimal spiegeln. Keine Rundung, kein Zwischenwert — deshalb hat
   das Ergebnis genau so viele gesetzte Bildpunkte wie die Vorlage. */
export function dreheRaster(zeilen, richtung) {
  if (!Array.isArray(zeilen) || zeilen.length === 0) throw new Error("dreheRaster: leeres Raster");
  const dreh = ((Math.trunc(richtung) % 4) + 4) % 4;
  const hoehe = zeilen.length;
  const breite = zeilen[0].length;
  if (dreh === RICHTUNG_NORD) return zeilen.slice();
  const nBreite = dreh === RICHTUNG_SUED ? breite : hoehe;
  const nHoehe = dreh === RICHTUNG_SUED ? hoehe : breite;
  const raus = [];
  for (let y = 0; y < nHoehe; y++) {
    let zeile = "";
    for (let x = 0; x < nBreite; x++) {
      if (dreh === RICHTUNG_OST) zeile += zeilen[hoehe - 1 - x][y];
      else if (dreh === RICHTUNG_SUED) zeile += zeilen[hoehe - 1 - y][breite - 1 - x];
      else zeile += zeilen[x][breite - 1 - y];
    }
    raus.push(zeile);
  }
  return raus;
}

/* Aus einem Schritt (dx, dy) die Blickrichtung. Bei Gleichstand
   gewinnt die Senkrechte — eine Wahl, keine Zufälligkeit: Das Spiel
   läuft nur in vier Richtungen, ein Gleichstand entsteht also
   ausschließlich bei (0,0) und in erfundenen Aufrufen, und dann ist
   ein fester Wert besser als ein wechselnder. */
export function richtungAus(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? RICHTUNG_OST : RICHTUNG_WEST;
  if (dy > 0) return RICHTUNG_SUED;
  return RICHTUNG_NORD;
}

/* ── Einfärben ──────────────────────────────────────────────────────
   Eine Spielerfarbe ist ein Dreiklang aus **Namen** der Palette, kein
   eigener Farbvorrat. Wer hier Hexzahlen einträgt, hat einen zweiten
   Ort für Farben aufgemacht — und genau das soll `runtime/palette.js`
   verhindern. Ein Wert, der mit "#" beginnt, wird trotzdem
   durchgelassen: Das braucht das Werkstatt-Werkzeug, das mit rohen
   Farben rechnet. */
export function farbeFuer(zeichen, tabelle, spielerFarbe = SPIELER_FARBEN[0]) {
  const name = tabelle[zeichen];
  if (!name) return null;
  const roh = name.startsWith("@") ? spielerFarbe?.[name.slice(1)] : name;
  if (!roh) return null;
  if (roh.startsWith("#")) return roh;
  return FARBEN[roh] ?? null;
}

/* Je Bildpunkt eine Farbe oder `null` (durchsichtig), als Zeilen. */
export function rasterFarben(sprite, spielerFarbe = SPIELER_FARBEN[0], bildNummer = 0) {
  const zeilen = bildVon(sprite, bildNummer);
  return zeilen.map((zeile) => [...zeile].map((z) => farbeFuer(z, sprite.zeichen, spielerFarbe)));
}

/* Das fertige, gedrehte, eingefärbte Sprite. `punkte` liegt flach und
   zeilenweise — dieselbe Anordnung, die `ImageData` erwartet, damit
   `macheBilddaten` nur noch umrechnet und nicht umsortiert. */
export function macheSpriteBild(sprite, richtung = RICHTUNG_NORD,
  spielerFarbe = SPIELER_FARBEN[0], bildNummer = 0) {
  const zeilen = dreheRaster(bildVon(sprite, bildNummer), richtung);
  const hoehe = zeilen.length;
  const breite = zeilen[0].length;
  const punkte = new Array(breite * hoehe).fill(null);
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      punkte[y * breite + x] = farbeFuer(zeilen[y][x], sprite.zeichen, spielerFarbe);
    }
  }
  return { breite, hoehe, punkte };
}

/* ── Ab hier braucht es ein Zeichenblatt ───────────────────────────
   Es wird **gereicht**, nicht geholt. Damit bleibt die Datei aus Node
   einlesbar, und die Prüfung kann ein winziges Ersatzblatt reichen,
   das jeden Aufruf mitschreibt — so lässt sich belegen, dass auf
   ganzen Bildpunkten gearbeitet und die Glättung abgeschaltet wird. */
export function macheBilddaten(spriteBild, zeichenblatt) {
  if (!zeichenblatt || typeof zeichenblatt.getContext !== "function") {
    throw new Error("macheBilddaten: ein Zeichenblatt muss gereicht werden");
  }
  const flaeche = zeichenblatt.getContext("2d");
  /* Direkt nach dem Holen des Kontexts — und `runtime/zeichnen.js`
     muss es nach jedem Setzen der Blattmaße erneut tun, weil das die
     Eigenschaft zurücksetzt (Fehlerbuch D1). */
  flaeche.imageSmoothingEnabled = false;
  const daten = flaeche.createImageData(spriteBild.breite, spriteBild.hoehe);
  for (let i = 0; i < spriteBild.punkte.length; i++) {
    const farbe = spriteBild.punkte[i];
    if (!farbe) continue;
    const { r, g, b } = nachRGB(farbe);
    daten.data[i * 4] = r;
    daten.data[i * 4 + 1] = g;
    daten.data[i * 4 + 2] = b;
    daten.data[i * 4 + 3] = 255;
  }
  return daten;
}
