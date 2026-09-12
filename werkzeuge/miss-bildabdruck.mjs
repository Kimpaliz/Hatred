/* [Aufgabe: Werkzeug] Der Fingerabdruck des gezeichneten Bildes: eine
   Prüfzahl über jeden einzelnen Zeichenaufruf.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   `docs/REGELN.md` 12: *„Ein Umbau ohne sichtbare Änderung lässt sich
   beweisen (gleiche Eingaben → gleiches Ergebnis, byteweise); ein
   Umbau mit Änderung nicht."* Dieses Werkzeug liefert das „byteweise".
   Es lässt das Spiel wie im Browser laufen — `macheSpiel` aus
   `runtime/start.js`, Sitzung, Bild für Bild — und schreibt **jeden**
   Zeichenaufruf mit: jede Farbe, jedes Rechteck mit Ort und Maß, jedes
   Umschalten der Glättung. Daraus entsteht eine Prüfzahl (FNV-1a).
   Zwei Läufe mit derselben Prüfzahl haben dasselbe Bild gemalt, Strich
   für Strich. Zwei verschiedene Prüfzahlen: irgendwo ist ein Bildpunkt
   anders — und dann ist es kein reiner Umbau mehr.

   Gemessen wird über den **Rechteckweg**: Das Ersatzblatt hier kennt
   kein `drawImage`, also malt `runtime/granit-feld.js` jedes Feld als
   Rechtecke, Weltpunkt für Weltpunkt. Nur so nennt das Bild jeden
   Punkt einzeln; ein fertiges Feldblatt wäre im Aufruf nur ein Bild.
   Der Blattweg liest denselben Puffer — wer ihn ändert, prüft ihn mit
   `tests/pruefe-granit-feld.mjs`, das die Bildpunkte selbst ansieht.

   Vier Fälle, weil ein Fall zu wenig ist: zwei Saaten (3 und 7, die
   Kerker aus `tests/pruefe-app.mjs`) auf zwei Fenstern (640 × 360 und
   1920 × 1080). Das kleine Fenster zeichnet bei Vergrößerung 1, das
   große wählt die Vergrößerung selbst — ein Fehler in der Zoomwahl
   fiele nur dort auf.

   ── Wie man damit beweist ──────────────────────────────────────────

       node werkzeuge/miss-bildabdruck.mjs > /irgendwo/vorher.txt
       … Umbau …
       node werkzeuge/miss-bildabdruck.mjs > /irgendwo/nachher.txt
       diff /irgendwo/vorher.txt /irgendwo/nachher.txt

   Die Ausgabe gehört **außerhalb** des Projekts abgelegt:
   `werkzeuge/pruefe-arbeitsweise.mjs` sähe sie sonst als offene
   Änderung ohne Changelog. Vor dem ersten Vergleich einmal zweimal
   ohne jede Änderung laufen lassen — ein Fingerabdruck, der von Lauf
   zu Lauf schwankt, bewiese nichts. Gemessen am 12.09.2026 ist er
   über die vier Fälle stabil.

   ── Was es nicht misst ─────────────────────────────────────────────

   Weder Zeit noch Schönheit. Und nicht den Vorlauf (Titelbild, Lobby):
   Der hängt an der Uhr des Rechners, sein Rechteckzähler schwankt um
   ein paar Rechtecke je Lauf — `tests/pruefe-app.mjs` misst ihn, aber
   vergleicht ihn deshalb nicht Zahl für Zahl.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/start.js` (`macheSpiel` — der Weg, den auch der Browser
   nimmt), `netz/sitzung.mjs` (`macheSitzung`), `spiel/lauf.mjs`
   (`macheLauf`), `runtime/granit-feld.js` (dessen Rechteckweg hier
   die Felder malt) und `tests/pruefe-app.mjs`, dessen Ersatzblatt hier
   in verkleinerter Form wiederkehrt. */

import { macheSpiel } from "../runtime/start.js";
import { macheSitzung } from "../netz/sitzung.mjs";
import { macheLauf } from "../spiel/lauf.mjs";

const BILDER = 40;
const SAATEN = [3, 7];
const FENSTER = [[640, 360], [1920, 1080]];

function fnv(hash, text) {
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

const hex = (zahl) => zahl.toString(16).padStart(8, "0");

/* So viel Browser, wie `macheSpiel` anfasst — und jeder Aufruf wandert
   in die Prüfzahl. Nur `fillRect` zählt als Rechteck. */
function macheErsatzblatt(breite, hoehe) {
  let hash = 2166136261 >>> 0, farbe = "#000000", aufrufe = 0, rechtecke = 0;
  const merke = (text) => { hash = fnv(hash, text); aufrufe++; };
  const canvas = { width: breite, height: hoehe };
  const ctx = {
    canvas,
    set imageSmoothingEnabled(wert) { merke(`g${wert}`); },
    get imageSmoothingEnabled() { return false; },
    set fillStyle(wert) { farbe = wert; merke(`f${wert}`); },
    get fillStyle() { return farbe; },
    set globalCompositeOperation(wert) { merke(`m${wert}`); },
    get globalCompositeOperation() { return "source-over"; },
    fillRect(x, y, b, h) { merke(`r${x},${y},${b},${h}`); rechtecke++; }
  };
  const schriftstueck = {
    visibilityState: "visible", addEventListener() {}, removeEventListener() {}
  };
  const blatt = {
    get width() { return canvas.width; }, set width(wert) { canvas.width = wert; },
    get height() { return canvas.height; }, set height(wert) { canvas.height = wert; },
    clientWidth: breite, clientHeight: hoehe, ownerDocument: schriftstueck,
    getContext: () => ctx, addEventListener() {}, removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: breite, height: hoehe })
  };
  return {
    ctx, blatt, schriftstueck,
    hash: () => hash, aufrufe: () => aufrufe, rechtecke: () => rechtecke
  };
}

let gesamt = 2166136261 >>> 0;
for (const [breite, hoehe] of FENSTER) {
  for (const saat of SAATEN) {
    const blatt = macheErsatzblatt(breite, hoehe);
    const altesSchriftstueck = globalThis.document;
    globalThis.document = blatt.schriftstueck;
    try {
      const zustand = macheLauf({ saat, spielerZahl: 1, tiefe: 1 });
      const sitzung = macheSitzung({
        istGastgeber: true, zustand, sendeAn() {}, alleSenden() {}
      });
      const spiel = macheSpiel({
        ctx: blatt.ctx, zustand, sitzung, leinwand: blatt.blatt, platz: 1,
        fensterBreite: breite, fensterHoehe: hoehe
      });
      spiel.setzeFenster(breite, hoehe);
      let zeit = 0;
      for (let i = 0; i < BILDER; i++) { zeit += 1 / 60; spiel.bild(zeit); }
      spiel.loese();
    } finally {
      globalThis.document = altesSchriftstueck;
    }
    gesamt = fnv(gesamt, hex(blatt.hash()));
    console.log(`${breite}×${hoehe}, Saat ${saat}, ${BILDER} Bilder: ${hex(blatt.hash())}  `
      + `${blatt.rechtecke()} Rechtecke, ${blatt.aufrufe()} Aufrufe`);
  }
}
console.log(`Gesamt: ${hex(gesamt)}`);
