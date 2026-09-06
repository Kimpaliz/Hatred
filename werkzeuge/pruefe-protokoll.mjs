/* [Aufgabe: Prüfwesen] Prüft `spiel/protokoll.mjs` — die Form, in der
   eine Aktion durch die Leitung geht.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Über die Leitung geht eine **Aktion**, kein Zustand: „Wesen 3 geht
   nach (12, 8)" sind ein paar Dutzend Bytes, ein Spielstand wäre
   tausendmal so viel. Der Preis dafür ist, dass die Übersetzung in
   beide Richtungen **verlustfrei** sein muss. Verliert sie ein Feld,
   rechnet der Empfänger etwas anderes aus als der Sender — und das
   fällt nicht als Fehler auf, sondern erst als Rundensumme, die
   auseinanderläuft.

   Deshalb steht hier der Rundlauf über tausend gebaute Aktionen und
   nicht über drei Beispiele: Der Fall, der schiefgeht, ist immer der
   mit dem `null`, dem Umlaut oder dem Trennzeichen im Text.

   ── Warum getrennt von `pruefe-lauf.mjs` ───────────────────────────

   Beides stand dort, und die Datei wuchs am 06.09.2026 auf 1.014
   Zeilen. Die Grenze liegt bei 1.000, und eine Datei über der Grenze
   wird geteilt, nicht geduldet (Regel 8). Der Schnitt fiel dorthin, wo
   ohnehin zwei Dinge standen: das Protokoll ist eine Übersetzung,
   der Lauf ist ein Ablauf.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/protokoll.mjs` (das Geprüfte), `spiel/aktionen.mjs` (die
   Formen), `werkzeuge/helfer.mjs`, `werkzeuge/pruefe-alles.mjs`. */

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


/* ── Ein Vergleich, der die Feldmenge mit prüft ────────────────────

   `tiefGleich` aus dem Prüfgerüst vergleicht über `JSON.stringify` und
   hängt damit an der Reihenfolge der Felder. Für den Rundlauf des
   Protokolls ist das die falsche Elle: Dort soll bewiesen werden, dass
   **dieselben Felder mit denselben Werten** herauskommen — und
   ausdrücklich auch, dass ein fehlendes Feld nicht zu `null` wird und
   umgekehrt. Also ein eigener Vergleich, der die Schlüsselmenge prüft
   und die Reihenfolge nicht. */
function gleichWert(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((wert, i) => gleichWert(wert, b[i]));
  }
  const sa = Object.keys(a).sort();
  const sb = Object.keys(b).sort();
  if (sa.length !== sb.length || sa.some((s, i) => s !== sb[i])) return false;
  return sa.every((s) => gleichWert(a[s], b[s]));
}

/* ══ 1. Das Protokoll — die Form ═══════════════════════════════════ */
{
  abschnitt("Protokoll — die Form");
  gleich(schreibeAktion({ typ: AKTION.gehen, wer: 3, nach: { x: 12, y: 8 } }),
    "g|w3|n12:8", "eine Bewegung steht in zehn Zeichen");
  gleich(schreibeAktion({ typ: AKTION.zugEnde, wer: 1 }), "e|w1", "ein Zugende in vier");
  gleich(schreibeAktion({
    typ: AKTION.faehigkeit, wer: 3, ziel: null, schluessel: "blutzoll", feld: { x: 4, y: 9 }
  }), "f|w3|z~|sblutzoll|f4:9", "eine Fähigkeit mit Feld-Ziel");

  behaupte(!schreibeAktion({ typ: AKTION.angriff, wer: 2, ziel: 1007 }).includes(" "),
    "im Text steht kein Leerzeichen — er geht durch die Leitung, nicht auf ein Blatt");

  /* Die Felder kommen in fester Ordnung heraus, gleichgültig, wie
     herum sie hineingingen. Ohne diese Normalform wären zwei gleiche
     Aktionen zweier Rechner verschiedene Zeichenketten. */
  const verdreht = { feld: null, schluessel: "weitblick", typ: AKTION.faehigkeit, ziel: 7, wer: 2 };
  gleich(schreibeAktion(verdreht), "f|w2|z7|sweitblick|f~",
    "die Feldfolge im Text hängt nicht daran, wie die Aktion gebaut wurde");
  tiefGleich(leseAktion(schreibeAktion(verdreht)),
    { typ: AKTION.faehigkeit, wer: 2, ziel: 7, schluessel: "weitblick", feld: null },
    "und gelesen kommt sie in der Normalform zurück");

  /* Der Fall, der ohne diese Prüfung falsch wäre: `ziel: null` heißt
     „ausdrücklich keins", ein fehlendes `ziel` heißt „danach wurde
     nicht gefragt". Wer beides gleich behandelt, baut einen Desync. */
  const mitNull = leseAktion(schreibeAktion({ typ: AKTION.wacht, wer: 4, ziel: null }));
  const ohne = leseAktion(schreibeAktion({ typ: AKTION.wacht, wer: 4 }));
  behaupte(Object.prototype.hasOwnProperty.call(mitNull, "ziel") && mitNull.ziel === null,
    "ein ausdrückliches `null` kommt als `null` zurück");
  behaupte(!Object.prototype.hasOwnProperty.call(ohne, "ziel"),
    "ein fehlendes Feld kommt gar nicht zurück");
  behaupte(schreibeAktion(mitNull) !== schreibeAktion(ohne),
    "und beide sind im Text unterscheidbar");

  /* `undefined` ist kein Wert, sondern ein nicht gefülltes Feld —
     dieselbe Auslegung wie bei `JSON.stringify`. */
  gleich(schreibeAktion({ typ: AKTION.wacht, wer: 4, ziel: undefined }), "w|w4",
    "ein Feld mit `undefined` gilt als nicht gesetzt");

  gleich(schreibeFolge([]), "", "die leere Folge ist der leere Text");
  tiefGleich(leseFolge(""), [], "und kommt als leere Liste zurück");
  gleich(schreibeFolge([{ typ: AKTION.wacht, wer: 1 }, { typ: AKTION.zugEnde, wer: 1 }]),
    "w|w1;e|w1", "zwei Aktionen, ein Semikolon");

  gleich(Object.keys(TYP_KUERZEL).length, 8, "es gibt acht Aktionsarten");
  gleich(new Set(Object.values(TYP_KUERZEL)).size, 8, "und acht verschiedene Kürzel");
  gleich(FELD_ORDNUNG[0], "wer", "`wer` steht in der Ordnung vorn");
}

/* ══ 2. Das Protokoll — tausend Aktionen im Kreis ══════════════════ */
{
  abschnitt("Protokoll — tausend Aktionen im Kreis");
  const zufall = macheZufall(20260906);
  const typen = Object.keys(TYP_KUERZEL);
  const schluesselWahl = FAEHIGKEITEN.map((f) => f.schluessel).concat(["A_9", "z", "Ohne_Umlaut1"]);
  /* Gewürfelt werden nicht nur gültige Spielzüge, sondern die ganze
     Bandbreite der **Form**: jedes Feld einmal fehlend, einmal `null`,
     einmal gefüllt, dazu negative Koordinaten. Das Protokoll darf über
     den Inhalt nicht urteilen — das tut `pruefeAktion`. */
  const bauen = () => {
    const aktion = { typ: zufall.ausListe(typen), wer: zufall.ganz(-3, 4000) };
    for (const feld of FELD_ORDNUNG) {
      if (feld === "wer") continue;
      const wahl = zufall.ganz(0, 2);
      if (wahl === 0) continue;
      if (wahl === 1) { aktion[feld] = null; continue; }
      if (feld === "ziel") aktion[feld] = zufall.ganz(-2, 9000);
      else if (feld === "schluessel") aktion[feld] = zufall.ausListe(schluesselWahl);
      else aktion[feld] = { x: zufall.ganz(-9, 80), y: zufall.ganz(-9, 60) };
    }
    return aktion;
  };

  const aktionen = [];
  for (let i = 0; i < 1000; i++) aktionen.push(bauen());
  let verloren = 0;
  let nichtFest = 0;
  let mitLeerzeichen = 0;
  let zeichen = 0;
  for (const aktion of aktionen) {
    const text = schreibeAktion(aktion);
    zeichen += text.length;
    if (text.includes(" ")) mitLeerzeichen += 1;
    const zurueck = leseAktion(text);
    if (!gleichWert(zurueck, aktion)) verloren += 1;
    /* Der zweite Rundlauf, über den Text: Er zeigt, dass die gelesene
       Aktion **dieselbe** Zeichenkette wieder ergibt. Ohne ihn könnte
       ein Fehler in beide Richtungen gleich falsch sein. */
    if (schreibeAktion(zurueck) !== text) nichtFest += 1;
  }
  gleich(verloren, 0, "1.000 Aktionen kommen Feld für Feld unverändert zurück");
  gleich(nichtFest, 0, "und ihr Text ist ein Festpunkt: schreibe(lese(t)) === t");
  gleich(mitLeerzeichen, 0, "keine einzige trägt ein Leerzeichen");
  behaupte(zeichen / aktionen.length < 24,
    `eine Aktion braucht im Mittel ${(zeichen / aktionen.length).toFixed(1)} Zeichen`);
  const folge = schreibeFolge(aktionen);
  const gelesen = leseFolge(folge);
  gleich(gelesen.length, aktionen.length, "die ganze Folge kommt vollzählig zurück");
  behaupte(aktionen.every((a, i) => gleichWert(a, gelesen[i])),
    "und jede einzelne Aktion darin unverändert");
  gleich(schreibeFolge(gelesen), folge, "auch die Folge ist ein Festpunkt");
}

/* ══ 3. Das Protokoll — was nicht durchgeht ════════════════════════ */
{
  abschnitt("Protokoll — was nicht durchgeht");
  /* Ein stilles `null` wäre schlimmer als ein Wurf: Im Netz hieße es,
     dass ein Rechner die Aktion ausführt und ein anderer nicht. */
  wirft(() => leseAktion(""), "leerer Text ist keine Aktion");
  wirft(() => leseAktion("q|w1"), "eine unbekannte Aktionsart wird abgewiesen");
  wirft(() => leseAktion("g|q7"), "ein unbekanntes Feld wird abgewiesen");
  wirft(() => leseAktion("g|w1|w2"), "ein doppeltes Feld wird abgewiesen");
  wirft(() => leseAktion("g|n1:2"), "eine Aktion ohne `wer` wird abgewiesen");
  wirft(() => leseAktion("g|w1|nxy"), "ein Feld ohne Doppelpunkt wird abgewiesen");
  wirft(() => leseAktion("g|w1|n1:zwei"), "eine Koordinate, die keine Zahl ist");
  wirft(() => leseAktion("g|w1,5"), "eine gebrochene Zahl bei `wer`");
  wirft(() => schreibeAktion({ typ: "tanzen", wer: 1 }), "eine erfundene Aktionsart");
  wirft(() => schreibeAktion({ typ: AKTION.wacht }), "eine Aktion ohne `wer`");
  wirft(() => schreibeAktion({ typ: AKTION.wacht, wer: 1.5 }), "ein `wer` mit Komma");
  wirft(() => schreibeAktion({ typ: AKTION.gehen, wer: 1, nach: { x: 1 } }),
    "ein halbes Feld");
  wirft(() => schreibeAktion({
    typ: AKTION.faehigkeit, wer: 1, schluessel: "blut|zoll"
  }), "ein Schlüssel mit dem Trennzeichen darin");
  wirft(() => schreibeAktion({
    typ: AKTION.faehigkeit, wer: 1, schluessel: "blut;zoll"
  }), "ein Schlüssel mit dem Folgen-Trennzeichen darin");
}

ende("Protokoll");
