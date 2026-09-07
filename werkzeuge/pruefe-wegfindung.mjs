/* [Aufgabe: Prüfwesen] Prüft die Wegfindung aus `spiel/wegfindung.mjs` —
   Kosten, Höhen, Sperren, Stürze und vor allem den Gleichstand.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Eine Wegsuche ist schnell so gebaut, dass sie „meistens einen guten
   Weg" findet. Genau das reicht hier nicht: Vier Rechner rechnen
   denselben Zug nach (`spiel/zufall.mjs`), und wenn einer bei zwei
   gleich teuren Wegen den anderen wählt, steht dieselbe Figur auf zwei
   Rechnern woanders. Geprüft wird deshalb ausdrücklich der Fall, der
   ohne die Arbeit **falsch** wäre:

   · Der Gleichstand selbst. Zwischen (0,0) und (5,5) liegen auf
     offener Fläche 252 gleich lange Wege. Die Prüfung nennt den einen,
     der herauskommen muss, und begründet ihn aus der Regel — nicht aus
     dem, was das Verfahren gerade tut. Jede andere Vorfahrtsregel
     fällt hier durch.
   · Zwei gleich lange Gänge um einen Block herum: Es muss immer
     derselbe genommen werden.
   · 200 Suchen, zwischen drei Karten hin- und hergewechselt. Das
     fängt den Fehler, der bei zweihundert Läufen hintereinander auf
     derselben Karte nie auffiele: einen Rest, der zwischen zwei
     Suchen im Modul liegen bleibt.
   · Aufstieg nur über die Rampe, und nur über **eine** Ebene. Der
     naive Bau addiert einfach die Nachbarn und läuft senkrechte Wände
     hinauf.
   · Wasser und Rampe zusammen — drei Punkte für einen Schritt. Wer
     die Preise selbst rechnet statt `hoehen.mjs` zu fragen, kommt hier
     auf zwei.
   · Ein Sturz ist nur dann ein Weg, wenn er ausdrücklich erlaubt
     **und** billiger ist. Beide Richtungen werden geprüft, denn ein
     Schalter, der immer springt, wäre so falsch wie einer, der es nie
     tut.
   · Und gegen ein zweites, stumpfes Verfahren: Dieselben Karten
     werden mit einer schlichten Wiederholungsrechnung durchgerechnet,
     die nichts von Halden und Vorfahrt weiß. Beide müssen auf dieselben
     Kosten kommen — sonst ist die Vorfahrtsregel zwar eindeutig, aber
     die Wege sind nicht die billigsten.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/helfer.mjs` (das Prüfgerüst), `spiel/wegfindung.mjs` (das
   Geprüfte), `spiel/hoehen.mjs` (die Preise, gegen die nachgerechnet
   wird), `spiel/gitter.mjs` und `spiel/zufall.mjs` (die Karten),
   `werkzeuge/pruefe-alles.mjs` (startet diese Datei als eigenen Prozess
   und liest den Rückgabewert). */

import { abschnitt, behaupte, gleich, tiefGleich, wirft, ende } from "./helfer.mjs";
import {
  macheKarte, alleFelder, richtungen, RAMPE, HINDERNIS, FLUESSIG, abstand,
  RICHTUNGEN_GERADE, RICHTUNGEN_UNGERADE
} from "../spiel/gitter.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { laufKosten, sturzTiefe } from "../spiel/hoehen.mjs";
import {
  erreichbareFelder, wegSuche, pfadAus, naechstesFreiesFeld
} from "../spiel/wegfindung.mjs";

/* ── Werkzeug der Prüfung ───────────────────────────────────────── */

const kostenVon = (felder, karte, x, y) => {
  const eintrag = felder.get(karte.index(x, y));
  return eintrag === undefined ? null : eintrag.kosten;
};

/* Läuft einen gemeldeten Weg Schritt für Schritt mit den Preisen aus
   `hoehen.mjs` nach. Das ist die eigentliche Gegenprobe: Die Summe
   allein kann stimmen, während der Weg durch eine Wand führt. */
function wegIstEcht(karte, pfad, stuerzeErlaubt = false) {
  if (!Array.isArray(pfad) || pfad.length === 0) return false;
  if (pfad[0].kosten !== 0) return false;
  for (let i = 1; i < pfad.length; i++) {
    const vorher = pfad[i - 1];
    const jetzt = pfad[i];
    const schritt = laufKosten(karte, vorher.x, vorher.y, jetzt.x, jetzt.y);
    if (schritt === null) return false;
    if (jetzt.kosten !== vorher.kosten + schritt) return false;
    if (stuerzeErlaubt) continue;
    if (sturzTiefe(karte, vorher.x, vorher.y, jetzt.x, jetzt.y) > 0) return false;
  }
  return true;
}

function hatSturz(karte, pfad) {
  for (let i = 1; i < pfad.length; i++) {
    const v = pfad[i - 1];
    const n = pfad[i];
    if (sturzTiefe(karte, v.x, v.y, n.x, n.y) > 0) return true;
  }
  return false;
}

/* Das zweite Verfahren: keine Halde, keine Vorfahrt, keine Abkürzung —
   es wiederholt einfach jede Entspannung über alle Felder, bis sich
   nichts mehr ändert. Langsam, aber offensichtlich richtig, und es
   teilt mit der Wegfindung keine einzige Zeile. */
function kostenStumpf(karte, vx, vy, ap, belegt = () => false) {
  const beste = new Map([[karte.index(vx, vy), 0]]);
  let geaendert = true;
  while (geaendert) {
    geaendert = false;
    for (const { x, y, i } of alleFelder(karte)) {
      const hier = beste.get(i);
      if (hier === undefined) continue;
      for (const r of richtungen(y)) {
        const nx = x + r.dx;
        const ny = y + r.dy;
        if (!karte.drin(nx, ny) || belegt(nx, ny)) continue;
        const schritt = laufKosten(karte, x, y, nx, ny);
        if (schritt === null) continue;
        if (sturzTiefe(karte, x, y, nx, ny) > 0) continue;
        const neu = hier + schritt;
        if (neu > ap) continue;
        const ni = karte.index(nx, ny);
        const da = beste.get(ni);
        if (da === undefined || neu < da) { beste.set(ni, neu); geaendert = true; }
      }
    }
  }
  return beste;
}

/* Eine Karte mit allem, was die Wegfindung unterscheiden muss: vier
   Ebenen, Wände, Wasser, brauchbare Rampen und ein paar, die ins Leere
   zeigen. Gesät, damit die Prüfung jedes Mal dieselbe misst.

   Die Ebenen werden **blockweise** gewürfelt und nicht Feld für Feld:
   Bei einzeln gewürfelten Höhen wäre fast jeder Schritt ein Sprung
   über zwei Ebenen, und die Probe liefe über eine Karte, auf der
   niemand einen Schritt tut — sie prüfte dann nichts. */
function zufallsKarte(saat) {
  const karte = macheKarte(16, 12);
  const zufall = macheZufall(saat);

  const ebeneJeBlock = new Map();
  for (const { x, y } of alleFelder(karte)) {
    const block = `${(y / 3) | 0},${(x / 4) | 0}`;
    if (!ebeneJeBlock.has(block)) {
      ebeneJeBlock.set(block, zufall.nachGewicht([0, 1, 2, 3], [1, 6, 3, 2]));
    }
    karte.setze(x, y, { ebene: ebeneJeBlock.get(block) });
    if (zufall.trifft(0.10)) {
      karte.setze(x, y, { hindernis: zufall.ausListe([HINDERNIS.wand, HINDERNIS.fass]) });
    }
    if (zufall.trifft(0.12)) karte.setze(x, y, { fluessig: FLUESSIG.wasser });
  }

  /* Rampen erst danach: Sie brauchen die fertigen Ebenen, sonst
     zeigten sie zufällig irgendwohin und die Karte hätte keinen
     einzigen Aufstieg. Ein Zehntel zeigt trotzdem ins Leere — auch
     das muss die Wegfindung aushalten. */
  for (const { x, y } of alleFelder(karte)) {
    const hinauf = [];
    for (const r of richtungen(y)) {
      if (karte.ebeneBei(x + r.dx, y + r.dy) === karte.ebeneBei(x, y) + 1) hinauf.push(r.rampe);
    }
    if (hinauf.length > 0 && zufall.trifft(0.6)) {
      karte.setze(x, y, { rampe: zufall.ausListe(hinauf) });
    }
    else if (zufall.trifft(0.1)) karte.setze(x, y, { rampe: zufall.ganz(1, 4) });
  }

  /* Das Startfeld muss begehbar und trocken sein, sonst misst die
     Probe je nach Saat etwas anderes. Seine **Ebene** bleibt, wie der
     Block sie gewürfelt hat: Setzte man es auf Ebene 1, stünde die
     Figur bei einem hohen Block auf einer Insel, von der aus kein
     einziger Schritt geht — und die Probe prüfte nichts. */
  karte.setze(1, 1, { hindernis: HINDERNIS.keins, fluessig: FLUESSIG.keine });
  return karte;
}

/* Eine Feldkarte in einer Zeichenkette — so lassen sich zwei Läufe
   byteweise vergleichen. */
const alsText = (felder) => [...felder.entries()]
  .map(([i, e]) => `${i}:${e.x},${e.y},${e.kosten},${e.vorher}`).join("|");

/* Was gemessen wurde, steht am Ende der Prüfung — eine Zahl in einer
   Begründung ist nur so viel wert wie der Befehl, der sie nachrechnet. */
const messung = (text) => console.log(`      · ${text}`);

/* Wo zwei Proben zuerst auseinandergehen, -1 wenn nirgends. Zwei
   volle Proben nebeneinander wären mehrere Bildschirme lang; die
   Stelle sagt dasselbe in einer Zahl. */
function ersteAbweichung(a, b) {
  const laenge = a.length > b.length ? a.length : b.length;
  for (let i = 0; i < laenge; i++) if (a[i] !== b[i]) return i;
  return -1;
}

/* Alles, was die Wegfindung auf einer Karte zu sagen hat, in einer
   Zeichenkette: die erreichbare Fläche, ein langer Weg quer darüber
   und ein freier Platz. */
const probeText = (karte) => {
  const felder = erreichbareFelder(karte, 1, 1, 9);
  const weg = wegSuche(karte, { x: 1, y: 1 }, { x: 13, y: 9 });
  const platz = naechstesFreiesFeld(karte, 8, 6, { belegt: (x, y) => x + y < 16 });
  return `${alsText(felder)}#${JSON.stringify(weg)}#${JSON.stringify(platz)}`;
};

/* ── Form und Ränder ────────────────────────────────────────────── */

abschnitt("Form und Ränder");
{
  const k = macheKarte(9, 7);
  const felder = erreichbareFelder(k, 4, 3, 0);
  gleich(felder.size, 1, "ohne Punkte bleibt nur das eigene Feld");
  tiefGleich(felder.get(k.index(4, 3)), { x: 4, y: 3, kosten: 0, vorher: null },
    "das eigene Feld kostet nichts und hat keinen Vorgänger");

  gleich(erreichbareFelder(k, -1, 3, 5).size, 0, "außerhalb der Karte gibt es nichts");
  gleich(erreichbareFelder(k, 4, 3, undefined).size, 1, "ohne Punktangabe nur das eigene Feld");
  gleich(erreichbareFelder(k, 4, 3, NaN).size, 1, "eine unbrauchbare Punktzahl erreicht nichts");
  gleich(erreichbareFelder(k, 4, 3, -5).size, 1, "negative Punkte erreichen nichts");

  wirft(() => erreichbareFelder(k, 1.5, 3, 4), "krumme Koordinaten schlagen an");
  wirft(() => wegSuche(k, { x: 0.5, y: 0 }, { x: 3, y: 3 }), "in der Wegsuche auch");
  wirft(() => naechstesFreiesFeld(k, 1, 2.5), "und beim freien Feld auch");

  gleich(wegSuche(k, { x: 4, y: 3 }, { x: 40, y: 3 }), null, "ein Ziel außerhalb gibt keinen Weg");
  gleich(wegSuche(k, null, { x: 3, y: 3 }), null, "ohne Startfeld auch nicht");
  tiefGleich(wegSuche(k, { x: 4, y: 3 }, { x: 4, y: 3 }),
    { pfad: [{ x: 4, y: 3, kosten: 0 }], kosten: 0 },
    "der Weg zu sich selbst ist ein Feld und kein Schritt");

  gleich(pfadAus(felder, k.index(0, 0)).length, 0, "ein unbekanntes Ziel gibt einen leeren Weg");
  gleich(pfadAus(null, 3).length, 0, "ohne Feldkarte ebenso");

  const geordnet = [...erreichbareFelder(k, 4, 3, 4).keys()];
  gleich(geordnet.join(","), [...geordnet].sort((a, b) => a - b).join(","),
    "die Felder kommen nach Feldindex geordnet, nicht nach Fundzeit");
}

/* ── Gerade Wege ───────────────────────────────────────────────── */

abschnitt("Gerade Wege");
{
  const k = macheKarte(12, 7);
  const w = wegSuche(k, { x: 1, y: 3 }, { x: 6, y: 3 });
  gleich(w.kosten, 5, "fünf Felder nach Osten kosten fünf Punkte");
  gleich(w.pfad.length, 6, "der Pfad trägt das Startfeld vorn");
  gleich(w.pfad[0].kosten, 0, "das Startfeld kostet nichts");
  gleich(w.pfad[5].kosten, 5, "der letzte Eintrag trägt die Summe des ganzen Weges");
  behaupte(wegIstEcht(k, w.pfad), "jeder Schritt ist ein echter Schritt");

  gleich(wegSuche(k, { x: 1, y: 3 }, { x: 9, y: 3 }, { maxKosten: 7 }), null,
    "unter der Obergrenze gibt es keinen Weg");
  gleich(wegSuche(k, { x: 1, y: 3 }, { x: 9, y: 3 }, { maxKosten: 8 }).kosten, 8,
    "genau auf der Obergrenze schon");

  /* Auf freier Fläche ist die Reichweite eine Sechseck-Scheibe. Ihre
     Größe ist nicht abgeschrieben, sondern gerechnet: 1 in der Mitte
     plus 6n je Ring, also 1 + 3n(n+1). Für n = 3 sind das 37. Auf dem
     Quadrat wären es 25 gewesen — eine Raute.

     Gegen die Formel geprüft und nicht gegen eine Zahl, damit diese
     Stelle jede Änderung an der Nachbarschaft bemerkt, statt nur eine
     bestimmte. */
  const REICHT = 3;
  const scheibe = 1 + 3 * REICHT * (REICHT + 1);
  const felder = erreichbareFelder(k, 5, 3, REICHT);
  gleich(felder.size, scheibe,
    `aus ${REICHT} Punkten wird eine Sechseck-Scheibe aus ${scheibe} Feldern`);
  gleich(kostenVon(felder, k, 8, 3), 3, "drei nach Osten kosten drei");
  gleich(kostenVon(felder, k, 7, 4), 2, "schräg nach Südwesten sind es zwei");
  gleich(felder.has(k.index(9, 3)), false, "vier Felder weit reicht es nicht");
}

/* ── Wände ─────────────────────────────────────────────────────── */

abschnitt("Wände");
{
  const k = macheKarte(9, 7);
  for (let y = 0; y < 7; y++) k.setze(4, y, { hindernis: HINDERNIS.wand });
  gleich(wegSuche(k, { x: 1, y: 3 }, { x: 7, y: 3 }), null,
    "durch eine geschlossene Wand führt kein Weg");

  const gesperrt = erreichbareFelder(k, 1, 3, 99);
  let jenseits = 0;
  for (const e of gesperrt.values()) if (e.x >= 4) jenseits++;
  gleich(jenseits, 0, "weder hinter noch in der Wand ist etwas erreichbar");

  k.setze(4, 0, { hindernis: HINDERNIS.keins });
  const w = wegSuche(k, { x: 1, y: 3 }, { x: 7, y: 3 });
  /* Auf dem Quadrat waren es zwölf: drei hinauf, sechs quer, drei
     hinab. Auf dem Sechseck deckt ein schräger Schritt beides zugleich
     ab, deshalb neun. Gegengeprüft mit der Luftlinie, damit hier keine
     abgeschriebene Zahl steht: Kürzer als die Entfernung kann kein Weg
     sein, und mit einer Wand dazwischen ist er länger. */
  gleich(w.kosten, 9, "durch die Lücke sind es neun Punkte");
  behaupte(w.kosten > abstand(1, 3, 7, 3),
    "und das ist mehr als die Luftlinie — die Wand kostet etwas");
  behaupte(w.pfad.some((f) => f.x === 4 && f.y === 0), "und der Weg geht durch die Lücke");
  behaupte(wegIstEcht(k, w.pfad), "auch dieser Weg ist Schritt für Schritt echt");
}

/* ── Rampen und Höhen ──────────────────────────────────────────── */

abschnitt("Rampen und Höhen");
{
  /* Bis x=5 Ebene 1, ab x=6 ein Podest auf Ebene 2. Die einzige Rampe
     liegt auf (5,2) und zeigt nach Osten. */
  const k = macheKarte(12, 5);
  for (const { x, y } of alleFelder(k)) if (x >= 6) k.setze(x, y, { ebene: 2 });
  k.setze(5, 2, { rampe: RAMPE.ost });

  const sechs = erreichbareFelder(k, 1, 2, 6);
  gleich(kostenVon(sechs, k, 5, 2), 4, "vier Schritte bis vor die Rampe");
  gleich(kostenVon(sechs, k, 6, 2), 6, "mit der Rampe sind es genau sechs");
  gleich(erreichbareFelder(k, 1, 2, 5).has(k.index(6, 2)), false,
    "mit fünf Punkten reicht es nicht hinauf");
  gleich(sechs.has(k.index(6, 1)), false, "das Feld dahinter kostet mehr als sechs");

  /* Eine zweite Rampe, die in die falsche Richtung zeigt: Wer nur
     fragt „liegt da eine Rampe?", steigt hier auf und kommt auf 6. */
  k.setze(5, 1, { rampe: RAMPE.suedost });
  const weit = erreichbareFelder(k, 1, 2, 10);
  gleich(kostenVon(weit, k, 6, 1), 7, "die Rampe in die falsche Richtung trägt niemanden hinauf");

  /* Zwei Ebenen auf einmal klettert auch mit Rampe niemand. */
  const hoch = macheKarte(9, 5);
  hoch.setze(4, 2, { ebene: 3 });
  hoch.setze(3, 2, { rampe: RAMPE.ost });
  gleich(wegSuche(hoch, { x: 1, y: 2 }, { x: 4, y: 2 }), null,
    "über zwei Ebenen führt kein Weg, auch nicht über eine Rampe");
  hoch.setze(4, 2, { ebene: 2 });
  gleich(wegSuche(hoch, { x: 1, y: 2 }, { x: 4, y: 2 }).kosten, 4,
    "über eine Ebene mit Rampe: zwei Schritte und zwei für den Anstieg");

  /* Wasser bremst. Eine **einzelne** Pfütze reicht auf dem Sechseck
     als Probe nicht mehr: Es gibt sechs Wege an ihr vorbei, und
     mindestens einer ist gleich lang. Auf dem Quadrat war das anders,
     und die alte Fassung dieser Stelle hat genau deshalb nach der
     Umstellung angeschlagen — zu Recht.

     Geprüft wird deshalb an einem Wassergraben quer über die Karte:
     Dort gibt es kein Vorbei, und die Frage „kostet Nässe wirklich
     etwas" ist wieder eine Frage. */
  const nass = macheKarte(12, 5);
  gleich(wegSuche(nass, { x: 1, y: 2 }, { x: 5, y: 2 }).kosten, 4, "trocken sind es vier");
  for (let y = 0; y < 5; y++) nass.setze(3, y, { fluessig: FLUESSIG.wasser });
  const durch = wegSuche(nass, { x: 1, y: 2 }, { x: 5, y: 2 });
  gleich(durch.kosten, 5, "durch den Graben sind es fünf");
  behaupte(durch.pfad.some((f) => f.x === 3),
    "und der Weg führt hindurch, weil es kein Vorbei gibt");

  const beides = macheKarte(12, 5);
  for (const { x, y } of alleFelder(beides)) if (x >= 5) beides.setze(x, y, { ebene: 2 });
  beides.setze(4, 2, { rampe: RAMPE.ost });
  beides.setze(5, 2, { fluessig: FLUESSIG.wasser });
  gleich(kostenVon(erreichbareFelder(beides, 1, 2, 6), beides, 5, 2), 6,
    "Rampe und Wasser zusammen kosten drei Punkte für den einen Schritt");
  gleich(erreichbareFelder(beides, 1, 2, 5).has(beides.index(5, 2)), false,
    "mit fünf Punkten steht man noch davor");
}

/* ── Stürze ────────────────────────────────────────────────────── */

abschnitt("Stürze");
{
  /* Ein Plateau auf Ebene 3 (x 1..3, y 1..3), ringsum Ebene 1. Der
     einzige Weg hinab ohne Sturz ist die Stufe (4,3) auf Ebene 2;
     überall sonst geht es zwei Ebenen auf einmal hinunter. */
  const k = macheKarte(8, 6);
  for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) k.setze(x, y, { ebene: 3 });
  k.setze(4, 3, { ebene: 2 });

  const treppe = wegSuche(k, { x: 1, y: 1 }, { x: 5, y: 1 });
  /* Sechs statt acht: Der Umweg über die Stufe fällt auf dem Sechseck
     kürzer aus, weil ein schräger Schritt zugleich quer und längs
     zählt. Die Aussage bleibt dieselbe — es gibt einen Weg ohne Sturz,
     und er ist länger als die Luftlinie. */
  gleich(treppe.kosten, 6, "ohne Sturz führt der Weg über die Stufe: sechs Punkte");
  behaupte(treppe.kosten > abstand(1, 1, 5, 1), "und er ist länger als die Luftlinie");
  behaupte(!hatSturz(k, treppe.pfad), "und er springt nirgends");
  behaupte(wegIstEcht(k, treppe.pfad), "und ist Schritt für Schritt echt");

  const sprung = wegSuche(k, { x: 1, y: 1 }, { x: 5, y: 1 }, { stuerzeErlaubt: true });
  gleich(sprung.kosten, 4, "mit erlaubtem Sturz sind es vier");
  behaupte(hatSturz(k, sprung.pfad), "der Weg springt dann auch wirklich");

  /* Der Schalter darf keinen Sturz erzwingen: Liegt die Stufe daneben,
     ist der Sprung teurer und wird nicht genommen. */
  const kurz = wegSuche(k, { x: 3, y: 3 }, { x: 5, y: 3 }, { stuerzeErlaubt: true });
  gleich(kurz.kosten, 2, "über die Stufe sind es zwei");
  behaupte(!hatSturz(k, kurz.pfad), "ein Sturz wird nur genommen, wenn er billiger ist");

  gleich(erreichbareFelder(k, 1, 1, 3).has(k.index(4, 1)), false,
    "ohne Sturz kommt in drei Punkten niemand vom Plateau herunter");
  gleich(kostenVon(erreichbareFelder(k, 1, 1, 3, { stuerzeErlaubt: true }), k, 4, 1), 3,
    "mit Sturz kostet dasselbe Feld drei");
}

/* ── Belegte Felder ────────────────────────────────────────────── */

abschnitt("Belegte Felder");
{
  const k = macheKarte(9, 5);
  for (const { x, y } of alleFelder(k)) {
    if (y !== 2) k.setze(x, y, { hindernis: HINDERNIS.wand });
  }
  gleich(wegSuche(k, { x: 1, y: 2 }, { x: 7, y: 2 }).kosten, 6, "der leere Gang kostet sechs");

  const imWeg = (x, y) => x === 4 && y === 2;
  gleich(wegSuche(k, { x: 1, y: 2 }, { x: 7, y: 2 }, { belegt: imWeg }), null,
    "wer mitten im Gang steht, sperrt ihn");
  gleich(wegSuche(k, { x: 1, y: 2 }, { x: 7, y: 2 },
    { belegt: (x, y) => x === 1 && y === 2 }).kosten, 6,
    "das eigene Feld sperrt niemanden — dort steht der, der laufen will");
  gleich(wegSuche(k, { x: 1, y: 2 }, { x: 7, y: 2 },
    { belegt: (x, y) => x === 7 && y === 2 }), null,
    "ein besetztes Zielfeld ist kein Ziel");

  const felder = erreichbareFelder(k, 1, 2, 99, { belegt: imWeg });
  gleich(felder.has(k.index(5, 2)), false, "hinter dem Besetzten geht es nicht weiter");
  gleich(felder.has(k.index(4, 2)), false, "auf ihn auch nicht");
  gleich(felder.has(k.index(1, 2)), true, "das eigene Feld bleibt in der Liste");
}

/* ── Das nächste freie Feld ────────────────────────────────────── */

abschnitt("Freies Feld");
{
  const k = macheKarte(8, 8);
  tiefGleich(naechstesFreiesFeld(k, 3, 3), { x: 3, y: 3 },
    "ein freies Feld ist sein eigener Platz");

  const mitte = (x, y) => x === 3 && y === 3;
  tiefGleich(naechstesFreiesFeld(k, 3, 3, { belegt: mitte }), { x: 3, y: 2 },
    "bei gleicher Entfernung gewinnt der kleinere Feldindex");

  /* Der Ring wird mit `abstand` beschrieben, nicht mit einer
     Handrechnung: Auf dem Sechseck ist „ringsum" etwas anderes als
     |dx| + |dy| <= 1, und eine abgeschriebene Formel wäre die zweite
     Wahrheit über die Nachbarschaft. */
  const ring = (x, y) => abstand(x, y, 3, 3) <= 1;
  const ausserhalb = naechstesFreiesFeld(k, 3, 3, { belegt: ring });
  gleich(abstand(ausserhalb.x, ausserhalb.y, 3, 3), 2,
    "ist der ganze Ring besetzt, wird ein Feld aus dem zweiten Ring genommen");
  tiefGleich(naechstesFreiesFeld(k, 3, 3, { belegt: ring }), ausserhalb,
    "und zwar zweimal dasselbe");

  gleich(naechstesFreiesFeld(k, -1, 3), null, "außerhalb der Karte gibt es keinen Platz");

  const eingemauert = macheKarte(8, 8);
  for (const r of richtungen(3)) {
    eingemauert.setze(3 + r.dx, 3 + r.dy, { hindernis: HINDERNIS.wand });
  }
  gleich(naechstesFreiesFeld(eingemauert, 3, 3, { belegt: mitte }), null,
    "durch Wände sucht niemand einen Platz");

  const inDerWand = macheKarte(8, 8);
  inDerWand.setze(3, 3, { hindernis: HINDERNIS.wand });
  tiefGleich(naechstesFreiesFeld(inDerWand, 3, 3), { x: 3, y: 2 },
    "aus einer Wand heraus wird nach außen gesucht");
}

/* ── Immer derselbe Weg ────────────────────────────────────────── */

abschnitt("Immer derselbe Weg");
{
  /* Zwischen (0,0) und (5,5) liegen auf offener Fläche viele gleich
     kurze Wege. Welcher herauskommt, folgt aus der Vorfahrtsregel
     (erst Kosten, dann Feldnummer) und **muss** auf jedem Rechner
     derselbe sein — sonst laufen zwei Spieler auseinander.

     ── Warum hier kein abgeschriebener Weg mehr steht ──────────────

     Bis zum 07.09.2026 stand der erwartete Weg Feld für Feld in dieser
     Datei. Mit dem Sechseck wurde er ein anderer, und beim Nachtragen
     fiel auf, dass die Liste die schwächere Prüfung war: Sie sagt, ob
     genau *dieser* Weg herauskommt — nicht, ob **immer derselbe**
     herauskommt. Geprüft wird jetzt das Zweite, und das ist die
     Eigenschaft, an der der Netz-Koop hängt.

     Dazu die Bedingung, die eine Liste nie geprüft hat: Jeder Schritt
     muss ein echter Nachbarschritt sein. */
  const k = macheKarte(8, 8);
  const einmal = wegSuche(k, { x: 0, y: 0 }, { x: 5, y: 5 });
  const nochmal = wegSuche(macheKarte(8, 8), { x: 0, y: 0 }, { x: 5, y: 5 });
  tiefGleich(nochmal.pfad, einmal.pfad,
    "der Gleichstand fällt auf zwei frisch gebauten Karten auf denselben Weg");

  gleich(einmal.kosten, abstand(0, 0, 5, 5),
    "auf freier Fläche ist der Weg genau so lang wie die Luftlinie");
  gleich(einmal.pfad.length, einmal.kosten + 1, "der Pfad trägt das Startfeld vorn");

  let unecht = 0;
  for (let i = 1; i < einmal.pfad.length; i++) {
    const v = einmal.pfad[i - 1], n = einmal.pfad[i];
    if (abstand(v.x, v.y, n.x, n.y) !== 1) unecht++;
    if (n.kosten !== v.kosten + 1) unecht++;
  }
  gleich(unecht, 0, "jeder Schritt ist ein Nachbarschritt und kostet genau einen Punkt");
}
{
  /* Zwei Gänge um einen Block, exakt gleich lang. */
  const k = macheKarte(9, 7);
  for (const { x, y } of alleFelder(k)) k.setze(x, y, { hindernis: HINDERNIS.wand });
  const oeffne = (x, y) => k.setze(x, y, { hindernis: HINDERNIS.keins });
  for (let x = 1; x <= 7; x++) { oeffne(x, 1); oeffne(x, 5); }
  for (let y = 1; y <= 5; y++) { oeffne(1, y); oeffne(7, y); }

  const w = wegSuche(k, { x: 1, y: 3 }, { x: 7, y: 3 });
  gleich(w.kosten, 9, "beide Gänge sind neun Punkte lang");
  behaupte(w.pfad.some((f) => f.y === 1), "genommen wird der nördliche");
  behaupte(!w.pfad.some((f) => f.y === 5), "der südliche nicht");
  behaupte(wegIstEcht(k, w.pfad), "und der Weg ist echt");
}
{
  /* 200 Suchen, zwischen drei Karten gewechselt: Bliebe zwischen zwei
     Läufen etwas im Modul liegen, fiele es genau hier auf. */
  const karten = [zufallsKarte(11), zufallsKarte(23), zufallsKarte(37)];
  const ersteAntwort = karten.map(probeText);
  let abweichungen = 0;
  for (let lauf = 0; lauf < 200; lauf++) {
    const nummer = lauf % karten.length;
    if (probeText(karten[nummer]) !== ersteAntwort[nummer]) abweichungen++;
  }
  gleich(abweichungen, 0, "200 Suchen über drei Karten geben immer dieselbe Antwort");
  messung(`200 Suchen über drei Karten: ${abweichungen} Abweichungen`);

  behaupte(ersteAntwort[0].length > 400, "die Probe ist nicht leer");
  behaupte(ersteAntwort[0] !== ersteAntwort[1], "verschiedene Karten geben verschiedene Antworten");
  behaupte(ersteAntwort[1] !== ersteAntwort[2], "auch die anderen beiden unterscheiden sich");
}

{
  /* Die Nachbarn werden in der Reihenfolge aus `richtungen` besucht.
     Dass das Ergebnis daran **nicht** hängt, ist kein Zufall, sondern
     die Folge der Vorfahrt: Welcher Vorgänger gewinnt, entscheidet die
     Warteschlange (Kosten, dann Feldindex) und nicht, wer zuerst
     angesehen wurde. Diese Prüfung hält das fest — sie dreht die
     Richtungsliste um, misst noch einmal und legt sie zurück. Schlägt
     sie eines Tages an, ist die Vorfahrt durchlässig geworden und die
     vier Rechner hängen wieder an einer Schleifenreihenfolge. */
  const karte = zufallsKarte(37);
  const vorwaerts = probeText(karte);
  /* Seit dem Sechseck gibt es zwei Tabellen — eine je Zeilenparität.
     Beide müssen gedreht werden, sonst prüfte diese Stelle nur noch
     die halbe Karte. */
  RICHTUNGEN_GERADE.reverse();
  RICHTUNGEN_UNGERADE.reverse();
  const rueckwaerts = probeText(karte);
  RICHTUNGEN_GERADE.reverse();
  RICHTUNGEN_UNGERADE.reverse();
  gleich(ersteAbweichung(rueckwaerts, vorwaerts), -1,
    "die Besuchsreihenfolge der Nachbarn entscheidet nichts (Stelle der ersten Abweichung)");
  gleich(RICHTUNGEN_GERADE[0].name, "ost", "und die gerade Tabelle liegt wieder richtig herum");
  gleich(RICHTUNGEN_UNGERADE[0].name, "ost", "die ungerade auch");
  gleich(ersteAbweichung(probeText(karte), vorwaerts), -1, "die Antwort ist danach unverändert");
}

/* ── Gegen ein zweites Verfahren ───────────────────────────────── */

abschnitt("Gegen ein zweites Verfahren");
{
  /* Ein festes Muster besetzter Felder — kein Zufall, damit die Probe
     mit der stumpfen Rechnung wirklich dieselbe Frage stellt. */
  const besetzt = (x, y) => (x * 3 + y * 7) % 11 === 0 && !(x === 1 && y === 1);

  let felderGesamt = 0;
  const schrittPreise = new Set();
  for (const saat of [11, 23, 37, 91]) {
    const k = zufallsKarte(saat);
    const meine = erreichbareFelder(k, 1, 1, 10);
    const stumpf = kostenStumpf(k, 1, 1, 10);
    gleich(meine.size, stumpf.size, `Saat ${saat}: gleich viele Felder wie die stumpfe Rechnung`);

    let andereKosten = 0;
    for (const [i, e] of meine) if (stumpf.get(i) !== e.kosten) andereKosten++;
    gleich(andereKosten, 0, `Saat ${saat}: dieselben Kosten wie die stumpfe Rechnung`);

    /* Dasselbe noch einmal mit besetzten Feldern: Die Sperre muss
       beide Rechnungen gleich beschneiden, nicht nur die eine. */
    const engMeine = erreichbareFelder(k, 1, 1, 10, { belegt: besetzt });
    const engStumpf = kostenStumpf(k, 1, 1, 10, besetzt);
    let engAnders = engMeine.size === engStumpf.size ? 0 : 1;
    for (const [i, e] of engMeine) if (engStumpf.get(i) !== e.kosten) engAnders++;
    gleich(engAnders, 0, `Saat ${saat}: auch mit besetzten Feldern dieselbe Rechnung`);
    behaupte(engMeine.size < meine.size, `Saat ${saat}: die Sperre ändert überhaupt etwas`);

    /* Die Summen können stimmen, während die Vorgängerkette lügt —
       deshalb wird jeder einzelne gemeldete Weg nachgelaufen. */
    let krumm = 0;
    for (const [i, e] of meine) {
      const pfad = pfadAus(meine, i);
      if (!wegIstEcht(k, pfad)) krumm++;
      else if (pfad[pfad.length - 1].kosten !== e.kosten) krumm++;
      else if (pfad[pfad.length - 1].x !== e.x || pfad[pfad.length - 1].y !== e.y) krumm++;
      else if (pfad[0].x !== 1 || pfad[0].y !== 1) krumm++;
      for (let s = 1; s < pfad.length; s++) schrittPreise.add(pfad[s].kosten - pfad[s - 1].kosten);
    }
    gleich(krumm, 0, `Saat ${saat}: jeder gemeldete Weg ist Schritt für Schritt echt`);
    felderGesamt += meine.size;
  }
  /* Gemessen am 06.09.2026: 167 Felder über die vier Saaten. Die
     Schranke steht darunter, damit sie eine leere Probe fängt und
     nicht jede Änderung an der Kartenerzeugung. */
  behaupte(felderGesamt > 120, `die Proben sind nicht leer (${felderGesamt} Felder)`);
  behaupte(schrittPreise.has(1), "es kommen Schritte für einen Punkt vor");
  behaupte(schrittPreise.has(2), "es kommen Schritte für zwei Punkte vor");
  messung(`Kreuzprobe gegen das stumpfe Verfahren: ${felderGesamt} Felder über vier Saaten, `
    + `Schrittpreise ${[...schrittPreise].sort().join(" und ")}`);
}

/* ── Die Preise kommen von außen ───────────────────────────────── */

abschnitt("Gereichte Regeln");
{
  const k = zufallsKarte(23);
  const doppelt = {
    laufKosten: (karte, ax, ay, bx, by) => {
      const schritt = laufKosten(karte, ax, ay, bx, by);
      return schritt === null ? null : schritt * 2;
    },
    sturzTiefe
  };
  /* Verdoppelte Preise bei doppelter Punktzahl müssen genau dieselbe
     Fläche ergeben — wenn die gereichten Regeln überhaupt benutzt
     werden. Eine eigene Preisliste im Modul fiele hier durch. */
  const mitDoppel = [...erreichbareFelder(k, 1, 1, 8, { hoehenRegeln: doppelt }).keys()];
  const halbeWeite = [...erreichbareFelder(k, 1, 1, 4).keys()];
  gleich(mitDoppel.join(","), halbeWeite.join(","),
    "die gereichten Regeln werden wirklich befragt");
  behaupte(mitDoppel.length > 5, "und die Probe ist nicht leer");

  wirft(() => erreichbareFelder(k, 1, 1, 8,
    { hoehenRegeln: { laufKosten: () => -1, sturzTiefe } }),
  "negative Schrittkosten schlagen an");
  wirft(() => erreichbareFelder(k, 1, 1, 8,
    { hoehenRegeln: { laufKosten: () => Infinity, sturzTiefe } }),
  "unendliche Schrittkosten auch");

  wirft(() => erreichbareFelder(k, 1, 1, 8, { hoehenRegeln: { laufKosten } }),
    "halb gereichte Regeln schlagen an — sonst rechnete jede Frage nach anderer Elle");

  const abgerissen = new Map([[5, { x: 5, y: 0, kosten: 3, vorher: 99 }]]);
  wirft(() => pfadAus(abgerissen, 5), "eine abgerissene Vorgängerkette schlägt an");
  const kreis = new Map([
    [1, { x: 1, y: 0, kosten: 1, vorher: 2 }],
    [2, { x: 2, y: 0, kosten: 2, vorher: 1 }]
  ]);
  wirft(() => pfadAus(kreis, 1), "ein Kreis in der Vorgängerkette auch");
}

ende("Wegfindung");
