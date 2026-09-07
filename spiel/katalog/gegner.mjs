/* [Aufgabe: Regelkern] Die zehn Gegnerarten der Brut — Vorlagen,
   Punktekosten und die gesäte Auswahl je Kerkertiefe.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Auch ein Gegner ist hier eine Vorlage, kein Wesen: feste Zahlen, ein
   Waffenschlüssel, ein Verhaltenswort. **Wie** sich ein `stuermer`
   benimmt, entscheidet `spiel/gegner-ki.mjs` — hier steht nur, dass er
   einer ist. Sonst stünde ein Stück Entscheidung in jeder der zehn
   Vorlagen, und der Netz-Koop hätte zehn Stellen, an denen zwei
   Rechner verschiedener Meinung sein können.

   ── Warum die Kosten gerechnet und nicht geschrieben werden ─────────

   Eine Vorlage trägt **keine** Zahl „kostet 24". Eine solche Zahl
   veraltet lautlos: Wer dem Rammbock zehn Lebenspunkte gibt, würde die
   24 nicht anfassen, und der Kerker wäre ab da zu leicht. `kosten()`
   rechnet sie aus denselben Werten aus, die auch im Kampf gelten —
   Leben, Rüstung, Punkte, Fähigkeiten, Waffenschaden. Ganzzahlig,
   damit über die Leitung keine Gleitkommazahl geht (Fehlerbuch B3):
   Der Waffenanteil kommt aus `schadenDoppelt` und wird halbiert
   **nachdem** er ganzzahlig war.

   ── Warum das Gewicht von der Tiefe abhängt ─────────────────────────

   Mit festen Gewichten sähe der zehnte Kerker aus wie der erste, nur
   voller: Der Krätzling hat das höchste Gewicht und bliebe es. Deshalb
   bekommt jede Art ein **Fenster** um ihre `abTiefe`: In der Tiefe,
   in der sie zuerst auftaucht, zählt ihr Gewicht zwölffach, je Tiefe
   darunter drei Stufen weniger (`gewichtBei`).

   **Warum das Fenster nicht auf eins fällt, sondern auf `abTiefe`.**
   Mit einer Untergrenze von 1 kippt der Kerker in großer Tiefe zurück
   auf die nackten Grundgewichte — und dort steht der Krätzling wieder
   ganz oben. Gemessen mit Untergrenze 1: Tiefe 4 gaben 16,0 % späte
   Brut, Tiefe 8 gaben 35,3 %, Tiefe 12 wieder 15,8 %; der zwölfte
   Kerker sah aus wie der vierte. Mit `abTiefe` als Untergrenze bleibt
   der Anteil oben: 16,0 % · 49,4 % · 35,7 % für die Tiefen 4 · 6 · 12.
   `werkzeuge/pruefe-katalog.mjs` rechnet genau diesen Rückfall nach —
   ohne die Prüfung fiele er niemandem auf, weil das Spiel weiterläuft,
   nur langweiliger.

   Gerechnet wird ausschließlich in ganzen Zahlen, und ausgewählt wird
   aus `zufall.nachGewicht` — demselben gesäten Strom, den alle vier
   Rechner haben. Nichts hier fragt eine Uhr oder `Math.random`.

   ── Wer im Dunkeln lauert, wer stößt, wer aus der Ferne wirkt ───────

   Drei Rollen muss die Brut abdecken, sonst spielt das Gelände nicht
   mit: Der **Rammbock** stößt (Kriegshammer und `wuchtstoss`) — er ist
   der Grund, nicht an der Kante zu stehen. Der **Dunkelweber** lauert
   im Unbeleuchteten, wo `spiel/licht.mjs` ihn vor Beschuss schützt.
   Der **Aschemagier** wirkt aus der Ferne und zwingt die Truppe, den
   Saal zu queren, statt in der Tür zu warten.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/katalog/waffen.mjs` (`waffe` ist ein Schlüssel von dort, und
   `schadenDoppelt` geht in die Kosten ein),
   `spiel/katalog/faehigkeiten.mjs` (die genannten Schlüssel),
   `spiel/zufall.mjs` (`nachGewicht`), `spiel/gegner-ki.mjs` (liest
   `verhalten`), `spiel/lauf.mjs` (ruft `waehleGegner` mit dem Budget
   der Tiefe), `werkzeuge/pruefe-katalog.mjs`. */

import { waffe, schadenDoppelt } from "./waffen.mjs";

/* Die Verhaltensworte. `spiel/gegner-ki.mjs` macht daraus Züge; hier
   steht nur, welche es gibt, damit ein Tippfehler auffällt statt einen
   Gegner ratlos stehen zu lassen. */
export const VERHALTEN = [
  "stuermer",    /* rennt auf das nächste Ziel zu und schlägt         */
  "schuetze",    /* hält Abstand, sucht Höhe, schießt                 */
  "lauerer",     /* bleibt im Dunkeln, schlägt aus dem Rücken zu      */
  "schwarm",     /* viele, billig, umgehen statt durchbrechen         */
  "hauptmann",   /* zäh, ruft andere heran, gibt nicht nach           */
  "speier"       /* speit über die Entfernung, weicht dem Nahkampf    */
];

/* Feste Reihenfolge, nach `abTiefe` gestaffelt. Angehängt wird
   **unten** (Fehlerbuch B2) — die Auswahl geht diese Liste in genau
   dieser Folge durch, und zwei Rechner müssen dieselbe Folge sehen. */
export const GEGNER = [
  {
    schluessel: "kraetzling",
    name: "Krätzling",
    zier: "Kniehoch, zu viele Zähne, und nie kommt nur einer.",
    lpMax: 8,
    apMax: 6,
    flinkheit: 9,
    ruestung: 0,
    sicht: 5,
    waffe: "rostdolch",
    verhalten: "schwarm",
    abTiefe: 1,
    gewicht: 36,
    faehigkeiten: []
  },
  {
    schluessel: "grubenhund",
    name: "Grubenhund",
    zier: "Blind geboren, doch er hört dein Herz zwei Gänge weit.",
    lpMax: 14,
    apMax: 7,
    flinkheit: 10,
    ruestung: 0,
    sicht: 6,
    waffe: "hetzerbiss",
    verhalten: "stuermer",
    abTiefe: 1,
    gewicht: 26,
    faehigkeiten: []
  },
  {
    schluessel: "knochendiener",
    name: "Knochendiener",
    zier: "Er dient noch immer, obwohl der Herr seit hundert Jahren still ist.",
    lpMax: 16,
    apMax: 5,
    flinkheit: 3,
    ruestung: 1,
    sicht: 6,
    waffe: "knochensichel",
    verhalten: "stuermer",
    abTiefe: 1,
    gewicht: 24,
    faehigkeiten: []
  },
  {
    schluessel: "bogenschinder",
    name: "Bogenschinder",
    zier: "Er sucht sich das Podest, bevor er sich ein Ziel sucht.",
    lpMax: 15,
    apMax: 6,
    flinkheit: 6,
    ruestung: 1,
    sicht: 9,
    waffe: "kurzbogen",
    verhalten: "schuetze",
    abTiefe: 2,
    gewicht: 20,
    faehigkeiten: []
  },
  {
    schluessel: "kettenwicht",
    name: "Kettenwicht",
    zier: "Die Kette kommt aus dem Dunkeln, und das Podest ist plötzlich leer.",
    lpMax: 18,
    apMax: 6,
    flinkheit: 7,
    ruestung: 1,
    sicht: 8,
    waffe: "rostdolch",
    verhalten: "lauerer",
    abTiefe: 2,
    gewicht: 18,
    faehigkeiten: ["hakenkette"]
  },
  {
    schluessel: "pechspeier",
    name: "Pechspeier",
    zier: "Ein aufgedunsener Sack, der lieber spuckt als geht.",
    lpMax: 20,
    apMax: 5,
    flinkheit: 4,
    ruestung: 2,
    sicht: 7,
    waffe: "gallenspucke",
    verhalten: "speier",
    abTiefe: 3,
    gewicht: 16,
    faehigkeiten: ["pechfessel"]
  },
  {
    schluessel: "rammbock",
    name: "Rammbock",
    zier: "Er schlägt dich nicht tot. Er schlägt dich über die Kante.",
    lpMax: 30,
    apMax: 6,
    flinkheit: 5,
    ruestung: 2,
    sicht: 6,
    waffe: "kriegshammer",
    verhalten: "stuermer",
    abTiefe: 3,
    gewicht: 14,
    faehigkeiten: ["wuchtstoss"]
  },
  {
    schluessel: "dunkelweber",
    name: "Dunkelweber",
    zier: "Er wohnt in dem Stück Gang, das die Fackel nicht erreicht.",
    lpMax: 24,
    apMax: 6,
    flinkheit: 8,
    ruestung: 1,
    sicht: 10,
    waffe: "knochensichel",
    verhalten: "lauerer",
    abTiefe: 4,
    gewicht: 12,
    faehigkeiten: ["schattenschritt", "pechfessel"]
  },
  {
    schluessel: "aschemagier",
    name: "Aschemagier",
    zier: "Was von ihm brennt, brennt weiter, auch wenn er längst tot ist.",
    lpMax: 22,
    apMax: 6,
    flinkheit: 4,
    ruestung: 1,
    sicht: 9,
    waffe: "feuerkelch",
    verhalten: "schuetze",
    abTiefe: 5,
    gewicht: 10,
    faehigkeiten: ["brandmal", "flammenruf"]
  },
  {
    schluessel: "blutvogt",
    name: "Blutvogt",
    zier: "Er hält Gericht über alles, was die Treppe hinabgestiegen ist.",
    lpMax: 46,
    apMax: 6,
    flinkheit: 5,
    ruestung: 3,
    sicht: 8,
    waffe: "richtschwert",
    verhalten: "hauptmann",
    abTiefe: 6,
    gewicht: 7,
    faehigkeiten: ["wuchtstoss", "blutzoll"]
  }
];

const NACH_SCHLUESSEL = new Map(GEGNER.map((g) => [g.schluessel, g]));

export function gegner(schluessel) {
  const g = NACH_SCHLUESSEL.get(schluessel);
  if (!g) throw new Error(`Unbekannte Gegnerart: "${schluessel}"`);
  return g;
}

export function kenntGegner(schluessel) {
  return NACH_SCHLUESSEL.has(schluessel);
}

/* ── Die Punktekosten ──────────────────────────────────────────────
   Die Gewichte der fünf Anteile sind gewählt, nicht gemessen — aber
   sie sind **begründet**: Rüstung zählt dreifach, weil sie von jedem
   einzelnen Treffer abgeht und sich damit über eine ganze Schlacht
   vervielfacht; Lebenspunkte zählen nur ein Viertel, weil sie linear
   verrechnet werden. Eine Fähigkeit kostet drei, ungefähr so viel wie
   eine Rüstungsstufe — sie wirkt seltener, dafür stärker. */
export const KOSTEN_JE_RUESTUNG = 3;
export const KOSTEN_JE_FAEHIGKEIT = 3;
export const KOSTEN_LP_TEILER = 4;

export function kosten(vorlage) {
  const ausLeben = Math.ceil(vorlage.lpMax / KOSTEN_LP_TEILER);
  const ausWaffe = Math.floor(schadenDoppelt(waffe(vorlage.waffe)) / 2);
  return ausLeben
    + vorlage.ruestung * KOSTEN_JE_RUESTUNG
    + vorlage.apMax
    + vorlage.faehigkeiten.length * KOSTEN_JE_FAEHIGKEIT
    + ausWaffe;
}

/* ── Das Tiefenfenster ─────────────────────────────────────────────
   Zwölffach in der Tiefe, in der eine Art zuerst auftaucht, je Tiefe
   darunter drei Stufen weniger — aber nie unter ihre eigene `abTiefe`.
   Diese Untergrenze ist der ganze Trick: Sie hält späte Brut in großer
   Tiefe oben, statt den Kerker auf die Grundgewichte zurückfallen zu
   lassen (siehe Kopfnotiz). Ganze Zahlen — das Ergebnis geht in
   `nachGewicht`, und dort entscheidet ein Vergleich über die Auswahl. */
export const FENSTER_HOCH = 12;
export const FENSTER_VERFALL = 3;

export function gewichtBei(vorlage, tiefe) {
  if (tiefe < vorlage.abTiefe) return 0;
  const gefallen = FENSTER_HOCH - FENSTER_VERFALL * (tiefe - vorlage.abTiefe);
  return vorlage.gewicht * Math.max(vorlage.abTiefe, gefallen);
}

/* Alle Arten, die in dieser Tiefe überhaupt vorkommen dürfen — in
   Katalogreihenfolge, damit zwei Rechner dieselbe Liste bekommen. */
export function gegnerBisTiefe(tiefe) {
  return GEGNER.filter((g) => g.abTiefe <= tiefe);
}

/* Wie viele Gegner eine Auswahl höchstens hat. Kein Spielwert, ein
   Riegel: Sollte je eine Vorlage mit Kosten 0 entstehen, liefe die
   Schleife sonst ewig — und zwar auf allen vier Rechnern gleichzeitig. */
export const HOECHSTENS_GEGNER = 40;

/* ── Die Auswahl ───────────────────────────────────────────────────

   Füllt ein Punktebudget, indem sie wiederholt eine Art zieht, die
   noch hineinpasst. Zwei Eigenschaften sind hier wichtiger als jede
   Feinabstimmung:

   1. **Gleichlauf.** Gezogen wird ausschließlich aus dem gereichten
      Strom, und zwar aus einer Liste, die in Katalogreihenfolge
      entsteht. Derselbe Strom und dieselbe Tiefe geben dieselbe Folge
      von Schlüsseln — sonst stünden auf vier Rechnern verschiedene
      Gegner im selben Saal.
   2. **Der Rest zählt.** Gezogen wird nur aus dem, was noch ins
      Restbudget passt. Damit endet die Auswahl von selbst und füllt
      den Rest mit billiger Brut auf, statt einen halben Blutvogt
      hinzustellen.

   Gibt eine neue Liste zurück; die Vorlagen darin sind dieselben
   Objekte wie in `GEGNER` und dürfen **nicht** verändert werden —
   `spiel/lauf.mjs` baut daraus Wesen, die Vorlage bleibt Vorlage. */
export function waehleGegner(zufall, tiefe, budget) {
  const wahl = [];
  const erlaubt = gegnerBisTiefe(tiefe);
  if (erlaubt.length === 0) return wahl;

  let rest = budget;
  while (wahl.length < HOECHSTENS_GEGNER) {
    const passend = [];
    const gewichte = [];
    for (const g of erlaubt) {
      const preis = kosten(g);
      if (preis <= rest) {
        passend.push(g);
        gewichte.push(gewichtBei(g, tiefe));
      }
    }
    if (passend.length === 0) break;
    const gezogen = zufall.nachGewicht(passend, gewichte);
    if (!gezogen) break;
    wahl.push(gezogen);
    rest -= kosten(gezogen);
  }
  return wahl;
}
