/* [Aufgabe: Regelkern] Scotophobias Höhlenform und Hatreds taktische Höhen.

   ── Warum es das gibt ──────────────────────────────────────────────

   Die Formparameter entsprechen der Granithöhle d3460e9 bei den
   Standardwerten sector=215 und corr=1,15. Dadurch wachsen dieselben
   Räume, geschwungenen Gänge und Inseln. Erst landschaft.mjs wandelt
   das kontinuierliche Distanzfeld in ganze Hexfelder um. Wände,
   Höhen und Hallen werden an denselben Weltpositionen abgetastet.

   Die vier taktischen Höhen und Wasserbecken bleiben Hatreds Regeln;
   sie hängen nicht an Scotophobias rein optischem Oberflächenrelief.
   Der Netz-Handschlag enthält die neue Weltfassung für diese Karten.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   spiel/welt-feld.mjs wertet die Form aus, spiel/raster.mjs legt die
   Weltpunkte der Felder fest und spiel/landschaft.mjs macht die Karte
   spielbar. werkzeuge/pruefe-granit-generator.mjs hält Quellproben fest. */

export const PIXEL_JE_FELD = 16;

export const BAUART = {
  sektor: 215,
  sektorFaktor: 1.7,
  raumFaktor: 1.3,
  gangBreite: 1.15 * 2.2,
  gangSchwankung: 2.4,
  diagonal: 0,
  sackgasse: 0.40,
  hf: 0.0026,
  okt: 4,
  schwelle: 0.620,
  steil: 150,
  wf: 0.0016,
  wamp: 300,
  wf2: 0.0100,
  wamp2: 22,
  inselRaster: 120,
  inselN: 2,
  inselDichte: 0.8,
  inselMin: 8,
  inselMax: 34,
  inselLuft: 16,
  inselKante: 4,

  /* Taktische Höhen: Hatreds vier spielbare Stufen. */
  hoehenFrequenz: 0.0075, /* Wellenlänge 133 px = 8,3 Kacheln            */
  hoehenOktaven: 3,
  hoehenSchwellen: [0.385, 0.575, 0.735],

  /* Wie stark die Nähe zur Wand die Höhe anhebt. In Scotophobia liegt
     am Wandfuß Geröll; hier wird daraus eine begehbare Stufe, die sich
     an die Felsmasse anlehnt — und damit ein Grund, an der Wand
     entlangzugehen statt quer durch den Raum. */
  wandAnhebung: 0.10,
  wandAnhebungWeite: 26,  /* Bildpunkte, über die sie ausläuft           */

  /* ── Wasser ──
     Janniks Vorgabe: *„erst mal nur mit wasser und ohne gase."*
     Deshalb steht hier genau eine Flüssigkeit. Lava, Schleim und Öl
     kennt `spiel/gitter.mjs` bereits als Schlüssel, aber der Erzeuger
     setzt sie nicht — sie sind eine spätere Entscheidung, keine Lücke.

     Wasser steht in geschlossenen Senken jeder Ebene, sofern sie groß
     genug sind: Eine einzelne nasse Kachel mitten im Trockenen sieht
     nach einem Fehler aus, nicht nach einem See. */
  wasserMindestSee: 6     /* Kacheln, die eine Senke haben muss          */
};

/* Wie oft die Rückverzerrung nachrechnet. Gemessen in Scotophobia über
   6.000 × 6.000 Bildpunkte: 3 Runden lassen 20,6 px Fehler stehen,
   8 Runden 2,68 px, **12 Runden 0,53 px**. Hatred verwendet dieselbe
   Verzerrung und Iterationszahl. Die Rückrechnung läuft je Raum und
   Gangstützpunkt, nicht für jeden ausgegebenen Bildpunkt. */
export const ENTZERR_RUNDEN = 12;
