/* [Aufgabe: Prüfwesen] Der Abgrund ist ein Loch und keine Wand —
   geprüft an einer von Hand gebauten Karte mit Wänden und Höhen.

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

   ── Was hier bewusst nicht geprüft wird ────────────────────────────

   · **Wer Abgründe auf die Karte setzt** und wie viele. Das entsteht
     in `spiel/landschaft.mjs` und ist ein eigener Schritt; hier gibt es
     nur die Feldart, und geprüft wird sie an einer Karte von Hand.
   · **Was mit einer hineingestoßenen Figur geschieht.** Dass ein
     Abgrundfeld die Ebene seiner Sohle trägt, steht als Begründung in
     `spiel/hoehen.mjs`; die Regel „Sturzschaden, eine Ebene tiefer,
     sonst tot" braucht Figuren, und Figuren kennt dieses Modul nicht.
     `sturzTiefe` und `sturzSchaden` selbst prüft `pruefe-hoehen.mjs`.
   · **Wie der Abgrund aussieht.** Dass er kein Sprite ist, sondern eine
     eigene dunkle Fläche, prüft `pruefe-zeichnen.mjs` über die Länge
     von `DING_NAMEN`.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/helfer.mjs` (das Prüfgerüst), `spiel/gitter.mjs` (der
   geprüfte Wert `HINDERNIS.abgrund`, die drei Mengen und `istAbgrund`),
   `spiel/hoehen.mjs` (`begehbar`, `blocktSichtlinie`), `spiel/sicht.mjs`
   (`sichtlinie`), `spiel/wegfindung.mjs` (`wegSuche`,
   `erreichbareFelder`) und `werkzeuge/pruefe-alles.mjs`, das diese
   Datei als eigenen Prozess startet und nur ihren Rückgabewert liest. */

import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";
import {
  macheKarte, HINDERNIS, BLOCKT_BEWEGUNG, BLOCKT_SICHT,
  GIBT_DECKUNG, ZERSTOERBAR, richtungen
} from "../spiel/gitter.mjs";
import { begehbar } from "../spiel/hoehen.mjs";
import { sichtlinie } from "../spiel/sicht.mjs";
import { wegSuche, erreichbareFelder } from "../spiel/wegfindung.mjs";

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

ende("Der Abgrund");
