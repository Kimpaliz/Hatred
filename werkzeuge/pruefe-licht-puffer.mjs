/* [Aufgabe: Prüfwesen] Das Licht als gebündelter Pixelpuffer — die
   Messung an dem Weg, den der Browser wirklich geht.

   ── Warum das eine eigene Datei ist ────────────────────────────────

   `werkzeuge/pruefe-bild.mjs` misst das Licht seit jeher an den
   **einzelnen Zeichenaufrufen**: Nur dort sieht man einen halben
   Bildpunkt und eine vergessene Glättung (Fehlerbuch D1). Seit dem
   08.09.2026 malt `runtime/licht.js` im Browser aber gar keine
   Rechtecke mehr, sondern füllt je Lage einen Pixelpuffer und zieht
   ihn mit `drawImage` ganzzahlig vergrößert aufs Blatt — aus
   Zehntausenden Aufrufen sind zwei geworden.

   Eine Prüfung, die nur die Rechtecke kennt, wäre ab diesem Tag für
   immer grün gewesen, ohne noch irgendetwas über Janniks Bild zu
   sagen. Das ist genau der Fall aus Fehlerbuch C5: Zu dem, was ein
   Werkzeug **erzeugt**, muss es eine Prüfung geben, die das Erzeugte
   selbst anfasst. Also stehen hier dieselben Behauptungen ein zweites
   Mal — nur über **Bildpunkte** statt über Rechtecke.

   Beides in `pruefe-bild.mjs` hätte die Grenze von tausend Zeilen
   gerissen (Regel 8), und die wird nicht geduldet, sondern geteilt.

   ── Warum die Brücke die wichtigste Behauptung ist ─────────────────

   Abschnitt 2 vergleicht beide Wege Bildpunkt für Bildpunkt. Ohne sie
   sagte `pruefe-bild.mjs` nichts mehr über das, was im Browser zu
   sehen ist, und diese Datei nichts über die harten Kanten. Sie ist
   zugleich der Beweis für Regel 12: Ein Umbau ohne sichtbare Änderung
   lässt sich beweisen — gleiche Eingaben, gleiches Ergebnis.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/licht.js` (jede gemessene Funktion),
   `werkzeuge/buehne-browser.mjs` (`macheBildflaeche` und `bildpunkt` —
   das Blatt, das den Puffer mitschreibt), `werkzeuge/pruefe-bild.mjs`
   (misst dieselbe Funktion über den Rechteckweg), `spiel/gitter.mjs`
   (`macheKarte`), `werkzeuge/helfer.mjs` (Behauptungen und Abschluss)
   und `werkzeuge/pruefe-alles.mjs`, das diese Datei als eigenen
   Prozess startet. */

import { abschnitt, behaupte, gleich, tiefGleich, ende } from "./helfer.mjs";
import { macheBildflaeche, bildpunkt } from "./buehne-browser.mjs";
import { macheKarte } from "../spiel/gitter.mjs";
import { LICHTPUNKT, PUNKTE_JE_FELD, STUFEN, macheLichtwerk } from "../runtime/licht.js";

/* Das schmale Blatt aus `pruefe-bild.mjs`: kein `drawImage`, also
   nimmt `runtime/licht.js` den Rechteckweg. Es steht hier noch einmal
   und nicht als Ausfuhr drüben, weil es zwei verschiedene Dinge misst
   — dort die Ganzzahligkeit jedes Aufrufs, hier nur die Farben, mit
   denen der Vergleich in Abschnitt 2 gefüttert wird. */
function macheRechteckflaeche(breite, hoehe) {
  const aufrufe = [];
  return {
    aufrufe,
    canvas: { width: breite, height: hoehe },
    set imageSmoothingEnabled(wert) { aufrufe.push(["glaettung", wert]); },
    get imageSmoothingEnabled() { return false; },
    set fillStyle(wert) { aufrufe.push(["farbe", wert]); },
    get fillStyle() { return "#000000"; },
    set globalCompositeOperation(wert) { aufrufe.push(["mischen", wert]); },
    get globalCompositeOperation() { return "source-over"; },
    fillRect(x, y, b, h) { aufrufe.push(["rechteck", x, y, b, h]); }
  };
}

/* ── 1 · Das Licht als gebündelter Pixelpuffer ─────────────────────

   Seit dem 08.09.2026 malt `runtime/licht.js` im Browser nicht mehr
   Rechteck für Rechteck, sondern füllt je Lage **einen** Pixelpuffer
   und zieht ihn mit `drawImage` ganzzahlig vergrößert aufs Blatt.
   `pruefe-bild.mjs` misst den Rechteckweg — den geht der Browser nie mehr.
   Eine Prüfung, die nur ihn kennt, wäre ab heute für immer grün, ohne
   noch irgendetwas über das Bild zu sagen (Fehlerbuch C5).

   Deshalb hier dieselben Behauptungen ein zweites Mal, nur über
   **Bildpunkte** statt über Rechtecke. */
abschnitt("1 · Licht als Pixelpuffer");
let pufferBericht = "";
{
  const karte = macheKarte(32, 24);
  const werk = macheLichtwerk(karte);
  werk.setzeQuellen([{ x: 6, y: 6, art: "fackel", staerke: 1 }]);
  werk.rechne(0.75, karte);

  const kamera = { x: 5, y: 37, vergroesserung: 3, breite: 480, hoehe: 240 };
  const flaeche = macheBildflaeche(480, 240);
  const gezeichnet = werk.zeichneAuf(flaeche, kamera);
  const lagen = flaeche.lagen();
  const mischen = flaeche.aufrufe().filter((a) => a[0] === "mischen").map((a) => a[1]);

  gleich(gezeichnet, 2, "aus Zehntausenden Aufrufen sind zwei geworden");
  gleich(lagen.length, gezeichnet, "zeichneAuf meldet genau so viele Aufrufe, wie es macht");
  gleich(flaeche.aufrufe().filter((a) => a[0] === "rechteck").length, 0,
    "über den Puffer wird kein einziges Rechteck mehr gesetzt");
  gleich(flaeche.nebenblaetter(), 1, "ein Nebenblatt für beide Lagen, nicht zwei");

  /* Merkmal 4 der Abnahme: harte Kanten. Zwei Dinge zusammen — die
     Glättung ist beim Vergrößern aus, und die Vergrößerung ist eine
     ganze Zahl. Fällt eines von beiden, ist die Pixelgrafik weich. */
  for (const lage of lagen) {
    gleich(lage.glaettung, false,
      `die Lage ${lage.mischen} wird ungeglättet vergrößert (Fehlerbuch D1)`);
    behaupte([lage.x, lage.y, lage.breite, lage.hoehe].every(Number.isInteger),
      `die Lage ${lage.mischen} liegt auf ganzen Bildpunkten ` +
      `(${lage.x}, ${lage.y}, ${lage.breite}×${lage.hoehe})`);
    gleich(lage.breite / lage.puffer.breite, kamera.vergroesserung,
      `die Lage ${lage.mischen} ist genau ${kamera.vergroesserung}-fach breit, nicht krumm`);
    gleich(lage.hoehe / lage.puffer.hoehe, kamera.vergroesserung,
      `die Lage ${lage.mischen} ist genau ${kamera.vergroesserung}-fach hoch, nicht krumm`);
  }

  /* Der Puffer rechnet in **Weltbildpunkten**, nicht in Lichtpunkten.
     Vier Weltpunkte je Lichtpunkt: In Lichtpunktauflösung hätten die
     Spannen an den Hexgrenzen gar keinen Ort mehr, und das Licht liefe
     um die Wand herum (Abschnitt 7b misst genau das). */
  const masse = werk.pufferMasse();
  gleich(masse.breite % LICHTPUNKT, 0,
    `der Puffer ist ein ganzes Vielfaches von ${LICHTPUNKT} breit (${masse.breite})`);
  gleich(masse.hoehe % LICHTPUNKT, 0,
    `der Puffer ist ein ganzes Vielfaches von ${LICHTPUNKT} hoch (${masse.hoehe})`);
  behaupte(masse.breite >= Math.ceil(480 / 3) && masse.breite < 480 / 3 + 2 * LICHTPUNKT,
    `der Puffer deckt das Fenster ab und nicht mehr (${masse.breite} für 480/3 Weltpunkte)`);

  /* Nur der Ausschnitt liegt im Puffer, nicht die ganze Karte. Ohne
     diese Behauptung wüchse der Aufwand mit der Kartengröße statt mit
     dem Fenster — und niemand merkte es, weil das Bild gleich aussieht. */
  const alle = karte.breite * karte.hoehe * PUNKTE_JE_FELD * PUNKTE_JE_FELD;
  behaupte(masse.breite * masse.hoehe < alle * LICHTPUNKT * LICHTPUNKT / 4,
    `nur der Ausschnitt kommt in den Puffer: ${masse.breite * masse.hoehe} statt ` +
    `${alle * LICHTPUNKT * LICHTPUNKT} Weltbildpunkte`);

  gleich(mischen[0], "multiply", "die erste Lage multipliziert");
  gleich(lagen.length > 0 ? lagen[0].mischen : "gar nichts", "multiply",
    "und die erste gezeichnete Lage tut es auch");
  gleich(mischen.filter((m) => m === "lighter").length, 1, "die warme Lage kommt genau einmal");
  gleich(lagen.filter((l) => l.mischen === "lighter").length, 1,
    "und sie wird genau einmal gezeichnet — nicht zweimal und nicht null mal");
  behaupte(mischen.indexOf("multiply") < mischen.indexOf("lighter"),
    "erst multiplizieren, dann glühen — umgekehrt multiplizierte man das Glühen weg");
  gleich(mischen[mischen.length - 1], "source-over",
    "am Ende steht der Grundzustand wieder — sonst zeichnet alles Spätere additiv");
  gleich(flaeche.globalCompositeOperation, "source-over",
    "und das Blatt steht wirklich wieder darauf, nicht nur die Mitschrift");

  /* Statt „so viele verschiedene Farbzeichenketten" jetzt: so viele
     verschiedene Farbwerte, die wirklich im Puffer stehen. Das ist die
     schärfere Zählung — eine Zeichenkette kann gebaut werden, ohne je
     auf dem Blatt zu landen. */
  const dunkel = lagen.find((l) => l.mischen === "multiply") || null;
  const warm = lagen.find((l) => l.mischen === "lighter") || null;
  behaupte(dunkel !== null && warm !== null,
    "beide Lagen sind wirklich gezeichnet worden und nicht nur angekündigt");
  /* Eine fehlende Lage darf hier keinen Absturz geben, sondern eine
     rote Behauptung: Ein Prüfer, der stirbt, sagt nicht, was fehlt. */
  const zaehle = (lage) => {
    const toene = new Set();
    let gesetzt = 0;
    if (lage === null) return { toene, gesetzt };
    for (let y = 0; y < lage.puffer.hoehe; y++) {
      for (let x = 0; x < lage.puffer.breite; x++) {
        const p = bildpunkt(lage, x, y);
        if (p.a === 0) continue;
        gesetzt++;
        toene.add(`${p.r}|${p.g}|${p.b}`);
      }
    }
    return { toene, gesetzt };
  };
  const dunkelZahl = zaehle(dunkel);
  const warmZahl = zaehle(warm);
  behaupte(dunkelZahl.toene.size <= STUFEN ** 3,
    `höchstens ${STUFEN ** 3} verschiedene Farbwerte im Puffer, gezählt ` +
    `${dunkelZahl.toene.size}`);
  behaupte(dunkelZahl.toene.size >= 2,
    `die Stufen kommen wirklich im Puffer an (${dunkelZahl.toene.size} Farbwerte)`);
  behaupte(dunkelZahl.gesetzt > 0,
    `die multiplizierende Lage setzt Bildpunkte (${dunkelZahl.gesetzt})`);
  behaupte(warmZahl.gesetzt > 0,
    `die warme Lage glüht im Fackelkern (${warmZahl.gesetzt} Bildpunkte)`);
  behaupte(warmZahl.gesetzt < dunkelZahl.gesetzt,
    `und sie glüht nur dort, nicht überall (${warmZahl.gesetzt} von ${dunkelZahl.gesetzt})`);
  /* Jeder gesetzte Bildpunkt ist voll deckend. Ein halbdurchsichtiger
     wäre unter „multiply" ein aufgehellter Fleck, den niemand bestellt
     hat — und im Bildschirmfoto sähe man ihn kaum. */
  let halb = 0;
  for (const lage of lagen) {
    for (let i = 3; i < lage.puffer.daten.length; i += 4) {
      const a = lage.puffer.daten[i];
      if (a !== 0 && a !== 255) halb++;
    }
  }
  gleich(halb, 0, "jeder Bildpunkt ist entweder ganz da oder gar nicht");

  gleich(werk.zeichneAuf(null, {}), 0, "auch über den Puffer zeichnet nichts ohne Blatt");

  /* Und die Zahl, um die es bei der ganzen Sache ging: Dasselbe Bild
     über den Rechteckweg. Ohne diesen Vergleich stünde nirgends, dass
     der Puffer wirklich Aufrufe spart — nur, dass er zwei macht. */
  const rechteckflaeche = macheRechteckflaeche(480, 240);
  const rechteckZahl = werk.zeichneAuf(rechteckflaeche, kamera);
  behaupte(rechteckZahl > 100 * gezeichnet,
    `der Puffer spart Aufrufe: ${gezeichnet} statt ${rechteckZahl}`);
  pufferBericht = `Pixelpuffer: ${gezeichnet} Zeichenaufrufe statt ${rechteckZahl} ` +
    `Rechtecken, Puffer ${masse.breite}×${masse.hoehe} Weltbildpunkte, ` +
    `${dunkelZahl.toene.size} Farbwerte, ${warmZahl.gesetzt} glühende Bildpunkte`;
}

/* ── 2 · Beide Wege malen dasselbe Bild ────────────────────────────

   Die Brücke zwischen `pruefe-bild.mjs` und Abschnitt 1, und die
   Behauptung, die Regel 12 einlöst: Ein Umbau ohne sichtbare Änderung
   lässt sich beweisen — gleiche Eingaben, gleiches Ergebnis, Bildpunkt für
   Bildpunkt. Gemessen bei Vergrößerung 1, weil dort ein Bildpunkt des
   Puffers genau ein Bildpunkt des Blattes ist und kein Skalieren
   dazwischensteht, das den Vergleich verwischen könnte.

   Verglichen wird **je Lage**: Ein Weg, der einen Bildpunkt der warmen
   Lage in die dunkle malt, käme sonst durch. Und `null` — „hier wurde
   nichts gesetzt" — ist ein Wert wie jeder andere: Wer einen Bildpunkt
   bemalt, den der andere frei lässt, malt ein anderes Bild. */
abschnitt("2 · Rechteckweg und Puffer sind dasselbe Bild");
let brueckeBericht = "";
{
  const breite = 260;
  const hoehe = 180;
  /* Ein Kameraversatz, der kein Vielfaches von LICHTPUNKT ist, und ein
     Ausschnitt, der Kern, Rand und Kartenkante zugleich zeigt. */
  const kamera = { x: 7, y: 11, vergroesserung: 1, breite, hoehe };

  const felderVon = (fuellen) => {
    const karte = macheKarte(20, 16);
    const werk = macheLichtwerk(karte);
    werk.setzeQuellen([
      { x: 3, y: 3, art: "fackel", staerke: 1 },
      { x: 8, y: 5, art: "arkan", staerke: 0.9 },
      { x: 5, y: 8, art: "gold", staerke: 0.7 }
    ]);
    werk.rechne(0.75, karte);
    return fuellen(werk);
  };

  const ausRechtecken = felderVon((werk) => {
    const flaeche = macheRechteckflaeche(breite, hoehe);
    werk.zeichneAuf(flaeche, kamera);
    const felder = new Map();
    let mischen = "source-over";
    let farbe = null;
    for (const a of flaeche.aufrufe) {
      if (a[0] === "mischen") { mischen = a[1]; continue; }
      if (a[0] === "farbe") { farbe = a[1]; continue; }
      if (a[0] !== "rechteck") continue;
      let feld = felder.get(mischen);
      if (!feld) { feld = new Array(breite * hoehe).fill(null); felder.set(mischen, feld); }
      for (let y = a[2]; y < a[2] + a[4]; y++) {
        for (let x = a[1]; x < a[1] + a[3]; x++) {
          if (x < 0 || y < 0 || x >= breite || y >= hoehe) continue;
          feld[y * breite + x] = farbe;
        }
      }
    }
    return felder;
  });

  const ausPuffer = felderVon((werk) => {
    const flaeche = macheBildflaeche(breite, hoehe);
    werk.zeichneAuf(flaeche, kamera);
    const felder = new Map();
    for (const lage of flaeche.lagen()) {
      let feld = felder.get(lage.mischen);
      if (!feld) { feld = new Array(breite * hoehe).fill(null); felder.set(lage.mischen, feld); }
      for (let py = 0; py < lage.puffer.hoehe; py++) {
        for (let px = 0; px < lage.puffer.breite; px++) {
          const p = bildpunkt(lage, px, py);
          if (p.a === 0) continue;
          const x = lage.x + px;
          const y = lage.y + py;
          if (x < 0 || y < 0 || x >= breite || y >= hoehe) continue;
          feld[y * breite + x] = `rgb(${p.r},${p.g},${p.b})`;
        }
      }
    }
    return felder;
  });

  tiefGleich([...ausPuffer.keys()].sort(), [...ausRechtecken.keys()].sort(),
    "beide Wege legen dieselben Lagen auf");
  let ungleich = 0;
  let bemalt = 0;
  let ersteAbweichung = "";
  for (const [lage, links] of ausRechtecken) {
    const rechts = ausPuffer.get(lage) || new Array(breite * hoehe).fill(null);
    for (let i = 0; i < links.length; i++) {
      if (links[i] !== null) bemalt++;
      if (links[i] === rechts[i]) continue;
      ungleich++;
      if (ersteAbweichung === "") {
        ersteAbweichung = `${lage} bei ${i % breite},${Math.floor(i / breite)}: ` +
          `Rechteck ${links[i]} gegen Puffer ${rechts[i]}`;
      }
    }
  }
  behaupte(bemalt > 10000,
    `der Vergleich fasst wirklich ein Bild an und nicht drei Bildpunkte (${bemalt} bemalt)`);
  gleich(ungleich, 0,
    `beide Wege malen Bildpunkt für Bildpunkt dasselbe${ersteAbweichung && " — " +
      ersteAbweichung}`);
  brueckeBericht = `${breite}×${hoehe} bei Vergrößerung 1, drei Quellen: ${bemalt} bemalte ` +
    `Bildpunkte über beide Lagen, ${ungleich} Abweichungen zwischen Rechteck und Puffer`;
}

/* ── 3 · Die volle Übersicht ────────────────────────────────────────

   Der Fall, um den es beim ganzen Umbau ging, in seinen echten Maßen:
   ein 1280×720-Fenster bei Vergrößerung 1 über eine 60×46-Felder-Höhle
   mit 42 Fackeln — genau die Zahl, mit der der Zweig am 08.09.2026
   987,9 ms je Bild gemessen hat. Die Zahl daneben ist keine Schranke,
   sondern eine Messung: Eine Zeitschranke in der Prüfkette wäre auf
   einem anderen Rechner mal rot und mal grün. Gedruckt wird sie
   trotzdem, damit auffällt, wenn aus zwei Aufrufen wieder Tausende
   werden. */
abschnitt("3 · Volle Übersicht");
let uebersichtBericht = "";
{
  const karte = macheKarte(60, 46);
  const werk = macheLichtwerk(karte);
  const fackeln = [];
  for (let n = 0; n < 42; n++) {
    fackeln.push({ x: 1 + (n * 7) % 58, y: 1 + (n * 5) % 44, art: "fackel", staerke: 1 });
  }
  werk.setzeQuellen(fackeln);
  werk.rechne(0, karte);
  const kamera = { x: 7, y: 11, vergroesserung: 1, breite: 1280, hoehe: 720 };
  const mitPuffer = werk.zeichneAuf(macheBildflaeche(1280, 720), kamera);
  const mitRechtecken = werk.zeichneAuf(macheRechteckflaeche(1280, 720), kamera);
  gleich(mitPuffer, 2,
    "auch bei voller Übersicht bleiben es zwei Zeichenaufrufe und nicht mehr");
  behaupte(mitRechtecken > 20000,
    `derselbe Ausschnitt kostete als Rechtecke ${mitRechtecken} Aufrufe`);
  uebersichtBericht = `volle Übersicht (1280×720, Vergrößerung 1, 60×46 Felder, ` +
    `42 Fackeln): ${mitRechtecken} Rechtecke gegen ${mitPuffer} Zeichenaufrufe`;
}

console.log(`      · ${pufferBericht}`);
console.log(`      · ${brueckeBericht}`);
console.log(`      · ${uebersichtBericht}`);

ende("Licht als Pixelpuffer");
