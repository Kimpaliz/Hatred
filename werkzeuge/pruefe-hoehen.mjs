/* [Aufgabe: Prüfwesen] Prüft die Höhenregeln aus `spiel/hoehen.mjs` —
   Aufstieg, Sturz, Sicht über Kanten, Deckung, Stoß.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Die Höhenregeln sind die Regeln, die dieses Spiel von einem flachen
   Schachbrett unterscheiden, und zugleich die, die man am leichtesten
   falsch baut. Geprüft wird deshalb ausdrücklich der Fall, der ohne die
   Arbeit **falsch** wäre, nicht der, der ohnehin gewinnt:

   · Aufstieg ohne Rampe — der naive Bau lässt ihn zu.
   · Aufstieg über eine Rampe, die in die **falsche** Richtung zeigt —
     der zweitnaivste Bau fragt nur „liegt da eine Rampe?".
   · Sturz von Ebene 3 auf 1: 3 Schaden, nicht 6. Wer „Schaden je
     Stufe" wörtlich nimmt, verdoppelt hier.
   · Ein Schritt aus der Karte hinaus: Ebene -1 macht daraus rechnerisch
     einen Sturz über zwei Stufen, wenn niemand den Rand abfängt.
   · Sicht von Ebene 3 über eine Ebene-2-Kante hinweg — und von Ebene 1
     aus eben nicht. Wer nur die Augenebene vergleicht statt des
     Höheren von Auge und Ziel, sieht das Plateau nie.
   · Deckung nur in Angreiferrichtung: Ein Fass hinter dem Ziel deckt
     nichts. Wer alle vier Nachbarn absucht, macht jedes Fass zur Burg.

   Dazu die Randfälle (Diagonale, Sprung, Kartenrand) und ein
   Gleichlauf: dieselbe Saat, dieselbe Karte, byteweise dieselben
   Antworten — denn die Höhenregeln entscheiden über jeden Zug, und
   vier Rechner müssen sie gleich entscheiden.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/helfer.mjs` (das Prüfgerüst), `spiel/hoehen.mjs` (das
   Geprüfte), `spiel/gitter.mjs` und `spiel/zufall.mjs` (die Karten für
   den Gleichlauf), `werkzeuge/pruefe-alles.mjs` (startet diese Datei
   als eigenen Prozess und liest den Rückgabewert). */

import { abschnitt, behaupte, gleich, nahe, tiefGleich, ende } from "./helfer.mjs";
import {
  macheKarte, BODEN, FLUESSIG, HINDERNIS, RAMPE,
  abstand, nachbarn, richtungen, gespiegelt
} from "../spiel/gitter.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import {
  GEHEN_KOSTEN, AUFSTIEG_KOSTEN, WASSER_ZUSCHLAG,
  STURZ_AB_STUFEN, STURZ_SCHADEN_JE_STUFE, LAVA_SCHADEN,
  HOEHEN_TREFFER_BONUS, HOEHEN_REICHWEITE_BONUS, DECKUNG_MALUS,
  begehbar, laufKosten, sturzTiefe, sturzSchaden, hoehenVorteil,
  trefferBonus, reichweitenBonus, blocktSichtlinie, hatDeckung,
  rampeZeigtNach, betretenSchaden, stossZiel
} from "../spiel/hoehen.mjs";

/* Eine leere Ebene-1-Karte. Jede Prüfung baut sich ihre eigene, damit
   keine der Vorgängerin etwas hinterlässt. */
const flach = (breite = 12, hoehe = 12) => macheKarte(breite, hoehe);

/* ── Die Preise stehen fest ─────────────────────────────────────── */

abschnitt("Werte");
gleich(GEHEN_KOSTEN, 1, "Gehen kostet 1");
gleich(AUFSTIEG_KOSTEN, 2, "Aufstieg kostet 2");
gleich(WASSER_ZUSCHLAG, 1, "Wasser kostet 1 obendrauf");
gleich(STURZ_SCHADEN_JE_STUFE, 3, "Sturz: 3 Schaden je Stufe");
gleich(LAVA_SCHADEN, 8, "Lava: 8 Schaden");
nahe(HOEHEN_TREFFER_BONUS, 0.12, 1e-12, "Höhenvorteil: 12 Prozent");
nahe(DECKUNG_MALUS, 0.20, 1e-12, "Deckung: 20 Prozent Abzug");

/* ── Der ebene Schritt ──────────────────────────────────────────── */

abschnitt("Ebener Schritt");
{
  const k = flach();
  gleich(begehbar(k, 3, 3, 4, 3), true, "gerader Schritt nach Osten");
  gleich(laufKosten(k, 3, 3, 4, 3), 1, "kostet einen Punkt");

  /* Seit dem 07.09.2026 sind es sechs Richtungen (Vorgang #7). Der
     Begriff „Diagonale" gibt es nicht mehr: Auf ungerader Zeile 3 ist
     (4,4) der Nachbar nach Südost und ein ganz gewöhnlicher Schritt.

     Geprüft wird stattdessen der Fall, der ohne diese Arbeit falsch
     wäre: **Ein Sprung über zwei Felder ist kein Schritt.** Das ist
     die Grenze, die auf jedem Raster gilt und die eine falsche
     Nachbarschaftstabelle sofort aufweicht. */
  gleich(begehbar(k, 3, 3, 4, 4), true, "auf ungerader Zeile ist (4,4) der Nachbar nach Südost");
  gleich(laufKosten(k, 3, 3, 4, 4), 1, "und kostet einen Punkt wie jeder andere Schritt");
  gleich(begehbar(k, 3, 3, 3, 4), true, "und (3,4) ist der Nachbar nach Südwest");

  /* Auf gerader Zeile liegen die schrägen Nachbarn andersherum. Ohne
     diese beiden Zeilen bliebe die Zeilenparität ungeprüft, und eine
     Tabelle für beide Zeilen käme durch. */
  gleich(begehbar(k, 3, 4, 3, 5), true, "auf gerader Zeile ist (3,5) der Nachbar nach Südost");
  gleich(begehbar(k, 3, 4, 2, 5), true, "und (2,5) der Nachbar nach Südwest");
  gleich(begehbar(k, 3, 4, 4, 5), false, "aber (4,5) ist von dort kein Nachbar");

  /* Zwei Felder weit ist auf keinem Raster ein Schritt. */
  gleich(begehbar(k, 3, 3, 5, 3), false, "zwei Felder weit ist kein Schritt");
  gleich(laufKosten(k, 3, 3, 5, 3), null, "und kostet nichts, weil es nicht geht");
  gleich(begehbar(k, 3, 3, 5, 3), false, "zwei Felder auf einmal sind kein Schritt");
  gleich(begehbar(k, 3, 3, 3, 3), false, "stehenbleiben ist kein Schritt");

  gleich(begehbar(k, 0, 0, -1, 0), false, "aus der Karte hinaus geht nicht");
  gleich(laufKosten(k, 0, 0, -1, 0), null, "und kostet nichts");
  gleich(begehbar(k, -1, 0, 0, 0), false, "von außerhalb hinein auch nicht");

  k.setze(4, 3, { hindernis: HINDERNIS.wand });
  gleich(begehbar(k, 3, 3, 4, 3), false, "in eine Wand nicht");
  /* Ein Gitter blockt Bewegung, aber nicht Sicht — es muss trotzdem
     unbegehbar sein, auf jeder Ebene. */
  k.setze(4, 3, { hindernis: HINDERNIS.gitter, ebene: 1 });
  gleich(begehbar(k, 3, 3, 4, 3), false, "in ein Gitter nicht");
  k.setze(4, 3, { ebene: 0 });
  gleich(begehbar(k, 3, 3, 4, 3), false, "in ein Gitter auch eine Ebene tiefer nicht");
  /* Ein Spieß ist bloß Wandzier und blockt nichts. */
  k.setze(4, 3, { hindernis: HINDERNIS.spiess, ebene: 1 });
  gleich(begehbar(k, 3, 3, 4, 3), true, "an einem Spieß vorbei schon");
}

/* ── Aufstieg: nur über die Rampe, und nur in ihre Richtung ─────── */

abschnitt("Aufstieg");
{
  const k = flach();
  k.setze(4, 3, { ebene: 2 });                       /* das Podest, östlich */

  gleich(begehbar(k, 3, 3, 4, 3), false, "hinauf ohne Rampe verboten");
  gleich(laufKosten(k, 3, 3, 4, 3), null, "und daher ohne Preis");

  /* Falsche Richtung: Die Rampe liegt richtig, zeigt aber nach Norden,
     gegangen wird nach Osten. */
  k.setze(3, 3, { rampe: RAMPE.nordost });
  gleich(begehbar(k, 3, 3, 4, 3), false, "hinauf über eine Rampe in falscher Richtung verboten");

  /* Rampe auf dem oberen Feld statt auf dem unteren — auch das ist
     kein Aufstieg. */
  k.setze(3, 3, { rampe: RAMPE.keine });
  k.setze(4, 3, { rampe: RAMPE.west });
  gleich(begehbar(k, 3, 3, 4, 3), false, "eine Rampe oben hilft dem, der unten steht, nicht");

  k.setze(4, 3, { rampe: RAMPE.keine });
  k.setze(3, 3, { rampe: RAMPE.ost });
  gleich(begehbar(k, 3, 3, 4, 3), true, "hinauf über die Rampe in ihrer Richtung");
  gleich(laufKosten(k, 3, 3, 4, 3), 2, "der Aufstieg kostet zwei Punkte");

  /* Zwei Stufen auf einmal klettert niemand, auch nicht mit Rampe. */
  k.setze(4, 3, { ebene: 3 });
  gleich(begehbar(k, 3, 3, 4, 3), false, "zwei Ebenen hinauf verboten, Rampe hin oder her");

  /* Von oben auf ein Rampenfeld herunter ist ein gewöhnlicher Abstieg. */
  k.setze(4, 3, { ebene: 2 });
  gleich(begehbar(k, 4, 3, 3, 3), true, "von oben auf die Rampe herunter");
  gleich(laufKosten(k, 4, 3, 3, 3), 1, "das kostet einen Punkt, nicht zwei");

  /* Die Rampe zeigt nach Osten und hilft trotzdem nicht nach Norden. */
  k.setze(3, 2, { ebene: 2 });
  gleich(begehbar(k, 3, 3, 3, 2), false, "dieselbe Rampe trägt nicht nach Norden");
}

abschnitt("Rampe zeigt nach");
{
  /* Seit dem Sechseck gibt es kein „nord" mehr — senkrecht nach oben
     liegt beim Sechseck kein Feld, sondern eine Kante. Geprüft wird
     deshalb an einer geraden und einer ungeraden Zeile, dass dieselbe
     Rampenrichtung auf beiden **verschiedene** Nachbarn meint. Genau
     das ist die Stelle, an der eine Tabelle für beide Zeilen auffiele. */
  const k = flach();
  k.setze(2, 2, { rampe: RAMPE.nordost });
  k.setze(3, 3, { rampe: RAMPE.nordost });
  k.setze(4, 4, { rampe: RAMPE.west });
  tiefGleich(rampeZeigtNach(k, 2, 2), { dx: 0, dy: -1 },
    "Nordost-Rampe auf gerader Zeile zeigt nach (0,-1)");
  tiefGleich(rampeZeigtNach(k, 3, 3), { dx: 1, dy: -1 },
    "dieselbe Rampe auf ungerader Zeile zeigt nach (1,-1)");
  tiefGleich(rampeZeigtNach(k, 4, 4), { dx: -1, dy: 0 },
    "Westrampe zeigt auf jeder Zeile nach links");
  gleich(rampeZeigtNach(k, 5, 5), null, "ohne Rampe: nichts");
  gleich(rampeZeigtNach(k, -1, 5), null, "außerhalb: nichts");

  /* Jede Rampenrichtung muss zu genau einer Laufrichtung passen —
     sonst trägt eine davon niemanden. */
  for (const r of richtungen(5)) {
    const p = flach();
    p.setze(5, 5, { rampe: r.rampe });
    p.setze(5 + r.dx, 5 + r.dy, { ebene: 2 });
    gleich(begehbar(p, 5, 5, 5 + r.dx, 5 + r.dy), true, `Rampe ${r.name} trägt nach ${r.name}`);
    tiefGleich(rampeZeigtNach(p, 5, 5), { dx: r.dx, dy: r.dy }, `Rampe ${r.name} zeigt richtig`);
  }
}

/* ── Flüssigkeiten ──────────────────────────────────────────────── */

abschnitt("Wasser und Lava");
{
  const k = flach();
  k.setze(4, 3, { fluessig: FLUESSIG.wasser });
  gleich(laufKosten(k, 3, 3, 4, 3), 2, "durch Wasser kostet zwei");
  gleich(laufKosten(k, 4, 3, 3, 3), 1, "aus dem Wasser heraus wieder eins");

  /* Wasser oben drauf: Aufstieg plus Zuschlag. */
  k.setze(4, 3, { ebene: 2 });
  k.setze(3, 3, { rampe: RAMPE.ost });
  gleich(laufKosten(k, 3, 3, 4, 3), 3, "Aufstieg ins Wasser kostet drei");

  const l = flach();
  l.setze(4, 3, { fluessig: FLUESSIG.lava });
  gleich(laufKosten(l, 3, 3, 4, 3), 1, "Lava bremst nicht, sie brennt");
  tiefGleich(betretenSchaden(l, 4, 3), { wieviel: 8, art: "feuer" }, "Lava tut 8 Schaden");
  gleich(betretenSchaden(l, 3, 3), null, "trockener Boden tut nichts");
  l.setze(5, 3, { fluessig: FLUESSIG.wasser });
  gleich(betretenSchaden(l, 5, 3), null, "Wasser tut nichts");
  l.setze(6, 3, { fluessig: FLUESSIG.oel });
  gleich(betretenSchaden(l, 6, 3), null, "Öl tut beim Betreten nichts");
  gleich(betretenSchaden(l, -1, 3), null, "außerhalb tut nichts");
}

/* ── Der Sturz ──────────────────────────────────────────────────── */

abschnitt("Sturz");
{
  const k = flach();
  k.setze(3, 3, { ebene: 3 });                       /* Hochplateau     */
  k.setze(4, 3, { ebene: 1 });                       /* Boden daneben   */

  gleich(begehbar(k, 3, 3, 4, 3), true, "hinabspringen darf man überall");
  gleich(laufKosten(k, 3, 3, 4, 3), 1, "der Sturz kostet einen Punkt, nicht zwei");
  gleich(sturzTiefe(k, 3, 3, 4, 3), 2, "von Ebene 3 auf 1 sind zwei Stufen");
  gleich(sturzSchaden(sturzTiefe(k, 3, 3, 4, 3)), 3, "und machen 3 Schaden, nicht 6");

  /* Drei Stufen: erste frei, zwei zählen. */
  k.setze(4, 3, { ebene: 0 });
  gleich(sturzTiefe(k, 3, 3, 4, 3), 3, "von Ebene 3 in den Graben sind drei Stufen");
  gleich(sturzSchaden(3), 6, "drei Stufen machen 6 Schaden");

  /* Eine Stufe hinab ist ein Schritt, kein Sturz. */
  k.setze(3, 3, { ebene: 2 });
  k.setze(4, 3, { ebene: 1 });
  gleich(sturzTiefe(k, 3, 3, 4, 3), 0, "eine Stufe hinab ist kein Sturz");
  gleich(sturzSchaden(1), 0, "eine Stufe tut nicht weh");
  gleich(sturzSchaden(0), 0, "keine Stufe tut nicht weh");
  gleich(laufKosten(k, 3, 3, 4, 3), 1, "und kostet einen Punkt");

  /* Hinauf ist nie ein Sturz. */
  gleich(sturzTiefe(k, 4, 3, 3, 3), 0, "hinauf stürzt niemand");

  /* Der Rand: Ebene -1 draußen ergäbe rechnerisch zwei Stufen Sturz. */
  const rand = flach();
  gleich(sturzTiefe(rand, 0, 0, -1, 0), 0, "aus der Karte hinaus ist kein Sturz");
  gleich(sturzTiefe(rand, -1, 0, 0, 0), 0, "von außerhalb herein auch nicht");
  gleich(STURZ_AB_STUFEN, 2, "ein Sturz beginnt bei zwei Stufen");
}

/* ── Sicht über Kanten ──────────────────────────────────────────── */

abschnitt("Sicht");
{
  const k = flach();
  k.setze(5, 5, { ebene: 2 });     /* eine Kante, kein Hindernis darauf */

  gleich(blocktSichtlinie(k, 5, 5, 3, 1), false, "von Ebene 3 sieht man über eine Ebene-2-Kante");
  gleich(blocktSichtlinie(k, 5, 5, 1, 1), true, "von Ebene 1 aus nicht");
  gleich(blocktSichtlinie(k, 5, 5, 1, 3), false, "wer auf dem Plateau steht, wird gesehen");
  gleich(blocktSichtlinie(k, 5, 5, 2, 1), false, "gleich hoch blockt nicht");
  gleich(blocktSichtlinie(k, 5, 5, 0, 0), true, "aus dem Graben sieht man fast nichts");

  /* Eine echte Wand blockt auf jeder Ebene — auch von ganz oben. */
  k.setze(5, 5, { hindernis: HINDERNIS.wand });
  gleich(blocktSichtlinie(k, 5, 5, 3, 3), true, "eine Wand blockt auch von Ebene 3 aus");
  k.setze(5, 5, { hindernis: HINDERNIS.saeule });
  gleich(blocktSichtlinie(k, 5, 5, 3, 3), true, "eine Säule ebenso");

  /* Ein Gitter blockt Bewegung, aber man sieht hindurch. */
  k.setze(5, 5, { hindernis: HINDERNIS.gitter, ebene: 1 });
  gleich(blocktSichtlinie(k, 5, 5, 1, 1), false, "durch ein Gitter sieht man hindurch");

  const leer = flach();
  gleich(blocktSichtlinie(leer, 5, 5, 1, 1), false, "freies Feld blockt nicht");
  gleich(blocktSichtlinie(leer, -1, 5, 1, 1), true, "außerhalb der Karte blockt");
}

/* ── Höhenvorteil ───────────────────────────────────────────────── */

abschnitt("Höhenvorteil");
{
  const k = flach();
  k.setze(2, 2, { ebene: 3 });
  k.setze(6, 2, { ebene: 1 });
  gleich(hoehenVorteil(k, 2, 2, 6, 2), 1, "von oben herab: Vorteil");
  gleich(hoehenVorteil(k, 6, 2, 2, 2), -1, "von unten hinauf: Nachteil");
  gleich(hoehenVorteil(k, 6, 2, 7, 2), 0, "gleiche Ebene: nichts");
  gleich(hoehenVorteil(k, 2, 2, -1, 2), 0, "außerhalb: nichts");

  nahe(trefferBonus(1), 0.12, 1e-12, "oben trifft man 12 Prozent besser");
  nahe(trefferBonus(-1), -0.12, 1e-12, "unten 12 Prozent schlechter");
  nahe(trefferBonus(0), 0, 1e-12, "gleich hoch ändert nichts");
  /* Die Unsymmetrie: nach oben ein Feld weiter, nach unten aber keine
     Strafe auf die Reichweite. */
  gleich(reichweitenBonus(1), HOEHEN_REICHWEITE_BONUS, "oben schießt man ein Feld weiter");
  gleich(reichweitenBonus(0), 0, "gleich hoch: kein Zuschlag");
  gleich(reichweitenBonus(-1), 0, "unten: kein Abzug auf die Reichweite");
}

/* ── Deckung ────────────────────────────────────────────────────── */

abschnitt("Deckung");
{
  const k = flach();
  const zx = 5, zy = 5;

  /* Angreifer im Osten. Nur das Feld östlich des Ziels deckt. */
  k.setze(6, 5, { hindernis: HINDERNIS.fass });
  gleich(hatDeckung(k, 9, 5, zx, zy), true, "ein Fass zwischen Ziel und Angreifer deckt");
  k.setze(6, 5, { hindernis: HINDERNIS.keins });

  k.setze(4, 5, { hindernis: HINDERNIS.fass });
  gleich(hatDeckung(k, 9, 5, zx, zy), false, "ein Fass hinter dem Ziel deckt nicht");
  k.setze(4, 5, { hindernis: HINDERNIS.keins });

  k.setze(5, 4, { hindernis: HINDERNIS.fass });
  gleich(hatDeckung(k, 9, 5, zx, zy), false, "ein Fass nördlich deckt nicht gegen Osten");
  k.setze(5, 6, { hindernis: HINDERNIS.fass });
  gleich(hatDeckung(k, 9, 5, zx, zy), false, "ein Fass südlich ebenso wenig");
  k.setze(5, 4, { hindernis: HINDERNIS.keins });
  k.setze(5, 6, { hindernis: HINDERNIS.keins });

  /* Wand und Säule stehen nicht in GIBT_DECKUNG, decken aber. */
  k.setze(6, 5, { hindernis: HINDERNIS.wand });
  gleich(hatDeckung(k, 9, 5, zx, zy), true, "eine Wand deckt");
  k.setze(6, 5, { hindernis: HINDERNIS.saeule });
  gleich(hatDeckung(k, 9, 5, zx, zy), true, "eine Säule deckt");
  /* Ein Spieß ist nur Bild. */
  k.setze(6, 5, { hindernis: HINDERNIS.spiess });
  gleich(hatDeckung(k, 9, 5, zx, zy), false, "ein Spieß deckt nicht");
  k.setze(6, 5, { hindernis: HINDERNIS.keins });

  /* ── Alle sechs Richtungen, je einzeln ─────────────────────────

     Bis zum 07.09.2026 standen hier vier Richtungen und dazu eine
     Sonderregel: „Steht der Angreifer exakt über Eck, zählen beide
     Felder dieser Ecke." Die Ecke war der Preis des Quadratrasters —
     seine Diagonale ist keine Nachbarschaft, also musste die
     Schusslinie von Hand nachgebaut werden.

     Auf dem Sechseck fällt das weg. Deckung gibt jeder Nachbar des
     Ziels, der **näher am Angreifer** liegt als das Ziel selbst. Bei
     einem Angreifer geradeaus ist das genau einer, bei einem zwischen
     zwei Richtungen sind es zwei — dieselbe Wirkung, aber als Folge
     der Geometrie statt als Sonderfall.

     Geprüft wird das nicht an einer Handvoll Beispiele, sondern über
     alle sechs Nachbarn: Für jeden wird ein Angreifer weit in dieser
     Richtung aufgestellt, und genau dieser Nachbar muss decken. */
  for (const r of richtungen(zy)) {
    const nx = zx + r.dx, ny = zy + r.dy;
    /* Der Angreifer steht drei Felder weiter in derselben Richtung. */
    const ax = zx + r.dx * 3, ay = zy + r.dy * 3;
    if (!k.drin(ax, ay)) continue;

    k.setze(nx, ny, { hindernis: HINDERNIS.fass });
    gleich(hatDeckung(k, ax, ay, zx, zy), true, `gegen ${r.name} deckt das Feld nach ${r.name}`);
    k.setze(nx, ny, { hindernis: HINDERNIS.keins });
    gleich(hatDeckung(k, ax, ay, zx, zy), false, `ohne Hindernis nach ${r.name}: keine Deckung`);

    /* Und das Feld auf der **Gegenseite** deckt nie — es liegt hinter
       dem Ziel, nicht davor. */
    const gx = zx - r.dx, gy = zy - r.dy;
    if (k.drin(gx, gy)) {
      k.setze(gx, gy, { hindernis: HINDERNIS.fass });
      gleich(hatDeckung(k, ax, ay, zx, zy), false,
        `ein Fass hinter dem Ziel deckt nicht gegen ${r.name}`);
      k.setze(gx, gy, { hindernis: HINDERNIS.keins });
    }
  }

  /* Ein Angreifer zwischen zwei Richtungen: dann liegen **zwei**
     Nachbarn näher, und jeder von beiden deckt für sich allein. */
  {
    const zwischen = nachbarn(k, zx, zy)
      .filter((n) => abstand(n.x, n.y, 9, 8) < abstand(zx, zy, 9, 8));
    gleich(zwischen.length, 2, "gegen einen Angreifer schräg dahinter liegen zwei Nachbarn näher");
    for (const n of zwischen) {
      k.setze(n.x, n.y, { hindernis: HINDERNIS.fass });
      gleich(hatDeckung(k, 9, 8, zx, zy), true,
        `das Feld nach ${n.richtung.name} deckt für sich allein`);
      k.setze(n.x, n.y, { hindernis: HINDERNIS.keins });
    }
    gleich(hatDeckung(k, 9, 8, zx, zy), false, "ohne Hindernis deckt keins von beiden");
  }

  gleich(hatDeckung(k, zx, zy, zx, zy), false, "auf dem eigenen Feld gibt es keine Richtung");
}

/* ── Stoß ───────────────────────────────────────────────────────── */

abschnitt("Stoß");

/* Alle sechs Richtungen auf **beiden** Zeilenparitäten — der Fall, den
   das Quadratraster nicht bestehen kann.

   Wer neben dem Ziel steht, stößt es auf das Feld in der Gegenrichtung:
   `richtungen(zy)[(k + 3) % 6]`, vom Ziel aus gerechnet. Zwölf Fälle,
   und keiner davon ist geschenkt: Auf einer geraden Zeile liegt der
   Nachbar nach Südost bei `(0, +1)`, auf einer ungeraden bei
   `(+1, +1)`. Eine Rechnung aus `Math.abs`/`Math.sign` kennt diesen
   Versatz nicht und trifft nur die waagerechten Richtungen. Geprüft
   wird auf ebener Karte, damit allein die Geometrie antwortet und nicht
   Wand oder Kante. */
{
  const eben = flach(16, 16);
  for (const zy of [6, 7]) {
    const zx = 8;
    const hier = richtungen(zy);
    for (let k = 0; k < 6; k++) {
      const von = hier[k];
      const gegen = hier[(k + 3) % 6];
      tiefGleich(
        stossZiel(eben, zx + von.dx, zy + von.dy, zx, zy),
        { x: zx + gegen.dx, y: zy + gegen.dy },
        `Zeile ${zy}: von ${von.name} gestoßen fliegt man nach ${gegen.name}`
      );
    }
  }
}

/* Dieselben zwölf Lagen von hinten: Gezogen wird nach derselben
   Vorschrift wie gestoßen, nur vom **gespiegelten** Punkt aus. Geprüft
   wird deshalb genau die Verkettung, die `spiel/aktionen.mjs` und
   `spiel/gegner-ki.mjs` bauen — `gespiegelt` und dann `stossZiel` —
   und nicht die Spiegelung für sich allein: Falsch wird es erst im
   Zusammenspiel. Wer gezogen wird, landet auf dem Feld **zum Angreifer
   hin**, also auf dessen eigenem Nachbarn zum Ziel. Mit der alten
   Quadratspiegelung `2 * ziel - aus` stimmt das nur für Ost und West. */
{
  const eben = flach(16, 16);
  for (const zy of [6, 7]) {
    const zx = 8;
    const hier = richtungen(zy);
    for (let k = 0; k < 6; k++) {
      const hin = hier[k];
      const angreifer = { x: zx + hin.dx, y: zy + hin.dy };
      const hinter = gespiegelt(angreifer.x, angreifer.y, zx, zy);
      tiefGleich(
        stossZiel(eben, hinter.x, hinter.y, zx, zy),
        angreifer,
        `Zeile ${zy}: nach ${hin.name} gezogen landet man beim Angreifer`
      );
    }
  }
}

{
  const k = flach();
  tiefGleich(stossZiel(k, 4, 5, 5, 5), { x: 6, y: 5 }, "von Westen gestoßen fliegt man nach Osten");
  tiefGleich(stossZiel(k, 6, 5, 5, 5), { x: 4, y: 5 }, "und umgekehrt");
  /* (5,6) ist von (5,5) aus der Nachbar nach Südwest — Zeile 5 ist
     ungerade, dort liegt Südwest bei (0, +1). Gestoßen wird also nach
     Nordost, und das ist (6,4) und nicht (5,4). Bis zum 07.09.2026
     stand hier die Quadratantwort. */
  tiefGleich(stossZiel(k, 5, 6, 5, 5), { x: 6, y: 4 },
    "von Südwest gestoßen fliegt man nach Nordost");
  /* Zwei Felder entfernt auf derselben Achse stößt genauso: Ein Schub
     über mehrere Felder rechnet ab dem zweiten Schritt von einem Punkt
     aus, der kein Nachbar mehr ist. */
  tiefGleich(stossZiel(k, 3, 5, 5, 5), { x: 6, y: 5 }, "auch zwei Felder entfernt auf der Achse");
  /* (5,1) liegt von (5,5) aus auf **keiner** der sechs Achsen — im
     Quadratraster war es „vier Felder genau nördlich". */
  gleich(stossZiel(k, 5, 1, 5, 5), null, "abseits der Achse gibt es keine Richtung");
  gleich(stossZiel(k, 4, 4, 5, 5), null, "zwischen zwei Richtungen wird nicht gestoßen");
  gleich(stossZiel(k, 5, 5, 5, 5), null, "auf dem eigenen Feld auch nicht");

  k.setze(6, 5, { hindernis: HINDERNIS.wand });
  gleich(stossZiel(k, 4, 5, 5, 5), null, "gegen eine Wand stößt man niemanden");
  k.setze(6, 5, { hindernis: HINDERNIS.keins });

  /* Über den Kartenrand hinaus geht nicht. */
  gleich(stossZiel(k, 1, 5, 0, 5), null, "über den Kartenrand hinaus geht nicht");

  /* Hinauf nur über die Rampe — auch beim Stoß. */
  k.setze(6, 5, { ebene: 2 });
  gleich(stossZiel(k, 4, 5, 5, 5), null, "eine Stufe hinauf stößt man niemanden ohne Rampe");
  k.setze(5, 5, { rampe: RAMPE.ost });
  tiefGleich(stossZiel(k, 4, 5, 5, 5), { x: 6, y: 5 }, "über eine Rampe hinauf schon");
  k.setze(5, 5, { rampe: RAMPE.keine });
  k.setze(6, 5, { ebene: 1 });

  /* Der Kern des Spiels: über die Kante in den Graben. */
  const kante = flach();
  kante.setze(5, 5, { ebene: 3 });
  kante.setze(6, 5, { ebene: 0, fluessig: FLUESSIG.lava });
  const ziel = stossZiel(kante, 4, 5, 5, 5);
  tiefGleich(ziel, { x: 6, y: 5 }, "hinab wird immer gestoßen");
  gleich(sturzTiefe(kante, 5, 5, ziel.x, ziel.y), 3, "drei Stufen tief");
  gleich(sturzSchaden(sturzTiefe(kante, 5, 5, ziel.x, ziel.y)), 6, "das macht 6 Schaden");
  tiefGleich(betretenSchaden(kante, ziel.x, ziel.y), { wieviel: 8, art: "feuer" },
    "und die Lava unten noch einmal 8");
}

/* ── Gleichlauf: dieselbe Saat, dieselben Antworten ─────────────── */

abschnitt("Gleichlauf");
{
  /* Eine gewürfelte Karte, damit die Antworten nicht alle gleich
     ausfallen — und zweimal dieselbe Saat, damit sie sich vergleichen
     lassen. Der Zufall steckt nur im Bauen, nie in den Regeln. */
  const baue = (saat) => {
    const z = macheZufall(saat);
    const k = macheKarte(14, 14);
    for (let y = 0; y < k.hoehe; y++) {
      for (let x = 0; x < k.breite; x++) {
        k.setze(x, y, {
          boden: z.ganz(0, 7),
          ebene: z.ganz(0, 3),
          hindernis: z.trifft(0.25) ? z.ganz(1, 10) : HINDERNIS.keins,
          fluessig: z.trifft(0.3) ? z.ganz(1, 5) : FLUESSIG.keine,
          rampe: z.trifft(0.35) ? z.ganz(1, 4) : RAMPE.keine
        });
      }
    }
    return k;
  };

  const antworten = (k) => {
    const teile = [];
    for (let y = 0; y < k.hoehe; y++) {
      for (let x = 0; x < k.breite; x++) {
        for (const r of richtungen(y)) {
          const nx = x + r.dx, ny = y + r.dy;
          teile.push(`k${laufKosten(k, x, y, nx, ny)}`);
          teile.push(`t${sturzTiefe(k, x, y, nx, ny)}`);
          teile.push(`b${blocktSichtlinie(k, nx, ny, k.ebeneBei(x, y), 1) ? 1 : 0}`);
        }
        teile.push(`d${hatDeckung(k, 0, 0, x, y) ? 1 : 0}`);
        teile.push(`v${hoehenVorteil(k, 0, 0, x, y)}`);
        const s = stossZiel(k, 0, y, x, y);
        teile.push(s ? `s${s.x},${s.y}` : "s-");
      }
    }
    return teile.join("|");
  };

  const a = baue(20260906);
  const b = baue(20260906);
  gleich(a.summe(), b.summe(), "dieselbe Saat baut dieselbe Karte");
  const antwortA = antworten(a);
  gleich(antwortA, antworten(b), "dieselbe Karte gibt dieselben Antworten");

  /* Eine andere Saat muss auch andere Antworten geben — sonst
     verglichen wir eben nur zwei leere Zeichenketten. */
  const c = baue(7);
  behaupte(antworten(c) !== antwortA, "eine andere Saat gibt andere Antworten");

  /* Und die Antworten dürfen nicht einförmig sein: Wenn nirgends etwas
     begehbar oder gedeckt wäre, prüfte der Gleichlauf nichts. */
  behaupte(antwortA.includes("k1"), "es kommen Schritte für einen Punkt vor");
  behaupte(antwortA.includes("k2"), "es kommen Aufstiege für zwei Punkte vor");
  behaupte(antwortA.includes("knull"), "es kommen unmögliche Schritte vor");
  behaupte(antwortA.includes("t3"), "es kommen Stürze über drei Stufen vor");
  behaupte(antwortA.includes("d1"), "es kommt Deckung vor");
  behaupte(antwortA.includes("b1"), "es kommen blockierte Sichtlinien vor");
}

ende("Höhen");
