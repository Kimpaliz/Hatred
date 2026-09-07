/* [Aufgabe: Prüfwesen] Prüft `runtime/eingabe.js` an **Maus und
   Tastatur** — ohne Browser, ohne Zeichenblatt, mit einem nachgebauten
   Blatt, das jeden Anmeldevorgang mitschreibt.

   Was die Eingabe aus einem **Finger** macht — Zeigerereignisse, die
   zwei Schritte, die Knopfleiste —, steht in
   `werkzeuge/pruefe-eingabe-finger.mjs`. Das sind zwei Sachen und
   nicht dieselbe mit anderem Gerät. Die Stellung, auf der beide
   messen, steht in `werkzeuge/buehne-eingabe.mjs`.

   ── Warum genau diese Fälle ────────────────────────────────────────

   Geprüft wird, was ohne die Arbeit falsch wäre, nicht was ohnehin
   gewinnt:

   · **Gesperrt heißt taub.** Ein Klick während des Abspielens darf
     keine Aktion erzeugen. Der Fall, den man beim Bauen vergisst,
     weil er im Spiel nur einen Wimpernschlag lang offensteht — und
     dann schickt jemand eine Aktion, deren Voraussetzung sich gerade
     ändert.
   · **Die Vorschau ist keine zweite Rechnung.** Über jedes Feld der
     Karte wird gefahren und mit `erreichbareFelder` und `pfadAus`
     verglichen. Wäre die Vorschau eine eigene Wegsuche, zeigte sie
     irgendwo ein Feld, das der Zug nicht erreicht.
   · **Die Sturzwarnung steht auf einer von Hand gebauten Karte** mit
     einem Plateau und einer Grube. Die erwarteten Felder sind hier
     namentlich aufgezählt — nicht aus derselben Rechnung geholt, die
     geprüft werden soll. Ein vertauschtes `sturzTiefe` (Fehlerbuch
     A3) oder ein vergessener Randfall fällt damit auf.
   · **`Esc` räumt vollständig auf.** Verglichen wird mit einer frisch
     gebauten Eingabe, Feld für Feld — ein halb geräumter Zustand
     bliebe sonst unsichtbar.
   · **Die Tastatur erreicht jedes Feld, das die Maus erreicht.** Der
     Zeiger läuft über die ganze Karte, und jedes Feld wird mit dem
     verglichen, das ein Mausklick in dieselbe Kachel ergäbe.
   · **Die Eingabe wendet nichts an.** Vor und nach allen Klicks wird
     `zustandsSumme` verglichen. Das ist die eine Zahl, an der ein
     auseinandergelaufener Lauf hängt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/eingabe.js` (das Geprüfte), `werkzeuge/buehne-eingabe.mjs`
   (die geteilte Stellung), `werkzeuge/pruefe-eingabe-finger.mjs` (der
   Finger, misst über dieselbe Stellung), `runtime/kamera.js` (rechnet
   Bildpunkte in Felder), `spiel/gitter.mjs`, `spiel/wegfindung.mjs`,
   `spiel/hoehen.mjs`, `spiel/aktionen.mjs`, `spiel/lauf.mjs`
   (`macheLauf`, `zustandsSumme`), `werkzeuge/helfer.mjs`,
   `werkzeuge/pruefe-alles.mjs`. */

import { abschnitt, behaupte, gleich, tiefGleich, wirft, ende } from "./helfer.mjs";

import {
  HINDERNIS, RAMPE, richtungen, alleFelder, macheKarte
} from "../spiel/gitter.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { erreichbareFelder, pfadAus } from "../spiel/wegfindung.mjs";
import { sturzTiefe, sturzSchaden } from "../spiel/hoehen.mjs";
import { AKTION } from "../spiel/aktionen.mjs";
import { macheWesen, belegtPruefer } from "../spiel/wesen.mjs";
import { held } from "../spiel/katalog/helden.mjs";
import { gegner } from "../spiel/katalog/gegner.mjs";
import { wesenMitId } from "../spiel/zug.mjs";
import { macheLauf, zustandsSumme } from "../spiel/lauf.mjs";
import { macheKamera } from "../runtime/kamera.js";
import {
  KNOPF_LINKS, KNOPF_RECHTS, MODUS, WARNUNG, macheEingabe
} from "../runtime/eingabe.js";

/* Die Stellung — von Hand gebaute Karte, Spielstand, mitschreibendes
   Blatt — steht in `buehne-eingabe.mjs`, weil **beide** Prüfungen sie
   brauchen und es sie nur einmal geben darf. Zweimal aufgebaut wären
   es zwei Karten, und sobald jemand eine davon ändert, prüfte diese
   Datei stillschweigend etwas anderes als die andere. */
import {
  BREITE, HOEHE, abbild, baueZustand, klickeAuf, macheEreignis,
  macheLeinwandErsatz, macheProbe, punktVon, zeigeAuf
} from "./buehne-eingabe.mjs";

/* Gemessene Zahlen, am Ende gedruckt. Eine Behauptung sagt nur „größer
   als" — hier steht, wie groß wirklich. */
const berichte = [];

/* ══════════════════════════════════════════════════════════════════
   1 · Das Gerüst
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Gerüst");
{
  const zustand = baueZustand();
  const kamera = macheKamera({ fensterBreite: 640, fensterHoehe: 480, karte: zustand.karte });

  wirft(() => macheEingabe({ kamera, zustand }),
    "ohne `sende` wirft macheEingabe — sonst wendete die Eingabe selbst an");
  wirft(() => macheEingabe({ kamera, sende: () => true }),
    "ohne Spielstand wirft macheEingabe");
  wirft(() => macheEingabe({ zustand, sende: () => true }),
    "ohne Kamera wirft macheEingabe — Bildpunkte ließen sich nicht in Felder rechnen");

  const probe = macheProbe();
  const a = probe.eingabe.ansicht();
  gleich(a.modus, MODUS.gehen, "der Anfangsmodus ist Gehen");
  tiefGleich(a.zeigerFeld, { x: 5, y: 4 }, "der Zeiger liegt anfangs auf der eigenen Figur");
  gleich(a.gesperrt, false, "am Anfang ist nichts gesperrt");
  gleich(a.ganzeKarte, false, "die Übersichtskarte ist zu");
  gleich(a.reichweite.size, 20, "das Plateau hat 20 Felder, und nur die sind erreichbar");
}

/* ══════════════════════════════════════════════════════════════════
   2 · Gesperrt heißt taub
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Sperre");
{
  const probe = macheProbe();
  /* (6,4) liegt auf dem Plateau, ist frei und kostet einen Punkt —
     ohne Sperre entstünde hier ganz sicher eine Aktion. */
  probe.eingabe.sperre(true);
  const geklickt = klickeAuf(probe, 6, 4);
  gleich(geklickt, null, "ein Klick bei gesperrter Eingabe gibt keine Aktion zurück");
  gleich(probe.geschickt.length, 0, "ein Klick bei gesperrter Eingabe schickt nichts");
  gleich(zeigeAuf(probe, 6, 4), null, "der Zeiger bewegt sich bei gesperrter Eingabe nicht");
  gleich(probe.eingabe.beiTaste(" ", true), null, "die Leertaste tut bei Sperre nichts");
  gleich(probe.eingabe.beiTaste("w", true), null, "die Wacht tut bei Sperre nichts");
  gleich(probe.geschickt.length, 0, "auch über Tasten kommt bei Sperre nichts durch");

  const gesperrteAnsicht = probe.eingabe.ansicht();
  gleich(gesperrteAnsicht.gesperrt, true, "die Ansicht meldet die Sperre");
  gleich(gesperrteAnsicht.reichweite.size, 0,
    "bei Sperre ist die Reichweite leer — sonst zeigte sie eine Lage von gestern");
  gleich(gesperrteAnsicht.wegVorschau, null, "bei Sperre gibt es keine Wegvorschau");

  probe.eingabe.sperre(false);
  const jetzt = klickeAuf(probe, 6, 4);
  behaupte(jetzt !== null, "derselbe Klick nach dem Entsperren erzeugt eine Aktion");
  gleich(probe.geschickt.length, 1, "und genau eine");
  tiefGleich(probe.geschickt[0], { typ: AKTION.gehen, wer: 1, nach: { x: 6, y: 4 } },
    "es ist die Gehen-Aktion auf das angeklickte Feld");
}

/* ══════════════════════════════════════════════════════════════════
   3 · Unerreichbares Feld: Warnung statt Aktion
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Unerreichbar");
{
  const probe = macheProbe();
  /* (14,10) ist frei, liegt auf Ebene 1 und ist vom Plateau aus
     überhaupt nicht zu erreichen — der Sprung hinab ist ein Sturz. */
  const geklickt = klickeAuf(probe, 14, 10);
  gleich(geklickt, null, "ein Klick auf ein unerreichbares Feld gibt keine Aktion");
  gleich(probe.geschickt.length, 0, "und schickt nichts");
  const w = probe.eingabe.ansicht().warnung || {};
  behaupte(probe.eingabe.ansicht().warnung !== null, "stattdessen steht eine Warnung");
  gleich(w.art, WARNUNG.abgelehnt, "es ist eine Ablehnung");
  behaupte(typeof w.text === "string" && w.text.length > 5,
    "die Ablehnung trägt einen deutschen Satz");

  /* Eine Wand ist der zweite Fall: Dort ist nicht einmal ein Feld. */
  const anWand = klickeAuf(probe, 0, 0);
  gleich(anWand, null, "ein Klick auf eine Wand gibt keine Aktion");
  gleich(probe.geschickt.length, 0, "und schickt nichts");

  /* Das eigene Feld: Es ist erreichbar und trotzdem keine Aktion. */
  const aufSich = klickeAuf(probe, 5, 4);
  gleich(aufSich, null, "ein Klick auf das eigene Feld gibt keine Aktion");
  behaupte(probe.eingabe.ansicht().warnung !== null, "sondern eine Warnung");
}

/* ══════════════════════════════════════════════════════════════════
   4 · Die Wegvorschau ist dieselbe Rechnung wie erreichbareFelder
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Wegvorschau");
{
  /* Auf einer echten Karte, nicht auf der Werkbank: Rampen, Wasser und
     Hindernisse sollen mitgeprüft werden. */
  const zustand = macheLauf({ saat: 20260906, spielerZahl: 2, tiefe: 1, breite: 30, hoehe: 24 });
  /* Die Zugordnung geht nach Flinkheit — am Zug ist nicht zwingend ein
     Jäger. Ohne diesen Griff prüfte der Vergleich eine Eingabe, die
     ohnehin nichts annimmt, und wäre grün, ohne etwas zu belegen. */
  const stelle = zustand.ordnung.findIndex((id) => {
    const kandidat = wesenMitId(zustand, id);
    return kandidat && kandidat.spielerPlatz !== null;
  });
  behaupte(stelle >= 0, "auf der echten Karte steht ein Jäger in der Zugordnung");
  zustand.amZug = stelle;
  const w = wesenMitId(zustand, zustand.ordnung[stelle]);
  const probe = macheProbe({ zustand });
  const soll = erreichbareFelder(zustand.karte, w.x, w.y, w.ap, {
    belegt: belegtPruefer(zustand.wesen)
  });

  let verglichen = 0;
  let falsch = 0;
  let erreichbar = 0;
  for (const { x, y, i } of alleFelder(zustand.karte)) {
    zeigeAuf(probe, x, y);
    const a = probe.eingabe.ansicht();
    verglichen++;
    const eintrag = soll.get(i);
    const eigenes = x === w.x && y === w.y;
    const sollWeg = eintrag && !eigenes ? pfadAus(soll, i) : null;
    const sollKosten = eintrag && !eigenes ? eintrag.kosten : null;
    if (eintrag && !eigenes) erreichbar++;
    if (JSON.stringify(a.wegVorschau) !== JSON.stringify(sollWeg)) falsch++;
    else if (a.kosten !== sollKosten) falsch++;
    else if (JSON.stringify(a.zeigerFeld) !== JSON.stringify({ x, y })) falsch++;
  }
  behaupte(verglichen > 200, `es wurden ${verglichen} Felder verglichen (gefordert: über 200)`);
  behaupte(erreichbar > 10, `davon ${erreichbar} erreichbare — sonst prüfte der Vergleich nichts`);
  berichte.push(`Wegvorschau: ${verglichen} Felder verglichen, davon ${erreichbar} erreichbare`);
  gleich(falsch, 0, "kein Feld weicht von erreichbareFelder/pfadAus ab");

  /* Und die Reichweite, die die Ansicht herausgibt, ist dieselbe. */
  const ausAnsicht = [...probe.eingabe.ansicht().reichweite.keys()].sort((a, b) => a - b);
  tiefGleich(ausAnsicht, [...soll.keys()].sort((a, b) => a - b),
    "ansicht().reichweite trägt genau die Felder aus erreichbareFelder");
}

/* ══════════════════════════════════════════════════════════════════
   5 · Die Sturzwarnung steht genau dort, wo sie hingehört
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Sturzwarnung");
{
  /* Von Hand aufgezählt, nicht nachgerechnet: der Kranz um das
     Plateau. (3,2) fehlt — dort steht eine Wand. (8,4) und (8,5)
     liegen in der Grube auf Ebene 0, also drei Stufen tiefer. */
  const erwartet = new Map();
  const eintragen = (x, y, stufen) => erwartet.set(`${x},${y}`, stufen);
  for (const x of [4, 5, 6, 7]) eintragen(x, 2, 2);
  for (const x of [3, 4, 5, 6, 7]) eintragen(x, 7, 2);
  for (const y of [3, 4, 5, 6]) eintragen(2, y, 2);
  eintragen(8, 3, 2);
  eintragen(8, 4, 3);
  eintragen(8, 5, 3);
  eintragen(8, 6, 2);
  gleich(erwartet.size, 17, "siebzehn Felder sollen warnen");

  const probe = macheProbe();
  let falschGewarnt = 0;
  let fehlendeWarnung = 0;
  let falscheStufen = 0;
  let gewarnt = 0;
  for (const { x, y } of alleFelder(probe.zustand.karte)) {
    zeigeAuf(probe, x, y);
    const warnung = probe.eingabe.ansicht().warnung;
    const stufen = erwartet.get(`${x},${y}`);
    const ist = warnung && warnung.art === WARNUNG.sturz ? warnung : null;
    if (ist) gewarnt++;
    if (ist && stufen === undefined) falschGewarnt++;
    if (!ist && stufen !== undefined) fehlendeWarnung++;
    if (ist && stufen !== undefined) {
      if (ist.stufen !== stufen || ist.schaden !== sturzSchaden(stufen)) falscheStufen++;
    }
  }
  gleich(gewarnt, 17, "es warnen genau siebzehn Felder");
  berichte.push(`Sturzwarnung: ${gewarnt} von ${BREITE * HOEHE} Feldern warnen`);
  gleich(falschGewarnt, 0, "kein Feld warnt, das nicht warnen soll");
  gleich(fehlendeWarnung, 0, "kein Feld schweigt, das warnen soll");
  gleich(falscheStufen, 0, "Stufen und Schaden stimmen auf jedem Warnfeld");

  /* Die Zahlen einmal ausdrücklich: zwei Stufen sind drei Schaden,
     drei Stufen sechs — die erste Stufe ist frei (`spiel/hoehen.mjs`). */
  zeigeAuf(probe, 2, 4);
  const flach = probe.eingabe.ansicht().warnung || {};
  gleich(flach.stufen, 2, "der Sprung neben das Plateau geht zwei Ebenen tief");
  gleich(flach.schaden, 3, "zwei Ebenen tun 3 Schaden");
  gleich(flach.wen, 1, "gewarnt wird für die eigene Figur");
  behaupte(typeof flach.text === "string" && flach.text.includes("Aktionspunkte"),
    "die Warnung sagt auch, dass danach alle Punkte weg sind");

  zeigeAuf(probe, 8, 4);
  const tief = probe.eingabe.ansicht().warnung || {};
  gleich(tief.stufen, 3, "in die Grube geht es drei Ebenen tief");
  gleich(tief.schaden, 6, "drei Ebenen tun 6 Schaden");

  /* Gegenprobe: Auf einem erreichbaren Feld wird nicht gewarnt, auch
     wenn daneben die Kante liegt — dorthin führt ja ein Weg. */
  zeigeAuf(probe, 7, 4);
  gleich(probe.eingabe.ansicht().warnung, null,
    "das Plateaufeld an der Kante warnt nicht — dorthin führt ein Weg");

  /* Und die Wand warnt nicht, obwohl sie zwei Ebenen tiefer liegt. */
  zeigeAuf(probe, 3, 2);
  gleich(probe.eingabe.ansicht().warnung, null, "eine Wand warnt nicht — dort steht niemand");

  /* Dieselbe Rechnung noch einmal, aber aus den Kernfunktionen
     zusammengesetzt: Wer die Aufzählung oben für Zufall hält, sieht
     hier, dass sie mit `sturzTiefe` übereinstimmt. */
  const reich = erreichbareFelder(probe.zustand.karte, 5, 4, 20, {
    belegt: belegtPruefer(probe.zustand.wesen)
  });
  let ausKern = 0;
  for (const { x, y, i } of alleFelder(probe.zustand.karte)) {
    if (probe.zustand.karte.blocktBewegung(x, y) || reich.has(i)) continue;
    for (const r of richtungen(y)) {
      const nx = x - r.dx;
      const ny = y - r.dy;
      if (!probe.zustand.karte.drin(nx, ny)) continue;
      if (!reich.has(probe.zustand.karte.index(nx, ny))) continue;
      if (sturzTiefe(probe.zustand.karte, nx, ny, x, y) > 0) { ausKern++; break; }
    }
  }
  gleich(ausKern, 17, "sturzTiefe aus dem Kern findet dieselben siebzehn Felder");
}

/* ══════════════════════════════════════════════════════════════════
   5b · Ein Feld, zu dem ein Weg führt, warnt nicht
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Sturz und Weg");
{
  /* Der Fall, den die Werkbank oben nicht hergibt: ein Feld, das zwei
     Ebenen unter einem erreichbaren Nachbarn liegt **und** trotzdem
     einen Weg hat — über zwei Rampen außen herum. Ohne die Schranke
     „nur auf Feldern ohne Weg" stünde dort eine Sturzwarnung neben
     einer Wegvorschau, die gar nicht stürzt. */
  const karte = macheKarte(12, 8);
  for (const { x, y } of alleFelder(karte)) {
    if (x === 0 || y === 0 || x === 11 || y === 7) {
      karte.setze(x, y, { hindernis: HINDERNIS.wand });
    }
  }
  karte.setze(1, 3, { ebene: 3 });
  karte.setze(2, 3, { ebene: 3 });
  karte.setze(3, 3, { ebene: 2, rampe: RAMPE.west });
  karte.setze(4, 3, { rampe: RAMPE.west });
  karte.starts = [{ x: 1, y: 3 }];

  const treppe = macheWesen(held("spaeher"), {
    id: 1, seite: "jaeger", x: 1, y: 3, spielerPlatz: 1
  });
  treppe.ap = 8;
  treppe.apMax = 8;
  const brutWesen = macheWesen(gegner("kraetzling"), { id: 11, seite: "brut", x: 9, y: 6 });
  const zustand = {
    saat: 9, tiefe: 1, karte, zufall: macheZufall(9),
    wesen: [treppe, brutWesen],
    nachId: new Map([[1, treppe], [11, brutWesen]]),
    runde: 1, ordnung: [1, 11], amZug: 0, seiteDran: "jaeger",
    spieler: [{ platz: 1, name: "Spieler 1", wesenId: 1 }],
    vorbei: null, protokoll: []
  };
  const probe = macheProbe({ zustand });

  const reich = probe.eingabe.ansicht().reichweite;
  behaupte(reich.has(karte.index(2, 3)), "das Hochfeld (2,3) ist erreichbar");
  behaupte(reich.has(karte.index(2, 4)), "und (2,4) darunter auch — über die zwei Rampen");
  gleich(sturzTiefe(karte, 2, 3, 2, 4), 2, "von (2,3) nach (2,4) wären es zwei Ebenen hinab");

  zeigeAuf(probe, 2, 4);
  const dort = probe.eingabe.ansicht();
  behaupte(Array.isArray(dort.wegVorschau) && dort.wegVorschau.length > 3,
    `es gibt einen Weg über ${(dort.wegVorschau || []).length} Felder`);
  gleich(dort.kosten, 4, "er kostet 4 Punkte — über die Zwischenebene statt hinab");
  gleich(dort.warnung, null,
    "und deshalb wird dort nicht gewarnt: der gezeigte Weg stürzt nicht");
}

/* ══════════════════════════════════════════════════════════════════
   6 · Angriff, Stoß und die Sturzwarnung des Stoßes
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Angriff und Stoß");
{
  const probe = macheProbe({ brutBei: { x: 6, y: 4 } });
  /* Linksklick im Gehen-Modus auf einen Gegner ist kein Angriff — das
     Feld ist besetzt, also gibt es eine Warnung. */
  gleich(klickeAuf(probe, 6, 4, KNOPF_LINKS), null,
    "Linksklick im Gehen-Modus auf den Gegner erzeugt keine Aktion");
  gleich(probe.geschickt.length, 0, "und schickt nichts");

  const rechts = klickeAuf(probe, 6, 4, KNOPF_RECHTS);
  tiefGleich(rechts, { typ: AKTION.angriff, wer: 1, ziel: 11 },
    "Rechtsklick auf den Gegner erzeugt den Angriff");
  gleich(probe.geschickt.length, 1, "und schickt ihn genau einmal");

  const zweite = macheProbe({ brutBei: { x: 6, y: 4 } });
  zweite.eingabe.beiTaste("2", true);
  gleich(zweite.eingabe.ansicht().modus, MODUS.angriff, "Taste 2 schaltet in den Angriffsmodus");
  zeigeAuf(zweite, 6, 4);
  const schau = zweite.eingabe.ansicht();
  tiefGleich(schau.ziel, { id: 11, x: 6, y: 4 }, "die Ansicht nennt das Ziel unter dem Zeiger");
  behaupte(schau.kosten > 0, `der Angriff kostet ${schau.kosten} Punkte`);
  const links = klickeAuf(zweite, 6, 4, KNOPF_LINKS);
  tiefGleich(links, { typ: AKTION.angriff, wer: 1, ziel: 11 },
    "Linksklick im Angriffsmodus erzeugt den Angriff");
  gleich(zweite.eingabe.ansicht().modus, MODUS.gehen,
    "nach der Aktion steht der Modus wieder auf Gehen");

  /* Der Fall, in dem allein `pruefeAktion` die Aktion aufhält: Ein
     Ziel steht dort sehr wohl — nur ist es außer Reichweite oder es
     ist die eigene Figur. Gebaut ist die Aktion damit; abgeschickt
     werden darf sie nicht. */
  const fern = macheProbe();
  gleich(klickeAuf(fern, 12, 12, KNOPF_RECHTS), null,
    "ein Gegner außer Reichweite wird nicht angegriffen");
  gleich(fern.geschickt.length, 0, "und die Aktion geht nicht über die Leitung");
  behaupte(fern.eingabe.ansicht().warnung !== null, "der Spieler erfährt den Grund");

  gleich(klickeAuf(fern, 5, 4, KNOPF_RECHTS), null,
    "auf die eigene Figur zielt niemand");
  gleich(fern.geschickt.length, 0, "auch das kommt nicht durch");

  /* Angriff ins Leere: kein Ziel, keine Aktion, aber eine Auskunft. */
  const dritte = macheProbe({ brutBei: { x: 6, y: 4 } });
  dritte.eingabe.beiTaste("2", true);
  gleich(klickeAuf(dritte, 4, 4, KNOPF_LINKS), null, "ein Angriff auf leeren Boden geht nicht");
  behaupte(dritte.eingabe.ansicht().warnung !== null, "und sagt es");

  /* Stoß über die Taste S und dann die Richtung. */
  const stoss = macheProbe({ brutBei: { x: 6, y: 4 } });
  stoss.eingabe.beiTaste("s", true);
  gleich(stoss.eingabe.ansicht().modus, MODUS.stoss, "S schaltet in den Stoß-Modus");
  const gestossen = stoss.eingabe.beiTaste("ArrowRight", true);
  tiefGleich(gestossen, { typ: AKTION.stoss, wer: 1, ziel: 11 },
    "die Richtung nach dem S stößt den Nachbarn");

  /* Der Stoß über die Kante: Er wirft den Gegner in die Grube, und
     genau davor (beziehungsweise darauf) wird gewarnt. */
  const kante = macheProbe({ heldBei: { x: 6, y: 4 }, brutBei: { x: 7, y: 4 } });
  kante.eingabe.beiTaste("s", true);
  zeigeAuf(kante, 7, 4);
  const warnung = kante.eingabe.ansicht().warnung || {};
  gleich(warnung.art, WARNUNG.sturz, "der Stoß über die Kante warnt");
  gleich(warnung.stufen, 3, "der Gegner fiele drei Ebenen tief");
  gleich(warnung.schaden, 6, "das sind 6 Schaden");
  gleich(warnung.wen, 11, "gewarnt wird für den Gegner, nicht für die eigene Figur");
  tiefGleich(warnung.feld, { x: 8, y: 4 }, "und zwar auf dem Feld, auf dem er landet");
}

/* ══════════════════════════════════════════════════════════════════
   7 · Esc räumt vollständig auf
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Esc");
{
  const frisch = macheProbe({ brutBei: { x: 6, y: 4 } });
  const sollAnsicht = abbild(frisch.eingabe.ansicht());

  const probe = macheProbe({ brutBei: { x: 6, y: 4 } });
  /* So unordentlich wie möglich: fremder Modus, Fähigkeitsschlüssel,
     Zeiger woanders, Warnung, Übersichtskarte auf. */
  probe.eingabe.beiTaste("4", true);
  probe.eingabe.beiTaste("Tab", true);
  zeigeAuf(probe, 2, 4);
  klickeAuf(probe, 14, 10);
  const unordnung = probe.eingabe.ansicht();
  behaupte(unordnung.warnung !== null, "vor Esc steht eine Warnung");
  gleich(unordnung.ganzeKarte, true, "vor Esc ist die Übersichtskarte offen");

  probe.eingabe.beiTaste("Escape", true);
  tiefGleich(abbild(probe.eingabe.ansicht()), sollAnsicht,
    "nach Esc ist die Ansicht Stück für Stück die einer frisch gebauten Eingabe");
  gleich(probe.eingabe.ansicht().schluessel, null, "kein Fähigkeitsschlüssel bleibt liegen");
  gleich(probe.geschickt.length, 0, "und geschickt wurde bei alledem nichts");
}

/* ══════════════════════════════════════════════════════════════════
   8 · Die Tastatur erreicht jedes Feld, das die Maus erreicht
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Tastatur");
{
  const probe = macheProbe();
  const karte = probe.zustand.karte;

  /* In die linke obere Ecke, dann Zeile für Zeile durch die ganze
     Karte — nur mit Pfeiltasten. */
  for (let i = 0; i < BREITE; i++) probe.eingabe.beiTaste("ArrowLeft", true);
  for (let i = 0; i < HOEHE; i++) probe.eingabe.beiTaste("ArrowUp", true);
  tiefGleich(probe.eingabe.ansicht().zeigerFeld, { x: 0, y: 0 },
    "der Zeiger bleibt am Rand stehen und läuft nicht aus der Karte");

  const besucht = new Set();
  const merke = () => {
    const feld = probe.eingabe.ansicht().zeigerFeld;
    besucht.add(`${feld.x},${feld.y}`);
    return feld;
  };
  merke();
  let ungleich = 0;
  for (let y = 0; y < HOEHE; y++) {
    for (let i = 0; i < BREITE - 1; i++) {
      const richtung = y % 2 === 0 ? "ArrowRight" : "ArrowLeft";
      probe.eingabe.beiTaste(richtung, true);
      const feld = merke();
      /* Was die Maus in derselben Kachel ergäbe, muss dasselbe sein. */
      const mitMaus = zeigeAuf(probe, feld.x, feld.y);
      if (mitMaus.x !== feld.x || mitMaus.y !== feld.y) ungleich++;
    }
    if (y < HOEHE - 1) { probe.eingabe.beiTaste("ArrowDown", true); merke(); }
  }
  gleich(besucht.size, BREITE * HOEHE,
    `die Tastatur erreicht alle ${BREITE * HOEHE} Felder der Karte`);
  berichte.push(`Tastatur: ${besucht.size} von ${BREITE * HOEHE} Feldern nur über Pfeiltasten`);
  gleich(ungleich, 0, "jedes ertastete Feld ist dasselbe, das die Maus dort ergäbe");

  /* Die Gegenrichtung: Außerhalb der Karte erreicht auch die Maus
     nichts — sonst wäre der Satz oben leicht zu erfüllen. */
  gleich(probe.eingabe.beiZeiger(-500, -500), null,
    "außerhalb der Karte gibt es kein Feld");

  /* Enter bestätigt wie ein Linksklick. */
  const zweite = macheProbe();
  zweite.eingabe.beiTaste("ArrowRight", true);
  const geschickt = zweite.eingabe.beiTaste("Enter", true);
  tiefGleich(geschickt, { typ: AKTION.gehen, wer: 1, nach: { x: 6, y: 4 } },
    "Enter bestätigt das Feld unter dem Zeiger");

  /* Leertaste und W. */
  const dritte = macheProbe();
  tiefGleich(dritte.eingabe.beiTaste(" ", true), { typ: AKTION.zugEnde, wer: 1 },
    "die Leertaste beendet den Zug");
  const vierte = macheProbe();
  tiefGleich(vierte.eingabe.beiTaste("w", true), { typ: AKTION.wacht, wer: 1 },
    "W stellt auf Wacht");
  const fuenfte = macheProbe();
  tiefGleich(fuenfte.eingabe.beiTaste("6", true), { typ: AKTION.trank, wer: 1 },
    "Taste 6 trinkt einen Trank");

  /* Tab schaltet die Übersichtskarte um und wieder zurück. */
  const sechste = macheProbe();
  sechste.eingabe.beiTaste("Tab", true);
  gleich(sechste.eingabe.ansicht().ganzeKarte, true, "Tab zeigt die ganze Karte");
  sechste.eingabe.beiTaste("Tab", true);
  gleich(sechste.eingabe.ansicht().ganzeKarte, false, "und noch einmal Tab schließt sie");
  gleich(sechste.geschickt.length, 0, "Tab schickt keine Aktion");

  /* Ein Loslassen ist kein Befehl. */
  const siebte = macheProbe();
  gleich(siebte.eingabe.beiTaste(" ", false), null, "beim Loslassen geschieht nichts");
  gleich(siebte.geschickt.length, 0, "und es wird nichts geschickt");
}

/* ══════════════════════════════════════════════════════════════════
   9 · Fähigkeiten — aufgezählt, aber entschieden vom Kern
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Fähigkeiten");
{
  /* Der Späher trägt `satzsprung` (Feldwirkung) und `weitblick`
     (wirkt auf sich selbst). Zwei verschiedene Formen, eine Taste. */
  const probe = macheProbe();
  const w = probe.zustand.wesen[0];
  tiefGleich(w.faehigkeiten, ["satzsprung", "weitblick"], "der Späher hat diese zwei");

  probe.eingabe.beiTaste("4", true);
  gleich(probe.eingabe.ansicht().modus, MODUS.faehigkeit,
    "die Feldfähigkeit öffnet einen Modus, weil sie ein Feld braucht");
  gleich(probe.eingabe.ansicht().schluessel, "satzsprung", "und merkt sich, welche");
  gleich(probe.geschickt.length, 0, "geschickt wurde dabei nichts");

  /* Auf das Plateau, nicht daneben: Der Satz trägt eine Ebene hinauf,
     aber nicht zwei hinab — dafür gibt es die Sturzregel. */
  const gesprungen = klickeAuf(probe, 3, 4);
  behaupte(gesprungen !== null && gesprungen.typ === AKTION.faehigkeit,
    "ein Klick im Fähigkeitsmodus schickt die Fähigkeit");
  gleich((gesprungen || {}).schluessel, "satzsprung", "und zwar die angesagte");
  tiefGleich((gesprungen || {}).feld, { x: 3, y: 4 }, "mit dem angeklickten Feld");
  gleich((gesprungen || {}).ziel, null, "ohne Ziel — die Wirkung geht auf ein Feld");

  const zweite = macheProbe();
  const sofort = zweite.eingabe.beiTaste("5", true);
  behaupte(sofort !== null && sofort.schluessel === "weitblick",
    "eine Fähigkeit auf sich selbst läuft sofort los, ohne Modus");
  gleich((sofort || {}).ziel, null, "sie trägt kein Ziel");
  gleich((sofort || {}).feld, null,
    "und kein Feld — was keine Regel liest, geht nicht über die Leitung");
  gleich(zweite.eingabe.ansicht().modus, MODUS.gehen, "und der Modus bleibt bei Gehen");

  /* Eine dritte Fähigkeit gibt es nicht — die Taste sagt es. */
  const dritte = macheProbe();
  gleich(dritte.eingabe.beiTaste("4", true), null, "Taste 4 schickt selbst nichts");
  dritte.eingabe.beiTaste("Escape", true);
}

/* ══════════════════════════════════════════════════════════════════
   10 · Die Eingabe wendet nichts an
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Nichts anwenden");
{
  const probe = macheProbe({ brutBei: { x: 6, y: 4 } });
  const vorher = zustandsSumme(probe.zustand);
  const protokollVorher = probe.zustand.protokoll.length;

  klickeAuf(probe, 4, 4);
  klickeAuf(probe, 6, 4, KNOPF_RECHTS);
  probe.eingabe.beiTaste("s", true);
  probe.eingabe.beiTaste("ArrowRight", true);
  probe.eingabe.beiTaste("w", true);
  probe.eingabe.beiTaste(" ", true);
  probe.eingabe.beiTaste("4", true);
  klickeAuf(probe, 3, 4);
  for (const { x, y } of alleFelder(probe.zustand.karte)) zeigeAuf(probe, x, y);

  behaupte(probe.geschickt.length >= 6,
    `es wurden ${probe.geschickt.length} Aktionen geschickt — der Fall ist also nicht leer`);
  gleich(zustandsSumme(probe.zustand), vorher,
    "die Prüfzahl des Spielstands hat sich durch nichts davon geändert");
  gleich(probe.zustand.protokoll.length, protokollVorher,
    "und im Protokoll steht keine einzige angewandte Aktion");

  /* Sagt die Sitzung nein, bleibt es bei der Warnung — und die
     Eingabe schickt nicht ein zweites Mal hinterher. */
  const abgelehnt = macheProbe({ annehmen: false });
  const versuch = klickeAuf(abgelehnt, 6, 4);
  gleich(versuch, null, "eine abgelehnte Aktion gibt null zurück");
  gleich(abgelehnt.geschickt.length, 1, "sie wurde genau einmal angeboten");
  const abgesagt = abgelehnt.eingabe.ansicht().warnung || {};
  gleich(abgesagt.art, WARNUNG.abgelehnt,
    "und der Spieler erfährt, dass sie nicht angenommen wurde");
}

/* ══════════════════════════════════════════════════════════════════
   11 · Wer nicht am Zug ist, gibt keine Befehle
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Fremder Zug");
{
  const probe = macheProbe({ brutBei: { x: 6, y: 4 } });
  probe.zustand.amZug = 1;            /* jetzt ist die Brut dran */
  gleich(klickeAuf(probe, 4, 4), null, "im Zug der Brut erzeugt ein Klick keine Aktion");
  gleich(probe.geschickt.length, 0, "und schickt nichts");
  gleich(probe.eingabe.ansicht().reichweite.size, 0,
    "es gibt auch keine Reichweite zu zeigen");
  behaupte(probe.eingabe.ansicht().warnung !== null, "der Spieler erfährt, warum nichts geht");

  const vorbei = macheProbe();
  vorbei.zustand.vorbei = "sieg";
  gleich(vorbei.eingabe.beiTaste(" ", true), null, "nach dem Lauf nimmt die Eingabe nichts mehr");
  gleich(vorbei.geschickt.length, 0, "und schickt nichts");

  /* Ein anderer Platz: Die Figur gehört Platz 1, gefragt wird Platz 2. */
  const zustand = baueZustand();
  const kamera = macheKamera({ fensterBreite: 640, fensterHoehe: 480, karte: zustand.karte });
  const gesendet = [];
  const fremd = macheEingabe({
    kamera, zustand, platz: 2, sende: (a) => { gesendet.push(a); return true; }
  });
  const p = punktVon(kamera, 6, 4);
  gleich(fremd.beiKlick(p.x, p.y, KNOPF_LINKS), null,
    "die Figur eines anderen Platzes steuert dieser Rechner nicht");
  gleich(gesendet.length, 0, "und schickt für sie nichts");
}

/* ══════════════════════════════════════════════════════════════════
   12 · Der Weg vom Browser-Ereignis bis zur Aktion
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Leinwand");
{
  const blatt = macheLeinwandErsatz();
  const probe = macheProbe({ leinwand: blatt, brutBei: { x: 6, y: 4 } });
  tiefGleich(blatt.namen(),
    ["blatt:contextmenu", "blatt:pointerdown", "blatt:pointermove",
      "schrift:keydown", "schrift:keyup",
      "schrift:pointercancel", "schrift:pointerup"].sort(),
    "die Eingabe meldet sich für sieben Ereignisse an");

  /* Die Leinwand ist 640×480 groß und wird auch so angezeigt — also
     ist ein Fensterpunkt ein Blattpunkt. */
  const ziel = punktVon(probe.kamera, 4, 4);
  const bewegung = macheEreignis({ clientX: ziel.x, clientY: ziel.y, pointerType: "mouse" });
  gleich(blatt.feuere("pointermove", bewegung), 1, "die Mausbewegung erreicht einen Hörer");
  tiefGleich(probe.eingabe.ansicht().zeigerFeld, { x: 4, y: 4 },
    "und setzt den Zeiger auf das Feld unter dem Mauspunkt");

  const druck = macheEreignis({
    clientX: ziel.x, clientY: ziel.y, button: 0, pointerType: "mouse", pointerId: 1
  });
  blatt.feuere("pointerdown", druck);
  gleich(probe.geschickt.length, 1, "ein Mausdruck erzeugt die Aktion");
  tiefGleich(probe.geschickt[0], { typ: AKTION.gehen, wer: 1, nach: { x: 4, y: 4 } },
    "und zwar die richtige");
  behaupte(druck.gehalten() > 0, "der Browser bekommt den Druck nicht mehr zu sehen");
  blatt.feuere("pointerup", macheEreignis({ pointerType: "mouse", pointerId: 1 }));

  const menue = macheEreignis({});
  blatt.feuere("contextmenu", menue);
  behaupte(menue.gehalten() > 0,
    "das Kontextmenü wird abgefangen — sonst verdeckte es beim Rechtsklick das Spiel");

  const taste = macheEreignis({ key: " " });
  blatt.feuere("keydown", taste);
  gleich(probe.geschickt.length, 2, "die Leertaste am Blatt beendet den Zug");
  gleich((probe.geschickt[1] || {}).typ, AKTION.zugEnde, "und zwar mit der Zugende-Aktion");
  behaupte(taste.gehalten() > 0, "die Leertaste rollt die Seite nicht weg");

  const fremdeTaste = macheEreignis({ key: "F5" });
  blatt.feuere("keydown", fremdeTaste);
  gleich(fremdeTaste.gehalten(), 0, "eine fremde Taste bleibt dem Browser");

  probe.eingabe.loese();
  gleich(blatt.anzahl(), 0, "loese() meldet jeden Hörer wieder ab");
  const nachher = probe.geschickt.length;
  blatt.feuere("pointerdown", macheEreignis({
    clientX: ziel.x, clientY: ziel.y, button: 0, pointerType: "mouse", pointerId: 1
  }));
  gleich(probe.geschickt.length, nachher, "danach kommt über das Blatt nichts mehr an");
}
/* ══════════════════════════════════════════════════════════════════
   13 · Zweimal dasselbe gibt zweimal dasselbe
   ══════════════════════════════════════════════════════════════════ */

abschnitt("Gleichlauf");
{
  const folge = (probe) => {
    probe.eingabe.beiTaste("2", true);
    klickeAuf(probe, 6, 4);
    probe.eingabe.beiTaste("Escape", true);
    for (let i = 0; i < 4; i++) probe.eingabe.beiTaste("ArrowRight", true);
    probe.eingabe.beiTaste("Enter", true);
    probe.eingabe.beiTaste("4", true);
    klickeAuf(probe, 2, 5);
    probe.eingabe.beiTaste("w", true);
    const bilder = [];
    for (const { x, y } of alleFelder(probe.zustand.karte)) {
      zeigeAuf(probe, x, y);
      bilder.push(abbild(probe.eingabe.ansicht()));
    }
    return JSON.stringify({ geschickt: probe.geschickt, bilder });
  };

  const eins = folge(macheProbe({ brutBei: { x: 6, y: 4 } }));
  const zwei = folge(macheProbe({ brutBei: { x: 6, y: 4 } }));
  gleich(eins, zwei, "dieselbe Tastenfolge auf demselben Stand gibt byteweise dasselbe");
  behaupte(eins.length > 5000, `verglichen wurden ${eins.length} Zeichen Ansicht und Aktionen`);
  berichte.push(`Gleichlauf: zweimal ${eins.length} Zeichen Ansicht und Aktionen, gleich`);
}

for (const zeile of berichte) console.log(`      · ${zeile}`);

ende("Eingabe");
