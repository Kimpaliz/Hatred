/* [Aufgabe: Prüfwesen] Die Werkbank, auf der die Bedienung ohne Browser
   gemessen wird: eine Karte von Hand, ein Spielstand ohne Zufall und
   ein Blatt, das jeden Anmeldevorgang mitschreibt.

   ── Warum das eine eigene Datei ist ────────────────────────────────

   Zwei Prüfungen messen an derselben Eingabe: `pruefe-eingabe.mjs`
   misst, was sie aus **Maus und Tastatur** macht, und
   `pruefe-eingabe-finger.mjs`, was sie aus einem **Finger** macht.
   Beide brauchen dieselbe Stellung — dasselbe Plateau, dieselbe Grube,
   dieselbe Figur auf (5,4) mit denselben 20 Punkten.

   Zweimal aufgeschrieben liefe sie auseinander: Die eine Prüfung
   bekäme eine andere Karte als die andere, beide blieben grün, und die
   Zahlen in ihren Meldungen meinten verschiedene Spiele. In eine der
   beiden Prüfungen gelegt wäre es nicht besser — dann hinge die eine
   an der anderen, und wer die Dateinamen liest, erwartete das nicht.
   Eine Kulisse gehört keiner Vorstellung. Deshalb steht sie **einmal**
   hier, und beide Prüfungen zeigen von oben auf sie herab.

   Der Name beginnt bewusst nicht mit `pruefe-`: `pruefe-alles.mjs`
   startet jede Datei dieses Musters als eigene Prüfung, und eine
   „Prüfung", die nichts behauptet, wäre für immer grün. Diese Datei
   behauptet nichts und ruft `ende()` nicht auf.

   `tests/buehne-oberflaeche.mjs` tut dasselbe für die **Anzeige**.
   Wer eine der beiden findet, soll die andere kennen: Es ist dasselbe
   Muster, und zwei Muster für dieselbe Sache wären wieder zwei
   Wahrheiten.

   ── Warum die Stellung von Hand gebaut ist ─────────────────────────

   `macheLauf` würfelt Karte und Brut. Für „genau 20 erreichbare
   Felder", „genau siebzehn warnende Kanten" und „genau 1 Punkt nach
   (6,4)" braucht es aber eine Stellung, in der jede Zahl feststeht.
   Die Karte wird deshalb von Hand gesetzt — `pruefe-eingabe.mjs` lässt
   die Wegvorschau **zusätzlich** einmal über einen echten Lauf laufen.

   ── Warum ein nachgebautes Blatt ───────────────────────────────────

   `macheLeinwandErsatz` zeichnet nichts, es schreibt mit, wer sich wo
   anmeldet — und lässt die Hörer danach von Hand feuern. Ohne das
   bliebe der ganze Weg vom Browser-Ereignis bis zur Aktion ungeprüft,
   und genau dort sitzt die Android-Falle: Ein Tipp erzeugt nach
   `touchend` zusätzlich `mousedown` und `click`.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `tests/pruefe-eingabe.mjs` und
   `tests/pruefe-eingabe-finger.mjs` (beide messen hierüber),
   `tests/buehne-oberflaeche.mjs` (dasselbe Muster für die
   Anzeige), `runtime/eingabe.js` (das Geprüfte), `runtime/kamera.js`
   und `runtime/licht.js` (rechnen Bildpunkte in Felder),
   `spiel/gitter.mjs`, `spiel/wesen.mjs`, `spiel/zufall.mjs`,
   `spiel/katalog/helden.mjs` und `spiel/katalog/gegner.mjs` (die
   Stellung). */

import { HINDERNIS, alleFelder, macheKarte } from "../spiel/gitter.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { macheWesen } from "../spiel/wesen.mjs";
import { held } from "../spiel/katalog/helden.mjs";
import { gegner } from "../spiel/katalog/gegner.mjs";
import { macheKamera } from "../runtime/kamera.js";
import { KACHEL } from "../runtime/licht.js";
import { KNOPF_LINKS, macheEingabe } from "../runtime/eingabe.js";

/* ══════════════════════════════════════════════════════════════════
   Die Stellung
   ══════════════════════════════════════════════════════════════════ */

export const BREITE = 20;
export const HOEHE = 16;


/* Eine Karte von Hand: ein Plateau auf Ebene 3 (x 3..7, y 3..6),
   ringsum Ebene 1, im Osten zwei Felder Grube auf Ebene 0, an einer
   Nordkante eine Wand. Diese Form ist der ganze Sinn der Prüfung —
   jede Kante des Plateaus beantwortet eine andere Frage. */
export function baueKarte() {
  const karte = macheKarte(BREITE, HOEHE);
  for (const { x, y } of alleFelder(karte)) {
    if (x === 0 || y === 0 || x === BREITE - 1 || y === HOEHE - 1) {
      karte.setze(x, y, { hindernis: HINDERNIS.wand });
    }
  }
  for (let y = 3; y <= 6; y++) {
    for (let x = 3; x <= 7; x++) karte.setze(x, y, { ebene: 3 });
  }
  karte.setze(8, 4, { ebene: 0 });
  karte.setze(8, 5, { ebene: 0 });
  karte.setze(3, 2, { hindernis: HINDERNIS.wand });
  karte.starts = [{ x: 5, y: 4 }];
  return karte;
}

/* Ein Spielstand ohne `macheLauf`: Er soll genau so aussehen, wie er
   hier gebraucht wird, und nicht so, wie ihn eine Saat auswürfelt. */
export function baueZustand({
  brutBei = { x: 12, y: 12 }, heldBei = { x: 5, y: 4 }, ap = 20
} = {}) {
  const karte = baueKarte();
  const heldWesen = macheWesen(held("spaeher"), {
    id: 1, seite: "jaeger", x: heldBei.x, y: heldBei.y, spielerPlatz: 1
  });
  heldWesen.ap = ap;
  heldWesen.apMax = ap;
  heldWesen.traenke = 2;
  const brutWesen = macheWesen(gegner("kraetzling"), {
    id: 11, seite: "brut", x: brutBei.x, y: brutBei.y
  });
  const zustand = {
    saat: 7, tiefe: 1, karte, zufall: macheZufall(7),
    wesen: [heldWesen, brutWesen],
    nachId: new Map([[1, heldWesen], [11, brutWesen]]),
    runde: 1, ordnung: [1, 11], amZug: 0, seiteDran: "jaeger",
    spieler: [{ platz: 1, name: "Spieler 1", wesenId: 1 }],
    vorbei: null, protokoll: []
  };
  return zustand;
}

export function macheProbe(angaben = {}) {
  const zustand = angaben.zustand || baueZustand(angaben);
  const kamera = macheKamera({ fensterBreite: 640, fensterHoehe: 480, karte: zustand.karte });
  const geschickt = [];
  const eingabe = macheEingabe({
    leinwand: angaben.leinwand || null,
    kamera,
    zustand,
    felderLesen: angaben.felderLesen || null,
    sende: (aktion) => {
      geschickt.push(aktion);
      return angaben.annehmen === false ? false : true;
    }
  });
  return { zustand, kamera, eingabe, geschickt };
}

/* Der Bildpunkt in der Mitte einer Kachel. Nicht die Ecke: Ein Fehler
   um einen halben Bildpunkt fiele an der Ecke nicht auf. */
export function punktVon(kamera, x, y) {
  const ecke = kamera.feldNachBild(x, y);
  const halb = Math.floor((kamera.vergroesserung * KACHEL) / 2);
  return { x: ecke.x + halb, y: ecke.y + halb };
}

export function zeigeAuf(probe, x, y) {
  const p = punktVon(probe.kamera, x, y);
  return probe.eingabe.beiZeiger(p.x, p.y);
}

export function klickeAuf(probe, x, y, knopf = KNOPF_LINKS, art = "mouse") {
  const p = punktVon(probe.kamera, x, y);
  return probe.eingabe.beiKlick(p.x, p.y, knopf, art);
}

/* Derselbe Punkt, aber mit dem Finger getippt. */
export const tippeAuf = (probe, x, y, knopf) => klickeAuf(probe, x, y, knopf, "touch");

/* Die Reichweitenkarte ist ein `Map`; `JSON.stringify` machte daraus
   ein leeres Objekt und der Vergleich prüfte nichts. Deshalb ein
   Abbild, in dem jedes Stück wirklich steht. */
export function abbild(ansicht) {
  return {
    zeigerFeld: ansicht.zeigerFeld,
    wegVorschau: ansicht.wegVorschau,
    reichweite: [...ansicht.reichweite.keys()].sort((a, b) => a - b),
    ziel: ansicht.ziel,
    modus: ansicht.modus,
    schluessel: ansicht.schluessel,
    kosten: ansicht.kosten,
    warnung: ansicht.warnung,
    ganzeKarte: ansicht.ganzeKarte,
    gesperrt: ansicht.gesperrt
  };
}

/* Ein Zeichenblatt-Ersatz für die Anmeldung der Hörer: Er zeichnet
   nichts, er schreibt mit, wer sich wo anmeldet — und lässt die Hörer
   danach von Hand feuern. Ohne ihn bliebe der ganze Weg vom
   Browser-Ereignis bis zur Aktion ungeprüft. */
export function macheLeinwandErsatz() {
  const hoerer = [];
  const melde = (wo, name, fn) => { hoerer.push({ wo, name, fn }); };
  const nimm = (wo, name, fn) => {
    const stelle = hoerer.findIndex((h) => h.wo === wo && h.name === name && h.fn === fn);
    if (stelle >= 0) hoerer.splice(stelle, 1);
  };
  const schriftstueck = {
    addEventListener: (name, fn) => melde("schrift", name, fn),
    removeEventListener: (name, fn) => nimm("schrift", name, fn)
  };
  const blatt = {
    width: 640,
    height: 480,
    ownerDocument: schriftstueck,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 480 }),
    addEventListener: (name, fn) => melde("blatt", name, fn),
    removeEventListener: (name, fn) => nimm("blatt", name, fn),
    anzahl: () => hoerer.length,
    namen: () => hoerer.map((h) => `${h.wo}:${h.name}`).sort(),
    feuere(name, ereignis) {
      let getroffen = 0;
      for (const h of [...hoerer]) {
        if (h.name !== name) continue;
        getroffen++;
        h.fn(ereignis);
      }
      return getroffen;
    }
  };
  return blatt;
}

export function macheEreignis(zusatz = {}) {
  let gehalten = 0;
  return { preventDefault: () => { gehalten++; }, gehalten: () => gehalten, ...zusatz };
}
