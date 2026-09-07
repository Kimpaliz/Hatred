/* [Aufgabe: Prüfwesen] Prüft die Zugordnung aus `spiel/zug.mjs` und die
   Aktionen aus `spiel/aktionen.mjs` — Reihenfolge, Preise, Wacht,
   Sturz und Gleichlauf.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   An diesen beiden Dateien hängt das ganze Spiel, und drei ihrer
   Fehler sind so leise, dass sie im Spiel nicht auffallen:

   · **Die Wacht löst nicht mitten in der Bewegung aus** (Fehlerbuch
     E3). Wer eine Bewegung als „setze die Figur von A nach B" baut,
     bekommt eine Wacht, die erst schießt, wenn der Läufer schon
     steht — also nie, wenn er hinter Deckung endet. Geprüft wird
     deshalb nicht „es kommt ein Schuss", sondern **wo** der Läufer
     stand, als er kam, und dass die Bewegung abbricht, wenn er
     stirbt. Dafür laufen vierzig Saaten durch dieselbe Stellung: Die
     tödlichen Läufe müssen **alle** an der Stelle des Schusses enden,
     die überlebten **alle** am Ziel.
   · **Die halbe Aktion** (Fehlerbuch E2). Eine abgelehnte Aktion darf
     nichts verändert haben — auch nicht den Zufallsstrom. Deshalb
     wird ein vollständiger Abdruck des Zustands vorher und nachher
     verglichen, Zeichen für Zeichen, samt Kartenprüfsumme und
     Stromstand.
   · **Der überspringende Zeiger** (Fehlerbuch E1). Stirbt jemand
     mitten in der Runde, muss der Nächste trotzdem drankommen.
     Geprüft wird über drei volle Runden mit einem echten Todesfall
     durch eine Fähigkeit mit festem Schaden — nicht durch einen
     gewürfelten Treffer, der auch danebengehen könnte.

   Dazu der Gleichlauf: Dieselbe Aktionsfolge auf derselben Saat muss
   **byteweise** dieselbe Ereignisliste geben. Das ist die Eigenschaft,
   an der der Internet-Koop hängt; ohne sie rechnen vier Rechner vier
   verschiedene Spiele.

   **Geprüft wird der Fall, der ohne die Arbeit falsch wäre.** Dass ein
   Schwerthieb Schaden macht, gewinnt ohnehin. Dass die Deckung genau
   `DECKUNG_MALUS` abzieht, dass ein Stoß über die Kante die restlichen
   Punkte nimmt, dass eine `verlangsamen`-Wirkung mit zwei Runden auch
   wirklich zwei Runden lang drückt — das nicht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/helfer.mjs` (das Prüfgerüst), `spiel/zug.mjs` und
   `spiel/aktionen.mjs` (das Geprüfte), `spiel/gitter.mjs`,
   `spiel/hoehen.mjs`, `spiel/wegfindung.mjs`, `spiel/katalog/*.mjs`
   (die Zahlen, gegen die nachgerechnet wird), `spiel/zufall.mjs` (die
   Saaten), `werkzeuge/pruefe-alles.mjs` (startet diese Datei als
   eigenen Prozess und liest den Rückgabewert). */

import { abschnitt, behaupte, gleich, nahe, tiefGleich, wirft, ende } from "./helfer.mjs";
import { macheKarte, BODEN, FLUESSIG, HINDERNIS, RAMPE } from "../spiel/gitter.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import {
  DECKUNG_MALUS, HOEHEN_TREFFER_BONUS, LAVA_SCHADEN, sturzSchaden
} from "../spiel/hoehen.mjs";
import { wegSuche } from "../spiel/wegfindung.mjs";
import { waffe } from "../spiel/katalog/waffen.mjs";
import { faehigkeit } from "../spiel/katalog/faehigkeiten.mjs";
import {
  apFuerZug, ruestungVon, wirkungAnhaengen, wirkungsStaerke
} from "../spiel/wesen.mjs";
import { trefferChance } from "../spiel/kampf.mjs";
import {
  AP_JE_ZUG, macheOrdnung, starteRunde, amZugWesen, zugBeenden, seiteFertig,
  pruefeLaufEnde, sichtVon, setzeWirkung, abklingtNoch
} from "../spiel/zug.mjs";
import {
  AKTION, pruefeAktion, kostenVon, moeglicheAktionen, wendeAn,
  STOSS_KOSTEN, TRANK_KOSTEN, AUFHEBEN_KOSTEN, WACHT_MINDEST_AP, TRANK_HEILUNG
} from "../spiel/aktionen.mjs";

/* ── Werkzeug der Prüfung ───────────────────────────────────────────

   Eine Probekarte ist flach, leer und **hell**: Ohne Licht gilt jedes
   Ziel jenseits von zwei Feldern als verborgen (`spiel/licht.mjs`),
   und dann prüfte man versehentlich die Dunkelheit statt der Aktion.
   Das eine Licht trägt eine eigene `weite` über die ganze Karte —
   erlaubt, weil `licht.mjs` sie je Eintrag zulässt. */
function macheProbekarte(breite = 16, hoehe = 9) {
  const karte = macheKarte(breite, hoehe);
  karte.boden.fill(BODEN.stein);
  karte.lichter = [{
    x: (breite / 2) | 0, y: (hoehe / 2) | 0,
    art: "fackel", staerke: 1, weite: breite + hoehe
  }];
  return karte;
}

function macheWesen(o) {
  return {
    id: o.id,
    art: o.art || "probe",
    seite: o.seite,
    x: o.x, y: o.y,
    lp: o.lp === undefined ? 20 : o.lp,
    lpMax: o.lpMax === undefined ? (o.lp === undefined ? 20 : o.lp) : o.lpMax,
    ap: o.ap === undefined ? AP_JE_ZUG : o.ap,
    apMax: o.apMax === undefined ? AP_JE_ZUG : o.apMax,
    flinkheit: o.flinkheit === undefined ? 5 : o.flinkheit,
    ruestung: o.ruestung === undefined ? 0 : o.ruestung,
    sicht: o.sicht === undefined ? 14 : o.sicht,
    waffe: o.waffe || "rostdolch",
    faehigkeiten: o.faehigkeiten || [],
    wirkungen: [],
    wacht: false,
    lebt: true,
    spielerPlatz: o.spielerPlatz === undefined ? null : o.spielerPlatz,
    traenke: o.traenke === undefined ? 0 : o.traenke,
    eigenheit: o.eigenheit === undefined ? null : o.eigenheit
  };
}

function macheZustand(karte, wesen, saat = 41, beginnen = true) {
  const zustand = {
    saat, tiefe: 1, karte,
    zufall: macheZufall(saat),
    wesen,
    nachId: new Map(wesen.map((w) => [w.id, w])),
    runde: 1, ordnung: [], amZug: 0,
    seiteDran: null,
    spieler: [],
    vorbei: null,
    protokoll: []
  };
  if (beginnen) starteRunde(zustand);
  return zustand;
}

/* Ein vollständiger Abdruck. Er trägt ausdrücklich auch den Stand des
   Zufallsstroms und die Kartenprüfsumme: Eine abgelehnte Aktion, die
   „nur" einen Würfel gezogen hat, wäre im Netz genauso tödlich wie
   eine, die eine Figur bewegt hat. */
function abdruck(zustand) {
  return JSON.stringify({
    wesen: zustand.wesen,
    runde: zustand.runde,
    amZug: zustand.amZug,
    ordnung: zustand.ordnung,
    seiteDran: zustand.seiteDran,
    vorbei: zustand.vorbei,
    lichter: zustand.karte.lichter,
    karte: zustand.karte.summe(),
    strom: zustand.zufall.zustand()
  });
}

const artenVon = (ereignisse) => ereignisse.map((e) => e.art);
const ersteArt = (ereignisse, art) => ereignisse.find((e) => e.art === art) || null;
const alleArt = (ereignisse, art) => ereignisse.filter((e) => e.art === art);

/* ══ 1. Die Ordnung ════════════════════════════════════════════════ */
{
  abschnitt("Ordnung");

  const liste = [
    { id: 3, flinkheit: 5 }, { id: 1, flinkheit: 9 },
    { id: 2, flinkheit: 5 }, { id: 4, flinkheit: 9 }
  ];
  tiefGleich(macheOrdnung(liste), [1, 4, 2, 3],
    "Flinkheit absteigend, bei Gleichstand die kleinere ID zuerst");

  /* Der eigentliche Fall: Dieselben Wesen in anderer Eingabefolge
     müssen dieselbe Ordnung ergeben. Ein Vergleich, der nur die
     Flinkheit kennt, käme hier auf eine andere Liste — und zwei
     Rechner, die ihre Wesen in anderer Folge aufgebaut haben, zögen
     in anderer Reihenfolge. */
  tiefGleich(macheOrdnung([...liste].reverse()), [1, 4, 2, 3],
    "und zwar unabhängig davon, in welcher Folge die Wesen hereinkommen");
  tiefGleich(macheOrdnung([liste[2], liste[0], liste[3], liste[1]]), [1, 4, 2, 3],
    "auch bei einer dritten Eingabefolge");

  tiefGleich(macheOrdnung([]), [], "eine leere Liste gibt eine leere Ordnung");
  tiefGleich(macheOrdnung([{ id: 7 }, { id: 2 }]), [2, 7],
    "ohne Flinkheit zählen alle gleich schnell — dann entscheidet die ID");
}

/* ══ 2. Rundenanfang: Punkte, Brand, Lava, Wirkungen ═══════════════ */
{
  abschnitt("Rundenanfang");

  const karte = macheProbekarte();
  karte.setze(3, 3, { fluessig: FLUESSIG.lava });
  const held = macheWesen({ id: 1, seite: "jaeger", x: 3, y: 3, lp: 40, flinkheit: 9 });
  const brut = macheWesen({ id: 2, seite: "brut", x: 8, y: 3, lp: 40, flinkheit: 4 });
  const zustand = macheZustand(karte, [held, brut], 41, false);

  const ersteRunde = starteRunde(zustand);
  gleich(ersteRunde[0].art, "rundeNeu", "die Runde meldet sich zuerst");
  gleich(ersteRunde[0].nummer, 1, "mit der Nummer, die im Zustand steht");
  gleich(held.ap, AP_JE_ZUG, "die Punkte sind aufgefüllt");
  gleich(held.lp, 40 - LAVA_SCHADEN, "wer in der Lava steht, verliert Leben");
  gleich(brut.lp, 40, "wer daneben steht, nicht");
  gleich(zustand.seiteDran, "jaeger", "die Seite ergibt sich aus dem Wesen am Zug");
  behaupte(artenVon(ersteRunde).includes("seiteDran"), "und wird einmal gemeldet");

  /* Der Fall, der ohne Arbeit falsch wäre: Eine Wirkung über zwei
     Runden muss **zweimal** wirken. Wer zuerst herunterzählt und dann
     anwendet, bekommt eine Runde. */
  wirkungAnhaengen(brut, "verlangsamt", 2, 2);
  zustand.runde = 2;
  starteRunde(zustand);
  gleich(wirkungsStaerke(brut, "verlangsamt"), 2, "in der ersten Runde drückt die Fessel");
  gleich(brut.ap, AP_JE_ZUG - 2, "und die Punkte sind entsprechend kleiner");
  zustand.runde = 3;
  starteRunde(zustand);
  gleich(brut.ap, AP_JE_ZUG - 2, "in der zweiten Runde immer noch");
  zustand.runde = 4;
  starteRunde(zustand);
  gleich(wirkungsStaerke(brut, "verlangsamt"), 0, "danach ist sie weg");
  gleich(apFuerZug(brut), AP_JE_ZUG, "und die Wesenrechnung gibt wieder die vollen Punkte");
  gleich(brut.ap, AP_JE_ZUG, "und die Punkte sind wieder voll");

  /* Brand tut Schaden **vor** dem Auffüllen: Wer daran stirbt, bekommt
     keine Punkte mehr — sonst stünde in der Ereignisliste ein
     `apGesetzt` für eine Leiche. */
  const zunder = macheWesen({ id: 3, seite: "brut", x: 10, y: 3, lp: 3 });
  zustand.wesen.push(zunder);
  zustand.nachId.set(3, zunder);
  wirkungAnhaengen(zunder, "brennt", 2, 5);
  zustand.runde = 5;
  const brennt = starteRunde(zustand);
  gleich(zunder.lebt, false, "der Brand tötet");
  const punkteFuerTote = brennt.filter((e) => e.art === "apGesetzt" && e.wer === 3);
  gleich(punkteFuerTote.length, 0, "und eine Leiche bekommt keine Punkte mehr");
  behaupte(brennt.some((e) => e.art === "gestorben" && e.wer === 3),
    "der Tod steht in der Ereignisliste");
}

/* ══ 3. Was die Aktionen kosten ════════════════════════════════════ */
{
  abschnitt("Preise");

  const karte = macheProbekarte();
  const held = macheWesen({ id: 1, seite: "jaeger", x: 2, y: 4, waffe: "kurzbogen", flinkheit: 9 });
  const brut = macheWesen({ id: 2, seite: "brut", x: 5, y: 4, flinkheit: 1 });
  const zustand = macheZustand(karte, [held, brut]);

  gleich(kostenVon(zustand, { typ: AKTION.angriff, wer: 1, ziel: 2 }), waffe("kurzbogen").ap,
    "ein Schuss kostet, was im Waffenkatalog steht — hier steht keine zweite Preisliste");
  gleich(kostenVon(zustand, { typ: AKTION.stoss, wer: 1, ziel: 2 }), STOSS_KOSTEN, "Stoß");
  gleich(kostenVon(zustand, { typ: AKTION.trank, wer: 1 }), TRANK_KOSTEN, "Trank");
  gleich(kostenVon(zustand, { typ: AKTION.aufheben, wer: 1 }), AUFHEBEN_KOSTEN, "Aufheben");
  gleich(kostenVon(zustand, { typ: AKTION.zugEnde, wer: 1 }), 0, "Zug beenden ist umsonst");
  gleich(kostenVon(zustand, { typ: AKTION.wacht, wer: 1 }), AP_JE_ZUG,
    "Wacht nimmt alle übrigen Punkte");
  held.ap = 1;
  gleich(kostenVon(zustand, { typ: AKTION.wacht, wer: 1 }), WACHT_MINDEST_AP,
    "aber mindestens zwei — mit einem Restpunkt sperrt niemand den Gang");
  behaupte(pruefeAktion(zustand, { typ: AKTION.wacht, wer: 1 }) !== null,
    "und mit einem Punkt ist die Wacht deshalb nicht bezahlbar");
  held.ap = AP_JE_ZUG;

  /* Der Weg wird nicht mitgeschickt, sondern gesucht — und zwar mit
     denselben Preisen wie in `wegfindung.mjs`. Ein eigener
     Schrittpreis in `aktionen.mjs` fiele hier durch. */
  karte.setze(3, 4, { fluessig: FLUESSIG.wasser });
  const weg = wegSuche(karte, { x: 2, y: 4 }, { x: 4, y: 4 });
  gleich(kostenVon(zustand, { typ: AKTION.gehen, wer: 1, nach: { x: 4, y: 4 } }), weg.kosten,
    "Gehen kostet genau, was die Wegfindung sagt");
  gleich(weg.kosten, 3, "und das sind hier drei Punkte: ein Schritt, ein Wasserschritt");
  karte.setze(3, 4, { fluessig: FLUESSIG.keine });

  gleich(kostenVon(zustand, { typ: AKTION.gehen, wer: 1, nach: { x: 0, y: 0 } }) < Infinity, true,
    "ein erreichbares Feld hat einen endlichen Preis");
  karte.setze(1, 4, { hindernis: HINDERNIS.wand });
  gleich(kostenVon(zustand, { typ: "gibtsNicht", wer: 1 }), Infinity,
    "eine erfundene Aktionsart kostet unendlich, nicht null");
  karte.setze(1, 4, { hindernis: HINDERNIS.keins });
}

/* ══ 4. Abgelehnt heißt: nichts geändert (Fehlerbuch E2) ═══════════ */
{
  abschnitt("Ablehnung");

  const karte = macheProbekarte();
  const held = macheWesen({ id: 1, seite: "jaeger", x: 2, y: 4, ap: 1, flinkheit: 9 });
  const brut = macheWesen({ id: 2, seite: "brut", x: 5, y: 4, flinkheit: 1 });
  const zustand = macheZustand(karte, [held, brut]);
  held.ap = 1;

  const vorher = abdruck(zustand);
  const gehenZuWeit = { typ: AKTION.gehen, wer: 1, nach: { x: 8, y: 4 } };
  const grund = pruefeAktion(zustand, gehenZuWeit);
  behaupte(typeof grund === "string" && grund.length > 0,
    "zu wenig Punkte gibt einen Grund als Satz");
  behaupte(/Aktionspunkte/.test(grund), "und der Satz nennt die Aktionspunkte");
  wirft(() => wendeAn(zustand, gehenZuWeit), "wendeAn wirft bei einer abgelehnten Aktion");
  gleich(abdruck(zustand), vorher,
    "und der Zustand ist danach Zeichen für Zeichen derselbe — kein halber Schritt");
  gleich(held.x, 2, "die Figur steht noch da, wo sie stand");

  /* Auch der Zufallsstrom darf nicht angefasst worden sein: Ein
     abgelehnter Angriff, der schon gewürfelt hat, verschöbe jeden
     späteren Wurf auf diesem Rechner (Fehlerbuch B4). */
  const angriffZuTeuer = { typ: AKTION.angriff, wer: 1, ziel: 2 };
  wirft(() => wendeAn(zustand, angriffZuTeuer), "ein unbezahlbarer Angriff wird abgelehnt");
  gleich(zustand.zufall.zustand(), JSON.parse(vorher).strom,
    "und hat keinen Würfel gezogen");

  held.ap = AP_JE_ZUG;
  gleich(pruefeAktion(zustand, { typ: AKTION.gehen, wer: 1, nach: { x: 5, y: 4 } }),
    "Dort steht schon jemand.",
    "auf ein besetztes Feld geht niemand");
  gleich(pruefeAktion(zustand, { typ: AKTION.gehen, wer: 2, nach: { x: 4, y: 4 } }),
    "Dieses Wesen ist nicht am Zug.",
    "und wer nicht dran ist, handelt gar nicht");
  behaupte(pruefeAktion(zustand, { typ: AKTION.angriff, wer: 1, ziel: 99 }) !== null,
    "ein Ziel, das es nicht gibt, wird abgelehnt");
  behaupte(pruefeAktion(zustand, { typ: "tanzen", wer: 1 }) !== null,
    "eine erfundene Aktionsart auch");

  const vorDemBesetzten = abdruck(zustand);
  wirft(() => wendeAn(zustand, { typ: AKTION.gehen, wer: 1, nach: { x: 5, y: 4 } }),
    "auch das besetzte Feld wirft");
  gleich(abdruck(zustand), vorDemBesetzten, "und ändert nichts");
}

/* ══ 5. Der Stoß über die Kante ════════════════════════════════════ */
{
  abschnitt("Stoß und Sturz");

  const karte = macheProbekarte();
  /* Ein Podest auf Ebene 3, daneben der Boden auf Ebene 1: drei
     Ebenen minus eine, also ein Sturz über zwei Stufen. */
  for (const x of [4, 5]) karte.setze(x, 4, { ebene: 3 });
  const schieber = macheWesen({
    id: 1, seite: "jaeger", x: 4, y: 4, flinkheit: 9, waffe: "rostdolch"
  });
  const opfer = macheWesen({ id: 2, seite: "brut", x: 5, y: 4, lp: 30, flinkheit: 1 });
  const zustand = macheZustand(karte, [schieber, opfer]);

  gleich(opfer.ap, AP_JE_ZUG, "das Opfer hat vor dem Stoß seine vollen Punkte");
  const ereignisse = wendeAn(zustand, { typ: AKTION.stoss, wer: 1, ziel: 2 });

  gleich(schieber.ap, AP_JE_ZUG - STOSS_KOSTEN, "der Stoß kostet zwei Punkte");
  gleich(opfer.x, 6, "das Opfer steht ein Feld weiter");
  gleich(opfer.y, 4, "in derselben Zeile");

  const sturz = ersteArt(ereignisse, "gestuerzt");
  behaupte(sturz !== null, "der Sturz wird gemeldet");
  gleich(sturz.stufen, 2, "über zwei Ebenen");
  gleich(sturz.schaden, sturzSchaden(2), "mit dem Schaden aus der Höhenregel");
  gleich(opfer.lp, 30 - sturzSchaden(2), "und der Schaden ist angekommen");
  gleich(opfer.ap, 0,
    "der Gestoßene verliert seine restlichen Punkte — das ist der Preis der Kante");
  const wechsel = ersteArt(ereignisse, "ebeneGewechselt");
  behaupte(wechsel !== null && wechsel.von === 3 && wechsel.nach === 1,
    "der Ebenenwechsel steht als eigenes Ereignis dabei");

  /* Ein Stoß gegen eine Wand geht nicht — und ändert nichts. */
  const karte2 = macheProbekarte();
  karte2.setze(6, 4, { hindernis: HINDERNIS.wand });
  const a = macheWesen({ id: 1, seite: "jaeger", x: 4, y: 4, flinkheit: 9 });
  const b = macheWesen({ id: 2, seite: "brut", x: 5, y: 4, flinkheit: 1 });
  const z2 = macheZustand(karte2, [a, b]);
  behaupte(pruefeAktion(z2, { typ: AKTION.stoss, wer: 1, ziel: 2 }) !== null,
    "gegen eine Wand stößt niemand");

  /* Und über Eck gibt es keine eindeutige Richtung — dann wird nicht
     geraten, sondern abgelehnt (`stossZiel` in `hoehen.mjs`). */
  b.x = 5; b.y = 5;
  behaupte(pruefeAktion(z2, { typ: AKTION.stoss, wer: 1, ziel: 2 }) !== null,
    "genau über Eck wird nicht gestoßen");
}

/* ══ 6. Zugende, neue Runde, drei Runden mit einem Todesfall ═══════ */
{
  abschnitt("Zugfolge");

  const karte = macheProbekarte();
  const j1 = macheWesen({ id: 1, seite: "jaeger", x: 2, y: 3, flinkheit: 9 });
  const b1 = macheWesen({ id: 2, seite: "brut", x: 4, y: 3, flinkheit: 8 });
  const j2 = macheWesen({
    id: 3, seite: "jaeger", x: 6, y: 3, flinkheit: 7, lp: 40, faehigkeiten: ["blutzoll"]
  });
  const b2 = macheWesen({ id: 4, seite: "brut", x: 8, y: 3, flinkheit: 6, lp: 5 });
  const zustand = macheZustand(karte, [j1, b1, j2, b2]);

  tiefGleich(zustand.ordnung, [1, 2, 3, 4], "die Ordnung folgt der Flinkheit");
  gleich(amZugWesen(zustand).id, 1, "der Flinkste beginnt");
  gleich(seiteFertig(zustand), false, "nach den Jägern kommt noch ein Jäger");

  const gesehen = [];
  const runden = [];
  let schutz = 0;
  while (!zustand.vorbei && zustand.runde <= 3 && schutz < 40) {
    const dran = amZugWesen(zustand);
    if (!dran) break;
    gesehen.push(dran.id);
    runden.push(zustand.runde);
    /* Der Todesfall mitten in der Runde: fester Schaden, kein
       Trefferwurf — die Zugordnung soll geprüft werden, nicht das
       Würfelglück. */
    if (dran.id === 3 && zustand.runde === 1) {
      const tot = wendeAn(zustand, {
        typ: AKTION.faehigkeit, wer: 3, schluessel: "blutzoll", ziel: 4, feld: null
      });
      behaupte(tot.some((e) => e.art === "gestorben" && e.wer === 4),
        "der Blutzoll tötet die Brut mit fünf Lebenspunkten");
      gleich(j2.lp, 40 - faehigkeit("blutzoll").wirkung.eigenerVerlust,
        "und der Hexer zahlt aus der eigenen Ader");
    }
    wendeAn(zustand, { typ: AKTION.zugEnde, wer: dran.id });
    schutz += 1;
  }

  tiefGleich(gesehen, [1, 2, 3, 1, 2, 3, 1, 2, 3],
    "über drei Runden kommt jeder Lebende genau einmal je Runde dran");
  tiefGleich(runden, [1, 1, 1, 2, 2, 2, 3, 3, 3], "und die Rundennummern zählen mit");
  behaupte(!gesehen.includes(4), "der Tote kommt nicht mehr dran (Fehlerbuch E1)");
  gleich(b2.lebt, false, "und er ist wirklich tot");

  /* Der Zeiger darf beim Todesfall nicht überspringen: In Runde 1 kam
     nach dem Hexer niemand mehr, weil nur die tote Brut folgte —
     aber Runde 2 begann wieder ganz vorn. */
  gleich(zustand.runde, 4, "nach drei Runden steht die vierte an");
  gleich(j1.ap, AP_JE_ZUG, "und jede neue Runde füllt die Punkte auf");
}

/* ══ 7. Zugende beim letzten Wesen startet die Runde ═══════════════ */
{
  abschnitt("Rundenwechsel");

  const karte = macheProbekarte();
  const held = macheWesen({ id: 1, seite: "jaeger", x: 2, y: 3, flinkheit: 9 });
  const brut = macheWesen({ id: 2, seite: "brut", x: 6, y: 3, flinkheit: 4 });
  const zustand = macheZustand(karte, [held, brut]);

  const gegangen = wendeAn(zustand, { typ: AKTION.gehen, wer: 1, nach: { x: 4, y: 3 } });
  gleich(held.ap, AP_JE_ZUG - 2, "zwei Schritte, zwei Punkte");
  /* Der Fall, der ohne die Arbeit falsch wäre: Gehen bezahlt je
     Schritt. Wer zusätzlich die Summe im Voraus abzieht, zahlt
     doppelt — und der Weg bricht mittendrin ab, weil die Punkte
     unterwegs ausgehen. */
  gleich(alleArt(gegangen, "apGesetzt").length, 0,
    "Gehen meldet keinen eigenen Punkteabzug — der Rest steht im bewegt");
  gleich(ersteArt(gegangen, "bewegt").apRest, held.ap,
    "und das bewegt nennt genau die Punkte, die übrig sind");
  gleich(seiteFertig(zustand), true, "dies ist der letzte Zug der Jäger in dieser Runde");

  const nachErstem = wendeAn(zustand, { typ: AKTION.zugEnde, wer: 1 });
  tiefGleich(artenVon(nachErstem), ["zugEnde", "seiteDran"],
    "das erste Zugende rückt nur weiter und meldet den Seitenwechsel");
  gleich(zustand.runde, 1, "die Runde läuft noch");
  gleich(amZugWesen(zustand).id, 2, "jetzt ist die Brut dran");

  /* `zugBeenden` von Hand gerufen muss dasselbe tun wie die Aktion
     `zugEnde` — sonst hätte das Netz zwei Wege, einen Zug zu beenden,
     und einer davon liefe irgendwann anders. */
  const nachZweitem = zugBeenden(zustand);
  gleich(zustand.runde, 2, "das letzte Zugende startet die neue Runde");
  behaupte(artenVon(nachZweitem).includes("rundeNeu"), "und meldet sie");
  gleich(held.ap, AP_JE_ZUG, "die Punkte des Helden sind aufgefüllt");
  gleich(brut.ap, AP_JE_ZUG, "die der Brut auch");
  gleich(amZugWesen(zustand).id, 1, "und der Flinkste ist wieder dran");
}

/* ══ 8. Die Wacht mitten in der Bewegung (Fehlerbuch E3) ═══════════ */
{
  abschnitt("Wacht");

  /* Der Wächter steht auf (2,4) mit dem Wurfmesser (Reichweite 4).
     Der Läufer startet auf (10,4) und will nach (3,4). Erst auf (6,4)
     ist er in Reichweite — also nach vier von sieben Schritten. Wer
     die Bewegung als eine einzige Verschiebung baut, schießt entweder
     gar nicht oder erst am Ziel; beides fällt hier durch. */
  function wachtLauf(saat, lebenDesLaeufers) {
    const karte = macheProbekarte();
    const wache = macheWesen({
      id: 1, seite: "jaeger", x: 2, y: 4, flinkheit: 9, waffe: "wurfmesser"
    });
    const laeufer = macheWesen({
      id: 2, seite: "brut", x: 10, y: 4, flinkheit: 1,
      lp: lebenDesLaeufers, apMax: 8, ap: 8
    });
    /* Eine zweite Brut weit außerhalb jeder Reichweite: Ohne sie
       endete der Lauf mit dem Läufer, und man sähe nicht mehr, ob
       der Zeiger nach seinem Tod weiterrückt. */
    const hinten = macheWesen({ id: 3, seite: "brut", x: 14, y: 8, flinkheit: 0 });
    const zustand = macheZustand(karte, [wache, laeufer, hinten], saat);
    wendeAn(zustand, { typ: AKTION.wacht, wer: 1 });
    wendeAn(zustand, { typ: AKTION.zugEnde, wer: 1 });
    const ereignisse = wendeAn(zustand, { typ: AKTION.gehen, wer: 2, nach: { x: 3, y: 4 } });
    return { zustand, wache, laeufer, ereignisse };
  }

  const lauf = wachtLauf(41, 40);
  gleich(lauf.wache.ap, 0, "die Wacht hat alle Punkte gekostet");
  const wachtLoest = ersteArt(lauf.ereignisse, "wachtLoest");
  behaupte(wachtLoest !== null, "die Wacht löst während der Bewegung aus");
  gleich(wachtLoest && wachtLoest.wer, 1, "und zwar beim Wächter");
  gleich(wachtLoest && wachtLoest.ziel, 2, "auf den Läufer");

  /* Ohne Fundstück wird mit einem leeren Ersatzpfad weitergeprüft:
     Eine Prüfung, die beim ersten Fehler mit einem Absturz endet,
     verschweigt alle folgenden. */
  const bewegungen = alleArt(lauf.ereignisse, "bewegt");
  gleich(bewegungen.length, 2,
    "die Bewegung zerfällt in zwei Abschnitte — vor und nach dem Wurf");
  const ersterPfad = bewegungen.length > 0 ? bewegungen[0].pfad : [];
  const erstesFeld = ersterPfad[0] || {};
  const letztesFeld = ersterPfad[ersterPfad.length - 1] || {};
  gleich(letztesFeld.x, 6,
    "der erste Abschnitt endet genau dort, wo der Läufer in Reichweite trat");
  gleich(erstesFeld.x, 10, "und beginnt beim Startfeld");
  gleich(erstesFeld.kosten, 0, "das Startfeld kostet nichts");
  gleich(letztesFeld.kosten, 4, "vier Schritte bis dorthin");
  behaupte(artenVon(lauf.ereignisse).indexOf("bewegt")
    < artenVon(lauf.ereignisse).indexOf("wachtLoest"),
  "erst der Weg, dann der Wurf");
  gleich(lauf.laeufer.x, 3, "wer überlebt, kommt trotzdem an");
  gleich(lauf.wache.wacht, false, "die Wacht ist danach verbraucht");

  /* Vierzig Saaten durch dieselbe Stellung, mit einem Läufer, den
     jeder Treffer tötet (Wurfmesser macht mindestens 2). Geprüft wird
     nicht eine Saat, sondern die Regel: Jeder tödliche Lauf endet an
     der Stelle des Wurfs, jeder überlebte am Ziel. */
  let getroffen = 0;
  let verfehlt = 0;
  for (let saat = 1; saat <= 40; saat++) {
    const l = wachtLauf(saat, 2);
    const schuss = ersteArt(l.ereignisse, "angriff");
    if (!behaupte(schuss !== null, `Saat ${saat}: es wird geworfen`)) continue;
    if (schuss.treffer) {
      getroffen += 1;
      gleich(l.laeufer.lebt, false, `Saat ${saat}: der Treffer tötet`);
      gleich(l.laeufer.x, 6, `Saat ${saat}: die Bewegung bricht am Ort des Wurfs ab`);
      gleich(alleArt(l.ereignisse, "bewegt").length, 1,
        `Saat ${saat}: nach dem Tod kommt kein zweiter Abschnitt`);
      behaupte(artenVon(l.ereignisse).includes("zugEnde"),
        `Saat ${saat}: wer im eigenen Zug fällt, hat den Zug beendet`);
      behaupte(amZugWesen(l.zustand) === null
        || amZugWesen(l.zustand).id !== 2,
      `Saat ${saat}: der Zeiger steht nicht auf der Leiche`);
    } else {
      verfehlt += 1;
      gleich(l.laeufer.x, 3, `Saat ${saat}: nach einem Fehlwurf geht es weiter`);
      gleich(alleArt(l.ereignisse, "bewegt").length, 2,
        `Saat ${saat}: und zwar in einem zweiten Abschnitt`);
    }
  }
  behaupte(getroffen > 0, "unter vierzig Saaten wird mindestens einmal getroffen");
  behaupte(verfehlt > 0, "und mindestens einmal daneben — beide Fälle sind geprüft");

  /* Die Wacht schießt nicht auf die eigene Seite, und ein Wächter
     ohne Sichtlinie schweigt. */
  const karte = macheProbekarte();
  for (let y = 0; y < karte.hoehe; y++) karte.setze(7, y, { hindernis: HINDERNIS.wand });
  const wache = macheWesen({
    id: 1, seite: "jaeger", x: 2, y: 4, flinkheit: 9, waffe: "kurzbogen"
  });
  const laeufer = macheWesen({
    id: 2, seite: "brut", x: 10, y: 4, flinkheit: 1, apMax: 8, ap: 8
  });
  const zustand = macheZustand(karte, [wache, laeufer]);
  wendeAn(zustand, { typ: AKTION.wacht, wer: 1 });
  wendeAn(zustand, { typ: AKTION.zugEnde, wer: 1 });
  const hinterDerWand = wendeAn(zustand, { typ: AKTION.gehen, wer: 2, nach: { x: 9, y: 6 } });
  gleich(alleArt(hinterDerWand, "wachtLoest").length, 0,
    "durch die Wand schießt die Wacht nicht");
  gleich(wache.wacht, true, "und bleibt stehen");
}

/* ══ 9. Trefferrechnung: Höhe und Deckung ══════════════════════════ */
{
  abschnitt("Trefferrechnung");

  function schiess(bauen) {
    const karte = macheProbekarte();
    const schuetze = macheWesen({
      id: 1, seite: "jaeger", x: 2, y: 4, flinkheit: 9, waffe: "kurzbogen"
    });
    const ziel = macheWesen({ id: 2, seite: "brut", x: 5, y: 4, lp: 60, flinkheit: 1 });
    bauen(karte, schuetze, ziel);
    const zustand = macheZustand(karte, [schuetze, ziel]);
    const erwartet = trefferChance(karte, schuetze, ziel, waffe(schuetze.waffe));
    const ereignisse = wendeAn(zustand, { typ: AKTION.angriff, wer: 1, ziel: 2 });
    const schuss = ersteArt(ereignisse, "angriff");
    return { chance: schuss.chance, waffe: schuss.waffe, erwartet };
  }

  /* Der Fall, der ohne die Arbeit falsch wäre: dass `aktionen.mjs`
     die Trefferchance **selbst** ausrechnet. Verglichen wird deshalb
     nicht mit einer hier nachgebauten Formel — die wäre nur eine
     zweite Kopie —, sondern mit dem, was `spiel/kampf.mjs` sagt. */
  const bogen = waffe("kurzbogen");
  const eben = schiess(() => {});
  gleich(eben.waffe, "kurzbogen", "das Ereignis nennt die Waffe");
  nahe(eben.chance, eben.erwartet, 1e-12,
    "die Chance im Ereignis ist die aus der Kampfrechnung, keine zweite Formel");

  /* Und die Richtung stimmt: Wer die beiden Stellungen vertauscht
     übergibt, bekommt hier das falsche Vorzeichen (Fehlerbuch A4). */
  const vonOben = schiess((karte, schuetze) => {
    karte.setze(schuetze.x, schuetze.y, { ebene: 3 });
  });
  nahe(vonOben.chance - eben.chance, HOEHEN_TREFFER_BONUS, 1e-12,
    "von oben genau ein Höhenbonus mehr");

  const vonUnten = schiess((karte, schuetze) => {
    karte.setze(schuetze.x, schuetze.y, { ebene: 0 });
  });
  nahe(vonUnten.chance - eben.chance, -HOEHEN_TREFFER_BONUS, 1e-12,
    "von unten genau einer weniger — beide Richtungen einzeln geprüft");

  const hinterDeckung = schiess((karte) => {
    /* Das Fass liegt zwischen Ziel und Schütze — nur dort zählt es. */
    karte.setze(4, 4, { hindernis: HINDERNIS.fass });
  });
  nahe(hinterDeckung.chance - eben.chance, -DECKUNG_MALUS, 1e-12,
    "ein Fass in Angreiferrichtung nimmt genau den Deckungsmalus");

  const dahinter = schiess((karte) => {
    karte.setze(6, 4, { hindernis: HINDERNIS.fass });
  });
  nahe(dahinter.chance, eben.chance, 1e-12,
    "ein Fass hinter dem Ziel nützt ihm nichts");
  behaupte(eben.chance < bogen.trefferGrund,
    "und das flinke Ziel weicht aus — sonst prüfte der Vergleich nur sich selbst");

  /* Derselbe Fall für den Angriff: Die Punkte zieht `spiel/kampf.mjs`
     ab. Zöge `wendeAn` sie noch einmal ab, stünden hier zwei
     `apGesetzt` und der Schütze wäre nach zwei Schüssen leer statt
     nach drei. */
  const karteAP = macheProbekarte();
  const schuetzeAP = macheWesen({
    id: 1, seite: "jaeger", x: 2, y: 4, flinkheit: 9, waffe: "kurzbogen"
  });
  const zielAP = macheWesen({ id: 2, seite: "brut", x: 5, y: 4, lp: 60, flinkheit: 1 });
  const zAP = macheZustand(karteAP, [schuetzeAP, zielAP]);
  const geschossen = wendeAn(zAP, { typ: AKTION.angriff, wer: 1, ziel: 2 });
  gleich(schuetzeAP.ap, AP_JE_ZUG - waffe("kurzbogen").ap,
    "ein Schuss kostet genau einmal den Waffenpreis");
  gleich(alleArt(geschossen, "apGesetzt").length, 1,
    "und meldet genau einen Punkteabzug");

  /* Rüstung und Durchschlag. Der Rohschaden des Feuerkelchs streut,
     also wird nicht die Zahl geprüft, sondern die Regel: Ein Treffer
     tut immer mindestens einen Punkt weh, auch durch dicke Rüstung. */
  const karte = macheProbekarte();
  const held = macheWesen({ id: 1, seite: "jaeger", x: 2, y: 4, flinkheit: 9 });
  const panzer = macheWesen({
    id: 2, seite: "brut", x: 3, y: 4, lp: 60, ruestung: 20, flinkheit: 1
  });
  const zustand = macheZustand(karte, [held, panzer]);
  wirkungAnhaengen(panzer, "schild", 2, 5);
  gleich(ruestungVon(panzer), 25, "der Schild zählt zur Rüstung");
  let treffer = null;
  for (let i = 0; i < 3 && treffer === null; i++) {
    const e = wendeAn(zustand, { typ: AKTION.angriff, wer: 1, ziel: 2 });
    treffer = ersteArt(e, "schaden");
  }
  behaupte(treffer === null || treffer.wieviel === 1,
    "durch 25 Rüstung bleibt genau der Mindestschaden übrig");
}

/* ══ 10. Zweimal dasselbe: byteweise gleich ════════════════════════ */
{
  abschnitt("Gleichlauf");

  function lauf(saat) {
    const karte = macheProbekarte();
    karte.setze(3, 2, { hindernis: HINDERNIS.truhe });
    const held = macheWesen({
      id: 1, seite: "jaeger", x: 2, y: 4, flinkheit: 9, waffe: "beilpaar",
      ap: 12, apMax: 12, faehigkeiten: ["wuchtstoss"],
      eigenheit: { art: "truhenmeister", leise: true }
    });
    const brut = macheWesen({
      id: 2, seite: "brut", x: 3, y: 4, lp: 60, flinkheit: 4, waffe: "hetzerbiss"
    });
    const zustand = macheZustand(karte, [held, brut], saat);
    const alles = [];
    const tu = (aktion) => { alles.push(...wendeAn(zustand, aktion)); };

    tu({ typ: AKTION.angriff, wer: 1, ziel: 2 });
    tu({ typ: AKTION.faehigkeit, wer: 1, schluessel: "wuchtstoss", ziel: 2, feld: null });
    tu({ typ: AKTION.gehen, wer: 1, nach: { x: 3, y: 3 } });
    tu({ typ: AKTION.aufheben, wer: 1 });
    tu({ typ: AKTION.zugEnde, wer: 1 });
    tu({ typ: AKTION.gehen, wer: 2, nach: { x: 6, y: 5 } });
    tu({ typ: AKTION.wacht, wer: 2 });
    tu({ typ: AKTION.zugEnde, wer: 2 });
    return { ereignisse: alles, abdruck: abdruck(zustand) };
  }

  const erster = lauf(41);
  const zweiter = lauf(41);
  gleich(JSON.stringify(erster.ereignisse), JSON.stringify(zweiter.ereignisse),
    "dieselbe Saat und dieselbe Aktionsfolge geben byteweise dieselben Ereignisse");
  gleich(erster.abdruck, zweiter.abdruck, "und byteweise denselben Zustand");
  behaupte(erster.ereignisse.length > 12,
    "und die Probe ist nicht leer — sie deckt Angriff, Stoß, Weg, Beute und Wacht ab");

  const anderer = lauf(7);
  behaupte(JSON.stringify(anderer.ereignisse) !== JSON.stringify(erster.ereignisse),
    "eine andere Saat gibt etwas anderes — sonst prüfte der Vergleich nichts");

  /* Der Fall, der ohne die Arbeit falsch wäre: dass `aktionen.mjs`
     dem Zufallsstrom **eigene** Würfe entnimmt — einen Ausweichwurf,
     eine Beuteprobe, irgendetwas neben dem, was `spiel/kampf.mjs`
     zieht. Das fiele im Spiel nie auf; im Netz-Koop liefen davon
     sämtliche späteren Würfe auseinander (Fehlerbuch B4).

     Nachgerechnet wird deshalb aus der Ereignisliste selbst: je
     `angriff`-Ereignis ein Trefferwurf, bei einem Treffer dazu die
     Würfel der Waffe. Steht der Strom danach genau dort, wurde nichts
     zusätzlich gezogen. */
  const beil = waffe("beilpaar");
  let mitTreffer = 0;
  let mitZweitemWurf = 0;
  for (let saat = 1; saat <= 12; saat++) {
    const karte = macheProbekarte();
    const held = macheWesen({
      id: 1, seite: "jaeger", x: 2, y: 4, flinkheit: 9, waffe: "beilpaar"
    });
    const brut = macheWesen({ id: 2, seite: "brut", x: 3, y: 4, lp: 99, flinkheit: 1 });
    const zustand = macheZustand(karte, [held, brut], saat);
    const ereignisse = wendeAn(zustand, { typ: AKTION.angriff, wer: 1, ziel: 2 });

    const wuerfe = alleArt(ereignisse, "angriff");
    behaupte(wuerfe.length >= 1 && wuerfe.length <= 2,
      `Saat ${saat}: das Beilpaar wirft ein- oder zweimal`);
    const getroffen = wuerfe[wuerfe.length - 1].treffer;
    if (getroffen) mitTreffer += 1;
    if (wuerfe.length === 2) mitZweitemWurf += 1;

    const vergleich = macheZufall(saat);
    for (let i = 0; i < wuerfe.length; i++) vergleich.zahl();
    if (getroffen) {
      for (let i = 0; i < beil.wuerfel.anzahl; i++) vergleich.ganz(1, beil.wuerfel.seiten);
    }
    gleich(zustand.zufall.zustand(), vergleich.zustand(),
      `Saat ${saat}: der Strom steht genau so weit, wie die Ereignisse sagen`);
  }
  behaupte(mitTreffer > 0,
    "und unter zwölf Saaten trifft das Beilpaar wenigstens einmal — sonst prüfte "
    + "der Stromvergleich den Treffer-Fall gar nicht");
  behaupte(mitZweitemWurf > 0,
    "und geht wenigstens einmal der erste Wurf daneben — sonst bliebe der zweite "
    + "Wurf des Beilpaars ungeprüft");
}

/* ══ 11. Fähigkeiten: Abklingen, Sprung, Licht, Heilung ════════════ */
{
  abschnitt("Fähigkeiten");

  const karte = macheProbekarte();
  /* Eine Kante ohne Rampe: Ebene 2 neben Ebene 1. Hinauf kommt hier
     nur, wer springt — das ist der ganze Sinn des Satzsprungs. */
  for (const y of [3, 4, 5]) karte.setze(6, y, { ebene: 2 });
  karte.setze(6, 4, { rampe: RAMPE.keine });
  const spaeher = macheWesen({
    id: 1, seite: "jaeger", x: 4, y: 4, flinkheit: 9,
    faehigkeiten: ["satzsprung", "weitblick"], sicht: 10
  });
  const brut = macheWesen({ id: 2, seite: "brut", x: 12, y: 4, flinkheit: 1 });
  const zustand = macheZustand(karte, [spaeher, brut]);

  behaupte(pruefeAktion(zustand, { typ: AKTION.gehen, wer: 1, nach: { x: 6, y: 4 } }) !== null,
    "ohne Rampe kommt niemand die Kante hinauf");

  const sprung = wendeAn(zustand, {
    typ: AKTION.faehigkeit, wer: 1, schluessel: "satzsprung", ziel: null, feld: { x: 6, y: 4 }
  });
  gleich(spaeher.x, 6, "der Satzsprung trägt über die Kante");
  gleich(karte.ebeneBei(spaeher.x, spaeher.y), 2, "und eine Ebene hinauf");
  behaupte(artenVon(sprung).includes("ebeneGewechselt"), "der Ebenenwechsel wird gemeldet");
  gleich(spaeher.ap, AP_JE_ZUG - faehigkeit("satzsprung").ap, "und kostet, was im Katalog steht");

  gleich(abklingtNoch(spaeher, "satzsprung"), true, "danach klingt er ab");
  behaupte(pruefeAktion(zustand, {
    typ: AKTION.faehigkeit, wer: 1, schluessel: "satzsprung", ziel: null, feld: { x: 4, y: 4 }
  }) === "Diese Fähigkeit klingt noch ab.", "und ist in derselben Runde nicht wieder da");

  /* `abklingen: 2` heißt: benutzt in Runde 1, frei in Runde 3. */
  zustand.runde = 2; starteRunde(zustand);
  gleich(abklingtNoch(spaeher, "satzsprung"), true, "in Runde 2 klingt er noch ab");
  zustand.runde = 3; starteRunde(zustand);
  gleich(abklingtNoch(spaeher, "satzsprung"), false, "in Runde 3 ist er wieder da");

  const weit = wendeAn(zustand, {
    typ: AKTION.faehigkeit, wer: 1, schluessel: "weitblick", ziel: null, feld: null
  });
  gleich(sichtVon(spaeher), 10 + faehigkeit("weitblick").wirkung.zusatz,
    "Weitblick schlägt auf die Sichtweite auf");
  gleich(weit.length >= 1, true, "und meldet wenigstens den Punkteabzug");

  /* Licht: ein neues Licht liegt in der Karte und erlischt wieder. */
  const karte2 = macheProbekarte();
  const priester = macheWesen({
    id: 1, seite: "jaeger", x: 4, y: 4, flinkheit: 9, faehigkeiten: ["flammenruf"]
  });
  const b2 = macheWesen({ id: 2, seite: "brut", x: 12, y: 4, flinkheit: 1 });
  const z2 = macheZustand(karte2, [priester, b2]);
  const vorher = karte2.lichter.length;
  const gelegt = wendeAn(z2, {
    typ: AKTION.faehigkeit, wer: 1, schluessel: "flammenruf", ziel: null, feld: { x: 7, y: 4 }
  });
  gleich(karte2.lichter.length, vorher + 1, "das Licht liegt in der Karte");
  const neu = ersteArt(gelegt, "lichtNeu");
  behaupte(neu !== null && neu.lichtArt === "fackel" && neu.x === 7,
    "und wird als lichtNeu mit seiner Lichtart gemeldet");
  const brennt = faehigkeit("flammenruf").wirkung.runden;
  for (let i = 0; i < brennt; i++) { z2.runde += 1; starteRunde(z2); }
  gleich(karte2.lichter.length, vorher, "nach seinen Runden ist es aus");

  /* Heilung: `lpGesetzt` statt eines negativen Schadens. */
  const karte3 = macheProbekarte();
  const hexer = macheWesen({
    id: 1, seite: "jaeger", x: 4, y: 4, lp: 30, lpMax: 30, flinkheit: 9,
    faehigkeiten: ["blutbund"]
  });
  const kamerad = macheWesen({
    id: 3, seite: "jaeger", x: 5, y: 4, lp: 5, lpMax: 30, flinkheit: 2
  });
  const feind = macheWesen({ id: 2, seite: "brut", x: 12, y: 4, flinkheit: 1 });
  const z3 = macheZustand(karte3, [hexer, kamerad, feind]);
  const geheilt = wendeAn(z3, {
    typ: AKTION.faehigkeit, wer: 1, schluessel: "blutbund", ziel: 3, feld: null
  });
  const wirkung = faehigkeit("blutbund").wirkung;
  gleich(kamerad.lp, 5 + wirkung.wieviel, "der Kamerad ist geheilt");
  gleich(hexer.lp, 30 - wirkung.eigenerVerlust, "und der Hexer hat dafür bezahlt");
  behaupte(artenVon(geheilt).includes("lpGesetzt"), "die Heilung wird als lpGesetzt gemeldet");
  behaupte(pruefeAktion(z3, {
    typ: AKTION.faehigkeit, wer: 1, schluessel: "blutbund", ziel: 2, feld: null
  }) !== null, "geheilt wird nur die eigene Seite");
}

/* ══ 12. Trank und Beute ═══════════════════════════════════════════ */
{
  abschnitt("Trank und Beute");

  const karte = macheProbekarte();
  karte.setze(3, 4, { hindernis: HINDERNIS.truhe });
  const raeuber = macheWesen({
    id: 1, seite: "jaeger", x: 2, y: 4, lp: 10, lpMax: 30, flinkheit: 9,
    eigenheit: { art: "truhenmeister", leise: true }
  });
  const brut = macheWesen({ id: 2, seite: "brut", x: 12, y: 4, flinkheit: 1 });
  const zustand = macheZustand(karte, [raeuber, brut]);

  behaupte(pruefeAktion(zustand, { typ: AKTION.trank, wer: 1 }) !== null,
    "ohne Trank im Gepäck geht kein Trank");

  const beute = wendeAn(zustand, { typ: AKTION.aufheben, wer: 1 });
  gleich(karte.hindernisBei(3, 4), HINDERNIS.keins, "die Truhe ist offen");
  const weg = ersteArt(beute, "hindernisWeg");
  behaupte(weg !== null && weg.was === HINDERNIS.truhe, "und wird als hindernisWeg gemeldet");
  gleich(alleArt(beute, "beute").length, 2,
    "der Truhenmeister bekommt zwei Stücke — dafür kommt er mit");

  raeuber.traenke = 1;
  const getrunken = wendeAn(zustand, { typ: AKTION.trank, wer: 1 });
  gleich(raeuber.lp, 10 + TRANK_HEILUNG, "der Trank heilt");
  gleich(raeuber.traenke, 0, "und ist danach weg");
  behaupte(artenVon(getrunken).includes("lpGesetzt"), "gemeldet als lpGesetzt");
}

/* ══ 13. Was ginge jetzt ═══════════════════════════════════════════ */
{
  abschnitt("Mögliche Aktionen");

  const karte = macheProbekarte();
  karte.setze(3, 3, { hindernis: HINDERNIS.truhe });
  const held = macheWesen({
    id: 1, seite: "jaeger", x: 3, y: 4, flinkheit: 9, waffe: "kurzbogen",
    faehigkeiten: ["wuchtstoss", "schildwall"], traenke: 1
  });
  const brut = macheWesen({ id: 2, seite: "brut", x: 4, y: 4, lp: 40, flinkheit: 1 });
  const zustand = macheZustand(karte, [held, brut]);

  const moeglich = moeglicheAktionen(zustand, held);
  behaupte(moeglich.length > 5, "es gibt mehr als eine Handvoll Möglichkeiten");

  /* Die Eigenschaft, an der alles hängt: Was hier steht, muss
     `wendeAn` auch annehmen. Zwei Wahrheiten über „erlaubt" gäbe es
     sonst, und die Gegner-KI liefe irgendwann in eine Ablehnung. */
  let abgelehnt = 0;
  for (const aktion of moeglich) if (pruefeAktion(zustand, aktion) !== null) abgelehnt += 1;
  gleich(abgelehnt, 0, "jede vorgeschlagene Aktion wird auch angenommen");

  const arten = new Set(moeglich.map((a) => a.typ));
  behaupte(arten.has(AKTION.zugEnde), "Zug beenden geht immer");
  behaupte(arten.has(AKTION.angriff), "der Gegner ist beschießbar");
  behaupte(arten.has(AKTION.stoss), "und stoßbar, weil er daneben steht");
  behaupte(arten.has(AKTION.gehen), "und es gibt Felder zum Gehen");
  behaupte(arten.has(AKTION.trank), "der Trank steht bereit");
  behaupte(arten.has(AKTION.aufheben), "die Truhe nebenan auch");
  behaupte(arten.has(AKTION.faehigkeit), "und die Fähigkeiten");

  /* Zweimal gefragt gibt zweimal dasselbe — sonst schlüge die
     Gegner-KI auf zwei Rechnern verschiedene Züge vor. */
  gleich(JSON.stringify(moeglicheAktionen(zustand, held)), JSON.stringify(moeglich),
    "und die Liste ist bei gleicher Lage byteweise dieselbe");

  gleich(moeglicheAktionen(zustand, brut).length, 0,
    "wer nicht am Zug ist, hat keine Möglichkeiten");

  const ohnePunkte = macheWesen({ id: 3, seite: "jaeger", x: 8, y: 8, flinkheit: 1 });
  ohnePunkte.ap = 0;
  const z2 = macheZustand(macheProbekarte(), [ohnePunkte,
    macheWesen({ id: 4, seite: "brut", x: 12, y: 2, flinkheit: 0 })]);
  ohnePunkte.ap = 0;
  const wenig = moeglicheAktionen(z2, ohnePunkte);
  tiefGleich(wenig.map((a) => a.typ), ["zugEnde"],
    "ohne Punkte bleibt genau das Zugende übrig");
}

/* ══ 14. Das Ende des Laufs ════════════════════════════════════════ */
{
  abschnitt("Lauf-Ende");

  const karte = macheProbekarte();
  const held = macheWesen({
    id: 1, seite: "jaeger", x: 4, y: 4, lp: 40, flinkheit: 9, faehigkeiten: ["blutzoll"]
  });
  const brut = macheWesen({ id: 2, seite: "brut", x: 6, y: 4, lp: 5, flinkheit: 1 });
  const zustand = macheZustand(karte, [held, brut]);

  gleich(pruefeLaufEnde(zustand), null, "solange beide Seiten stehen, läuft der Lauf");
  const ereignisse = wendeAn(zustand, {
    typ: AKTION.faehigkeit, wer: 1, schluessel: "blutzoll", ziel: 2, feld: null
  });
  const schluss = ersteArt(ereignisse, "laufEnde");
  behaupte(schluss !== null, "die letzte gefallene Brut beendet den Lauf");
  gleich(schluss.grund, "sieg", "als Sieg");
  gleich(zustand.vorbei, "sieg", "und das steht im Zustand");
  gleich(amZugWesen(zustand), null, "danach ist niemand mehr dran");
  behaupte(pruefeAktion(zustand, { typ: AKTION.zugEnde, wer: 1 }) === "Der Lauf ist vorbei.",
    "und keine Aktion wird mehr angenommen");

  const karte2 = macheProbekarte();
  const opfer = macheWesen({ id: 1, seite: "jaeger", x: 4, y: 4, lp: 5, flinkheit: 1 });
  const moerder = macheWesen({
    id: 2, seite: "brut", x: 6, y: 4, lp: 40, flinkheit: 9, faehigkeiten: ["blutzoll"]
  });
  const z2 = macheZustand(karte2, [opfer, moerder]);
  const verloren = wendeAn(z2, {
    typ: AKTION.faehigkeit, wer: 2, schluessel: "blutzoll", ziel: 1, feld: null
  });
  gleich(ersteArt(verloren, "laufEnde").grund, "niederlage",
    "fällt der letzte Jäger, ist der Lauf verloren");
}

ende("Zug und Aktionen");
