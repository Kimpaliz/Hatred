/* [Aufgabe: Regelkern] Das Rauschen der Weltformel — wörtlich aus
   Janniks eigener Engine.

   ── Woher das kommt, und warum unverändert ─────────────────────────

   Aus `Kimpaliz/granithoehle` („Scotophobia: Shapes in the Dark"),
   Datei `spiel/rauschen.mjs`. Janniks Auftrag: *„benutze meine
   pixelslop engine aus scotophobia, aber erst mal nur mit wasser und
   ohne gase."*

   Die vier Funktionen stehen hier **unverändert**, Zeichen für
   Zeichen. Das ist Absicht: Wer die beiden Dateien nebeneinanderlegt,
   soll einen Unterschied als Unterschied sehen und nicht als
   Umformulierung. Eine Weltformel, die man „ein bisschen aufgeräumt"
   übernimmt, erzeugt andere Höhlen — und niemand merkt, warum.

   ── Warum eine eigene Datei neben `rauschen.mjs` ───────────────────

   Weil es zwei verschiedene Dinge sind. `rauschen.mjs` streut
   Kleinigkeiten über eine fertige Karte; hier steht die Grundlage, aus
   der die Karte überhaupt erst entsteht. Und die Aufrufform ist eine
   andere: dort `fbm(saat, x, y, …)`, hier `fbm(x, y, s, oct)` — die
   Reihenfolge aus Scotophobia. Zwei Funktionen gleichen Namens mit
   vertauschten Argumenten in einer Datei wären die Sorte Falle, die
   erst nach Wochen zuschnappt.

   ── Der Unterschied zu `zufall.mjs` ────────────────────────────────

   Hier steht, was **ist** — die Form der Höhle, an jedem Punkt
   abfragbar, ohne Reihenfolge. Dort steht, was **geschieht** — der
   Trefferwurf, die Gegnerwahl. Ein Rauschen fragt man an einer Stelle;
   einen Strom zieht man der Reihe nach.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   Liest nichts und darf nie etwas lesen — es ist das unterste
   Stockwerk. Gelesen allein von `spiel/welt-feld.mjs`. */

/* Ganzzahliger Streuwert aus zwei Koordinaten und einer Saat.
   Liefert gleichverteilt 0…1. */
export function hash(x, y, s) {
  let n = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1);
  n ^= n >>> 15; n = Math.imul(n, 0x2c1b3c6d);
  n ^= n >>> 12; n = Math.imul(n, 0x297a2d39);
  n ^= n >>> 15;
  return (n >>> 0) / 4294967296;
}

/* Wertrauschen: die vier Gitterecken weich verschliffen. */
export function vn(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), tx = x - xi, ty = y - yi;
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s);
  const cc = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  const p = a + (b - a) * u, q = cc + (d - cc) * u;
  return p + (q - p) * v;
}

/* Gebrochen-fraktales Rauschen: mehrere Oktaven übereinander.
   Der Faktor 2.03 statt glatter 2 verhindert, dass sich die Oktaven an
   denselben Stellen aufschaukeln und ein sichtbares Gitter entsteht. */
export function fbm(x, y, s, oct) {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += a * vn(x * f, y * f, s + i * 17);
    norm += a; a *= 0.5; f *= 2.03;
  }
  return sum / norm;
}

/* Weiche Stufe zwischen zwei Schwellen. */
export function sstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/* Weiches Minimum. Der eine Kunstgriff, an dem man eine erzeugte Höhle
   sonst sofort erkennt: Ohne ihn stoßen Gang und Halle als zwei Formen
   aneinander, mit ihm verschmelzen sie in einer gerundeten Kehle. */
export function smin(a, b, k) {
  const h = k - Math.abs(a - b);
  if (h <= 0) return a < b ? a : b;
  return (a < b ? a : b) - (h / k) * (h / k) * k * 0.25;
}

/* Weiches Maximum — dasselbe, nur andersherum. Damit steht eine
   Felsinsel im Hohlraum, ohne dass ihre Kante wie ausgestanzt wirkt. */
export function smax(a, b, k) {
  return -smin(-a, -b, k);
}
