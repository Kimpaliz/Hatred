/* [Aufgabe: Prüfwesen] Prüft `spiel/lauf.mjs` und `spiel/protokoll.mjs`
   — und damit die eine Voraussetzung, an der der Internet-Koop hängt.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Über die Leitung geht eine Aktion, kein Zustand. Vier Rechner
   bekommen dieselbe kurze Zeile und rechnen jeder für sich aus, was
   daraus folgt. Das ist billig — und es ist nur dann ein Spiel und
   nicht vier, wenn **jeder Rechner auf dasselbe Ergebnis kommt**.
   Diese Datei beweist genau das, in vier Stufen:

   1. **Zweimal derselbe Lauf.** Vierzig volle Runden, feste Saat,
      festes Vorgehen, zwei frisch gebaute Zustände. Nach **jeder**
      Runde muss `zustandsSumme` in beiden dieselbe sein — verglichen
      wird jede Runde, nicht nur das Ende: Sonst könnten sich zwei
      Läufe in Runde 7 trennen und in Runde 40 zufällig wieder treffen.
   2. **Derselbe Lauf allein aus dem Text.** Der dritte Lauf bekommt
      **kein** Vorgehen und **keinen** Gegner-Antrieb, sondern nur die
      Zeichenkette aus `schreibeFolge` — genau das, was durch die
      Leitung ginge. Dieselben Rundensummen beweisen, dass die Aktion
      als einzige Nachricht genügt.
   3. **Ein Bit an der Saat.** Gingen die Summen dann **nicht**
      auseinander, prüfte Stufe 1 nichts. Dazu die Gegenprobe Feld für
      Feld: Jede einzelne Änderung muss die Zahl bewegen und beim
      Zurücknehmen wieder herstellen.
   4. **Tausend Aktionen im Kreis.** Wer `ziel: null` als „kein Ziel"
      zurückgibt, hat auf einem Rechner eine andere Aktion als auf dem
      anderen — dann hilft Stufe 1 nichts mehr.

   **Geprüft wird der Fall, der ohne die Arbeit falsch wäre.** Dass
   `macheLauf` einen Zustand baut, gewinnt ohnehin. Dass zwei Läufe
   dieselbe Karte bekommen, dass die Summe eine gelöschte Fackel merkt
   (`karte.summe()` merkt sie nicht), dass ein fehlendes Feld etwas
   anderes ist als ein `null`, dass der Lauf in dem Augenblick endet,
   in dem der letzte Jäger fällt, und nicht erst am Rundenende — das
   nicht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/helfer.mjs` (das Prüfgerüst), `spiel/lauf.mjs` und
   `spiel/protokoll.mjs` (das Geprüfte), `spiel/aktionen.mjs`,
   `spiel/zug.mjs`, `spiel/wegfindung.mjs` und `spiel/gegner-ki.mjs`
   (das Vorgehen der Prüfläufe — was die KI *entscheidet*, prüft
   `werkzeuge/pruefe-ki.mjs`, nicht diese Datei), `spiel/gitter.mjs`
   und `spiel/katalog/*.mjs` (die Zahlen, gegen die nachgerechnet
   wird), `werkzeuge/pruefe-alles.mjs` (startet diese Datei als eigenen
   Prozess und liest den Rückgabewert). */

import { abschnitt, behaupte, gleich, tiefGleich, wirft, ende } from "./helfer.mjs";
import { macheKarte, BODEN, HINDERNIS, RICHTUNGEN, abstand } from "../spiel/gitter.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { AKTION, pruefeAktion, wendeAn } from "../spiel/aktionen.mjs";
import { amZugWesen, starteRunde, SEITE_JAEGER, SEITE_BRUT } from "../spiel/zug.mjs";
import { betretenSchaden } from "../spiel/hoehen.mjs";
import { wegSuche } from "../spiel/wegfindung.mjs";
import { planeZug } from "../spiel/gegner-ki.mjs";
import { FAEHIGKEITEN } from "../spiel/katalog/faehigkeiten.mjs";
import { HELDEN } from "../spiel/katalog/helden.mjs";
import {
  TYP_KUERZEL, FELD_ORDNUNG, schreibeAktion, leseAktion, schreibeFolge, leseFolge
} from "../spiel/protokoll.mjs";
import {
  ABSTANDS_STUFEN, TRAENKE_START, brutId, gegnerBudget, macheLauf, naechsteTiefe,
  saatFuerTiefe, setzeGegner, spieleBrutZug, zustandsSumme, zusammenfassung
} from "../spiel/lauf.mjs";

/* Die Saat, auf der der lange Lauf gefahren wird, und seine Länge.
   Beides steht hier oben, weil beide Zahlen in den Meldungen auftauchen
   und weil ein Lauf mit anderer Saat andere Messwerte gäbe. */
const LAUF_SAAT = 11;
const LAUF_SPIELER = 4;
const LAUF_RUNDEN = 40;


/* ── Ein Wesen und eine Karte von Hand ─────────────────────────────

   Für die Fälle, die sich in einer erzeugten Landschaft nicht
   herstellen lassen — etwa „der Jäger steht genau an einer Kante mit
   zwei Ebenen Fall". Die Feldfolge ist die aus dem
   Schnittstellenvertrag. */
function macheProbeWesen(o) {
  return {
    id: 0, art: "probe", seite: SEITE_BRUT, x: 0, y: 0, lp: 20, lpMax: 20, ap: 6, apMax: 6,
    flinkheit: 5, ruestung: 0, sicht: 14, waffe: "rostdolch", faehigkeiten: [], wirkungen: [],
    wacht: false, lebt: true, spielerPlatz: null, traenke: 0, eigenheit: null,
    ...o
  };
}


/* Eine flache, ausgeleuchtete Probefläche. Das Licht muss sein: Im
   Dunkeln sieht niemand jemanden, und dann prüfte der Abschnitt nur,
   dass Blinde nichts tun (`spiel/licht.mjs`). */
function macheProbeFlaeche(breite = 12, hoehe = 9) {
  const karte = macheKarte(breite, hoehe);
  karte.boden.fill(BODEN.stein);
  karte.lichter = [{ x: 6, y: 4, art: "fackel", staerke: 1, weite: breite + hoehe }];
  return karte;
}

function macheProbeZustand(karte, wesen, saat = 41) {
  const zustand = {
    saat, tiefe: 1, karte,
    zufall: macheZufall(saat),
    wesen,
    nachId: new Map(wesen.map((w) => [w.id, w])),
    runde: 1, ordnung: [], amZug: 0,
    seiteDran: null, spieler: [], vorbei: null, protokoll: []
  };
  starteRunde(zustand);
  return zustand;
}

/* ══ 4. Ein Lauf entsteht ══════════════════════════════════════════ */
{
  abschnitt("Ein Lauf entsteht");
  const zustand = macheLauf({ saat: 7, spielerZahl: 3 });
  gleich(zustand.tiefe, 1, "er beginnt in Tiefe 1");
  gleich(zustand.runde, 1, "in Runde 1");
  gleich(zustand.spieler.length, 3, "mit drei Plätzen");
  gleich(zustand.vorbei, null, "und ist nicht vorbei");
  behaupte(zustand.nachId instanceof Map, "`nachId` ist eine Karte");
  gleich(zustand.nachId.size, zustand.wesen.length, "und kennt jedes Wesen");
  behaupte(zustand.ereignisse.some((e) => e.art === "rundeNeu"),
    "der Rundenanfang der ersten Runde liegt bereit");
  behaupte(zustand.ereignisse.some((e) => e.art === "apGesetzt"),
    "und jedes Wesen hat seine Punkte bekommen");

  const jaeger = zustand.wesen.filter((w) => w.seite === SEITE_JAEGER);
  gleich(jaeger.length, 3, "drei Jäger stehen auf der Karte");
  behaupte(jaeger.every((w, i) => w.id === i + 1 && w.spielerPlatz === i + 1),
    "ihre IDs sind die Spielerplätze 1 bis 3");
  behaupte(jaeger.every((w, i) => w.art === HELDEN[i].schluessel),
    "ohne Wahl kommen die ersten Klassen des Katalogs, in Katalogreihenfolge");
  behaupte(jaeger.every((w) => w.traenke === TRAENKE_START), "jeder trägt zwei Tränke");
  behaupte(jaeger.every((w, i) =>
    w.x === zustand.karte.starts[i].x && w.y === zustand.karte.starts[i].y),
  "jeder steht auf seinem Startfeld");
  behaupte(jaeger.every((w) => w.lp === w.lpMax), "und mit vollen Lebenspunkten");

  /* Der Grund, warum die Kartensaat in Tiefe 1 die Laufsaat ist:
     `werkzeuge/karte-zeigen.mjs 7` soll genau diese Karte zeigen. */
  gleich(saatFuerTiefe(7, 1), 7, "Tiefe 1 gibt die Saat unverändert weiter");
  gleich(zustand.karte.saat, 7, "die erste Karte trägt die Laufsaat");
  behaupte(saatFuerTiefe(7, 2) !== 7, "Tiefe 2 hat eine eigene Saat");
  behaupte(saatFuerTiefe(7, 2) !== saatFuerTiefe(7, 3), "und Tiefe 3 wieder eine andere");
  gleich(saatFuerTiefe(7, 4), saatFuerTiefe(7, 4), "dieselbe Tiefe gibt dieselbe Saat");

  /* Zwei frisch gebaute Läufe mit derselben Saat sind bis aufs Byte
     derselbe Zustand. Ohne das ist alles Weitere sinnlos. */
  const nochmal = macheLauf({ saat: 7, spielerZahl: 3 });
  gleich(zustandsSumme(nochmal), zustandsSumme(zustand),
    "zweimal dieselbe Saat gibt denselben Anfangszustand");
  gleich(nochmal.karte.summe(), zustand.karte.summe(), "und dieselbe Karte");

  const andere = macheLauf({ saat: 7, spielerZahl: 4 });
  behaupte(zustandsSumme(andere) !== zustandsSumme(zustand),
    "eine andere Spielerzahl gibt einen anderen Zustand");

  const gewaehlt = macheLauf({ saat: 7, spielerZahl: 2, heldenWahl: ["bluthexer", "spaeher"] });
  gleich(gewaehlt.wesen[0].art, "bluthexer", "die Wahl bestimmt die erste Klasse");
  gleich(gewaehlt.wesen[1].art, "spaeher", "und die zweite");

  wirft(() => macheLauf({ saat: 1.5 }), "eine Saat mit Komma");
  wirft(() => macheLauf({ saat: 7, spielerZahl: 0 }), "null Spieler");
  wirft(() => macheLauf({ saat: 7, spielerZahl: 5 }), "fünf Spieler");
  wirft(() => macheLauf({ saat: 7, tiefe: 0 }), "Tiefe 0");
  wirft(() => macheLauf({ saat: 7, spielerZahl: 2, heldenWahl: ["spaeher"] }),
    "eine Wahl, die nicht so viele Klassen nennt wie es Spieler gibt");
  wirft(() => macheLauf({ saat: 7, spielerZahl: 1, heldenWahl: ["zwerg"] }),
    "eine Klasse, die es nicht gibt");

  tiefGleich(zusammenfassung(zustand),
    { runde: 1, lebendeJaeger: 3, lebendeBrut: zustand.wesen.length - 3, tiefe: 1 },
    "die Zusammenfassung zählt richtig");
}

/* ══ 5. Die Brut steht ═════════════════════════════════════════════ */
{
  abschnitt("Die Brut steht");
  const zustand = macheLauf({ saat: LAUF_SAAT, spielerZahl: LAUF_SPIELER });
  const brut = () => zustand.wesen.filter((w) => w.seite === SEITE_BRUT);
  const abdruck = () => brut().map((w) => ({ id: w.id, art: w.art, x: w.x, y: w.y }));

  const erste = abdruck();
  behaupte(erste.length > 0, `es steht Brut auf der Karte (${erste.length} Stück)`);
  behaupte(erste.every((w, i) => w.id === brutId(1, i + 1)),
    "ihre IDs sind gerechnet: 1000 · Tiefe + Nummer");

  /* Der Fall, der ohne die Arbeit falsch wäre: Würde die Aufstellung
     aus dem Kampfstrom würfeln, gäbe der zweite Aufruf eine andere
     Brut — und damit hinge die Ebene daran, wie oft jemand gerufen
     hat, nicht an der Saat. */
  setzeGegner(zustand);
  tiefGleich(abdruck(), erste,
    "`setzeGegner` stellt beim zweiten Aufruf dieselbe Brut auf dieselben Felder");
  gleich(brut().length, erste.length, "und verdoppelt sie nicht");

  const karte = zustand.karte;
  const felder = new Set(brut().map((w) => `${w.x},${w.y}`));
  let naechsteStart = Infinity;
  for (const w of brut()) {
    for (const start of karte.starts) {
      naechsteStart = Math.min(naechsteStart, abstand(w.x, w.y, start.x, start.y));
    }
  }
  gleich(brut().filter((w) => betretenSchaden(karte, w.x, w.y)).length, 0,
    "keine Brut beginnt in der Lava");
  gleich(brut().filter((w) => karte.blocktBewegung(w.x, w.y)).length, 0,
    "keine steht in einer Wand");
  gleich(felder.size, erste.length, "keine zwei stehen auf demselben Feld");
  behaupte(naechsteStart >= ABSTANDS_STUFEN[0],
    `die nächste Brut steht ${naechsteStart} Felder vom Startnest weg `
    + `(mindestens ${ABSTANDS_STUFEN[0]})`);

  gleich(gegnerBudget(1, 4), 112, "das Budget in Tiefe 1 für vier Spieler ist 112 Punkte");
  behaupte(gegnerBudget(3, 4) > gegnerBudget(1, 4), "tiefer wird es mehr");
  behaupte(gegnerBudget(1, 4) > gegnerBudget(1, 2), "und mit mehr Spielern auch");

  /* Tiefer heißt: es gibt Gegner, die es oben nicht gab. Ohne diese
     Prüfung könnte `waehleGegner` immer dieselben vier ziehen. */
  const tief = macheLauf({ saat: LAUF_SAAT, spielerZahl: 2, tiefe: 6 });
  const tiefeBrut = tief.wesen.filter((w) => w.seite === SEITE_BRUT);
  const obenArten = new Set(erste.map((w) => w.art));
  behaupte(tiefeBrut.some((w) => !obenArten.has(w.art)),
    "in Tiefe 6 steht Brut, die es in Tiefe 1 nicht gibt");
  behaupte(tiefeBrut.every((w, i) => w.id === brutId(6, i + 1)),
    "und ihre IDs tragen die Tiefe");
}

/* ══ 6. Die Prüfzahl merkt jede Änderung ═══════════════════════════ */
{
  abschnitt("Die Prüfzahl");
  const zustand = macheLauf({ saat: LAUF_SAAT, spielerZahl: 3 });
  gleich(zustandsSumme(zustand), zustandsSumme(zustand),
    "zweimal gefragt, zweimal dieselbe Zahl — sie rechnet nichts fort");

  /* Jede einzelne Änderung muss die Zahl bewegen **und** beim
     Zurücknehmen wieder dieselbe herstellen. Das zweite ist die
     schärfere Hälfte: Eine Summe, die sich nur „irgendwie" ändert,
     wäre auch dann verschieden, wenn beide Rechner recht haben. */
  const merkt = (was, aendern) => {
    const vorher = zustandsSumme(zustand);
    const zurueck = aendern();
    behaupte(zustandsSumme(zustand) !== vorher, `die Summe merkt: ${was}`);
    zurueck();
    gleich(zustandsSumme(zustand), vorher, `und ist danach wieder dieselbe (${was})`);
  };

  /* Ein Eintrag je Zahl, die im Zustand steht. Als Tabelle und nicht
     als sechzehn Blöcke: Wer eine siebzehnte anhängt, hängt eine Zeile
     an und nicht einen weiteren Sonderfall. */
  const wesen = zustand.wesen[0];
  const aenderungen = [
    ["ein Lebenspunkt weniger", () => { wesen.lp -= 1; return () => { wesen.lp += 1; }; }],
    ["ein Schritt nach Osten", () => { wesen.x += 1; return () => { wesen.x -= 1; }; }],
    ["ein Aktionspunkt weniger", () => { wesen.ap -= 1; return () => { wesen.ap += 1; }; }],
    ["ein Trank weniger", () => { wesen.traenke -= 1; return () => { wesen.traenke += 1; }; }],
    ["die Wacht", () => { wesen.wacht = true; return () => { wesen.wacht = false; }; }],
    ["ein Toter", () => { wesen.lebt = false; return () => { wesen.lebt = true; }; }],
    ["eine Wirkung", () => {
      wesen.wirkungen.push({ art: "brennt", runden: 2, staerke: 3 });
      return () => { wesen.wirkungen.pop(); };
    }],
    ["eine Wirkung, die eine Runde kürzer läuft", () => {
      wesen.wirkungen.push({ art: "brennt", runden: 2, staerke: 3 });
      const vergleich = zustandsSumme(zustand);
      wesen.wirkungen[wesen.wirkungen.length - 1].runden = 1;
      behaupte(zustandsSumme(zustand) !== vergleich, "auch im Inneren einer Wirkung");
      return () => { wesen.wirkungen.pop(); };
    }],
    ["eine Fähigkeit mehr", () => {
      wesen.faehigkeiten.push("weitblick");
      return () => { wesen.faehigkeiten.pop(); };
    }],
    /* Eine Zahl darf nicht dieselbe Summe geben wie der Text derselben
       Ziffern — sonst fiele ein Fehler, der eine Zahl in einen Text
       verwandelt, nicht auf. */
    ["ein `lp`, das plötzlich ein Text ist", () => {
      const alt = wesen.lp;
      wesen.lp = String(alt);
      return () => { wesen.lp = alt; };
    }],
    ["die Rundennummer", () => { zustand.runde += 1; return () => { zustand.runde -= 1; }; }],
    ["der Zeiger", () => { zustand.amZug += 1; return () => { zustand.amZug -= 1; }; }],
    ["die Tiefe", () => { zustand.tiefe += 1; return () => { zustand.tiefe -= 1; }; }],
    ["das Ende des Laufs",
      () => { zustand.vorbei = "sieg"; return () => { zustand.vorbei = null; }; }],
    ["die Zugordnung", () => {
      const alt = zustand.ordnung;
      zustand.ordnung = alt.slice().reverse();
      return () => { zustand.ordnung = alt; };
    }],
    ["die Seite am Zug", () => {
      const alt = zustand.seiteDran;
      zustand.seiteDran = alt === SEITE_JAEGER ? SEITE_BRUT : SEITE_JAEGER;
      return () => { zustand.seiteDran = alt; };
    }],
    ["ein zerschlagenes Fass", () => {
      const alt = zustand.karte.hindernis[0];
      zustand.karte.hindernis[0] = alt === HINDERNIS.keins ? HINDERNIS.fass : HINDERNIS.keins;
      return () => { zustand.karte.hindernis[0] = alt; };
    }],
    /* Die Reihenfolge der Wesenliste ist Zustand, nicht Zufall:
       `wesenBei` gibt bei zwei Figuren auf einem Feld die erste zurück.
       Eine nach ID sortierte Summe übersähe genau das. */
    ["zwei vertauschte Wesen in der Liste", () => {
      const alt = zustand.wesen.slice();
      const gedreht = alt.slice();
      gedreht[0] = alt[1];
      gedreht[1] = alt[0];
      zustand.wesen = gedreht;
      return () => { zustand.wesen = alt; };
    }]
  ];
  for (const [was, aendern] of aenderungen) merkt(was, aendern);

  /* Der Fall, den `karte.summe()` allein **nicht** merkt: Die Lichter
     stehen nicht in den fünf Feldreihen. Eine Fackel, die auf einem
     Rechner brennt und auf dem anderen nicht, ändert, wer wen sieht —
     und damit jeden Trefferwurf danach. */
  const kartenSummeVorher = zustand.karte.summe();
  merkt("eine Fackel, die nur einer sieht", () => {
    zustand.karte.lichter.push({ x: 2, y: 2, art: "fackel", staerke: 1, runden: 6 });
    gleich(zustand.karte.summe(), kartenSummeVorher,
      "— und `karte.summe()` merkt sie nicht, deshalb steht sie in dieser Summe");
    return () => { zustand.karte.lichter.pop(); };
  });

  wirft(() => zustandsSumme(null), "ohne Zustand keine Summe");
}

/* ══ 7. Vierzig Runden, dreimal ════════════════════════════════════ */

/* Das feste Vorgehen der beiden Seiten. Es ist kein Spielverstand,
   sondern ein **Vorgehen**: Aus demselben Zustand folgt immer dieselbe
   Aktion. Genau das braucht die Prüfung — würfelte sie, verglichen die
   Rundensummen zweier Läufe nichts.

   Die Brut zieht, wie sie im Spiel zieht: nach dem Plan aus
   `spiel/gegner-ki.mjs`. Die Jäger führt im Spiel ein Mensch, und
   deshalb steht ihr Vorgehen hier: trinken, wenn es knapp wird · stoßen
   oder schlagen, wen man erreicht · sonst die erste Fähigkeit, die
   greift (auch die mit Feld-Ziel: sonst legte nie jemand ein Licht, und
   die Prüfzahl käme mit Lichtern nie in Berührung) · sonst zum Ausgang.
   Der Stoß **vor** dem Schlag: sonst käme er nie vor (gemessen: 0 statt
   7), und der Gleichlauf ließe die Aktion aus, an der die Höhen hängen.

   **Warum die Jäger zum Ausgang laufen und nicht auf die Brut zu.** Die
   Brut wartet im Dunkeln: `spiel/gegner-ki.mjs` handelt nur nach dem,
   was sie **wahrnimmt**, und sieht sie niemanden, bleibt sie stehen —
   zu Recht. Liefe die andere Seite auch nicht los, stünden vierzig
   Runden lang alle still, und der Gleichlauf wäre über ein Standbild
   bewiesen. Der Weg zum Ausgang ist, was ein Spieler tut, und er führt
   an genug Brut vorbei. */
function ersteAusPlan(zustand, wesen) {
  const plan = planeZug(zustand, wesen);
  return plan.length > 0 ? plan[0] : null;
}

/* Der weiteste Schritt auf dem Weg zum Ausgang, den die Punkte tragen.
   Gesucht wird **ohne** Rücksicht auf die anderen Figuren und danach
   von hinten geprüft: Steht ein Gefährte im Gang, ist der Weg mit
   `belegt` gar keiner, und ein Vorgehen, das dann stehenbliebe, bliebe
   auf mancher Karte vierzig Runden stehen. */
function zumAusgang(zustand, wesen) {
  const ziel = zustand.karte.ausgang;
  if (!ziel || (ziel.x === wesen.x && ziel.y === wesen.y)) return null;
  const weg = wegSuche(zustand.karte, { x: wesen.x, y: wesen.y }, ziel, { maxKosten: Infinity });
  if (!weg) return null;
  for (let i = weg.pfad.length - 1; i > 0; i--) {
    const feld = weg.pfad[i];
    if (feld.kosten > wesen.ap) continue;
    const gehen = { typ: AKTION.gehen, wer: wesen.id, nach: { x: feld.x, y: feld.y } };
    if (pruefeAktion(zustand, gehen) === null) return gehen;
  }
  return null;
}

function jaegerAktion(zustand, wesen) {
  if (wesen.traenke > 0 && wesen.lp * 2 <= wesen.lpMax) {
    const trank = { typ: AKTION.trank, wer: wesen.id };
    if (pruefeAktion(zustand, trank) === null) return trank;
  }
  /* Nur Lebende werden gefragt. Nicht aus Höflichkeit, sondern weil
     jede Frage an `pruefeAktion` eine Sichtlinie und ein
     Helligkeitsfeld kostet — und eine Leiche ist ohnehin nie ein
     gültiges Ziel. */
  const lebende = zustand.wesen.filter((w) => w.lebt);
  for (const anderer of lebende) {
    if (anderer.seite === wesen.seite) continue;
    const stoss = { typ: AKTION.stoss, wer: wesen.id, ziel: anderer.id };
    if (pruefeAktion(zustand, stoss) === null) return stoss;
    const schlag = { typ: AKTION.angriff, wer: wesen.id, ziel: anderer.id };
    if (pruefeAktion(zustand, schlag) === null) return schlag;
  }
  for (const schluessel of wesen.faehigkeiten) {
    const aufSich = {
      typ: AKTION.faehigkeit, wer: wesen.id, schluessel, ziel: null, feld: null
    };
    if (pruefeAktion(zustand, aufSich) === null) return aufSich;
    for (const anderer of lebende) {
      const aufWesen = {
        typ: AKTION.faehigkeit, wer: wesen.id, schluessel, ziel: anderer.id, feld: null
      };
      if (pruefeAktion(zustand, aufWesen) === null) return aufWesen;
    }
    const aufFeld = {
      typ: AKTION.faehigkeit, wer: wesen.id, schluessel, ziel: null,
      feld: { x: wesen.x, y: wesen.y }
    };
    if (pruefeAktion(zustand, aufFeld) === null) return aufFeld;
  }
  return zumAusgang(zustand, wesen) || ersteAusPlan(zustand, wesen);
}

/* Ein ganzer Lauf nach dem festen Vorgehen — vierzig Runden, über
   Ebenengrenzen hinweg. Ist eine Ebene leergeräumt, geht es eine
   Tiefe hinab und weitergezählt; sonst wäre der „vollständige Lauf"
   nach fünfundzwanzig Runden mit einem Sieg zu Ende, und die Hälfte
   der Runden fiele aus der Prüfung.

   Gezählt wird nebenbei, was überhaupt geschehen ist — ein Gleichlauf
   über einen Lauf, in dem nie jemand zuschlägt, prüfte nichts.

   Aufgeschrieben werden außerdem die **Marken**: die Länge des
   Protokolls im Augenblick jedes Abstiegs. Nur damit lässt sich der
   Lauf später allein aus dem Aktionstext nachspielen — der Abstieg
   ist keine Aktion, sondern eine Folge daraus. */
function spieleFestenLauf(saat) {
  let zustand = macheLauf({ saat, spielerZahl: LAUF_SPIELER, tiefe: 1 });
  const summen = [];
  const marken = [];
  const zaehler = {
    angriff: 0, treffer: 0, schaden: 0, gestorben: 0, gestossen: 0, licht: 0, bewegt: 0
  };
  let abgelehnt = 0;
  let runden = 0;
  let letzteRunde = zustand.runde;

  const zaehle = (ereignisse) => {
    for (const e of ereignisse) {
      if (e.art === "angriff") { zaehler.angriff += 1; if (e.treffer) zaehler.treffer += 1; }
      else if (e.art === "schaden") zaehler.schaden += e.wieviel;
      else if (e.art === "gestorben") zaehler.gestorben += 1;
      else if (e.art === "gestossen") zaehler.gestossen += 1;
      else if (e.art === "lichtNeu") zaehler.licht += 1;
      else if (e.art === "bewegt") zaehler.bewegt += 1;
    }
  };

  let fehler = null;
  zaehle(zustand.ereignisse);
  summen.push(zustandsSumme(zustand));

  try {

    /* Aktion für Aktion, für beide Seiten gleich — und die Prüfzahl
       unmittelbar nach jeder Aktion befragt, sobald sich die Runde
       gedreht hat. Diese Feinheit ist keine Kleinigkeit: Nur so misst
       der nachgespielte Lauf **an derselben Stelle**, und ein
       Unterschied ist ein echter Unterschied und kein Messfehler.
       Was der Antrieb vorschlägt, muss `pruefeAktion` durchlassen —
       sonst führte die Prüfung eine Liste erlaubter Aktionen und der
       Antrieb eine zweite. */
    /* Hinab geht es, wenn die Ebene leer ist **oder** ein Jäger auf der
       Treppe steht — so hält der Lauf vierzig Runden durch, statt nach
       zwanzig mit einem Sieg zu enden, und `naechsteTiefe` läuft mitten
       im Gleichlauf mit. */
    const aufDerTreppe = () => {
      const aus = zustand.karte.ausgang;
      return !!aus && zustand.wesen.some((w) =>
        w.lebt && w.seite === SEITE_JAEGER && w.x === aus.x && w.y === aus.y);
    };

    while (runden < LAUF_RUNDEN) {
      if (zustand.vorbei === "niederlage") break;
      if (zustand.vorbei === "sieg" || aufDerTreppe()) {
        marken.push(zustand.protokoll.length);
        zustand = naechsteTiefe(zustand);
        letzteRunde = zustand.runde;
        zaehle(zustand.ereignisse);
        summen.push(zustandsSumme(zustand));
        continue;
      }
      if (zustand.vorbei) break;
      const dran = amZugWesen(zustand);
      if (!dran) break;

      let aktion = dran.seite === SEITE_JAEGER
        ? jaegerAktion(zustand, dran)
        : ersteAusPlan(zustand, dran);
      if (aktion && pruefeAktion(zustand, aktion) !== null) {
        abgelehnt += 1;
        aktion = null;
      }
      if (!aktion) aktion = { typ: AKTION.zugEnde, wer: dran.id };
      zaehle(wendeAn(zustand, aktion));

      if (zustand.runde !== letzteRunde) {
        letzteRunde = zustand.runde;
        runden += 1;
        summen.push(zustandsSumme(zustand));
      }
    }
  } catch (wurf) {
    /* Ein Wurf mitten im Lauf ist selbst ein Befund — aber er darf
       `ende` nicht um seine Ausgabe bringen. Er kommt als `fehler`
       zurück und wird oben zu einer gefallenen Behauptung. */
    fehler = wurf.message;
  }
  return { zustand, summen, marken, zaehler, abgelehnt, runden, fehler };
}

/* Ein Wurf mitten in einem Prüflauf ist selbst ein Befund — aber er
   beendet den Prozess, bevor `ende` die schon gefallenen Behauptungen
   ausdrucken kann. Dann steht als Ergebnis ein Stapelabdruck da und
   nicht die Zeile, an der es wirklich hakt. Deshalb wird jeder lange
   Lauf eingepackt: Der Wurf wird zu einer gefallenen Behauptung, und
   der Rest der Prüfung läuft weiter. */
function ohneAbbruch(was, tun) {
  try { tun(); } catch (fehler) { behaupte(false, `${was}: ${fehler.message}`); }
}

let langerLauf = null;
let langerText = "";
{
  abschnitt("Vierzig Runden, zweimal");
  const erster = spieleFestenLauf(LAUF_SAAT);
  const zweiter = spieleFestenLauf(LAUF_SAAT);
  langerLauf = erster;

  gleich(erster.fehler, null, "der erste lange Lauf läuft ohne Abbruch durch");
  gleich(zweiter.fehler, null, "der zweite ebenso");
  gleich(erster.runden, LAUF_RUNDEN,
    `der Lauf hält ${LAUF_RUNDEN} volle Runden durch, ohne vorher zu enden`);
  gleich(erster.zustand.vorbei, null, "und ist am Ende noch offen");
  gleich(erster.zustand.tiefe, 1 + erster.marken.length,
    `dabei geht es ${erster.marken.length}-mal eine Tiefe hinab — bis Ebene `
    + `${erster.zustand.tiefe}`);
  behaupte(erster.marken.length > 0, "der Lauf reicht über mehr als eine Ebene");
  gleich(erster.summen.length, LAUF_RUNDEN + 1 + erster.marken.length,
    "es gibt einen Messpunkt je Runde, dazu den Anfang und jeden Ebenenwechsel");
  gleich(erster.abgelehnt, 0, "der Brut-Antrieb schlägt nichts vor, was abgewiesen würde");

  /* Ohne diese Zahlen prüften die Summen einen Lauf, in dem nichts
     geschieht. */
  behaupte(erster.zaehler.angriff >= 60,
    `es wird gekämpft: ${erster.zaehler.angriff} Angriffe, `
    + `${erster.zaehler.treffer} davon treffen`);
  /* ⚠️ Diese zwei Schranken standen bis zum 06.09.2026 bei 200 und 8 —
     gemessen am damaligen Erzeuger. Mit Janniks Pixelslop-Engine und
     dem Kliffschnitt sieht die Karte anders aus, und derselbe Ablauf
     ergibt jetzt 182 Schaden und 7 Tote. Das ist keine
     Verschlechterung, sondern eine andere Welt.

     Die Zahlen sind **keine Balancewerte**. Sie beantworten eine
     einzige Frage: Ist der Ablauf, über den der Gleichlauf bewiesen
     wird, überhaupt gehaltvoll — oder stehen zwei Rechner vierzig
     Runden lang nebeneinander herum? Deshalb liegen sie jetzt
     deutlich unter dem Gemessenen: Sie sollen den leeren Lauf fangen,
     nicht die Bauart der Karte einfrieren. */
  behaupte(erster.zaehler.schaden > 100,
    `${erster.zaehler.schaden} Schaden fließen (mindestens 100)`);
  behaupte(erster.zaehler.gestorben >= 4,
    `${erster.zaehler.gestorben} Wesen fallen (mindestens 4)`);
  behaupte(erster.zaehler.bewegt > 100, `${erster.zaehler.bewegt} Bewegungen`);
  behaupte(erster.zaehler.gestossen > 0, `${erster.zaehler.gestossen} Stöße`);
  behaupte(erster.zaehler.licht > 0,
    `${erster.zaehler.licht} Lichter werden gelegt — die Summe muss sie tragen`);

  gleich(zweiter.summen.length, erster.summen.length, "der zweite Lauf hat gleich viele Marken");
  tiefGleich(zweiter.marken, erster.marken, "und steigt an denselben Stellen hinab");
  let ungleich = 0;
  for (let i = 0; i < erster.summen.length; i++) {
    if (erster.summen[i] !== zweiter.summen[i]) ungleich += 1;
  }
  gleich(ungleich, 0,
    `beide Läufe haben nach jeder der ${LAUF_RUNDEN} Runden dieselbe Prüfzahl`);

  langerText = schreibeFolge(erster.zustand.protokoll);
  gleich(schreibeFolge(zweiter.zustand.protokoll), langerText,
    "und Zeichen für Zeichen dasselbe Protokoll");
  behaupte(erster.zustand.protokoll.length > 300,
    `${erster.zustand.protokoll.length} Aktionen in `
    + `${langerText.length} Zeichen — ${(langerText.length
      / erster.zustand.protokoll.length).toFixed(1)} je Aktion`);
}

{
  abschnitt("Vierzig Runden, allein aus dem Text");
  /* Der eigentliche Beweis für den Internet-Koop: Dieser Lauf kennt
     weder das Vorgehen der Jäger noch den Antrieb der Brut. Er bekommt
     nur, was durch die Leitung ginge — die Aktionen als Zeichenkette,
     dazu die Stellen, an denen die Truppe eine Ebene tiefer ging —
     und muss dieselben Rundensummen erreichen. */
  let zustand = macheLauf({ saat: LAUF_SAAT, spielerZahl: LAUF_SPIELER, tiefe: 1 });
  gleich(zustandsSumme(zustand), langerLauf.summen[0],
    "der nachgespielte Lauf beginnt beim selben Anfangszustand");

  const summen = [zustandsSumme(zustand)];
  let letzteRunde = zustand.runde;
  let marke = 0;
  const aktionen = leseFolge(langerText);
  gleich(aktionen.length, langerLauf.zustand.protokoll.length,
    "alle Aktionen kommen aus dem Text zurück");

  ohneAbbruch("der nachgespielte Lauf", () => {
    for (let i = 0; i < aktionen.length; i++) {
      if (marke < langerLauf.marken.length && langerLauf.marken[marke] === i) {
        marke += 1;
        zustand = naechsteTiefe(zustand);
        letzteRunde = zustand.runde;
        summen.push(zustandsSumme(zustand));
      }
      wendeAn(zustand, aktionen[i]);
      if (zustand.runde !== letzteRunde) {
        letzteRunde = zustand.runde;
        summen.push(zustandsSumme(zustand));
      }
    }
  });

  gleich(marke, langerLauf.marken.length, "alle Ebenenwechsel wurden nachvollzogen");
  gleich(summen.length, langerLauf.summen.length, "es entstehen gleich viele Rundenmarken");
  let ungleich = 0;
  for (let i = 0; i < summen.length; i++) {
    if (summen[i] !== langerLauf.summen[i]) ungleich += 1;
  }
  gleich(ungleich, 0,
    "und nach jeder Runde dieselbe Prüfzahl wie im gespielten Lauf — "
    + "die Aktion allein genügt durch die Leitung");
  gleich(zustandsSumme(zustand), zustandsSumme(langerLauf.zustand),
    "auch am Ende steht derselbe Zustand");
  gleich(zustand.karte.summe(), langerLauf.zustand.karte.summe(), "und dieselbe Karte");
  gleich(zustand.tiefe, langerLauf.zustand.tiefe, "und dieselbe Tiefe");
}

{
  abschnitt("Ein Bit an der Saat");
  /* Ginge das hier nicht auseinander, prüfte der ganze Abschnitt
     davor nichts: Eine Summe, die immer dasselbe sagt, sagt nichts. */
  const anders = spieleFestenLauf(LAUF_SAAT ^ 1);
  let gleicheSummen = 0;
  const bis = Math.min(anders.summen.length, langerLauf.summen.length);
  for (let i = 0; i < bis; i++) {
    if (anders.summen[i] === langerLauf.summen[i]) gleicheSummen += 1;
  }
  gleich(gleicheSummen, 0,
    `ein einziges Bit an der Saat — und keine der ${bis} Rundensummen stimmt noch überein`);
  behaupte(anders.zustand.karte.summe() !== langerLauf.zustand.karte.summe(),
    "schon die Karte ist eine andere");
  behaupte(schreibeFolge(anders.zustand.protokoll) !== langerText,
    "und der Lauf nimmt einen anderen Verlauf");
}

/* ══ 8. Eine Tiefe hinab ═══════════════════════════════════════════ */
{
  abschnitt("Eine Tiefe hinab");
  /* Ein Zustand von Hand in die Lage gebracht, die geprüft werden
     soll: einer verwundet, einer gefallen, einer unversehrt. In einem
     erzeugten Lauf käme diese Verteilung zufällig zustande oder eben
     nicht — und eine Prüfung, die auf Glück wartet, prüft nichts. */
  const zugerichtet = () => {
    const z = macheLauf({ saat: LAUF_SAAT, spielerZahl: 3 });
    z.wesen[0].lp = 4;
    z.wesen[0].wirkungen.push({ art: "brennt", runden: 3, staerke: 2 });
    z.wesen[1].traenke = 1;
    z.wesen[2].lp = 0;
    z.wesen[2].lebt = false;
    return z;
  };
  const oben = zugerichtet();

  const obenJaeger = oben.wesen.filter((w) => w.seite === SEITE_JAEGER);
  const obenSumme = zustandsSumme(oben);
  const unten = naechsteTiefe(oben);

  gleich(unten.tiefe, oben.tiefe + 1, "es geht genau eine Tiefe hinab");
  gleich(unten.runde, 1, "unten beginnt Runde 1 von vorn");
  gleich(unten.vorbei, null, "und der Lauf läuft weiter");
  gleich(unten.saat, oben.saat, "die Laufsaat bleibt");
  behaupte(unten.karte.summe() !== oben.karte.summe(), "die Landschaft ist eine andere");
  gleich(unten.karte.saat, saatFuerTiefe(oben.saat, oben.tiefe + 1),
    "sie trägt die Saat dieser Tiefe");
  gleich(zustandsSumme(oben), obenSumme,
    "der alte Zustand bleibt dabei unberührt — er ist noch vergleichbar");

  const untenJaeger = unten.wesen.filter((w) => w.seite === SEITE_JAEGER);
  gleich(untenJaeger.length, obenJaeger.length, "alle Plätze kommen mit hinab");
  for (let i = 0; i < untenJaeger.length; i++) {
    const alt = obenJaeger[i];
    const neu = untenJaeger[i];
    tiefGleich(
      { id: neu.id, art: neu.art, waffe: neu.waffe, traenke: neu.traenke,
        faehigkeiten: neu.faehigkeiten },
      { id: alt.id, art: alt.art, waffe: alt.waffe, traenke: alt.traenke,
        faehigkeiten: alt.faehigkeiten },
      `Jäger ${alt.id} behält Nummer, Klasse, Waffe, Tränke und Fähigkeiten`);
    if (alt.lebt) {
      gleich(neu.lp, alt.lp, `Jäger ${alt.id} behält seine Lebenspunkte`);
    } else {
      gleich(neu.lp, Math.max(1, Math.floor(alt.lpMax / 2)),
        `der gefallene Jäger ${alt.id} steht mit der Hälfte wieder auf`);
      behaupte(neu.lebt, `und lebt wieder`);
    }
    behaupte(neu.faehigkeiten !== alt.faehigkeiten,
      `Jäger ${alt.id} bekommt seine eigene Fähigkeitenliste, keinen Zeiger auf die alte`);
    gleich(neu.wirkungen.length, 0, `Jäger ${alt.id} trägt keinen Brand mit hinab`);
  }
  behaupte(untenJaeger.every((w, i) =>
    w.x === unten.karte.starts[i].x && w.y === unten.karte.starts[i].y),
  "jeder steht unten auf seinem neuen Startfeld");

  const untenBrut = unten.wesen.filter((w) => w.seite === SEITE_BRUT);
  behaupte(untenBrut.length > 0, `unten steht neue Brut (${untenBrut.length} Stück)`);
  behaupte(untenBrut.every((w) => w.id >= 2000), "mit IDs aus der zweiten Tiefe");
  behaupte(!unten.wesen.some((w) => w.seite === SEITE_BRUT && oben.nachId.has(w.id)),
    "keine Brut von oben kommt mit");

  /* Derselbe Kampfstrom läuft weiter: Ein frischer würfelte unten
     dieselben Zahlen wie oben. */
  behaupte(unten.zufall === oben.zufall, "der Kampfstrom wird durchgereicht, nicht neu gesät");

  /* Zwei gleich weit gespielte Läufe steigen in dieselbe zweite Ebene
     hinab — sonst hinge die Karte am Spielverlauf und nicht an der
     Saat, und zwei Rechner fänden verschiedene Kerker. */
  const nochmalUnten = naechsteTiefe(zugerichtet());
  gleich(nochmalUnten.karte.summe(), unten.karte.summe(),
    "zwei gleiche Läufe finden dieselbe zweite Ebene");
  gleich(zustandsSumme(nochmalUnten), zustandsSumme(unten), "und denselben Zustand darin");

  /* Und noch eine Tiefe: Die dritte Ebene ist wieder eine andere. */
  const tiefer = naechsteTiefe(unten);
  gleich(tiefer.tiefe, 3, "von der zweiten geht es in die dritte");
  behaupte(tiefer.karte.summe() !== unten.karte.summe(), "und die ist wieder eine andere Karte");
}

/* ══ 9. Der letzte Jäger fällt ═════════════════════════════════════ */
{
  abschnitt("Der letzte Jäger fällt");
  /* Der Bluthexer zahlt seine Fähigkeit aus den eigenen Lebenspunkten
     (`blutzoll`, eigenerVerlust 4). Mit drei Punkten fällt er an
     seinem eigenen Zoll — **im eigenen Zug**, mitten in der Runde.
     Genau das ist der Fall, den man beim Bauen verpasst: Der Lauf darf
     nicht bis zum Rundenende warten. */
  const zustand = macheLauf({ saat: LAUF_SAAT, spielerZahl: 1, heldenWahl: ["bluthexer"] });
  const hexer = zustand.wesen[0];
  const opfer = zustand.wesen.find((w) => w.seite === SEITE_BRUT);
  behaupte(!!opfer, "es gibt eine Brut als Ziel");

  const platz = RICHTUNGEN
    .map((r) => ({ x: hexer.x + r.dx, y: hexer.y + r.dy }))
    .find((f) => zustand.karte.drin(f.x, f.y) && !zustand.karte.blocktBewegung(f.x, f.y));
  behaupte(!!platz, "neben dem Bluthexer ist ein Feld frei");
  opfer.x = platz.x;
  opfer.y = platz.y;
  hexer.lp = 3;
  hexer.ap = hexer.apMax;
  zustand.ordnung = [hexer.id];
  zustand.amZug = 0;
  zustand.seiteDran = SEITE_JAEGER;
  const rundeVorher = zustand.runde;

  const ereignisse = wendeAn(zustand, {
    typ: AKTION.faehigkeit, wer: hexer.id, schluessel: "blutzoll", ziel: opfer.id, feld: null
  });

  const stelleTod = ereignisse.findIndex((e) => e.art === "gestorben" && e.wer === hexer.id);
  const stelleEnde = ereignisse.findIndex((e) => e.art === "laufEnde");
  behaupte(stelleTod >= 0, "der Bluthexer fällt an seinem eigenen Zoll");
  behaupte(stelleEnde >= 0, "und in derselben Ereignisliste endet der Lauf");
  behaupte(stelleTod < stelleEnde, "der Tod steht vor dem Ende, nicht danach");
  gleich(ereignisse[stelleEnde].grund, "niederlage", "als Niederlage");
  gleich(zustand.vorbei, "niederlage", "und das steht sofort im Zustand");
  gleich(zustand.runde, rundeVorher, "die Runde ist dabei nicht weitergelaufen");
  behaupte(!ereignisse.some((e) => e.art === "rundeNeu"),
    "es beginnt keine neue Runde — der Lauf endet mitten im Zug, "
    + "nicht erst nach Rundenende");
  gleich(amZugWesen(zustand), null, "danach ist niemand mehr am Zug");
  gleich(pruefeAktion(zustand, { typ: AKTION.zugEnde, wer: hexer.id }),
    "Der Lauf ist vorbei.", "und keine Aktion wird mehr angenommen");
  gleich(zusammenfassung(zustand).lebendeJaeger, 0,
    "die Zusammenfassung zählt null lebende Jäger");
  gleich(spieleBrutZug(zustand).length, 0, "und die Brut zieht nicht mehr");
}

/* ══ 10. Die Klammer um den Antrieb ═══════════════════════════════ */
{
  abschnitt("Die Klammer um den Antrieb");
  /* Geprüft wird hier die **Klammer**, nicht die KI: Was ein Gegner
     sich vornimmt, prüft `werkzeuge/pruefe-ki.mjs`. Hier zählt nur,
     dass ein hereingereichter Plan Aktion für Aktion abgearbeitet
     wird, dass eine Aktion, die inzwischen nicht mehr geht, den Zug
     **beendet** statt ihn zu erzwingen, und dass kein Antrieb die
     Schleife festsetzen kann. Deshalb sind die Antriebe hier feste
     Listen: So steht in der Prüfung genau ein Verhalten — das der
     Klammer. */
  const zweiWesen = () => {
    const wache = macheProbeWesen({ id: 1, seite: SEITE_BRUT, x: 2, y: 4, flinkheit: 9 });
    const gegen = macheProbeWesen({ id: 2, seite: SEITE_JAEGER, x: 9, y: 4, flinkheit: 1 });
    return { wache, gegen, zustand: macheProbeZustand(macheProbeFlaeche(), [wache, gegen]) };
  };

  const alsListe = zweiWesen();
  const gespielt = spieleBrutZug(alsListe.zustand, (z, w) => [
    { typ: AKTION.wacht, wer: w.id },
    { typ: AKTION.zugEnde, wer: w.id }
  ]);
  behaupte(gespielt.some((e) => e.art === "wacht" && e.wer === alsListe.wache.id),
    "ein Plan als Liste wird Aktion für Aktion abgearbeitet");
  behaupte(alsListe.wache.wacht, "der Wächter steht danach auf Wacht");
  behaupte(gespielt.some((e) => e.art === "zugEnde"), "und der Zug ist beendet");
  behaupte(!amZugWesen(alsListe.zustand)
    || amZugWesen(alsListe.zustand).seite === SEITE_JAEGER,
  "die Steuerung liegt wieder bei den Jägern");

  const einzeln = zweiWesen();
  spieleBrutZug(einzeln.zustand, (z, w) => ({ typ: AKTION.wacht, wer: w.id }));
  behaupte(einzeln.wache.wacht, "ein einzelner Vorschlag geht genauso durch");
  behaupte(!amZugWesen(einzeln.zustand)
    || amZugWesen(einzeln.zustand).id !== einzeln.wache.id,
  "und beendet den Zug, sobald nichts mehr nachkommt");

  const nichts = zweiWesen();
  const leer = spieleBrutZug(nichts.zustand, () => []);
  behaupte(leer.some((e) => e.art === "zugEnde"), "ein leerer Plan beendet den Zug");
  behaupte(!nichts.wache.wacht, "und tut sonst nichts");

  /* Der Fall, den man beim Bauen verpasst: Der zweite Schritt eines
     Plans geht nicht mehr, weil der erste die Lage geändert hat. Der
     Rest des Plans darf dann **nicht** weiterlaufen — sonst führte die
     Klammer einen Zug aus, den so niemand geplant hat.

     Der Plan geht zweimal auf dasselbe Feld und danach weiter: Der
     zweite Schritt scheitert an „dort steht das Wesen bereits", der
     dritte wäre für sich gültig. Wer die ungültige Aktion nur
     überspringt statt abzubrechen, macht zwei Schritte statt einem —
     und genau daran fällt der Unterschied auf. */
  const veraltet = zweiWesen();
  const gefahren = spieleBrutZug(veraltet.zustand, (z, w) => [
    { typ: AKTION.gehen, wer: w.id, nach: { x: 3, y: 4 } },
    { typ: AKTION.gehen, wer: w.id, nach: { x: 3, y: 4 } },
    { typ: AKTION.gehen, wer: w.id, nach: { x: 4, y: 4 } }
  ]);
  gleich(gefahren.filter((e) => e.art === "bewegt").length, 1,
    "eine Aktion, die inzwischen nicht mehr geht, beendet den Zug");
  gleich(`${veraltet.wache.x},${veraltet.wache.y}`, "3,4",
    "der Wächter steht auf dem Feld des ersten Schritts, nicht des dritten");
  behaupte(gefahren.some((e) => e.art === "zugEnde"), "der Zug endet an dieser Stelle");

  const trotz = zweiWesen();
  spieleBrutZug(trotz.zustand, () => ({ typ: "tanzen", wer: 1 }));
  behaupte(!amZugWesen(trotz.zustand) || amZugWesen(trotz.zustand).id !== trotz.wache.id,
    "ein Antrieb, der nur Unsinn vorschlägt, beendet den Zug trotzdem");

  const ohneBrut = macheProbeZustand(macheProbeFlaeche(),
    [macheProbeWesen({ id: 1, seite: SEITE_JAEGER, x: 2, y: 4 })]);
  gleich(spieleBrutZug(ohneBrut).length, 0, "ist kein Brut-Wesen am Zug, geschieht nichts");
}

ende("Lauf");
