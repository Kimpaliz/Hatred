/* [Aufgabe: Prüfwesen] Prüft die Gegner-KI aus `spiel/gegner-ki.mjs` —
   ob sie die Höhen wirklich benutzt, ob sie zweimal dasselbe plant und
   ob sie unter allen Umständen fertig wird.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Eine KI fällt nicht laut aus. Sie läuft weiter, sie stellt sich nur
   dumm hin — und das merkt man beim Spielen als „irgendwie langweilig",
   nicht als Fehler. Genau deshalb wird hier nicht geprüft, **dass** ein
   Gegner etwas tut, sondern **was** er tut, und zwar an Stellungen, in
   denen die falsche Antwort genauso gut aussieht wie die richtige:

   · **Der Schütze und das Podest.** Ein Schütze, der unten stehen
     bleibt und schießt, sieht im Spiel völlig normal aus. Nur die Zahl
     verrät ihn: Ohne Höhensuche fehlen ihm +12 % Trefferchance und ein
     Feld Reichweite, und das ganze Höhensystem ist Zierde. Geprüft wird
     deshalb, dass der Plan **zuerst** auf die Ebene 2 führt und danach
     schießt — und dass er oben **bleibt**.
   · **Der Stoß über die Kante.** Der Zug, der das Spiel gefährlich
     macht. Geprüft wird beides: dass er kommt, wenn hinter dem Jäger
     zwei Ebenen Fall liegen, und dass er **nicht** kommt, wenn dort
     flacher Boden ist — sonst verschenkt die Brut zwei Punkte für ein
     Schubsen ohne Wirkung.
   · **Deckung gegen Umweg.** Die Forderung lautet „Deckung dem geraden
     Weg vorziehen, wenn der Umweg höchstens 2 AP kostet". Das ist eine
     Zahl, keine Stimmung — geprüft werden deshalb **beide** Seiten der
     Grenze an derselben Karte: zwei Punkte Umweg müssen gewinnen, drei
     müssen verlieren.
   · **Niemand läuft in die Lava.** Der Fehler, den man dabei baut, ist
     nicht „die KI stellt sich in die Lava", sondern „das **Zielfeld**
     liegt trocken, aber der Weg dorthin führt hindurch". `wendeAn`
     sucht sich den Weg selbst und nimmt den billigsten; die KI muss ihn
     deshalb gegenprüfen. Geprüft wird darum der ganze Lauf über drei
     Züge: kein einziges Lavaereignis, und der Gegner kommt trotzdem an.
   · **Der Lauerer bleibt im Dunkeln.** Ohne diese Regel ist der
     Dunkelweber ein gewöhnlicher Stürmer, der zufällig im Dunkeln
     anfängt. Geprüft wird der Unterschied: Jäger außer Reichweite → er
     rührt sich nicht; Jäger in Reichweite → er kommt.
   · **Die Planung endet immer.** Ein eingekesseltes Wesen, eines ohne
     Punkte, eines ohne Ziel: Jeder Plan endet mit `zugEnde`, und wer
     weder gehen noch schlagen kann, geht auf **Wacht** statt
     dazustehen.
   · **Gleichlauf.** Dieselbe Lage muss fünfzigmal dieselbe
     Aktionsliste geben — und dabei den Zustand nicht anfassen. Daran
     hängt der Internet-Koop: Plant ein Rechner anders als die anderen,
     laufen vier Spiele auseinander, und der Desync-Wächter merkt es
     erst Runden später.

   Zuletzt läuft ein ganzer Kerker: erzeugtes Gelände, Helden und Brut,
   acht Runden lang jede Figur von der KI geführt. Das ist die Probe
   darauf, dass die Planung auf **echten** Karten fertig wird und
   nichts vorschlägt, was `pruefeAktion` ablehnt — auf Handkarten
   könnte man das nicht sehen.

   **Warum Handkarten und nicht die erzeugte Landschaft.** Für das
   Verhalten braucht die Prüfung Stellungen, die sie selbst gebaut hat:
   ein Podest an dieser Stelle, eine Kante an jener, ein Fass genau
   dort. In einer erzeugten Karte müsste sie erst suchen, ob es so eine
   Stelle überhaupt gibt — und was sie dann prüfte, hinge an der Saat.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/helfer.mjs` (das Prüfgerüst), `spiel/gegner-ki.mjs` (das
   Geprüfte), `spiel/gitter.mjs`, `spiel/hoehen.mjs`, `spiel/licht.mjs`,
   `spiel/wegfindung.mjs`, `spiel/zug.mjs`, `spiel/aktionen.mjs`,
   `spiel/landschaft.mjs`, `spiel/katalog/*.mjs` (die Zahlen, gegen die
   nachgerechnet wird), `werkzeuge/pruefe-alles.mjs` (startet diese
   Datei als eigenen Prozess und liest den Rückgabewert). */

import { abschnitt, behaupte, gleich, tiefGleich, ende } from "./helfer.mjs";
import { macheKarte, BODEN, FLUESSIG, HINDERNIS, RAMPE, schussweite } from "../spiel/gitter.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { LAVA_SCHADEN, betretenSchaden } from "../spiel/hoehen.mjs";
import { wegSuche, naechstesFreiesFeld } from "../spiel/wegfindung.mjs";
import { baueLandschaft } from "../spiel/landschaft.mjs";
import { macheWesen } from "../spiel/wesen.mjs";
import { HELDEN, held } from "../spiel/katalog/helden.mjs";
import { GEGNER, VERHALTEN, waehleGegner } from "../spiel/katalog/gegner.mjs";
import { starteRunde, amZugWesen, macheOrdnung, AP_JE_ZUG } from "../spiel/zug.mjs";
import { AKTION, pruefeAktion, wendeAn } from "../spiel/aktionen.mjs";
import {
  planeZug, bewerteFeld, naechsteAktion, verhaltenVon, wahrgenommeneZiele,
  ART_GEWICHTE, WERT_JE_AP, WERT_JE_SCHADEN, WERT_DECKUNG, UMWEG_FUER_DECKUNG,
  WERT_UNMOEGLICH, WERT_TOD, GEFAHR_JE_SCHADEN, HOECHSTENS_SCHRITTE, STANDARD_VERHALTEN
} from "../spiel/gegner-ki.mjs";

/* ── Werkzeug der Prüfung ───────────────────────────────────────────

   Eine Probekarte ist flach, leer und trägt **ein** Licht mit eigener
   Reichweite über die ganze Fläche. Ohne Licht gilt jedes Ziel jenseits
   von zwei Feldern als verborgen (`spiel/licht.mjs`) — dann prüfte man
   versehentlich die Dunkelheit statt der Entscheidung. Wo die
   Dunkelheit selbst geprüft wird (Lauerer), steht das Licht statt
   dessen auf dem Jäger: Wer eine Fackel trägt, wird gesehen. */
function macheProbekarte(breite, hoehe) {
  const karte = macheKarte(breite, hoehe);
  karte.boden.fill(BODEN.stein);
  karte.lichter = [{
    x: (breite / 2) | 0, y: (hoehe / 2) | 0,
    art: "fackel", staerke: 1, weite: breite + hoehe
  }];
  return karte;
}

function probeWesen(o) {
  return {
    id: o.id,
    art: o.art || "probe",
    seite: o.seite,
    x: o.x,
    y: o.y,
    lp: o.lp === undefined ? 20 : o.lp,
    lpMax: o.lpMax === undefined ? (o.lp === undefined ? 20 : o.lp) : o.lpMax,
    ap: o.ap === undefined ? AP_JE_ZUG : o.ap,
    apMax: o.apMax === undefined ? (o.ap === undefined ? AP_JE_ZUG : o.ap) : o.apMax,
    flinkheit: o.flinkheit === undefined ? 5 : o.flinkheit,
    ruestung: o.ruestung === undefined ? 0 : o.ruestung,
    sicht: o.sicht === undefined ? 14 : o.sicht,
    waffe: o.waffe || "rostdolch",
    faehigkeiten: o.faehigkeiten || [],
    wirkungen: [],
    wacht: false,
    lebt: true,
    spielerPlatz: null,
    traenke: 0,
    eigenheit: null,
    verhalten: o.verhalten
  };
}

function macheZustand(karte, liste, saat = 41) {
  const zustand = {
    saat, tiefe: 1, karte,
    zufall: macheZufall(saat),
    wesen: liste,
    nachId: new Map(liste.map((w) => [w.id, w])),
    runde: 1, ordnung: [], amZug: 0,
    seiteDran: null, spieler: [], vorbei: null, protokoll: []
  };
  starteRunde(zustand);
  return zustand;
}

/* Ein vollständiger Abdruck: Wesen, Zeiger, Kartenprüfsumme und
   Stromstand. Zwei gleiche Abdrücke heißen „nichts hat sich gerührt" —
   und zwar auch nicht der Zufallsstrom, an dem sonst jede spätere
   Runde hinge (Fehlerbuch B4). */
function abdruck(zustand) {
  return JSON.stringify({
    wesen: zustand.wesen,
    runde: zustand.runde,
    amZug: zustand.amZug,
    ordnung: zustand.ordnung,
    seiteDran: zustand.seiteDran,
    vorbei: zustand.vorbei,
    protokoll: zustand.protokoll.length,
    summe: zustand.karte.summe(),
    strom: zustand.zufall.zustand()
  });
}

/* Spielt einen Plan ab, so wie ein Antrieb es tun muss: vor jeder
   Aktion fragen, beim ersten Grund abbrechen. */
function planAbspielen(zustand, plan) {
  const ereignisse = [];
  let abgelehnt = 0;
  for (const aktion of plan) {
    if (pruefeAktion(zustand, aktion) !== null) { abgelehnt += 1; break; }
    ereignisse.push(...wendeAn(zustand, aktion));
  }
  return { ereignisse, abgelehnt };
}

/* Bis das gewünschte Wesen wieder am Zug ist — die anderen beenden
   ihren Zug ohne zu handeln. */
function bisWiederDran(zustand, id, hoechstens = 40) {
  for (let i = 0; i < hoechstens; i++) {
    const dran = amZugWesen(zustand);
    if (!dran || dran.id === id || zustand.vorbei) return;
    wendeAn(zustand, { typ: AKTION.zugEnde, wer: dran.id });
  }
}

function typenVon(plan) {
  return plan.map((a) => a.typ);
}

/* Das Zielfeld eines Plans — ein Feld außerhalb jeder Karte, wenn gar
   nicht gegangen wird. So meldet eine Prüfung, die etwas anderes
   erwartet hat, einen **Fehler** und keinen Absturz: Ein Absturz sagt
   nur „irgendwo weiter oben", eine gefallene Behauptung sagt, was
   fehlt. */
function gangZiel(plan) {
  const gang = plan.find((a) => a.typ === AKTION.gehen);
  return gang && gang.nach ? gang.nach : { x: -1, y: -1 };
}

function wegKosten(karte, von, nach) {
  const weg = wegSuche(karte, von, nach, { maxKosten: Infinity });
  return weg ? weg.kosten : null;
}

/* ══ Die Elle und die Gewichte ═════════════════════════════════════

   Bevor irgendein Verhalten geprüft wird: Stimmen die Zahlen, auf
   denen alles steht? Zwei davon sind so leicht falsch gesetzt, dass
   man es nie merkte:

   · **`naehe` muss über `WERT_JE_AP` liegen.** Sonst ist ein Schritt
     nach vorn genau so viel wert, wie er kostet — und weil die
     Bewegung eine **echte** Verbesserung verlangt, bliebe jeder Gegner
     für immer stehen. Das Spiel liefe weiter, es käme nur nie jemand.
   · **`WERT_DECKUNG` muss genau zwischen zwei und drei Punkten Umweg
     liegen.** Das ist die Forderung, wörtlich als Zahl. */
abschnitt("Die Elle");
{
  gleich(WERT_JE_AP, 100, "ein Aktionspunkt ist 100 wert");
  gleich(WERT_JE_SCHADEN, 100, "ein Lebenspunkt Schaden ist 100 wert");
  behaupte(WERT_DECKUNG > UMWEG_FUER_DECKUNG * WERT_JE_AP,
    `Deckung schlägt ${UMWEG_FUER_DECKUNG} Punkte Umweg (${WERT_DECKUNG})`);
  behaupte(WERT_DECKUNG < (UMWEG_FUER_DECKUNG + 1) * WERT_JE_AP,
    `Deckung schlägt ${UMWEG_FUER_DECKUNG + 1} Punkte Umweg nicht (${WERT_DECKUNG})`);
  behaupte(GEFAHR_JE_SCHADEN * LAVA_SCHADEN > 12 * WERT_JE_AP,
    "Lava schreckt weiter ab, als ein Wesen überhaupt laufen kann");

  for (const art of VERHALTEN) {
    const g = ART_GEWICHTE[art];
    behaupte(!!g, `Verhalten "${art}" hat eigene Gewichte`);
    if (!g) continue;
    behaupte(g.naehe > WERT_JE_AP,
      `"${art}": Annäherung lohnt sich (naehe ${g.naehe} > ${WERT_JE_AP})`);
    behaupte(g.angriff > 0, `"${art}": ein Angriffsfeld ist etwas wert`);
  }
  behaupte(ART_GEWICHTE.schuetze.hoehe > ART_GEWICHTE.stuermer.hoehe,
    "der Schütze zahlt mehr für Höhe als der Stürmer");
  behaupte(ART_GEWICHTE.lauerer.dunkel > ART_GEWICHTE.stuermer.dunkel,
    "der Lauerer zahlt mehr für Dunkelheit als der Stürmer");
}

abschnitt("Das Verhalten kommt aus dem Katalog");
{
  gleich(verhaltenVon({ art: "bogenschinder" }), "schuetze", "Bogenschinder ist ein Schütze");
  gleich(verhaltenVon({ art: "dunkelweber" }), "lauerer", "Dunkelweber ist ein Lauerer");
  gleich(verhaltenVon({ art: "kraetzling" }), "schwarm", "Krätzling gehört zum Schwarm");
  gleich(verhaltenVon({ art: "schildtraeger" }), STANDARD_VERHALTEN,
    "wer keine Gegnervorlage hat, stürmt");
  gleich(verhaltenVon({ art: "kraetzling", verhalten: "speier" }), "speier",
    "ein eigenes Verhalten am Wesen schlägt die Vorlage");
  gleich(verhaltenVon({ art: "kraetzling", verhalten: "unfug" }), "schwarm",
    "ein unbekanntes Wort am Wesen zählt nicht");
}

/* ══ Der Wert eines Standorts ══════════════════════════════════════ */
abschnitt("Bewertung von Standorten");
{
  const karte = macheProbekarte(15, 9);
  karte.setze(5, 4, { fluessig: FLUESSIG.lava });
  karte.setze(7, 7, { hindernis: HINDERNIS.wand });
  const brut = probeWesen({ id: 1, seite: "brut", x: 2, y: 4, verhalten: "stuermer" });
  const jaeger = probeWesen({ id: 2, seite: "jaeger", x: 12, y: 4, lp: 40 });
  const zustand = macheZustand(karte, [brut, jaeger]);
  gleich(wahrgenommeneZiele(zustand, brut).length, 1, "der Jäger ist von hier aus zu sehen");

  gleich(bewerteFeld(zustand, brut, -1, 4), WERT_UNMOEGLICH, "außerhalb der Karte ist unmöglich");
  gleich(bewerteFeld(zustand, brut, 7, 7), WERT_UNMOEGLICH, "eine Wand ist unmöglich");

  /* Ein Lavafeld muss um genau den Gefahrenaufschlag schlechter sein
     als sein trockener Nachbar — beide liegen gleich weit vom Jäger,
     beide ohne Deckung, beide außer Schlagweite. */
  const trocken = bewerteFeld(zustand, brut, 5, 3);
  const heiss = bewerteFeld(zustand, brut, 5, 4);
  gleich(trocken - heiss, GEFAHR_JE_SCHADEN * LAVA_SCHADEN,
    "Lava kostet genau den Gefahrenaufschlag");

  /* Wer daran stirbt, geht nie hinein — unabhängig von allem anderen. */
  const schwach = probeWesen({ id: 3, seite: "brut", x: 2, y: 5, lp: LAVA_SCHADEN, lpMax: 30 });
  zustand.wesen.push(schwach);
  zustand.nachId.set(3, schwach);
  gleich(bewerteFeld(zustand, schwach, 5, 4), WERT_TOD, "tödliche Lava ist gesondert schlecht");

  /* Deckung: dasselbe Feld, einmal mit einem Fass in Angreiferrichtung.
     Ein Fass blockt keine Sicht — es ändert also nichts außer der
     Deckung, und der Unterschied ist die reine Zahl. */
  const ohne = bewerteFeld(zustand, brut, 8, 4);
  karte.setze(9, 4, { hindernis: HINDERNIS.fass });
  const mit = bewerteFeld(zustand, brut, 8, 4);
  gleich(mit - ohne, WERT_DECKUNG, "ein Fass in Angreiferrichtung ist genau `deckung` wert");
}

/* Die Höhe braucht eine eigene Karte: Ein angehobenes Feld wirft für
   das Licht **und** für den Blick einen Schatten (`spiel/hoehen.mjs`,
   `blocktSichtlinie`). Läge es zwischen Fackel und Jäger, prüfte man
   am Ende, dass ein verdunkelter Jäger nicht mehr zu sehen ist —
   richtig, aber nicht die Frage. Deshalb: Fackel **auf** dem Jäger,
   und das angehobene Feld liegt abseits der Linie. */
{
  const karte = macheKarte(15, 9);
  karte.boden.fill(BODEN.stein);
  karte.lichter = [{ x: 12, y: 4, art: "fackel", staerke: 1, weite: 30 }];
  const schuetze = probeWesen({
    id: 1, seite: "brut", x: 2, y: 4, waffe: "kurzbogen", verhalten: "schuetze"
  });
  const jaeger = probeWesen({ id: 2, seite: "jaeger", x: 12, y: 4, lp: 40 });
  const zustand = macheZustand(karte, [schuetze, jaeger]);

  const flach = bewerteFeld(zustand, schuetze, 8, 7);
  karte.setze(8, 7, { ebene: 2 });
  const hoch = bewerteFeld(zustand, schuetze, 8, 7);
  gleich(wahrgenommeneZiele(zustand, schuetze).length, 1, "der Jäger bleibt sichtbar");
  gleich(hoch - flach, ART_GEWICHTE.schuetze.hoehe, "eine Ebene höher ist genau `hoehe` wert");
}

/* ══ Der Schütze und das Podest ════════════════════════════════════

   Die Karte: flacher Grund, ein Podest der Ebene 2 in der linken
   oberen Ecke, eine Rampe darunter. Der Schütze steht unten und hat
   den Jäger bereits im Schuss — er müsste also **nicht** steigen. Wer
   die Höhen nicht bewertet, bleibt genau deshalb stehen. */
abschnitt("Der Schütze sucht die Höhe");
{
  const karte = macheKarte(15, 9);
  karte.boden.fill(BODEN.stein);
  for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) karte.setze(x, y, { ebene: 2 });
  karte.setze(2, 5, { rampe: RAMPE.nord });
  karte.lichter = [{ x: 9, y: 6, art: "fackel", staerke: 1 }];

  const schuetze = probeWesen({
    id: 1, seite: "brut", x: 2, y: 6, waffe: "kurzbogen",
    verhalten: "schuetze", sicht: 12, flinkheit: 9
  });
  const jaeger = probeWesen({ id: 2, seite: "jaeger", x: 9, y: 6, lp: 40 });
  const zustand = macheZustand(karte, [schuetze, jaeger]);

  behaupte(wahrgenommeneZiele(zustand, schuetze).length === 1,
    "der Schütze nimmt den Jäger von unten bereits wahr");
  const unten = bewerteFeld(zustand, schuetze, 2, 6);
  const oben = bewerteFeld(zustand, schuetze, 2, 4);
  behaupte(oben > unten, `das Podest ist besser als der Boden (${oben} gegen ${unten})`);

  const plan = planeZug(zustand, schuetze);
  tiefGleich(typenVon(plan), ["gehen", "angriff", "zugEnde"],
    "der Schütze steigt zuerst und schießt dann");
  const podest = gangZiel(plan);
  tiefGleich(podest, { x: 2, y: 4 }, "er steigt auf das Podest");
  gleich(karte.ebeneBei(podest.x, podest.y), 2, "das Zielfeld liegt auf Ebene 2");

  const lauf = planAbspielen(zustand, plan);
  gleich(lauf.abgelehnt, 0, "der ganze Plan des Schützen ist anwendbar");
  gleich(schuetze.y, 4, "danach steht er oben");

  /* Und er bleibt: In der nächsten Runde ist kein Schritt mehr besser
     als das Podest. */
  bisWiederDran(zustand, schuetze.id);
  const zweiter = planeZug(zustand, schuetze);
  behaupte(!zweiter.some((a) => a.typ === AKTION.gehen), "in der nächsten Runde bleibt er oben");
  behaupte(zweiter.some((a) => a.typ === AKTION.angriff), "und schießt weiter");
  console.log(`      · Schütze: Boden ${unten}, Podest ${oben} — Unterschied ${oben - unten}`);
}

/* ══ Der Stoß über die Kante ═══════════════════════════════════════ */
abschnitt("Der Stoß über die Kante");
{
  const baue = (abgrund) => {
    const karte = macheProbekarte(12, 9);
    for (let y = 2; y <= 6; y++) for (let x = 3; x <= 7; x++) karte.setze(x, y, { ebene: 3 });
    if (!abgrund) for (let y = 2; y <= 6; y++) karte.setze(8, y, { ebene: 3 });
    const brut = probeWesen({
      id: 1, seite: "brut", x: 6, y: 4, waffe: "hetzerbiss", verhalten: "stuermer"
    });
    const jaeger = probeWesen({ id: 2, seite: "jaeger", x: 7, y: 4, lp: 40 });
    return { karte, brut, jaeger, zustand: macheZustand(karte, [brut, jaeger]) };
  };

  const kante = baue(true);
  const plan = planeZug(kante.zustand, kante.brut);
  gleich(plan[0].typ, AKTION.stoss, "an der Kante wird zuerst gestoßen");
  gleich(plan[0].ziel, kante.jaeger.id, "und zwar der Jäger");

  const lauf = planAbspielen(kante.zustand, plan);
  const sturz = lauf.ereignisse.find((e) => e.art === "gestuerzt");
  behaupte(!!sturz, "der Jäger stürzt wirklich");
  if (sturz) {
    gleich(sturz.stufen, 2, "zwei Ebenen tief");
    gleich(sturz.wer, kante.jaeger.id, "gestürzt ist der Jäger");
  }
  gleich(kante.jaeger.ap, 0, "der Sturz nimmt ihm alle Punkte");

  /* Ohne Abgrund ist derselbe Stoß zwei Punkte für nichts — dann wird
     geschlagen. Ohne diese Gegenprobe hieße „stößt immer" auch
     bestanden. */
  const flach = baue(false);
  const plan2 = planeZug(flach.zustand, flach.brut);
  behaupte(!plan2.some((a) => a.typ === AKTION.stoss),
    "ohne Fallhöhe wird nicht gestoßen");
  gleich(plan2[0].typ, AKTION.angriff, "sondern geschlagen");
  console.log(`      · an der Kante ${typenVon(plan).join(", ")}`
    + ` · auf flachem Grund ${typenVon(plan2).join(", ")}`);
}

/* Dieselbe Idee aus der Ferne: Der Kettenwicht kommt hinter dem Gitter
   nicht heran — aber seine Hakenkette holt den Jäger vom Podest, und
   der Weg hinunter ist zwei Ebenen weit. Ohne diesen Fall bliebe der
   Zweig `ziehen` ungelaufen: Steht der Kettenwicht frei, ist ein
   Schritt und ein gewöhnlicher Stoß immer die billigere Antwort. */
abschnitt("Die Kette holt ihn vom Podest");
{
  const karte = macheProbekarte(15, 9);
  for (let y = 2; y <= 6; y++) for (let x = 3; x <= 5; x++) karte.setze(x, y, { ebene: 3 });
  for (let y = 0; y < 9; y++) karte.setze(7, y, { hindernis: HINDERNIS.gitter });
  const wicht = probeWesen({
    id: 1, seite: "brut", x: 8, y: 4, art: "kettenwicht", faehigkeiten: ["hakenkette"]
  });
  const jaeger = probeWesen({ id: 2, seite: "jaeger", x: 5, y: 4, lp: 40 });
  const zustand = macheZustand(karte, [wicht, jaeger]);

  gleich(verhaltenVon(wicht), "lauerer", "der Kettenwicht ist ein Lauerer");
  gleich(wahrgenommeneZiele(zustand, wicht).length, 1, "durch das Gitter sieht er den Jäger");
  const plan = planeZug(zustand, wicht);
  gleich(plan[0].typ, AKTION.faehigkeit, "er greift zur Fähigkeit");
  gleich(plan[0].schluessel, "hakenkette", "und zwar zur Hakenkette");

  const lauf = planAbspielen(zustand, plan);
  const sturz = lauf.ereignisse.find((e) => e.art === "gestuerzt");
  behaupte(!!sturz, "der Jäger stürzt vom Podest");
  if (sturz) gleich(sturz.stufen, 2, "zwei Ebenen tief");
  gleich(karte.ebeneBei(jaeger.x, jaeger.y), 1, "und steht danach unten");
}

/* ══ Deckung gegen Umweg ═══════════════════════════════════════════

   Die Karte: offener Grund, ein Wasserband bei x = 9, das den Anmarsch
   bremst, und ein Fass, das genau einem Feld Deckung gibt. Beide
   Kandidaten liegen **gleich weit** vom Jäger (Schachbrett 4) — es
   entscheidet allein die Deckung gegen den Umweg.

   Gemessen wird nicht „die KI nimmt das gedeckte Feld", sondern der
   Vergleich selbst, an beiden Seiten der Grenze: zwei Punkte Umweg
   müssen gewinnen, drei müssen verlieren. */
abschnitt("Deckung gegen Umweg");
{
  const baue = (fassX, fassY, ap) => {
    const karte = macheProbekarte(15, 9);
    for (let y = 0; y < 9; y++) karte.setze(9, y, { fluessig: FLUESSIG.wasser });
    karte.setze(fassX, fassY, { hindernis: HINDERNIS.fass });
    const brut = probeWesen({ id: 1, seite: "brut", x: 2, y: 4, ap, verhalten: "stuermer" });
    const jaeger = probeWesen({ id: 2, seite: "jaeger", x: 12, y: 4, lp: 40 });
    return { karte, brut, jaeger, zustand: macheZustand(karte, [brut, jaeger]) };
  };
  const netto = (lage, x, y) => bewerteFeld(lage.zustand, lage.brut, x, y)
    - WERT_JE_AP * wegKosten(lage.karte, { x: 2, y: 4 }, { x, y });

  const nah = baue(9, 2, 8);
  const geradeKosten = wegKosten(nah.karte, { x: 2, y: 4 }, { x: 8, y: 4 });
  const umwegKosten = wegKosten(nah.karte, { x: 2, y: 4 }, { x: 8, y: 2 });
  gleich(umwegKosten - geradeKosten, UMWEG_FUER_DECKUNG, "der Umweg kostet genau zwei Punkte");
  gleich(schussweite(8, 2, 12, 4), schussweite(8, 4, 12, 4),
    "beide Kandidaten liegen gleich weit vom Jäger");
  const gedeckt2 = netto(nah, 8, 2);
  const gerade2 = netto(nah, 8, 4);
  behaupte(gedeckt2 > gerade2,
    `zwei Punkte Umweg lohnen sich für Deckung (${gedeckt2} gegen ${gerade2})`);
  tiefGleich(gangZiel(planeZug(nah.zustand, nah.brut)), { x: 8, y: 2 },
    "die KI geht wirklich hinter das Fass");

  const fern = baue(9, 1, 9);
  const umwegDrei = wegKosten(fern.karte, { x: 2, y: 4 }, { x: 8, y: 1 });
  gleich(umwegDrei - geradeKosten, UMWEG_FUER_DECKUNG + 1, "der zweite Umweg kostet drei");
  const gedeckt3 = netto(fern, 8, 1);
  const gerade3 = netto(fern, 8, 4);
  behaupte(gedeckt3 < gerade3,
    `drei Punkte Umweg lohnen sich nicht (${gedeckt3} gegen ${gerade3})`);
  const fernZiel = gangZiel(planeZug(fern.zustand, fern.brut));
  behaupte(!(fernZiel.x === 8 && fernZiel.y === 1), "und die KI nimmt ihn auch nicht");
  console.log(`      · Umweg 2: ${gedeckt2} gegen ${gerade2}`
    + ` · Umweg 3: ${gedeckt3} gegen ${gerade3}`);
}

/* ══ Niemand läuft in die Lava ═════════════════════════════════════

   Ein Gang von links nach rechts mit einer Lavapfütze in der Mitte und
   einem Umweg darüber. Der Gang ist überall genau ein Feld breit —
   damit gibt es zu jedem Ziel **einen** Weg und keine Frage, welchen
   `wendeAn` nimmt.

   Das Zielfeld hinter der Lava wäre die beste Wahl von allen. Sein
   billigster Weg führt aber mitten hindurch, und genau darum darf die
   KI es nicht wählen. Ohne diese Gegenprüfung sähe der Plan völlig
   vernünftig aus — und der Gegner stünde am Ende des Zuges mit acht
   Punkten Brandschaden im Gang. */
abschnitt("Niemand läuft in die Lava");
{
  const karte = macheKarte(11, 7);
  karte.boden.fill(BODEN.stein);
  karte.hindernis.fill(HINDERNIS.wand);
  for (let x = 1; x <= 9; x++) karte.setze(x, 3, { hindernis: HINDERNIS.keins });
  for (let x = 3; x <= 7; x++) karte.setze(x, 2, { hindernis: HINDERNIS.keins });
  karte.setze(5, 3, { fluessig: FLUESSIG.lava });
  karte.lichter = [{ x: 9, y: 3, art: "fackel", staerke: 1, weite: 30 }];

  const brut = probeWesen({ id: 1, seite: "brut", x: 1, y: 3, verhalten: "stuermer" });
  const jaeger = probeWesen({ id: 2, seite: "jaeger", x: 9, y: 3, lp: 90, lpMax: 90 });
  const zustand = macheZustand(karte, [brut, jaeger]);

  /* Ohne die Wegprüfung wäre (6,3) die beste Wahl: gleich hinter der
     Lava, gleich nah am Jäger wie das Umwegfeld darüber — und drei
     Punkte billiger zu erreichen. Verglichen wird deshalb so, wie die
     KI vergleicht: Standortwert **minus Weg**. */
  const hinterLava = bewerteFeld(zustand, brut, 6, 3)
    - WERT_JE_AP * wegKosten(karte, { x: 1, y: 3 }, { x: 6, y: 3 });
  const ueberLava = bewerteFeld(zustand, brut, 6, 2)
    - WERT_JE_AP * wegKosten(karte, { x: 1, y: 3 }, { x: 6, y: 2 });
  behaupte(hinterLava > ueberLava,
    `das Feld hinter der Lava wäre das bessere (${hinterLava} gegen ${ueberLava})`);
  const durch = wegSuche(karte, { x: 1, y: 3 }, { x: 6, y: 3 }, { maxKosten: Infinity });
  behaupte(durch.pfad.some((f) => f.x === 5 && f.y === 3),
    "und sein billigster Weg führt wirklich durch die Lava");

  let lavaSchaden = 0;
  let gegangen = 0;
  for (let runde = 0; runde < 3; runde++) {
    const plan = planeZug(zustand, brut);
    for (const aktion of plan) {
      if (aktion.typ !== AKTION.gehen) continue;
      gegangen += 1;
      const weg = wegSuche(karte, { x: brut.x, y: brut.y }, aktion.nach, { maxKosten: brut.ap });
      behaupte(!!weg && !weg.pfad.some((f) => betretenSchaden(karte, f.x, f.y)),
        `der geplante Weg nach (${aktion.nach.x},${aktion.nach.y}) meidet die Lava`);
    }
    const lauf = planAbspielen(zustand, plan);
    for (const e of lauf.ereignisse) {
      if (e.art === "schaden" && e.quelle === "lava" && e.wer === brut.id) lavaSchaden += e.wieviel;
    }
    bisWiederDran(zustand, brut.id);
  }
  gleich(lavaSchaden, 0, "in drei Zügen kein einziger Punkt Lavaschaden");
  behaupte(gegangen >= 2, "und gelaufen ist er trotzdem");
  gleich(betretenSchaden(karte, brut.x, brut.y), null, "er steht am Ende nicht in der Lava");
  gleich(schussweite(brut.x, brut.y, jaeger.x, jaeger.y), 1,
    "er ist um die Lava herum bis an den Jäger gekommen");
  console.log(`      · um die Lava herum bis (${brut.x},${brut.y}), ${gegangen} Gänge, 0 Schaden`);
}

/* ══ Der Lauerer bleibt im Dunkeln ═════════════════════════════════

   Kein Licht auf der Karte außer der Fackel des Jägers — er wird
   gesehen, der Lauerer nicht. Steht der Jäger zu weit weg, um ihn
   in diesem Zug zu erreichen, rührt sich der Lauerer nicht: Wer im
   Unbeleuchteten wartet, ist vor Beschuss sicher. */
abschnitt("Der Lauerer bleibt im Dunkeln");
{
  const baue = (jaegerX) => {
    const karte = macheKarte(15, 9);
    karte.boden.fill(BODEN.stein);
    karte.lichter = [{ x: jaegerX, y: 4, art: "fackel", staerke: 1 }];
    const brut = probeWesen({
      id: 1, seite: "brut", x: 2, y: 4, verhalten: "lauerer", sicht: 12
    });
    const jaeger = probeWesen({ id: 2, seite: "jaeger", x: jaegerX, y: 4, lp: 40 });
    return { karte, brut, jaeger, zustand: macheZustand(karte, [brut, jaeger]) };
  };

  const fern = baue(11);
  gleich(wahrgenommeneZiele(fern.zustand, fern.brut).length, 1,
    "der Lauerer sieht den Jäger mit der Fackel");
  tiefGleich(typenVon(planeZug(fern.zustand, fern.brut)), ["wacht", "zugEnde"],
    "außer Reichweite rührt er sich nicht, sondern geht auf Wacht");

  /* Zum Vergleich: ein Stürmer in derselben Lage läuft los. Ohne diese
     Gegenprobe prüfte man nur, dass irgendjemand stehen bleibt. */
  const alsStuermer = baue(11);
  alsStuermer.brut.verhalten = "stuermer";
  behaupte(planeZug(alsStuermer.zustand, alsStuermer.brut).some((a) => a.typ === AKTION.gehen),
    "ein Stürmer in derselben Lage läuft los");

  const nah = baue(7);
  const plan = planeZug(nah.zustand, nah.brut);
  tiefGleich(typenVon(plan), ["gehen", "angriff", "zugEnde"],
    "in Reichweite kommt der Lauerer und schlägt zu");
  gleich(planAbspielen(nah.zustand, plan).abgelehnt, 0, "und sein Plan ist anwendbar");
}

/* ══ Wacht statt Stillstand ════════════════════════════════════════

   Ein Gitter blockt Bewegung, aber **nicht** die Sicht — der
   Eingekesselte sieht den Jäger und kommt trotzdem nirgends hin. Ohne
   Riegel wäre das die Stellung, in der eine Planung sich aufhängt. */
abschnitt("Wacht statt Stillstand");
{
  const karte = macheProbekarte(15, 9);
  for (const [x, y] of [[1, 4], [3, 4], [2, 3], [2, 5]]) {
    karte.setze(x, y, { hindernis: HINDERNIS.gitter });
  }
  const brut = probeWesen({ id: 1, seite: "brut", x: 2, y: 4, verhalten: "stuermer" });
  const jaeger = probeWesen({ id: 2, seite: "jaeger", x: 8, y: 4, lp: 40 });
  const zustand = macheZustand(karte, [brut, jaeger]);

  gleich(wahrgenommeneZiele(zustand, brut).length, 1, "durch das Gitter sieht er den Jäger");
  const plan = planeZug(zustand, brut);
  tiefGleich(typenVon(plan), ["wacht", "zugEnde"], "wer nicht kann, geht auf Wacht");
  gleich(planAbspielen(zustand, plan).abgelehnt, 0, "und das ist auch erlaubt");
  gleich(brut.wacht, true, "danach steht er wirklich auf Wacht");

  /* Ohne Punkte geht auch keine Wacht — dann bleibt nur das Zugende. */
  const karte2 = macheProbekarte(15, 9);
  const ohne = probeWesen({ id: 3, seite: "brut", x: 5, y: 7, verhalten: "stuermer" });
  const jaeger2 = probeWesen({ id: 4, seite: "jaeger", x: 8, y: 7, lp: 40 });
  const zustand2 = macheZustand(karte2, [ohne, jaeger2]);
  ohne.ap = 0;
  tiefGleich(typenVon(planeZug(zustand2, ohne)), ["zugEnde"], "ohne Punkte nur das Zugende");

  /* Und ohne wahrgenommenen Jäger sucht die Brut nicht. */
  const karte3 = macheKarte(15, 9);
  karte3.boden.fill(BODEN.stein);
  karte3.lichter = [];
  const blind = probeWesen({ id: 5, seite: "brut", x: 2, y: 4, verhalten: "stuermer" });
  const versteckt = probeWesen({ id: 6, seite: "jaeger", x: 12, y: 4, lp: 40 });
  const zustand3 = macheZustand(karte3, [blind, versteckt]);
  gleich(wahrgenommeneZiele(zustand3, blind).length, 0, "im Dunkeln sieht die Brut niemanden");
  tiefGleich(typenVon(planeZug(zustand3, blind)), ["wacht", "zugEnde"],
    "was sie nicht sieht, sucht sie nicht");

  /* Die Planung ist gedeckelt — auch dann, wenn eine spätere Regel
     einmal eine Aktion ohne Preis erlaubte. */
  behaupte(HOECHSTENS_SCHRITTE > 0 && HOECHSTENS_SCHRITTE <= 32,
    `der Riegel steht bei ${HOECHSTENS_SCHRITTE} Aktionen`);
}

/* ══ Gleichlauf ════════════════════════════════════════════════════ */
abschnitt("Gleichlauf");
{
  const karte = macheProbekarte(15, 9);
  for (let y = 2; y <= 4; y++) for (let x = 8; x <= 10; x++) karte.setze(x, y, { ebene: 2 });
  karte.setze(8, 5, { rampe: RAMPE.nord });
  karte.setze(6, 6, { hindernis: HINDERNIS.fass });
  const brut = [
    probeWesen({ id: 1, seite: "brut", x: 3, y: 6, waffe: "kurzbogen", verhalten: "schuetze" }),
    probeWesen({ id: 2, seite: "brut", x: 4, y: 3, verhalten: "stuermer" }),
    probeWesen({ id: 3, seite: "brut", x: 5, y: 7, verhalten: "schwarm" })
  ];
  const jaeger = [
    probeWesen({ id: 4, seite: "jaeger", x: 11, y: 6, lp: 40 }),
    probeWesen({ id: 5, seite: "jaeger", x: 12, y: 3, lp: 40 })
  ];
  const zustand = macheZustand(karte, [...brut, ...jaeger]);
  const wer = amZugWesen(zustand);

  const vorher = abdruck(zustand);
  const erste = JSON.stringify(planeZug(zustand, wer));
  let abweichungen = 0;
  for (let i = 0; i < 50; i++) {
    if (JSON.stringify(planeZug(zustand, wer)) !== erste) abweichungen += 1;
  }
  gleich(abweichungen, 0, "fünfzig Planungen derselben Lage geben dieselbe Liste");
  gleich(abdruck(zustand), vorher, "und keine davon hat den Zustand angefasst");

  /* Die erste Aktion des Plans ist dieselbe, die `naechsteAktion` auf
     dem echten Zustand liefert — sonst gäbe es zwei Entscheidungen. */
  tiefGleich(naechsteAktion(zustand, wer), JSON.parse(erste)[0],
    "Plan und Einzelentscheidung fangen gleich an");
  gleich(abdruck(zustand), vorher, "auch `naechsteAktion` fasst nichts an");
  console.log(`      · 50 Planungen, ${abweichungen} Abweichungen, Zustand unberührt`);
}

/* ══ Alle zehn Arten der Brut ══════════════════════════════════════

   Jede Gegnervorlage einmal, auf derselben kleinen Karte: ein Podest,
   eine Kante mit zwei Ebenen Fall, ein Fass als Deckung, zwei Jäger.
   Geprüft wird nicht, **was** jede Art tut — das hängt an ihren
   Zahlen —, sondern dass jede einen anwendbaren Plan bekommt.

   Der Grund ist die Reichweite der Prüfung: Wuchtstoß, Brandmal,
   Pechfessel, Hakenkette und Blutzoll stehen nur bei Arten ab Tiefe 3,
   und im erzeugten Kerker kommen die nicht zuverlässig vor. Ohne
   diesen Abschnitt bliebe jeder Fähigkeitszweig ungelaufen — und ein
   Fehler darin fiele erst im sechsten Kerker auf. */
abschnitt("Alle zehn Arten der Brut");
{
  let mitFaehigkeit = 0;
  let abgelehntGesamt = 0;
  const arten = new Set();

  for (const vorlage of GEGNER) {
    const karte = macheProbekarte(15, 11);
    for (let y = 2; y <= 5; y++) for (let x = 3; x <= 6; x++) karte.setze(x, y, { ebene: 3 });
    karte.setze(9, 8, { hindernis: HINDERNIS.fass });
    const brut = macheWesen(vorlage, { id: 1, seite: "brut", x: 5, y: 4 });
    const jaeger = [
      macheWesen(held(HELDEN[0].schluessel), { id: 2, seite: "jaeger", x: 6, y: 3 }),
      macheWesen(held(HELDEN[1].schluessel), { id: 3, seite: "jaeger", x: 10, y: 8 })
    ];
    const zustand = macheZustand(karte, [brut, ...jaeger]);
    zustand.amZug = zustand.ordnung.indexOf(brut.id);

    const plan = planeZug(zustand, brut);
    arten.add(vorlage.schluessel);
    gleich(plan[plan.length - 1].typ, AKTION.zugEnde, `${vorlage.name}: der Plan endet`);
    behaupte(plan.length <= HOECHSTENS_SCHRITTE + 1, `${vorlage.name}: der Plan bleibt kurz`);
    gleich(pruefeAktion(zustand, plan[0]), null, `${vorlage.name}: die erste Aktion ist erlaubt`);
    if (plan.some((a) => a.typ === AKTION.faehigkeit)) mitFaehigkeit += 1;
    abgelehntGesamt += planAbspielen(zustand, plan).abgelehnt;
  }

  gleich(arten.size, GEGNER.length, "jede Gegnervorlage war einmal dran");
  behaupte(mitFaehigkeit >= 3,
    `mindestens drei Arten setzen eine Fähigkeit ein (${mitFaehigkeit})`);
  gleich(abgelehntGesamt, 0, "und kein Plan bricht beim Abspielen ab");
  console.log(`      · ${arten.size} Gegnerarten geplant,`
    + ` ${mitFaehigkeit} davon mit Fähigkeit`);
}

/* ══ Ein ganzer Kerker ═════════════════════════════════════════════

   Erzeugtes Gelände, Helden und Brut, acht Runden lang **jede** Figur
   von der KI geführt. Geprüft wird hier nicht, wer gewinnt, sondern
   dass die Planung fertig wird, immer mit `zugEnde` endet und ihre
   **erste** Aktion nie abgelehnt wird — die ist auf dem echten Zustand
   entschieden und muss deshalb gelten. */
abschnitt("Ein ganzer Kerker");
{
  let zuege = 0;
  let aktionen = 0;
  let spaeterAbgelehnt = 0;
  let ersteAbgelehnt = 0;
  let ohneEnde = 0;
  let zuLang = 0;

  const gesehen = new Set();
  /* Vier Tiefen, damit **alle** zehn Gegnerarten vorkommen — sonst
     liefe die Prüfung nur über die drei Arten der ersten Tiefe, und
     jeder Zweig für Wuchtstoß, Brandmal, Pechfessel oder Hakenkette
     bliebe ungelaufen. */
  for (const [saat, tiefe] of [[3, 2], [11, 4], [41, 6], [97, 8]]) {
    const karte = baueLandschaft({ saat, breite: 28, hoehe: 20, tiefe, spielerZahl: 2 });
    const strom = macheZufall(saat + 7);
    const liste = [];
    let id = 1;
    for (let i = 0; i < karte.starts.length && i < 2; i++) {
      const s = karte.starts[i];
      liste.push(macheWesen(held(HELDEN[i].schluessel),
        { id: id++, seite: "jaeger", x: s.x, y: s.y, spielerPlatz: i + 1 }));
    }
    const belegt = () => (x, y) => liste.some((w) => w.lebt && w.x === x && w.y === y);
    for (const vorlage of waehleGegner(strom, tiefe, 90)) {
      const roh = { x: strom.ganz(1, karte.breite - 2), y: strom.ganz(1, karte.hoehe - 2) };
      const platz = naechstesFreiesFeld(karte, roh.x, roh.y, { belegt: belegt() });
      if (!platz) continue;
      gesehen.add(vorlage.schluessel);
      liste.push(macheWesen(vorlage, { id: id++, seite: "brut", x: platz.x, y: platz.y }));
    }
    const zustand = {
      saat, tiefe, karte, zufall: macheZufall(saat), wesen: liste,
      nachId: new Map(liste.map((w) => [w.id, w])),
      runde: 1, ordnung: macheOrdnung(liste), amZug: 0,
      seiteDran: null, spieler: [], vorbei: null, protokoll: []
    };
    starteRunde(zustand);

    let riegel = 0;
    while (!zustand.vorbei && zustand.runde <= 8 && riegel < 800) {
      riegel += 1;
      const wesen = amZugWesen(zustand);
      if (!wesen) break;
      const plan = planeZug(zustand, wesen);
      zuege += 1;
      if (plan.length === 0 || plan[plan.length - 1].typ !== AKTION.zugEnde) ohneEnde += 1;
      if (plan.length > HOECHSTENS_SCHRITTE + 1) zuLang += 1;
      for (let i = 0; i < plan.length; i++) {
        if (pruefeAktion(zustand, plan[i]) !== null) {
          if (i === 0) ersteAbgelehnt += 1; else spaeterAbgelehnt += 1;
          break;
        }
        wendeAn(zustand, plan[i]);
        aktionen += 1;
      }
    }
    behaupte(riegel < 800, `Saat ${saat}: der Lauf kommt ohne Riegel aus (${riegel} Züge)`);
  }

  gleich(ohneEnde, 0, "jeder Plan endet mit `zugEnde`");
  gleich(zuLang, 0, "kein Plan überschreitet den Riegel");
  gleich(ersteAbgelehnt, 0, "die erste Aktion eines Plans wird nie abgelehnt");
  behaupte(zuege > 100, `genug Züge geprüft (${zuege})`);
  behaupte(aktionen > zuege, `und mehr als eine Aktion je Zug (${aktionen})`);
  /* Später abgelehnte Aktionen sind erlaubt und erwartet: Ob ein Schlag
     trifft, weiß die Planung nicht. Sie dürfen nur selten sein — sonst
     plant die KI ins Blaue. */
  behaupte(spaeterAbgelehnt * 10 < aktionen,
    `später abgelehnt bleibt die Ausnahme (${spaeterAbgelehnt} von ${aktionen})`);
  console.log(`      · ${zuege} Züge auf vier erzeugten Kerkern, ${aktionen} Aktionen,`
    + ` ${gesehen.size} Gegnerarten, ${spaeterAbgelehnt} nachträglich abgelehnt`);
}

ende("Gegner-KI");
