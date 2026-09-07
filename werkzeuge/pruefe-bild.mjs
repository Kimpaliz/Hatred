/* [Aufgabe: Prüfwesen] Die Messung an Licht und Partikeln — mit einem
   mitschreibenden Zeichenblatt statt eines Browsers.

   ── Warum ein Ersatzblatt und nicht das Auge ───────────────────────

   Die beiden Fehler, an denen Pixelgrafik stirbt, sieht man im
   fertigen Bild zuerst gar nicht und dann nicht mehr los: ein
   Zeichenaufruf auf einem halben Bildpunkt und eine Glättung, die
   niemand abgeschaltet hat (Fehlerbuch D1). Beides ist im Bild nur
   ein bisschen unscharf — in den **Aufrufen** ist es eine Zahl mit
   Komma und ein fehlendes `imageSmoothingEnabled = false`. Also wird
   ein winziges Blatt gereicht, das jeden Aufruf mitschreibt, und
   behauptet wird über die Mitschrift.

   Geprüft wird der Fall, der ohne die Arbeit falsch wäre:

   · **Licht durch die Wand.** Eine Quelle, die nur nach Abstand
     rechnet, leuchtet in den Nachbarraum (Fehlerbuch D4). Deshalb
     wird nicht nur behauptet, dass der Nachbarraum dunkel ist,
     sondern auch, dass er **ohne** die Wand hell wäre. Sonst
     bestünde die Prüfung auch bei einer Fackel, die schlicht zu
     schwach ist, um so weit zu reichen.
   · **Acht Stufen.** Gezählt werden die verschiedenen Werte der
     ganzen Lichtkarte, nicht ein paar Feldmitten. Eine Rundung, die
     versehentlich auf 256 Stufen geht, sieht in einer Stichprobe
     genauso aus wie eine richtige. Gezählt wird **zweimal**: einmal
     die Sprossen je Kanal (höchstens `STUFEN`) und einmal die
     verschiedenen RGB-Tripel (höchstens `STUFEN³`). Die erste Zahl
     allein bliebe auch bei einem farblosen Grauverlauf gleich.
   · **Farbmischung.** Zwei verschieden gefärbte Quellen, die sich
     überlappen, müssen eine Farbe *zwischen* beiden ergeben. Ein
     Licht, das die zuletzt gerechnete Quelle einfach obendrauf
     schreibt, sieht in einem Bildschirmfoto beinahe gleich aus — auf
     der Warm-Kalt-Achse `r − b` ist der Unterschied eindeutig.
   · **Der warme Zuschlag.** Der hellste Bodenton darf im Kern der
     stärksten Quelle nicht an 255 stoßen — dort verschmölzen zwei
     Böden zu einer Fläche und die Ringe wären weg. Die Prüfung
     rechnet die Schranke aus der Palette aus, statt die Zahl aus der
     Quelldatei zu glauben.
   · **Ein Teilchen springt über eine Wand.** Bei kleinem Zeitschritt
     tut es das nie; bei einem Ruckler springt ein Splitter drei
     Felder weit. Gemessen wird deshalb mit `dt = 0,1 s` und hohem
     Tempo — der Fall, den man beim Bauen nicht sieht.
   · **Die Mitschrift selbst.** Ein Prüfer, der jede Mitschrift für
     ganzzahlig hält, meldete für immer „grün". Die Selbstprobe füttert
     ihn deshalb mit einem erfundenen Aufruf auf 12,5 und verlangt,
     dass er anschlägt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/licht.js` und `runtime/partikel.js` (jede gemessene
   Funktion), `runtime/palette.js` (`LICHT_ARTEN`, `GRUNDHELLE`,
   `bodenTon`, `nachRGB`), `spiel/gitter.mjs` (`macheKarte`,
   `HINDERNIS`), `werkzeuge/helfer.mjs` (Behauptungen und Abschluss)
   und `werkzeuge/pruefe-alles.mjs`, das diese Datei als eigenen
   Prozess startet. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { abschnitt, behaupte, gleich, nahe, ende } from "./helfer.mjs";
import { macheKarte, HINDERNIS } from "../spiel/gitter.mjs";
import { weltMasse, weltNachFeld } from "../spiel/raster.mjs";
import { sichtlinie } from "../spiel/sicht.mjs";
import { GRUNDHELLE, LICHT_ARTEN, bodenTon, nachRGB } from "../runtime/palette.js";
import {
  KACHEL, LICHTPUNKT, PUNKTE_JE_FELD, STUFEN, WARM_ZUSATZ,
  aufStufen, flackerFaktor, macheLichtwerk
} from "../runtime/licht.js";
import { AUSSTOSS, SCHLEIM_RAMPE, machePartikelwerk } from "../runtime/partikel.js";

const WURZEL = dirname(dirname(fileURLToPath(import.meta.url)));
const GRUNDSTUFE = aufStufen(GRUNDHELLE);

/* ── Das mitschreibende Zeichenblatt ────────────────────────────────
   Nur die Methoden, die Licht und Partikel wirklich benutzen. Jede
   schreibt mit; keine zeichnet. */
function macheErsatzflaeche(breite = 320, hoehe = 180) {
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

const nurArt = (aufrufe, art) => aufrufe.filter((a) => a[0] === art);

/* Sind alle mitgeschriebenen Rechtecke auf ganzen Bildpunkten? Gibt
   den ersten Verstoß zurück, damit im Fehlertext steht, welcher. */
function ersterBruch(aufrufe) {
  for (const a of nurArt(aufrufe, "rechteck")) {
    if (![a[1], a[2], a[3], a[4]].every(Number.isInteger)) return a;
  }
  return null;
}

/* ── 0 · Selbstprobe des Prüfers ──────────────────────────────────── */
abschnitt("0 · Selbstprobe");
{
  const flaeche = macheErsatzflaeche();
  flaeche.fillRect(1, 2, 3, 4);
  gleich(nurArt(flaeche.aufrufe, "rechteck").length, 1, "das Ersatzblatt schreibt mit");
  behaupte(ersterBruch(flaeche.aufrufe) === null, "ein ganzzahliges Rechteck gilt als sauber");
  flaeche.fillRect(12.5, 2, 3, 4);
  behaupte(ersterBruch(flaeche.aufrufe) !== null,
    "ein Rechteck auf 12,5 schlägt an — sonst prüfte die Mitschrift nichts");
  const leer = macheErsatzflaeche();
  behaupte(ersterBruch(leer.aufrufe) === null, "eine leere Mitschrift hat keinen Bruch");
}

/* ── 1 · Die Maße aus dem Bildvertrag ────────────────────────────── */
abschnitt("1 · Maße");
gleich(KACHEL, 16, "KACHEL");
gleich(LICHTPUNKT, 4, "LICHTPUNKT");
gleich(PUNKTE_JE_FELD, 4, "Lichtpunkte je Feld");
gleich(STUFEN, 8, "Helligkeitsstufen");
gleich(aufStufen(0), 0, "ganz dunkel bleibt 0");
gleich(aufStufen(1), 1, "voll bleibt 1");
gleich(aufStufen(3), 1, "über 1 wird gedeckelt, nicht überlaufen");
gleich(aufStufen(-2), 0, "unter 0 wird gedeckelt");
nahe(aufStufen(0.5), 4 / 7, 1e-6, "0,5 fällt auf die vierte von sieben Sprossen");
gleich(aufStufen(0.07), 0, "ein Hauch Licht rundet auf 0 — das erzeugt die Ringe");

/* ── 2 · Licht kommt nicht durch eine Wand ────────────────────────── */
abschnitt("2 · Licht und Wand");
{
  /* Zwei Räume, getrennt von einer Wandspalte bei x = 5. Die Fackel
     steht bei (2,2), das Prüffeld bei (8,2) — sechs Felder weit und
     damit innerhalb der Fackelreichweite von 6,5. */
  const zwei = macheKarte(13, 5);
  for (let y = 0; y < 5; y++) zwei.setze(5, y, { hindernis: HINDERNIS.wand });
  const offen = macheKarte(13, 5);

  const werkZu = macheLichtwerk(zwei);
  werkZu.setzeQuellen([{ x: 2, y: 2, art: "fackel", staerke: 1 }]);
  werkZu.rechne(0, zwei);

  const werkOffen = macheLichtwerk(offen);
  werkOffen.setzeQuellen([{ x: 2, y: 2, art: "fackel", staerke: 1 }]);
  werkOffen.rechne(0, offen);

  gleich(werkZu.anzahlQuellen(), 1, "die Quelle wurde übernommen");
  const hinterWand = werkZu.helligkeitBei(8, 2);
  const ohneWand = werkOffen.helligkeitBei(8, 2);
  const amLicht = werkZu.helligkeitBei(3, 2);

  behaupte(ohneWand.r > GRUNDSTUFE,
    `ohne Wand ist (8,2) beleuchtet (${ohneWand.r.toFixed(4)} > ${GRUNDSTUFE.toFixed(4)})`);
  nahe(hinterWand.r, GRUNDSTUFE, 1e-6, "hinter der Wand bleibt (8,2) auf der Grundhelle");
  nahe(hinterWand.g, GRUNDSTUFE, 1e-6, "auch der Grünkanal bleibt dunkel");
  nahe(hinterWand.b, GRUNDSTUFE, 1e-6, "auch der Blaukanal bleibt dunkel");
  behaupte(amLicht.r > hinterWand.r,
    `im Fackelraum ist es heller als dahinter (${amLicht.r.toFixed(4)} > ` +
    `${hinterWand.r.toFixed(4)})`);
  behaupte(amLicht.r > amLicht.b, "Fackellicht ist warm: mehr Rot als Blau");

  /* Der Abfall ist quadratisch: nah heller als fern, und beides über
     der Grundhelle. Ohne diese Behauptung bestünde die Prüfung auch
     bei einem Licht, das seine ganze Reichweite gleich hell füllt. */
  const nah = werkOffen.helligkeitBei(3, 2).r;
  const fern = werkOffen.helligkeitBei(7, 2).r;
  behaupte(nah > fern, `der Schein fällt nach außen ab (${nah.toFixed(4)} > ${fern.toFixed(4)})`);
  behaupte(fern >= GRUNDSTUFE, "auch am Rand ist es nicht dunkler als die Grundhelle");

  /* Eine ausgeschaltete Fackel bleibt in der Liste und leuchtet nicht.
     Das ist der Fall, den man beim Löschen einer Fackel falsch macht:
     Wer sie aus der Liste nimmt, verschiebt die Flackerphasen aller
     anderen — und der ganze Raum zuckt einmal auf. */
  const werkAus = macheLichtwerk(offen);
  werkAus.setzeQuellen([{ x: 2, y: 2, art: "fackel", staerke: 1, an: false }]);
  werkAus.rechne(0, offen);
  gleich(werkAus.anzahlQuellen(), 0, "eine ausgeschaltete Quelle trägt nichts ein");
  nahe(werkAus.helligkeitBei(3, 2).r, GRUNDSTUFE, 1e-6,
    "bei ausgeschalteter Fackel bleibt es dunkel");
}

/* ── 3 · Acht Stufen, nicht 256 ─────────────────────────────────────

   Janniks erstes Merkmal für die Kerkerstimmung, wörtlich: „Licht in
   mindestens fünf Stufen, nicht als Schalter." Deshalb steht die
   Untergrenze hier auf **fünf** und nicht auf einer bequemeren Zahl.

   Gezählt wird zweimal, und die zweite Zählung ist die schärfere:

   1. **Sprossen je Kanal.** Höchstens `STUFEN` = 8, gemessen 7 —
      Sprosse 0 kommt nie vor, weil `GRUNDHELLE` 0,16 schon auf
      Sprosse 1 fällt. Ein Licht, das nur an und aus kennt, hätte hier
      zwei.
   2. **Verschiedene RGB-Tripel.** Obergrenze ist `STUFEN³` = 512,
      **nicht** 8 — wer beide Zählungen in dasselbe Set schreibt,
      macht die Prüfung rot, ohne dass etwas kaputt wäre. Gemessen 82.
      Diese Zahl allein zeigt, dass die fünf Quellen einander wirklich
      überlagern: Ein farbloser Grauverlauf hätte genauso viele Tripel
      wie Sprossen, nämlich 7.

   Fünf Quellen und nicht zwei, weil erst dort genug Summen
   übereinanderliegen, dass die Stufung mehr ist als ein einzelner
   abfallender Schein. */
abschnitt("3 · Acht Stufen");
let stufenBericht = "";
let tripelBericht = "";
{
  const karte = macheKarte(20, 12);
  const werk = macheLichtwerk(karte);
  werk.setzeQuellen([
    { x: 5, y: 5, art: "fackel", staerke: 1 },
    { x: 14, y: 7, art: "arkan", staerke: 0.8 },
    { x: 9, y: 2, art: "schleim", staerke: 0.6 },
    { x: 3, y: 9, art: "gift", staerke: 0.5 },
    { x: 17, y: 3, art: "gold", staerke: 0.9 }
  ]);
  werk.rechne(0.5, karte);
  const punkte = werk.lichtpunkte();
  const masse = weltMasse(karte);
  gleich(punkte.breite, Math.ceil(masse.breite / LICHTPUNKT),
    "die Lichtkarte deckt die Weltbreite einschließlich der versetzten Hexzeilen ab");
  gleich(punkte.hoehe, Math.ceil(masse.hoehe / LICHTPUNKT),
    "die Lichtkarte deckt die tatsächliche Welthöhe einschließlich der Spitzen ab");

  const verschieden = new Set();
  let daneben = 0;
  for (const reihe of [punkte.r, punkte.g, punkte.b]) {
    for (let i = 0; i < reihe.length; i++) {
      verschieden.add(reihe[i]);
      const sprosse = reihe[i] * (STUFEN - 1);
      if (Math.abs(sprosse - Math.round(sprosse)) > 1e-5) daneben++;
    }
  }
  /* Das zweite Set, und **nur** hier: ein Tripel je Lichtpunkt. */
  const tripel = new Set();
  for (let i = 0; i < punkte.r.length; i++) {
    tripel.add(`${punkte.r[i]}|${punkte.g[i]}|${punkte.b[i]}`);
  }

  const sprossen = [...verschieden].sort((a, b) => a - b).map((w) => w.toFixed(4)).join(" ");
  stufenBericht = `${verschieden.size} von ${STUFEN} Sprossen je Kanal (${sprossen}) ` +
    `über ${punkte.r.length * 3} Lichtpunkte-Kanäle, fünf Quellen`;
  tripelBericht = `${tripel.size} verschiedene RGB-Tripel von höchstens ${STUFEN ** 3} ` +
    `in derselben Szene — bei farblosem Licht wären es ${verschieden.size}`;
  behaupte(verschieden.size <= STUFEN,
    `höchstens ${STUFEN} verschiedene Werte, gezählt ${verschieden.size}`);
  behaupte(verschieden.size >= 5,
    `Licht in mindestens fünf Stufen, nicht als Schalter (${verschieden.size} Sprossen)`);
  gleich(daneben, 0, "jeder Wert liegt genau auf einer der acht Sprossen");

  behaupte(tripel.size <= STUFEN ** 3,
    `höchstens ${STUFEN ** 3} verschiedene RGB-Tripel, gezählt ${tripel.size}`);
  behaupte(tripel.size > verschieden.size,
    `es sind mehr Farben als Helligkeitsstufen — das Licht ist bunt, nicht grau ` +
    `(${tripel.size} Tripel gegen ${verschieden.size} Sprossen)`);
  behaupte(tripel.size >= 40,
    `die fünf Quellen überlagern einander wirklich (${tripel.size} Tripel, gemessen 82)`);
}

/* ── 4 · Farbiges Licht mischt sich ─────────────────────────────────

   Janniks zweites Merkmal, wörtlich: „Farbiges Licht mischt sich."
   Gemessen wird auf der Warm-Kalt-Achse `r − b`: Die Fackel (#ff9438)
   ist warm, r liegt über b; das Arkanlicht (#5c8cff) ist kalt, b liegt
   über r. Wo beide hinreichen, muss die Summe **echt zwischen** beiden
   liegen. Ein Licht, das die zuletzt gerechnete Quelle einfach
   obendrauf schreibt, gäbe genau eine der beiden Einzelfarben zurück —
   und im Bildschirmfoto sähe man den Unterschied kaum.

   ── Warum genau diese drei Koordinaten ─────────────────────────────

   Die Geometrie ist empfindlich, weil das Licht quadratisch abfällt.
   Gemessen mit `node werkzeuge/pruefe-bild.mjs`, jeweils auf (8,6):

     Abstand 4 (hier gewählt): nur Fackel r−b = +0,5714, nur Arkan
       −0,2857, beide +0,2857 — echt dazwischen, und alle drei Farben
       verschieden.
     Abstand 5: das Arkanlicht reicht nicht mehr bis zur Mitte
       (r−b = 0,0000); die „Mischung" ist die reine Fackel, und die
       Prüfung wäre grün, ohne etwas zu zeigen.
     Abstand 3: alle drei Kanäle stoßen an 1,0000 — die Mischung ist
       reines Weiß und hat gar keinen Ton mehr.

   Wer diese Zahlen verschiebt, prüft etwas anderes. Sie stehen
   deshalb hier und nicht als nackte Konstanten im Code. */
abschnitt("4 · Farbmischung");
let mischBericht = "";
{
  const messe = (quellen) => {
    const karte = macheKarte(20, 13);
    const werk = macheLichtwerk(karte);
    werk.setzeQuellen(quellen);
    werk.rechne(0, karte);
    return werk.helligkeitBei(8, 6);
  };
  const warm = (f) => f.r - f.b;
  const wort = (f) => `${f.r.toFixed(4)}|${f.g.toFixed(4)}|${f.b.toFixed(4)}`;
  const zeig = (f) => `r ${f.r.toFixed(4)} g ${f.g.toFixed(4)} b ${f.b.toFixed(4)}`;

  const nurFackel = messe([{ x: 4, y: 6, art: "fackel", staerke: 1 }]);
  const nurArkan = messe([{ x: 12, y: 6, art: "arkan", staerke: 1 }]);
  const beide = messe([
    { x: 4, y: 6, art: "fackel", staerke: 1 },
    { x: 12, y: 6, art: "arkan", staerke: 1 }
  ]);

  /* (a) Die beiden Quellen haben überhaupt verschiedene Farbtöne.
     Ohne diese Behauptung bestünde alles Weitere auch bei zwei
     gleichfarbigen Lampen — und „mischt sich" wäre nichts gesagt. */
  behaupte(warm(nurFackel) > 0,
    `die Fackel allein ist warm: r − b = ${warm(nurFackel).toFixed(4)} > 0 (${zeig(nurFackel)})`);
  behaupte(warm(nurArkan) < 0,
    `das Arkanlicht allein ist kalt: r − b = ${warm(nurArkan).toFixed(4)} < 0 ` +
    `(${zeig(nurArkan)})`);

  /* (b) Die Mischung liegt auf der Achse r−b echt zwischen beiden. */
  behaupte(warm(beide) < warm(nurFackel) && warm(beide) > warm(nurArkan),
    `die Mischung liegt echt zwischen beiden: ${warm(nurArkan).toFixed(4)} < ` +
    `${warm(beide).toFixed(4)} < ${warm(nurFackel).toFixed(4)}`);

  /* (c) Und sie ist mit keiner der Einzelfarben identisch — auch
     nicht mit einem farblosen Weiß, in dem beide Töne untergingen. */
  behaupte(wort(beide) !== wort(nurFackel),
    `die Mischung ist nicht die reine Fackel (${zeig(beide)})`);
  behaupte(wort(beide) !== wort(nurArkan),
    `die Mischung ist nicht das reine Arkanlicht (${zeig(beide)})`);
  behaupte(!(beide.r === beide.g && beide.g === beide.b),
    `die Mischung hat noch einen Ton und ist kein farbloses Weiß (${zeig(beide)})`);

  mischBericht = `Fackel (4,6) und Arkan (12,6), gemessen auf (8,6): r−b ` +
    `${warm(nurFackel).toFixed(4)} · ${warm(beide).toFixed(4)} · ` +
    `${warm(nurArkan).toFixed(4)} — die Mischung ${zeig(beide)}`;
}

/* ── 5 · Das Flackern ist eine Funktion der Zeit ──────────────────── */
abschnitt("5 · Flackern");
{
  gleich(flackerFaktor(1.5, 0, 12), 1, "ohne Flackern bleibt der Faktor 1");
  gleich(flackerFaktor(1.5, 0.2, 12), flackerFaktor(1.5, 0.2, 12),
    "gleiche Zeit, gleiche Saat, gleicher Faktor");
  behaupte(flackerFaktor(1.5, 0.2, 12) !== flackerFaktor(1.5, 0.2, 40),
    "zwei Fackeln an verschiedenen Stellen zucken nicht im Gleichtakt");

  const karte = macheKarte(16, 10);
  const bau = () => {
    const werk = macheLichtwerk(karte);
    werk.setzeQuellen([{ x: 6, y: 5, art: "fackel", staerke: 1 }]);
    return werk;
  };
  const a = bau(); a.rechne(2.25, karte);
  const b = bau(); b.rechne(2.25, karte);
  const c = bau(); c.rechne(2.41, karte);
  const gleichLang = (x, y) => {
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
    return true;
  };
  const pa = a.lichtpunkte(), pb = b.lichtpunkte(), pc = c.lichtpunkte();
  behaupte(gleichLang(pa.r, pb.r) && gleichLang(pa.g, pb.g) && gleichLang(pa.b, pb.b),
    "zweimal dieselbe Zeit gibt dieselbe Lichtkarte, Wert für Wert");
  behaupte(!gleichLang(pa.r, pc.r),
    "eine andere Zeit gibt ein anderes Bild — sonst flackerte nichts");

  /* Und zweimal dasselbe Werk mit derselben Zeit ebenso: `rechne`
     darf nichts aus dem vorigen Bild stehen lassen. */
  a.rechne(2.25, karte);
  behaupte(gleichLang(a.lichtpunkte().r, pb.r), "ein zweiter Lauf im selben Werk gibt dasselbe");
}

/* ── 6 · Der warme Zuschlag klippt keinen Boden ───────────────────── */
abschnitt("6 · Warmer Zuschlag");
let zuschlagBericht = "";
{
  let hellster = 0;
  let wer = "";
  for (let boden = 0; boden < 8; boden++) {
    for (let ebene = 0; ebene < 4; ebene++) {
      for (const zweit of [false, true]) {
        const hex = bodenTon(boden, ebene, zweit);
        const { r, g, b } = nachRGB(hex);
        for (const kanal of [r, g, b]) {
          if (kanal > hellster) { hellster = kanal; wer = `Boden ${boden}, Ebene ${ebene} ${hex}`; }
        }
      }
    }
  }
  /* Der schlimmste Fall: volles Rot, kein Blau — das ist Lavalicht.
     Der warme Überschuss ist dann 1,0, der Zuschlag also voll. */
  const hoechstens = (255 - hellster) / 255;
  const erreicht = hellster + WARM_ZUSATZ * 255;
  zuschlagBericht = `hellster Bodenkanal ${hellster} (${wer}), Schranke ` +
    `${hoechstens.toFixed(4)}, WARM_ZUSATZ ${WARM_ZUSATZ}, Kern ${erreicht.toFixed(1)}`;
  behaupte(WARM_ZUSATZ <= hoechstens,
    `WARM_ZUSATZ ${WARM_ZUSATZ} bleibt unter der Schranke ${hoechstens.toFixed(4)}`);
  behaupte(erreicht <= 255, `der Rotkanal stößt nicht an 255 (${erreicht.toFixed(1)})`);
  const rest = (255 - erreicht).toFixed(1);
  behaupte(255 - erreicht < 10,
    `der Zuschlag ist gemessen und nicht vorsichtshalber klein (Rest ${rest})`);
}

/* ── 7 · Das Licht auf dem Zeichenblatt ───────────────────────────── */
abschnitt("7 · Licht zeichnen");
let lichtBericht = "";
{
  const karte = macheKarte(32, 24);
  const werk = macheLichtwerk(karte);
  werk.setzeQuellen([{ x: 6, y: 6, art: "fackel", staerke: 1 }]);
  werk.rechne(0.75, karte);

  const flaeche = macheErsatzflaeche(480, 240);
  /* Ein Kameraversatz, der **kein** Vielfaches von LICHTPUNKT ist:
     genau dort landet man auf halben Bildpunkten, wenn man erst
     vergrößert und dann abzieht. Das Fenster ist so gewählt, dass es
     den Fackelkern **und** den Rand des Scheins zeigt — in einem
     Ausschnitt, der ganz im Kern liegt, ist alles gleich hell, und
     die Stufen ließen sich nicht zählen. */
  const gezeichnet = werk.zeichneAuf(flaeche, { x: 5, y: 37, vergroesserung: 3 });
  const rechtecke = nurArt(flaeche.aufrufe, "rechteck");
  const mischen = nurArt(flaeche.aufrufe, "mischen").map((a) => a[1]);

  behaupte(flaeche.aufrufe.some(([was, wert]) => was === "glaettung" && wert === false),
    "die Glättung wird abgeschaltet (Fehlerbuch D1)");
  gleich(ersterBruch(flaeche.aufrufe), null, "jedes Lichtrechteck liegt auf ganzen Bildpunkten");
  gleich(rechtecke.length, gezeichnet, "zeichneAuf meldet genau so viele Rechtecke, wie es setzt");
  behaupte(rechtecke.every((a) => a[3] > 0 && a[3] <= LICHTPUNKT * 3
    && a[3] % 3 === 0 && (a[4] === LICHTPUNKT * 3 || a[4] === 3)),
  "Lichtblöcke sind vier Pixel groß, ihre Randspannen genau eine Pixelzeile hoch");
  let ausserhalb = 0;
  let randSpannen = 0;
  for (const r of rechtecke) {
    if (r[4] === 3) randSpannen++;
    for (let py = 0; py < r[4]; py += 3) {
      for (let px = 0; px < r[3]; px += 3) {
        const feld = weltNachFeld((r[1] + px) / 3 + 5 + 0.5,
          (r[2] + py) / 3 + 37 + 0.5);
        if (!karte.drin(feld.x, feld.y)) ausserhalb++;
      }
    }
  }
  gleich(ausserhalb, 0, "kein Lichtblock oder Randstreifen bemalt den Raum außerhalb der Hexkarte");
  behaupte(randSpannen > 0, "die Probe enthält tatsächlich beschnittene Lichtpunkte am Hexrand");
  gleich(mischen[0], "multiply", "die erste Lage multipliziert");
  behaupte(mischen.includes("lighter"), "die warme Lage kommt additiv obendrauf");
  behaupte(mischen.indexOf("multiply") < mischen.indexOf("lighter"),
    "erst multiplizieren, dann glühen — umgekehrt multiplizierte man das Glühen weg");
  gleich(mischen[mischen.length - 1], "source-over",
    "am Ende steht der Grundzustand wieder — sonst zeichnet alles Spätere additiv");
  behaupte(werk.anzahlFarbwoerter() <= STUFEN ** 3,
    `höchstens ${STUFEN ** 3} Farbzeichenketten, gezählt ${werk.anzahlFarbwoerter()}`);
  behaupte(werk.anzahlFarbwoerter() >= 2,
    `die Stufen kommen wirklich auf dem Blatt an (${werk.anzahlFarbwoerter()} Farben)`);
  /* Wie viele Rechtecke auf welche Lage entfallen. Ohne diese Zählung
     bestünde die Prüfung auch dann, wenn die additive Lage zwar
     eingeschaltet, aber nie gezeichnet würde — und der Fackelkern
     bliebe ohne Glühen. */
  gleich(mischen.filter((m) => m === "lighter").length, 1, "die warme Lage kommt genau einmal");
  const jeLage = new Map();
  let lage = "source-over";
  for (const [was, wert] of flaeche.aufrufe) {
    if (was === "mischen") lage = wert;
    else if (was === "rechteck") jeLage.set(lage, (jeLage.get(lage) || 0) + 1);
  }
  behaupte((jeLage.get("multiply") || 0) > 0, "die multiplizierende Lage zeichnet");
  behaupte((jeLage.get("lighter") || 0) > 0,
    `die warme Lage zeichnet im Fackelkern (${jeLage.get("lighter") || 0} Rechtecke)`);
  gleich((jeLage.get("source-over") || 0), 0, "nichts wird im Grundzustand gezeichnet");

  /* Nur der Ausschnitt wird gezeichnet, nicht die ganze Karte. Ohne
     diese Behauptung wüchse der Aufwand mit der Kartengröße statt mit
     dem Fenster — und niemand merkte es, weil das Bild gleich aussieht. */
  const alle = karte.breite * karte.hoehe * PUNKTE_JE_FELD * PUNKTE_JE_FELD;
  behaupte(jeLage.get("multiply") < alle / 4,
    `nur der Ausschnitt wird gezeichnet: ${jeLage.get("multiply")} statt ${alle} Lichtpunkte`);
  lichtBericht = `${rechtecke.length} Rechtecke (${jeLage.get("multiply")} multiply, ` +
    `${jeLage.get("lighter")} lighter) für ein 480×240-Fenster bei Vergrößerung 3, ` +
    `${werk.anzahlFarbwoerter()} Farbzeichenketten`;

  /* Ohne Zeichenblatt darf nichts geschehen, statt zu werfen: Das
     Bild läuft in einer Schleife, und ein Wurf je Bild wäre ein
     Wasserfall aus Meldungen. */
  gleich(werk.zeichneAuf(null, {}), 0, "ohne Zeichenblatt wird nichts gezeichnet");
}

/* ── 7b · Ein Lichtblock darf keine fremden Hexfelder beleuchten ─── */
abschnitt("7b · Pixelgenauer Schatten an inneren Hexgrenzen");
{
  function gemaltesLicht(karte, quellen) {
    const werk = macheLichtwerk(karte), masse = weltMasse(karte);
    werk.setzeQuellen(quellen); werk.rechne(0, karte);
    let falschWarm = 0, falschHell = 0, beleuchtet = 0, ausserhalb = 0;
    const marken = new Set();
    const sichtbar = new Map();
    const ctx = { fillStyle: "", globalCompositeOperation: "source-over",
      fillRect(x, y, breite, hoehe) {
        const rgb = this.fillStyle.match(/\d+/g).map(Number);
        const warm = this.globalCompositeOperation === "lighter" && rgb[0] > 0;
        const hell = this.globalCompositeOperation === "multiply"
          && rgb[0] > Math.round(GRUNDSTUFE * 255);
        for (let py = y; py < y + hoehe; py++) for (let px = x; px < x + breite; px++) {
          const feld = weltNachFeld(px + 0.5, py + 0.5);
          if (!karte.drin(feld.x, feld.y)) { ausserhalb++; continue; }
          const i = karte.index(feld.x, feld.y);
          let frei = sichtbar.get(i);
          if (frei === undefined) {
            frei = quellen.some((q) => sichtlinie(karte, q.x, q.y, feld.x, feld.y));
            sichtbar.set(i, frei);
          }
          if (!frei && warm) falschWarm++;
          if (!frei && hell) falschHell++;
          if (frei && warm) { beleuchtet++; marken.add(`${px},${py}`); }
        }
      }
    };
    werk.zeichneAuf(ctx, { x: 0, y: 0, vergroesserung: 1,
      breite: masse.breite, hoehe: masse.hoehe });
    return { falschWarm, falschHell, beleuchtet, ausserhalb, marken };
  }
  for (const x of [4, 8]) for (const y of [5, 6]) {
    const k = macheKarte(12, 12);
    for (let yy = 0; yy < k.hoehe; yy++) k.setze(6, yy, { hindernis: HINDERNIS.wand });
    const q = [{ x, y, art: "fackel", weite: 10, flackern: 0 }];
    const zu = gemaltesLicht(k, q);
    gleich(zu.falschWarm, 0, `Fackel ${x},${y}: kein additives Pixel hinter der Hexwand`);
    gleich(zu.falschHell, 0, `Fackel ${x},${y}: kein aufgehelltes Pixel hinter der Hexwand`);
    gleich(zu.ausserhalb, 0, `Fackel ${x},${y}: Licht bleibt auch am äußeren Kartenrand innen`);
    behaupte(zu.beleuchtet > 500, "Der gültige Fackelraum bleibt tatsächlich beleuchtet");
    const offen = gemaltesLicht(macheKarte(12, 12), q);
    behaupte(offen.beleuchtet > zu.beleuchtet + 500,
      "Ohne Wand erreicht das Licht auch die zuvor verdeckten echten Bildpunkte");
  }
  const beidseitig = macheKarte(12, 12);
  for (let y = 0; y < 12; y++) beidseitig.setze(6, y, { hindernis: HINDERNIS.wand });
  const zwei = gemaltesLicht(beidseitig, [
    { x: 4, y: 6, art: "fackel", weite: 10, flackern: 0 },
    { x: 8, y: 6, art: "fackel", weite: 10, flackern: 0 }
  ]);
  behaupte(zwei.marken.has("118,72") && zwei.marken.has("80,72"),
    "Unabhängige Quellen beleuchten beide Seiten derselben Wand bis an ihre Hexränder");
}

/* ── 8 · Der Vorrat der Teilchen ──────────────────────────────────── */
abschnitt("8 · Vorrat");
let vorratBericht = "";
{
  gleich(Object.keys(AUSSTOSS).length, 8, "acht Ausstoßarten");
  for (const [name, art] of Object.entries(AUSSTOSS)) {
    behaupte(art.farben.length === 3, `${name}: die Farbrampe hat drei Stufen`);
    behaupte(art.farben.every((f) => typeof f === "string" && f.startsWith("#")),
      `${name}: jede Farbe kommt als Hexwert aus der Palette`);
    behaupte(art.kante === 1 || art.kante === 2, `${name}: Kantenlänge ist 1 oder 2`);
    behaupte(art.tempo[0] <= art.tempo[1] && art.leben[0] < art.leben[1],
      `${name}: die Spannen liegen richtig herum`);
  }
  gleich(SCHLEIM_RAMPE.length, 3, "die Schleimrampe hat drei Stufen");

  const werk = machePartikelwerk(2000);
  gleich(werk.hoechstzahl, 2000, "der Vorrat ist so groß wie bestellt");
  let geworfen = 0;
  for (let n = 0; n < 1000; n++) geworfen += werk.stosseAus("funken", 100, 100, { anzahl: 10 });
  gleich(geworfen, 10000, "zehntausend Ausstöße wurden angenommen, keiner verschluckt");
  behaupte(werk.anzahlLebend() <= 2000,
    `nie mehr lebende Teilchen als der Vorrat groß ist (${werk.anzahlLebend()})`);
  gleich(werk.anzahlLebend(), 2000, "der volle Vorrat lebt");
  gleich(werk.teilchen().length, 2000, "der Vorrat wächst nicht mit");
  vorratBericht = `10.000 Ausstöße bei Vorrat 2.000 → ${werk.anzahlLebend()} lebende Teilchen`;

  /* Nach dem Verlöschen zählt der Zähler wieder herunter. Ohne das
     liefe der Vorrat scheinbar über, obwohl er leer ist. */
  werk.schritt(5, null);
  gleich(werk.anzahlLebend(), 0, "nach fünf Sekunden lebt kein Funke mehr");
  gleich(werk.leere(), 2000, "leeren meldet den ganzen Vorrat");

  gleich(werk.stosseAus("gibtsnicht", 1, 1), 0, "eine unbekannte Art wirft nichts aus");
  gleich(werk.stosseAus("funken", NaN, 1), 0, "ein Ausstoß ohne Ort wirft nichts aus");
}

/* ── 9 · Teilchen auf ganzen Bildpunkten ──────────────────────────── */
abschnitt("9 · Teilchen zeichnen");
{
  const werk = machePartikelwerk(200);
  /* Krumme Startwerte mit Absicht: 100,5 und 40,25 sind genau die
     Zwischenpositionen, die ungerundet auf das Blatt durchschlagen. */
  werk.stosseAus("blut", 40.5, 20.25, { anzahl: 20 });
  werk.stosseAus("rauch", 61.7, 33.3, { anzahl: 6 });
  werk.schritt(0.05, null);
  const flaeche = macheErsatzflaeche(320, 180);
  const gezeichnet = werk.zeichne(flaeche, { x: 3, y: 9, vergroesserung: 4 });
  const rechtecke = nurArt(flaeche.aufrufe, "rechteck");

  behaupte(flaeche.aufrufe.some(([was, wert]) => was === "glaettung" && wert === false),
    "auch die Teilchen schalten die Glättung ab");
  gleich(ersterBruch(flaeche.aufrufe), null,
    "jedes Teilchen liegt auf ganzen Bildpunkten, trotz krummer Startwerte");
  gleich(rechtecke.length, gezeichnet, "zeichne meldet genau so viele Rechtecke, wie es setzt");
  behaupte(gezeichnet > 0, `es wurde überhaupt gezeichnet (${gezeichnet} Rechtecke)`);
  behaupte(rechtecke.every((a) => a[3] === a[4] && (a[3] === 4 || a[3] === 8)),
    "jedes Teilchen ist quadratisch, ein oder zwei Bildpunkte mal Vergrößerung 4");
  const farben = new Set(nurArt(flaeche.aufrufe, "farbe").map((a) => a[1]));
  behaupte(farben.size >= 2, `es werden verschiedene Farben gesetzt (${farben.size})`);
  gleich(werk.zeichne(null, {}), 0, "ohne Zeichenblatt wird nichts gezeichnet");
}

/* ── 10 · Ein Teilchen fällt nicht durch eine Wand ────────────────── */
abschnitt("10 · Teilchen und Wand");
let wandBericht = "";
{
  const karte = macheKarte(12, 6);
  karte.setze(5, 2, { hindernis: HINDERNIS.wand });
  const werk = machePartikelwerk(20);
  /* Sechshundert Bildpunkte je Sekunde bei einem Zeitschritt von
     0,1 s sind rund 3,5 Felder in einem Bild — ohne Teilschritte
     spränge das Teilchen quer durch die Wand. */
  werk.stosseAus("zauberstaub", 4 * KACHEL + 8, 2 * KACHEL + 8, {
    anzahl: 1, tempo: [600, 600], richtung: 0, streuung: 0
  });
  const teilchen = werk.teilchen().find((t) => t.leben > 0);
  let tiefsteWand = 0;
  let westlich = true;
  for (let n = 0; n < 12; n++) {
    werk.schritt(0.1, karte);
    if (teilchen.leben <= 0) break;
    const feldX = Math.floor(teilchen.x / KACHEL);
    const feldY = Math.floor(teilchen.y / KACHEL);
    if (karte.blocktBewegung(feldX, feldY)) tiefsteWand++;
    if (teilchen.x >= 5 * KACHEL) westlich = false;
  }
  gleich(tiefsteWand, 0, "das Teilchen stand nie in einem Wandfeld");
  behaupte(westlich, `das Teilchen kam nie über die Wandkante bei ${5 * KACHEL} hinaus`);
  wandBericht = `Teilchen mit 600 Bildpunkten/s, 12 Schritte zu 0,1 s, Endlage ` +
    `x = ${teilchen.x.toFixed(1)}`;

  /* Dasselbe für eine Höhenkante: Ein Staubkorn springt keine Stufe
     hinauf. Das ist die Regel, die man beim Bauen vergisst, weil eine
     Kante kein Hindernis im Sinne des Rasters ist. */
  const stufe = macheKarte(12, 6);
  stufe.setze(5, 2, { ebene: 2 });
  const werk2 = machePartikelwerk(20);
  werk2.stosseAus("staub", 4 * KACHEL + 8, 2 * KACHEL + 8, {
    anzahl: 1, tempo: [600, 600], richtung: 0, streuung: 0
  });
  const korn = werk2.teilchen().find((t) => t.leben > 0);
  /* Gefragt wird nach der **Lage**, nicht nach dem Feld am Ende eines
     Zeitschritts: Ein Korn, das mit 600 Bildpunkten je Sekunde durch
     das Stufenfeld hindurchschießt, steht am Ende des Schrittes schon
     dahinter, und eine Feldabfrage sähe nichts. Genau daran ist diese
     Prüfung beim ersten Bauen vorbeigelaufen. */
  let hoechstesX = korn.x;
  for (let n = 0; n < 8; n++) {
    werk2.schritt(0.1, stufe);
    if (korn.leben <= 0) break;
    hoechstesX = Math.max(hoechstesX, korn.x);
  }
  behaupte(hoechstesX < 5 * KACHEL,
    `ein Staubkorn springt keine Höhenstufe hinauf (bis x = ${hoechstesX.toFixed(1)}, ` +
    `Kante bei ${5 * KACHEL})`);

  /* Und der Gegenbeweis: Ohne Wand fliegt dasselbe Teilchen weit über
     die Stelle hinaus. Sonst bestünde die Prüfung auch bei einem
     Teilchen, das sich gar nicht bewegt. */
  const frei = macheKarte(12, 6);
  const werk3 = machePartikelwerk(20);
  werk3.stosseAus("zauberstaub", 4 * KACHEL + 8, 2 * KACHEL + 8, {
    anzahl: 1, tempo: [600, 600], richtung: 0, streuung: 0
  });
  const flieger = werk3.teilchen().find((t) => t.leben > 0);
  for (let n = 0; n < 3; n++) werk3.schritt(0.1, frei);
  behaupte(flieger.x > 5 * KACHEL,
    `ohne Wand kommt dasselbe Teilchen über x = ${5 * KACHEL} (${flieger.x.toFixed(1)})`);
}

/* ── 11 · Leuchtende Teilchen tragen ins Licht ein ────────────────── */
abschnitt("11 · Leuchtende Teilchen");
{
  const karte = macheKarte(12, 8);
  const teile = machePartikelwerk(50);
  teile.stosseAus("funken", 6 * KACHEL + 8, 4 * KACHEL + 8, { anzahl: 4 });
  teile.stosseAus("blut", 6 * KACHEL + 8, 4 * KACHEL + 8, { anzahl: 4 });
  const quellen = teile.leuchtende();
  gleich(quellen.length, 4, "nur die Funken leuchten, das Blut nicht");
  for (const q of quellen) {
    behaupte(Math.abs(q.x - 6) < 0.6 && Math.abs(q.y - 4) < 0.6,
      `die Lichtquelle liegt im Feld des Teilchens (${q.x.toFixed(2)}, ${q.y.toFixed(2)})`);
    behaupte(q.staerke > 0 && q.staerke <= 1, `die Stärke liegt zwischen 0 und 1 (${q.staerke})`);
  }

  const ohne = macheLichtwerk(karte);
  ohne.rechne(0, karte, []);
  const mit = macheLichtwerk(karte);
  mit.rechne(0, karte, quellen);
  nahe(ohne.helligkeitBei(6, 4).r, GRUNDSTUFE, 1e-6,
    "ohne Teilchen bleibt das Feld auf Grundhelle");
  behaupte(mit.helligkeitBei(6, 4).r > GRUNDSTUFE,
    `ein Funke hellt sein eigenes Feld auf (${mit.helligkeitBei(6, 4).r.toFixed(4)})`);
  nahe(mit.helligkeitBei(6, 7).r, GRUNDSTUFE, 1e-6,
    "drei Felder weiter reicht ein Funke nicht mehr");
}

/* ── 12 · Zweimal derselbe Ausstoß gibt dasselbe Bild ─────────────── */
abschnitt("12 · Wiederholbarkeit");
{
  const bau = () => {
    const werk = machePartikelwerk(120, 4711);
    werk.stosseAus("splitter", 50, 50, { anzahl: 9 });
    werk.stosseAus("glut", 80, 32, { anzahl: 2 });
    for (let n = 0; n < 6; n++) werk.schritt(1 / 60, null);
    return werk.teilchen().map((t) => `${t.x.toFixed(6)}|${t.y.toFixed(6)}|${t.farbe}`).join(";");
  };
  gleich(bau(), bau(), "zweimal dieselbe Saat gibt Teilchen für Teilchen dasselbe");

  const anders = machePartikelwerk(120, 99);
  anders.stosseAus("splitter", 50, 50, { anzahl: 9 });
  const einer = anders.teilchen().find((t) => t.leben > 0);
  behaupte(einer !== undefined, "auch mit anderer Saat wird ausgestoßen");
}

/* ── 13 · Keine Uhr, kein ungesäter Würfel ────────────────────────── */
abschnitt("13 · Keine Uhr");
{
  /* Das Flackern und der Ausstoß dürfen nur aus der gereichten Zeit
     und der gereichten Saat kommen. Eine einzige `Date.now()` im
     Licht macht jedes Bildschirmfoto unwiederholbar — und niemand
     sieht es, weil das Bild trotzdem richtig aussieht. */
  const verboten = [/Math\.random/, /Date\.now/, /new Date/, /performance\.now/];
  /* Grob geschnitten: Blockkommentare und Zeilenkommentare fallen weg.
     Das reicht hier, weil beide Dateien keine Zeichenkette mit einem
     Kommentarzeichen darin enthalten — die genaue Fassung mit einem
     Zustandsautomaten steht in `pruefe-kern.mjs` und wird gebraucht,
     sobald der Schnitt über den ganzen Kern läuft. Ohne den Schnitt
     schlüge diese Behauptung an der Kopfnotiz an, die das Verbot
     erklärt, und eine Prüfung, die am eigenen Text scheitert,
     schaltet man nach zwei Tagen ab. */
  const ohneKommentar = (text) => text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  behaupte(verboten[0].test(ohneKommentar("const a = Math.random();")),
    "der Schnitt lässt echten Code stehen");
  behaupte(!verboten[0].test(ohneKommentar("/* niemals Math.random hier */")),
    "der Schnitt entfernt den Kommentar, der das Verbot erklärt");
  for (const datei of ["runtime/licht.js", "runtime/partikel.js"]) {
    const text = ohneKommentar(readFileSync(join(WURZEL, datei), "utf8"));
    behaupte(text.includes("export"), `${datei} ist nach dem Schnitt nicht leer`);
    for (const muster of verboten) {
      behaupte(!muster.test(text), `${datei} enthält kein ${muster.source.replace(/\\/g, "")}`);
    }
  }
  gleich(LICHT_ARTEN.fackel.weite, 6.5, "die Fackelreichweite kommt aus der Palette");
}

/* ── 14 · Was ein Bild kostet ─────────────────────────────────────
   Keine Behauptung, sondern eine Messung: Eine Zeitschranke in der
   Prüfkette wäre auf einem anderen Rechner mal rot und mal grün, und
   eine Prüfung, die manchmal grundlos anschlägt, wird abgeschaltet.
   Gedruckt wird sie trotzdem — damit auffällt, wenn aus einer
   Millisekunde dreißig werden. */
abschnitt("14 · Aufwand");
let aufwandBericht = "";
{
  const karte = macheKarte(44, 32);
  const werk = macheLichtwerk(karte);
  const fackeln = [];
  for (let n = 0; n < 30; n++) {
    fackeln.push({ x: 1 + (n * 7) % 42, y: 1 + (n * 5) % 30, art: "fackel", staerke: 1 });
  }
  werk.setzeQuellen(fackeln);
  const teile = machePartikelwerk(400);
  for (let n = 0; n < 20; n++) teile.stosseAus("funken", 8 + n * 16, 40, { anzahl: 5 });
  const funkeln = teile.leuchtende();
  const laeufe = 20;
  const beginn = Date.now();
  for (let n = 0; n < laeufe; n++) werk.rechne(n / 60, karte, funkeln);
  const dauer = (Date.now() - beginn) / laeufe;
  gleich(werk.anzahlQuellen(), 30, "dreißig feste Quellen");
  behaupte(funkeln.length === 100, `hundert leuchtende Teilchen (${funkeln.length})`);
  aufwandBericht = `44×32 Felder, 30 Fackeln und ${funkeln.length} leuchtende Teilchen: ` +
    `${dauer.toFixed(1)} ms je rechne(), gemittelt über ${laeufe} Läufe`;
}

console.log(`      · ${stufenBericht}`);
console.log(`      · ${tripelBericht}`);
console.log(`      · ${mischBericht}`);
console.log(`      · ${zuschlagBericht}`);
console.log(`      · ${lichtBericht}`);
console.log(`      · ${vorratBericht}`);
console.log(`      · ${wandBericht}`);
console.log(`      · ${aufwandBericht}`);

ende("Licht und Partikel");
