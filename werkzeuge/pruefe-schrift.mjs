/* [Aufgabe: Prüfwesen] Die Messung an Schrift und Kamera — ohne Browser,
   über ein Zeichenblatt, das jeden Aufruf mitschreibt.

   ── Warum ein mitschreibendes Ersatzblatt ──────────────────────────

   Die zwei Fehler, an denen Pixelgrafik stirbt, sieht man im fertigen
   Bild zuerst gar nicht: ein Zeichenaufruf auf einem halben Bildpunkt
   und eine Glättung, die niemand abgeschaltet hat (Fehlerbuch D1). In
   der **Mitschrift** sind es eine Zahl mit Komma und ein fehlendes
   `imageSmoothingEnabled = false`. Also wird ein winziges Blatt
   gereicht, das jeden Aufruf mitschreibt, und behauptet wird über die
   Mitschrift — nicht über das Auge.

   Geprüft wird jeweils der Fall, der ohne die Arbeit falsch wäre:

   · **Zwei Zeichen mit demselben Raster.** Der übliche Weg, Ö zu
     bauen, ist O zu vervielfältigen — und die Punkte zu vergessen.
     Das Ergebnis besteht jede Formprüfung: sieben Zeilen, fünf breit,
     nicht leer. Deshalb werden alle Raster **paarweise** verglichen,
     und die Umlaute zusätzlich gegen ihren Grundbuchstaben.
   · **Die Breite und das Bild laufen auseinander.** `breiteVon` ist
     eine Multiplikation, das Zeichnen eine Schleife. Beide werden
     gegeneinander gemessen: für **jedes** Zeichen, indem es zwischen
     zwei M gesetzt wird, deren äußerste Spalten gesetzt sind.
   · **Die Vergrößerung ist keine ganze Zahl.** Eine Kamera, die
     2,7 zurückgibt, sieht in keinem Bild falsch aus — sie macht nur
     jede zweite Kante weich. Geprüft wird über tausend Fenstergrößen.
   · **Erst vergrößern, dann runden.** Der Unterschied ist unsichtbar
     und trotzdem der Grund, warum ein Bild beim Laufen wackelt:
     Rundet man in Bildschirmpunkten, liegt eine Figur um Bruchteile
     eines logischen Punktes neben dem Boden. Gemessen wird, dass jeder
     Abstand zweier Feldpunkte ein Vielfaches der Vergrößerung ist.
   · **Die Kamera kommt nie an.** Wer die weiche Lage selbst rundet,
     bleibt einen Punkt vor dem Ziel stehen, weil der nächste Schritt
     auf null rundet. Deshalb wird nicht nur „sie bewegt sich" geprüft,
     sondern „sie steht am Ende **genau** auf dem Ziel" — und dass sie
     nach fünf Bildern noch **nicht** dort ist, sonst bestünde ein
     Sprung dieselbe Prüfung.

   ── Was `--zeigen` soll ────────────────────────────────────────────

   Die Raster stehen in `runtime/schrift.js` einzeilig, sonst sprengte
   die Datei die Zeilengrenze. Damit trotzdem niemand blind daran
   ändert, druckt `node werkzeuge/pruefe-schrift.mjs --zeigen` den
   ganzen Vorrat als Bild — gezeichnet durch `zeichne` auf das
   Ersatzblatt, also genau das, was später auf dem Schirm steht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/schrift.js` und `runtime/kamera.js` (jede gemessene
   Funktion), `runtime/licht.js` (`KACHEL`), `spiel/bauart.mjs`
   (`PIXEL_JE_FELD` — dieselbe 16 im Kern, hier gegengerechnet),
   `spiel/katalog/helden.mjs` (`sicht`, woraus der kleinste Ausschnitt
   kommt), `spiel/gitter.mjs` (`macheKarte`), `spiel/zufall.mjs` (die
   tausend Punkte kommen aus einer festen Saat, damit ein Fehler
   wiederholbar ist), `werkzeuge/helfer.mjs` und
   `werkzeuge/pruefe-alles.mjs`, das diese Datei als eigenen Prozess
   startet. */

import { abschnitt, behaupte, gleich, nahe, wirft, ende } from "./helfer.mjs";
import { macheKarte } from "../spiel/gitter.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { PIXEL_JE_FELD } from "../spiel/bauart.mjs";
import { HELDEN } from "../spiel/katalog/helden.mjs";
import { KACHEL } from "../runtime/licht.js";
import { FARBEN } from "../runtime/palette.js";
import {
  ZEICHEN, ERSATZ, ZEICHEN_BREIT, ZEICHEN_HOCH, ABSTAND, VORSCHUB, ZEILE,
  SCHATTEN_FARBE, breiteVon, rasterVon, zeichne
} from "../runtime/schrift.js";
import {
  WEITESTE_SICHT, MINDEST_FELDER, MINDEST_KANTE, vergroesserungFuer, macheKamera
} from "../runtime/kamera.js";

const TINTE = FARBEN.hudSchrift;

/* ── Das mitschreibende Zeichenblatt ────────────────────────────────
   Nur die drei Dinge, die `zeichne` anfasst. Jedes Rechteck merkt sich
   die Farbe, die zu seiner Zeit gesetzt war — nur so lässt sich
   Schatten von Schrift unterscheiden. */
function macheErsatzflaeche() {
  const aufrufe = [];
  let farbe = "#000000";
  return {
    aufrufe,
    set imageSmoothingEnabled(wert) { aufrufe.push(["glaettung", wert]); },
    get imageSmoothingEnabled() { return false; },
    set fillStyle(wert) { farbe = wert; aufrufe.push(["farbe", wert]); },
    get fillStyle() { return farbe; },
    fillRect(x, y, breite, hoehe) { aufrufe.push(["rechteck", x, y, breite, hoehe, farbe]); }
  };
}

const nurArt = (aufrufe, art) => aufrufe.filter((a) => a[0] === art);

/* Der erste Aufruf, der nicht auf ganzen Bildpunkten liegt. */
function ersterBruch(aufrufe) {
  for (const a of nurArt(aufrufe, "rechteck")) {
    if (![a[1], a[2], a[3], a[4]].every(Number.isInteger)) return a;
  }
  return null;
}

/* Einmal zeichnen und alles zurückgeben, worüber danach behauptet wird. */
function male(text, x = 0, y = 0, wahlen = {}) {
  const flaeche = macheErsatzflaeche();
  const breite = zeichne(flaeche, text, x, y, TINTE, { schatten: false, ...wahlen });
  const rechtecke = nurArt(flaeche.aufrufe, "rechteck");
  const tinte = rechtecke.filter((r) => r[5] === TINTE);
  return { flaeche, breite, rechtecke, tinte };
}

const kastenVon = (rechtecke) => ({
  vonX: Math.min(...rechtecke.map((r) => r[1])),
  bisX: Math.max(...rechtecke.map((r) => r[1] + r[3] - 1)),
  vonY: Math.min(...rechtecke.map((r) => r[2])),
  bisY: Math.max(...rechtecke.map((r) => r[2] + r[4] - 1))
});

/* Gesetzte Punkte und waagerechte Läufe eines Rasters — die zwei
   Zahlen, gegen die das Gezeichnete gemessen wird. */
function rasterZahlen(raster) {
  let punkte = 0;
  let laeufe = 0;
  for (const zeile of raster) {
    let drin = false;
    for (const z of zeile) {
      if (z === "#") {
        punkte++;
        if (!drin) laeufe++;
        drin = true;
      } else drin = false;
    }
  }
  return { punkte, laeufe };
}

/* ── 0 · Selbstprobe des Prüfers ────────────────────────────────────
   Ein Prüfer, der jede Mitschrift für sauber hält, meldete für immer
   „grün". Also erst ihn selbst rot machen. */
abschnitt("0 · Selbstprobe");
{
  const flaeche = macheErsatzflaeche();
  flaeche.fillRect(1, 2, 3, 4);
  gleich(nurArt(flaeche.aufrufe, "rechteck").length, 1, "das Ersatzblatt schreibt mit");
  behaupte(ersterBruch(flaeche.aufrufe) === null, "ein ganzzahliges Rechteck gilt als sauber");
  flaeche.fillRect(12.5, 2, 3, 4);
  behaupte(ersterBruch(flaeche.aufrufe) !== null,
    "ein Rechteck auf 12,5 schlägt an — sonst prüfte die Mitschrift nichts");
  const zahlen = rasterZahlen(["#.##.", "....."]);
  gleich(zahlen.punkte, 3, "gesetzte Punkte werden gezählt");
  gleich(zahlen.laeufe, 2, "waagerechte Läufe werden gezählt");
}

/* ── 1 · Der Vorrat ─────────────────────────────────────────────────*/
abschnitt("1 · Vorrat");
const schluessel = Object.keys(ZEICHEN);
gleich(ZEICHEN_BREIT, 5, "Zeichenbreite");
gleich(ZEICHEN_HOCH, 7, "Zeichenhöhe");
gleich(VORSCHUB, ZEICHEN_BREIT + ABSTAND, "Vorschub ist Breite plus Lücke");
gleich(ZEILE, ZEICHEN_HOCH + 2, "Zeilenhöhe lässt Platz für Schatten und Luft");
gleich(SCHATTEN_FARBE, FARBEN.kontur, "der Schatten kommt aus der Palette");

{
  let formfehler = 0;
  let leere = 0;
  for (const zeichen of schluessel) {
    const raster = ZEICHEN[zeichen];
    if (!Array.isArray(raster) || raster.length !== ZEICHEN_HOCH) {
      console.log(`    "${zeichen}": ${raster && raster.length} Zeilen`);
      formfehler++;
      continue;
    }
    for (const zeile of raster) {
      if (typeof zeile !== "string" || zeile.length !== ZEICHEN_BREIT || /[^#.]/.test(zeile)) {
        console.log(`    "${zeichen}": Zeile "${zeile}"`);
        formfehler++;
      }
    }
    if (zeichen !== " " && !raster.some((z) => z.includes("#"))) leere++;
  }
  gleich(formfehler, 0, `alle ${schluessel.length} Zeichen sind ${ZEICHEN_BREIT}×${ZEICHEN_HOCH}`);
  gleich(leere, 0, "kein Zeichen außer dem Leerzeichen ist leer");
  gleich(ERSATZ.length, ZEICHEN_HOCH, "auch der Ersatzkasten hat sieben Zeilen");
}

/* Paarweise verschieden — der Fall, den jede Formprüfung durchlässt. */
{
  const gesehen = new Map();
  let doppelt = 0;
  for (const zeichen of schluessel) {
    const abdruck = ZEICHEN[zeichen].join("/");
    if (gesehen.has(abdruck)) {
      console.log(`    "${zeichen}" hat dasselbe Raster wie "${gesehen.get(abdruck)}"`);
      doppelt++;
    }
    gesehen.set(abdruck, zeichen);
  }
  gleich(doppelt, 0, "kein Zeichen sieht aus wie ein anderes");
  behaupte(!gesehen.has(ERSATZ.join("/")), "der Ersatzkasten sieht nach nichts sonst aus");
}

/* Vollständigkeit. Ohne Umlaute und ß wäre die Schrift für dieses
   Spiel unbrauchbar — „Übersicht" ohne Ü sieht aus wie ein Fehler. */
{
  const gross = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
  const klein = [..."abcdefghijklmnopqrstuvwxyz"];
  const ziffern = [..."0123456789"];
  const deutsch = [..."ÄÖÜäöüß"];
  const satz = [".", ",", ":", ";", "!", "?", "'", "\"", "(", ")", "+", "-", "/", "%",
    "×", "°", "→", "←", "↑", "↓", "✕", "♥", "●", "○"];
  for (const [name, liste] of [["Großbuchstaben", gross], ["Kleinbuchstaben", klein],
    ["Ziffern", ziffern], ["Umlaute und ß", deutsch], ["Sonderzeichen", satz],
    ["Leerzeichen", [" "]]]) {
    const fehlt = liste.filter((z) => !(z in ZEICHEN));
    gleich(fehlt.length, 0, `${name} vollständig${fehlt.length ? ` (fehlt: ${fehlt})` : ""}`);
  }
}

/* Die Umlautpunkte: genau zwei, in Zeile 0, und der Körper anders als
   beim Grundbuchstaben. */
for (const [umlaut, grund] of [["Ä", "A"], ["Ö", "O"], ["Ü", "U"],
  ["ä", "a"], ["ö", "o"], ["ü", "u"]]) {
  const raster = ZEICHEN[umlaut];
  const punkte = [...raster[0]].filter((z) => z === "#").length;
  gleich(punkte, 2, `"${umlaut}" trägt zwei Punkte in Zeile 0`);
  behaupte(raster.join("/") !== ZEICHEN[grund].join("/"),
    `"${umlaut}" ist nicht dasselbe Raster wie "${grund}"`);
}
behaupte(ZEICHEN["ß"].some((z) => z.includes("#")), "ß hat ein Raster");

/* ── 2 · Breite und Bild ────────────────────────────────────────────*/
abschnitt("2 · Breite");
gleich(breiteVon(""), 0, "leerer Text ist null breit");
gleich(breiteVon("A"), ZEICHEN_BREIT, "ein Zeichen ist so breit wie sein Raster");
gleich(breiteVon("AB"), 2 * VORSCHUB - ABSTAND, "zwei Zeichen mit einer Lücke");
gleich(breiteVon("A→B"), breiteVon("AxB"), "ein Pfeil zählt wie ein Zeichen, nicht wie zwei");
gleich(breiteVon("Hallo"), 5 * VORSCHUB - ABSTAND, "fünf Zeichen");

{
  /* Für jedes Zeichen: zwischen zwei M. Deren äußerste Spalten sind
     gesetzt, also muss der Kasten des Gezeichneten genau von `x` bis
     `x + breiteVon − 1` reichen. */
  let breitenfehler = 0;
  let kastenfehler = 0;
  let punktefehler = 0;
  let lauffehler = 0;
  for (const zeichen of schluessel) {
    const text = `M${zeichen}M`;
    const { breite, tinte } = male(text, 40, 20);
    const kasten = kastenVon(tinte);
    if (breite !== breiteVon(text)) breitenfehler++;
    if (kasten.vonX !== 40 || kasten.bisX !== 40 + breiteVon(text) - 1) {
      console.log(`    "${zeichen}": Kasten ${kasten.vonX}..${kasten.bisX},` +
        ` erwartet 40..${40 + breiteVon(text) - 1}`);
      kastenfehler++;
    }
    /* Und dasselbe Zeichen allein: Punkte und Läufe müssen zum Raster
       passen, sonst zeichnet jemand mehr oder weniger als da steht. */
    const einzeln = male(zeichen, 0, 0);
    const soll = rasterZahlen(rasterVon(zeichen));
    const gemalt = einzeln.tinte.reduce((summe, r) => summe + r[3], 0);
    if (gemalt !== soll.punkte) punktefehler++;
    if (einzeln.tinte.length !== soll.laeufe) lauffehler++;
  }
  gleich(breitenfehler, 0, "zeichne gibt für jedes Zeichen breiteVon zurück");
  gleich(kastenfehler, 0, "das Gezeichnete füllt genau breiteVon");
  gleich(punktefehler, 0, "gezeichnete Punkte = gesetzte Punkte des Rasters");
  gleich(lauffehler, 0, "waagerechte Läufe werden zu je einem Rechteck");
}

{
  /* Kein Zeichen ragt aus seinem Feld. Eine Zeile mit sechs Zeichen
     Breite fiele sonst erst auf, wenn zwei Buchstaben zusammenkleben. */
  let ueberstand = 0;
  for (const zeichen of schluessel) {
    const { tinte } = male(zeichen, 0, 0);
    if (tinte.length === 0) continue;
    const kasten = kastenVon(tinte);
    if (kasten.vonX < 0 || kasten.bisX >= ZEICHEN_BREIT
      || kasten.vonY < 0 || kasten.bisY >= ZEICHEN_HOCH) ueberstand++;
  }
  gleich(ueberstand, 0, "kein Zeichen ragt über sein 5×7-Feld hinaus");
}

/* ── 3 · Wie gezeichnet wird ────────────────────────────────────────*/
abschnitt("3 · Zeichnen");
{
  const { flaeche, rechtecke } = male("Höhe 3", 12.4, 7.6);
  behaupte(ersterBruch(flaeche.aufrufe) === null,
    "auch mit 12,4 / 7,6 liegt jedes Rechteck auf ganzen Bildpunkten");
  const kasten = kastenVon(rechtecke);
  gleich(kasten.vonX, 12, "x wird gerundet, bevor gezeichnet wird");
  const erster = flaeche.aufrufe.findIndex((a) => a[0] === "rechteck");
  const glaettung = flaeche.aufrufe.findIndex((a) => a[0] === "glaettung" && a[1] === false);
  behaupte(glaettung >= 0 && glaettung < erster,
    "die Glättung wird abgeschaltet, bevor das erste Rechteck kommt");
}

{
  /* Eine krumme Vergrößerung ist der zweite Weg zu halben Punkten. */
  const krumm = male("AB", 0, 0, { gross: 2.5 });
  behaupte(ersterBruch(krumm.flaeche.aufrufe) === null, "gross 2,5 macht keine halben Punkte");
  gleich(krumm.breite, breiteVon("AB") * 2, "gross 2,5 wirkt wie 2");
  const klein = male("AB", 0, 0, { gross: 0 });
  gleich(klein.breite, breiteVon("AB"), "gross 0 wirkt wie 1 — nichts wird unsichtbar");
  const drei = male("A", 0, 0, { gross: 3 });
  gleich(kastenVon(drei.tinte).bisX, ZEICHEN_BREIT * 3 - 1, "gross 3 verdreifacht die Breite");
  gleich(drei.tinte.every((r) => r[3] % 3 === 0 && r[4] === 3), true,
    "bei gross 3 ist jedes Rechteck ein Vielfaches von drei");
}

{
  /* Der Schatten: zuerst, um genau `gross` versetzt, in Konturfarbe. */
  const flaeche = macheErsatzflaeche();
  zeichne(flaeche, "Ag", 10, 10, TINTE, { gross: 2, schatten: true });
  const rechtecke = nurArt(flaeche.aufrufe, "rechteck");
  const schatten = rechtecke.filter((r) => r[5] === SCHATTEN_FARBE);
  const tinte = rechtecke.filter((r) => r[5] === TINTE);
  gleich(schatten.length, tinte.length, "Schatten und Schrift haben gleich viele Rechtecke");
  behaupte(rechtecke.indexOf(schatten[0]) < rechtecke.indexOf(tinte[0]),
    "der Schatten wird zuerst gemalt — sonst deckt er die Schrift zu");
  gleich(kastenVon(schatten).vonX - kastenVon(tinte).vonX, 2,
    "der Schatten steht um gross Punkte weiter rechts");
  gleich(kastenVon(schatten).vonY - kastenVon(tinte).vonY, 2,
    "der Schatten steht um gross Punkte weiter unten");
  const ohne = male("Ag", 10, 10, { gross: 2 });
  gleich(ohne.rechtecke.length, tinte.length, "ohne Schatten die Hälfte der Rechtecke");
}

{
  /* Ein unbekanntes Zeichen wird zum Kasten, nicht zu nichts. */
  const unbekannt = male("§", 0, 0);
  const soll = rasterZahlen(ERSATZ);
  gleich(unbekannt.tinte.reduce((s, r) => s + r[3], 0), soll.punkte,
    "ein unbekanntes Zeichen wird als Kasten sichtbar");
  gleich(breiteVon("§"), ZEICHEN_BREIT, "und ist so breit wie jedes andere");
}

/* ── 4 · Die Maße der Kamera ────────────────────────────────────────*/
abschnitt("4 · Kameramaße");
gleich(KACHEL, PIXEL_JE_FELD, "runtime und Kern führen dieselbe Kachelbreite");
gleich(WEITESTE_SICHT, HELDEN.reduce((w, k) => Math.max(w, k.sicht), 0),
  "WEITESTE_SICHT kommt aus dem Heldenkatalog");
gleich(MINDEST_FELDER, 2 * WEITESTE_SICHT + 1, "der kleinste Ausschnitt umfasst die volle Sicht");
gleich(MINDEST_KANTE, MINDEST_FELDER * KACHEL, "in Bildpunkten");
wirft(() => macheKamera({ fensterBreite: 800, fensterHoehe: 600 }),
  "ohne Karte gibt es keine Kamera");

{
  const wuerfel = macheZufall(4711);
  let krumm = 0;
  let zuKlein = 0;
  let zuWenig = 0;
  for (let i = 0; i < 1000; i++) {
    const b = wuerfel.ganz(1, 4000);
    const h = wuerfel.ganz(1, 4000);
    const v = vergroesserungFuer(b, h);
    if (!Number.isInteger(v)) krumm++;
    if (v < 1) zuKlein++;
    /* Der Sinn der Zahl: Ist das Fenster groß genug, muss die kürzere
       Kante die volle Sicht zeigen. */
    if (Math.min(b, h) >= MINDEST_KANTE && Math.min(b, h) / v < MINDEST_KANTE) zuWenig++;
  }
  gleich(krumm, 0, "1.000 Fenstergrößen: die Vergrößerung ist immer eine ganze Zahl");
  gleich(zuKlein, 0, "1.000 Fenstergrößen: die Vergrößerung ist nie kleiner als 1");
  gleich(zuWenig, 0, `1.000 Fenstergrößen: es passen immer ${MINDEST_FELDER} Felder hinein`);
  gleich(vergroesserungFuer(1920, 1080), Math.floor(1080 / MINDEST_KANTE),
    "1920×1080 ergibt die gemessene Vergrößerung");
  gleich(vergroesserungFuer(100, 80), 1, "ein winziges Fenster bekommt 1, nicht 0");
}

/* ── 5 · Feld, Welt, Bildschirm ─────────────────────────────────────*/
abschnitt("5 · Umrechnen");
const karte = macheKarte(200, 200);
const kamera = macheKamera({ fensterBreite: 1920, fensterHoehe: 1080, karte });
kamera.folge(100, 100, true);

{
  behaupte(Number.isInteger(kamera.eckeX) && Number.isInteger(kamera.eckeY),
    "die Kameralage ist ganzzahlig");
  gleich(kamera.vergroesserung, vergroesserungFuer(1920, 1080), "die Kamera nimmt dieselbe Zahl");
  gleich(kamera.setzeFenster(1280, 720), vergroesserungFuer(1280, 720),
    "setzeFenster rechnet die Vergrößerung neu");
  kamera.setzeFenster(1920, 1080);
}

{
  /* Hin und zurück, tausendmal. Beide Richtungen, denn nur zusammen
     sind sie eine Umkehrung. */
  const wuerfel = macheZufall(1312);
  let hinFehler = 0;
  let herFehler = 0;
  for (let i = 0; i < 1000; i++) {
    const feldX = wuerfel.ganz(0, 199);
    const feldY = wuerfel.ganz(0, 199);
    const punkt = kamera.feldNachBild(feldX, feldY);
    const zurueck = kamera.bildNachFeld(punkt.x, punkt.y);
    if (zurueck.x !== feldX || zurueck.y !== feldY) hinFehler++;

    /* Und umgekehrt: Der Punkt eines beliebigen Bildschirmpunktes
       liegt in dem Feld, das er trifft — höchstens eine Kachelkante
       weiter links und oben, nie weiter rechts. */
    const px = wuerfel.ganz(0, 1919);
    const py = wuerfel.ganz(0, 1079);
    const feld = kamera.bildNachFeld(px, py);
    const ecke = kamera.feldNachBild(feld.x, feld.y);
    const kante = KACHEL * kamera.vergroesserung;
    if (ecke.x > px || ecke.x + kante <= px || ecke.y > py || ecke.y + kante <= py) herFehler++;
  }
  gleich(hinFehler, 0, "1.000 Felder: bildNachFeld(feldNachBild(f)) ist wieder f");
  gleich(herFehler, 0, "1.000 Bildpunkte: feldNachBild(bildNachFeld(p)) umschließt p");
}

{
  /* Erst in Weltpunkten runden, dann vergrößern (Fehlerbuch D1). */
  const v = kamera.vergroesserung;
  const null0 = kamera.feldNachBild(0, 0);
  let versetzt = 0;
  for (let i = 0; i <= 100; i++) {
    const punkt = kamera.feldNachBild(i / 10, i / 10);
    if ((punkt.x - null0.x) % v !== 0 || (punkt.y - null0.y) % v !== 0) versetzt++;
    if (!Number.isInteger(punkt.x) || !Number.isInteger(punkt.y)) versetzt++;
  }
  gleich(versetzt, 0,
    `Zwischenlagen liegen auf dem Vielfachen der Vergrößerung (${v}) — nicht daneben`);
}

/* ── 6 · Folgen ─────────────────────────────────────────────────────*/
abschnitt("6 · Folgen");
{
  const kam = macheKamera({ fensterBreite: 1920, fensterHoehe: 1080, karte });
  kam.folge(100, 100, true);
  const start = kam.eckeX;
  const ziel = macheKamera({ fensterBreite: 1920, fensterHoehe: 1080, karte });
  ziel.folge(120, 100, true);

  let krumm = 0;
  for (let bild = 0; bild < 5; bild++) {
    kam.folge(120, 100, false, 1 / 60);
    if (!Number.isInteger(kam.eckeX) || !Number.isInteger(kam.eckeY)) krumm++;
  }
  gleich(krumm, 0, "nach jedem Bild ist die Lage ganzzahlig");
  behaupte(kam.eckeX !== start, "nach fünf Bildern hat sich die Kamera bewegt");
  behaupte(kam.eckeX !== ziel.eckeX,
    "nach fünf Bildern ist sie noch nicht da — sonst wäre es ein Sprung");

  for (let bild = 0; bild < 200; bild++) kam.folge(120, 100, false, 1 / 60);
  gleich(kam.eckeX, ziel.eckeX, "nach 205 Bildern steht sie genau auf dem Ziel");
  gleich(kam.eckeY, ziel.eckeY, "auch senkrecht");
}

{
  /* Unabhängig von der Bildrate: dieselbe Zeit, dasselbe Ergebnis. */
  const schnell = macheKamera({ fensterBreite: 1920, fensterHoehe: 1080, karte });
  const langsam = macheKamera({ fensterBreite: 1920, fensterHoehe: 1080, karte });
  schnell.folge(100, 100, true);
  langsam.folge(100, 100, true);
  for (let i = 0; i < 30; i++) schnell.folge(140, 100, false, 1 / 60);
  for (let i = 0; i < 15; i++) langsam.folge(140, 100, false, 1 / 30);
  nahe(schnell.eckeX, langsam.eckeX, 1, "eine halbe Sekunde ist eine halbe Sekunde");

  const anteil = (dt) => 1 - Math.pow(1 - 0.995, dt);
  console.log(`    gemessen: ${(anteil(1 / 60) * 100).toFixed(2)} % je Bild bei 60 Hz, ` +
    `${(anteil(0.25) * 100).toFixed(1)} % nach einer Viertelsekunde`);
}

{
  /* Am Kartenrand wird geklemmt, statt ins Leere zu schauen. */
  const kam = macheKamera({ fensterBreite: 1920, fensterHoehe: 1080, karte });
  kam.folge(0, 0, true);
  gleich(kam.eckeX, 0, "links wird bei null geklemmt");
  gleich(kam.eckeY, 0, "oben wird bei null geklemmt");
  kam.folge(199, 199, true);
  gleich(kam.eckeX, karte.breite * KACHEL - kam.sichtBreite(), "rechts wird geklemmt");
  gleich(kam.eckeY, karte.hoehe * KACHEL - kam.sichtHoehe(), "unten wird geklemmt");

  const winzig = macheKarte(8, 8);
  const klein = macheKamera({ fensterBreite: 1920, fensterHoehe: 1080, karte: winzig });
  klein.folge(4, 4, true);
  gleich(klein.eckeX, Math.round((8 * KACHEL - klein.sichtBreite()) / 2),
    "eine Karte kleiner als das Fenster steht mittig, nicht in der Ecke");
}

/* ── 7 · Sichtbare Felder ───────────────────────────────────────────*/
abschnitt("7 · Ausschnitt");
{
  const kam = macheKamera({ fensterBreite: 1920, fensterHoehe: 1080, karte });
  kam.folge(100, 100, true);
  const feld = kam.sichtbareFelder();
  const kante = KACHEL * kam.vergroesserung;
  const beruehrt = (fx, fy) => {
    const p = kam.feldNachBild(fx, fy);
    return p.x + kante > 0 && p.x < kam.fensterBreite
      && p.y + kante > 0 && p.y < kam.fensterHoehe;
  };
  behaupte(beruehrt(feld.vonX, feld.vonY), "das erste Feld liegt im Fenster");
  behaupte(beruehrt(feld.bisX, feld.bisY), "das letzte Feld liegt im Fenster");
  behaupte(!beruehrt(feld.vonX - 1, feld.vonY), "eines davor liegt draußen");
  behaupte(!beruehrt(feld.bisX + 1, feld.bisY), "eines danach liegt draußen");
  behaupte(!beruehrt(feld.bisX, feld.bisY + 1), "eines darunter liegt draußen");

  const mitRand = kam.sichtbareFelder(2);
  gleich(mitRand.vonX, feld.vonX - 2, "der Kranz erweitert nach links");
  gleich(mitRand.bisY, feld.bisY + 2, "der Kranz erweitert nach unten");

  kam.folge(0, 0, true);
  const ecke = kam.sichtbareFelder(3);
  gleich(ecke.vonX, 0, "der Kranz läuft nicht über den Kartenrand hinaus");
  kam.folge(199, 199, true);
  gleich(kam.sichtbareFelder(3).bisX, karte.breite - 1, "und auch nicht rechts");
}

/* ── 8 · Rütteln ────────────────────────────────────────────────────*/
abschnitt("8 · Rütteln");
{
  const kam = macheKamera({ fensterBreite: 1920, fensterHoehe: 1080, karte });
  kam.folge(100, 100, true);
  const ruhe = { x: kam.eckeX, y: kam.eckeY };

  kam.ruettle(6, 0.4);
  let bewegt = 0;
  let krumm = 0;
  let weiteste = 0;
  for (let bild = 0; bild < 24; bild++) {
    kam.folge(100, 100, false, 1 / 60);
    if (!Number.isInteger(kam.eckeX) || !Number.isInteger(kam.eckeY)) krumm++;
    const weg = Math.max(Math.abs(kam.eckeX - ruhe.x), Math.abs(kam.eckeY - ruhe.y));
    if (weg > 0) bewegt++;
    weiteste = Math.max(weiteste, weg);
  }
  gleich(krumm, 0, "auch beim Rütteln ist jede Lage ganzzahlig");
  behaupte(bewegt > 0, "das Rütteln bewegt das Bild — sonst prüfte hier nichts");
  behaupte(weiteste <= 6, `der Ausschlag bleibt in der Stärke (gemessen ${weiteste})`);

  for (let bild = 0; bild < 40; bild++) kam.folge(100, 100, false, 1 / 60);
  gleich(kam.eckeX, ruhe.x, "nach der Dauer steht die Kamera wieder genau ruhig");
  gleich(kam.eckeY, ruhe.y, "auch senkrecht");

  kam.ruettle(0, 1);
  kam.folge(100, 100, false, 1 / 60);
  gleich(kam.eckeX, ruhe.x, "Stärke 0 rüttelt nicht");

  /* Ein zweiter, schwächerer Schlag darf den ersten nicht abschneiden. */
  kam.ruettle(8, 0.5);
  for (let bild = 0; bild < 6; bild++) kam.folge(100, 100, false, 1 / 60);
  kam.ruettle(1, 0.05);
  let nochBewegt = 0;
  for (let bild = 0; bild < 12; bild++) {
    kam.folge(100, 100, false, 1 / 60);
    if (kam.eckeX !== ruhe.x || kam.eckeY !== ruhe.y) nochBewegt++;
  }
  behaupte(nochBewegt > 0, "ein kleiner Schlag beendet eine große Erschütterung nicht");
}

/* ── 9 · Die Schrift zum Ansehen ────────────────────────────────────
   Kein Urteil, nur ein Bild: `--zeigen` druckt, was `zeichne` malt. */
if (process.argv.includes("--zeigen")) {
  const zeigeZeile = (text) => {
    const { tinte, breite } = male(text, 0, 0);
    const gitter = Array.from({ length: ZEICHEN_HOCH }, () => new Array(breite).fill("·"));
    for (const r of tinte) {
      for (let x = r[1]; x < r[1] + r[3]; x++) {
        for (let y = r[2]; y < r[2] + r[4]; y++) gitter[y][x] = "█";
      }
    }
    for (const zeile of gitter) console.log("    " + zeile.join(""));
    console.log("");
  };
  console.log("\n  ── Der ganze Vorrat ──────────────────────────────────────");
  const alle = schluessel.join("");
  for (let i = 0; i < alle.length; i += 16) zeigeZeile(alle.slice(i, i + 16));
  console.log("  ── Eine Zeile, wie sie im Spiel steht ────────────────────");
  zeigeZeile("Späher ♥ 18/18 · 6 AP → Rampe (2 AP)");
}

console.log(`    gemessen: ${schluessel.length} Zeichen im Vorrat, ` +
  `weiteste Sicht ${WEITESTE_SICHT} Felder, kleinster Ausschnitt ${MINDEST_FELDER} Felder`);

ende("Schrift und Kamera");
