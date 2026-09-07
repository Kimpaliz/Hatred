/* [Aufgabe: Regelkern] Die sechs Heldenklassen — Vorlagen für die
   Figuren, die die Spieler führen.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Eine Klasse ist hier eine Vorlage, kein Wesen. Aus ihr baut
   `spiel/lauf.mjs` beim Start ein `wesen` (die Form steht im
   Schnittstellenvertrag). Der Unterschied ist wichtig: Die Vorlage
   liegt fest und ist auf allen vier Rechnern dieselbe; das Wesen
   ändert sich in jeder Runde. Wer beides vermischt, hat nach zwanzig
   Runden vier verschiedene Vorlagen.

   **Warum sechs Klassen für ein bis vier Spieler.** Vier Spieler und
   vier Klassen hieße: einmal spielen, alles gesehen. Sechs heißt, dass
   auch bei voller Truppe zwei Klassen fehlen — es gibt einen Grund,
   noch einmal anzufangen. Mehr wären es nicht wert: Jede Klasse muss
   sich in einem Satz erklären lassen, sonst wählt niemand bewusst.

   **Warum sie sich nicht nur in Zahlen unterscheiden dürfen.** Ein
   Katalog, in dem alle dasselbe tun und nur andere Werte haben, spielt
   sich sechsmal gleich. Deshalb hat jede Klasse **einen Satz, der nur
   auf sie zutrifft**:

   · Späher — sieben Punkte und `satzsprung`: die einzige Figur, die
     ohne Rampe eine Ebene hinaufkommt. Er erschließt die Höhen.
   · Schildträger — Rüstung 3, aber nur fünf Punkte: die Figur, die
     stehenbleibt. Mit `wuchtstoss` und dem Kriegshammer schiebt er
     andere über Kanten, statt sie totzuschlagen.
   · Flammenpriester — Fernwaffe **und** Licht. In einem Kerker, in dem
     Dunkelheit vor Beschuss schützt (`spiel/licht.mjs`), macht er
     Ziele überhaupt erst beschießbar.
   · Grabräuber — leise und `grabgriff`: die einzige Figur, die Truhen
     und Särge aufbekommt, ohne sie zu zerschlagen.
   · Bluthexer — `blutzoll` und `blutbund` zahlen beide aus seinen
     eigenen Lebenspunkten. Er hat die meisten LP der Nicht-Panzer und
     gibt sie freiwillig aus; seine Lebensleiste ist seine Munition.
   · Bogenschützin — trifft von oben nicht nur besser (das tut jeder,
     `spiel/hoehen.mjs`), sondern **ein Feld weiter als jeder andere**.
     Ihr Platz ist das Plateau, und sie muss erst hinauf.

   **Warum `eigenheit` und nicht noch mehr Zahlen.** Zwei dieser Sätze
   lassen sich nicht als Wert ausdrücken — „bekommt Truhen auf" ist
   keine Rüstung. Sie stehen als `eigenheit` da: `null`, wo Zahlen und
   Fähigkeiten die Klasse schon tragen, sonst `{art, …}`. Ein Modul,
   das die Eigenheit nicht kennt, überliest sie und spielt die Klasse
   trotzdem richtig, nur ohne ihren Sonderfall — das ist der Grund für
   ein eigenes Feld statt eines Sonderwegs mitten in den Zahlen.

   **Warum `apMax` zwischen 5 und 7 liegt.** Der Grundwert ist 6
   (`AP_JE_ZUG`), und 6 teilt sich durch 2 und 3 — also drei Hiebe mit
   einer 2-AP-Waffe oder zwei mit einer 3-AP-Waffe, ohne Rest. 5 und 7
   sind die Abweichungen, die man **spürt**: Mit 5 wird aus zwei
   Hieben ein Hieb und zwei Schritte, mit 7 bleibt nach zwei Hieben ein
   Schritt übrig. 4 oder 8 wären keine Abweichung mehr, sondern eine
   andere Klasse von Spiel.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/katalog/waffen.mjs` (`startWaffe` ist ein Schlüssel von
   dort), `spiel/katalog/faehigkeiten.mjs` (die zwei Schlüssel je
   Klasse), `spiel/lauf.mjs` (baut daraus Wesen), `spiel/zuege.mjs`
   (`flinkheit` bestimmt die Zugreihenfolge), `spiel/sicht.mjs`
   (`sicht`), `werkzeuge/pruefe-katalog.mjs` (prüft, dass jeder
   genannte Schlüssel wirklich existiert). */

/* Feste Reihenfolge — sie ist zugleich die Reihenfolge in der
   Klassenwahl. Angehängt wird **unten** (Fehlerbuch B2). */
export const HELDEN = [
  {
    schluessel: "spaeher",
    name: "Späher",
    zier: "Vorn, wo niemand sonst hinwill, und schon wieder weg.",
    lpMax: 18,
    apMax: 7,
    flinkheit: 9,
    ruestung: 0,
    sicht: 10,
    startWaffe: "wurfmesser",
    faehigkeiten: ["satzsprung", "weitblick"],
    eigenheit: null
  },
  {
    schluessel: "schildtraeger",
    name: "Schildträger",
    zier: "Er steht im Gang, und der Gang gehört ihm.",
    lpMax: 34,
    apMax: 5,
    flinkheit: 3,
    ruestung: 3,
    sicht: 6,
    startWaffe: "kriegshammer",
    faehigkeiten: ["wuchtstoss", "schildwall"],
    eigenheit: null
  },
  {
    schluessel: "flammenpriester",
    name: "Flammenpriester",
    zier: "Er bringt Licht in die Tiefe, und die Tiefe hasst ihn dafür.",
    lpMax: 22,
    apMax: 6,
    flinkheit: 5,
    ruestung: 1,
    sicht: 8,
    startWaffe: "feuerkelch",
    faehigkeiten: ["flammenruf", "brandmal"],
    eigenheit: null
  },
  {
    schluessel: "grabraeuber",
    name: "Grabräuber",
    zier: "Er kam nicht, um zu kämpfen. Er kam wegen der Truhen.",
    lpMax: 20,
    apMax: 6,
    flinkheit: 8,
    ruestung: 1,
    sicht: 8,
    startWaffe: "rostdolch",
    faehigkeiten: ["grabgriff", "schattenschritt"],
    eigenheit: { art: "truhenmeister", leise: true }
  },
  {
    schluessel: "bluthexer",
    name: "Bluthexer",
    zier: "Was er wirkt, bezahlt er selbst — und er zahlt gern.",
    lpMax: 28,
    apMax: 6,
    flinkheit: 4,
    ruestung: 0,
    sicht: 7,
    startWaffe: "knochensichel",
    faehigkeiten: ["blutzoll", "blutbund"],
    eigenheit: null
  },
  {
    schluessel: "bogenschuetzin",
    name: "Bogenschützin",
    zier: "Von hoch oben ist der ganze Saal nur ein langer Schuss.",
    lpMax: 20,
    apMax: 6,
    flinkheit: 7,
    ruestung: 1,
    sicht: 9,
    startWaffe: "langbogen",
    faehigkeiten: ["hakenkette", "pechfessel"],
    eigenheit: { art: "hoehenschuetze", reichweiteMehr: 1 }
  }
];

const NACH_SCHLUESSEL = new Map(HELDEN.map((h) => [h.schluessel, h]));

/* Wirft bei unbekanntem Schlüssel — ein falscher Klassenname im
   Netzpaket soll die Sitzung sofort abbrechen und nicht stumm eine
   Figur ohne Werte auf die Karte stellen. */
export function held(schluessel) {
  const h = NACH_SCHLUESSEL.get(schluessel);
  if (!h) throw new Error(`Unbekannte Heldenklasse: "${schluessel}"`);
  return h;
}

export function kenntHeld(schluessel) {
  return NACH_SCHLUESSEL.has(schluessel);
}

/* Die Schlüssel in Katalogreihenfolge — für die Klassenwahl und für
   Prüfungen, die über alle Klassen laufen wollen. */
export function heldenSchluessel() {
  return HELDEN.map((h) => h.schluessel);
}
