/* [Aufgabe: Regelkern] Der Lauf — ein ganzer Spielstand entsteht,
   die Brut zieht, es geht eine Tiefe hinab, und eine Zahl sagt, ob
   vier Rechner noch dasselbe Spiel spielen.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Diese Datei ist die Klammer um alles darunter: Landschaft, Katalog,
   Wesen, Zugordnung, Aktionen und Kampf stehen je in ihrer eigenen
   Datei und kennen einander nur so weit, wie sie müssen. Erst hier
   wird daraus ein Spiel — und zwar an **einer** Stelle, damit es
   keine zweite Art gibt, einen Lauf zu bauen. Zwei Bauarten wären
   zwei Startaufstellungen, und im Netz sind das zwei Spiele.

   **Die wichtigste Zeile ist `zustandsSumme`.** Über die Leitung geht
   eine Aktion, kein Zustand — jeder Rechner rechnet selbst. Das trägt
   nur, solange alle vier auf dasselbe Ergebnis kommen, und die einzige
   bezahlbare Art, das zu prüfen, ist eine Prüfzahl über den ganzen
   Zustand nach jeder Runde. Sind zwei verschieden, ist der Lauf
   auseinandergelaufen, und `netz/sitzung.mjs` bricht ab, statt zwei
   verschiedene Spiele weiterzuspielen.

   Deshalb steht in der Summe **mehr**, als der Vertrag verlangt, und
   jede Zutat hat einen Grund:

   · `karte.summe()` deckt die fünf Feldreihen ab — aber **nicht** die
     Lichter. Eine Fackel, die auf einem Rechner brennt und auf dem
     anderen nicht, ändert, wer wen sieht und wer beschossen werden
     kann (`spiel/licht.mjs`). Sie muss mit hinein.
   · `ordnung` gehört zum Zeiger: `amZug` allein sagt nichts, wenn die
     Liste darunter eine andere ist.
   · `tiefe` und `saat`, weil zwei Rechner auf verschiedenen Ebenen
     desselben Laufs sonst dieselbe Zahl hätten.
   · Die Wesen in **Listenreihenfolge**, nicht nach ID sortiert. Die
     Reihenfolge ist Teil des Zustands: `wesenBei` gibt bei zwei
     Figuren auf einem Feld die erste der Liste zurück. Eine sortierte
     Summe übersähe genau diesen Unterschied.

   Nicht darin steht `karte.raeume` (beschreibt, wie die Karte
   entstanden ist, nicht wie sie jetzt aussieht — ändert sich nie) und
   `zustand.ereignisse` (ein Nebenprodukt des letzten Aufrufs, kein
   Zustand).

   **Warum jede Tiefe ihre eigene Saat bekommt.** Der Lauf hat eine
   Saat; jede Ebene leitet ihre daraus ab (`saatFuerTiefe`). Würde
   jede Ebene dieselbe nehmen, wären alle Ebenen dieselbe Karte; nähme
   man den laufenden Kampfstrom, hinge die Karte der zweiten Ebene
   davon ab, wie oft in der ersten gewürfelt wurde — und damit davon,
   wie gut jemand gespielt hat (Fehlerbuch B4). Tiefe 1 gibt die Saat
   unverändert weiter, damit `werkzeuge/karte-zeigen.mjs 7` genau die
   Karte zeigt, mit der `macheLauf({saat: 7})` beginnt.

   **Warum die Gegnerwahl nicht aus dem Kampfstrom würfelt.** Aus
   demselben Grund und mit einer zweiten Folge: `setzeGegner` lässt
   sich damit zweimal aufrufen und stellt beide Male dieselbe Brut auf
   dieselben Felder. Die IDs der Brut sind `1000 · Tiefe + Nummer` —
   gerechnet, nicht durchgezählt, damit auch sie beim zweiten Aufruf
   dieselben sind und in einem Protokoll sofort lesbar ist, aus welcher
   Ebene eine Figur stammt.

   **Warum in `spieleBrutZug` keine Zeile Spielverstand steht.** Was
   ein Gegner sich vornimmt, entscheidet `spiel/gegner-ki.mjs`
   (`planeZug`) — und **nur** dort. Eine zweite Meinung darüber an
   dieser Stelle wäre derselbe Fehler, vor dem `spiel/aktionen.mjs` bei
   der Trefferchance warnt: Zwei Stellen, die dasselbe entscheiden,
   laufen auseinander, und im Netz sind das zwei Spiele. Was hier steht,
   ist nur die Klammer: wer wann dran ist, dass **jede** Aktion vor dem
   Anwenden durch `pruefeAktion` geht, und dass ein Zug nicht ewig
   dauert.

   Der Antrieb ist trotzdem ein Aufrufwert und keine feste Verdrahtung —
   nicht aus Vorsicht, sondern weil er dadurch **austauschbar** ist: Ein
   Prüflauf reicht einen festen Plan herein und sieht der Klammer beim
   Arbeiten zu, ohne die Entscheidungen der KI mitzuprüfen. Er darf
   einen einzelnen Vorschlag geben oder einen ganzen Zug als Liste —
   `planeZug` tut das Zweite.

   **Warum Gefallene eine Tiefe tiefer wieder aufstehen.** Ein Spieler,
   dessen Figur in Ebene 2 fällt, säße sonst bis zum Ende zu. Der Preis
   ist die Hälfte der Lebenspunkte — genug, dass Sterben weh tut, nicht
   so viel, dass jemand aufhört mitzuspielen.

   ── Zwei Ergänzungen zum Schnittstellenvertrag ─────────────────────

   Beide additiv, beide begründet: `zustand.ereignisse` trägt die
   Ereignisse, die beim Bauen entstanden sind (Rundenanfang der ersten
   Runde) — das Bild muss sie abspielen, bevor der erste Spieler
   klickt, und ein zweiter Aufruf von `starteRunde` wäre eine zweite
   Runde. Und `wesen.traenke` zählt die Tränke im Gepäck; die Aktion
   `trank` in `spiel/aktionen.mjs` fragt danach, der Vertrag nennt das
   Feld nicht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/landschaft.mjs` (`baueLandschaft`), `spiel/katalog/helden.mjs`
   und `spiel/katalog/gegner.mjs` (die Vorlagen und `waehleGegner`),
   `spiel/wesen.mjs` (`macheWesen`), `spiel/zug.mjs` (`starteRunde`,
   `amZugWesen`), `spiel/aktionen.mjs` (`pruefeAktion`, `wendeAn`),
   `spiel/hoehen.mjs` und `spiel/wegfindung.mjs` (was der Antrieb über
   Stürze und erreichbare Felder wissen muss), `spiel/zufall.mjs`,
   `spiel/protokoll.mjs` (schreibt `zustand.protokoll` fort),
   `netz/sitzung.mjs` (vergleicht `zustandsSumme`),
   `werkzeuge/pruefe-lauf.mjs`. */

import { alleFelder, abstand } from "./gitter.mjs";
import { macheZufall } from "./zufall.mjs";
import { baueLandschaft } from "./landschaft.mjs";
import { betretenSchaden } from "./hoehen.mjs";
import { macheWesen, belegtPruefer, lebendig, MAX_SPIELER } from "./wesen.mjs";
import { starteRunde, amZugWesen, SEITE_JAEGER, SEITE_BRUT } from "./zug.mjs";
import { AKTION, pruefeAktion, wendeAn } from "./aktionen.mjs";
import { planeZug } from "./gegner-ki.mjs";
import { held, kenntHeld, heldenSchluessel } from "./katalog/helden.mjs";
import { waehleGegner } from "./katalog/gegner.mjs";

/* ── Die Zahlen, die einen Lauf beschreiben ────────────────────────

   Sie stehen hier und nicht in einem Menü: Jede Änderung daran ist
   eine Regeländerung und gehört in den Changelog. */

/* Eins bis vier — die Obergrenze steht in `spiel/wesen.mjs`, weil
   dort der Spielerplatz eines Wesens geprüft wird. Eine zweite Vier an
   dieser Stelle wäre die Sorte Zahl, die man an einer Stelle ändert
   und an der anderen vergisst. */
export const MIN_SPIELER = 1;

/* Zwei Tränke im Gepäck. Einer wäre eine Rettung, drei wären ein
   Vorrat — zwei sind eine Entscheidung: jetzt oder gleich. */
export const TRAENKE_START = 2;

/* Das Punktebudget, aus dem `waehleGegner` die Brut zusammenstellt.
   Die drei Zahlen sind das, woran die Schwierigkeit gedreht wird. Ein
   Krätzling kostet 11 Punkte, ein Blutvogt 40 (`spiel/katalog/
   gegner.mjs → kosten`). */
export const BUDGET_GRUND = 40;
export const BUDGET_JE_TIEFE = 22;
export const BUDGET_JE_SPIELER = 18;

/* Wie weit die Brut mindestens vom Startnest der Jäger entfernt
   aufgestellt wird — in Manhattan-Feldern, in dieser Folge versucht.
   Ohne Abstand stünde auf einer engen Karte ein Grubenhund neben
   Spieler 1, bevor irgendjemand einen Punkt ausgegeben hat. Reicht der
   Platz für den ersten Wert nicht, gilt der nächste; die letzte Stufe
   ist 0, damit auch eine kleine Karte spielbar bleibt statt zu werfen. */
export const ABSTANDS_STUFEN = [14, 10, 6, 3, 0];

/* Wer eine Tiefe tiefer wieder aufsteht, tut das mit der Hälfte. */
export const WIEDER_AUF_TEILER = 2;

/* Notbremsen für den Brut-Antrieb. Ein Wesen mit sieben Punkten kann
   höchstens sieben Schritte tun; 24 lässt jeder denkbaren Fähigkeit
   Luft und schlägt trotzdem an, bevor eine Schleife den Rechner
   festsetzt. */
const HOECHSTENS_SCHRITTE = 24;
const HOECHSTENS_BRUT_ZUEGE = 400;

/* ── Saaten ────────────────────────────────────────────────────────*/

/* Die Kartensaat einer Ebene. Tiefe 1 gibt die Laufsaat unverändert
   zurück — so ist die erste Karte genau die, die
   `werkzeuge/karte-zeigen.mjs <saat>` zeigt. Darunter ein
   FNV-1a-Schritt: klein, ganzzahlig, auf jedem Rechner derselbe. */
export function saatFuerTiefe(saat, tiefe) {
  const s = saat >>> 0;
  if (tiefe <= 1) return s;
  let h = s ^ 0x811c9dc5;
  for (let i = 0; i < tiefe; i++) h = Math.imul(h ^ i, 0x01000193) >>> 0;
  return h >>> 0;
}

/* Der Strom, aus dem die Brut gewählt und gestellt wird. Abgeleitet
   aus der **Kartensaat**, nicht aus dem Kampfstrom: Damit hängt die
   Aufstellung nur an Saat und Tiefe, und `setzeGegner` gibt beim
   zweiten Aufruf dieselbe Antwort. Der Versatz sorgt dafür, dass es
   nicht derselbe Strom ist, aus dem `baueLandschaft` schöpft. */
function gegnerStrom(kartenSaat) {
  return macheZufall((kartenSaat ^ 0x5bf03635) >>> 0);
}

export function gegnerBudget(tiefe, spielerZahl) {
  return BUDGET_GRUND + BUDGET_JE_TIEFE * (tiefe - 1) + BUDGET_JE_SPIELER * spielerZahl;
}

/* Gerechnet statt durchgezählt — siehe Kopfnotiz. `nummer` beginnt
   bei 1, und `HOECHSTENS_GEGNER` ist 40, also bleibt der Tausender
   frei. */
export function brutId(tiefe, nummer) {
  return 1000 * tiefe + nummer;
}

/* ── Einen Lauf bauen ──────────────────────────────────────────────*/

function pruefeAngaben(saat, spielerZahl, tiefe) {
  if (!Number.isInteger(saat)) throw new Error("macheLauf: saat muss eine ganze Zahl sein");
  if (!Number.isInteger(spielerZahl) || spielerZahl < MIN_SPIELER || spielerZahl > MAX_SPIELER) {
    throw new Error(`macheLauf: spielerZahl muss ${MIN_SPIELER} bis ${MAX_SPIELER} sein`);
  }
  if (!Number.isInteger(tiefe) || tiefe < 1) {
    throw new Error("macheLauf: tiefe muss eine ganze Zahl ab 1 sein");
  }
}

/* Aus der Wahl der Spieler wird eine Liste von Heldenschlüsseln. Ohne
   Wahl die ersten Klassen des Katalogs — in Katalogreihenfolge, damit
   ein Lauf ohne Wahl auf allen vier Rechnern dieselbe Truppe hat. */
function heldenListe(heldenWahl, spielerZahl) {
  if (heldenWahl === null || heldenWahl === undefined) {
    return heldenSchluessel().slice(0, spielerZahl);
  }
  if (!Array.isArray(heldenWahl) || heldenWahl.length !== spielerZahl) {
    throw new Error(`macheLauf: heldenWahl braucht genau ${spielerZahl} Klassen`);
  }
  for (const schluessel of heldenWahl) {
    if (!kenntHeld(schluessel)) {
      throw new Error(`macheLauf: die Heldenklasse „${schluessel}" gibt es nicht`);
    }
  }
  return heldenWahl.slice();
}

/* `nachId` ist die schnelle Antwort auf „welches Wesen ist Nummer 7".
   Sie wird neu gebaut, sooft sich die Liste ändert — eine Karte, die
   ein gelöschtes Wesen noch kennt, ist schlimmer als keine. */
function neuIndex(zustand) {
  zustand.nachId = new Map();
  for (const w of zustand.wesen) zustand.nachId.set(w.id, w);
}

export function macheLauf({
  saat, spielerZahl = 2, tiefe = 1, heldenWahl = null, breite, hoehe
} = {}) {
  pruefeAngaben(saat, spielerZahl, tiefe);
  const klassen = heldenListe(heldenWahl, spielerZahl);

  const masse = {};
  if (breite !== undefined) masse.breite = breite;
  if (hoehe !== undefined) masse.hoehe = hoehe;
  const karte = baueLandschaft({ saat: saatFuerTiefe(saat, tiefe), tiefe, spielerZahl, ...masse });

  const zustand = {
    saat: saat >>> 0,
    tiefe,
    karte,
    /* Der Kampfstrom. Er beginnt bei der Laufsaat und läuft über alle
       Ebenen weiter — `naechsteTiefe` reicht ihn durch. */
    zufall: macheZufall(saat),
    wesen: [],
    nachId: new Map(),
    runde: 1,
    ordnung: [],
    amZug: 0,
    seiteDran: SEITE_JAEGER,
    spieler: [],
    vorbei: null,
    protokoll: [],
    ereignisse: []
  };

  for (let platz = 1; platz <= spielerZahl; platz++) {
    const start = karte.starts[platz - 1];
    const wesen = macheWesen(held(klassen[platz - 1]), {
      id: platz, seite: SEITE_JAEGER, x: start.x, y: start.y, spielerPlatz: platz
    });
    wesen.traenke = TRAENKE_START;
    zustand.wesen.push(wesen);
    zustand.spieler.push({ platz, name: `Spieler ${platz}`, wesenId: platz });
  }
  neuIndex(zustand);

  setzeGegner(zustand);
  zustand.ereignisse = starteRunde(zustand);
  return zustand;
}

/* ── Die Brut aufstellen ───────────────────────────────────────────*/

/* Die Felder, auf denen eine Brut stehen darf: begehbar, unbesetzt,
   nicht in der Lava und weit genug vom Startnest weg. Die Abstände
   werden der Reihe nach versucht — auf einer Karte, deren Räume dicht
   beieinander liegen, gäbe es sonst keinen einzigen Platz und der Lauf
   begänne ohne Gegner, also mit einem sofortigen Sieg. */
function gegnerFelder(zustand, wieviele, zufall) {
  const karte = zustand.karte;
  const besetzt = belegtPruefer(zustand.wesen);
  for (const mindest of ABSTANDS_STUFEN) {
    const frei = [];
    for (const { x, y } of alleFelder(karte)) {
      if (karte.blocktBewegung(x, y)) continue;
      if (besetzt(x, y)) continue;
      if (betretenSchaden(karte, x, y)) continue;
      if (abstandZumNest(karte, x, y) < mindest) continue;
      frei.push({ x, y });
    }
    if (frei.length >= wieviele) return zufall.mischen(frei).slice(0, wieviele);
  }
  return [];
}

function abstandZumNest(karte, x, y) {
  let naechster = Infinity;
  for (const start of karte.starts || []) {
    const d = abstand(x, y, start.x, start.y);
    if (d < naechster) naechster = d;
  }
  return naechster;
}

/* Stellt die Brut dieser Tiefe auf. Vorhandene Brut wird zuerst
   entfernt: Sonst hinge das Ergebnis davon ab, wie oft jemand gerufen
   hat, und `setzeGegner` wäre keine Aussage über die Ebene, sondern
   über die Aufrufgeschichte. Die Jäger bleiben unberührt. */
export function setzeGegner(zustand) {
  if (!zustand || !zustand.karte) throw new Error("setzeGegner: ohne Zustand geht nichts");
  zustand.wesen = zustand.wesen.filter((w) => w.seite !== SEITE_BRUT);
  neuIndex(zustand);

  const zufall = gegnerStrom(zustand.karte.saat);
  const budget = gegnerBudget(zustand.tiefe, zustand.spieler.length);
  const vorlagen = waehleGegner(zufall, zustand.tiefe, budget);
  const felder = gegnerFelder(zustand, vorlagen.length, zufall);

  for (let i = 0; i < vorlagen.length && i < felder.length; i++) {
    const wesen = macheWesen(vorlagen[i], {
      id: brutId(zustand.tiefe, i + 1),
      seite: SEITE_BRUT,
      x: felder[i].x,
      y: felder[i].y
    });
    wesen.traenke = 0;
    zustand.wesen.push(wesen);
  }
  neuIndex(zustand);
}

/* ── Der Antrieb der Brut ──────────────────────────────────────────

   Was hier steht, ist die Klammer, nicht das Verhalten: Solange ein
   Brut-Wesen am Zug ist, wird ein Vorschlag geholt, **geprüft** und
   angewandt; ein abgelehnter Vorschlag wird zum Zugende. Damit kann
   der Antrieb nichts anrichten, was `wendeAn` nicht ohnehin
   zurückwiese, und die Ereignisliste bleibt dieselbe, die ein Spieler
   mit denselben Aktionen erzeugt hätte. */

export function spieleBrutZug(zustand, waehleAktion = planeZug) {
  const ereignisse = [];
  if (!zustand || zustand.vorbei) return ereignisse;

  let zuege = 0;
  while (!zustand.vorbei) {
    const wesen = amZugWesen(zustand);
    if (!wesen || wesen.seite !== SEITE_BRUT) break;
    zuege += 1;
    if (zuege > HOECHSTENS_BRUT_ZUEGE) {
      throw new Error(`spieleBrutZug: mehr als ${HOECHSTENS_BRUT_ZUEGE} Züge in einem Aufruf`);
    }
    ereignisse.push(...einenBrutZug(zustand, wesen, waehleAktion));
  }
  return ereignisse;
}

/* Ein Vorschlag darf eine einzelne Aktion sein, eine Liste von
   Aktionen (ein im Ganzen geplanter Zug) oder nichts. Damit passt
   beides an dieselbe Klammer: ein Antrieb, der Aktion für Aktion
   entscheidet, und einer, der den Zug vorausplant. Was nicht durch
   `pruefeAktion` geht, beendet den Zug — ein Plan, dessen dritter
   Schritt nicht mehr stimmt, weil der zweite die Lage geändert hat,
   soll den Rest nicht mit Gewalt durchdrücken. */
function alsListe(vorschlag) {
  if (vorschlag === null || vorschlag === undefined) return [];
  return Array.isArray(vorschlag) ? vorschlag : [vorschlag];
}

function einenBrutZug(zustand, wesen, waehleAktion) {
  const ereignisse = [];
  const id = wesen.id;
  const beenden = () => {
    ereignisse.push(...wendeAn(zustand, { typ: AKTION.zugEnde, wer: id }));
    return ereignisse;
  };

  for (let schritt = 0; schritt < HOECHSTENS_SCHRITTE; schritt++) {
    if (zustand.vorbei) return ereignisse;
    /* Wer im eigenen Zug gefallen ist, hat ihn schon beendet
       (`spiel/aktionen.mjs`); dann steht hier ein anderer. */
    const dran = amZugWesen(zustand);
    if (!dran || dran.id !== id) return ereignisse;

    const plan = alsListe(waehleAktion(zustand, dran));
    if (plan.length === 0) return beenden();

    for (const aktion of plan) {
      if (zustand.vorbei) return ereignisse;
      const jetzt = amZugWesen(zustand);
      if (!jetzt || jetzt.id !== id) return ereignisse;
      if (pruefeAktion(zustand, aktion) !== null) return beenden();
      ereignisse.push(...wendeAn(zustand, aktion));
      if (aktion.typ === AKTION.zugEnde) return ereignisse;
    }
  }
  /* Die Notbremse: Wer nach so vielen Schritten noch dasteht, hat
     einen Antrieb, der nichts kostet und nichts beendet. */
  if (!zustand.vorbei) {
    const dran = amZugWesen(zustand);
    if (dran && dran.id === id) return beenden();
  }
  return ereignisse;
}

/* ── Eine Tiefe hinab ──────────────────────────────────────────────*/

/* Ein neuer Zustand, keine Umschreibung des alten: Der alte bleibt
   gültig und vergleichbar. Was die Jäger behalten, steht in der
   Kopfnotiz — Lebenspunkte, Fähigkeiten, Waffe, Tränke. Was sie
   verlieren, sind die Wirkungen: Ein Brand, den man eine Treppe
   hinunterträgt, wäre eine Strafe ohne Ort. */
export function naechsteTiefe(zustand) {
  if (!zustand || !zustand.karte) throw new Error("naechsteTiefe: ohne Zustand geht nichts");
  const tiefe = zustand.tiefe + 1;
  const spielerZahl = zustand.spieler.length;
  const karte = baueLandschaft({
    saat: saatFuerTiefe(zustand.saat, tiefe),
    breite: zustand.karte.breite,
    hoehe: zustand.karte.hoehe,
    tiefe,
    spielerZahl
  });

  const neu = {
    saat: zustand.saat,
    tiefe,
    karte,
    /* Derselbe Strom, nicht ein neuer: Ein frischer bei jeder Ebene
       würfelte in Ebene 2 dieselben Zahlen wie in Ebene 1. */
    zufall: zustand.zufall,
    wesen: [],
    nachId: new Map(),
    runde: 1,
    ordnung: [],
    amZug: 0,
    seiteDran: SEITE_JAEGER,
    spieler: zustand.spieler.map((s) => ({ ...s })),
    vorbei: null,
    protokoll: zustand.protokoll.slice(),
    ereignisse: []
  };

  let platz = 0;
  for (const alt of zustand.wesen) {
    if (alt.seite !== SEITE_JAEGER) continue;
    /* Ein Startfeld je Platz — `baueLandschaft` hat für genau so viele
       gesorgt. Fehlt eines, ist etwas grundlegend schief, und zwei
       Jäger auf einem Feld wären ein stiller Folgefehler. */
    const start = karte.starts[platz];
    if (!start) throw new Error(`naechsteTiefe: kein Startfeld für Jäger ${alt.id}`);
    platz += 1;
    neu.wesen.push(jaegerHinab(alt, start));
  }
  neuIndex(neu);

  setzeGegner(neu);
  neu.ereignisse = starteRunde(neu);
  return neu;
}

function jaegerHinab(alt, start) {
  const wesen = { ...alt };
  wesen.x = start.x;
  wesen.y = start.y;
  wesen.faehigkeiten = alt.faehigkeiten.slice();
  wesen.wirkungen = [];
  wesen.wacht = false;
  wesen.lebt = true;
  wesen.lp = alt.lebt && alt.lp > 0
    ? alt.lp
    : Math.max(1, Math.floor(alt.lpMax / WIEDER_AUF_TEILER));
  wesen.ap = alt.apMax;
  return wesen;
}

/* ── Die eine Zahl ─────────────────────────────────────────────────

   FNV-1a, byteweise, rein ganzzahlig — dieselbe Bauart wie
   `karte.summe()`. Kein Gleitkomma-Zwischenschritt, der sich zwischen
   zwei Browsern unterscheiden könnte. */

const FNV_ANFANG = 0x811c9dc5;
const FNV_PRIM = 0x01000193;

/* Eine Marke je Wertart, damit die Zahl 1, der Text „1" und das Wahr
   nicht dieselbe Summe geben. Ohne sie fiele ein Fehler, der eine
   Zahl in einen Text verwandelt, nicht auf. */
const MARKE = { nichts: 0, wahr: 1, falsch: 2, ganz: 3, bruch: 4, text: 5, liste: 6, bund: 7 };

/* Bis hierher trägt eine ganze Zahl vier Bytes verlustfrei. Alles
   darüber (und alles Gebrochene) geht als Text hinein: `zahl | 0`
   schneidet oben ab, und dann hätten +2³¹ und −2³¹ dieselbe Summe. */
const GANZ_UNTEN = -0x80000000;
const GANZ_OBEN = 0x7fffffff;

function byteHinein(h, byte) {
  return Math.imul(h ^ (byte & 0xff), FNV_PRIM) >>> 0;
}

function zahlHinein(h, zahl) {
  const g = zahl | 0;
  h = byteHinein(h, g);
  h = byteHinein(h, g >>> 8);
  h = byteHinein(h, g >>> 16);
  return byteHinein(h, g >>> 24);
}

function textHinein(h, text) {
  h = zahlHinein(h, text.length);
  for (let i = 0; i < text.length; i++) {
    const zeichen = text.charCodeAt(i);
    h = byteHinein(h, zeichen);
    h = byteHinein(h, zeichen >>> 8);
  }
  return h;
}

/* Beliebige Werte, in fester Ordnung. Die Schlüssel eines Bündels
   werden **sortiert** durchlaufen: Sonst hinge die Summe daran, in
   welcher Reihenfolge jemand die Felder angelegt hat, und zwei
   Rechner mit demselben Wesen bekämen zwei Zahlen.

   Dass hier nichts aufgezählt wird, ist Absicht: Wer einem Wesen ein
   Feld anhängt, hängt es damit in die Summe. Eine Liste der Felder an
   dieser Stelle wäre eine zweite Wahrheit über den Zustand — und sie
   würde beim ersten neuen Feld still veralten. */
function wertHinein(h, wert) {
  if (wert === null || wert === undefined) return byteHinein(h, MARKE.nichts);
  if (typeof wert === "boolean") return byteHinein(h, wert ? MARKE.wahr : MARKE.falsch);
  if (typeof wert === "number") {
    if (Number.isInteger(wert) && wert >= GANZ_UNTEN && wert <= GANZ_OBEN) {
      return zahlHinein(byteHinein(h, MARKE.ganz), wert);
    }
    return textHinein(byteHinein(h, MARKE.bruch), String(wert));
  }
  if (typeof wert === "string") return textHinein(byteHinein(h, MARKE.text), wert);
  if (Array.isArray(wert)) {
    h = zahlHinein(byteHinein(h, MARKE.liste), wert.length);
    for (const eintrag of wert) h = wertHinein(h, eintrag);
    return h;
  }
  if (typeof wert === "object") {
    const schluessel = Object.keys(wert).sort();
    h = zahlHinein(byteHinein(h, MARKE.bund), schluessel.length);
    for (const s of schluessel) {
      h = textHinein(h, s);
      h = wertHinein(h, wert[s]);
    }
    return h;
  }
  throw new Error(`zustandsSumme: ${typeof wert} gehört nicht in den Spielzustand`);
}

export function zustandsSumme(zustand) {
  if (!zustand || !zustand.karte) throw new Error("zustandsSumme: ohne Zustand geht nichts");
  let h = FNV_ANFANG;
  /* Eine Marke für die Bauart der Summe. Ändert jemand, was hineinkommt,
     ändert sich jede Zahl — und zwei Rechner mit verschiedenen Fassungen
     des Spiels merken es sofort statt nach zwanzig Runden. */
  h = textHinein(h, "hatred-lauf-1");
  h = zahlHinein(h, zustand.saat >>> 0);
  h = zahlHinein(h, zustand.tiefe);
  h = zahlHinein(h, zustand.runde);
  h = zahlHinein(h, zustand.amZug);
  h = wertHinein(h, zustand.seiteDran);
  h = wertHinein(h, zustand.vorbei);
  h = wertHinein(h, zustand.ordnung);

  const karte = zustand.karte;
  h = zahlHinein(h, karte.summe());
  h = wertHinein(h, karte.lichter);
  h = wertHinein(h, karte.starts);
  h = wertHinein(h, karte.ausgang);

  h = zahlHinein(h, zustand.wesen.length);
  for (const wesen of zustand.wesen) h = wertHinein(h, wesen);
  return h >>> 0;
}

/* ── Was gerade los ist ────────────────────────────────────────────

   Für die Anzeige und für Prüfungen: vier Zahlen, keine Meinung. */
export function zusammenfassung(zustand) {
  let lebendeJaeger = 0;
  let lebendeBrut = 0;
  for (const w of (zustand && zustand.wesen) || []) {
    if (!lebendig(w)) continue;
    if (w.seite === SEITE_JAEGER) lebendeJaeger += 1;
    else if (w.seite === SEITE_BRUT) lebendeBrut += 1;
  }
  return {
    runde: zustand ? zustand.runde : 0,
    lebendeJaeger,
    lebendeBrut,
    tiefe: zustand ? zustand.tiefe : 0
  };
}
