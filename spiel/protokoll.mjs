/* [Aufgabe: Netz] Eine Aktion als Text — kurz genug für die Leitung,
   verlustfrei genug für den Gleichlauf.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Über die Leitung geht **eine Aktion, kein Zustand** (Wegweiser). Ein
   ganzer Spielstand wären je Zug einige Kilobyte; eine Aktion ist ein
   Dutzend Zeichen. Alle vier Rechner rechnen daraus dieselbe
   Ereignisliste aus und vergleichen danach nur noch eine Prüfzahl
   (`spiel/lauf.mjs → zustandsSumme`).

   Damit das trägt, muss das Hin und Zurück **exakt** sein. Nicht
   „ungefähr dieselbe Aktion": Kommt beim Empfänger `ziel: null` an, wo
   der Absender `ziel: 7` gemeint hat, rechnet ein Rechner einen
   Angriff und die anderen drei einen Fehlschlag — und das Netz merkt
   es erst eine Runde später an der Prüfzahl, wenn niemand mehr sagen
   kann, welcher Rechner recht hatte.

   **Warum nicht einfach `JSON.stringify`.** Zwei Gründe, und beide
   sind hier tödlich. Erstens die Länge: `{"typ":"faehigkeit","wer":3,
   "schluessel":"blutzoll","ziel":7,"feld":null}` sind 63 Zeichen,
   dieselbe Aktion steht hier in 22. Zweitens — und das wiegt schwerer
   — nimmt JSON **jedes** Feld mit, das jemand aus Versehen an die
   Aktion gehängt hat. Ein Bild, das der Aktion für seine eigenen
   Zwecke ein `angezeigtAb` anheftet, schickte es mit, und der
   Empfänger bekäme eine Aktion, die er nie geprüft hat. Hier gehen
   **nur die fünf bekannten Felder** durch; alles andere fällt beim
   Schreiben weg, statt unbemerkt mitzureisen.

   **Warum ein fehlerhafter Text wirft, statt `null` zu geben.**
   Dieselbe Begründung wie bei `wendeAn` (Fehlerbuch E2): Ein stilles
   „nichts" hieße, dass ein Rechner die Aktion ausführt und ein anderer
   nicht. Ein Wurf bricht die Sitzung ab — laut und an der richtigen
   Stelle.

   **Warum die Felder in fester Ordnung herauskommen.** `leseAktion`
   gibt `typ, wer, ziel, schluessel, nach, feld` immer in dieser Folge.
   Damit ist der Text die **Normalform** einer Aktion: Zwei Rechner,
   die dieselbe Aktion verschieden herum gebaut haben, schreiben
   denselben Text, und `schreibeAktion(leseAktion(t)) === t` gilt
   Zeichen für Zeichen. Ohne diese Ordnung wäre schon `JSON.stringify`
   zweier gleicher Aktionen verschieden — und damit jeder Vergleich in
   einer Prüfung eine Zufallsfrage.

   **Warum ein fehlendes Feld etwas anderes ist als `null`.** Eine
   Fähigkeit auf sich selbst trägt `ziel: null` (es gibt keins), eine
   Wacht trägt gar kein `ziel` (die Frage stellt sich nicht). Beides
   kommt so zurück, wie es hineinging: `~` steht für „ausdrücklich
   nichts", ein fehlendes Stück für „gar nicht gefragt". Wer das
   zusammenwirft, bekommt bei jedem Rundlauf eine andere Aktion als die
   hineingegebene — und genau daran hängt die Prüfung.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/aktionen.mjs` (die acht Aktionsarten und ihre Felder — die
   Namen kommen von dort und werden hier nicht nachgebaut),
   `spiel/lauf.mjs` (schreibt `zustand.protokoll` damit fort),
   `netz/sitzung.mjs` (schickt und empfängt diese Zeichenketten),
   `werkzeuge/pruefe-lauf.mjs` (fährt tausend Aktionen im Kreis). */

import { AKTION } from "./aktionen.mjs";

/* Je Aktionsart ein Buchstabe. „aufheben" bekommt `h`, weil `a` schon
   beim Angriff steht — und ein zweiter Buchstabe für eine Art wäre die
   Sorte Sonderfall, die man beim Lesen übersieht. */
export const TYP_KUERZEL = {
  [AKTION.gehen]: "g",
  [AKTION.angriff]: "a",
  [AKTION.stoss]: "s",
  [AKTION.faehigkeit]: "f",
  [AKTION.trank]: "t",
  [AKTION.aufheben]: "h",
  [AKTION.wacht]: "w",
  [AKTION.zugEnde]: "e"
};

const TYP_NACH_KUERZEL = new Map();
for (const [typ, kuerzel] of Object.entries(TYP_KUERZEL)) TYP_NACH_KUERZEL.set(kuerzel, typ);

/* Die fünf Felder, die eine Aktion tragen darf, in der Ordnung, in der
   sie geschrieben und gelesen werden. `typ` steht nicht dabei — er ist
   das erste Stück und hat kein Kürzel vor sich. */
export const FELD_ORDNUNG = ["wer", "ziel", "schluessel", "nach", "feld"];

export const FELD_KUERZEL = {
  wer: "w", ziel: "z", schluessel: "s", nach: "n", feld: "f"
};

const FELD_NACH_KUERZEL = new Map();
for (const [feld, kuerzel] of Object.entries(FELD_KUERZEL)) FELD_NACH_KUERZEL.set(kuerzel, feld);

/* Die vier Zeichen, die im Text Bedeutung tragen. Sie können in keinem
   Wert vorkommen: Zahlen bestehen aus Ziffern und dem Minus, Schlüssel
   werden gegen `SCHLUESSEL_FORM` geprüft. */
const TRENNER = "|";
const FOLGE_TRENNER = ";";
const NICHTS = "~";
const PUNKT = ":";

const GANZE_ZAHL = /^-?\d+$/;
const SCHLUESSEL_FORM = /^[A-Za-z0-9_]+$/;

/* Ein Feld ist gesetzt, wenn es als eigene Eigenschaft dasteht **und**
   nicht `undefined` ist. Dieselbe Auslegung wie bei `JSON.stringify`:
   `{ziel: undefined}` ist ein Feld, das niemand gefüllt hat, kein
   ausdrückliches „nichts" (dafür steht `null`). */
function gesetzt(aktion, feld) {
  return Object.prototype.hasOwnProperty.call(aktion, feld) && aktion[feld] !== undefined;
}

function ganzeZahlText(wert, was) {
  if (!Number.isSafeInteger(wert)) {
    throw new Error(`schreibeAktion: ${was} muss eine ganze Zahl sein (${wert})`);
  }
  return String(wert);
}

function feldText(wert, was) {
  if (wert === null) return NICHTS;
  if (!wert || typeof wert !== "object") {
    throw new Error(`schreibeAktion: ${was} ist kein Feld {x, y} (${wert})`);
  }
  return `${ganzeZahlText(wert.x, `${was}.x`)}${PUNKT}${ganzeZahlText(wert.y, `${was}.y`)}`;
}

function wertText(feld, wert) {
  switch (feld) {
    case "wer":
      return ganzeZahlText(wert, "wer");
    case "ziel":
      return wert === null ? NICHTS : ganzeZahlText(wert, "ziel");
    case "schluessel": {
      if (wert === null) return NICHTS;
      if (typeof wert !== "string" || !SCHLUESSEL_FORM.test(wert)) {
        throw new Error(`schreibeAktion: schluessel trägt Zeichen, die nicht durch die `
          + `Leitung gehen ("${wert}")`);
      }
      return wert;
    }
    default:
      return feldText(wert, feld);
  }
}

/* Eine Aktion als Text. Kurz und ohne Leerzeichen — sie geht durch die
   Leitung, nicht in ein Protokollblatt. */
export function schreibeAktion(aktion) {
  if (!aktion || typeof aktion !== "object") {
    throw new Error("schreibeAktion: das ist keine Aktion");
  }
  const kuerzel = TYP_KUERZEL[aktion.typ];
  if (!kuerzel) throw new Error(`schreibeAktion: die Aktion „${aktion.typ}" gibt es nicht`);
  if (!gesetzt(aktion, "wer")) {
    throw new Error("schreibeAktion: eine Aktion ohne `wer` weiß niemand zuzuordnen");
  }

  const stuecke = [kuerzel];
  for (const feld of FELD_ORDNUNG) {
    if (!gesetzt(aktion, feld)) continue;
    stuecke.push(FELD_KUERZEL[feld] + wertText(feld, aktion[feld]));
  }
  return stuecke.join(TRENNER);
}

function leseGanzeZahl(text, was) {
  if (!GANZE_ZAHL.test(text)) {
    throw new Error(`leseAktion: ${was} ist keine ganze Zahl („${text}")`);
  }
  const zahl = Number(text);
  if (!Number.isSafeInteger(zahl)) {
    throw new Error(`leseAktion: ${was} ist zu groß für eine ganze Zahl („${text}")`);
  }
  return zahl;
}

function leseFeld(text, was) {
  if (text === NICHTS) return null;
  const stelle = text.indexOf(PUNKT);
  if (stelle < 0) throw new Error(`leseAktion: ${was} ist kein Feld „x${PUNKT}y" („${text}")`);
  return {
    x: leseGanzeZahl(text.slice(0, stelle), `${was}.x`),
    y: leseGanzeZahl(text.slice(stelle + 1), `${was}.y`)
  };
}

function leseWert(feld, text) {
  switch (feld) {
    case "wer":
      return leseGanzeZahl(text, "wer");
    case "ziel":
      return text === NICHTS ? null : leseGanzeZahl(text, "ziel");
    case "schluessel": {
      if (text === NICHTS) return null;
      if (!SCHLUESSEL_FORM.test(text)) {
        throw new Error(`leseAktion: schluessel trägt fremde Zeichen („${text}")`);
      }
      return text;
    }
    default:
      return leseFeld(text, feld);
  }
}

/* Text zurück in eine Aktion. Die Felder kommen in der Ordnung aus
   `FELD_ORDNUNG` heraus, gleichgültig, in welcher sie im Text stehen —
   damit ist die gelesene Aktion die Normalform, und zwei Rechner
   vergleichen dasselbe. */
export function leseAktion(text) {
  if (typeof text !== "string" || text === "") {
    throw new Error("leseAktion: leerer Text ist keine Aktion");
  }
  const stuecke = text.split(TRENNER);
  const typ = TYP_NACH_KUERZEL.get(stuecke[0]);
  if (!typ) throw new Error(`leseAktion: unbekannte Aktionsart „${stuecke[0]}"`);

  const roh = new Map();
  for (let i = 1; i < stuecke.length; i++) {
    const stueck = stuecke[i];
    if (stueck === "") throw new Error(`leseAktion: leeres Stück in „${text}"`);
    const feld = FELD_NACH_KUERZEL.get(stueck[0]);
    if (!feld) throw new Error(`leseAktion: unbekanntes Feld „${stueck[0]}" in „${text}"`);
    if (roh.has(feld)) throw new Error(`leseAktion: ${feld} steht zweimal in „${text}"`);
    roh.set(feld, stueck.slice(1));
  }
  if (!roh.has("wer")) throw new Error(`leseAktion: in „${text}" fehlt die Angabe „wer"`);

  const aktion = { typ };
  for (const feld of FELD_ORDNUNG) {
    if (!roh.has(feld)) continue;
    aktion[feld] = leseWert(feld, roh.get(feld));
  }
  return aktion;
}

/* Eine ganze Folge — so geht ein nachgeholter Zug über die Leitung,
   wenn ein Rechner kurz weg war. Die leere Folge ist der leere Text
   und nicht `";"`: Sonst hinge an jeder Folge ein leeres Stück, und
   `leseFolge` müsste raten, ob es dazugehört. */
export function schreibeFolge(aktionen) {
  if (!Array.isArray(aktionen)) throw new Error("schreibeFolge: das ist keine Liste");
  return aktionen.map(schreibeAktion).join(FOLGE_TRENNER);
}

export function leseFolge(text) {
  if (typeof text !== "string") throw new Error("leseFolge: das ist kein Text");
  if (text === "") return [];
  return text.split(FOLGE_TRENNER).map(leseAktion);
}
