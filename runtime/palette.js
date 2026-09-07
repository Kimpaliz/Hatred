/* [Aufgabe: Bild] Die Farben — an genau einer Stelle.

   ── Warum eine Palette und keine freien Farben ─────────────────────

   Pixelgrafik lebt von wenigen, wiederkehrenden Tönen. Wer jedes Sprite
   frei mischt, bekommt hundert Grautöne, die sich gegenseitig
   entwerten; mit einer festen Palette sieht alles aus, als käme es aus
   derselben Welt. Zugleich ist die Palette der eine Ort, an dem sich
   der ganze Stil ändern lässt.

   ── Die zwei Regeln dieser Palette ─────────────────────────────────

   1. **Dunkles ist kühl, Beleuchtetes ist warm.** Auf einem exakt von
      oben gesehenen Bild fehlt jede Perspektive — also muss die Farbe
      die Tiefe tragen. Ein Fackelkreis in Bernstein auf blauviolettem
      Stein liest sich sofort als „hier sehe ich, dort nicht".
   2. **Die Höhe hat eine eigene Helligkeitsstufe.** Ebene 0 bis 3
      bekommen vier abgestufte Grundhelligkeiten (`EBENEN_TON`). Das
      ist der einzige Weg, wie ein Bild ohne Perspektive überhaupt
      sagen kann, dass etwas höher liegt — dazu kommt die harte
      Kantenlinie in `runtime/zeichnen.js`.

   ── Warum der Fels eine Körnung braucht ────────────────────────────

   Gemessen am 07.09.2026: Von 2.608 benachbarten Wandpaaren gleicher
   Ebene trugen **2.608** exakt denselben Farbwert — 100,00 %. Eine
   Felswand war damit eine einzige lackierte Fläche, und genau daran
   sieht man einer Höhle an, dass sie gerechnet ist. `koernungsTon`
   hebt oder senkt einen Ton um wenige Rec.-709-Punkte; welche Stufe
   ein Feld bekommt, entscheidet `runtime/zeichnen.js`.

   ── Wie die Rampen entstanden sind ─────────────────────────────────

   Jede mehrstufige Rampe ist gemessen, nicht gemischt: Zwei Stufen
   müssen in der wahrgenommenen Helligkeit (Rec. 709) mindestens **24
   von 255** auseinanderliegen, sonst verschmelzen sie im verkleinerten
   Bild zu einem Klumpen. `node werkzeuge/pruefe-palette.mjs` rechnet
   das nach und schlägt an, wenn jemand einen Ton „nur ein bisschen"
   verschiebt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprite-daten.js` (die Zeichen zeigen hierher),
   `runtime/zeichnen.js`, `runtime/licht.js`, `runtime/partikel.js`.
   Kennt selbst nichts vom Spiel. */

export const FARBEN = {
  /* ── Kontur ───────────────────────────────────────────────────────
     Fast schwarz, aber blaustichig. Reines Schwarz wirkt in
     Pixelgrafik wie ein Loch im Bild. */
  kontur: "#07060c",
  konturHell: "#151221",
  leere: "#04040a",

  /* ── Stein: der Kerker ────────────────────────────────────────────
     Vier Töne, die durch die Ebenenrampe weiter aufgehellt werden. */
  stein0: "#1b1926",
  stein1: "#262333",
  stein2: "#332f42",
  stein3: "#433d54",
  steinRiss: "#121019",
  steinKante: "#5a5270",   /* die Oberkante einer Stufe, zum Licht hin */
  steinFuge: "#0d0b14",
  felsSpalt: "#211b2c",
  felsAder: "#95839f",
  stufenStein: "#a59eae",

  /* ── Platten, Kacheln, Holz, Knochenboden ─────────────────────── */
  platte0: "#2a2735",
  platte1: "#39354a",
  kachel0: "#2e2a3d",
  kachel1: "#3d3752",
  kachelZier: "#6b5a3e",
  erde0: "#251f1e",
  erde1: "#2f2725",
  holz0: "#3b2a1c",
  holz1: "#553c26",
  knochenBoden: "#4a4636",
  asche0: "#241f22",
  asche1: "#332a2c",
  rost: "#4a3a2c",

  /* ── Feuer und Licht ──────────────────────────────────────────── */
  glutTief: "#8f2d0a",
  glut: "#d94f14",
  flamme: "#ff8c2e",
  flammeHell: "#ffbe5c",
  flammeWeiss: "#ffe9b0",
  lichtWarm: "#ffae4d",

  /* ── Flüssigkeiten ────────────────────────────────────────────── */
  wasser0: "#122a3d",
  wasser1: "#1d4459",
  wasserGlanz: "#3f7d94",
  blut0: "#4a0d12",
  blut1: "#7d1c22",
  blut2: "#a92e30",
  schleim0: "#123a1e",
  schleim1: "#1f6b2e",
  schleimHell: "#4fd66a",
  lava0: "#5c1403",
  lava1: "#b83a06",
  lavaHell: "#ff9d2b",
  oel0: "#0e0c14",
  oel1: "#1c1826",

  /* ── Zauber, Beute, Anzeigen ──────────────────────────────────── */
  arkan0: "#1b2a6b",
  arkan1: "#3554c4",
  arkanHell: "#69a8ff",
  arkanWeiss: "#c9e4ff",
  gift0: "#2b1b46",
  gift1: "#6b34a8",
  giftHell: "#b070ff",
  gold0: "#6b4a10",
  gold1: "#c08c1e",
  goldHell: "#ffd863",

  /* ── Figuren: Tuch, Leder, Eisen, Haut ────────────────────────── */
  tuch0: "#1e1929",
  tuch1: "#2e263d",
  tuch2: "#413655",
  leder0: "#3a2818",
  leder1: "#5c4026",
  leder2: "#825c36",
  eisen0: "#2b2f3a",
  eisen1: "#4a505f",
  eisen2: "#6e7688",
  eisenGlanz: "#9aa3b8",
  haut0: "#7a5540",
  haut1: "#a87a58",
  haut2: "#d0a077",

  /* ── Untote und Getier ────────────────────────────────────────── */
  fleisch0: "#3c4736",
  fleisch1: "#556449",
  fleisch2: "#75876b",
  knochen0: "#6d695b",
  knochen1: "#9c9683",
  knochen2: "#cfc9b1",
  lumpen0: "#33302a",
  lumpen1: "#4a4438",
  chitin0: "#231c2e",
  chitin1: "#3d3050",
  auge: "#ff5a2e",
  augeKalt: "#7cf0ff",

  /* ── Anzeige ──────────────────────────────────────────────────── */
  hudGrund: "#0b0912",
  hudRahmen: "#3a3350",
  hudSchrift: "#cfc7e0",
  hudMatt: "#6b6383",
  hudGut: "#4fd66a",
  hudWarn: "#ffbe5c",
  hudSchlecht: "#e0403c",
  apVoll: "#ffd863",
  apLeer: "#3a3350",
  apKosten: "#ff8c2e"
};

/* ── Die Ebenenrampe ────────────────────────────────────────────────
   Womit der Boden je Höhenstufe multipliziert wird. Ebene 0 liegt im
   Graben und ist deutlich dunkler, Ebene 3 fängt das meiste Licht.

   Die Schwelle ist hier **14** von 255 und nicht 24 wie bei den
   Sprite-Rampen — weil die Lage eine andere ist: Zwei Töne innerhalb
   einer Figur stoßen ohne Trennung aneinander und brauchen deshalb den
   großen Abstand. Zwei Ebenen dagegen sind im Bild immer durch eine
   harte schwarze Schattenkante **und** eine helle Oberkante getrennt
   (`runtime/zeichnen.js`); der Helligkeitssprung ist da nur der dritte
   Hinweis. Wer die Zahl anhebt, macht Ebene 3 weiß.
   `node werkzeuge/pruefe-palette.mjs` rechnet beide Schwellen nach. */
export const EBENEN_TON = [0.55, 1.00, 1.45, 2.00];

/* Der Vorlauf greift den warmen Titel und die ruhigen Zeilen aus
   Scotophobias Menü auf. Ein eigener Satz, damit die lesbaren Farben
   im Kerker und die Höhenabstände unverändert bleiben. */
export const VORLAUF = {
  grund: "#08090b",
  flaeche: "#111113",
  aktiv: "#24201a",
  linie: "#504638",
  schrift: "#e9deca",
  titel: "#f6f2ea",
  matt: "#ab9e89",
  akzent: "#e6b878",
  gut: "#adc49a",
  warn: "#efb879"
};

/* Wie hoch eine Stufe im Bild aufträgt. Rein zeichnerisch: Bei „exakt
   von oben" gibt es keine Perspektive, also wird die Höhe durch einen
   harten Schlagschatten **nach unten** und eine helle Oberkante
   erzählt — nicht durch Versatz. Der Wert ist die Schattenhöhe in
   Bildpunkten je Stufe. */
export const STUFEN_SCHATTEN = 3;

/* ── Farben je Schlüssel ────────────────────────────────────────────
   `spiel/gitter.mjs` kennt nur Zahlen. Hier bekommen sie Farbe. Die
   Reihenfolge entspricht **genau** den Zahlen dort; `werkzeuge/
   pruefe-palette.mjs` vergleicht die Längen, damit ein neuer Boden
   nicht ohne Farbe bleibt. */
export const BODEN_FARBEN = [
  { grund: FARBEN.stein1, zweit: FARBEN.stein2, riss: FARBEN.steinRiss },   /* stein      */
  { grund: FARBEN.platte0, zweit: FARBEN.platte1, riss: FARBEN.steinFuge }, /* platte     */
  { grund: FARBEN.erde0, zweit: FARBEN.erde1, riss: FARBEN.kontur },        /* erde       */
  { grund: FARBEN.kachel0, zweit: FARBEN.kachel1, riss: FARBEN.kachelZier },/* kachel     */
  { grund: FARBEN.eisen0, zweit: FARBEN.rost, riss: FARBEN.leere },         /* gitterrost */
  { grund: FARBEN.knochenBoden, zweit: FARBEN.knochen0, riss: FARBEN.stein0 }, /* knochen */
  { grund: FARBEN.asche0, zweit: FARBEN.asche1, riss: FARBEN.glutTief },    /* asche      */
  { grund: FARBEN.holz0, zweit: FARBEN.holz1, riss: FARBEN.kontur }         /* holz       */
];

export const FLUESSIG_FARBEN = [
  null,                                                                              /* keine    */
  { tief: FARBEN.wasser0, flach: FARBEN.wasser1, glanz: FARBEN.wasserGlanz, licht: null },
  { tief: FARBEN.blut0, flach: FARBEN.blut1, glanz: FARBEN.blut2, licht: null },
  { tief: FARBEN.schleim0, flach: FARBEN.schleim1, glanz: FARBEN.schleimHell, licht: "#2fa04a" },
  { tief: FARBEN.lava0, flach: FARBEN.lava1, glanz: FARBEN.lavaHell, licht: "#ff6a14" },
  { tief: FARBEN.oel0, flach: FARBEN.oel1, glanz: FARBEN.arkan0, licht: null }
];

/* ── Lichtfarben ────────────────────────────────────────────────────
   Ein Licht ist Farbe **plus** Reichweite in Feldern plus Flackern.
   Flackern 0 heißt ruhig — Zauberlicht flackert nicht, Feuer schon. */
export const LICHT_ARTEN = {
  fackel:   { farbe: "#ff9438", weite: 6.5, flackern: 0.16 },
  feuer:    { farbe: "#ff7a1e", weite: 5.0, flackern: 0.24 },
  lava:     { farbe: "#ff5a0e", weite: 3.5, flackern: 0.10 },
  schleim:  { farbe: "#3fd45c", weite: 3.0, flackern: 0.05 },
  arkan:    { farbe: "#5c8cff", weite: 5.0, flackern: 0.00 },
  gift:     { farbe: "#a862ff", weite: 4.0, flackern: 0.03 },
  gold:     { farbe: "#ffcc4a", weite: 2.5, flackern: 0.00 },
  auge:     { farbe: "#ff4a20", weite: 2.0, flackern: 0.08 },
  blitz:    { farbe: "#dff0ff", weite: 9.0, flackern: 0.00 }
};

/* Wie hell ein Feld mindestens ist, das kein Licht erreicht. Nicht 0:
   Ein völlig schwarzes Feld nimmt dem Spieler die Karte, und dieses
   Spiel ist taktisch — man muss das Gelände sehen, auch wo man nichts
   erkennt. Erinnerte, aber unbeleuchtete Felder liegen dazwischen. */
export const GRUNDHELLE = 0.16;
export const ERINNERT_HELLE = 0.30;

/* ── Werkzeuge ──────────────────────────────────────────────────────
   Nur Rechnen, kein Zeichnen — deshalb auch aus Node prüfbar. */

export function nachRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function nachHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/* Wahrgenommene Helligkeit nach Rec. 709. Nicht (r+g+b)/3: Grün wirkt
   auf das Auge siebenmal heller als Blau, und genau daran scheitern
   Paletten, die „auf dem Papier" verschieden aussehen. */
export function helligkeit(hex) {
  const { r, g, b } = nachRGB(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function mische(hexA, hexB, teil) {
  const a = nachRGB(hexA), b = nachRGB(hexB);
  return nachHex({
    r: a.r + (b.r - a.r) * teil,
    g: a.g + (b.g - a.g) * teil,
    b: a.b + (b.b - a.b) * teil
  });
}

export function abdunkeln(hex, faktor) {
  const { r, g, b } = nachRGB(hex);
  return nachHex({ r: r * faktor, g: g * faktor, b: b * faktor });
}

/* ── Die Körnung im Fels ────────────────────────────────────────────

   Drei **Bänder** mal zwei **Zwischenstufen**. Die Drei ist keine
   Geschmackszahl: Die Dreifärbung des Sechseckgitters — `(wx − wz)`
   modulo 3 aus `alsWuerfel` in `spiel/gitter.mjs` — gibt zwei
   benachbarten Feldern **immer** verschiedene Bänder. Gemessen auf
   200 × 200 Feldern (Saat 4711): 0 von 238.402 Nachbarschaften teilen
   ein Band.
   Damit ist „nie gleich wie der Nachbar" garantiert und nicht
   gehofft. Gemessen mit einem freien Wurf über sechs Stufen statt der
   Dreifärbung: 39.346 von 238.402 Nachbarschaften gleich, also 16,5 %.
   Die zwei Zwischenstufen brechen die Regelmäßigkeit auf, damit man
   das Dreiermuster nicht als Muster liest. */
export const KOERNUNG_BAENDER = 3;
export const KOERNUNG_ZWISCHEN = 2;
export const KOERNUNG_STUFEN = KOERNUNG_BAENDER * KOERNUNG_ZWISCHEN;

/* Die ganze Spanne von der dunkelsten zur hellsten Stufe, in Rec.-709-
   Punkten von 255. Zwischen zwei Schranken eingeklemmt, beide gemessen:

   **Nach oben** darf die Körnung den Höhenabstand nicht auffressen.
   Der engste Abstand zweier Ebenen im Fels sitzt an der Wand-Flanke:
   11,65 von 255 (`node werkzeuge/pruefe-koernung.mjs` druckt ihn).
   Bei 7 bleiben davon 4,65 übrig, und die Oberseiten zweier Ebenen
   (28,43) überschneiden sich nicht einmal annähernd.

   **Nach unten** frisst die multiplizierende Lichtlage kleine
   Unterschiede auf. Gemessen am Rotkanal von `stein3` (#433d54): bei
   Lichtstufe 1/7 überlebt erst ein Abstand von 7, bei 2/7 einer von 2,
   ab 4/7 schon 1. Der Sprung zwischen zwei **Bändern** ist deshalb
   2,0 groß — er überlebt ab 2/7. Auf den Sprung kommt es an, denn
   nur er trennt Nachbarn; die Zwischenstufen liegen 1,0 auseinander
   und dürfen im Dunkeln verschmelzen.

   Die Zahl ist eine Rec.-709-Zahl und keine RGB-Zahl. Das ist hier
   dasselbe, aber nur wegen der Bauart von `koernungsTon`: Es
   verschiebt r, g und b um **denselben** Betrag, und die drei
   Rec.-709-Gewichte summieren sich zu 1 (0,2126 + 0,7152 + 0,0722).
   Wer stattdessen einen einzelnen Kanal verschöbe, träfe die Schranke
   um bis zum Vierzehnfachen daneben — über Blau (0,0722) wären 7
   Punkte RGB nur 0,5 Punkte Rec. 709. */
export const KOERNUNG_SPANNE = 7;

/* Der Bandsprung ist doppelt so groß wie der Zwischenschritt. Daraus
   ergibt sich die Spanne als 3 × 1 + 2 × 2 = 7 Schritte — der Teiler,
   mit dem `koernungsVersatz` aus der Spanne den Schritt zurückrechnet.
   So bleibt `KOERNUNG_SPANNE` die eine Zahl, an der gedreht wird. */
const BANDFAKTOR = 2;
const KOERNUNG_TEILER =
  KOERNUNG_BAENDER * (KOERNUNG_ZWISCHEN - 1) + (KOERNUNG_BAENDER - 1) * BANDFAKTOR;

/* Um wie viel eine Stufe den Ton hebt oder senkt, in Rec.-709-Punkten.
   Symmetrisch um null: Die Körnung soll den mittleren Ton der Wand
   nicht verschieben, sonst wanderte mit ihr die ganze Ebene. */
export function koernungsVersatz(stufe) {
  const s = Math.max(0, Math.min(KOERNUNG_STUFEN - 1, Math.trunc(stufe) || 0));
  const schritt = KOERNUNG_SPANNE / KOERNUNG_TEILER;
  const bandsprung = (KOERNUNG_ZWISCHEN - 1 + BANDFAKTOR) * schritt;
  const band = Math.floor(s / KOERNUNG_ZWISCHEN);
  return band * bandsprung + (s % KOERNUNG_ZWISCHEN) * schritt - KOERNUNG_SPANNE / 2;
}

/* Ein Ton in seiner Körnungsstufe. Addiert und multipliziert **nicht**:
   Ein Faktor gäbe der hellen Oberseite viel und der dunklen Flanke
   fast nichts. Gemessen: Die 5,5 %, die auf der Oberseite von Ebene 1
   (63,94) die gewünschten 3,5 Punkte ergäben, sind auf der Flanke von
   Ebene 0 (14,72) nur 0,8 Punkte — unter jeder Lichtstufe unsichtbar.
   Der Preis der Addition ist eine Spur weniger Farbigkeit in den
   hellen Stufen; bei 3,5 von 255 ist das nicht zu sehen. */
export function koernungsTon(hex, stufe) {
  const versatz = koernungsVersatz(stufe);
  const { r, g, b } = nachRGB(hex);
  return nachHex({ r: r + versatz, g: g + versatz, b: b + versatz });
}

/* Der Bodenton einer Bodenart auf einer Ebene. Die eine Stelle, an der
   Bodenart und Höhe zusammenkommen. */
export function bodenTon(bodenArt, ebene, zweit = false) {
  const satz = BODEN_FARBEN[bodenArt] || BODEN_FARBEN[0];
  const ton = zweit ? satz.zweit : satz.grund;
  return abdunkeln(ton, EBENEN_TON[Math.max(0, Math.min(EBENEN_TON.length - 1, ebene))]);
}
