/* [Aufgabe: Bild] Die Schrift: je Zeichen ein Bildpunktraster, 5 breit und
   7 hoch, als Text im Quelltext — kein Webfont, keine Bilddatei.

   ── Warum kein Webfont ─────────────────────────────────────────────

   Zwei Gründe, und beide sind harte Grenzen dieses Projekts:

   1. **Ein Webfont wäre eine Netzabhängigkeit.** Die Schriftdatei käme
      von einem fremden Rechner. Ist der langsam, steht die Anzeige
      leer; ist er weg, ist sie für immer weg. Dieses Spiel soll aus
      einem Ordner heraus laufen, ohne Dienst und ohne Konto.
   2. **Ein Webfont wird bei ganzzahliger Vergrößerung weich.** Eine
      Umrissschrift wird für jede Größe neu gerastert und dabei
      geglättet — genau das, was Pixelgrafik zerstört (Fehlerbuch D1).
      Ein Raster aus Bildpunkten wird dagegen mit ganzen Zahlen
      vervielfacht: Aus einem Punkt werden vier, aus vier sechzehn, und
      jede Kante bleibt hart.

   ── Warum die Buchstaben in Zeile 1 bis 5 stehen ───────────────────

   Eine deutsche Schrift braucht Ä, Ö, Ü und ß. Die Umlautpunkte
   brauchen eine eigene Zeile **über** dem Buchstaben, die Unterlängen
   von g, j, p, q, y eine **unter** ihm. Bei sieben Zeilen bleibt für
   den Körper also 1 bis 5, die Grundlinie liegt auf Zeile 5. Zeile 0
   trägt nur die Umlautpunkte, Zeile 6 nur die Unterlängen und die
   Schwänze von Komma und Strichpunkt.

   Deshalb sind die Großbuchstaben fünf statt sieben Bildpunkte hoch —
   das ist der Preis dafür, dass „Übersicht" nicht wie ein Fehler
   aussieht. Ä, Ö und Ü rücken noch einmal um eine Zeile zusammen,
   sonst klebten die Punkte am Buchstaben.

   Kleinbuchstaben sind echte Kleinbuchstaben und keine Kapitälchen:
   Deutsche Sätze bestehen überwiegend aus ihnen, und a, b, d, g, h, j,
   k, l, m, n, p, q, r, t, u, y sind auch vier Bildpunkte hoch noch an
   ihrer Form zu erkennen. Nur c, o, s, v, w, x, z unterscheiden sich
   von ihren großen Formen allein in der Höhe — dieselbe Einschränkung
   hat jede Pixelschrift dieser Größe.

   ── Warum jedes Zeichen auf einer Zeile steht ──────────────────────

   Sieben Zeilen je Zeichen untereinander wären besser zu lesen — und
   bei 94 Zeichen wären das über 800 Zeilen allein an Raster, mehr als
   diese Datei haben darf (Regel 8). Also steht ein Zeichen auf einer
   Zeile. Damit trotzdem niemand blind an einem Raster ändern muss,
   druckt `node werkzeuge/pruefe-schrift.mjs --zeigen` den ganzen
   Vorrat als Bild aus, ohne Browser.

   ── Warum feste Breite ─────────────────────────────────────────────

   Jedes Zeichen belegt sechs Bildpunkte (fünf plus eine Lücke), auch
   das Ausrufezeichen. Eine Anzeige, in der „LP 100" auf „LP 99" fällt,
   soll nicht die ganze Zeile verschieben — und `breiteVon` ist so eine
   Multiplikation statt einer Summe über eine zweite Tabelle, die
   irgendwann nicht mehr zum Raster passt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/palette.js` (`FARBEN.kontur` als Schattenfarbe; jede andere
   Farbe kommt vom Aufrufer), `runtime/oberflaeche.js` und
   `runtime/zeichnen.js` (die einzigen, die schreiben — sie reichen das
   Zeichenblatt herein, diese Datei holt sich keines), `runtime/kamera.js`
   (liefert die ganzzahlige Vergrößerung, die `gross` bekommt) und
   `werkzeuge/pruefe-schrift.mjs`, das jedes Raster vermisst und über
   ein mitschreibendes Ersatzblatt belegt, dass auf ganzen Bildpunkten
   gezeichnet wird. Kennt vom Spiel nichts. */

import { FARBEN } from "./palette.js";

/* ── Die Maße ───────────────────────────────────────────────────────
   Ungerade Breite ist hier egal — Schrift wird nie gedreht (das ist
   der Unterschied zu `FIGUR` im Bildvertrag). Die Zeilenhöhe ist
   sieben plus zwei: eine Zeile für den Schatten, eine als Luft.
   Ohne die zweite kleben zwei Zeilen aneinander. */
export const ZEICHEN_BREIT = 5;
export const ZEICHEN_HOCH = 7;
export const ABSTAND = 1;
export const VORSCHUB = ZEICHEN_BREIT + ABSTAND;
export const ZEILE = ZEICHEN_HOCH + 2;

/* Der Schatten ist fast schwarz, nicht schwarz: Reines Schwarz wirkt
   in Pixelgrafik wie ein Loch. Warum ein Schatten überhaupt sein muss:
   Die Anzeige liegt über dem Kerkerboden, und heller Text auf hellem
   Stein ist ohne dunkle Kante nicht zu lesen. */
export const SCHATTEN_FARBE = FARBEN.kontur;

const GESETZT = "#";

/* Für ein Zeichen, das es nicht gibt: ein leerer Kasten. Nicht nichts
   — ein fehlendes Zeichen soll man **sehen**, sonst fällt eine Lücke
   im Vorrat erst dem Spieler auf. */
export const ERSATZ = [".....", "#####", "#...#", "#...#", "#...#", "#####", "....."];

/* ── Der Vorrat ─────────────────────────────────────────────────────
   Sieben Zeilen je Zeichen, "#" gesetzt, "." durchsichtig. Keine
   Rechnung in den Zeilen (Bildvertrag): kein `repeat`, kein
   Zusammenbauen — ein Raster steht da oder es steht nicht da. */
export const ZEICHEN = {
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],

  /* ── Großbuchstaben: Körper in Zeile 1 bis 5. Zeile 0 bleibt für die
     Umlautpunkte frei, Zeile 6 für die Unterlängen. ── */
  "A": [".....", ".###.", "#...#", "#####", "#...#", "#...#", "....."],
  "B": [".....", "####.", "#...#", "####.", "#...#", "####.", "....."],
  "C": [".....", ".####", "#....", "#....", "#....", ".####", "....."],
  "D": [".....", "####.", "#...#", "#...#", "#...#", "####.", "....."],
  "E": [".....", "#####", "#....", "###..", "#....", "#####", "....."],
  "F": [".....", "#####", "#....", "###..", "#....", "#....", "....."],
  "G": [".....", ".####", "#....", "#..##", "#...#", ".###.", "....."],
  "H": [".....", "#...#", "#...#", "#####", "#...#", "#...#", "....."],
  "I": [".....", ".###.", "..#..", "..#..", "..#..", ".###.", "....."],
  "J": [".....", "..###", "...#.", "...#.", "#..#.", ".##..", "....."],
  "K": [".....", "#...#", "#..#.", "###..", "#..#.", "#...#", "....."],
  "L": [".....", "#....", "#....", "#....", "#....", "#####", "....."],
  "M": [".....", "#...#", "##.##", "#.#.#", "#...#", "#...#", "....."],
  "N": [".....", "#...#", "##..#", "#.#.#", "#..##", "#...#", "....."],
  "O": [".....", ".###.", "#...#", "#...#", "#...#", ".###.", "....."],
  "P": [".....", "####.", "#...#", "####.", "#....", "#....", "....."],
  "Q": [".....", ".###.", "#...#", "#...#", "#.##.", ".##.#", "....."],
  "R": [".....", "####.", "#...#", "####.", "#..#.", "#...#", "....."],
  "S": [".....", ".####", "#....", ".###.", "....#", "####.", "....."],
  "T": [".....", "#####", "..#..", "..#..", "..#..", "..#..", "....."],
  "U": [".....", "#...#", "#...#", "#...#", "#...#", ".###.", "....."],
  "V": [".....", "#...#", "#...#", "#...#", ".#.#.", "..#..", "....."],
  "W": [".....", "#...#", "#...#", "#.#.#", "##.##", "#...#", "....."],
  "X": [".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "....."],
  "Y": [".....", "#...#", ".#.#.", "..#..", "..#..", "..#..", "....."],
  "Z": [".....", "#####", "...#.", "..#..", ".#...", "#####", "....."],

  /* ── Umlaute und ß — Pflicht, das Spiel ist deutsch. Die Punkte stehen
     in Zeile 0, der Körper rückt dafür auf vier Zeilen zusammen. ── */
  "Ä": [".#.#.", ".....", ".###.", "#...#", "#####", "#...#", "....."],
  "Ö": [".#.#.", ".....", ".###.", "#...#", "#...#", ".###.", "....."],
  "Ü": [".#.#.", ".....", "#...#", "#...#", "#...#", ".###.", "....."],
  "ß": [".....", ".##..", "#..#.", "###..", "#..#.", "#.##.", "....."],

  /* ── Kleinbuchstaben: Mittellänge Zeile 2 bis 5, Oberlängen ab Zeile 1,
     Unterlängen bis Zeile 6. ── */
  "a": [".....", ".....", ".###.", "#..#.", "#..#.", ".####", "....."],
  "b": [".....", "#....", "####.", "#..#.", "#..#.", "####.", "....."],
  "c": [".....", ".....", ".###.", "#....", "#....", ".###.", "....."],
  "d": [".....", "...#.", ".###.", "#..#.", "#..#.", ".###.", "....."],
  "e": [".....", ".....", ".###.", "####.", "#....", ".###.", "....."],
  "f": [".....", "..##.", ".#...", "###..", ".#...", ".#...", "....."],
  "g": [".....", ".....", ".###.", "#..#.", "#..#.", ".###.", "###.."],
  "h": [".....", "#....", "####.", "#..#.", "#..#.", "#..#.", "....."],
  "i": [".....", "..#..", ".....", "..#..", "..#..", "..#..", "....."],
  "j": [".....", "...#.", ".....", "...#.", "...#.", "...#.", "###.."],
  "k": [".....", "#....", "#..#.", "###..", "#.#..", "#..#.", "....."],
  "l": [".....", ".#...", ".#...", ".#...", ".#...", ".##..", "....."],
  "m": [".....", ".....", "#####", "#.#.#", "#.#.#", "#.#.#", "....."],
  "n": [".....", ".....", "####.", "#..#.", "#..#.", "#..#.", "....."],
  "o": [".....", ".....", ".##..", "#..#.", "#..#.", ".##..", "....."],
  "p": [".....", ".....", "####.", "#..#.", "#..#.", "####.", "#...."],
  "q": [".....", ".....", ".###.", "#..#.", "#..#.", ".###.", "...#."],
  "r": [".....", ".....", "#.##.", "##...", "#....", "#....", "....."],
  "s": [".....", ".....", ".####", "##...", "...##", "####.", "....."],
  "t": [".....", ".#...", "###..", ".#...", ".#...", ".##..", "....."],
  "u": [".....", ".....", "#..#.", "#..#.", "#..#.", ".####", "....."],
  "v": [".....", ".....", "#...#", "#...#", ".#.#.", "..#..", "....."],
  "w": [".....", ".....", "#...#", "#.#.#", "#.#.#", ".#.#.", "....."],
  "x": [".....", ".....", "#..#.", ".##..", ".##..", "#..#.", "....."],
  "y": [".....", ".....", "#..#.", "#..#.", ".###.", "...#.", "###.."],
  "z": [".....", ".....", "#####", "..##.", ".##..", "#####", "....."],

  "ä": [".#.#.", ".....", ".###.", "#..#.", "#..#.", ".####", "....."],
  "ö": [".#.#.", ".....", ".##..", "#..#.", "#..#.", ".##..", "....."],
  "ü": [".#.#.", ".....", "#..#.", "#..#.", "#..#.", ".####", "....."],

  /* ── Ziffern. Gleich breit wie jedes andere Zeichen, damit eine
     fallende Lebensanzeige die Zeile daneben nicht verschiebt. ── */
  "0": [".....", ".###.", "#..##", "#.#.#", "##..#", ".###.", "....."],
  "1": [".....", "..#..", ".##..", "..#..", "..#..", ".###.", "....."],
  "2": [".....", ".###.", "#...#", "..##.", ".#...", "#####", "....."],
  "3": [".....", "####.", "....#", ".###.", "....#", "####.", "....."],
  "4": [".....", "#..#.", "#..#.", "#####", "...#.", "...#.", "....."],
  "5": [".....", "#####", "#....", "####.", "....#", "####.", "....."],
  "6": [".....", ".###.", "#....", "####.", "#...#", ".###.", "....."],
  "7": [".....", "#####", "....#", "...#.", "..#..", "..#..", "....."],
  "8": [".....", ".###.", "#...#", ".###.", "#...#", ".###.", "....."],
  "9": [".....", ".###.", "#...#", ".####", "....#", ".###.", "....."],

  /* ── Satz- und Rechenzeichen, die vier Pfeile und die Marken der
     Anzeige: Kreuz für tot, Herz für Leben, voller und leerer Punkt. ── */
  ".": [".....", ".....", ".....", ".....", ".....", "..#..", "....."],
  /* Der Mittelpunkt war nicht verlangt und steht trotzdem hier: Die
     Texte dieses Projekts trennen mit ihm („Späher · 18 LP"), und ohne
     ihn stünde in der Anzeige der Ersatzkasten. */
  "·": [".....", ".....", ".....", "..#..", ".....", ".....", "....."],
  ",": [".....", ".....", ".....", ".....", ".....", "..#..", ".#..."],
  ":": [".....", ".....", ".....", "..#..", ".....", "..#..", "....."],
  ";": [".....", ".....", ".....", "..#..", ".....", "..#..", ".#..."],
  "!": [".....", "..#..", "..#..", "..#..", ".....", "..#..", "....."],
  "?": [".....", ".###.", "#...#", "..##.", ".....", "..#..", "....."],
  "'": [".....", "..#..", "..#..", ".....", ".....", ".....", "....."],
  "\"": [".....", ".#.#.", ".#.#.", ".....", ".....", ".....", "....."],
  "(": [".....", "...#.", "..#..", "..#..", "..#..", "...#.", "....."],
  ")": [".....", ".#...", "..#..", "..#..", "..#..", ".#...", "....."],
  "+": [".....", ".....", "..#..", "#####", "..#..", ".....", "....."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "/": [".....", "....#", "...#.", "..#..", ".#...", "#....", "....."],
  "%": [".....", "##..#", "##.#.", "..#..", ".#.##", "#..##", "....."],
  "×": [".....", ".....", ".#.#.", "..#..", ".#.#.", ".....", "....."],
  "°": [".....", ".###.", ".#.#.", ".###.", ".....", ".....", "....."],
  "→": [".....", ".....", "...#.", "#####", "...#.", ".....", "....."],
  "←": [".....", ".....", ".#...", "#####", ".#...", ".....", "....."],
  "↑": [".....", "..#..", ".###.", "#.#.#", "..#..", "..#..", "....."],
  "↓": [".....", "..#..", "..#..", "#.#.#", ".###.", "..#..", "....."],
  "✕": [".....", "#...#", "##.##", "..#..", "##.##", "#...#", "....."],
  "♥": [".....", ".#.#.", "#####", "#####", ".###.", "..#..", "....."],
  "●": [".....", ".....", ".###.", "#####", ".###.", ".....", "....."],
  "○": [".....", ".....", ".###.", "#...#", ".###.", ".....", "....."]
};

/* Das Raster eines Zeichens — für ein unbekanntes der Ersatzkasten. */
export function rasterVon(zeichen) {
  return ZEICHEN[zeichen] || ERSATZ;
}

/* Die Breite eines Textes in Bildpunkten, **ohne** Vergrößerung: so
   breit, wie die gezeichneten Punkte am Ende reichen. Die letzte Lücke
   zählt nicht mit — sonst stünde ein rechtsbündiger Text immer einen
   Punkt zu weit links.

   `[...text]` und nicht `text.length`: Ein Pfeil ist ein Zeichen, und
   wer über die Zeichenkette läuft, muss dieselbe Zahl bekommen wie
   `zeichne`, sonst laufen Breite und Bild auseinander. */
export function breiteVon(text) {
  const anzahl = [...String(text)].length;
  return anzahl === 0 ? 0 : anzahl * VORSCHUB - ABSTAND;
}

/* Malt einen Text in einer Farbe. Waagerechte Läufe werden zu **einem**
   Rechteck zusammengefasst: „100 LP" sind so gut vierzig Rechtecke
   statt hundertfünfzig, und jedes einzelne liegt auf ganzen
   Bildpunkten, weil nur mit ganzen Zahlen gerechnet wird. */
function male(ctx, text, x, y, farbe, gross) {
  ctx.fillStyle = farbe;
  let spalte = 0;
  for (const zeichen of String(text)) {
    const raster = rasterVon(zeichen);
    for (let zeile = 0; zeile < raster.length; zeile++) {
      const muster = raster[zeile];
      let lauf = 0;
      for (let i = 0; i <= muster.length; i++) {
        if (muster[i] === GESETZT) { lauf++; continue; }
        if (lauf === 0) continue;
        ctx.fillRect(x + (spalte + i - lauf) * gross, y + zeile * gross, lauf * gross, gross);
        lauf = 0;
      }
    }
    spalte += VORSCHUB;
  }
}

/* Zeichnet `text` mit der linken oberen Ecke auf (x, y) und gibt
   zurück, wie breit er geworden ist — damit der Aufrufer weiterschreiben
   kann, ohne dieselbe Rechnung ein zweites Mal zu machen.

   Drei Dinge passieren hier und nirgends sonst:

   · **Die Vergrößerung wird abgerundet und ist mindestens 1.** Ein
     `gross` von 2,5 würde jede Kante auf einen halben Bildpunkt legen
     und die ganze Schrift weichzeichnen (Fehlerbuch D1).
   · **x und y werden gerundet**, bevor irgendetwas gemalt wird. Ein
     Text, der einer Figur folgt, bekommt sonst Bruchzahlen herein.
   · **Die Glättung wird abgeschaltet.** Sie wird von jedem Setzen der
     Blattmaße zurückgestellt, und die Anzeige wird nach jeder
     Fenstergrößenänderung als Erstes wieder gezeichnet — das ist genau
     die Stelle, an der das sonst niemandem auffällt.

   Der Schatten wird **zuerst** gemalt, um einen Punkt versetzt, und
   zwar um `gross` Bildpunkte: Ein Schatten ist einen *logischen* Punkt
   breit, nicht einen Bildschirmpunkt. */
export function zeichne(ctx, text, x, y, farbe, { gross = 1, schatten = true } = {}) {
  const stufe = Math.max(1, Math.floor(gross));
  const px = Math.round(x);
  const py = Math.round(y);
  ctx.imageSmoothingEnabled = false;
  if (schatten) male(ctx, text, px + stufe, py + stufe, SCHATTEN_FARBE, stufe);
  male(ctx, text, px, py, farbe, stufe);
  return breiteVon(text) * stufe;
}
