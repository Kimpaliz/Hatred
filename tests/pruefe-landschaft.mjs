/* [Aufgabe: Prüfwesen] Rechnet nach, dass jeder erzeugte Kerker spielbar ist.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Eine erzeugte Karte hat keinen Autor, der sie durchspielt. Sie
   entsteht aus einer Saat, und niemand sieht sie an, bevor vier Leute
   darauf stehen. Deshalb ist diese Datei die einzige Stelle, an der
   überhaupt jemand fragt: Kommt man da hin? Kommt man wieder zurück?
   Ist es dunkel? Steht Lava herum, die Jannik nie bestellt hat?

   Zwei Arten von Prüfung, und beide braucht es:

   1. **Der Reihenlauf** über viele Saaten. Er behauptet nur über
      Eigenschaften, die auf *jeder* Karte gelten müssen. Eine einzelne
      Karte beweist nichts — der Erzeuger würfelt, und ein Fehler, der
      jede zwanzigste Karte trifft, ist bei drei Proben unsichtbar.
   2. **Die einzelnen Schritte** an von Hand gebauten Karten. Hier
      steht der Fall, der ohne die Arbeit falsch wäre: die Grube, aus
      der man nicht mehr herauskommt; die Kachel, die nur über Eck
      verbunden ist; das Fass im einzigen Gang. Der Reihenlauf würde
      diese Fälle vielleicht nie zu sehen bekommen.

   ── Warum die Prüfung ihre eigenen Regeln nicht nachbaut ───────────

   Erreichbarkeit wird mit `laufKosten`/`begehbar` aus
   `spiel/hoehen.mjs` gefragt — denselben Funktionen, mit denen der
   Erzeuger arbeitet und mit denen später gespielt wird. Eine eigene,
   „offensichtlich richtige" Kopie in der Prüfung wäre die zweite
   Wahrheit, an der beide sich gegenseitig bestätigen und trotzdem
   falsch liegen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/landschaft.mjs` (das Geprüfte, mit allen Einzelschritten),
   `spiel/gitter.mjs` (Feldwerte, `macheKarte` für die Handkarten),
   `spiel/hoehen.mjs` (`begehbar`, `laufKosten`), `spiel/welt-feld.mjs`
   und `spiel/bauart.mjs` (die Höhlenformel und ihre Werte),
   `tests/helfer.mjs` (Behauptungen), `werkzeuge/karte-zeigen.mjs`
   (zeigt, was hier nur gezählt wird). */

import { abschnitt, behaupte, gleich, wirft, ende } from "./helfer.mjs";
import {
  baueLandschaft, offen, beidseitigErreichbar,
  erreichbareFelder, laufKostenFeld, offeneGebiete, ebenenFlaechen, plateaus, gebiete,
  rastereWaende, setzeRand, setzeEbenen, mehrheitsFilter, legeKleineEbenenZusammen,
  roheEbenen, schneideKliffe, beckenGebiete,
  schliesseEinzelneHohlraeume, macheSaeulen, raeumeAuf,
  verfuelleNebenraeume, verbindeMitRampen, streueZusatzRampen, aufstiegsKanten,
  setzeWasser, setzeBoden, setzeFackeln, setzeZier, zierErlaubt, waehleStarts,
  waehleAusgang, sammleRaeume, groesstesPlateauFeld,
  MIN_KARTE, MIN_EBENEN_FLAECHE, FACKEL_ABSTAND, RAUM_ARTEN, ZUSATZ_RAMPEN
} from "../spiel/landschaft.mjs";
import {
  macheKarte, HINDERNIS, FLUESSIG, BODEN, RAMPE, richtungen, EBENEN, EBENE_GRABEN, abstand
} from "../spiel/gitter.mjs";
import { begehbar, laufKosten } from "../spiel/hoehen.mjs";
import { macheWeltfeld } from "../spiel/welt-feld.mjs";
import { BAUART } from "../spiel/bauart.mjs";

/* Sechzig Saaten sind kein Zierwert: Ein Fehler, der jede zwanzigste
   Karte trifft, wird bei sechzig Proben mit 95 % Wahrscheinlichkeit
   mindestens einmal gesehen. Die Maße sind kleiner als die 56 × 40 des
   Spiels, weil sechzig volle Karten die ganze Prüfkette verdreifachen
   würden; sechs volle Karten laufen darum zusätzlich mit. */
const SAATEN = 60;
const BREITE = 44;
const HOEHE = 32;
const VOLLE = [3, 7, 11, 19, 23, 41];

/* Wie viele offene Kacheln höchstens auf eine Fackel kommen dürfen.
   Darüber ist die Karte dunkel — nicht stimmungsvoll, sondern
   unspielbar, weil `spiel/licht.mjs` unbeleuchtete Wesen verbirgt. */
const OFFEN_JE_FACKEL = 40;

const spalte = (karte, i) => i % karte.breite;
const zeile = (karte, i) => (i / karte.breite) | 0;

/* Eine leere Handkarte: alles offen, alles Ebene 1, Rand aus Wand.
   Von Hand gebaute Karten sind der einzige Weg, einem Schritt genau
   den Fall vorzulegen, für den er da ist. */
function handKarte(breite, hoehe, ebene = 1) {
  const karte = macheKarte(breite, hoehe);
  karte.hindernis.fill(HINDERNIS.keins);
  karte.ebene.fill(ebene);
  setzeRand(karte);
  return karte;
}

const setzeBlock = (karte, x0, y0, x1, y1, werte) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) karte.setze(x, y, werte);
};

/* ══════════════════════════════════════════════════════════════════
   1 · Der Reihenlauf über 60 Saaten
   ══════════════════════════════════════════════════════════════════ */

/* Eine Kopie der Karte — damit eine Zählung, die nebenbei aufräumt,
   das Original nicht verändert. */
function macheKopie(karte) {
  const neu = macheKarte(karte.breite, karte.hoehe);
  for (const reihe of ["boden", "ebene", "hindernis", "fluessig", "rampe"]) {
    neu[reihe].set(karte[reihe]);
  }
  return neu;
}

abschnitt("Reihenlauf");

const fehler = {
  rand: 0, startBegehbar: 0, startVerbunden: 0, ausgang: 0,
  unerreichbar: 0, ebenenFlaeche: 0, verbotenNass: 0, wasserBecken: 0,
  wasserSee: 0, dunkel: 0, startZahl: 0, ausgangAufStart: 0, raumArt: 0
};
const messung = {
  offen: 0, felder: 0, rampen: 0, wasser: 0, fackeln: 0, seen: 0,
  saeulen: 0, plateaus: 0, schlimmsteFackel: 0, kleinsteEbenenFlaeche: 1e9,
  jeEbene: [0, 0, 0, 0], kartenOhneEbene: [0, 0, 0, 0]
};
const summen = new Set();
const NASS_VERBOTEN = new Set([FLUESSIG.lava, FLUESSIG.schleim, FLUESSIG.oel]);

for (let saat = 1; saat <= SAATEN; saat++) {
  const spielerZahl = 1 + (saat % 4);
  const karte = baueLandschaft({
    saat, breite: BREITE, hoehe: HOEHE, spielerZahl, tiefe: 1 + (saat % 5)
  });
  summen.add(karte.summe());

  /* (a) Rand */
  for (let x = 0; x < karte.breite; x++) {
    if (karte.hindernisBei(x, 0) !== HINDERNIS.wand) fehler.rand++;
    if (karte.hindernisBei(x, karte.hoehe - 1) !== HINDERNIS.wand) fehler.rand++;
  }
  for (let y = 0; y < karte.hoehe; y++) {
    if (karte.hindernisBei(0, y) !== HINDERNIS.wand) fehler.rand++;
    if (karte.hindernisBei(karte.breite - 1, y) !== HINDERNIS.wand) fehler.rand++;
  }

  /* (b) Startfelder: so viele wie Spieler, begehbar, untereinander
     erreichbar. Gefragt wird beidseitig — zwei Jäger, die sich nur in
     einer Richtung erreichen, stehen im selben Kerker und doch nicht
     zusammen. */
  if (karte.starts.length !== spielerZahl) fehler.startZahl++;
  for (const s of karte.starts) if (karte.blocktBewegung(s.x, s.y)) fehler.startBegehbar++;
  const gut = beidseitigErreichbar(karte, [karte.starts[0]]);
  for (const s of karte.starts) if (!gut[karte.index(s.x, s.y)]) fehler.startVerbunden++;

  /* (c) Ausgang mit den echten Höhenregeln erreichbar */
  const aus = karte.ausgang;
  if (!aus || !gut[karte.index(aus.x, aus.y)]) fehler.ausgang++;
  if (aus && karte.starts.some((s) => s.x === aus.x && s.y === aus.y)) fehler.ausgangAufStart++;

  /* (d) keine Nur-Diagonale */

  /* (e) jede offene Kachel erreichbar — hin und zurück */
  let offeneKacheln = 0, wasserKacheln = 0;
  const jeEbene = [0, 0, 0, 0];
  /* (j) Wo Wasser stehen darf. Bis zum 07.09.2026 lautete die Zusage
     *in Ebene 0*, seit Vorgang #8 Schritt 3 lautet sie *auf einem
     Beckenboden* — die stärkere: Ebene 0 ist eine Zahl, ein
     Beckenboden eine Aussage über die Nachbarn. Von ihm geht es nur
     hinauf, das Wasser kann nirgends ablaufen. */
  const beckenBoden = new Uint8Array(karte.anzahl);
  for (const b of beckenGebiete(karte)) for (const i of b.boden) beckenBoden[i] = 1;
  for (let i = 0; i < karte.anzahl; i++) {
    if (NASS_VERBOTEN.has(karte.fluessig[i])) fehler.verbotenNass++;
    if (karte.hindernis[i] === HINDERNIS.saeule) messung.saeulen++;
    if (karte.rampe[i] !== RAMPE.keine) messung.rampen++;
    if (!offen(karte, i)) continue;
    offeneKacheln++;
    jeEbene[karte.ebene[i]]++;
    if (!gut[i]) fehler.unerreichbar++;
    if (karte.fluessig[i] === FLUESSIG.wasser) {
      wasserKacheln++;
      if (!beckenBoden[i]) fehler.wasserBecken++;
    }
  }

  /* (j) und jede Wasserfläche ist eine Senke ab der Mindestgröße */
  const seen = gebiete(karte, (i) => karte.fluessig[i] === FLUESSIG.wasser, () => true);
  for (const zahl of seen.groessen) if (zahl < BAUART.wasserMindestSee) fehler.wasserSee++;

  /* (h) keine Ebenenfläche unter drei Kacheln */
  for (const zahl of ebenenFlaechen(karte).groessen) {
    if (zahl < MIN_EBENEN_FLAECHE) fehler.ebenenFlaeche++;
    if (zahl < messung.kleinsteEbenenFlaeche) messung.kleinsteEbenenFlaeche = zahl;
  }

  /* (k) Licht */
  const fackeln = karte.lichter.filter((l) => l.art === "fackel").length;
  const jeFackel = offeneKacheln / Math.max(1, fackeln);
  if (fackeln === 0 || jeFackel > OFFEN_JE_FACKEL) fehler.dunkel++;
  if (jeFackel > messung.schlimmsteFackel) messung.schlimmsteFackel = jeFackel;

  for (const r of karte.raeume) if (!RAUM_ARTEN.includes(r.art)) fehler.raumArt++;

  messung.offen += offeneKacheln;
  messung.felder += karte.anzahl;
  messung.wasser += wasserKacheln;
  messung.fackeln += fackeln;
  messung.seen += seen.groessen.length;
  messung.plateaus += plateaus(karte).groessen.length;
  for (let e = 0; e < EBENEN; e++) {
    messung.jeEbene[e] += jeEbene[e];
    if (jeEbene[e] === 0) messung.kartenOhneEbene[e]++;
  }
}

gleich(fehler.rand, 0, `(a) der Rand ist auf allen ${SAATEN} Karten vollständig Wand`);
gleich(fehler.startZahl, 0, "(b) jede Karte hat genau so viele Startfelder wie Spieler");
gleich(fehler.startBegehbar, 0, "(b) jedes Startfeld ist begehbar");
gleich(fehler.startVerbunden, 0, "(b) die Startfelder erreichen einander hin und zurück");
gleich(fehler.ausgang, 0, "(c) der Ausgang ist mit den echten Höhenregeln erreichbar");
gleich(fehler.ausgangAufStart, 0, "(c) der Ausgang liegt auf keinem Startfeld");
gleich(fehler.unerreichbar, 0, "(e) jede offene Kachel ist hin und zurück erreichbar");
gleich(fehler.ebenenFlaeche, 0,
  `(h) keine Ebenenfläche unter ${MIN_EBENEN_FLAECHE} Kacheln`);
gleich(fehler.verbotenNass, 0, "(i) nirgends Lava, Schleim oder Öl — Janniks Vorgabe");
gleich(fehler.wasserBecken, 0,
  "(j) jedes Wasserfeld liegt auf einem Beckenboden — alle offenen Nachbarn liegen höher");
gleich(fehler.wasserSee, 0,
  `(j) jeder See hat mindestens ${BAUART.wasserMindestSee} Kacheln`);
gleich(fehler.dunkel, 0, `(k) mindestens eine Fackel je ${OFFEN_JE_FACKEL} offene Kacheln`);
gleich(fehler.raumArt, 0, "jede Raumart steht in RAUM_ARTEN");

/* (h) Alle vier Ebenen kommen im Mittel vor. Auf einer einzelnen
   kleinen Karte darf Ebene 3 fehlen — sie ist das Hochplateau und
   selten; fehlte sie im Mittel, wäre die Höhe keine Spielregel mehr,
   sondern Zierde. */
for (let e = 0; e < EBENEN; e++) {
  behaupte(messung.jeEbene[e] / SAATEN >= 5,
    `(h) Ebene ${e} kommt im Mittel vor: ${(messung.jeEbene[e] / SAATEN).toFixed(1)}` +
    ` Kacheln je Karte, auf ${messung.kartenOhneEbene[e]} Karten gar nicht`);
}

/* (g) Verschiedene Saaten geben verschiedene Karten. Ohne diese Probe
   bliebe unbemerkt, wenn die Saat irgendwo verlorenginge — jede Karte
   sähe gleich aus, und alle anderen Prüfungen wären trotzdem grün. */
gleich(summen.size, SAATEN, `(g) ${SAATEN} Saaten geben ${SAATEN} verschiedene Karten`);

/* (f) Dieselbe Saat gibt byteweise dieselbe Karte. Der teuerste
   Fehler, den es im Internet-Koop gibt: Zwei Rechner bauen aus
   derselben Saat verschiedene Kerker und halten beide sich für
   richtig. Geprüft wird nicht nur `summe()` — die deckt nur die fünf
   Reihen ab —, sondern auch Starts, Ausgang und Lichter. */
let ungleich = 0;
for (let saat = 1; saat <= SAATEN; saat += 5) {
  const a = baueLandschaft({ saat, breite: BREITE, hoehe: HOEHE, spielerZahl: 3 });
  const b = baueLandschaft({ saat, breite: BREITE, hoehe: HOEHE, spielerZahl: 3 });
  if (a.summe() !== b.summe()) ungleich++;
  if (JSON.stringify(a.starts) !== JSON.stringify(b.starts)) ungleich++;
  if (JSON.stringify(a.ausgang) !== JSON.stringify(b.ausgang)) ungleich++;
  if (JSON.stringify(a.lichter) !== JSON.stringify(b.lichter)) ungleich++;
}
gleich(ungleich, 0, "(f) dieselbe Saat gibt byteweise dieselbe Karte");

/* Die vollen Maße des Spiels laufen mit — kleinere Karten könnten
   einen Fehler verdecken, der erst ab zwei Skelettsektoren auftritt. */
let volleFehler = 0;
for (const saat of VOLLE) {
  const karte = baueLandschaft({ saat, spielerZahl: 4 });
  const gutV = beidseitigErreichbar(karte, [karte.starts[0]]);
  for (let i = 0; i < karte.anzahl; i++) if (offen(karte, i) && !gutV[i]) volleFehler++;
  if (karte.starts.length !== 4) volleFehler++;
  if (!gutV[karte.index(karte.ausgang.x, karte.ausgang.y)]) volleFehler++;
}
gleich(volleFehler, 0, `${VOLLE.length} volle Karten 56 × 40 sind ebenso spielbar`);

/* ══════════════════════════════════════════════════════════════════
   2 · Die einzelnen Schritte
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Rastern und Rand");

{
  const welt = macheWeltfeld(7, null);
  const karte = macheKarte(24, 24);
  const wandNaehe = rastereWaende(karte, welt);
  let fels = 0, offenZahl = 0;
  for (let i = 0; i < karte.anzahl; i++) {
    if (karte.hindernis[i] === HINDERNIS.wand) fels++; else offenZahl++;
  }
  behaupte(fels > 0 && offenZahl > 0, "das Rastern macht Fels und Hohlraum, nicht nur eines");
  /* Die Mittelprobe ist das Vorzeichen der Kachel: Wand heißt Fels,
     also positive Distanz. Ohne diese Probe könnte die Wandnähe
     irgendein Wert sein, und der Boden legte Geröll in die Raummitte. */
  let vorzeichenFehler = 0;
  for (let i = 0; i < karte.anzahl; i++) {
    const istWand = karte.hindernis[i] === HINDERNIS.wand;
    if (istWand && wandNaehe[i] < -8) vorzeichenFehler++;
    if (!istWand && wandNaehe[i] > 8) vorzeichenFehler++;
  }
  gleich(vorzeichenFehler, 0, "die zurückgegebene Wandnähe passt zur gerasterten Kachel");

  const leer = macheKarte(10, 10);
  leer.hindernis.fill(HINDERNIS.keins);
  gleich(setzeRand(leer), 36, "der Rand setzt genau den Umfang einer 10 × 10-Karte");
  let randLoch = 0;
  for (let x = 0; x < 10; x++) {
    if (leer.hindernisBei(x, 0) !== HINDERNIS.wand) randLoch++;
    if (leer.hindernisBei(x, 9) !== HINDERNIS.wand) randLoch++;
    if (leer.hindernisBei(0, x) !== HINDERNIS.wand) randLoch++;
    if (leer.hindernisBei(9, x) !== HINDERNIS.wand) randLoch++;
  }
  gleich(randLoch, 0, "und lässt kein Loch im Rand");
  gleich(setzeRand(leer), 0, "ein zweiter Aufruf ändert nichts mehr");
}

abschnitt("Ebenen");

{
  /* Der Fall, der ohne den Mehrheitsfilter falsch wäre: eine einzelne
     Kachel Ebene 3 mitten in Ebene 1. Sie ist keine Stufe, die man
     besteigen könnte — sie ist zwei Stufen hoch und damit eine Wand,
     die wie Boden aussieht. */
  const karte = handKarte(9, 9);
  karte.setze(4, 4, { ebene: 3 });
  gleich(karte.ebeneBei(4, 4), 3, "vor dem Filter steht der Ausrutscher noch da");
  const geaendert = mehrheitsFilter(karte);
  gleich(karte.ebeneBei(4, 4), 1, "der Mehrheitsfilter räumt den Ausrutscher weg");
  gleich(geaendert, 1, "und ändert genau diese eine Kachel");

  /* Der Filter allein genügt nicht. Am Kartenrand ist sein Fenster
     beschnitten, und dort überlebt eine Splitterfläche die Mehrheit —
     gezeigt an einer echten Rohkarte, damit die Probe nicht an einem
     ausgedachten Muster hängt. */
  const rohWelt = macheWeltfeld(5, null);
  const roh = macheKarte(44, 32);
  rastereWaende(roh, rohWelt);
  setzeRand(roh);
  /* Nicht `setzeEbenen`, sondern seine Schritte einzeln und in
     derselben Reihenfolge — sonst prüft man das Ergebnis und nicht den
     Schritt. Seit die Kliffe dazwischenliegen (06.09.2026) hat
     `setzeEbenen` das Zusammenlegen schon erledigt, und die Frage „gab
     es überhaupt zu kleine Flächen?" wäre immer mit Nein beantwortet. */
  roheEbenen(roh, rohWelt);
  mehrheitsFilter(roh);
  const kliffe = schneideKliffe(roh);
  const klein = (k) => ebenenFlaechen(k).groessen.filter((z) => z < MIN_EBENEN_FLAECHE).length;
  const vorher = klein(roh);
  behaupte(kliffe > 0, `die Kliffe schneiden ${kliffe} Böschungskachel(n) weg`);
  behaupte(vorher > 0,
    `nach Filter und Kliffen sind noch ${vorher} Ebenenflächen zu klein — deshalb Schritt 2`);
  const runden = legeKleineEbenenZusammen(roh);
  gleich(klein(roh), 0, "das Zusammenlegen räumt sie alle weg");
  behaupte(runden >= 1, `es brauchte ${runden} Durchgang/Durchgänge`);

  /* Und die Grenze wird nicht überschritten: Eine Fläche von genau
     drei Kacheln bleibt stehen. Ohne diese Probe könnte die Prüfung
     grün sein, weil einfach alles eingeebnet wurde. */
  const drei = handKarte(9, 9);
  drei.setze(4, 3, { ebene: 2 });
  drei.setze(4, 4, { ebene: 2 });
  drei.setze(4, 5, { ebene: 2 });
  legeKleineEbenenZusammen(drei);
  gleich(drei.ebeneBei(4, 4), 2, "eine Fläche von genau drei Kacheln bleibt stehen");
}

abschnitt("Aufräumen");

{
  const karte = handKarte(9, 9);
  setzeBlock(karte, 3, 3, 5, 5, { hindernis: HINDERNIS.wand });
  karte.setze(4, 4, { hindernis: HINDERNIS.keins });
  gleich(schliesseEinzelneHohlraeume(karte), 1, "das einzelne Loch im Fels wird geschlossen");
  gleich(karte.hindernisBei(4, 4), HINDERNIS.wand, "und ist danach Wand");

  const saeule = handKarte(9, 9);
  saeule.setze(4, 4, { hindernis: HINDERNIS.wand });
  gleich(macheSaeulen(saeule), 1, "die einzelne Wandkachel im Offenen wird zur Säule");
  gleich(saeule.hindernisBei(4, 4), HINDERNIS.saeule, "sie bleibt stehen, statt zu fallen");
  behaupte(saeule.blocktBewegung(4, 4) && saeule.blocktSicht(4, 4),
    "eine Säule blockt weiter Bewegung und Sicht — sie ist Deckung, kein Boden");
}

{
  /* ── Die Nur-Diagonale gibt es nicht mehr ──────────────────────

     Hier standen bis zum 07.09.2026 zwei Abschnitte über einen Fall,
     den nur ein Quadratraster kennt: (3,3) und (4,4) offen, (4,3) und
     (3,4) gesperrt — im Bild ein Durchgang, im Spiel keiner, weil man
     nicht über Eck geht. Die Landschaft musste solche Stellen eigens
     suchen und aufbrechen (`nurDiagonalen`, `oeffneDiagonalen`,
     ~54 Zeilen).

     Auf dem Sechseck berühren sich zwei Felder nie nur über Eck. Der
     Fall ist mit dem Raster verschwunden, und mit ihm die Suche.

     Geprüft wird jetzt, dass er wirklich weg ist — und zwar an genau
     der Stelle, die früher der Beweis für sein Dasein war. Ohne diese
     Behauptung könnte jemand die Suche eines Tages wieder einbauen,
     ohne dass etwas anschlüge. */
  const karte = handKarte(9, 9);
  setzeBlock(karte, 1, 1, 7, 7, { hindernis: HINDERNIS.wand });
  karte.setze(3, 3, { hindernis: HINDERNIS.keins, ebene: 1 });
  karte.setze(4, 4, { hindernis: HINDERNIS.keins, ebene: 1 });
  behaupte(begehbar(karte, 3, 3, 4, 4),
    "was auf dem Quadrat eine Nur-Diagonale war, ist auf dem Sechseck ein Schritt");
  gleich(laufKosten(karte, 3, 3, 4, 4), 1, "und kostet einen Punkt wie jeder andere");

  const kern = await import("../spiel/erreichbarkeit.mjs");
  gleich(kern.diagonalFund, undefined, "`diagonalFund` gibt es nicht mehr");
  gleich(kern.nurDiagonalen, undefined, "`nurDiagonalen` auch nicht");
  const land = await import("../spiel/landschaft.mjs");
  gleich(land.oeffneDiagonalen, undefined, "und `oeffneDiagonalen` ebenso wenig");
}

{
  /* Der ganze Aufräumlauf läuft zusammen und lässt nichts stehen. */
  const welt = macheWeltfeld(5, null);
  const karte = macheKarte(44, 32);
  rastereWaende(karte, welt);
  setzeRand(karte);
  setzeEbenen(karte, welt);
  /* ── Warum hier keine Untergrenze mehr steht ────────────────────

     Bis zum 07.09.2026 behauptete diese Stelle, die rohe Rasterung
     habe **mindestens einen** Fall zum Aufräumen — auf dem
     Quadratraster stimmte das immer, weil Nur-Diagonalen dort
     massenhaft entstehen.

     Auf dem Sechseck gibt es die gar nicht mehr, und einzelne
     Hohlräume sind selten: Ein Feld mit sechs Nachbarn ist schwerer
     einzuschließen als eines mit vier. Auf dieser Karte sind es null.

     „Es gab etwas zu tun" ist damit keine Eigenschaft der Regel mehr,
     sondern des Zufalls. Geprüft wird deshalb nur noch, was immer
     gelten muss: **Danach ist nichts mehr übrig.** */
  const vorherLoecher = schliesseEinzelneHohlraeume(macheKopie(karte));
  const bericht = raeumeAuf(karte);
  gleich(schliesseEinzelneHohlraeume(karte), 0,
    `nach dem Aufräumen ist kein Hohlraum mehr übrig (vorher ${vorherLoecher})`);
  gleich(ebenenFlaechen(karte).groessen.filter((z) => z < MIN_EBENEN_FLAECHE).length, 0,
    "und keine Ebenenfläche ist zu klein");
  behaupte(bericht.runden <= 8, `der Aufräumlauf brauchte ${bericht.runden} Durchgänge`);
}

abschnitt("Nebenräume");

{
  /* Zwei Höhlen ohne Verbindung: Die kleinere wird Fels. Ohne diesen
     Schritt stellte `spiel/lauf.mjs` dort Brut auf, die niemand je
     findet — und der Lauf endete nie. */
  const karte = handKarte(20, 9);
  setzeBlock(karte, 10, 1, 10, 7, { hindernis: HINDERNIS.wand });
  gleich(offeneGebiete(karte).groessen.length, 2, "die Karte hat zwei getrennte Gebiete");
  const verfuellt = verfuelleNebenraeume(karte);
  gleich(offeneGebiete(karte).groessen.length, 1, "danach nur noch eines");
  gleich(verfuellt, 7 * 8, "und das kleinere ist vollständig verfüllt");
  behaupte(!karte.blocktBewegung(2, 2), "das größere Gebiet bleibt unangetastet");
}

abschnitt("Rampen");

{
  /* Der Aufstieg. Ohne Rampe kommt niemand auf das Plateau — und die
     Rampe gehört auf die **tiefere** Kachel und muss hinauf zeigen
     (Fehlerbuch A2). Wer sie oben hinlegt, baut eine Karte, auf der
     man weder hinauf noch hinunter kommt. */
  const karte = handKarte(20, 10);
  setzeBlock(karte, 12, 1, 18, 8, { ebene: 2 });
  const vorher = beidseitigErreichbar(karte, [{ x: 2, y: 5 }]);
  gleich(vorher[karte.index(14, 5)], 0, "ohne Rampe ist das Plateau nicht erreichbar");

  const bericht = verbindeMitRampen(karte);
  const nachher = beidseitigErreichbar(karte, [{ x: 2, y: 5 }]);
  gleich(nachher[karte.index(14, 5)], 1, "mit Rampe schon");
  behaupte(bericht.rampen > 0, `${bericht.rampen} Rampe(n) wurden dafür gesetzt`);
  gleich(bericht.verfuellt, 0, "und nichts musste verfüllt werden");

  let obenFalsch = 0;
  const mitRampe = [];
  for (let y = 1; y < 9; y++) {
    if (karte.rampeBei(12, y) !== RAMPE.keine) obenFalsch++;
    if (karte.rampeBei(11, y) === RAMPE.ost) mitRampe.push(y);
  }
  behaupte(mitRampe.length > 0, "die Rampe liegt auf der tieferen Kachel und zeigt nach oben");
  gleich(obenFalsch, 0, "und keine liegt auf der oberen Kachel");

  /* Geprüft wird an der Zeile, in der wirklich eine Rampe liegt, und
     nicht an einer angenommenen. Auf dem Quadratraster war das
     dieselbe Zeile wie die Kartenmitte; auf dem Sechseck entscheidet
     die Streuung, welche es wird — und eine feste Zeile hätte die
     Prüfung von der Streuung abhängig gemacht statt von der Regel. */
  const zeile = mitRampe[0];
  behaupte(begehbar(karte, 11, zeile, 12, zeile),
    `der Aufstieg in Zeile ${zeile} ist mit den echten Regeln erlaubt`);
  gleich(laufKosten(karte, 11, zeile, 12, zeile), 2,
    "und kostet die zwei Punkte aus hoehen.mjs");
}

{
  /* Die Grube — der Fall, den eine Prüfung übersieht, die nur
     vorwärts flutet. Hinab kommt man überall; ohne Rampe kommt man
     nie wieder heraus, und der erste Spieler, der hineinfällt, ist
     für den Rest des Laufs weg. */
  const karte = handKarte(16, 12);
  setzeBlock(karte, 6, 5, 8, 7, { ebene: 0 });
  const vor = erreichbareFelder(karte, [{ x: 2, y: 2 }]);
  const zurueck = erreichbareFelder(karte, [{ x: 2, y: 2 }], true);
  gleich(vor[karte.index(7, 6)], 1, "in die Grube kommt man auch ohne Rampe");
  gleich(zurueck[karte.index(7, 6)], 0, "aber nicht wieder heraus");

  verbindeMitRampen(karte);
  const gutJetzt = beidseitigErreichbar(karte, [{ x: 2, y: 2 }]);
  gleich(gutJetzt[karte.index(7, 6)], 1, "nach dem Rampenschritt kommt man hin und zurück");
  let hinaus = 0;
  for (let y = 5; y <= 7; y++) {
    for (let x = 6; x <= 8; x++) if (karte.rampeBei(x, y) !== RAMPE.keine) hinaus++;
  }
  behaupte(hinaus > 0, "die Rampe liegt in der Grube — auf der tieferen Kachel");
}

{
  /* Zwei Stufen auf einmal kann niemand steigen. Was dahinterliegt,
     wird verfüllt statt stehengelassen: Ein Plateau, das niemand
     betreten kann, ist Fels, der so tut als wäre er Boden. */
  const karte = handKarte(16, 10);
  setzeBlock(karte, 10, 1, 14, 8, { ebene: 3 });
  const bericht = verbindeMitRampen(karte);
  behaupte(bericht.verfuellt > 0, `${bericht.verfuellt} unerreichbare Kacheln wurden Fels`);
  const gutJetzt = beidseitigErreichbar(karte, [{ x: 2, y: 5 }]);
  let uebrig = 0;
  for (let i = 0; i < karte.anzahl; i++) if (offen(karte, i) && !gutJetzt[i]) uebrig++;
  gleich(uebrig, 0, "und es bleibt keine unerreichbare offene Kachel übrig");
}

{
  /* Die zusätzlichen Rampen sind gesät, nicht gewürfelt: dieselbe
     Saat, dieselben Rampen. Und sie bleiben zwischen 0 und allem. */
  const bau = () => {
    const k = handKarte(20, 20);
    setzeBlock(k, 10, 1, 18, 18, { ebene: 2 });
    return k;
  };
  const a = bau(), b = bau(), keine = bau(), alle = bau();
  /* ── Warum hier nicht die Kanten gezählt werden ─────────────────

     Eine Rampe liegt auf dem **tieferen** der beiden Felder, und ein
     Feld trägt höchstens eine. Auf dem Quadratraster fiel das kaum auf:
     Ein Feld hat vier Nachbarn, selten mehr als einen davon eine Stufe
     höher. Auf dem Sechseck sind es sechs, und dasselbe tiefe Feld
     grenzt regelmäßig an mehrere höhere.

     „Mit Anteil 1 bekommt jede Aufstiegskante eine Rampe" ist deshalb
     seit dem 07.09.2026 gar nicht mehr erfüllbar — gemessen: 35 Kanten,
     aber nur 18 verschiedene tiefe Felder. Gezählt wird jetzt, was
     zählbar ist. */
  const kantenListe = aufstiegsKanten(a);
  const kanten = new Set(kantenListe.map((e) => e.tief)).size;
  behaupte(kantenListe.length >= kanten,
    `${kantenListe.length} Aufstiegskanten auf ${kanten} verschiedenen tiefen Feldern`);
  const zahlA = streueZusatzRampen(a, 12345);
  const zahlB = streueZusatzRampen(b, 12345);
  gleich(zahlA, zahlB, "dieselbe Saat streut dieselbe Zahl Zusatzrampen");
  gleich(a.summe(), b.summe(), "und dieselben Rampen an denselben Stellen");
  gleich(streueZusatzRampen(keine, 12345, 0), 0, "mit Anteil 0 wird keine gesetzt");
  gleich(streueZusatzRampen(alle, 12345, 1), kanten,
    `mit Anteil 1 bekommt jedes der ${kanten} tiefen Felder seine Rampe`);
  behaupte(zahlA > 0 && zahlA < kanten,
    `mit ${ZUSATZ_RAMPEN} sind es ${zahlA} von ${kanten} — mehr als eine, nicht alle`);
  let obenFalsch = 0;
  for (const kante of aufstiegsKanten(alle)) {
    if (alle.rampe[kante.hoch] !== RAMPE.keine && alle.rampe[kante.tief] === RAMPE.keine) {
      obenFalsch++;
    }
  }
  gleich(obenFalsch, 0, "auch die Zusatzrampen liegen auf der tieferen Kachel");
}

abschnitt("Wasser");

{
  /* Eine Senke von drei Kacheln ist kein See. Ohne die Mindestgröße
     stünden einzelne nasse Kacheln im Trockenen — das sieht nach
     einem Fehler aus, nicht nach Wasser. */
  const karte = handKarte(20, 12);
  setzeBlock(karte, 2, 2, 2, 4, { ebene: EBENE_GRABEN });
  setzeBlock(karte, 10, 4, 13, 7, { ebene: EBENE_GRABEN });
  const welt = macheWeltfeld(1, null);
  const bericht = setzeWasser(karte, welt);
  gleich(karte.fluessigBei(2, 3), FLUESSIG.keine, "die kleine Senke bleibt trocken");
  gleich(karte.fluessigBei(11, 5), FLUESSIG.wasser, "die große wird zum See");
  gleich(bericht.seen, 1, "genau ein See");
  gleich(bericht.felder, 16, "mit genau den 16 Kacheln der großen Senke");
  gleich(laufKosten(karte, 11, 4, 11, 5), 2, "und Wasser kostet den Punkt aus hoehen.mjs");

  let verboten = 0;
  for (let i = 0; i < karte.anzahl; i++) {
    if (NASS_VERBOTEN.has(karte.fluessig[i])) verboten++;
  }
  gleich(verboten, 0, "der Erzeuger setzt keine Lava, keinen Schleim, kein Öl");
}

abschnitt("Boden");

{
  /* Geröll liegt am Wandfuß, Stein in der Mitte. Geprüft mit einer
     von Hand gesetzten Wandnähe — sonst prüfte man das Rauschen und
     nicht die Regel. */
  const welt = macheWeltfeld(3, null);
  const karte = handKarte(24, 24);
  const wandNaehe = new Float32Array(karte.anzahl).fill(-200);
  wandNaehe[karte.index(5, 5)] = -1;
  wandNaehe[karte.index(6, 5)] = 0;
  const zahlen = setzeBoden(karte, welt, wandNaehe);
  gleich(karte.bodenBei(5, 5), BODEN.erde, "dicht an der Wand liegt Erde");
  gleich(karte.bodenBei(6, 5), BODEN.erde, "auch genau auf der Kante");
  behaupte(karte.bodenBei(12, 12) !== BODEN.erde, "weit von der Wand liegt keine Erde");
  gleich(zahlen.erde, 2, "genau die zwei gesetzten Kacheln sind Erde");
  behaupte(zahlen.stein > 0, "und Stein ist die Regel");

  /* Der Boden ist gesät, nicht gewürfelt — und die Saat wirkt auch
     wirklich: Ohne diese zweite Hälfte könnte sie stillschweigend
     weggelassen sein, und jede Karte trüge dieselben Knochenflecken. */
  const zwei = handKarte(24, 24);
  setzeBoden(zwei, welt, wandNaehe);
  gleich(zwei.summe(), karte.summe(), "derselbe Boden bei derselben Saat");
  /* Eine Welt **ohne Hallen**: Sonst verschöbe eine andere Saat auch
     die Hallen, und der Unterschied im Bild bewiese nichts über die
     Knochen. So bleibt genau ein Unterschied übrig — die Saat des
     Knochenrauschens. */
  const ohneHallen = (s) => ({
    bauart: BAUART, saat: s, sektor: 200,
    versatz: (X, Y, raus) => { raus[0] = 0; raus[1] = 0; },
    raumBei: () => ({ x: 0, y: 0, r: 0, halle: false })
  });
  const knochenBild = (w) => {
    const k = handKarte(24, 24);
    setzeBoden(k, w, wandNaehe);
    let bild = "";
    for (let i = 0; i < k.anzahl; i++) bild += k.boden[i] === BODEN.knochen ? "1" : "0";
    return bild;
  };
  const bildA = knochenBild(ohneHallen(3)), bildB = knochenBild(ohneHallen(99));
  behaupte(bildA.includes("1"), "auf 24 × 24 liegt mindestens ein Knochenfleck");
  behaupte(bildA !== bildB, "eine andere Saat legt die Knochenflecken anderswohin");
}

/* ══════════════════════════════════════════════════════════════════
   Die Höhle hat keine Vorzugsrichtung
   ══════════════════════════════════════════════════════════════════

   ── Warum es diese Prüfung gibt ────────────────────────────────────

   Am 07.09.2026 wurde die Abtastung auf das Sechseckraster umgestellt:
   Jede ungerade Zeile liegt ein halbes Feld weiter rechts, also muss
   die Weltformel dort abgefragt werden, wo das Feld wirklich liegt.

   Beim Rotmachen fiel auf, dass **keine einzige Prüfung** den halben
   Versatz deckte: Nimmt man ihn heraus, bleibt die ganze Kette grün.
   Die Karte sieht dann nur ein wenig anders aus — und „ein wenig
   anders" merkt niemand.

   ── Woran man es doch merkt ────────────────────────────────────────

   Die Weltformel ist richtungsneutral: Sie kennt kein Oben und kein
   Schräg. Also muss auch die gerasterte Karte in alle sechs
   Richtungen gleich aussehen. Gemessen wird, wie oft zwei Nachbarn
   im selben Zustand sind (beide Fels oder beide offen) — je Richtung,
   über zwanzig Karten.

   Gemessen am 07.09.2026 über 20 Karten à 44 x 32:

   · **mit** halbem Versatz: 82,68 % bis 83,95 % — Spanne 1,27 Punkte
   · **ohne** halben Versatz: 81,75 % bis 84,00 % — Spanne 2,25 Punkte

   Ohne den Versatz sind die schrägen Richtungen messbar „körniger" als
   die waagerechten: Das Raster steht schief zur Höhle. Die Schwelle
   liegt bei 1,8 — mit Luft zu beiden Seiten. */
abschnitt("Keine Vorzugsrichtung");
{
  const SPANNE_HOECHSTENS = 1.8;
  const zaehler = new Map(), einig = new Map();
  for (let saat = 1; saat <= 20; saat++) {
    const k = baueLandschaft({ saat, breite: 44, hoehe: 32, spielerZahl: 2 });
    for (let y = 1; y < k.hoehe - 1; y++) {
      for (let x = 1; x < k.breite - 1; x++) {
        const fels = k.blocktBewegung(x, y);
        for (const r of richtungen(y)) {
          const nx = x + r.dx, ny = y + r.dy;
          if (!k.drin(nx, ny)) continue;
          zaehler.set(r.name, (zaehler.get(r.name) || 0) + 1);
          if (k.blocktBewegung(nx, ny) === fels) {
            einig.set(r.name, (einig.get(r.name) || 0) + 1);
          }
        }
      }
    }
  }
  const werte = [...zaehler.keys()].map((n) => 100 * einig.get(n) / zaehler.get(n));
  gleich(werte.length, 6, "alle sechs Richtungen wurden gemessen");
  const spanne = Math.max(...werte) - Math.min(...werte);
  behaupte(spanne < SPANNE_HOECHSTENS,
    `keine Richtung ist körniger als die andere: Spanne ${spanne.toFixed(2)} `
    + `von erlaubten ${SPANNE_HOECHSTENS} Punkten`);
  console.log(`      · Richtungsneutral über 20 Karten: Spanne ${spanne.toFixed(2)} Prozentpunkte `
    + `(${Math.min(...werte).toFixed(1)} bis ${Math.max(...werte).toFixed(1)} % einige Nachbarn)`);
}

abschnitt("Zier und Licht");

{
  /* Der einzige Gang. Ein Fass darin wäre eine Karte, auf der der
     halbe Kerker nicht mehr erreichbar ist — und niemand sähe es. */
  const karte = handKarte(15, 9);
  setzeBlock(karte, 7, 1, 7, 7, { hindernis: HINDERNIS.wand });
  karte.setze(7, 4, { hindernis: HINDERNIS.keins });
  gleich(zierErlaubt(karte, 7, 4), false, "im einzigen Gang darf nichts stehen");
  gleich(zierErlaubt(karte, 3, 4), true, "mitten im Raum schon");
  gleich(karte.hindernisBei(7, 4), HINDERNIS.keins, "die Probe lässt die Karte, wie sie war");

  /* Hier stand bis zum 07.09.2026: „Eine Zierde darf keine neue
     Nur-Diagonale schaffen." Auf dem Sechseck gibt es keine
     Nur-Diagonale mehr (siehe oben) — zwei Felder über Eck sind dort
     Nachbarn, und eine Zierde daneben schafft keinen Schein-Durchgang.

     Geprüft wird stattdessen, was auf jedem Raster gilt und wofür
     `zierErlaubt` da ist: Eine Zierde darf keinen Weg abschneiden. */
  const ecke = handKarte(9, 9);
  ecke.setze(4, 3, { hindernis: HINDERNIS.wand });
  gleich(zierErlaubt(ecke, 3, 4), true,
    "neben einer einzelnen Wand ist Platz für eine Zierde — sie trennt nichts");

  /* Und die Gegenprobe: In einem Gang, der nur ein Feld breit ist,
     darf sie nicht stehen. Das ist dieselbe Aussage wie oben, nur an
     einer Stelle, die das Sechseck nicht wegdefiniert hat. */
  const gang = handKarte(9, 9);
  setzeBlock(gang, 1, 1, 7, 7, { hindernis: HINDERNIS.wand });
  setzeBlock(gang, 1, 4, 7, 4, { hindernis: HINDERNIS.keins });
  gleich(zierErlaubt(gang, 4, 4), false, "im einspurigen Gang darf keine Zierde stehen");
}

{
  const karte = handKarte(24, 18);
  const zahl = setzeFackeln(karte);
  const fackeln = karte.lichter.filter((l) => l.art === "fackel");
  behaupte(zahl > 0, `in einem 24 × 18-Saal stehen ${zahl} Fackeln`);
  gleich(fackeln.length, zahl, "jeder Sockel trägt genau ein Licht");
  let falscherOrt = 0, zuNah = 0;
  for (const f of fackeln) {
    if (karte.hindernisBei(f.x, f.y) !== HINDERNIS.fackelsockel) falscherOrt++;
    let anWand = false;
    for (const r of richtungen(f.y)) {
      if (karte.hindernisBei(f.x + r.dx, f.y + r.dy) === HINDERNIS.wand) anWand = true;
    }
    if (!anWand) falscherOrt++;
    if (f.staerke !== 1) falscherOrt++;
    for (const g of fackeln) {
      if (g === f) continue;
      if (Math.max(Math.abs(g.x - f.x), Math.abs(g.y - f.y)) < FACKEL_ABSTAND) zuNah++;
    }
  }
  gleich(falscherOrt, 0, "jede Fackel steht auf ihrem Sockel an einer Wand, Stärke 1");
  gleich(zuNah, 0, `keine zwei Fackeln stehen näher als ${FACKEL_ABSTAND} Kacheln`);
}

{
  /* Die Zier verstopft nichts. Geprüft wird nicht die Zier, sondern
     die Karte danach: Was vorher erreichbar war, ist es noch. */
  const welt = macheWeltfeld(23, null);
  const karte = baueLandschaft({ saat: 23, breite: 40, hoehe: 28, spielerZahl: 2 });
  const gutV = beidseitigErreichbar(karte, [karte.starts[0]]);
  let verloren = 0;
  for (let i = 0; i < karte.anzahl; i++) if (offen(karte, i) && !gutV[i]) verloren++;
  gleich(verloren, 0, "nach dem Setzen aller Zier ist noch alles erreichbar");

  const nochmal = setzeZier(karte, welt, 23);
  gleich(Object.values(nochmal).reduce((a, b) => a + b, 0), 0,
    "ein zweiter Lauf setzt nichts mehr — jede Stelle ist schon vergeben");
  /* Auch die Zier hängt an der Saat. Der Reihenlauf könnte das nicht
     zeigen: Dort ändert sich mit der Saat ohnehin die ganze Höhle,
     und eine festgenagelte Zier-Saat fiele nicht auf. */
  const saal = () => handKarte(30, 20);
  const eins = saal(), zwei = saal();
  setzeZier(eins, welt, 1);
  setzeZier(zwei, welt, 2);
  behaupte(eins.summe() !== zwei.summe(), "zwei Saaten stellen die Zier verschieden auf");
  const nochEins = saal();
  setzeZier(nochEins, welt, 1);
  gleich(nochEins.summe(), eins.summe(), "dieselbe Saat stellt sie gleich auf");

  const altaere = karte.lichter.filter((l) => l.art === "arkan");
  let ohneAltar = 0;
  for (const l of altaere) {
    if (karte.hindernisBei(l.x, l.y) !== HINDERNIS.altar) ohneAltar++;
  }
  gleich(ohneAltar, 0, "jedes arkane Licht steht auf einem Altar");
}

abschnitt("Starts, Ausgang, Räume");

{
  /* Der Ausgang liegt am Ende des **Weges**, nicht am Ende der
     Luftlinie. Auf dieser U-Karte ist (9,3) die Luftlinie-fernste
     Kachel, aber (1,3) die weg-fernste — man muss einmal um das U
     herum.

     Geprüft wird seit dem 07.09.2026 das **Verhältnis** und nicht mehr
     zwei abgeschriebene Zahlen. Auf dem Sechseck sind die Wege kürzer
     (9 und 16 statt 10 und 18); die Aussage dieser Stelle war aber nie
     „zehn und achtzehn", sondern „Luftlinie und Weg zeigen in
     verschiedene Richtungen". Genau das steht jetzt da — und es gilt
     auf jedem Raster. */
  const karte = macheKarte(11, 5);
  karte.hindernis.fill(HINDERNIS.wand);
  karte.ebene.fill(1);
  setzeBlock(karte, 1, 1, 9, 1, { hindernis: HINDERNIS.keins });
  setzeBlock(karte, 1, 3, 9, 3, { hindernis: HINDERNIS.keins });
  karte.setze(9, 2, { hindernis: HINDERNIS.keins });
  const start = [{ x: 1, y: 1 }];
  const kosten = laufKostenFeld(karte, start);
  const wegNah = kosten[karte.index(9, 3)];
  const wegFern = kosten[karte.index(1, 3)];
  behaupte(wegFern > wegNah,
    `um das U herum ist weiter als quer hindurch (${wegFern} gegen ${wegNah})`);
  behaupte(abstand(1, 1, 9, 3) > abstand(1, 1, 1, 3),
    "während die Luftlinie genau andersherum urteilt");
  /* Die Kachel (1,3) liegt zwei Felder Luftlinie entfernt und kostet
     ein Vielfaches — das U hat keine Abkürzung. Das ist die Aussage,
     die den Ausgang begründet. */
  behaupte(wegFern > abstand(1, 1, 1, 3) * 4,
    `zu (1,3) sind es ${abstand(1, 1, 1, 3)} Luftlinie, aber ${wegFern} Weg`);
  const aus = waehleAusgang(karte, start);
  gleich(`${aus.x},${aus.y}`, "1,3", "der Ausgang liegt am Ende des Weges");
}

{
  /* Die Startgruppe sucht den geräumigsten Fleck. Auf dieser Karte
     gibt es einen Saal und eine Sackgasse; ohne die Suche nach den
     meisten Nachbarn stünden vier Jäger in der Sackgasse und
     verlören ihren ersten Zug damit, sich aneinander vorbeizuschieben. */
  const eng = macheKarte(24, 12);
  eng.hindernis.fill(HINDERNIS.wand);
  eng.ebene.fill(1);
  /* Die Sackgasse liegt **vor** dem Saal: Wer einfach die erste
     brauchbare Kachel nähme, landete dort. */
  setzeBlock(eng, 1, 1, 8, 2, { hindernis: HINDERNIS.keins });
  setzeBlock(eng, 9, 2, 11, 2, { hindernis: HINDERNIS.keins });
  setzeBlock(eng, 11, 3, 11, 4, { hindernis: HINDERNIS.keins });
  setzeBlock(eng, 12, 4, 21, 10, { hindernis: HINDERNIS.keins });
  const starts = waehleStarts(eng, 4);
  gleich(starts.length, 4, "vier Startfelder werden gefunden");
  let imSaal = 0;
  for (const s of starts) if (s.x >= 12) imSaal++;
  gleich(imSaal, 4, "und alle vier liegen im Saal, nicht in der Sackgasse");

  /* Das größte Plateau ist der Anker der Rampensuche. */
  const zweiPlateaus = handKarte(20, 12);
  setzeBlock(zweiPlateaus, 1, 1, 4, 10, { ebene: 2 });
  const anker = groesstesPlateauFeld(zweiPlateaus);
  gleich(zweiPlateaus.ebene[anker], 1, "der Anker liegt auf dem größeren Plateau");
  const nurFels = macheKarte(8, 8);
  nurFels.hindernis.fill(HINDERNIS.wand);
  gleich(groesstesPlateauFeld(nurFels), -1, "eine Karte ganz aus Fels hat keinen Anker");
  wirft(() => waehleStarts(nurFels, 1), "und trägt keinen Start");
}

{
  const karte = baueLandschaft({ saat: 41, breite: 40, hoehe: 28, spielerZahl: 4 });
  gleich(karte.starts.length, 4, "vier Spieler bekommen vier Startfelder");
  const alle = new Set(karte.starts.map((s) => `${s.x},${s.y}`));
  gleich(alle.size, 4, "und zwar vier verschiedene");
  let weit = 0, nass = 0;
  for (const s of karte.starts) {
    const d = Math.abs(s.x - karte.starts[0].x) + Math.abs(s.y - karte.starts[0].y);
    if (d > 4) weit++;
    if (karte.fluessigBei(s.x, s.y) !== FLUESSIG.keine) nass++;
  }
  gleich(weit, 0, "die Startfelder liegen beieinander");
  gleich(nass, 0, "und keines steht im Wasser");

  const arten = karte.raeume.map((r) => r.art);
  behaupte(arten.includes("eingang"), "ein Raum ist als Eingang gekennzeichnet");
  behaupte(arten.includes("ausgang"), "einer als Ausgang");
  behaupte(karte.raeume.length >= 2, `${karte.raeume.length} Räume auf 40 × 28`);
  let ausserhalb = 0;
  for (const r of karte.raeume) if (!karte.drin(r.x, r.y)) ausserhalb++;
  gleich(ausserhalb, 0, "jeder Raum liegt auf der Karte");

  /* Die Raumliste kommt aus der Engine und wird erst danach beschriftet
     — `sammleRaeume` selbst kennt nur Halle und Kammer. */
  const roh = sammleRaeume(karte, macheWeltfeld(41, null));
  gleich(roh.length, karte.raeume.length, "die Raumliste ist so lang wie die der Karte");
  const rohArten = new Set(roh.map((r) => r.art));
  behaupte(!rohArten.has("eingang") && !rohArten.has("ausgang"),
    "vor der Beschriftung gibt es nur Hallen und Kammern");
  behaupte(rohArten.has("halle") || rohArten.has("kammer"), "und mindestens eine davon");
}

abschnitt("Grenzfälle");

wirft(() => baueLandschaft({}), "ohne Saat wird geworfen");
wirft(() => baueLandschaft({ saat: 1.5 }), "eine gebrochene Saat wird abgelehnt");
wirft(() => baueLandschaft({ saat: 1, breite: MIN_KARTE - 1 }), "eine zu schmale Karte auch");
wirft(() => baueLandschaft({ saat: 1, hoehe: MIN_KARTE - 1 }), "und eine zu flache");
wirft(() => baueLandschaft({ saat: 1, breite: 40.5 }), "eine gebrochene Breite ebenso");
wirft(() => baueLandschaft({ saat: 1, spielerZahl: 0 }), "null Spieler werden abgelehnt");
wirft(() => baueLandschaft({ saat: 1, spielerZahl: 5 }), "fünf auch");
wirft(() => baueLandschaft({ saat: 1, tiefe: 0 }), "und die Tiefe 0");

{
  const klein = baueLandschaft({
    saat: 5, breite: MIN_KARTE, hoehe: MIN_KARTE, spielerZahl: 1
  });
  gleich(klein.starts.length, 1, "die kleinste erlaubte Karte trägt einen Start");
  behaupte(klein.ausgang !== null, "und einen Ausgang");
  const gutK = beidseitigErreichbar(klein, [klein.starts[0]]);
  gleich(gutK[klein.index(klein.ausgang.x, klein.ausgang.y)], 1, "der auch erreichbar ist");

  const gross = baueLandschaft({ saat: 5, breite: 80, hoehe: 60, spielerZahl: 4 });
  gleich(gross.starts.length, 4, "eine 80 × 60-Karte trägt vier Starts");
  behaupte(gross.summe() !== klein.summe(), "die beiden Karten sind verschieden");

  /* Die Saat steht auf der Karte — `spiel/lauf.mjs` zieht daraus den
     Strom für die Gegneraufstellung. */
  gleich(klein.saat, 5, "die Karte trägt ihre Saat");
  gleich(baueLandschaft({ saat: 5, breite: 24, hoehe: 24, tiefe: 4 }).tiefe, 4,
    "und ihre Tiefe");

  /* Eine eigene Bauart wird durchgereicht: mehr Fels, weniger offen.
     Ohne diese Probe könnte `bauart` still ignoriert werden. */
  const eng = macheKarte(40, 28), weit = macheKarte(40, 28);
  rastereWaende(eng, macheWeltfeld(5, { schwelle: 0.80 }));
  rastereWaende(weit, macheWeltfeld(5, { schwelle: 0.60 }));
  let engOffen = 0, weitOffen = 0;
  for (let i = 0; i < eng.anzahl; i++) {
    if (offen(eng, i)) engOffen++;
    if (offen(weit, i)) weitOffen++;
  }
  behaupte(engOffen < weitOffen,
    `eine höhere Schwelle macht engere Höhlen: ${engOffen} gegen ${weitOffen} offene Kacheln`);
}

/* ══════════════════════════════════════════════════════════════════
   2b · Die Absturzkanten — die Zahl, an der der Stoß hängt
   ══════════════════════════════════════════════════════════════════

   Gemessen am 06.09.2026, bevor `schneideKliffe` gebaut war: **1,8**
   Absturzkanten je Karte gegen 260,5 einstufige. Der Stoß war damit
   tot — man kann niemanden hinunterstoßen, wo es nirgends hinunter
   geht. `docs/SPIEL.md` 3 nennt ihn „die Aktion, die aus dem
   Höhensystem ein Spiel macht"; eine Regel, die auf der erzeugten
   Karte nie greift, ist keine.

   Nach dem Kliffschnitt: **13,3**. Die Schranke steht bei 5 und nicht
   bei 13 — sie soll den Rückfall fangen, nicht die Bauart einfrieren.
   Wer die Höhen umbaut, sieht hier zuerst, wenn die Kanten verschwinden. */
const KANTEN_JE_KARTE_MIND = 5;
{
  abschnitt("Absturzkanten");
  let kanten = 0, stufen = 0, karten = 0;
  for (let n = 0; n < 20; n++) {
    const k = baueLandschaft({ saat: 1000 + n * 7, breite: BREITE, hoehe: HOEHE });
    karten++;
    for (let y = 0; y < k.hoehe; y++) {
      for (let x = 0; x < k.breite; x++) {
        if (k.blocktBewegung(x, y)) continue;
        const e = k.ebeneBei(x, y);
        for (const r of richtungen(y)) {
          const nx = x + r.dx, ny = y + r.dy;
          if (!k.drin(nx, ny) || k.blocktBewegung(nx, ny)) continue;
          const d = e - k.ebeneBei(nx, ny);
          if (d >= 2) kanten++;
          else if (d === 1) stufen++;
        }
      }
    }
  }
  const jeKarte = kanten / karten;
  console.log(`      · ${karten} Karten: ${jeKarte.toFixed(1)} Absturzkanten je Karte` +
    ` (mindestens ${KANTEN_JE_KARTE_MIND}), ${(stufen / karten).toFixed(1)} einstufige`);
  behaupte(jeKarte >= KANTEN_JE_KARTE_MIND,
    `${jeKarte.toFixed(1)} Absturzkanten je Karte — ohne sie ist der Stoß wirkungslos`);
  behaupte(stufen > kanten,
    "einstufige Kanten bleiben die Regel, Absturzkanten die Ausnahme");
}

/* ══════════════════════════════════════════════════════════════════
   3 · Die Messwerte
   ══════════════════════════════════════════════════════════════════ */

const je = (w) => (w / SAATEN).toFixed(1);
console.log(`      · ${SAATEN} Karten ${BREITE} × ${HOEHE}, je Karte im Mittel:` +
  ` ${je(messung.offen)} offene Kacheln` +
  ` (${(100 * messung.offen / messung.felder).toFixed(1)} %)`);
console.log(`      · Ebenen je Karte: ` +
  messung.jeEbene.map((z, e) => `${e}:${je(z)}`).join("  ") +
  `  ·  Karten ohne die Ebene: ${messung.kartenOhneEbene.join("/")}`);
console.log(`      · Rampen ${je(messung.rampen)} · Säulen ${je(messung.saeulen)}` +
  ` · Plateaus ${je(messung.plateaus)} · Seen ${je(messung.seen)}` +
  ` · Wasserkacheln ${je(messung.wasser)}`);
console.log(`      · Fackeln ${je(messung.fackeln)} je Karte, schlimmstenfalls eine je` +
  ` ${messung.schlimmsteFackel.toFixed(1)} offene Kacheln (erlaubt: ${OFFEN_JE_FACKEL})`);
console.log(`      · kleinste Ebenenfläche über alle Karten: ` +
  `${messung.kleinsteEbenenFlaeche} Kacheln (mindestens ${MIN_EBENEN_FLAECHE})`);

ende("Landschaft");
