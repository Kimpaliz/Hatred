/* [Aufgabe: Regelkern] Die Bauart einer Höhle — als Tabelle, nicht als
   Zahlen im Erzeuger.

   ── Woher das kommt ────────────────────────────────────────────────

   Aus Janniks eigener Engine. Sein Auftrag wörtlich: *„benutze meine
   pixelslop engine aus scotophobia, aber erst mal nur mit wasser und
   ohne gase."* Scotophobia liegt als `Kimpaliz/granithoehle`; die
   Formel steht dort in `spiel/welt-feld.mjs` und ihre Werte in
   `spiel/bauart.mjs`. Dieses Projekt übernimmt beides — die Werte
   allerdings **umgerechnet**, weil dort ein unendliches Bildpunktfeld
   erzeugt wird und hier ein begrenztes Kachelfeld.

   ── Drei Dinge übereinander, in dieser Reihenfolge ──────────────────

   1. **Das Höhlenrauschen** macht die Form: große, unförmige Kammern
      und dicke Felsmassen. Allein wäre es nicht garantiert begehbar.
   2. **Das Skelett** aus Räumen und Gängen garantiert, dass alles
      erreichbar ist. Es ist grob und liegt meist *innerhalb* der
      Rauschkammern, wo man es nicht als Gang erkennt.
   3. **Die Verzerrung** biegt die Abtaststelle, bevor 1 und 2 gelesen
      werden. Dadurch krümmen sich Gänge und Raumhüllen mit, statt als
      Röhren und Kreise erkennbar zu bleiben.

   ── Warum die Verzerrung die Begehbarkeit nicht zerstört ────────────

   Eine glatte Verzerrung ist eine stetige Verformung des Raums. Sie
   ändert die **Topologie nicht**: Was zusammenhing, hängt weiter
   zusammen, solange Amplitude mal Frequenz unter etwa 1 bleibt. In
   Scotophobia sind es 0,48 + 0,22 = 0,70. Hier liegen sie tiefer, weil
   die Karte begrenzt ist: Eine Verzerrung von 300 Bildpunkten würde
   ein 896 Bildpunkte breites Schlachtfeld um ein Drittel verschieben
   und den Rand leerfegen.

   ── Warum die Zahlen andere sind als in Scotophobia ─────────────────

   Dort ist die Welt unendlich und wird in Bildpunkten durchwandert;
   hier ist sie ein Feld von etwa 56 × 40 **Kacheln**, und eine Kachel
   ist `PIXEL_JE_FELD` Bildpunkte breit. Ein Sektor von 215 Bildpunkten
   wäre hier fast ein Viertel der Karte — es gäbe sechs Räume auf dem
   ganzen Schlachtfeld. Deshalb ist der Sektor kleiner.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   Liest nichts. Gelesen allein von `spiel/welt-feld.mjs`, das die Werte
   in die Formel einsetzt, und von `spiel/landschaft.mjs`, das daraus
   Kacheln macht. Eine Tabelle ohne Mechanik. */

/* Wie viele Bildpunkte eine Kachel breit ist. Die eine Zahl, die die
   Bildpunktwelt der Engine und das Kachelfeld dieses Spiels verbindet.
   Sie ist dieselbe wie `KACHEL` im Bildvertrag — hier steht sie noch
   einmal, weil `spiel/` nichts aus `runtime/` liest. */
export const PIXEL_JE_FELD = 16;

export const BAUART = {
  /* ── Skelett ──
     Eigenes, gröberes Raster als die Sektoren: `sektorFaktor` mal
     `sektor`. In Scotophobia war das der Ausweg aus einem Rissnetz —
     ein Raum und zwei Gänge je 215-Bildpunkt-Sektor ergaben 35
     Felsgebiete im Bild statt der vier bis sechs großen Massen der
     Vorlage. */
  sektor: 120,            /* Bildpunkte — 7,5 Kacheln                    */
  sektorFaktor: 1.7,      /* daraus 204 px = 12,75 Kacheln je Skelettzelle */
  raumFaktor: 1.3,
  gangBreite: 1.15,       /* Faktor auf die Gangbreite                   */
  gangSchwankung: 2.4,    /* wie stark ein Gang unterwegs enger und weiter wird */
  diagonal: 0.0,          /* diagonale Zusatzgänge — machen wieder ein Gitter */
  sackgasse: 0.40,        /* Anteil Skelettzellen mit einer Sackgasse    */

  /* ── Höhlenrauschen ──
     `hf` ist feiner als in Scotophobia (0,0026): Dort ist die Welt
     unendlich und eine Wellenlänge von 385 Bildpunkten fällt beim
     Durchlaufen auf. Auf einem Schlachtfeld von 896 Bildpunkten wären
     es zwei Wellen — zu wenig Abwechslung für eine Karte, die man auf
     einen Blick sieht. */
  hf: 0.0046,             /* Wellenlänge 217 px = 13,6 Kacheln           */
  okt: 4,                 /* Oktaven: wie zerklüftet der Rand ist        */
  /* Gemessen über fünf Saaten (3, 7, 11, 19, 23) auf 56 × 40 Kacheln,
     Anteil offener Kacheln bei 3 × 3 Überabtastung:
     0,620 → 59,8 % · 0,660 → 54,6 % · **0,700 → 50,1 %** · 0,740 → 47,1 %.
     Scotophobia steht auf 0,620, weil man dort eine Höhle *durchwandert*
     und Enge stört. Hier sieht man das Schlachtfeld auf einen Blick, und
     die Hälfte muss Fels sein — sonst gibt es keine Deckung, keine
     Engstelle und nichts zu umgehen. */
  schwelle: 0.700,        /* darüber offen — regelt, wie viel Hohlraum   */
  steil: 150,             /* Rauschwert → Pseudo-Distanz in Bildpunkten  */

  /* ── Verzerrung ──
     Amplitude mal Frequenz: 160 · 0,0022 = 0,352 (grob) plus
     22 · 0,0100 = 0,220 (fein) = **0,572**. Unter 1, also bleibt die
     Topologie erhalten und das Skelett darf mitverzerrt werden. */
  wf: 0.0022,
  wamp: 160,
  wf2: 0.0100,
  wamp2: 22,

  /* ── Felsinseln ──
     In Scotophobia „Erdinseln". Hier werden aus ihnen die frei
     stehenden Felsklötze und Säulen, hinter denen man Deckung nimmt —
     der taktisch wertvollste Teil einer Höhle. Sie entstehen **nicht**
     aus dem Rauschen, sondern werden gesetzt: Nur so lässt sich eine
     Mindestgröße zusichern statt erhoffen. */
  inselRaster: 90,
  inselN: 2,
  inselDichte: 0.8,
  inselMin: 9,            /* kleinster Radius — gut eine Kachel          */
  inselMax: 30,
  inselLuft: 14,          /* Mindestabstand der Insel zur Wand           */
  inselKante: 4,

  /* ── Höhen ──
     Das eigene Feld, das Scotophobia so nicht hat: Dort trägt die Höhe
     nur das Relief der Oberfläche, hier ist sie eine Spielregel. Vier
     Ebenen, aus einem eigenen Rauschfeld quantisiert.

     `hoehenSchwellen` sind die drei Grenzen zwischen den vier Ebenen.
     Sie sind **nicht** gleichmäßig: Ebene 1 ist der Normalfall und
     bekommt die größte Spanne; Ebene 0 (der Graben, wo das Wasser
     steht) und Ebene 3 (das Hochplateau) bleiben Ausnahmen, sonst ist
     nichts mehr besonders daran. */
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

     Wasser steht in Ebene 0, und zwar nur dort, wo die Senke groß
     genug ist: Eine einzelne nasse Kachel mitten im Trockenen sieht
     nach einem Fehler aus, nicht nach einem See. */
  wasserMindestSee: 6     /* Kacheln, die eine Senke haben muss          */
};

/* Wie oft die Rückverzerrung nachrechnet. Gemessen in Scotophobia über
   6.000 × 6.000 Bildpunkte: 3 Runden lassen 20,6 px Fehler stehen,
   8 Runden 2,68 px, **12 Runden 0,53 px**. Hier ist die Verzerrung
   schwächer, der Fehler also kleiner — die Zahl bleibt trotzdem, weil
   sie nur einmal je Raum und Gangstützpunkt läuft und nicht je
   Bildpunkt. Sparen an dieser Stelle spart nichts. */
export const ENTZERR_RUNDEN = 12;
