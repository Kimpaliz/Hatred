/* [Aufgabe: Prüfwesen] Der Abgrund ist ein Loch und keine Wand, man
   wird hineingestoßen und stürzt — geprüft an von Hand gebauten Karten
   und an dreißig erzeugten.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   `HINDERNIS.abgrund` ist der erste Wert dieses Spiels, der Bewegung
   blockt und **weder** die Sicht nimmt **noch** Deckung gibt. Die
   sieben Werte, die bisher Bewegung ohne Sicht blockten — Fass, Kiste,
   Altar, Gitter, Fackelsockel, Sarg, Truhe —, stehen alle sieben
   zugleich in `GIBT_DECKUNG`. Wer das nicht weiß, räumt beim nächsten
   Umbau „auf" und schiebt den Abgrund in eine der beiden anderen
   Mengen, weil dort ja alles andere auch steht, was aufhält. Von
   diesem Augenblick an ist jeder Abgrund entweder eine unsichtbare
   Nebelwand quer durch den Saal oder eine Brustwehr über einem Loch —
   und niemandem fällt es auf, weil nichts abstürzt und keine
   Prüfung anschlägt.

   Geprüft wird deshalb ausdrücklich der Fall, der ohne diese Arbeit
   falsch wäre, nicht der, der ohnehin gewinnt:

   · **Über den Abgrund hinweg ist Sicht frei — durch eine Wand an
     genau derselben Stelle nicht.** Zwei Karten wären hier zwei
     Aussagen; deshalb dasselbe Feld derselben Karte, einmal so und
     einmal so. Der Vergleich ist der Beweis, nicht die Einzelmessung.
   · **Auch von einem Podest aus.** Ein Abgrund liegt tiefer als seine
     Ränder, und `blocktSichtlinie` fragt nach dem Höheren von Auge und
     Ziel — steht beides auf Ebene 3, könnte eine falsche Rechnung das
     Loch trotzdem für eine Kante halten.
   · **Ein Abgrundfeld ist nie begehbar**, aus allen sechs Richtungen
     und auf beiden Zeilenparitäten. Nur eine Richtung zu messen ist
     genau der Fehler, mit dem das Sechseckraster in diesem Projekt
     schon einmal ein halbes Jahr lang falsch rechnete.
   · **Die Wegfindung betritt nie ein Abgrundfeld** — weder als
     einzigen Durchgang (dann gibt es keinen Weg) noch als
     Abkürzung neben einem längeren offenen Weg (dann geht sie außen
     herum). Die Sohle des Prüf-Abgrunds liegt dabei nur **eine** Ebene
     tiefer, und die Suche läuft zusätzlich mit `stuerzeErlaubt`: Sonst
     bestünde die Prüfung auch dann, wenn der Abgrund gar nicht in
     `BLOCKT_BEWEGUNG` stünde — die Sturzsperre der Wegfindung allein
     hielte die Figur schon auf, und wir hätten das Falsche gemessen.

   Seit Vorgang #8, Schritt 4 (07.09.2026) kommen die drei Fragen dazu,
   die aus der Feldart erst ein Spielmittel machen:

   · **Der Stoß hinein.** `stossZiel` sagt am Loch `null` — es fragt
     `blocktBewegung`, und das ist richtig so. Wer den Sturz will, muss
     ausdrücklich danach fragen (`abgrundHinter`, `abgrundSturz`).
     Geprüft wird deshalb **beides an derselben Lage**: dass die Aktion
     erlaubt ist *und* dass danach wirklich etwas geschehen ist. Der
     Auftrag benennt genau diese Falle: „Wird die Frage in pruefeSchub
     gestellt, aber nicht in schiebe, entsteht eine Aktion, die erlaubt
     ist und nichts tut."
   · **Beide Ausgänge des Sturzes.** Mit Grund unter dem Loch: Schaden
     und eine Ebene tiefer. Ohne: tot. Beide an Karten, die sich in
     **einer** Kachel unterscheiden.
   · **Die erzeugte Landschaft**, gezählt über dreißig Saaten — Janniks
     Abnahme (a) und (d).

   ── Was hier bewusst nicht geprüft wird ────────────────────────────

   · **`sturzTiefe` und `sturzSchaden` selbst.** Die rechnet
     `pruefe-hoehen.mjs` nach; hier wird nur gefragt, ob der Abgrund
     sie benutzt.
   · **Wie der Abgrund aussieht.** Dass er kein Sprite ist, sondern eine
     eigene dunkle Fläche, prüft `pruefe-zeichnen.mjs` über die Länge
     von `DING_NAMEN`.
   · **Ob die Gegner-KI Abgründe zu nutzen weiß.** `schubGewinn`
     (`spiel/gegner-ki.mjs`) fragt `stossZiel` und bewertet einen Stoß
     ins Loch deshalb mit 0 — die Brut sieht den Abgrund als Wand. Das
     ist ein offener Punkt für den Auftraggeber, keine Zusage dieser
     Datei.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `tests/helfer.mjs` (das Prüfgerüst), `spiel/gitter.mjs` (der
   geprüfte Wert `HINDERNIS.abgrund`, die drei Mengen und `istAbgrund`),
   `spiel/hoehen.mjs` (`begehbar`, `blocktSichtlinie`, `stossZiel`,
   `abgrundHinter`, `abgrundSturz`), `spiel/sicht.mjs` (`sichtlinie`),
   `spiel/wegfindung.mjs` (`wegSuche`, `erreichbareFelder`),
   `spiel/aktionen.mjs` (`pruefeAktion`, `wendeAn`), `spiel/kampf.mjs`
   (`fuehreAngriffAus` mit dem Kriegshammer), `spiel/landschaft.mjs`
   (`baueLandschaft`, `grabeAbgruende`) und `werkzeuge/pruefe-alles.mjs`,
   das diese Datei als eigenen Prozess startet und nur ihren
   Rückgabewert liest. */

import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";
import {
  macheKarte, HINDERNIS, BLOCKT_BEWEGUNG, BLOCKT_SICHT,
  GIBT_DECKUNG, ZERSTOERBAR, FLUESSIG, EBENEN, richtungen
} from "../spiel/gitter.mjs";
import {
  begehbar, stossZiel, abgrundHinter, abgrundSturz,
  STURZ_AB_STUFEN, STURZ_SCHADEN_JE_STUFE
} from "../spiel/hoehen.mjs";
import { sichtlinie } from "../spiel/sicht.mjs";
import { wegSuche, erreichbareFelder } from "../spiel/wegfindung.mjs";
import { macheWesen, wesenBei } from "../spiel/wesen.mjs";
import { AKTION, pruefeAktion, wendeAn } from "../spiel/aktionen.mjs";
import { fuehreAngriffAus } from "../spiel/kampf.mjs";
import { waffe } from "../spiel/katalog/waffen.mjs";
import { baueLandschaft, beidseitigErreichbar } from "../spiel/landschaft.mjs";

const BREITE = 16;
const HOEHE = 12;

/* Der Saal, auf dem alles spielt. Eine Karte für alle Fragen, weil
   „über den Abgrund sieht man" und „durch die Wand nicht" sonst zwei
   verschiedene Karten wären und der Vergleich nichts bewiese.

     y=0   ################
     y=1   #..............#
     y=2   #.........PPPP.#     P = Podest, Ebene 3
     y=3   #.........PPPP.#
     y=4   #.........PPPP.#
     y=5   #..A...B......P#     A = Auge, B = die geprüfte Stelle
     y=6   #..............#
     y=7   #####.####.#####     zwei Lücken: x=5 und x=10
     y=8   #..............#
     y=9   #..............#
     y=10  #..............#
     y=11  ################

   Alles außer dem Podest liegt auf Ebene 1 — so ist ein Feld auf
   Ebene 0 immer eine Sohle und nie einfach die Grundebene. */
function baueSaal() {
  const k = macheKarte(BREITE, HOEHE);
  for (let x = 0; x < BREITE; x++) {
    k.setze(x, 0, { hindernis: HINDERNIS.wand });
    k.setze(x, HOEHE - 1, { hindernis: HINDERNIS.wand });
  }
  for (let y = 0; y < HOEHE; y++) {
    k.setze(0, y, { hindernis: HINDERNIS.wand });
    k.setze(BREITE - 1, y, { hindernis: HINDERNIS.wand });
  }
  for (let y = 2; y <= 4; y++) {
    for (let x = 10; x <= 13; x++) k.setze(x, y, { ebene: 3 });
  }
  return k;
}

/* Die Trennwand in Zeile 7. `luecken` sind die Felder, die offen
   bleiben — alles andere wird Wand. */
function trennwand(k, luecken) {
  for (let x = 1; x < BREITE - 1; x++) {
    if (luecken.includes(x)) continue;
    k.setze(x, 7, { hindernis: HINDERNIS.wand });
  }
}

/* ── 1 · Der Wert selbst ────────────────────────────────────────────*/

abschnitt("1 · Der Wert");
{
  gleich(HINDERNIS.abgrund, 11, "der Abgrund ist die 11 — unten angehängt");
  gleich(Object.keys(HINDERNIS).length, 12, "zwölf Hindernisarten");
  /* Die Zahl steht **unter** allen bisherigen: Gespeicherte Läufe
     tragen die Zahlen, nicht die Namen. Rutschte der Abgrund
     dazwischen, hieße jeder alte Sarg plötzlich anders. */
  const hoechster = Math.max(...Object.values(HINDERNIS));
  gleich(hoechster, HINDERNIS.abgrund, "kein Wert liegt über dem Abgrund");

  behaupte(BLOCKT_BEWEGUNG.has(HINDERNIS.abgrund),
    "der Abgrund blockt Bewegung");
  behaupte(!BLOCKT_SICHT.has(HINDERNIS.abgrund),
    "der Abgrund blockt NICHT die Sicht — man schaut über ein Loch hinweg");
  behaupte(!GIBT_DECKUNG.has(HINDERNIS.abgrund),
    "der Abgrund gibt keine Deckung — vor einem Loch duckt sich niemand");
  behaupte(!ZERSTOERBAR.has(HINDERNIS.abgrund),
    "der Abgrund ist nicht zerstörbar — ein Loch zerschlägt man nicht");

  /* Die Aussage, die dieses ganze Modul trägt — und zwar als
     **gemessene** Menge, nicht als Satz in einem Kommentar: Was
     bisher aufhielt, war immer auch etwas, wohinter man sich duckt
     oder das die Sicht nimmt. Genau ein Wert bricht das auf. */
  const nurBewegung = [...BLOCKT_BEWEGUNG].filter((w) => !BLOCKT_SICHT.has(w));
  behaupte(nurBewegung.includes(HINDERNIS.abgrund),
    "der Abgrund blockt Bewegung, ohne die Sicht zu blocken");
  const wederNoch = nurBewegung.filter((w) => !GIBT_DECKUNG.has(w));
  gleich(wederNoch.length, 1,
    "genau ein Hindernis hält auf, ohne Sicht zu nehmen oder Deckung zu geben");
  gleich(wederNoch[0], HINDERNIS.abgrund, "und das ist der Abgrund");
}

/* ── 2 · `istAbgrund` beantwortet die Frage für alle ────────────────*/

abschnitt("2 · istAbgrund");
{
  const k = baueSaal();
  k.setze(6, 5, { hindernis: HINDERNIS.abgrund, ebene: 0 });

  behaupte(k.istAbgrund(6, 5), "auf dem Abgrundfeld ist ein Abgrund");
  behaupte(!k.istAbgrund(5, 5), "auf dem freien Boden daneben nicht");
  behaupte(!k.istAbgrund(1, 0), "eine Wand ist kein Abgrund");
  /* Außerhalb gilt als **Wand**, nicht als Loch: Wer über den
     Kartenrand gestoßen wird, steht an, er fällt nicht. */
  behaupte(!k.istAbgrund(-1, 5), "außerhalb der Karte ist kein Abgrund");
  behaupte(!k.istAbgrund(BREITE, 5), "auch jenseits der Ostkante nicht");
  behaupte(k.blocktBewegung(-1, 5), "außerhalb blockt weiterhin die Bewegung");
}

/* ── 3 · Sicht: über das Loch hinweg, durch die Wand nicht ──────────
   Dasselbe Feld (6,5) derselben Karte, dreimal verschieden belegt.
   Auge (3,5) und Ziel (9,5) liegen in derselben Zeile; die Linie läuft
   waagerecht und trifft (6,5) mit Sicherheit. */

abschnitt("3 · Sicht über den Abgrund");
{
  const auge = { x: 3, y: 5 }, ziel = { x: 9, y: 5 };

  const offen = baueSaal();
  behaupte(sichtlinie(offen, auge.x, auge.y, ziel.x, ziel.y),
    "ohne Hindernis ist die Linie frei — sonst prüfte alles Weitere nichts");

  const loch = baueSaal();
  loch.setze(6, 5, { hindernis: HINDERNIS.abgrund, ebene: 0 });
  behaupte(sichtlinie(loch, auge.x, auge.y, ziel.x, ziel.y),
    "über den Abgrund hinweg ist die Sicht frei");
  behaupte(sichtlinie(loch, ziel.x, ziel.y, auge.x, auge.y),
    "und in der Gegenrichtung ebenso");

  const mauer = baueSaal();
  mauer.setze(6, 5, { hindernis: HINDERNIS.wand });
  behaupte(!sichtlinie(mauer, auge.x, auge.y, ziel.x, ziel.y),
    "durch eine Wand an derselben Stelle nicht");

  /* Die Gegenprobe zur Höhe: Ein Podest auf demselben Feld blockt —
     also trägt diese Karte wirklich Höhen, und der freie Blick über
     den Abgrund ist keine Karte ohne Ebenen. */
  const podest = baueSaal();
  podest.setze(6, 5, { ebene: 3 });
  behaupte(!sichtlinie(podest, auge.x, auge.y, ziel.x, ziel.y),
    "ein Podest an derselben Stelle blockt — die Höhen wirken auf dieser Karte");
}

/* ── 4 · Sicht von oben über eine tiefe Sohle ───────────────────────
   `blocktSichtlinie` vergleicht mit dem Höheren von Auge und Ziel.
   Stehen beide auf Ebene 3 und liegt die Sohle auf 0, sind das drei
   Ebenen Unterschied — die Stelle, an der eine falsche Rechnung das
   Loch doch noch für eine Kante hält. */

abschnitt("4 · Sicht vom Podest");
{
  const k = baueSaal();
  k.setze(5, 5, { ebene: 3 });
  k.setze(7, 5, { ebene: 3 });
  k.setze(6, 5, { hindernis: HINDERNIS.abgrund, ebene: 0 });
  gleich(k.ebeneBei(6, 5), 0, "die Sohle liegt auf Ebene 0");
  behaupte(sichtlinie(k, 5, 5, 7, 5),
    "von Podest zu Podest über die Sohle hinweg ist die Sicht frei");

  const m = baueSaal();
  m.setze(5, 5, { ebene: 3 });
  m.setze(7, 5, { ebene: 3 });
  m.setze(6, 5, { hindernis: HINDERNIS.wand });
  behaupte(!sichtlinie(m, 5, 5, 7, 5),
    "eine Wand blockt auch vom Podest aus");
}

/* ── 5 · Nie begehbar, aus keiner der sechs Richtungen ──────────────
   Die Sohle liegt hier nur **eine** Ebene tiefer. Das ist Absicht:
   Zwei Ebenen tiefer wäre der Schritt ein Sturz, und ein Sturz ist
   ohnehin kein Weg — die Prüfung bestünde dann auch ohne den Eintrag
   in `BLOCKT_BEWEGUNG` und maße das Falsche. Ein Schritt eine Ebene
   hinab ist erlaubt; ihn hält allein der Eintrag auf. */

abschnitt("5 · Nie begehbar");
{
  let geprueft = 0;
  /* Beide Zeilenparitäten, weil die sechs Nachbarn beim Sechseck von
     der Zeile abhängen — eine Prüfung auf nur einer Parität übersieht
     die halbe Geometrie. */
  for (const y of [5, 6]) {
    for (const r of richtungen(y)) {
      const k = baueSaal();
      const von = { x: 6 + r.dx, y: y + r.dy };
      k.setze(6, y, { hindernis: HINDERNIS.abgrund, ebene: 0 });
      /* Der Nachbar bekommt Ebene 1 — der Schritt hinab wäre erlaubt,
         wenn nicht der Abgrund selbst ihn verböte. */
      k.setze(von.x, von.y, { ebene: 1, hindernis: HINDERNIS.keins });
      behaupte(!begehbar(k, von.x, von.y, 6, y),
        `aus ${r.name} (Zeile ${y}) tritt niemand in den Abgrund`);

      /* Die Gegenprobe auf demselben Feld: Ohne den Abgrund ginge es. */
      const frei = baueSaal();
      frei.setze(6, y, { ebene: 0, hindernis: HINDERNIS.keins });
      frei.setze(von.x, von.y, { ebene: 1, hindernis: HINDERNIS.keins });
      behaupte(begehbar(frei, von.x, von.y, 6, y),
        `ohne den Abgrund wäre der Schritt aus ${r.name} (Zeile ${y}) erlaubt`);
      geprueft++;
    }
  }
  gleich(geprueft, 12, "sechs Richtungen auf zwei Zeilenparitäten");
}

/* ── 6 · Die Wegfindung betritt kein Abgrundfeld ────────────────────*/

abschnitt("6 · Wegfindung");
{
  /* Zwei Vorkehrungen, damit hier wirklich `BLOCKT_BEWEGUNG` geprüft
     wird und nicht etwas anderes:

     · `stuerzeErlaubt` nimmt der Suche ihre eigene Sturzsperre weg.
     · Die Sohle liegt in **diesem** Abschnitt auf derselben Ebene wie
       der Rand. Als Karte ist das unnatürlich, als Prüfung genau
       richtig: Läge sie tiefer, hielte schon die Höhenregel die Figur
       im Loch fest — aus einer Grube klettert man ohne Rampe nicht
       heraus —, und die Prüfung bestünde auch dann, wenn der Abgrund
       gar nicht in `BLOCKT_BEWEGUNG` stünde. Gemessen wäre dann die
       Rampenregel, nicht der Abgrund.

     Dass die Sohle im Spiel tiefer liegt, prüft Abschnitt 4. */
  const ohneSturzsperre = { stuerzeErlaubt: true };
  const oben = { x: 5, y: 6 }, unten = { x: 5, y: 8 };
  const loch = { hindernis: HINDERNIS.abgrund, ebene: 1 };

  /* 6a — die einzige Lücke ist der Abgrund: dann gibt es keinen Weg. */
  const zu = baueSaal();
  trennwand(zu, [5]);
  zu.setze(5, 7, loch);
  gleich(wegSuche(zu, oben, unten, ohneSturzsperre), null,
    "durch die einzige Lücke, in der ein Abgrund liegt, führt kein Weg");

  /* Und die Gegenprobe: Dieselbe Lücke offen, derselbe Aufruf — sonst
     bewiese das `null` oben nur, dass die Karte anderswo zu ist. */
  const auf = baueSaal();
  trennwand(auf, [5]);
  const kurz = wegSuche(auf, oben, unten, ohneSturzsperre);
  behaupte(kurz !== null, "durch die offene Lücke führt ein Weg");
  gleich(kurz.pfad.length, 3, "und zwar über genau ein Zwischenfeld");
  gleich(kurz.pfad[1].x, 5, "das Zwischenfeld ist die Lücke — x");
  gleich(kurz.pfad[1].y, 7, "das Zwischenfeld ist die Lücke — y");

  /* 6b — zwei Lücken, die nähere ist der Abgrund: Der Weg geht außen
     herum und betritt das Loch nicht. Das ist der eigentliche Fall:
     Ein `null` beweist nur eine Sperre, ein Umweg beweist, dass die
     Suche das Feld auch dann nicht anfasst, wenn es lockt. */
  const umweg = baueSaal();
  trennwand(umweg, [5, 10]);
  umweg.setze(5, 7, loch);
  const lang = wegSuche(umweg, oben, unten, ohneSturzsperre);
  behaupte(lang !== null, "es gibt einen Weg über die zweite Lücke");
  behaupte(lang.pfad.length > kurz.pfad.length,
    "und er ist länger als der Weg durch die Lücke, in der jetzt das Loch liegt");
  const durchsLoch = lang.pfad.filter((f) => umweg.istAbgrund(f.x, f.y));
  gleich(durchsLoch.length, 0, "kein Feld des Weges ist ein Abgrund");

  /* Und dieselbe Frage an die zweite Tür der Wegfindung: die Vorschau,
     die dem Spieler zeigt, wohin er käme. Zeigte sie das Loch, wäre das
     eine Lüge an den Spieler — der Zug ginge dorthin nie. */
  const weit = erreichbareFelder(umweg, oben.x, oben.y, 99, ohneSturzsperre);
  behaupte(weit.size > 40,
    `die Vorschau reicht über den halben Saal (${weit.size} Felder)`);
  behaupte(!weit.has(umweg.index(5, 7)),
    "das Abgrundfeld steht nicht unter den erreichbaren Feldern");
  let lochInVorschau = 0;
  for (const eintrag of weit.values()) {
    if (umweg.istAbgrund(eintrag.x, eintrag.y)) lochInVorschau++;
  }
  gleich(lochInVorschau, 0, "kein einziges erreichbares Feld ist ein Abgrund");
}

/* ══════════════════════════════════════════════════════════════════
   7 · Der Stoß in den Abgrund — die Regel
   ══════════════════════════════════════════════════════════════════

   Ein Saal ganz auf Ebene 3 mit einem Loch bei (6,5), dessen Sohle auf
   Ebene 1 liegt. Alles ringsum liegt auf 3; nur (7,5) liegt ebenfalls
   auf 1 und ist damit der einzige Boden, auf dem man aufschlagen kann.

   Warum ganz auf Ebene 3 und nicht wie sonst auf 1: So gibt es genau
   **ein** mögliches Landefeld. Läge der Saal auf Ebene 1 und die Sohle
   auf 0, wären alle sechs Nachbarn des Lochs auf 1 und keiner auf 0 —
   der Sturz wäre immer tödlich, und der lebende Fall bliebe ungeprüft. */

function baueSchacht({ mitBoden = true } = {}) {
  const k = macheKarte(BREITE, HOEHE);
  k.ebene.fill(3);
  for (let x = 0; x < BREITE; x++) {
    k.setze(x, 0, { hindernis: HINDERNIS.wand });
    k.setze(x, HOEHE - 1, { hindernis: HINDERNIS.wand });
  }
  for (let y = 0; y < HOEHE; y++) {
    k.setze(0, y, { hindernis: HINDERNIS.wand });
    k.setze(BREITE - 1, y, { hindernis: HINDERNIS.wand });
  }
  k.setze(6, 5, { hindernis: HINDERNIS.abgrund, ebene: 1 });
  /* Der Boden unten geht weiter — sonst stünde die gelandete Figur auf
     einer einzelnen Kachel, von der sie nirgends hinkäme, und die
     Prüfung „sie kommt wieder heraus" bewiese das Gegenteil dessen,
     was sie behauptet. */
  if (mitBoden) for (const x of [7, 8, 9]) k.setze(x, 5, { ebene: 1 });
  return k;
}

/* Zwei Umwege, damit eine gefallene Behauptung die übrigen nicht
   mitreißt: Ein fehlendes Feld und ein fehlendes Ereignis würden sonst
   mit `Cannot read properties of null` abstürzen, und die Meldungen
   aller weiteren Prüfungen kämen nie zur Anzeige. Dasselbe Muster wie
   `schadenAus` in `tests/pruefe-kampf.mjs`. */
const feld = (f) => f || { x: -1, y: -1 };
const ereignisMit = (liste, art) => liste.find((e) => e.art === art) || {};

abschnitt("7 · Stoß in den Abgrund");
{
  const k = baueSchacht();

  /* Die Ausgangslage, ohne die alles Weitere nichts bewiese:
     `stossZiel` lehnt ab, weil der Abgrund die Bewegung blockt. Gäbe
     es hier ein Feld zurück, wäre der ganze zweite Weg überflüssig. */
  gleich(stossZiel(k, 4, 5, 5, 5), null,
    "der gewöhnliche Stoß findet kein Feld — dort ist ein Loch");

  const loch = abgrundHinter(k, 4, 5, 5, 5);
  behaupte(loch !== null, "der Abgrund hinter dem Ziel wird gefunden");
  gleich(feld(loch).x, 6, "und zwar bei x = 6");
  gleich(feld(loch).y, 5, "und y = 5");

  /* Dieselbe Richtungsrechnung wie `stossZiel`: Steht der Angreifer
     zwischen zwei Richtungen, gibt es keinen Stoß — und dann auch
     keinen Sturz. */
  gleich(abgrundHinter(k, 4, 4, 5, 5), null,
    "steht der Angreifer nicht auf der Achse, gibt es auch kein Loch");
  gleich(abgrundHinter(k, 6, 5, 5, 5), null,
    "und in die Gegenrichtung liegt keines");

  const ohne = baueSchacht();
  ohne.setze(6, 5, { hindernis: HINDERNIS.keins, ebene: 3 });
  gleich(abgrundHinter(ohne, 4, 5, 5, 5), null,
    "ohne Loch an derselben Stelle gibt es nichts zu finden");

  /* Der Sturz selbst. Rand 3, Sohle 1 — zwei Stufen, also 3 Schaden
     (`sturzSchaden`: die erste Stufe ist frei). */
  const sturz = abgrundSturz(k, 6, 5, k.ebeneBei(5, 5));
  gleich(sturz.sohle, 1, "die Sohle liegt auf Ebene 1");
  behaupte(sturz.ziel !== null, "es gibt ein Landefeld");
  const boden = feld(sturz.ziel);
  gleich(boden.x, 7, "das Landefeld liegt bei x = 7");
  gleich(boden.y, 5, "und y = 5");
  gleich(k.ebeneBei(boden.x, boden.y), 1, "das Landefeld liegt auf der Sohlenebene");
  behaupte(!k.blocktBewegung(boden.x, boden.y),
    "und es ist begehbar — sonst käme die Figur nie wieder heraus");
  gleich(sturz.stufen, 2, "der Sturz geht über zwei Stufen");
  gleich(sturz.schaden, STURZ_SCHADEN_JE_STUFE, "und kostet 3 Lebenspunkte");
  gleich(sturz.toedlich, false, "er ist nicht tödlich");

  /* Und die Probe darauf, dass die Wegfindung von dort wieder
     wegkommt: Genau das war der Grund, die Sohle nicht auf die
     Abgrundkachel selbst zu legen. */
  const raus = erreichbareFelder(k, boden.x, boden.y, 99, {});
  behaupte(raus.size > 1,
    `vom Landefeld aus geht es weiter (${raus.size} erreichbare Felder)`);

  const tief = abgrundSturz(k, 6, 5, 3);
  gleich(tief.stufen, 2, "von Ebene 3 aus sind es zwei Stufen");
  const flach = abgrundSturz(k, 6, 5, 2);
  gleich(flach.stufen, 0, "von Ebene 2 aus ist es kein Sturz, sondern ein Schritt");
  gleich(flach.schaden, 0, "und kostet nichts");

  gleich(abgrundSturz(k, 5, 5, 3), null, "auf festem Boden gibt es keinen Sturz");
}

/* ── 7b · Ohne Grund ist der Sturz tödlich ─────────────────────────*/

abschnitt("7b · Der bodenlose Schacht");
{
  const k = baueSchacht({ mitBoden: false });
  const sturz = abgrundSturz(k, 6, 5, 3);
  gleich(sturz.sohle, 1, "die Sohle liegt weiterhin auf Ebene 1");
  gleich(sturz.ziel, null, "aber es gibt kein Landefeld");
  gleich(sturz.toedlich, true, "also ist der Sturz tödlich");

  /* Der Unterschied zur lebenden Fassung ist **eine** Kachel — sonst
     bewiese der Vergleich nur, dass zwei verschiedene Karten
     verschieden antworten. */
  const mit = baueSchacht();
  gleich(mit.ebeneBei(7, 5), 1, "in der lebenden Fassung liegt (7,5) auf Ebene 1");
  gleich(k.ebeneBei(7, 5), 3, "in der tödlichen auf Ebene 3");
  gleich(abgrundSturz(mit, 6, 5, 3).toedlich, false, "dort überlebt man");
}

/* ══════════════════════════════════════════════════════════════════
   8 · Der Stoß als Aktion — `wendeAn` schiebt wirklich hinein
   ══════════════════════════════════════════════════════════════════

   Die Falle, gegen die dieser Abschnitt steht, steht im Auftrag zu
   Vorgang #8 wörtlich: *„Wird die Frage in pruefeSchub gestellt, aber
   nicht in schiebe, entsteht eine Aktion, die erlaubt ist und nichts
   tut."* Genau deshalb wird hier beides an derselben Lage geprüft —
   erst `pruefeAktion` (darf ich?), dann `wendeAn` (ist danach etwas
   geschehen?). Eine Prüfung, die nur `pruefeAktion` fragt, wäre bei
   der halben Arbeit grün. */

let naechsteId = 1;
function probe(zusatz = {}, stelle = {}) {
  return macheWesen({
    schluessel: "probe", name: "Probe", lpMax: 30, apMax: 6, flinkheit: 0,
    ruestung: 0, sicht: 8, waffe: "rostdolch", faehigkeiten: [], ...zusatz
  }, { id: naechsteId++, seite: "jaeger", x: 2, y: 2, ...stelle });
}

function lageMit(karte, wesen) {
  return {
    saat: 1, tiefe: 1, karte, zufall: { zahl: () => 0, ganz: (von) => von }, wesen,
    nachId: new Map(wesen.map((w) => [w.id, w])),
    runde: 1, ordnung: wesen.map((w) => w.id), amZug: 0,
    seiteDran: "jaeger", spieler: [], vorbei: null, protokoll: []
  };
}

const arten = (ereignisse) => ereignisse.map((e) => e.art);

/* `wendeAn` **wirft**, wenn die Aktion abgelehnt wird. Ein Wurf mitten
   im Lauf beendet den Prozess, bevor `ende()` auch nur eine Meldung
   ausgibt — eine rote Prüfung sähe dann aus wie ein Absturz und sagte
   nicht, was falsch ist. Deshalb erst fragen, dann anwenden. */
function wendeAnWennErlaubt(zustand, aktion) {
  return pruefeAktion(zustand, aktion) === null ? wendeAn(zustand, aktion) : [];
}

abschnitt("8 · Der Stoß als Aktion");
{
  const k = baueSchacht();
  const stosser = probe({}, { x: 4, y: 5 });
  const opfer = probe({}, { x: 5, y: 5, seite: "brut" });
  const zustand = lageMit(k, [stosser, opfer]);
  const aktion = { typ: AKTION.stoss, wer: stosser.id, ziel: opfer.id };

  gleich(pruefeAktion(zustand, aktion), null,
    "der Stoß in den Abgrund ist erlaubt");

  const vorher = opfer.lp;
  const ereignisse = wendeAnWennErlaubt(zustand, aktion);
  const namen = arten(ereignisse);
  behaupte(namen.includes("gestossen"), `gestoßen wird wirklich: ${namen.join(", ")}`);
  behaupte(namen.includes("gestuerzt"), "und gestürzt auch");
  gleich(opfer.x, 7, "das Opfer steht danach auf dem Landefeld — x");
  gleich(opfer.y, 5, "— y");
  gleich(opfer.lp, vorher - STURZ_SCHADEN_JE_STUFE, "und hat 3 Lebenspunkte weniger");
  behaupte(opfer.lebt, "es lebt noch");
  gleich(opfer.ap, 0, "seine Aktionspunkte sind hin — ein Sturz beendet den Zug");

  const gestuerzt = ereignisMit(ereignisse, "gestuerzt");
  gleich(gestuerzt.stufen, 2, "das Ereignis nennt zwei Stufen");
  gleich(gestuerzt.abgrund, true, "und sagt, dass es ein Abgrund war");
  gleich(gestuerzt.toedlich, false, "und dass es nicht tödlich war");
}

/* ── 8b · Ohne Grund stirbt das Opfer ──────────────────────────────*/

abschnitt("8b · Der Stoß in den bodenlosen Schacht");
{
  const k = baueSchacht({ mitBoden: false });
  const stosser = probe({}, { x: 4, y: 5 });
  const opfer = probe({}, { x: 5, y: 5, seite: "brut" });
  const zustand = lageMit(k, [stosser, opfer]);
  const aktion = { typ: AKTION.stoss, wer: stosser.id, ziel: opfer.id };

  gleich(pruefeAktion(zustand, aktion), null, "auch dieser Stoß ist erlaubt");
  const namen = arten(wendeAnWennErlaubt(zustand, aktion));
  behaupte(namen.includes("gestorben"), `das Opfer stirbt: ${namen.join(", ")}`);
  gleich(opfer.lebt, false, "es lebt nicht mehr");
  gleich(opfer.lp, 0, "und hat keine Lebenspunkte mehr");
  gleich(opfer.x, 6, "es liegt im Loch — x");
  gleich(opfer.y, 5, "— y");
  gleich(wesenBei([stosser, opfer], 6, 5), undefined,
    "und sperrt das Feld nicht: `wesenBei` zählt nur Lebende");
}

/* ── 8c · Auf dem Landefeld steht schon jemand ─────────────────────*/

abschnitt("8c · Das Landefeld ist besetzt");
{
  const k = baueSchacht();
  const stosser = probe({}, { x: 4, y: 5 });
  const opfer = probe({}, { x: 5, y: 5, seite: "brut" });
  const unten = probe({}, { x: 7, y: 5, seite: "brut" });
  const zustand = lageMit(k, [stosser, opfer, unten]);
  const grund = pruefeAktion(zustand, { typ: AKTION.stoss, wer: stosser.id, ziel: opfer.id });
  behaupte(grund !== null, `der Stoß wird abgelehnt: „${grund}"`);
  gleich(opfer.x, 5, "und das Opfer steht noch, wo es stand");
}

/* ══════════════════════════════════════════════════════════════════
   9 · Der Kriegshammer stößt ebenfalls hinein
   ══════════════════════════════════════════════════════════════════

   `spiel/kampf.mjs` hat seinen eigenen Stoß (`stossFolgen`) — die
   Waffenbesonderheit `stoesst`. Er ruft dieselbe Regel und muss
   dieselbe Antwort geben; stünde die zweite Frage nur in
   `spiel/aktionen.mjs`, ginge der Hammer über dem Loch ins Leere. */

abschnitt("9 · Der Kriegshammer");
{
  const k = baueSchacht();
  const held = probe({ waffe: "kriegshammer", lpMax: 40 }, { x: 4, y: 5 });
  const opfer = probe({ lpMax: 200 }, { x: 5, y: 5, seite: "brut" });
  const zustand = lageMit(k, [held, opfer]);
  /* Ein Strom, der immer trifft und den kleinsten Schaden würfelt:
     Geprüft wird der Stoß, nicht der Schadenswurf. */
  zustand.zufall = { zahl: () => 0, ganz: (von) => von };

  const vorher = opfer.lp;
  const ereignisse = fuehreAngriffAus(zustand, held, opfer, waffe("kriegshammer"));
  const namen = arten(ereignisse);
  behaupte(namen.includes("gestossen"), `der Hammer stößt: ${namen.join(", ")}`);
  behaupte(namen.includes("gestuerzt"), "und das Opfer stürzt");
  gleich(opfer.x, 7, "es liegt danach auf dem Landefeld — x");
  gleich(opfer.y, 5, "— y");
  behaupte(opfer.lp < vorher - STURZ_SCHADEN_JE_STUFE,
    `es nimmt Hammer- **und** Sturzschaden (${vorher} → ${opfer.lp})`);
  const gestuerzt = ereignisMit(ereignisse, "gestuerzt");
  gleich(gestuerzt.abgrund, true, "auch hier steht am Ereignis, dass es ein Abgrund war");
}

/* ══════════════════════════════════════════════════════════════════
   10 · Die erzeugte Landschaft — Janniks Abnahme, gezählt
   ══════════════════════════════════════════════════════════════════

   Bis hierher stand jede Karte von Hand. Dieser Abschnitt fragt die
   erzeugten: Gibt es Abgründe überhaupt, liegen sie auf verschiedenen
   Ebenen, und ist die Karte danach noch ganz?

   ── Warum eine Schwelle und nicht „jede Karte" ─────────────────────

   Dieselbe Begründung wie beim Wasser in `pruefe-becken.mjs`: Ob eine
   Karte hoch genug gelegenes Gelände auf **zwei** verschiedenen Ebenen
   hat, entscheidet die Höhlenform, nicht diese Regel. Gemessen über
   dieselben 30 Saaten haben 27 Karten offene Kacheln auf Ebene 2
   **und** 3; nur dort können Löcher auf zwei verschiedenen
   Sohlenebenen entstehen. Die Schwellen liegen deshalb unter dem
   Gemessenen, aber weit über dem, was die Karte ohne diese Arbeit
   liefert — nämlich 0. */

const LAND_SAATEN = 30;
const LAND_BREITE = 44;
const LAND_HOEHE = 32;
/* Gemessen: 29 von 30. Die Schwelle lässt der Streuung zwei Karten
   Luft und liegt trotzdem bei 90 %. Ohne diese Arbeit wären es 0. */
const MIND_MIT_ABGRUND = 27;
/* Gemessen: 22 von 30, Obergrenze 27 (siehe oben). */
const MIND_ZWEI_EBENEN = 20;
/* Gemessen: 16 von 30 — das ist die strengste Lesart von Janniks
   Abnahme (a): dieselbe Ebene trägt ein Becken **und** einen Abgrund,
   und das auf mindestens zwei Ebenen. Warum nicht mehr: Ein Abgrund
   trägt die Ebene seiner Sohle, und eine Sohle liegt
   `STURZ_AB_STUFEN` unter ihrem Rand — auf vier Ebenen sind das nur
   die Sohlen 0 und 1. Wasser wiederum steht auf 0, 1 und 2. Die
   Schnittmenge ist damit von vornherein zwei Ebenen breit, und die
   Karte muss beide bedienen. */
const MIND_BEIDES_ZWEI = 14;

abschnitt("10 · Abgründe auf erzeugten Karten");
{
  let mitAbgrund = 0, zweiEbenen = 0, beidesZwei = 0, beidesEins = 0;
  let loecher = 0, mitLandefeld = 0, sohleFalsch = 0, ohneRand = 0, aufStart = 0;
  let ausgangWeg = 0, sichtGeprueft = 0;
  const jeEbene = new Array(EBENEN).fill(0);

  for (let saat = 1; saat <= LAND_SAATEN; saat++) {
    const karte = baueLandschaft({
      saat, breite: LAND_BREITE, hoehe: LAND_HOEHE, spielerZahl: 2
    });
    const lochEbenen = new Set(), wasserEbenen = new Set();

    for (let y = 0; y < karte.hoehe; y++) {
      for (let x = 0; x < karte.breite; x++) {
        const i = y * karte.breite + x;
        if (karte.fluessig[i] === FLUESSIG.wasser) wasserEbenen.add(karte.ebene[i]);
        if (!karte.istAbgrund(x, y)) continue;
        loecher++;
        lochEbenen.add(karte.ebene[i]);
        jeEbene[karte.ebene[i]]++;

        /* **Kein Sims.** Jede offene Nachbarkachel liegt entweder auf
           der Sohle — das ist der Boden, den das Loch freilegt — oder
           mindestens `STURZ_AB_STUFEN` darüber. Eine Kachel genau eine
           Ebene über der Sohle wäre die Stelle, von der aus ein Stoß in
           den Abgrund keinen Schaden täte und in einem bodenlosen
           Schacht trotzdem tötete. Ohne diese Regel im Kartenbau waren
           es gemessen 184 von 704 Löchern. */
        let hoechster = -1;
        for (const r of richtungen(y)) {
          const nx = x + r.dx, ny = y + r.dy;
          if (karte.blocktBewegung(nx, ny)) continue;
          const hoch = karte.ebeneBei(nx, ny);
          if (hoch > hoechster) hoechster = hoch;
          const ueber = hoch - karte.ebene[i];
          if (ueber > 0 && ueber < STURZ_AB_STUFEN) sohleFalsch++;
        }
        if (hoechster - karte.ebene[i] < STURZ_AB_STUFEN) ohneRand++;
        if (abgrundSturz(karte, x, y, hoechster).ziel) mitLandefeld++;

        for (const start of karte.starts) {
          if (start.x === x && start.y === y) aufStart++;
        }
        if (karte.ausgang.x === x && karte.ausgang.y === y) aufStart++;
      }
    }

    /* (d) Kein Abgrund schneidet den Weg zum Ausgang ab. Gefragt wird
       **beidseitig**: Ein Ausgang, den man erreicht und von dem man
       nicht zurückkommt, ist eine Falle mit Aussicht. */
    const gut = beidseitigErreichbar(karte, karte.starts);
    if (!gut[karte.index(karte.ausgang.x, karte.ausgang.y)]) ausgangWeg++;

    if (lochEbenen.size > 0) mitAbgrund++;
    if (lochEbenen.size >= 2) zweiEbenen++;
    const beides = [...lochEbenen].filter((e) => wasserEbenen.has(e));
    if (beides.length >= 2) beidesZwei++;
    if (beides.length >= 1) beidesEins++;

    /* (c) an einer **erzeugten** Karte: Über ein echtes Loch hinweg
       ist die Sicht frei, durch eine Wand an derselben Stelle nicht.
       Gesucht wird ein Loch mit offenem Boden links und rechts. */
    if (sichtGeprueft === 0) {
      for (let y = 1; y < karte.hoehe - 1 && sichtGeprueft === 0; y++) {
        for (let x = 2; x < karte.breite - 2 && sichtGeprueft === 0; x++) {
          if (!karte.istAbgrund(x, y)) continue;
          if (karte.blocktBewegung(x - 1, y) || karte.blocktBewegung(x + 1, y)) continue;
          behaupte(sichtlinie(karte, x - 1, y, x + 1, y),
            `Saat ${saat}: über den Abgrund bei (${x},${y}) hinweg ist die Sicht frei`);
          const merk = karte.hindernis[y * karte.breite + x];
          karte.hindernis[y * karte.breite + x] = HINDERNIS.wand;
          behaupte(!sichtlinie(karte, x - 1, y, x + 1, y),
            "und eine Wand an genau derselben Stelle blockt sie");
          karte.hindernis[y * karte.breite + x] = merk;
          sichtGeprueft++;
        }
      }
    }
  }

  gleich(sichtGeprueft, 1, "die Sichtprobe lief an einer erzeugten Karte");
  gleich(sohleFalsch, 0,
    `kein einziger der ${loecher} Abgründe hat einen Sims — jede offene` +
    ` Nachbarkachel liegt auf der Sohle oder ${STURZ_AB_STUFEN} Ebenen darüber`);
  /* Ein Loch **ohne** Rand ist keines mit falscher Regel, sondern
     eines, in das niemand mehr hineingestoßen werden kann: Nach dem
     Graben stellt `setzeZier` noch Fässer und Särge, und ein Sarg auf
     der letzten hohen Nachbarkachel nimmt dem Loch seinen Rand. Es
     wird dadurch nicht falsch, nur wirkungslos — deshalb gezählt und
     gemeldet statt verboten. Gemessen: 2 von 516. */
  behaupte(ohneRand * 20 < loecher,
    `${ohneRand} von ${loecher} Abgründen haben nach der Zier keinen hohen Rand mehr`);
  gleich(aufStart, 0, "kein Abgrund liegt auf einem Startfeld oder auf dem Ausgang");
  gleich(ausgangWeg, 0,
    `(d) der Ausgang bleibt auf allen ${LAND_SAATEN} Karten beidseitig erreichbar`);

  behaupte(mitAbgrund >= MIND_MIT_ABGRUND,
    `${mitAbgrund} von ${LAND_SAATEN} Karten tragen einen Abgrund` +
    ` (verlangt: ${MIND_MIT_ABGRUND})`);
  behaupte(zweiEbenen >= MIND_ZWEI_EBENEN,
    `${zweiEbenen} von ${LAND_SAATEN} Karten tragen Abgründe auf mindestens zwei` +
    ` verschiedenen Ebenen (verlangt: ${MIND_ZWEI_EBENEN})`);
  behaupte(beidesZwei >= MIND_BEIDES_ZWEI,
    `(a) ${beidesZwei} von ${LAND_SAATEN} Karten tragen auf mindestens zwei` +
    ` verschiedenen Ebenen je ein Becken UND einen Abgrund` +
    ` (verlangt: ${MIND_BEIDES_ZWEI})`);
  behaupte(mitLandefeld > 0 && mitLandefeld < loecher,
    `${mitLandefeld} von ${loecher} Abgründen haben einen Grund, auf dem man` +
    " aufschlägt — beide Fälle kommen im Spiel vor");

  console.log(`      · ${LAND_SAATEN} Karten ${LAND_BREITE} × ${LAND_HOEHE}:` +
    ` ${loecher} Abgründe (${(loecher / LAND_SAATEN).toFixed(1)} je Karte),` +
    ` davon ${mitLandefeld} mit Grund und ${loecher - mitLandefeld} bodenlos`);
  console.log(`      · Abgründe je Sohlenebene (0…${EBENEN - 1}): ` + jeEbene.join(" / ") +
    `  ·  Karten mit Abgrund ${mitAbgrund}, auf zwei Ebenen ${zweiEbenen},` +
    ` mit Becken und Abgrund auf zwei gleichen Ebenen ${beidesZwei} (auf einer ${beidesEins})`);
}

ende("Der Abgrund");
