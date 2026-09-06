/* [Aufgabe: Regelkern] Die vierzehn Waffen — reine Daten und ihr Nachschlagewerk.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Eine Waffe ist in diesem Spiel kein Verhalten, sondern ein Zettel mit
   Zahlen. Das Verhalten steht genau einmal in `spiel/kampf.mjs`. Der
   Grund ist der Netz-Koop: Über die Leitung geht die Aktion „Wesen 3
   greift Wesen 7 an", und jeder der vier Rechner rechnet sie selbst
   aus. Läge auch nur ein Stück Trefferrechnung in der Waffe, gäbe es
   vierzehn Stellen, an denen sie auseinanderlaufen kann, statt einer.

   **Warum Würfel und nicht eine feste Zahl.** `{anzahl, seiten,
   festwert}` trennt Spannweite von Verlässlichkeit: `2d4` und `1d8`
   haben denselben Mittelwert 4,5, aber das Beilpaar streut eng und die
   Knochensichel weit. Genau daraus entsteht die Wahl zwischen einer
   Waffe, auf die man sich verlassen kann, und einer, die einen
   vollen Treffer landen *kann*. Gewürfelt wird ganzzahlig aus dem
   gesäten Strom (`spiel/zufall.mjs`), nie aus `Math.random`.

   **Warum die Kurve ehrlich sein muss.** Wenn eine Waffe eine andere in
   *jeder* Zahl schlägt, gibt es keine Entscheidung mehr, nur noch eine
   richtige Antwort — und dreizehn Zettel Zierde. Deshalb gilt hier
   hart: mehr Schaden kostet mehr Aktionspunkte **oder** Treffergrund,
   und keine Waffe schlägt eine andere derselben Art in Mindestschaden,
   Höchstschaden, Mittelwert, Treffergrund, Preis *und* Reichweite
   zugleich. `werkzeuge/pruefe-katalog.mjs` rechnet beides nach — von
   Hand fällt so etwas beim vierzehnten Eintrag niemandem mehr auf.

   **Warum Nahwaffen sich mehr lohnen.** Erwarteter Schaden je
   Aktionspunkt liegt im Nahkampf spürbar höher als in der Ferne. Das
   ist der Preis der Reichweite: Wer aus acht Feldern schießt, wird
   nicht zurückgeschlagen. Ohne diesen Abstand wäre der Fernkampf
   schlicht die bessere Wahl und der halbe Kerker unbespielt.

   **Warum die Reichweite Schachbrett-Abstand ist.** Ein Bogen soll
   diagonal so weit tragen wie gerade (`schussweite` in
   `spiel/gitter.mjs`); mit Manhattan-Abstand hätte seine Reichweite die
   Form eines Rhombus und sähe falsch aus. Gelaufen wird trotzdem in
   vier Richtungen — das ist kein Widerspruch, sondern der Unterschied
   zwischen Gehen und Zielen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/katalog/helden.mjs` und `spiel/katalog/gegner.mjs` (nennen
   Schlüssel von hier), `spiel/kampf.mjs` (würfelt und rechnet),
   `spiel/hoehen.mjs` (`reichweitenBonus` schlägt auf `reichweite`
   auf), `werkzeuge/pruefe-katalog.mjs`. Kennt selbst niemanden. */

/* Die Schadensarten. Als Liste und nicht als lose Zeichenketten, damit
   die Prüfung eine Wahrheit hat, gegen die sie vergleichen kann — und
   damit ein Tippfehler („feur") auffällt, statt eine Waffe stumm aus
   jeder Widerstandsrechnung fallen zu lassen. */
export const SCHADENSARTEN = ["hieb", "stich", "feuer", "arkan", "gift"];

/* Die Besonderheiten. Was sie bedeuten, entscheidet `spiel/kampf.mjs`;
   hier steht nur, welche es überhaupt gibt.

   durchschlag — zieht die Rüstung des Ziels zur Hälfte ab
   flaeche2    — trifft auch die Nachbarfelder des Ziels
   brennt      — setzt das Ziel in Brand (Schaden je Zugbeginn)
   stoesst     — schiebt das Ziel ein Feld weg; über eine Kante ein Sturz
   zweifach    — zwei Trefferwürfe statt einem
   leise       — verrät die Stellung des Trägers nicht */
export const BESONDERHEITEN = [
  "durchschlag", "flaeche2", "brennt", "stoesst", "zweifach", "leise"
];

/* Feste Reihenfolge. Gespeicherte Läufe und die Gegnerauswahl tragen
   Schlüssel, keine Indizes — aber die Reihenfolge bleibt trotzdem
   stabil, damit zwei Rechner dieselbe Liste in derselben Folge
   durchgehen (Fehlerbuch B2). Wer eine Waffe anhängt, hängt sie
   **unten** an. */
export const WAFFEN = [
  /* ── Nahkampf: 2 bis 3 Aktionspunkte ───────────────────────────── */
  {
    schluessel: "rostdolch",
    name: "Rostdolch",
    art: "nah",
    ap: 2,
    wuerfel: { anzahl: 1, seiten: 4, festwert: 1 },
    reichweite: 1,
    trefferGrund: 0.85,
    schadensart: "stich",
    zier: "Braun vor Alter, doch die Spitze findet jede Naht im Wams.",
    besonderheit: "leise"
  },
  {
    schluessel: "hetzerbiss",
    name: "Hetzerbiss",
    art: "nah",
    ap: 2,
    wuerfel: { anzahl: 1, seiten: 6, festwert: 1 },
    reichweite: 1,
    trefferGrund: 0.80,
    schadensart: "hieb",
    zier: "Kein Werkzeug, ein Gebiss — und es hat noch nie losgelassen."
  },
  {
    schluessel: "knochensichel",
    name: "Knochensichel",
    art: "nah",
    ap: 2,
    wuerfel: { anzahl: 1, seiten: 8, festwert: 0 },
    reichweite: 1,
    trefferGrund: 0.72,
    schadensart: "gift",
    zier: "Aus einer Rippe geschliffen, die Schneide grün beschlagen."
  },
  {
    schluessel: "beilpaar",
    name: "Beilpaar",
    art: "nah",
    ap: 3,
    wuerfel: { anzahl: 2, seiten: 4, festwert: 0 },
    reichweite: 1,
    trefferGrund: 0.76,
    schadensart: "hieb",
    zier: "Zwei kurze Beile, geführt wie ein einziger Atemzug.",
    besonderheit: "zweifach"
  },
  {
    schluessel: "hellebarde",
    name: "Hellebarde",
    art: "nah",
    ap: 3,
    wuerfel: { anzahl: 1, seiten: 8, festwert: 1 },
    reichweite: 2,
    trefferGrund: 0.72,
    schadensart: "stich",
    zier: "Zwei Schritt Eisen zwischen dir und dem, was dich will.",
    besonderheit: "durchschlag"
  },
  {
    schluessel: "flammenzunge",
    name: "Flammenzunge",
    art: "nah",
    ap: 3,
    wuerfel: { anzahl: 1, seiten: 6, festwert: 2 },
    reichweite: 1,
    trefferGrund: 0.74,
    schadensart: "feuer",
    zier: "Die Klinge glüht dumpf und geht auch unter Wasser nicht aus.",
    besonderheit: "brennt"
  },
  {
    schluessel: "richtschwert",
    name: "Richtschwert",
    art: "nah",
    ap: 3,
    wuerfel: { anzahl: 1, seiten: 10, festwert: 2 },
    reichweite: 1,
    trefferGrund: 0.68,
    schadensart: "hieb",
    zier: "Ohne Spitze — es war nie zum Fechten gedacht, nur zum Ende."
  },
  {
    schluessel: "kriegshammer",
    name: "Kriegshammer",
    art: "nah",
    ap: 3,
    wuerfel: { anzahl: 1, seiten: 8, festwert: 3 },
    reichweite: 1,
    trefferGrund: 0.64,
    schadensart: "hieb",
    zier: "Trifft selten, doch wen er trifft, den findet man weiter unten.",
    besonderheit: "stoesst"
  },

  /* ── Fernkampf: 3 bis 4 Aktionspunkte ──────────────────────────── */
  {
    schluessel: "wurfmesser",
    name: "Wurfmesser",
    art: "fern",
    ap: 3,
    wuerfel: { anzahl: 1, seiten: 4, festwert: 1 },
    reichweite: 4,
    trefferGrund: 0.80,
    schadensart: "stich",
    zier: "Ein Handgelenk, ein Blinken, ein Umfallen — und keine Warnung.",
    besonderheit: "leise"
  },
  {
    schluessel: "kurzbogen",
    name: "Kurzbogen",
    art: "fern",
    ap: 3,
    wuerfel: { anzahl: 1, seiten: 6, festwert: 1 },
    reichweite: 7,
    trefferGrund: 0.74,
    schadensart: "stich",
    zier: "Hornbogen für enge Gänge, gespannt mit gedrehtem Darm."
  },
  {
    schluessel: "gallenspucke",
    name: "Gallenspucke",
    art: "fern",
    ap: 3,
    wuerfel: { anzahl: 1, seiten: 6, festwert: 2 },
    reichweite: 5,
    trefferGrund: 0.70,
    schadensart: "gift",
    zier: "Ein Schwall aus grünem Schlund; der Stein raucht, wo er landet."
  },
  {
    schluessel: "armbrust",
    name: "Armbrust",
    art: "fern",
    ap: 4,
    wuerfel: { anzahl: 1, seiten: 10, festwert: 1 },
    reichweite: 8,
    trefferGrund: 0.68,
    schadensart: "stich",
    zier: "Langes Spannen, kurzes Sirren — der Bolzen fragt nicht nach Panzer.",
    besonderheit: "durchschlag"
  },
  {
    schluessel: "langbogen",
    name: "Langbogen",
    art: "fern",
    ap: 4,
    wuerfel: { anzahl: 1, seiten: 8, festwert: 2 },
    reichweite: 9,
    trefferGrund: 0.66,
    schadensart: "stich",
    zier: "Mannshoch aus Eibe; von einem Podest herab trägt er den ganzen Saal."
  },
  {
    schluessel: "feuerkelch",
    name: "Feuerkelch",
    art: "fern",
    ap: 4,
    wuerfel: { anzahl: 2, seiten: 4, festwert: 3 },
    reichweite: 6,
    trefferGrund: 0.58,
    schadensart: "feuer",
    zier: "Geweihtes Öl, geschleudert aus offener Schale — es fragt nicht, wen.",
    besonderheit: "flaeche2"
  }
];

/* Nachschlagen in einem Schritt statt `find` bei jedem Treffer. Die
   Karte wird einmal beim Laden gebaut; ihre Einfügereihenfolge ist die
   von `WAFFEN` und damit auf jedem Rechner dieselbe. */
const NACH_SCHLUESSEL = new Map(WAFFEN.map((w) => [w.schluessel, w]));

/* Wirft bei unbekanntem Schlüssel, statt `undefined` weiterzureichen.
   Ein Tippfehler in einer Gegnervorlage soll beim ersten Aufruf
   auffallen und nicht drei Module später als „kann nicht lesen ap". */
export function waffe(schluessel) {
  const w = NACH_SCHLUESSEL.get(schluessel);
  if (!w) throw new Error(`Unbekannte Waffe: "${schluessel}"`);
  return w;
}

export function kenntWaffe(schluessel) {
  return NACH_SCHLUESSEL.has(schluessel);
}

/* Alle Waffen einer Art, in Katalogreihenfolge — eine frische Liste,
   damit niemand versehentlich `WAFFEN` selbst umsortiert. */
export function waffenNachArt(art) {
  return WAFFEN.filter((w) => w.art === art);
}

/* Der **doppelte** Mittelwert, ganzzahlig: `anzahl · (seiten + 1) + 2 ·
   festwert`. Doppelt, weil der halbe Punkt bei geraden Seitenzahlen
   sonst als Gleitkommazahl in die Gegnerkosten liefe — und Gleitkomma
   über die Leitung ist Fehlerbuch B3. Alles, was eine Regel
   entscheidet, rechnet mit dieser Zahl; nur Anzeige und Prüfung
   teilen sie durch zwei. */
export function schadenDoppelt(w) {
  return w.wuerfel.anzahl * (w.wuerfel.seiten + 1) + 2 * w.wuerfel.festwert;
}

export function mittlererSchaden(w) {
  return schadenDoppelt(w) / 2;
}

export function kleinsterSchaden(w) {
  return w.wuerfel.anzahl + w.wuerfel.festwert;
}

export function groessterSchaden(w) {
  return w.wuerfel.anzahl * w.wuerfel.seiten + w.wuerfel.festwert;
}
