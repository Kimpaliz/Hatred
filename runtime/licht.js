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

   ── Warum Rechtecke statt eines hochskalierten Blattes ─────────────

   Der übliche Weg wäre ein kleines Zeichenblatt, das ungeglättet
   vergrößert aufgelegt wird. Der Weg hat einen Haken: `imageSmoothing`
   wird von jedem Setzen der Blattmaße zurückgestellt (Fehlerbuch D1),
   und ein einziger vergessener Griff macht das ganze Licht weich.
   Gefüllte Rechtecke lassen sich gar nicht glätten, und gezeichnet
   wird ohnehin nur der sichtbare Ausschnitt. Überquert ein Lichtblock
   eine Hexgrenze, gehören seine Pixel zu getrennten Schattenproben.
   Vorgezeichnete Pixelspannen verhindern Licht hinter einer Wand.

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
  /* Farbzeichenketten für das Zeichenblatt. Bei acht Stufen je Kanal
     gibt es höchstens 8³ = 512 verschiedene; sie jedes Bild neu
     zusammenzusetzen wäre der teuerste Teil des ganzen Lichts. */
  const woerter = new Map();
  const warmWoerter = new Map();

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

  function farbwort(r, g, b) {
    const schluessel = (Math.round(r * STUFEN_TEILER) * STUFEN
      + Math.round(g * STUFEN_TEILER)) * STUFEN + Math.round(b * STUFEN_TEILER);
    let wort = woerter.get(schluessel);
    if (wort === undefined) {
      wort = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
      woerter.set(schluessel, wort);
    }
    return wort;
  }

  /* Der warme Überschuss: um wie viel das Rot das Blau übersteigt.
     Kaltes Licht (Arkan, Blitz) bekommt damit gar keine additive
     Lage — und genau so soll es sein: Ein Zauberlicht glüht nicht. */
  function warmwort(r, b) {
    const warm = r - b;
    if (!(warm > 0)) return null;
    const stufe = Math.round(warm * STUFEN_TEILER);
    let wort = warmWoerter.get(stufe);
    if (wort === undefined) {
      const grund = warm * WARM_ZUSATZ * 255;
      const wertR = Math.round(grund);
      wort = wertR < 1 ? null : `rgb(${wertR},${Math.round(grund * WARM_GRUEN)},`
        + `${Math.round(grund * WARM_BLAU)})`;
      warmWoerter.set(stufe, wort);
    }
    return wort;
  }

  /* Legt die Karte über die Welt. `kamera`: `{x, y, vergroesserung,
     breite, hoehe}` — `x`/`y` die Weltbildpunkte der linken oberen
     Ecke, `vergroesserung` ganzzahlig, `breite`/`hoehe` das Fenster in
     Bildschirmpunkten. Fehlt das Fenster, wird es vom Zeichenblatt
     genommen; fehlt auch das, wird alles gezeichnet.

     Zwei Lagen in fester Reihenfolge: erst "multiply" (die Welt wird
     abgedunkelt und eingefärbt), dann "lighter" für den warmen
     Überschuss. Umgekehrt multiplizierte die zweite Lage das eigene
     Glühen wieder weg. Gibt die Zahl der gezeichneten Rechtecke
     zurück — eine Zahl, die sich messen lässt. */
  function zeichneAuf(ctx, kamera = {}) {
    if (!ctx || punkteBreite === 0) return 0;
    ctx.imageSmoothingEnabled = false;
    const vergroesserung = Math.max(1, Math.floor(kamera.vergroesserung || 1));
    const eckeX = Math.round(kamera.x || 0);
    const eckeY = Math.round(kamera.y || 0);
    const blatt = ctx.canvas || {};
    const fensterBreite = Number.isFinite(kamera.breite) ? kamera.breite
      : (Number.isFinite(blatt.width) ? blatt.width : punkteBreite * LICHTPUNKT * vergroesserung);
    const fensterHoehe = Number.isFinite(kamera.hoehe) ? kamera.hoehe
      : (Number.isFinite(blatt.height) ? blatt.height : punkteHoehe * LICHTPUNKT * vergroesserung);
    const vonX = Math.max(0, Math.floor(eckeX / LICHTPUNKT));
    const vonY = Math.max(0, Math.floor(eckeY / LICHTPUNKT));
    const bisX = Math.min(punkteBreite - 1,
      Math.floor((eckeX + Math.ceil(fensterBreite / vergroesserung) - 1) / LICHTPUNKT));
    const bisY = Math.min(punkteHoehe - 1,
      Math.floor((eckeY + Math.ceil(fensterHoehe / vergroesserung) - 1) / LICHTPUNKT));
    const kante = LICHTPUNKT * vergroesserung;
    let gezeichnet = 0;
    let letzte = null;

    function zeichnePunkt(punktX, schirmY, stelle, warm) {
      const x = (punktX * LICHTPUNKT - eckeX) * vergroesserung;
      const ausschnitt = punktGruppen[stelle];
      let gleich = ausschnitt === null || ausschnitt.ganz;
      if (ausschnitt !== null && gleich) {
        for (const gruppe of ausschnitt.gruppen) {
          const i = gruppe.stelle;
          if (rot[i] !== rot[stelle] || gruen[i] !== gruen[stelle] || blau[i] !== blau[stelle]) {
            gleich = false;
            break;
          }
        }
      }
      if (gleich) {
        const wort = warm ? warmwort(rot[stelle], blau[stelle])
          : farbwort(rot[stelle], gruen[stelle], blau[stelle]);
        if (wort === null) return;
        if (wort !== letzte) { ctx.fillStyle = wort; letzte = wort; }
        ctx.fillRect(x, schirmY, kante, kante);
        gezeichnet++;
      } else {
        for (const gruppe of ausschnitt.gruppen) {
          const i = gruppe.stelle;
          const wort = warm ? warmwort(rot[i], blau[i]) : farbwort(rot[i], gruen[i], blau[i]);
          if (wort === null) continue;
          if (wort !== letzte) { ctx.fillStyle = wort; letzte = wort; }
          for (const span of gruppe.spannen) {
            ctx.fillRect(x + span.x * vergroesserung, schirmY + span.y * vergroesserung,
              span.breite * vergroesserung, vergroesserung);
            gezeichnet++;
          }
        }
      }
    }

    ctx.globalCompositeOperation = "multiply";
    for (let punktY = vonY; punktY <= bisY; punktY++) {
      const schirmY = (punktY * LICHTPUNKT - eckeY) * vergroesserung;
      const zeile = punktY * punkteBreite;
      for (let punktX = vonX; punktX <= bisX; punktX++) {
        const stelle = zeile + punktX;
        zeichnePunkt(punktX, schirmY, stelle, false);
      }
    }

    letzte = null;
    ctx.globalCompositeOperation = "lighter";
    for (let punktY = vonY; punktY <= bisY; punktY++) {
      const schirmY = (punktY * LICHTPUNKT - eckeY) * vergroesserung;
      const zeile = punktY * punkteBreite;
      for (let punktX = vonX; punktX <= bisX; punktX++) {
        const stelle = zeile + punktX;
        zeichnePunkt(punktX, schirmY, stelle, true);
      }
    }

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
    anzahlFarbwoerter: () => woerter.size
  };
  if (karte) richteEin(karte);
  return werk;
}
