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
   Grüfte). Kennt weder Karte noch Spiel — nur Zahlen. */

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
export function fbm(saat, x, y, opts = {}) {
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
