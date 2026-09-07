/* [Aufgabe: Regelkern] Gesätes Wertrauschen — das Gelände unter dem Kerker.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Ein Kerker aus reinem Würfelwurf sieht aus wie Konfetti: jedes Feld
   entscheidet für sich, und das Auge findet keine Form. Gebraucht wird
   das Gegenteil — ein Feld, das **weich** wandert, damit „hier ist es
   tief" und „dort ist es hoch" größere Flächen sind und nicht einzelne
   Punkte. Genau das leistet Wertrauschen: An den Gitterpunkten steht
   eine gesäte Zahl, dazwischen wird geglättet. `fbm` legt mehrere
   solcher Felder mit halber Breite und halber Stärke übereinander —
   die groben Züge kommen aus der ersten Lage, die Kanten aus den
   feinen.

   Der Anstoß ist **rein ganzzahlig**: Der Hash rechnet nur mit
   `Math.imul`, XOR und Schiebungen. Grund ist derselbe wie bei
   `spiel/zufall.mjs` — vier Rechner müssen bitgleich dieselbe Karte
   bauen, sonst spielt jeder ein anderes Spiel. Ein Gleitkommaschritt
   im Anstoß (etwa `Math.sin`) wäre genau die Stelle, an der zwei
   Browser auseinanderlaufen dürfen, ohne dass es jemand merkt.

   Keine Bibliothek: Perlin oder Simplex wären hier größer und würden
   nichts können, was diese Karte braucht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/landschaft.mjs` (nimmt die Felder für Höhen, Pfützen und
   Grüfte), `werkzeuge/pruefe-landschaft.mjs`. Liest selbst nichts —
   es ist das unterste Stockwerk und kennt weder Karte noch Spiel.

   ── Zwei Rauschfamilien in einer Datei — noch zu entscheiden ───────

   Unten stehen zusätzlich `hash`, `vn`, `sstep`, `smin` und `smax`
   wörtlich aus Janniks eigener Engine (`Kimpaliz/granithoehle`,
   „Scotophobia"). `spiel/welt-feld.mjs` baut darauf eine Höhle **als
   Formel** — ein zweiter Weg zur Landschaft neben dem Kerkerbau in
   `spiel/landschaft.mjs`. Beide Familien haben ein `fbm`, und die
   beiden rechnen **verschieden** (Scotophobia: Glättung 3−2t,
   Lakunarität 2,03, Saatversatz je Oktave; hier: Glättung 6t⁵−15t⁴+10t³,
   Lakunarität 2, eigene Saat je Lage).

   Damit keine der beiden still das Ergebnis der anderen bekommt,
   entscheidet `fbm` am **vierten** Argument: eine Zahl heißt
   Scotophobia (Oktavenzahl), ein Objekt heißt Kerkerbau
   (`{oktaven, dauer, weite}`). Fehlt es, wird geworfen statt geraten.

   Das ist eine Brücke, kein Entwurf: Zwei Rauschfamilien unter einem
   Namen gehören auf Dauer getrennt. Welcher der beiden Wege zur
   Landschaft bleibt, entscheidet der Auftraggeber. */

/* Streufaktoren aus der üblichen Ganzzahl-Mischerei (murmur/xxhash).
   Sie müssen nur teilerfremd und krumm sein; die genauen Werte sind
   austauschbar, dürfen sich aber nie wieder ändern — sonst sieht jede
   gespeicherte Saat hinterher anders aus. */
const STREU_A = 0x85ebca6b;
const STREU_B = 0xc2b2ae35;
const STREU_C = 0x27d4eb2d;
const GOLD = 0x9e3779b1;

/* Ein Gitterpunkt → eine 32-Bit-Zahl. Ganzzahlig, vorzeichenlos, auf
   jedem Rechner gleich. Negative Koordinaten sind erlaubt. */
export function ganzHash(saat, x, y) {
  let h = ((saat >>> 0) ^ GOLD) >>> 0;
  h = Math.imul(h ^ (x | 0), STREU_A) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  h = Math.imul(h ^ (y | 0), STREU_B) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, STREU_C) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/* 0…1 aus einer 32-Bit-Zahl. Nie ganz 1 — so bleibt jede spätere
   Quantisierung (`Math.floor(wert * stufen)`) im gültigen Bereich. */
const einheit = (h) => (h >>> 0) / 4294967296;

/* Die Glättung 6t⁵−15t⁴+10t³. Sie ist an beiden Enden doppelt flach;
   deshalb sieht man die Gitterlinien im Ergebnis nicht mehr, was bei
   einfacher linearer Blende deutlich sichtbar wäre. Ausgeschrieben
   als Horner-Form, ohne `Math.pow` — das spart drei Aufrufe je Feld
   und hält die Rechnung bei den vier Grundrechenarten. */
const glaetten = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/* Wertrauschen an einer beliebigen (auch gebrochenen) Stelle: die vier
   umgebenden Gitterwerte, zweimal geglättet geblendet. Ergebnis 0…1. */
export function wertRauschen(saat, x, y) {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  const ux = glaetten(x - gx);
  const uy = glaetten(y - gy);
  const eckeNW = einheit(ganzHash(saat, gx, gy));
  const eckeNO = einheit(ganzHash(saat, gx + 1, gy));
  const eckeSW = einheit(ganzHash(saat, gx, gy + 1));
  const eckeSO = einheit(ganzHash(saat, gx + 1, gy + 1));
  const oben = eckeNW + (eckeNO - eckeNW) * ux;
  const unten = eckeSW + (eckeSO - eckeSW) * ux;
  return oben + (unten - oben) * uy;
}

/* Mehrere Lagen übereinander („fractional Brownian motion").
   `oktaven` — wie viele Lagen. `dauer` — womit die Stärke je Lage
   multipliziert wird (0,5 = jede Lage halb so laut). `weite` — wie
   breit die gröbste Lage ist, gemessen in Feldern.

   Geteilt wird am Ende durch die Summe der Stärken, nicht durch eine
   feste Zahl: Nur so bleibt das Ergebnis auch bei drei oder sechs
   Oktaven verlässlich in 0…1, und nur so heißt „Schwelle 0,3"
   dasselbe, wenn jemand die Oktavenzahl ändert. */
export function fbm(saat, x, y, opts) {
  /* Die Weiche zwischen den beiden Rauschfamilien — siehe Kopfnotiz.
     Eine Zahl heißt Scotophobia (`fbm(x, y, saat, oktaven)`), ein
     Objekt heißt Kerkerbau. Fehlt das vierte Argument, ist nicht
     entscheidbar, welche gemeint war — dann wird geworfen, denn beide
     lieferten eine Zahl in 0…1, nur eben die falsche. */
  if (typeof opts === "number") return fbmScotophobia(saat, x, y, opts);
  if (opts === null || typeof opts !== "object") {
    throw new TypeError(
      "fbm: viertes Argument fehlt — {oktaven, dauer, weite} für den Kerkerbau, "
      + "eine Oktavenzahl für Scotophobia"
    );
  }
  const oktaven = Math.max(1, Math.min(8, Math.trunc(opts.oktaven ?? 4)));
  const dauer = opts.dauer ?? 0.5;
  const weite = Math.max(0.0001, opts.weite ?? 8);
  let summe = 0;
  let gewichtSumme = 0;
  let staerke = 1;
  let teiler = 1 / weite;
  for (let lage = 0; lage < oktaven; lage++) {
    /* Jede Lage bekommt eine eigene Saat. Ohne das läge dieselbe
       Zeichnung viermal deckungsgleich übereinander und fbm wäre nur
       ein teureres Wertrauschen. */
    const lagenSaat = ((saat >>> 0) + Math.imul(lage + 1, GOLD)) >>> 0;
    summe += staerke * wertRauschen(lagenSaat, x * teiler, y * teiler);
    gewichtSumme += staerke;
    staerke *= dauer;
    teiler *= 2;
  }
  return gewichtSumme > 0 ? summe / gewichtSumme : 0;
}

/* Ein ganzes Feld auf einmal — `Float32Array`, weil es je Karte einmal
   gebraucht und danach nur gelesen wird, und weil sich eine flache
   Zahlenreihe byteweise vergleichen lässt (dieselbe Überlegung wie bei
   `spiel/gitter.mjs`). Zeile für Zeile, damit zwei Läufe dieselbe
   Reihenfolge sehen. */
export function macheRauschfeld(saat, breite, hoehe, opts = {}) {
  if (!Number.isInteger(breite) || !Number.isInteger(hoehe) || breite < 1 || hoehe < 1) {
    throw new Error(`macheRauschfeld: Maße müssen ganze Zahlen ab 1 sein (${breite}×${hoehe})`);
  }
  const feld = new Float32Array(breite * hoehe);
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) feld[y * breite + x] = fbm(saat, x, y, opts);
  }
  return feld;
}

/* ═══ Scotophobia — wörtlich aus Janniks eigener Engine ═════════════

   Unverändert übernommen (`Kimpaliz/granithoehle`, `spiel/rauschen.mjs`),
   damit ein Vergleich der beiden Dateien einen Unterschied auch als
   Unterschied zeigt und nicht als Umformulierung. Gelesen von
   `spiel/welt-feld.mjs`. */

/* Ganzzahliger Streuwert aus zwei Koordinaten und einer Saat.
   Liefert gleichverteilt 0…1. */
export function hash(x, y, s) {
  let n = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1)
    ^ Math.imul(s | 0, 0x9e3779b1);
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

/* Der Faktor 2,03 statt glatter 2 verhindert, dass sich die Oktaven an
   denselben Stellen aufschaukeln und ein sichtbares Gitter entsteht. */
function fbmScotophobia(x, y, s, oct) {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += a * vn(x * f, y * f, s + i * 17);
    norm += a; a *= 0.5; f *= 2.03;
  }
  return norm > 0 ? sum / norm : 0;
}

/* Weiche Stufe zwischen zwei Schwellen. */
export function sstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/* Weiches Minimum. Der Grund, warum Gang und Halle nicht
   aneinandergestückelt wirken, sondern in einer gerundeten Kehle
   verschmelzen — der eine Kunstgriff, an dem man eine erzeugte Höhle
   sonst sofort erkennt. */
export function smin(a, b, k) {
  const h = k - Math.abs(a - b);
  if (h <= 0) return a < b ? a : b;
  return (a < b ? a : b) - (h / k) * (h / k) * k * 0.25;
}

/* Weiches Maximum — dasselbe, nur andersherum. Damit wird eine
   Felsinsel in den Hohlraum gestellt, ohne dass ihre Kante aussieht
   wie ausgestanzt. */
export function smax(a, b, k) {
  return -smin(-a, -b, k);
}
