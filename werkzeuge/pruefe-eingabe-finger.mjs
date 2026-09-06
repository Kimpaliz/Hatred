/* [Aufgabe: Prüfwesen] Prüft die Fingerbedienung von `runtime/eingabe.js`:
   Zeigerereignisse, die zwei Schritte und die Knopfleiste.

   ── Warum diese Prüfung von `pruefe-eingabe.mjs` getrennt ist ──────

   Nicht wegen der Zeilenzahl, sondern weil es zwei Sachen sind. Dort
   steht, was die Eingabe aus Maus und Tastatur macht; hier steht, was
   sie aus einem Finger macht — und das ist eine andere Bedienung mit
   anderen Fallen, nicht dieselbe mit anderem Gerät.

   ── Warum genau diese Fälle ────────────────────────────────────────

   · **Ein Tipp ist genau eine Aktion.** Android schickt nach
     `touchend` **zusätzlich** `mousedown` und `click` hinterher. Wer
     beide Wege hört, geht zwei Felder weit — und der zweite Zug geht
     ins Leere, weil die Punkte vom ersten schon weg sind. Nachgestellt
     wird die ganze Folge, zweimal, und gezählt werden die Aktionen.
     Das ist die wichtigste Behauptung dieser Datei.
   · **Der erste Tipp zeigt, der zweite führt aus.** Auf dem Handy
     schwebt kein Zeiger über einem Feld; ohne die zwei Schritte wären
     Weg, Kosten, Sturzwarnung und Trefferchance dort nie zu sehen.
     Für die Maus muss **ein** Klick genügen — sonst wäre die
     Umstellung für alle, die schon spielen, eine Verschlechterung.
   · **Die Leiste verbraucht den Tipp.** Auch ein ausgegrautes Feld:
     Der Daumen ist ungenau, und ein Fehlgriff auf einen toten Knopf
     dürfte nicht die Figur bewegen, die zufällig darunter steht.
     Geprüft wird deshalb der Fall, in dem darunter ein **erreichbares**
     Feld liegt — ohne diese Regel liefe die Figur dorthin.
   · **Es gibt einen Ausweg.** Ein Handy hat kein `Esc`. Der dritte
     Tipp auf dasselbe Feld und ein Tipp neben die Karte räumen auf,
     und verglichen wird mit einer frisch gebauten Eingabe.

   ── Warum die Werkbank hier steht und nicht drüben ─────────────────

   Die von Hand gebaute Karte, der Spielstand und das mitschreibende
   Blatt werden von **beiden** Prüfungen gebraucht. Zweimal aufgebaut
   wären es zwei Karten, die auseinanderlaufen, sobald jemand eine
   davon ändert — und dann prüfte die eine Datei stillschweigend etwas
   anderes als die andere. Also steht sie einmal hier und wird
   ausgeführt; `pruefe-eingabe.mjs` holt sie sich. Damit der Import
   nicht die halbe Prüfung mitlaufen lässt, laufen die Behauptungen
   dieser Datei nur beim **direkten** Aufruf — dieselbe Bauart wie in
   `werkzeuge/pruefe-geheimnisse.mjs`.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/eingabe.js` (das Geprüfte), `werkzeuge/pruefe-eingabe.mjs`
   (Maus und Tastatur; holt von hier die Werkbank),
   `runtime/oberflaeche.js` (liefert `felder()`, hier nachgestellt),
   `runtime/kamera.js`, `spiel/gitter.mjs`, `spiel/aktionen.mjs`,
   `spiel/wesen.mjs`, `spiel/zufall.mjs`, `spiel/katalog/helden.mjs`,
   `spiel/katalog/gegner.mjs`, `werkzeuge/helfer.mjs`,
   `werkzeuge/pruefe-alles.mjs`. */

import { pathToFileURL } from "node:url";

import { abschnitt, behaupte, gleich, tiefGleich, ende } from "./helfer.mjs";

import { HINDERNIS, alleFelder, macheKarte } from "../spiel/gitter.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { AKTION } from "../spiel/aktionen.mjs";
import { macheWesen } from "../spiel/wesen.mjs";
import { held } from "../spiel/katalog/helden.mjs";
import { gegner } from "../spiel/katalog/gegner.mjs";
import { macheKamera } from "../runtime/kamera.js";
import { KACHEL } from "../runtime/licht.js";
import { KNOPF_LINKS, WARNUNG, macheEingabe } from "../runtime/eingabe.js";

/* ══════════════════════════════════════════════════════════════════
   Werkbank — sie steht hier, weil es sie nur einmal geben darf
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
/* Gemessene Zahlen, am Ende gedruckt. Eine Behauptung sagt nur „größer
   als" — hier steht, wie groß wirklich. */
const berichte = [];

/* Nur beim direkten Aufruf wird geprüft: `pruefe-eingabe.mjs` holt sich
   von hier bloß die Werkbank, und `ende()` beendete sonst den Prozess
   mitten in deren Prüfung. */
const direkt = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (direkt) {
  /* ══════════════════════════════════════════════════════════════════
     12b · Ein Tipp ist genau eine Aktion — die wichtigste Behauptung
     ══════════════════════════════════════════════════════════════════ */

  abschnitt("Ein Tipp, eine Aktion");
  {
    /* Die Folge, die ein Android-Browser wirklich schickt: Nach `touchend`
       kommen `mousedown` und `click` hinterher — wer beide Wege hört, geht
       zwei Felder weit statt einem. */
    const blatt = macheLeinwandErsatz();
    const android = macheProbe({ leinwand: blatt });
    const ziel = punktVon(android.kamera, 6, 4);
    const folge = () => ["pointerdown", "pointerup", "mousedown", "click"].reduce(
      (summe, name) => summe + blatt.feuere(name, macheEreignis({ clientX: ziel.x,
        clientY: ziel.y, button: 0, pointerType: "touch", pointerId: 5 })), 0);
    gleich(folge(), 2, "von der Android-Folge erreichen nur die zwei Zeigerereignisse einen Hörer");
    gleich(android.geschickt.length, 0, "die erste Folge wählt nur an und schickt nichts");
    gleich(folge(), 2, "auch beim zweiten Mal hört niemand auf `mousedown` oder `click`");
    gleich(android.geschickt.length, 1, "zwei volle Android-Folgen ergeben genau eine Aktion");
    tiefGleich(android.geschickt[0], { typ: AKTION.gehen, wer: 1, nach: { x: 6, y: 4 } },
      "und zwar die auf das angetippte Feld");
    berichte.push("Android-Folge: 2× pointerdown+pointerup+mousedown+click = "
      + `${android.geschickt.length} Aktion`);

    const zwei = macheProbe();
    const p = punktVon(zwei.kamera, 6, 4);
    const druck = (nummer) => zwei.eingabe.beiZeigerDruck(p.x, p.y, { art: "touch", nummer });
    druck(1); druck(2); druck(2);
    gleich(zwei.geschickt.length, 0, "solange ein Finger unten ist, zählt kein zweiter");
    behaupte(zwei.eingabe.istFinger(), "nach einem Tipp meldet istFinger() den Finger");
    zwei.eingabe.beiZeigerEnde(1);
    druck(9);
    gleich(zwei.geschickt.length, 1, "nach dem Loslassen wird der nächste Finger angenommen");

    abschnitt("Zwei Schritte");
    /* Der erste Tipp ersetzt das Schweben: Er zeigt Weg und Preis und
       schickt nichts. Der zweite bestätigt genau das, was er sah. */
    const probe = macheProbe();
    gleich(tippeAuf(probe, 6, 4), null, "der erste Tipp gibt keine Aktion zurück");
    gleich(probe.geschickt.length, 0, "und schickt nichts");
    const erst = probe.eingabe.ansicht();
    tiefGleich(erst.zeigerFeld, { x: 6, y: 4 }, "er wählt das Feld an");
    gleich(erst.kosten, 1, "die Vorschau nennt den Preis: 1 Punkt");
    behaupte(Array.isArray(erst.wegVorschau) && erst.wegVorschau.length > 0,
      "und zeigt den Weg — genau das, was die Maus beim Schweben zeigt");
    probe.eingabe.beiTaste("ArrowUp", true);
    tiefGleich(tippeAuf(probe, 6, 4), { typ: AKTION.gehen, wer: 1, nach: { x: 6, y: 4 } },
      "der zweite Tipp führt das angetippte Feld aus, auch wenn eine Pfeiltaste dazwischenkam");
    gleich(probe.geschickt.length, 1, "und zwar genau einmal");

    const maus = macheProbe();
    tiefGleich(klickeAuf(maus, 6, 4), { typ: AKTION.gehen, wer: 1, nach: { x: 6, y: 4 } },
      "mit der Maus führt ein einziger Klick aus");
    gleich(maus.geschickt.length, 1, "die zwei Schritte gelten für sie nicht");
    behaupte(!maus.eingabe.istFinger(), "und istFinger() bleibt bei der Maus falsch");

    const kampf = macheProbe({ brutBei: { x: 6, y: 4 } });
    kampf.eingabe.beiTaste("2", true);
    gleich(tippeAuf(kampf, 6, 4), null, "der erste Tipp auf den Gegner greift nicht an");
    tiefGleich(kampf.eingabe.ansicht().ziel, { id: 11, x: 6, y: 4 },
      "sondern nennt das Ziel — daran hängt die Trefferchance");
    tiefGleich(tippeAuf(kampf, 6, 4), { typ: AKTION.angriff, wer: 1, ziel: 11 },
      "der zweite Tipp greift an");
    gleich(tippeAuf(kampf, 6, 4), null,
      "danach wählt ein Tipp wieder an, statt gleich zu schlagen");
    tiefGleich(kampf.eingabe.ansicht().zeigerFeld, { x: 6, y: 4 },
      "und zwar von vorn: Eine angenommene Aktion nimmt die Anwahl mit");

    const fern = macheProbe();
    tippeAuf(fern, 14, 10);
    gleich(tippeAuf(fern, 14, 10), null, "auch zweimal getippt geht es nicht dorthin");
    gleich(fern.geschickt.length, 0, "und geschickt wird dabei nichts");
    gleich((fern.eingabe.ansicht().warnung || {}).art, WARNUNG.abgelehnt,
      "der Grund steht da");
    const still = macheProbe();
    tippeAuf(still, 6, 4); still.eingabe.sperre(true);
    tippeAuf(still, 6, 4); tippeAuf(still, 6, 4); still.eingabe.sperre(false);
    gleich(still.geschickt.length, 0, "bei gesperrter Eingabe schickt auch ein Tipp nichts");
    gleich(tippeAuf(still, 6, 4), null,
      "und nach dem Entsperren wählt der Tipp wieder nur an");

    /* Jedes Feld einmal antippen: Der Finger erreicht dieselbe Karte wie oben
       die Tastatur — und führt nie aus, weil immer ein anderes Feld kommt. */
    const feld = macheProbe();
    const abweichend = [...alleFelder(feld.zustand.karte)].filter(({ x, y }) => {
      tippeAuf(feld, x, y);
      const a = feld.eingabe.ansicht().zeigerFeld;
      return !a || a.x !== x || a.y !== y;
    }).length;
    gleich(abweichend, 0, `der Finger wählt alle ${BREITE * HOEHE} Felder richtig an`);
    gleich(feld.geschickt.length, 0,
      `und keiner der ${BREITE * HOEHE} Tipps auf je ein anderes Feld führt aus`);
    berichte.push(`Finger: ${BREITE * HOEHE} Felder angetippt, ohne eine Aktion`);

    abschnitt("Knopfleiste");
    /* Die Leiste: Ihre Maße kommen von der Anzeige — zwei Rechnungen wären
       zwei Wahrheiten (Fehlerbuch E2). Ohne sie wäre (10,10) ein Feld. */
    const knopf = (zusatz = {}) => [{
      id: "zugEnde", art: "zugEnde", x: 0, y: 0, breite: 60, hoehe: 60, taste: " ",
      aktion: { typ: AKTION.zugEnde, wer: 1 }, beschriftung: "Zug beenden", aktiv: true, ...zusatz
    }];
    gleich(macheProbe().eingabe.beiTipp(10, 10), null, "ohne Leiste ist (10,10) ein Feld");
    const mit = macheProbe({ felderLesen: () => knopf() });
    tiefGleich(mit.eingabe.beiTipp(10, 10), { typ: AKTION.zugEnde, wer: 1 },
      "ein Tipp auf ein aktives Feld schickt dessen Aktion");
    gleich(mit.geschickt.length, 1, "sofort und ohne zweiten Tipp — ein Knopf ist eindeutig");
    gleich(mit.geschickt.filter((a) => a.typ === AKTION.gehen).length, 0,
      "und das Kartenfeld darunter wird gar nicht erst angefasst");
    gleich(mit.eingabe.beiTipp(70, 70), null,
      "ein Tipp neben den Knopf geht an die Karte");
    /* Der Fehlgriff, um den es geht: ein ausgegrauter Knopf **über einem
       erreichbaren Feld**. Ohne die Regel „die Leiste verbraucht den
       Tipp" liefe die Figur dorthin — Aktionspunkte weg, im Zweifel der
       Zug. Der Knopf wird deshalb genau über (6,4) gelegt, und dass
       dorthin wirklich ein Weg führt, steht als Gegenprobe daneben. */
    const ueber = macheProbe();
    const p64 = punktVon(ueber.kamera, 6, 4);
    const deckel = (aktiv) => [{
      id: "trank", art: "aktion", x: p64.x - 12, y: p64.y - 12, breite: 24, hoehe: 24,
      taste: "6", aktion: { typ: AKTION.trank, wer: 1 }, beschriftung: "Trank", aktiv
    }];
    tippeAuf(ueber, 6, 4); tippeAuf(ueber, 6, 4);
    tiefGleich(ueber.geschickt[0], { typ: AKTION.gehen, wer: 1, nach: { x: 6, y: 4 } },
      "ohne Leiste führen zwei Tipps auf (6,4) die Figur dorthin");

    const grau = macheProbe({ felderLesen: () => deckel(false) });
    gleich(grau.eingabe.beiTipp(p64.x, p64.y), null, "ein ausgegrautes Feld schickt nichts");
    gleich(grau.eingabe.beiTipp(p64.x, p64.y), null, "auch beim zweiten Tipp nicht");
    gleich(grau.geschickt.length, 0,
      "und die Figur geht nicht auf das erreichbare Feld darunter");
    tiefGleich(grau.eingabe.ansicht().zeigerFeld, { x: 5, y: 4 },
      "angewählt wird dabei auch nichts — der Zeiger bleibt auf der Figur");

    const wach = macheProbe({ felderLesen: () => deckel(true) });
    tiefGleich(wach.eingabe.beiTipp(p64.x, p64.y), { typ: AKTION.trank, wer: 1 },
      "derselbe Punkt mit `aktiv: true` schickt sehr wohl die Aktion des Knopfes");

    /* `felderLesen` darf fehlen und darf werfen — sonst wäre die Eingabe
       ohne fertig gezeichnete Leiste unbrauchbar. */
    const kaputt = macheProbe({ felderLesen: () => { throw new Error("nichts"); } });
    kaputt.eingabe.beiTipp(10, 10);
    gleich(kaputt.geschickt.length, 0, "wirft `felderLesen`, geht der Tipp nicht verloren");
    behaupte(kaputt.eingabe.ansicht().zeigerFeld !== null, "sondern an die Karte");

    abschnitt("Ausweg");
    /* Der Ausweg: Ein Handy hat kein `Esc`. Verglichen wird mit einer frisch
       gebauten Eingabe, Feld für Feld — ein halb geräumter Zustand bliebe
       sonst unsichtbar. */
    const soll = abbild(macheProbe().eingabe.ansicht());
    const raus = macheProbe();
    raus.eingabe.beiTaste("4", true);
    raus.eingabe.beiTaste("Tab", true);
    tippeAuf(raus, 14, 10); tippeAuf(raus, 14, 10);
    behaupte(raus.eingabe.ansicht().warnung !== null, "vor dem Abbrechen steht eine Warnung");
    tippeAuf(raus, 14, 10);
    tiefGleich(abbild(raus.eingabe.ansicht()), soll,
      "der dritte Tipp auf dasselbe Feld räumt so auf wie eine frische Eingabe");
    gleich(raus.geschickt.length, 0, "und geschickt wurde bei alledem nichts");
    const daneben = macheProbe();
    daneben.eingabe.beiTaste("4", true); tippeAuf(daneben, 6, 4);
    daneben.eingabe.beiTipp(-500, -500);
    tiefGleich(abbild(daneben.eingabe.ansicht()), soll,
      "ein Tipp neben die Karte hebt die Anwahl ebenso auf");
    gleich(tippeAuf(daneben, 6, 4), null, "und der nächste Tipp dorthin wählt wieder nur an");
  }

  for (const zeile of berichte) console.log(`      · ${zeile}`);

  ende("Eingabe — Finger");
}
