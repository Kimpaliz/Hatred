/* [Aufgabe: Prüfwesen] Die Messung an der Pixelgrafik — sieben
   Eigenschaften, die das Auge nicht zuverlässig sieht, jede mit einer
   Zahl im Fehlertext.

   ── Warum das Messwerkzeug hier der eigentliche Bau ist ────────────

   Bei einer Arbeit, deren ganzes Ergebnis das Aussehen ist, entscheidet
   nicht der Augenschein, sondern die Zahl. Ein Sprite, das auf dem
   großen Bildschirm gut aussieht, kann bei 1:1 auf dem Kerkerboden
   verschwinden, in der Drehung zerfallen oder sein Merkmal verlieren —
   und man merkt es erst, wenn es im Spiel steht und niemand mehr weiß,
   welche Änderung es war.

   Gemessen wird deshalb der Fall, der ohne diese Arbeit falsch wäre:

   · **Nicht gegen Weiß.** Der Kontrast wird gegen die drei Böden
     gerechnet, auf denen im Spiel wirklich gestanden wird, und zwar
     durch `bodenTon()` selbst. Eine Prüfung, die gegen Weiß misst,
     besteht immer und sagt nichts.
   · **Nicht nur das erste Bild.** Eine Bildfolge wird Bild für Bild
     geprüft; sonst kann das zweite Bild eine falsche Breite haben und
     niemand sieht es, weil `bild` heil ist.
   · **Nicht nur eine Spielerfarbe.** Ein Held wird in allen vier
     Farben gemessen. Die Wertetrennung des vierten Spielers kann
     reißen, während der erste tadellos aussieht.
   · **Die Drehung wird gemessen, nicht geglaubt.** `dreheRaster` ist
     verlustfrei — deshalb *muss* ein Merkmal in allen vier Drehungen
     zusammenhängend bleiben. Genau das prüft Nummer 6: Sie schlägt an,
     sobald die Drehung anfängt, Bildpunkte zu verlieren oder zu
     erfinden. Ohne sie wäre ein Rechenfehler in `dreheRaster` erst im
     fertigen Bild sichtbar.
   · **Das Zeichenblatt wird ersetzt, nicht gestartet.** Ein winziges
     Blatt, das jeden Aufruf mitschreibt, belegt zwei Dinge, die man
     sonst erst im Browser sieht: dass die Glättung abgeschaltet wird
     und dass nur ganze Bildpunkte gesetzt werden (Fehlerbuch D1).

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprite-daten.js` (die Raster), `runtime/sprites.js` (jede
   gemessene Funktion), `runtime/palette.js` (`FARBEN`, `helligkeit`,
   `bodenTon`), `spiel/gitter.mjs` (`BODEN`, `richtungen`),
   `spiel/katalog/gegner.mjs` und `spiel/katalog/helden.mjs` (die
   Schlüssel müssen sich decken), `werkzeuge/werkstatt-auftrag.mjs`
   (die Tabelle `MERKMAL` — sie steht dort und nicht hier, damit es sie
   nur einmal gibt) und `tests/helfer.mjs`. */

import { abschnitt, behaupte, gleich, tiefGleich, wirft, ende } from "./helfer.mjs";
import { BODEN, richtungen } from "../spiel/gitter.mjs";
import { GEGNER } from "../spiel/katalog/gegner.mjs";
import { HELDEN } from "../spiel/katalog/helden.mjs";
import { FARBEN, helligkeit, bodenTon } from "../runtime/palette.js";
import {
  SPIELER_FARBEN, HELDEN_BILDER, GEGNER_BILDER, DINGE, ZEICHEN
} from "../runtime/sprite-daten.js";
import {
  RICHTUNG_NORD, RICHTUNG_OST, RICHTUNG_SUED, RICHTUNG_WEST,
  pruefeRaster, dreheRaster, rasterFarben, macheSpriteBild, richtungAus,
  macheBilddaten, bildVon, bildAnzahl
} from "../runtime/sprites.js";
import { MERKMAL, ZERFAELLT, alleSprites, UNTERGRUENDE } from "../werkzeuge/werkstatt-auftrag.mjs";

/* Die Schwellen. Sie stehen hier und nirgends sonst; jede trägt den
   Grund, aus dem sie diese Zahl ist. */
const FIGURENKANTE = 15;          /* aus dem Bildvertrag: FIGUR = 15   */
const ZEICHENKANTEN = [7, 9];     /* Zeichen liegen über dem Spielfeld */
const TRENNUNG_MINDESTENS = 24;   /* Fehlerbuch D3: zwei Töne in einer Figur */
const UNTERGRUND_MINDESTENS = 18; /* darunter verschwindet die Figur im Boden */
const NEBENFLECK_MINDESTENS = 3;  /* ein abgesetztes Stück unter 3 ist Streuschmutz */

const rund = (z) => Math.round(z * 10) / 10;

/* Zusammenhängende Flecken, vierfach benachbart. Diagonal berührt sich
   im verkleinerten Bild nicht — wer achtfach zählt, erklärt eine
   zerfallene Figur für heil. */
function flecken(zeilen, trifft) {
  const hoehe = zeilen.length, breite = zeilen[0].length;
  const gesehen = zeilen.map(() => new Array(breite).fill(false));
  const groessen = [];
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      if (gesehen[y][x] || !trifft(zeilen[y][x])) continue;
      let anzahl = 0;
      const stapel = [[x, y]];
      gesehen[y][x] = true;
      while (stapel.length) {
        const [ax, ay] = stapel.pop();
        anzahl++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = ax + dx, ny = ay + dy;
          if (nx < 0 || ny < 0 || nx >= breite || ny >= hoehe) continue;
          if (gesehen[ny][nx] || !trifft(zeilen[ny][nx])) continue;
          gesehen[ny][nx] = true;
          stapel.push([nx, ny]);
        }
      }
      groessen.push(anzahl);
    }
  }
  return groessen.sort((a, b) => b - a);
}

/* Alle Farben eines Bildes, in einer flachen Liste. */
function farbenVon(sprite, spielerFarbe, bildNummer) {
  return rasterFarben(sprite, spielerFarbe, bildNummer).flat().filter(Boolean);
}

const alle = alleSprites();
const figuren = alle.filter((e) => e.vorrat !== "ZEICHEN");

/* ── 0 · Der Vorrat selbst ─────────────────────────────────────────
   Ein Sprite, das es nicht gibt, fällt in keiner der sieben Messungen
   auf — es wird schlicht nie gemessen. */
abschnitt("Vorrat");
gleich(alle.length, 34, "Anzahl der Sprites im Vorrat");
tiefGleich(Object.keys(GEGNER_BILDER), GEGNER.map((g) => g.schluessel),
  "die Gegnerbilder tragen genau die Schlüssel aus spiel/katalog/gegner.mjs");
tiefGleich(Object.keys(HELDEN_BILDER), HELDEN.map((h) => h.schluessel),
  "die Heldenbilder tragen genau die Schlüssel aus spiel/katalog/helden.mjs");
gleich(SPIELER_FARBEN.length, 4, "vier Spielerfarben");
for (const eintrag of alle) {
  behaupte(Array.isArray(MERKMAL[eintrag.voll]), `${eintrag.voll}: kein Eintrag in MERKMAL`);
}
/* Wie eine Figur **blickt**, ist etwas anderes als wohin sie **geht**.
   Seit dem 07.09.2026 geht sie in sechs Richtungen (Sechseckraster,
   Vorgang #7), gezeichnet wird sie aber weiter in vier Ansichten: von
   vorn, von hinten und zweimal von der Seite. Mehr Ansichten hieße
   mehr Bilder, und das ist eine Bildentscheidung, keine Regelfrage.

   Bis zum 07.09.2026 hing diese Zählung an der Richtungstabelle des
   Kerns. Das war eine Kopplung, die es nie hätte geben dürfen: Der
   Kern zählt Nachbarn, diese Datei zählt Zeichnungen. Geprüft wird
   deshalb jetzt, was wirklich zusammengehört — `richtungAus` bildet
   jeden Schritt auf eine der vier Ansichten ab, **auch die schrägen
   des Sechsecks**. */
tiefGleich([RICHTUNG_NORD, RICHTUNG_OST, RICHTUNG_SUED, RICHTUNG_WEST], [0, 1, 2, 3],
  "vier Blickrichtungen, in dieser Reihenfolge gezählt");
for (const y of [4, 5]) {
  for (const r of richtungen(y)) {
    const blick = richtungAus(r.dx, r.dy);
    behaupte([0, 1, 2, 3].includes(blick),
      `Schritt nach ${r.name} (Zeile ${y % 2 === 0 ? "gerade" : "ungerade"}) hat eine Ansicht`);
  }
}
gleich(richtungAus(1, 0), RICHTUNG_OST, "nach Osten blickt sie nach Osten");
gleich(richtungAus(-1, 0), RICHTUNG_WEST, "nach Westen nach Westen");
gleich(richtungAus(0, 1), RICHTUNG_SUED, "nach Südwesten auf gerader Zeile: nach Süden");
gleich(richtungAus(0, -1), RICHTUNG_NORD, "nach Nordosten auf gerader Zeile: nach Norden");
/* Bei gleichem Betrag gewinnt die Senkrechte — so steht es in
   `richtungAus`, und so bleibt es: Ein Schritt schräg nach unten sieht
   von oben mehr nach „weg vom Betrachter" aus als nach „zur Seite". */
gleich(richtungAus(1, 1), RICHTUNG_SUED, "schräg nach Südosten blickt sie nach Süden");
gleich(richtungAus(1, -1), RICHTUNG_NORD, "schräg nach Nordosten nach Norden");

/* ── 1 · Gleiche Breiten, ungerade Kante ──────────────────────────── */
abschnitt("1 · Maße");
for (const { voll, sprite } of alle) {
  const maengel = pruefeRaster(sprite);
  behaupte(maengel.length === 0, `${voll}: ${maengel.join(" | ")}`);
  for (let n = 0; n < bildAnzahl(sprite); n++) {
    const bild = bildVon(sprite, n);
    const breiten = [...new Set(bild.map((z) => z.length))];
    behaupte(breiten.length === 1,
      `${voll}, Bild ${n}: ${breiten.length} verschiedene Zeilenbreiten (${breiten.join(", ")})`);
    behaupte(bild.length % 2 === 1 && breiten[0] % 2 === 1,
      `${voll}, Bild ${n}: Kantenlänge ${breiten[0]}×${bild.length} — beide müssen ungerade sein`);
  }
}
for (const { voll, sprite } of figuren) {
  gleich(sprite.bild.length, FIGURENKANTE, `${voll}: Höhe des Figurenrasters`);
  gleich(sprite.bild[0].length, FIGURENKANTE, `${voll}: Breite des Figurenrasters`);
}
for (const { voll, sprite } of alle.filter((e) => e.vorrat === "ZEICHEN")) {
  behaupte(ZEICHENKANTEN.includes(sprite.bild.length),
    `${voll}: Kante ${sprite.bild.length} — Zeichen haben 7 oder 9`);
}

/* ── 2 · Jedes Zeichen zeigt auf eine Farbe, die es gibt ─────────── */
abschnitt("2 · Zeichen");
for (const { voll, sprite } of alle) {
  for (const [zeichen, name] of Object.entries(sprite.zeichen)) {
    const bekannt = name.startsWith("@")
      ? ["@hell", "@mittel", "@dunkel"].includes(name)
      : name in FARBEN;
    behaupte(bekannt, `${voll}: Zeichen "${zeichen}" zeigt auf "${name}", das es nicht gibt`);
  }
  for (const farbe of farbenVon(sprite, SPIELER_FARBEN[0], 0)) {
    behaupte(/^#[0-9a-fA-F]{6}$/.test(farbe),
      `${voll}: "${farbe}" ist keine Farbe der Form #rrggbb`);
  }
}

/* ── 3 · Asymmetrie ──────────────────────────────────────────────── */
abschnitt("3 · Asymmetrie");
for (const { voll, sprite } of alle) {
  for (let n = 0; n < bildAnzahl(sprite); n++) {
    const bild = bildVon(sprite, n);
    const urbild = bild.join("\n");
    for (const richtung of [RICHTUNG_OST, RICHTUNG_SUED, RICHTUNG_WEST]) {
      const gedreht = dreheRaster(bild, richtung).join("\n");
      let gleiche = 0;
      for (let i = 0; i < urbild.length; i++) if (urbild[i] === gedreht[i]) gleiche++;
      behaupte(gedreht !== urbild,
        `${voll}, Bild ${n}: Drehung ${richtung} ist Bild für Bild dieselbe ` +
        `(${gleiche} von ${urbild.length} Zeichen gleich) — die Drehung wäre unsichtbar`);
    }
  }
}

/* ── 4 · Silhouette ──────────────────────────────────────────────── */
abschnitt("4 · Silhouette");
for (const { voll, sprite } of alle) {
  for (let n = 0; n < bildAnzahl(sprite); n++) {
    const teile = flecken(bildVon(sprite, n), (z) => z !== ".");
    const erlaubt = ZERFAELLT[voll] ? 2 : 1;
    const nebenOk = teile.length <= 1 || teile[1] >= NEBENFLECK_MINDESTENS;
    behaupte(teile.length <= erlaubt && nebenOk,
      `${voll}, Bild ${n}: ${teile.length} Flecken (${teile.join("+")} Bildpunkte) — ` +
      `erlaubt ist ${erlaubt}, ein zweiter nur ab ${NEBENFLECK_MINDESTENS} Bildpunkten` +
      (ZERFAELLT[voll] ? ` (benannt: ${ZERFAELLT[voll]})` : ""));
  }
}

/* ── 5 · Wertetrennung der zwei häufigsten Farben ────────────────── */
abschnitt("5 · Wertetrennung");
for (const { voll, sprite } of alle) {
  for (const spielerFarbe of SPIELER_FARBEN) {
    for (let n = 0; n < bildAnzahl(sprite); n++) {
      const zaehler = new Map();
      for (const farbe of farbenVon(sprite, spielerFarbe, n)) {
        zaehler.set(farbe, (zaehler.get(farbe) || 0) + 1);
      }
      const haeufig = [...zaehler.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      behaupte(haeufig.length >= 2,
        `${voll}: nur eine Farbe im Bild — das ist ein Umriss, keine Form`);
      if (haeufig.length < 2) continue;
      const abstand = Math.abs(helligkeit(haeufig[0][0]) - helligkeit(haeufig[1][0]));
      behaupte(abstand >= TRENNUNG_MINDESTENS,
        `${voll} (${spielerFarbe.name}, Bild ${n}): die zwei häufigsten Farben ` +
        `${haeufig[0][0]} und ${haeufig[1][0]} liegen ${rund(abstand)} von 255 auseinander, ` +
        `nötig sind ${TRENNUNG_MINDESTENS}`);
    }
  }
}

/* ── 6 · Merkmalstreue über alle vier Drehungen ──────────────────── */
abschnitt("6 · Merkmalstreue");
for (const { voll, sprite } of alle) {
  const [zeichen] = MERKMAL[voll] || [null];
  if (!zeichen) {
    behaupte(false, `${voll}: kein Merkmal eingetragen — die Art bleibt ungemessen`);
    continue;
  }
  for (let n = 0; n < bildAnzahl(sprite); n++) {
    const bild = bildVon(sprite, n);
    const soll = flecken(bild, (z) => z === zeichen);
    behaupte(soll.length === 1,
      `${voll}, Bild ${n}: das Merkmal "${zeichen}" liegt in ${soll.length} Flecken ` +
      `(${soll.join("+")}) — es muss ein Stück sein, sonst verschmilzt es beim Verkleinern`);
    for (const richtung of [RICHTUNG_NORD, RICHTUNG_OST, RICHTUNG_SUED, RICHTUNG_WEST]) {
      const ist = flecken(dreheRaster(bild, richtung), (z) => z === zeichen);
      behaupte(ist.length === soll.length && ist[0] === soll[0],
        `${voll}, Bild ${n}, Drehung ${richtung}: Merkmal "${zeichen}" hat ` +
        `${ist.length} Fleck(en) mit ${ist[0] ?? 0} Bildpunkten, vorher ` +
        `${soll.length} mit ${soll[0] ?? 0} — die Drehung verliert Bildpunkte`);
    }
  }
}

/* ── 7 · Kontrast gegen den echten Untergrund ────────────────────── */
abschnitt("7 · Untergrund");
const GRUENDE = [
  { was: "Stein auf Ebene 1", hex: bodenTon(BODEN.stein, 1) },
  { was: "Platte auf Ebene 2", hex: bodenTon(BODEN.platte, 2) },
  { was: "Erde im Graben", hex: bodenTon(BODEN.erde, 0) }
];
tiefGleich(GRUENDE.map((g) => g.hex), UNTERGRUENDE,
  "die Untergründe der Prüfung und die des Werkstatt-Auftrags sind dieselben");
for (const { voll, sprite } of alle) {
  for (const spielerFarbe of SPIELER_FARBEN) {
    for (let n = 0; n < bildAnzahl(sprite); n++) {
      const farben = farbenVon(sprite, spielerFarbe, n);
      const mittel = farben.reduce((s, f) => s + helligkeit(f), 0) / farben.length;
      for (const grund of GRUENDE) {
        const abstand = Math.abs(mittel - helligkeit(grund.hex));
        behaupte(abstand >= UNTERGRUND_MINDESTENS,
          `${voll} (${spielerFarbe.name}, Bild ${n}): mittlere Helligkeit ${rund(mittel)} liegt ` +
          `nur ${rund(abstand)} von 255 neben ${grund.was} (${grund.hex}, ` +
          `${rund(helligkeit(grund.hex))}) — nötig sind ${UNTERGRUND_MINDESTENS}`);
      }
    }
  }
}

/* ── 8 · Die Rechnung in runtime/sprites.js ──────────────────────── */
abschnitt("8 · Drehen und Richtung");
const probe = ["abc", "def", "ghi"];
tiefGleich(dreheRaster(probe, RICHTUNG_OST), ["gda", "heb", "ifc"], "90 Grad im Uhrzeigersinn");
tiefGleich(dreheRaster(probe, RICHTUNG_SUED), ["ihg", "fed", "cba"], "180 Grad");
tiefGleich(dreheRaster(probe, RICHTUNG_WEST), ["cfi", "beh", "adg"], "270 Grad");
tiefGleich(dreheRaster(dreheRaster(dreheRaster(dreheRaster(probe, 1), 1), 1), 1), probe,
  "viermal 90 Grad ist wieder das Urbild");
tiefGleich(dreheRaster(["ab", "cd", "ef"], RICHTUNG_OST), ["eca", "fdb"],
  "auch ein nicht quadratisches Raster wird richtig gedreht");
gleich(richtungAus(0, -1), RICHTUNG_NORD, "richtungAus nord");
gleich(richtungAus(1, 0), RICHTUNG_OST, "richtungAus ost");
gleich(richtungAus(0, 1), RICHTUNG_SUED, "richtungAus sued");
gleich(richtungAus(-1, 0), RICHTUNG_WEST, "richtungAus west");
gleich(richtungAus(0, 0), RICHTUNG_NORD, "richtungAus ohne Schritt");
gleich(richtungAus(3, -1), RICHTUNG_OST, "richtungAus nimmt die längere Achse");
wirft(() => dreheRaster([], 1), "dreheRaster wirft bei leerem Raster");

/* ── 9 · Das Zeichenblatt-Ersatzstück ────────────────────────────── */
abschnitt("9 · Zeichenblatt");
function macheErsatzblatt() {
  const aufrufe = [];
  const flaeche = {
    set imageSmoothingEnabled(wert) { aufrufe.push(["glaettung", wert]); },
    get imageSmoothingEnabled() { return false; },
    createImageData(breite, hoehe) {
      aufrufe.push(["bilddaten", breite, hoehe]);
      return { width: breite, height: hoehe, data: new Uint8ClampedArray(breite * hoehe * 4) };
    }
  };
  return { aufrufe, getContext: (art) => { aufrufe.push(["kontext", art]); return flaeche; } };
}
wirft(() => macheBilddaten({ breite: 1, hoehe: 1, punkte: [null] }, null),
  "macheBilddaten ohne Zeichenblatt wirft, statt still nichts zu tun");
{
  const blatt = macheErsatzblatt();
  const bild = macheSpriteBild(HELDEN_BILDER.spaeher, RICHTUNG_OST, SPIELER_FARBEN[1]);
  const daten = macheBilddaten(bild, blatt);
  gleich(bild.breite, FIGURENKANTE, "macheSpriteBild: Breite");
  gleich(bild.punkte.length, FIGURENKANTE * FIGURENKANTE, "macheSpriteBild: Anzahl Bildpunkte");
  behaupte(blatt.aufrufe.some(([was, wert]) => was === "glaettung" && wert === false),
    "die Glättung wird abgeschaltet — sonst ist die Pixelgrafik dahin (Fehlerbuch D1)");
  const daten2 = blatt.aufrufe.find(([was]) => was === "bilddaten");
  behaupte(Number.isInteger(daten2[1]) && Number.isInteger(daten2[2]),
    `die Blattmaße sind ganze Zahlen: ${daten2[1]}×${daten2[2]}`);
  let gesetzt = 0;
  for (let i = 3; i < daten.data.length; i += 4) if (daten.data[i] === 255) gesetzt++;
  const sichtbar = bild.punkte.filter(Boolean).length;
  gleich(gesetzt, sichtbar, "jeder farbige Bildpunkt wird genau einmal undurchsichtig gesetzt");
}
{
  /* Gleiche Eingabe, gleiches Ergebnis — byteweise. Ohne das könnte
     ein Zwischenspeicher zwei verschiedene Bilder liefern. */
  const a = macheSpriteBild(GEGNER_BILDER.rammbock, RICHTUNG_SUED, SPIELER_FARBEN[2]);
  const b = macheSpriteBild(GEGNER_BILDER.rammbock, RICHTUNG_SUED, SPIELER_FARBEN[2]);
  tiefGleich(a, b, "zweimal dasselbe Sprite ergibt byteweise dasselbe Bild");
}

/* ── 10 · Der Werkstatt-Auftrag ──────────────────────────────────── */
abschnitt("10 · Werkstatt-Auftrag");
for (const { voll, sprite } of alle) {
  const [zeichen] = MERKMAL[voll] || [null];
  behaupte(zeichen !== null && zeichen in sprite.zeichen,
    `${voll}: MERKMAL nennt "${zeichen}", die Zeichentabelle kennt es nicht`);
  const stellen = Object.keys(sprite.zeichen);
  behaupte(stellen.indexOf(zeichen) >= 0,
    `${voll}: Merkmalsindex ${stellen.indexOf(zeichen)} liegt außerhalb der Palette`);
}
gleich(DINGE.fackelsockel.bilder.length, 3, "der Fackelsockel hat drei Bilder");
tiefGleich(DINGE.fackelsockel.bild, DINGE.fackelsockel.bilder[0],
  "`bild` zeigt dasselbe Muster wie `bilder[0]`");
gleich(Object.keys(ZEICHEN).length, 7, "sieben Zeichen der Oberfläche");
gleich(Object.keys(DINGE).length, 11, "elf Dinge im Kerker");

ende("Sprites");
