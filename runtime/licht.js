/* [Aufgabe: Bild] Die Lichtkarte — ein Bildpunkt je vier Weltpunkte,
   Beiträge addiert, auf acht Stufen gerundet, mit "multiply" aufgelegt.

   ── Warum das Licht grob rechnet und dann rundet ───────────────────

   Ein Licht, das je Weltbildpunkt gerechnet und weich verlaufen wird,
   sieht aus wie ein weichgezeichneter Fleck — und damit ist die
   Pixelgrafik dahin, um die es hier geht. Deshalb zwei Grobheiten,
   beide Absicht:

   1. **Ein Lichtpunkt ist `LICHTPUNKT` Weltbildpunkte breit.** Die
      Lichtkarte rechnet in Weltpunkten unabhängig vom Zeilenversatz.
      Das ist der Grund, warum der Fackelkreis kantig ist.
   2. **Die Summe wird auf acht Stufen gerundet.** Aus einem weichen
      Verlauf werden Ringe. Ohne das Runden wäre die Karte ein Verlauf
      mit 256 Zwischenwerten, und der Kerker sähe aus wie mit dem
      Weichzeichner gemalt.

   ── Warum die Sichtlinie des Kerns und keine eigene ────────────────

   Eine Lichtquelle, die nur nach Abstand rechnet, leuchtet in den
   Nachbarraum (Fehlerbuch D4). Gefragt wird deshalb `sichtlinie` aus
   `spiel/sicht.mjs` — dieselbe Linie, die auch das Auge zieht, und
   damit dieselbe Antwort auf dieselbe Frage. Eine zweite, eigene
   Schattenrechnung wäre eine zweite Wahrheit: Ein Feld sähe hell aus
   und gälte trotzdem als dunkel, und niemand könnte erklären, warum.
   Gefragt wird je **Feld**, nicht je Lichtpunkt — eine Wand steht auf
   ganzen Feldern, und sechzehnmal dieselbe Linie zu ziehen kostet nur.

   ── Warum das Flackern aus der gereichten Zeit kommt ───────────────

   Kein `Date`, kein `Math.random`. Zweimal dieselbe Zeit gibt
   dieselbe Lichtkarte, byteweise — nur so ist ein Bildschirmfoto
   nachstellbar und ein Bericht „hier ist es zu dunkel" überprüfbar.
   Das Flackern ist reines Bild: Was ein Wesen sehen **darf**,
   entscheidet allein `spiel/licht.mjs`, und das flackert nie.

   ── Warum ein gebündelter Pixelpuffer und nicht Rechtecke ──────────

   Bis zum 08.09.2026 setzte diese Datei je Lichtpunkt ein eigenes
   `fillRect`, und das zweimal — einmal für die abdunkelnde, einmal für
   die glühende Lage. Bei voller Übersicht sind das Zehntausende
   Aufrufe je Bild, jeder mit einer Farbzeichenkette; im Chromium
   blieben davon 6,3 Bilder je Sekunde übrig. Jetzt wird ein
   Nebenzeichenblatt gefüllt, mit `putImageData` belegt und mit
   `drawImage` **ganzzahlig** vergrößert aufs Hauptblatt gezogen: aus
   Zehntausenden Aufrufen werden zwei.

   Der Puffer rechnet in **Weltbildpunkten**, nicht in Lichtpunkten. Ein
   4×4-Block gehört an einer Hexgrenze zwei Sechsecken; in
   Lichtpunktauflösung liefe das Licht um die Wand herum, und die
   vorgezeichneten Pixelspannen aus `besitzerSpannen` hätten keinen Ort
   mehr, an dem sie stehen könnten.

   Der wunde Punkt bleibt die Glättung (Fehlerbuch D1): Jedes Setzen der
   Blattmaße stellt `imageSmoothing` zurück, deshalb wird es in
   `zeichneAuf` bei **jedem** Bild neu abgeschaltet und die Vergrößerung
   bleibt eine ganze Zahl.

   ── Warum der Rechteckweg daneben stehen bleibt ────────────────────

   Ein Zeichenblatt ohne `drawImage` bekommt weiterhin einzelne
   Rechtecke — derselbe Aufbau wie in `runtime/granit-feld.js`. Das ist
   kein toter Zweig: An den einzelnen Aufrufen misst die Prüfkette, was
   an einem Pixelpuffer gar nicht mehr zu sehen wäre — dass jede Kante
   auf ganzen Bildpunkten liegt. Dass beide Wege Bildpunkt für
   Bildpunkt dasselbe malen, behauptet `werkzeuge/pruefe-bild.mjs`;
   ohne diese Brücke prüfte die Kette einen Weg, den der Browser nie
   geht (Fehlerbuch C5).

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/palette.js` (`LICHT_ARTEN`, `GRUNDHELLE`, `nachRGB`),
   `spiel/raster.mjs` (Feldmitten, Weltmaße und Lichtpunktzuordnung),
   `spiel/sicht.mjs` (`sichtlinie` — der Schattenwurf), `spiel/licht.mjs`
   (dieselben Reichweiten, dort als Regel), `runtime/partikel.js` (holt
   `KACHEL` von hier und liefert über `leuchtende()` bewegte Quellen),
   `runtime/zeichnen.js` (zeichnet die Welt, über die diese Karte
   gelegt wird) und `werkzeuge/pruefe-bild.mjs`, das jede Zahl hier
   nachrechnet. */

import { LICHT_ARTEN, GRUNDHELLE, FARBEN, nachRGB } from "./palette.js";
import { sichtlinie } from "../spiel/sicht.mjs";
import { feldMitte, weltNachFeld, weltMasse, FELD_BREITE } from "../spiel/raster.mjs";

/* ── Die Maße aus dem Bildvertrag ───────────────────────────────────
   Sie stehen hier und nicht in jeder Bilddatei noch einmal: Zwei
   Dateien mit je eigener 16 sind zwei Wahrheiten, und die eine wird
   irgendwann gepflegt und die andere nicht. `spiel/bauart.mjs` führt
   dieselbe 16 als `PIXEL_JE_FELD` — dort muss sie stehen, weil der
   Kern nichts aus `runtime/` lesen darf. */
export const KACHEL = FELD_BREITE;
export const LICHTPUNKT = 4;
export const PUNKTE_JE_FELD = KACHEL / LICHTPUNKT;

/* Acht Stufen, also sieben Sprünge zwischen 0 und 1. Weniger wären
   Streifen, mehr ein Verlauf — acht ist die Zahl, bei der man die
   Ringe noch sieht und den Kreis noch als Kreis liest. */
export const STUFEN = 8;
const STUFEN_TEILER = STUFEN - 1;

/* Wie stark der warme Anteil additiv obendrauf kommt.

   Die Zahl ist gemessen, nicht gewählt: Der hellste Bodenton des
   Spiels ist `bodenTon(5, 3, true)` = #dad2b6 mit **218** im roten
   Kanal. Damit der Rotkanal auch im Kern einer Lavaquelle (warmer
   Anteil 1,0) nicht an die 255 stößt — dort verschmölzen zwei
   verschiedene Böden zu einer Fläche und die Ringe wären weg —, darf
   der Zuschlag höchstens (255 − 218) / 255 = 0,1451 betragen.
   Nachzurechnen mit `node werkzeuge/pruefe-bild.mjs`, Abschnitt
   „Warmer Zuschlag". */
export const WARM_ZUSATZ = 0.14;

/* Der Zuschlag ist Bernstein, kein weißes Licht: Grün zur Hälfte,
   Blau fast gar nicht. Ohne diese Gewichte wäre die additive Lage ein
   Grauschleier und der Fackelkreis verlöre seine Farbe. */
const WARM_GRUEN = 0.55;
const WARM_BLAU = 0.15;

/* Für eine Quelle ohne Art und ohne eigene Reichweite — vor allem ein
   leuchtendes Teilchen. Knapp über ein Feld: Ein Funke soll sein
   eigenes Feld aufhellen und einen Hauch daneben, sonst erhellte ein
   Funkenregen den ganzen Raum. */
const WEITE_OHNE_ART = 1.5;

/* Zwei Sinusse mit unrundem Verhältnis. Ein einzelner Sinus atmet
   sichtbar im Takt; zwei, deren Perioden nicht ineinander aufgehen,
   ergeben ein Zucken ohne erkennbare Wiederkehr — und bleiben doch
   eine reine Funktion der Zeit. */
const FLACKER_SCHNELL = 11.3;
const FLACKER_LANGSAM = 4.7;

/* ── Vier Bytes in einer Zahl ───────────────────────────────────────

   Ein Bildpunkt des Puffers wird als **ein** 32-Bit-Wert geschrieben
   statt als vier einzelne Bytes; das ist der Unterschied zwischen einer
   und vier Schreibbewegungen je Bildpunkt, und bei zwei Millionen
   Bildpunkten je Bild zählt der. Welche Bytefolge der Rechner dafür
   nimmt, wird **gemessen** und nicht geraten: Ein x86 legt das Rot ins
   erste Byte, eine große Maschine ins letzte, und wer sich vertut,
   bekommt ein blaues Licht ohne jede Fehlermeldung. */
const ROT_ZUERST = (() => {
  const probe = new Uint8ClampedArray(4);
  new Uint32Array(probe.buffer)[0] = 1;
  return probe[0] === 1;
})();

/* Undurchsichtig, immer: `0` heißt „hier steht nichts" und bleibt
   durchsichtig — unter „multiply" wie unter „lighter" ändert ein
   durchsichtiger Bildpunkt nichts, genau wie ein nie gesetztes
   Rechteck. Deshalb darf keine echte Farbe zufällig 0 werden, und das
   kann sie nicht: Der Alphakanal steht auf 255. */
const packe = (r, g, b) => (ROT_ZUERST
  ? ((255 << 24) | (b << 16) | (g << 8) | r)
  : ((r << 24) | (g << 16) | (b << 8) | 255)) >>> 0;

const macheFarbe = (r, g, b) => ({ wort: `rgb(${r},${g},${b})`, wert: packe(r, g, b) });

/* Auf die acht Stufen. Werte über 1 werden vorher gedeckelt — würde
   je Quelle gedeckelt, hinge das Ergebnis an der Reihenfolge der
   Quellen (derselbe Grund wie in `spiel/licht.mjs`). */
export function aufStufen(wert) {
  if (!(wert > 0)) return 0;
  if (wert >= 1) return 1;
  return Math.round(wert * STUFEN_TEILER) / STUFEN_TEILER;
}

/* Der Flackerfaktor einer Quelle: 1 ± Stärke. `saat` verschiebt die
   Phase, damit zwei Fackeln nebeneinander nicht im Gleichtakt zucken
   — sie kommt aus der Lage der Quelle und nicht aus einem Zähler,
   sonst flackerte dieselbe Fackel anders, je nachdem, an welcher
   Stelle der Liste sie steht. */
export function flackerFaktor(zeit, staerke, saat) {
  if (!(staerke > 0)) return 1;
  const schnell = Math.sin(zeit * FLACKER_SCHNELL + saat * 1.7);
  const langsam = Math.sin(zeit * FLACKER_LANGSAM + saat * 3.1);
  return 1 + staerke * (schnell * 0.6 + langsam * 0.4);
}

/* Aus einem gereichten Eintrag wird eine gebrauchsfertige Quelle —
   oder `null`, wenn sie nichts beiträgt. Drei Wege zur Farbe, in
   dieser Reihenfolge: eine mitgegebene Farbe (so kommen leuchtende
   Teilchen herein), die Art aus `LICHT_ARTEN`, sonst warmes Licht. */
function quelleAus(roh) {
  if (!roh || !Number.isFinite(roh.x) || !Number.isFinite(roh.y)) return null;
  if (roh.an === false) return null;
  const vorlage = LICHT_ARTEN[roh.art] || null;
  const hex = typeof roh.farbe === "string" ? roh.farbe
    : (vorlage ? vorlage.farbe : FARBEN.lichtWarm);
  const weite = Number.isFinite(roh.weite) ? roh.weite
    : (vorlage ? vorlage.weite : WEITE_OHNE_ART);
  const staerke = Number.isFinite(roh.staerke) ? roh.staerke : 1;
  const flackern = Number.isFinite(roh.flackern) ? roh.flackern
    : (vorlage ? vorlage.flackern : 0);
  if (!(weite > 0) || !(staerke > 0)) return null;
  const { r, g, b } = nachRGB(hex);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
  const mitte = feldMitte(roh.x, roh.y);
  return {
    x: roh.x, y: roh.y, weite, staerke, flackern,
    weltX: Number.isFinite(roh.weltX) ? roh.weltX : mitte.x,
    weltY: Number.isFinite(roh.weltY) ? roh.weltY : mitte.y,
    r: r / 255, g: g / 255, b: b / 255,
    saat: roh.x * 73.7 + roh.y * 149.3
  };
}

/* ── Das Werk ───────────────────────────────────────────────────────

   `karte` wird gereicht und nie geändert. Die Lichtkarte deckt die
   tatsächlichen Weltmaße einschließlich der äußeren Hexspitzen ab;
   ein Lichtpunkt ist weiterhin vier Weltbildpunkte breit. */
export function macheLichtwerk(karte) {
  let welt = null;
  let punkteBreite = 0;
  let punkteHoehe = 0;
  let rot = new Float32Array(0);
  let gruen = new Float32Array(0);
  let blau = new Float32Array(0);
  let punktFelder = new Int32Array(0);
  let punktGruppen = [];
  /* Die festen Quellen samt ihrem vorgerechneten Schattenwurf. Der
     Schattenwurf hängt nur an Karte und Lage — er wird beim Setzen
     einmal gezogen und nicht in jedem Bild erneut. */
  let feste = [];
  /* Die Farben für das Zeichenblatt. Jeder Eintrag trägt **beides**:
     die Zeichenkette für den Rechteckweg und den gepackten 32-Bit-Wert
     für den Puffer. Bei acht Stufen je Kanal gibt es höchstens
     8³ = 512 verschiedene; sie jedes Bild neu zusammenzusetzen wäre der
     teuerste Teil des ganzen Lichts. Zwei getrennte Vorräte wären zwei
     Wahrheiten — dann könnten Puffer und Rechteck verschiedene Töne
     malen, ohne dass es jemandem auffiele. */
  const farben = new Map();
  const warmFarben = new Map();

  /* Das Nebenzeichenblatt samt seinem Bild. Es wird einmal angelegt und
     nur dann neu gemacht, wenn sich das sichtbare Rechteck ändert —
     jedes Setzen der Blattmaße kostet und stellt die Glättung zurück. */
  let nebenBlatt = null;
  let nebenZiel = null;
  let nebenBild = null;
  let nebenWorte = null;
  let nebenBreite = 0;
  let nebenHoehe = 0;

  function richteEin(neueKarte) {
    welt = neueKarte;
    const masse = weltMasse(welt);
    punkteBreite = Math.ceil(masse.breite / LICHTPUNKT);
    punkteHoehe = Math.ceil(masse.hoehe / LICHTPUNKT);
    const anzahl = punkteBreite * punkteHoehe;
    punktFelder = new Int32Array(anzahl).fill(-1);
    punktGruppen = new Array(anzahl).fill(null);
    let naechsteStelle = anzahl;
    for (let py = 0; py < punkteHoehe; py++) {
      for (let px = 0; px < punkteBreite; px++) {
        const stelle = py * punkteBreite + px;
        const feld = weltNachFeld((px + 0.5) * LICHTPUNKT, (py + 0.5) * LICHTPUNKT);
        if (welt.drin(feld.x, feld.y)) {
          punktFelder[stelle] = feld.y * welt.breite + feld.x;
        }
        const ausschnitt = besitzerSpannen(px, py);
        if (!ausschnitt.ganz || ausschnitt.gruppen.length !== 1) {
          for (const gruppe of ausschnitt.gruppen) {
            gruppe.stelle = gruppe.feld === punktFelder[stelle] ? stelle : naechsteStelle++;
          }
          punktGruppen[stelle] = ausschnitt;
        }
      }
    }
    rot = new Float32Array(naechsteStelle);
    gruen = new Float32Array(naechsteStelle);
    blau = new Float32Array(naechsteStelle);
  }

  /* Ein 4×4-Block kann mehreren Hexfeldern gehören. Nur seine Mitte
     zu prüfen ließe Wandlicht in den verdeckten Nachbarraum laufen.
     Die Besitzerspannen werden einmal beim Kartenwechsel gebaut;
     getrennte Lichtwerte sind nur an den Hexgrenzen nötig. */
  function besitzerSpannen(px, py) {
    const gruppen = new Map();
    let pixel = 0;
    for (let y = 0; y < LICHTPUNKT; y++) {
      let anfang = 0;
      let besitzer = -1;
      for (let x = 0; x <= LICHTPUNKT; x++) {
        const feld = x < LICHTPUNKT
          ? weltNachFeld(px * LICHTPUNKT + x + 0.5, py * LICHTPUNKT + y + 0.5) : null;
        const jetzt = feld !== null && welt.drin(feld.x, feld.y)
          ? feld.y * welt.breite + feld.x : -1;
        if (jetzt !== besitzer) {
          if (besitzer >= 0) {
            let gruppe = gruppen.get(besitzer);
            if (!gruppe) {
              gruppe = { feld: besitzer, stelle: -1, spannen: [] };
              gruppen.set(besitzer, gruppe);
            }
            gruppe.spannen.push({ x: anfang, y, breite: x - anfang });
            pixel += x - anfang;
          }
          besitzer = jetzt;
          anfang = x;
        }
      }
    }
    return { ganz: pixel === LICHTPUNKT * LICHTPUNKT, gruppen: [...gruppen.values()] };
  }

  /* Jeder Lichtpunkt gehört zu seinem wirklichen Sechseck. Linien
     werden pro Quell-/Zielfeld einmal abgefragt; die fertigen Beiträge
     fester Quellen bleiben bis zum Karten-/Quellenwechsel erhalten.
     Der begrenzte Pixelkasten spart Arbeit, seine Form ist kein Schatten. */
  function macheSichtfeld(quelle) {
    const von = weltNachFeld(quelle.weltX, quelle.weltY);
    if (!welt.drin(von.x, von.y)) return { stellen: [], anteile: [] };
    const radius = quelle.weite * KACHEL;
    const radius2 = radius * radius;
    const x0 = Math.max(0, Math.floor((quelle.weltX - radius) / LICHTPUNKT));
    const y0 = Math.max(0, Math.floor((quelle.weltY - radius) / LICHTPUNKT));
    const x1 = Math.min(punkteBreite - 1,
      Math.ceil((quelle.weltX + radius) / LICHTPUNKT));
    const y1 = Math.min(punkteHoehe - 1,
      Math.ceil((quelle.weltY + radius) / LICHTPUNKT));
    const gesehen = new Map();
    const stellen = [];
    const anteile = [];
    function ergaenze(feld, stelle, anteil) {
      if (feld < 0) return;
      let frei = gesehen.get(feld);
      if (frei === undefined) {
        frei = sichtlinie(welt, von.x, von.y,
          feld % welt.breite, Math.floor(feld / welt.breite));
        gesehen.set(feld, frei);
      }
      if (!frei) return;
      stellen.push(stelle);
      anteile.push(anteil);
    }
    for (let py = y0; py <= y1; py++) {
      const dy = (py + 0.5) * LICHTPUNKT - quelle.weltY;
      for (let px = x0; px <= x1; px++) {
        const dx = (px + 0.5) * LICHTPUNKT - quelle.weltX;
        const abstand2 = dx * dx + dy * dy;
        if (abstand2 >= radius2) continue;
        const stelle = py * punkteBreite + px;
        const ausschnitt = punktGruppen[stelle];
        const anteil = 1 - abstand2 / radius2;
        if (ausschnitt === null) {
          ergaenze(punktFelder[stelle], stelle, anteil);
        } else {
          for (const gruppe of ausschnitt.gruppen) {
            ergaenze(gruppe.feld, gruppe.stelle, anteil);
          }
        }
      }
    }
    return { stellen: Uint32Array.from(stellen), anteile: Float32Array.from(anteile) };
  }

  /* Ein Licht trägt seinen Anteil ein. Gerechnet wird `1 − d² / w²`:
     voll an der Quelle, quadratisch fallend, an der Reichweite genau
     null. Abstand und Schatten sind bereits in Weltpunkten gerechnet;
     hier ändern sich nur Stärke und Flackern, keine Quellposition. */
  function traegtEin(quelle, feld, zeit) {
    const faktor = flackerFaktor(zeit, quelle.flackern, quelle.saat);
    if (!(faktor > 0)) return;
    const staerke = quelle.staerke * faktor;
    for (let i = 0; i < feld.stellen.length; i++) {
      const anteil = staerke * feld.anteile[i];
      const stelle = feld.stellen[i];
      rot[stelle] += anteil * quelle.r;
      gruen[stelle] += anteil * quelle.g;
      blau[stelle] += anteil * quelle.b;
    }
  }

  /* Die festen Quellen — `karte.lichter` und was sonst stehen bleibt.
     Form: `{x, y, art, staerke, an}`; `an: false` bleibt in der Liste
     und leuchtet nicht, damit eine gelöschte Fackel nicht die
     Reihenfolge aller anderen verschiebt. */
  function setzeQuellen(quellen) {
    feste = [];
    for (const roh of quellen || []) {
      const quelle = quelleAus(roh);
      if (!quelle) continue;
      feste.push({ quelle, feld: macheSichtfeld(quelle) });
    }
    return werk;
  }

  /* Rechnet die ganze Karte neu. `zusatz` sind die bewegten Quellen:
     Fackelträger, Zauber, leuchtende Teilchen aus
     `runtime/partikel.js`. Sie bekommen ihren Schattenwurf jedes Bild
     frisch, weil sie sich bewegen — deshalb sind ihre Reichweiten
     klein gehalten. */
  function rechne(zeit = 0, neueKarte = welt, zusatz = []) {
    if (neueKarte && neueKarte !== welt) {
      const alteQuellen = feste.map((e) => e.quelle);
      richteEin(neueKarte);
      feste = alteQuellen.map((quelle) => ({ quelle, feld: macheSichtfeld(quelle) }));
    }
    if (!welt) return werk;
    rot.fill(GRUNDHELLE);
    gruen.fill(GRUNDHELLE);
    blau.fill(GRUNDHELLE);
    for (const eintrag of feste) traegtEin(eintrag.quelle, eintrag.feld, zeit);
    for (const roh of zusatz || []) {
      const quelle = quelleAus(roh);
      if (!quelle) continue;
      traegtEin(quelle, macheSichtfeld(quelle), zeit);
    }
    /* Erst ganz am Schluss runden. Wer je Quelle rundete, bekäme aus
       drei schwachen Lichtern dreimal die Stufe 0 statt einer 1. */
    for (let i = 0; i < rot.length; i++) {
      rot[i] = aufStufen(rot[i]);
      gruen[i] = aufStufen(gruen[i]);
      blau[i] = aufStufen(blau[i]);
    }
    return werk;
  }

  /* Die Helligkeit eines **Feldes**, 0 bis 1 je Kanal. Genommen wird
     ein einzelner Lichtpunkt nahe der Feldmitte, kein Mittel über die
     sechzehn: Ein Mittelwert läge zwischen den acht Stufen, und wer
     diese Zahl prüft, prüfte dann etwas anderes als das Bild zeigt. */
  function helligkeitBei(x, y) {
    if (!welt || !welt.drin(Math.floor(x), Math.floor(y))) return { r: 0, g: 0, b: 0 };
    const mitte = feldMitte(x, y);
    const punktX = Math.floor(mitte.x / LICHTPUNKT);
    const punktY = Math.floor(mitte.y / LICHTPUNKT);
    if (punktX < 0 || punktY < 0 || punktX >= punkteBreite || punktY >= punkteHoehe) {
      return { r: 0, g: 0, b: 0 };
    }
    const stelle = punktY * punkteBreite + punktX;
    return { r: rot[stelle], g: gruen[stelle], b: blau[stelle] };
  }

  /* Die rohe Lichtkarte. Für Messungen — damit `pruefe-bild.mjs` die
     acht Stufen zählen kann, statt sie über Feldmitten zu erraten. */
  function lichtpunkte() {
    const anzahl = punkteBreite * punkteHoehe;
    return { breite: punkteBreite, hoehe: punkteHoehe,
      r: rot.subarray(0, anzahl), g: gruen.subarray(0, anzahl), b: blau.subarray(0, anzahl) };
  }

  function farbeVon(r, g, b) {
    const schluessel = (Math.round(r * STUFEN_TEILER) * STUFEN
      + Math.round(g * STUFEN_TEILER)) * STUFEN + Math.round(b * STUFEN_TEILER);
    let farbe = farben.get(schluessel);
    if (farbe === undefined) {
      farbe = macheFarbe(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
      farben.set(schluessel, farbe);
    }
    return farbe;
  }

  /* Der warme Überschuss: um wie viel das Rot das Blau übersteigt.
     Kaltes Licht (Arkan, Blitz) bekommt damit gar keine additive
     Lage — und genau so soll es sein: Ein Zauberlicht glüht nicht. */
  function warmFarbeVon(r, b) {
    const warm = r - b;
    if (!(warm > 0)) return null;
    const stufe = Math.round(warm * STUFEN_TEILER);
    let farbe = warmFarben.get(stufe);
    if (farbe === undefined) {
      const grund = warm * WARM_ZUSATZ * 255;
      const wertR = Math.round(grund);
      farbe = wertR < 1 ? null
        : macheFarbe(wertR, Math.round(grund * WARM_GRUEN), Math.round(grund * WARM_BLAU));
      warmFarben.set(stufe, farbe);
    }
    return farbe;
  }

  /* Ein angeschnittener Lichtblock darf nur dann als ein Stück gemalt
     werden, wenn alle seine Sechsecke denselben Wert tragen. Sonst
     liefe das Licht über die Hexgrenze in den verdeckten Nachbarraum. */
  function einerlei(ausschnitt, stelle) {
    if (!ausschnitt.ganz) return false;
    for (const gruppe of ausschnitt.gruppen) {
      const i = gruppe.stelle;
      if (rot[i] !== rot[stelle] || gruen[i] !== gruen[stelle] || blau[i] !== blau[stelle]) {
        return false;
      }
    }
    return true;
  }

  /* Das sichtbare Lichtpunkt-Rechteck. `kamera`: `{x, y,
     vergroesserung, breite, hoehe}` — `x`/`y` die Weltbildpunkte der
     linken oberen Ecke, `vergroesserung` ganzzahlig, `breite`/`hoehe`
     das Fenster in Bildschirmpunkten. Fehlt das Fenster, wird es vom
     Zeichenblatt genommen; fehlt auch das, wird alles gezeichnet. */
  function fensterVon(ctx, kamera) {
    const vergroesserung = Math.max(1, Math.floor(kamera.vergroesserung || 1));
    const eckeX = Math.round(kamera.x || 0);
    const eckeY = Math.round(kamera.y || 0);
    const blatt = ctx.canvas || {};
    const fensterBreite = Number.isFinite(kamera.breite) ? kamera.breite
      : (Number.isFinite(blatt.width) ? blatt.width : punkteBreite * LICHTPUNKT * vergroesserung);
    const fensterHoehe = Number.isFinite(kamera.hoehe) ? kamera.hoehe
      : (Number.isFinite(blatt.height) ? blatt.height : punkteHoehe * LICHTPUNKT * vergroesserung);
    return {
      vergroesserung, eckeX, eckeY,
      vonX: Math.max(0, Math.floor(eckeX / LICHTPUNKT)),
      vonY: Math.max(0, Math.floor(eckeY / LICHTPUNKT)),
      bisX: Math.min(punkteBreite - 1,
        Math.floor((eckeX + Math.ceil(fensterBreite / vergroesserung) - 1) / LICHTPUNKT)),
      bisY: Math.min(punkteHoehe - 1,
        Math.floor((eckeY + Math.ceil(fensterHoehe / vergroesserung) - 1) / LICHTPUNKT))
    };
  }

  /* Das Nebenblatt in der Größe des sichtbaren Rechtecks. Gibt `false`,
     wenn dieses Zeichenblatt keines hergibt — dann malt der
     Rechteckweg. Derselbe Weg wie in `runtime/granit-feld.js`. */
  function richteNebenblattEin(ctx, breite, hoehe) {
    if (nebenZiel === null) {
      let blatt = null;
      if (typeof OffscreenCanvas !== "undefined") blatt = new OffscreenCanvas(breite, hoehe);
      else if (ctx?.canvas?.ownerDocument?.createElement) {
        blatt = ctx.canvas.ownerDocument.createElement("canvas");
      }
      const ziel = blatt?.getContext?.("2d");
      if (!ziel || typeof ziel.createImageData !== "function"
        || typeof ziel.putImageData !== "function") return false;
      nebenBlatt = blatt;
      nebenZiel = ziel;
    }
    if (nebenBreite !== breite || nebenHoehe !== hoehe) {
      nebenBlatt.width = breite;
      nebenBlatt.height = hoehe;
      nebenBild = nebenZiel.createImageData(breite, hoehe);
      nebenWorte = new Uint32Array(nebenBild.data.buffer);
      nebenBreite = breite;
      nebenHoehe = hoehe;
    }
    return true;
  }

  /* Eine Lage in den Puffer. Kein Zeichenaufruf, nur Schreibbewegungen
     in ein `Uint32Array`.

     Die vier Unterzeilen eines Lichtblocks sind gleich, solange er nur
     einem Sechseck gehört — deshalb wird die oberste gefüllt und
     dreimal am Stück kopiert (`copyWithin` ist ein Speicherzug, keine
     Schleife). Angeschnittene Blöcke bekommen in der obersten Zeile
     die Null und schreiben ihre Spannen danach einzeln nach; so wird
     **jeder** Bildpunkt des Puffers in jedem Bild neu gesetzt und kein
     Rest des vorigen Bildes bleibt stehen.

     Der Nachbar von links wird gemerkt: Ein dunkler Kerker ist über
     weite Strecken derselbe Ton, und drei Zahlenvergleiche sind
     billiger als drei Rundungen und ein Nachschlagen. */
  function fuellePuffer(f, warm) {
    const krumm = [];
    const worte = nebenWorte;
    const breite = nebenBreite;
    let letztR = -1;
    let letztG = -1;
    let letztB = -1;
    let letztWert = 0;
    for (let punktY = f.vonY; punktY <= f.bisY; punktY++) {
      const zeile0 = (punktY - f.vonY) * LICHTPUNKT * breite;
      const reihe = punktY * punkteBreite;
      krumm.length = 0;
      for (let punktX = f.vonX; punktX <= f.bisX; punktX++) {
        const stelle = reihe + punktX;
        const i = zeile0 + (punktX - f.vonX) * LICHTPUNKT;
        const ausschnitt = punktGruppen[stelle];
        let wert = 0;
        if (ausschnitt === null || einerlei(ausschnitt, stelle)) {
          const r = rot[stelle];
          const g = gruen[stelle];
          const b = blau[stelle];
          if (r === letztR && g === letztG && b === letztB) {
            wert = letztWert;
          } else {
            const farbe = warm ? warmFarbeVon(r, b) : farbeVon(r, g, b);
            wert = farbe === null ? 0 : farbe.wert;
            letztR = r;
            letztG = g;
            letztB = b;
            letztWert = wert;
          }
        } else {
          krumm.push(punktX);
        }
        for (let n = 0; n < LICHTPUNKT; n++) worte[i + n] = wert;
      }
      for (let n = 1; n < LICHTPUNKT; n++) {
        worte.copyWithin(zeile0 + n * breite, zeile0, zeile0 + breite);
      }
      for (const punktX of krumm) {
        const spalte = zeile0 + (punktX - f.vonX) * LICHTPUNKT;
        for (const gruppe of punktGruppen[reihe + punktX].gruppen) {
          const i = gruppe.stelle;
          const farbe = warm ? warmFarbeVon(rot[i], blau[i])
            : farbeVon(rot[i], gruen[i], blau[i]);
          if (farbe === null) continue;
          for (const span of gruppe.spannen) {
            const anfang = spalte + span.y * breite + span.x;
            for (let n = 0; n < span.breite; n++) worte[anfang + n] = farbe.wert;
          }
        }
      }
    }
  }

  /* Der Weg des Browsers: zwei Puffer, zwei Zeichenaufrufe. */
  function lagenAusPuffer(ctx, f) {
    const x = (f.vonX * LICHTPUNKT - f.eckeX) * f.vergroesserung;
    const y = (f.vonY * LICHTPUNKT - f.eckeY) * f.vergroesserung;
    let gezeichnet = 0;
    for (const warm of [false, true]) {
      fuellePuffer(f, warm);
      nebenZiel.putImageData(nebenBild, 0, 0);
      ctx.globalCompositeOperation = warm ? "lighter" : "multiply";
      ctx.drawImage(nebenBlatt, x, y,
        nebenBreite * f.vergroesserung, nebenHoehe * f.vergroesserung);
      gezeichnet++;
    }
    return gezeichnet;
  }

  /* Der Weg für ein Zeichenblatt ohne `drawImage`: ein Rechteck je
     Lichtblock, eine Spanne je angeschnittenem Stück. */
  function lagenAusRechtecken(ctx, f) {
    const kante = LICHTPUNKT * f.vergroesserung;
    let gezeichnet = 0;
    let letzte = null;

    function zeichnePunkt(punktX, schirmY, stelle, warm) {
      const x = (punktX * LICHTPUNKT - f.eckeX) * f.vergroesserung;
      const ausschnitt = punktGruppen[stelle];
      if (ausschnitt === null || einerlei(ausschnitt, stelle)) {
        const farbe = warm ? warmFarbeVon(rot[stelle], blau[stelle])
          : farbeVon(rot[stelle], gruen[stelle], blau[stelle]);
        if (farbe === null) return;
        if (farbe.wort !== letzte) { ctx.fillStyle = farbe.wort; letzte = farbe.wort; }
        ctx.fillRect(x, schirmY, kante, kante);
        gezeichnet++;
        return;
      }
      for (const gruppe of ausschnitt.gruppen) {
        const i = gruppe.stelle;
        const farbe = warm ? warmFarbeVon(rot[i], blau[i]) : farbeVon(rot[i], gruen[i], blau[i]);
        if (farbe === null) continue;
        if (farbe.wort !== letzte) { ctx.fillStyle = farbe.wort; letzte = farbe.wort; }
        for (const span of gruppe.spannen) {
          ctx.fillRect(x + span.x * f.vergroesserung, schirmY + span.y * f.vergroesserung,
            span.breite * f.vergroesserung, f.vergroesserung);
          gezeichnet++;
        }
      }
    }

    for (const warm of [false, true]) {
      letzte = null;
      ctx.globalCompositeOperation = warm ? "lighter" : "multiply";
      for (let punktY = f.vonY; punktY <= f.bisY; punktY++) {
        const schirmY = (punktY * LICHTPUNKT - f.eckeY) * f.vergroesserung;
        const zeile = punktY * punkteBreite;
        for (let punktX = f.vonX; punktX <= f.bisX; punktX++) {
          zeichnePunkt(punktX, schirmY, zeile + punktX, warm);
        }
      }
    }
    return gezeichnet;
  }

  /* Legt die Karte über die Welt.

     Zwei Lagen in fester Reihenfolge: erst "multiply" (die Welt wird
     abgedunkelt und eingefärbt), dann "lighter" für den warmen
     Überschuss. Umgekehrt multiplizierte die zweite Lage das eigene
     Glühen wieder weg. Gibt die Zahl der Zeichenaufrufe auf dem
     Hauptblatt zurück — über den Puffer zwei, über die Rechtecke eines
     je Block. Eine Zahl, die sich messen lässt. */
  function zeichneAuf(ctx, kamera = {}) {
    if (!ctx || punkteBreite === 0) return 0;
    /* Bei **jedem** Bild neu: Jedes Setzen der Blattmaße stellt die
       Glättung zurück, und ein einziger vergessener Griff macht das
       ganze Licht weich (Fehlerbuch D1). */
    ctx.imageSmoothingEnabled = false;
    const f = fensterVon(ctx, kamera);
    if (f.bisX < f.vonX || f.bisY < f.vonY) return 0;
    const breite = (f.bisX - f.vonX + 1) * LICHTPUNKT;
    const hoehe = (f.bisY - f.vonY + 1) * LICHTPUNKT;
    const gezeichnet = typeof ctx.drawImage === "function"
      && richteNebenblattEin(ctx, breite, hoehe)
      ? lagenAusPuffer(ctx, f) : lagenAusRechtecken(ctx, f);
    /* Zurück auf den Grundzustand. Ohne diese Zeile zeichnete alles,
       was nach dem Licht kommt, additiv — und niemand fände den
       Grund, weil die Ursache eine ganz andere Datei wäre. */
    ctx.globalCompositeOperation = "source-over";
    return gezeichnet;
  }

  const werk = {
    KACHEL, LICHTPUNKT, PUNKTE_JE_FELD, STUFEN,
    setzeQuellen, rechne, helligkeitBei, lichtpunkte, zeichneAuf,
    anzahlQuellen: () => feste.length,
    anzahlFarben: () => farben.size,
    /* Nur für die Messung: die Maße des Puffers, den das letzte
       `zeichneAuf` gefüllt hat. Ohne sie ließe sich nicht behaupten,
       dass er wirklich in Weltbildpunkten rechnet. */
    pufferMasse: () => ({ breite: nebenBreite, hoehe: nebenHoehe })
  };
  if (karte) richteEin(karte);
  return werk;
}
