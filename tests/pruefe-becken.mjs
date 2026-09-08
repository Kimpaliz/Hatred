/* [Aufgabe: Prüfwesen] Wasser steht in jedem Becken, nicht nur ganz
   unten im Graben — gezählt über dreißig erzeugte Karten und geprüft
   an einer von Hand gebauten.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Janniks Satz zu Vorgang #8 lautet wörtlich: *„unterschiedliche
   ebenen und auf jeder ebene kann es wasserbecken oder sbruende
   [Abgründe] geben"*. Bis zum 07.09.2026 band `setzeWasser` das Wasser
   an **Ebene 0**; gemessen über zehn Saaten lag danach kein einziges
   Wasserfeld auf Ebene 1, 2 oder 3. Die Karte war nicht falsch — sie
   war grün und trotzdem nicht das, was bestellt war.

   Genau das ist der Fall, den diese Datei prüft, und er wäre ohne die
   Arbeit falsch: **Auf wie vielen verschiedenen Ebenen steht Wasser?**
   Die alte Regel antwortet auf jeder Karte mit „einer". Eine Prüfung,
   die bloß fragt, ob überhaupt Wasser da ist, wäre bei der alten Regel
   ebenso grün gewesen.

   ── Regelprüfung und natürliche Verteilung ─────────────────────────

   Ob die natürliche Höhle mehrere geeignete Senken enthält, entscheidet
   ihre Form. Die Fähigkeit „auf jeder Ebene“ wird an vier kontrollierten
   Becken gleicher Größe geprüft. Der unveränderte Lauf über 30 Saaten
   berichtet weiterhin die Verteilung und prüft jedes vorhandene Wasser
   auf seine Beckenlage; er erzwingt keinen erfundenen Höhlentyp.

   ── Was hier bewusst nicht geprüft wird ────────────────────────────

   · **Abgründe.** Sie sind Schritt 4 dieses Vorgangs; hier geht es
     allein um das Wasser.
   · **Wie Wasser aussieht.** Das ist `runtime/` und wird von
     `tests/pruefe-zeichnen.mjs` gemessen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/kachelhilfe.mjs` (`beckenGebiete`, das Geprüfte),
   `spiel/ausstattung.mjs` (`setzeWasser` benutzt es),
   `spiel/landschaft.mjs` (`baueLandschaft` für den Reihenlauf),
   `spiel/gitter.mjs` (`macheKarte`, die Feldwerte),
   `tests/helfer.mjs` (Behauptungen und Abschluss) und
   `werkzeuge/pruefe-alles.mjs`, das diese Datei als eigenen Prozess
   startet und nur ihren Rückgabewert liest. */

import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";
import { macheKarte, HINDERNIS, FLUESSIG, EBENEN } from "../spiel/gitter.mjs";
import { beckenGebiete } from "../spiel/kachelhilfe.mjs";
import { baueLandschaft } from "../spiel/landschaft.mjs";
import { setzeWasser } from "../spiel/ausstattung.mjs";
import { BAUART } from "../spiel/bauart.mjs";

/* Dreißig aufeinanderfolgende Saaten ohne Vorauswahl. Die Maße sind die des Reihenlaufs in
   `tests/pruefe-landschaft.mjs`, damit beide Zahlen vergleichbar
   sind. */
const SAATEN = 30;
const BREITE = 44;
const HOEHE = 32;

/* ══════════════════════════════════════════════════════════════════
   1 · Was ein Becken ist
   ══════════════════════════════════════════════════════════════════

   Ein Saal, in dem beide Fälle nebeneinanderliegen — die alte Regel
   und die neue geben hier verschiedene Antworten, und das ist der
   ganze Zweck der Karte:

     y=0   ##############
     y=1   #............#
     y=2   #.HHHHHH.....#     H = Hochland, Ebene 2
     y=3   #.HHMMHH.....#     M = Mulde, Ebene 1, vom Hochland umschlossen
     y=4   #.HHMMHH.....#
     y=5   #.HHHHHH.....#
     y=6   #............#     alles Übrige: Ebene 1
     y=7   #......GGGG..#     G = Graben, Ebene 0
     y=8   #......GGGG..#
     y=9   ##############

   · **M ist ein Becken**, obwohl es nicht auf Ebene 0 liegt. Die alte
     Regel hätte es übersehen.
   · **G ist ein Becken**, wie bisher.
   · **Das große Feld auf Ebene 1 ist keines**, obwohl es an das
     Hochland grenzt: Es hat mit G einen tieferen Nachbarn, das Wasser
     liefe ab. Eine Regel „irgendein Nachbar liegt höher" wäre hier
     grün und trotzdem falsch.
   · **Das Hochland ist keines**: Es umschließt die Mulde, und die
     liegt tiefer. */
const BREITE_SAAL = 14;
const HOEHE_SAAL = 10;

function baueSaal() {
  const k = macheKarte(BREITE_SAAL, HOEHE_SAAL);
  k.hindernis.fill(HINDERNIS.keins);
  k.ebene.fill(1);
  for (let x = 0; x < BREITE_SAAL; x++) {
    k.setze(x, 0, { hindernis: HINDERNIS.wand });
    k.setze(x, HOEHE_SAAL - 1, { hindernis: HINDERNIS.wand });
  }
  for (let y = 0; y < HOEHE_SAAL; y++) {
    k.setze(0, y, { hindernis: HINDERNIS.wand });
    k.setze(BREITE_SAAL - 1, y, { hindernis: HINDERNIS.wand });
  }
  for (let y = 2; y <= 5; y++) for (let x = 2; x <= 7; x++) k.setze(x, y, { ebene: 2 });
  for (let y = 3; y <= 4; y++) for (let x = 4; x <= 5; x++) k.setze(x, y, { ebene: 1 });
  for (let y = 7; y <= 8; y++) for (let x = 6; x <= 9; x++) k.setze(x, y, { ebene: 0 });
  return k;
}

abschnitt("Was ein Becken ist");

{
  const k = baueSaal();
  const becken = beckenGebiete(k);
  gleich(becken.length, 2, "der Saal hat genau zwei Becken — die Mulde und den Graben");

  const mulde = becken.find((b) => b.boden.includes(k.index(4, 3)));
  const graben = becken.find((b) => b.boden.includes(k.index(6, 7)));
  behaupte(mulde !== undefined,
    "die Mulde auf Ebene 1 ist ein Becken — die alte Regel mit der festen Ebene 0 übersah sie");
  behaupte(graben !== undefined, "der Graben auf Ebene 0 ist eines geblieben");
  gleich(mulde.ebene, 1, "die Mulde trägt ihre eigene Ebene");
  gleich(graben.ebene, 0, "der Graben die seine");
  gleich(mulde.boden.length, 4, "die Mulde hat vier Bodenkacheln");
  gleich(graben.boden.length, 8, "der Graben acht");

  /* Der Gegenprobe halber ausdrücklich: Die große Fläche auf Ebene 1
     grenzt an das Hochland und ist trotzdem kein Becken. */
  const grosseFlaeche = becken.some((b) => b.boden.includes(k.index(1, 1)));
  behaupte(!grosseFlaeche,
    "die große Fläche auf Ebene 1 ist kein Becken — der Graben ist ihr tieferer Nachbar");
  const hochland = becken.some((b) => b.boden.includes(k.index(2, 2)));
  behaupte(!hochland, "und das Hochland auch nicht — es umschließt die tiefere Mulde");

  /* Der Rand: die angrenzenden **höheren** offenen Kacheln, jede genau
     einmal. Eine Randkachel grenzt oft an mehrere Bodenkacheln; stünde
     sie mehrfach in der Liste, zählte Schritt 4 später jeden Stoßplatz
     doppelt. */
  gleich(new Set(mulde.rand).size, mulde.rand.length, "keine Randkachel steht doppelt drin");
  let randFalsch = 0;
  for (const j of mulde.rand) {
    if (k.ebene[j] <= mulde.ebene) randFalsch++;
    if (mulde.boden.includes(j)) randFalsch++;
  }
  gleich(randFalsch, 0, "jede Randkachel der Mulde liegt höher und gehört nicht zum Boden");
  /* Zehn und neun sind nachgezählt, nicht geraten — von Hand über die
     beiden Richtungstabellen aus `gitter.mjs`. Auf dem Quadratraster
     hätte die Mulde acht Randkacheln; auf Versatzzeilen sind es zehn,
     weil die schrägen Nachbarn je nach Zeilenparität anders liegen.
     Genau diese Zahl ginge kaputt, wenn jemand die Nachbarschaft hier
     selbst nachbaute, statt `richtungen(y)` zu fragen. Der Graben hat
     neun, weil seine Südseite an der Kartenwand liegt. */
  gleich(mulde.rand.length, 10, "die Mulde hat zehn Randkacheln");
  gleich(graben.rand.length, 9, "der Graben neun — im Süden liegt die Wand");

  /* Die Reihenfolge ist die des Flutfüllers: aufsteigend nach der
     ersten Bodenkachel. Ohne diese Zusage nummerierten zwei Rechner
     ihre Becken verschieden, und Schritt 4 setzte auf dem einen den
     Abgrund dorthin, wo der andere Wasser hat (Fehlerbuch B2). */
  let steigend = true;
  for (let n = 1; n < becken.length; n++) {
    if (becken[n].boden[0] <= becken[n - 1].boden[0]) steigend = false;
  }
  behaupte(steigend, "die Becken kommen in der Reihenfolge ihrer ersten Bodenkachel");

  const nochmal = beckenGebiete(baueSaal());
  gleich(JSON.stringify(nochmal), JSON.stringify(becken),
    "zweimal gefragt, zweimal buchstäblich dieselbe Antwort");

  /* Eine eingemauerte Kammer hat gar keinen offenen Nachbarn und gilt
     deshalb als Becken — eine Zisterne. Auf einer erzeugten Karte gibt
     es sie nicht (dort ist jede offene Kachel erreichbar); hier steht
     die Entscheidung fest, damit sie nicht eines Tages stillschweigend
     kippt. */
  const zisterne = macheKarte(9, 9);
  zisterne.hindernis.fill(HINDERNIS.wand);
  zisterne.ebene.fill(2);
  for (let y = 3; y <= 5; y++) {
    for (let x = 3; x <= 5; x++) zisterne.setze(x, y, { hindernis: HINDERNIS.keins });
  }
  const eingemauert = beckenGebiete(zisterne);
  gleich(eingemauert.length, 1, "die eingemauerte Kammer zählt als Becken");
  gleich(eingemauert[0].rand.length, 0, "und hat keinen Rand");
}

/* ══════════════════════════════════════════════════════════════════
   2 · Wasser liegt auf mehreren Ebenen
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Wasser auf mehreren Ebenen");

/* Gleiche eingemauerte Zisternen auf allen vier Ebenen: Keine Saat
   entscheidet, welche davon vorkommt. Auch Ebene 3 kann Wasser tragen. */
const stufen = macheKarte(EBENEN * 5 + 2, 7);
stufen.hindernis.fill(HINDERNIS.wand);
const boeden = [];
for (let ebene = 0; ebene < EBENEN; ebene++) {
  const boden = [];
  for (let y = 2; y <= 4; y++) for (let x = 2 + ebene * 5; x <= 4 + ebene * 5; x++) {
    stufen.setze(x, y, { hindernis: HINDERNIS.keins, ebene });
    boden.push(stufen.index(x, y));
  }
  boeden.push(boden);
}
const gesetzt = setzeWasser(stufen, { bauart: BAUART });
gleich(gesetzt.seen, EBENEN, "Vier gleich große Becken werden auf vier Ebenen gefüllt");
for (let ebene = 0; ebene < EBENEN; ebene++) {
  behaupte(boeden[ebene].every((i) => stufen.fluessig[i] === FLUESSIG.wasser),
    `Jedes Feld des kontrollierten Beckens auf Ebene ${ebene} enthält Wasser`);
}

/* Die Grenze wird gegen die echte Bauart geprüft, nicht gegen eine
   auf diese Karte abgestimmte Zahl. Kleine Becken bleiben trocken. */
const klein = macheKarte(12, 6);
klein.hindernis.fill(HINDERNIS.wand);
for (let x = 1; x < BAUART.wasserMindestSee; x++) {
  klein.setze(x, 2, { hindernis: HINDERNIS.keins, ebene: 2 });
}
gleich(setzeWasser(klein, { bauart: BAUART }).felder, 0,
  "Ein Becken knapp unter der Mindestgröße bleibt trocken");

let zweiEbenen = 0, ohneWasser = 0, wasserKacheln = 0;
const verteilung = new Array(EBENEN + 1).fill(0);
const jeEbene = new Array(EBENEN).fill(0);

for (let saat = 1; saat <= SAATEN; saat++) {
  const karte = baueLandschaft({ saat, breite: BREITE, hoehe: HOEHE, spielerZahl: 2 });
  const hier = new Set();
  const beckenBoden = new Set(beckenGebiete(karte).flatMap((b) => b.boden));
  let ausserhalb = 0;
  for (let i = 0; i < karte.anzahl; i++) {
    if (karte.fluessig[i] !== FLUESSIG.wasser) continue;
    if (!karte.blocktBewegung(i % karte.breite, Math.floor(i / karte.breite))
      && !beckenBoden.has(i)) ausserhalb++;
    wasserKacheln++;
    jeEbene[karte.ebene[i]]++;
    hier.add(karte.ebene[i]);
  }
  verteilung[hier.size]++;
  if (hier.size >= 2) zweiEbenen++;
  if (hier.size === 0) ohneWasser++;
  gleich(ausserhalb, 0, `Saat ${saat}: Jedes begehbare Wasserfeld liegt in einem echten Becken`);
}

console.log(`      · ${SAATEN} Karten ${BREITE} × ${HOEHE}:` +
  ` ${zweiEbenen} mit Wasser auf mindestens zwei Ebenen, ${ohneWasser} trocken,` +
  ` ${(wasserKacheln / SAATEN).toFixed(1)} Wasserkacheln je Karte`);
console.log(`      · Karten nach Zahl der nassen Ebenen (0…${EBENEN}): ` +
  verteilung.join(" / ") + `  ·  Wasserkacheln je Ebene: ` + jeEbene.join(" / "));

ende("Becken");
