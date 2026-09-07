/* [Aufgabe: Regelkern] Das Sichtfeld — welche Felder ein Auge erreicht
   und welche Wesen darin stehen.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   In einem rundenbasierten Spiel entscheidet Sicht alles: Wer gesehen
   wird, wird beschossen, und zwar sofort und mit voller Wucht. Deshalb
   steht über dieser Datei eine einzige Eigenschaft, der alles andere
   untergeordnet ist — die **Symmetrie**. Sieht A das Feld von B, muss B
   das Feld von A sehen. Ohne sie gäbe es Stellungen, aus denen man
   schießen kann, ohne beschossen werden zu können, und der Spieler
   könnte sie nicht einmal erkennen: Der Bildschirm zeigt ihm nur seine
   eigene Sicht.

   **Warum kein Schattenwurf.** Die schnellen Verfahren (rekursiver
   Schattenwurf über Oktanten, „permissive FOV") fegen Sichtkegel über
   die Karte und runden an den Kegelrändern. Je nachdem, von welcher
   Seite man auf dieselbe Kante schaut, fällt die Rundung anders aus —
   das ist der bekannteste Fehler dieser Verfahren. In einem
   Echtzeitspiel merkt es niemand; hier steht die Figur eine ganze Runde
   lang genau dort. Deshalb wird stumpf jede Linie einzeln gezogen:
   teurer, aber beweisbar, und beweisbar ist hier mehr wert.

   **Bresenham allein reicht für die Symmetrie nicht.** Die Linie von
   (0,0) nach (2,1) läuft über (1,1), die von (2,1) nach (0,0) über
   (1,0) — zwei verschiedene Zwischenfelder. Steht auf einem davon eine
   Wand, sieht einer den anderen und der andere ihn nicht. Deshalb wird
   das Punktepaar **vor** dem Zeichnen in eine feste Reihenfolge
   gebracht (erst nach y, dann nach x) und die fertige Liste hinterher
   nur umgedreht. Damit gibt es zu einem Paar genau **eine** Linie, egal
   wer hinsieht. `werkzeuge/pruefe-sicht.mjs` prüft das nicht an einem
   Beispiel, sondern über jedes Feldpaar einer Testkarte.

   **Was hier nicht entschieden wird:** ob ein gesehenes Wesen auch
   erkannt wird. Ein Wesen kann im Sichtfeld stehen und trotzdem im
   Dunkeln verborgen sein — das ist die Frage von `spiel/licht.mjs` und
   bleibt bewusst dort, damit die reine Geometrie prüfbar bleibt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/gitter.mjs` (Karte, `abstand`), `spiel/hoehen.mjs`
   (`blocktSichtlinie` — die Regel, wann ein Zwischenfeld im Weg steht),
   `spiel/licht.mjs` (nutzt `sichtlinie`, damit Licht nicht durch Wände
   fällt, und legt die Dunkelheit über das Ergebnis von hier),
   `spiel/kampf.mjs` und `spiel/gegner-ki.mjs` (fragen, wer wen sieht),
   `runtime/zeichnen.js` (zeichnet nur, was im Sichtfeld liegt). */

import { abstand, alsWuerfel, vonWuerfel } from "./gitter.mjs";
import { blocktSichtlinie } from "./hoehen.mjs";

/* Die Sichtweite eines Wesens, das keine eigene mitbringt. Der Katalog
   setzt sie je Art; dieser Wert fängt nur den Fall ab, dass jemand ein
   halbfertiges Wesen hereinreicht — lieber ein bekannter Wert als
   `undefined`, das sich lautlos zu 0 rechnet. */
export const SICHT_STANDARD = 8;

/* Nicht-ganze Koordinaten würden die Schrittschleife unten nie
   beenden — ein hängender Zug wäre schlimmer als ein Abbruch. */
function ganzeKoordinaten(ax, ay, zx, zy) {
  if (Number.isInteger(ax) && Number.isInteger(ay)
    && Number.isInteger(zx) && Number.isInteger(zy)) return;
  throw new Error(`sicht: Feldkoordinaten müssen ganze Zahlen sein (${ax},${ay} → ${zx},${zy})`);
}

/* Die feste Reihenfolge eines Punktepaares: erst nach y, dann nach x.
   Welche der beiden Ordnungen gewählt wird, ist gleichgültig —
   wichtig ist nur, dass beide Richtungen dieselbe wählen. */
function inFesterReihenfolge(ax, ay, zx, zy) {
  return ay < zy || (ay === zy && ax <= zx);
}

/* Läuft die Bresenham-Linie ab und meldet jedes Feld an `besuche`.
   Gibt `besuche` false zurück, bricht der Lauf sofort ab — so muss
   `sichtlinie` hinter der ersten Wand nicht weiterrechnen.

   Rein ganzzahlig: nur Vergleiche, Additionen und Vorzeichen. Kein
   Gleitkommaschritt, an dem zwei Browser auseinanderlaufen könnten
   (derselbe Grund wie in `spiel/zufall.mjs`). */
/* `Math.round` als ganzzahlige Rechnung. Ein Bruch p/n wird gerundet,
   ohne dass je eine Kommazahl entsteht — dieselbe Vorsicht wie in
   `spiel/zufall.mjs`: Zwei Browser dürfen hier nicht auseinanderlaufen. */
const teileGerundet = (p, n) => Math.floor((2 * p + n) / (2 * n));

/* Läuft die Linie von Sechseck zu Sechseck ab und meldet jedes Feld an
   `besuche`. Gibt `besuche` false zurück, bricht der Lauf sofort ab —
   so muss `sichtlinie` hinter der ersten Wand nicht weiterrechnen.

   ── Warum nicht mehr Bresenham ─────────────────────────────────────

   Bis zum 07.09.2026 lief hier die Bresenham-Linie eines Quadratrasters.
   Seit dem Sechseck (Vorgang #7) wäre das die zweite Geometrie im
   Spiel: Man ginge über Sechsecke und sähe über Quadrate. Was dabei
   herauskommt, ist kein Schönheitsfehler, sondern ein Widerspruch —
   Felder, die man sieht und nicht erreicht, und Felder, die man
   erreicht und nicht sieht.

   Gerechnet wird deshalb in Würfelkoordinaten: Zwischen Auge und Ziel
   wird in `schritte` gleichen Teilen geteilt, und jeder Zwischenpunkt
   fällt auf das nächstgelegene Sechseck.

   ── Warum das ohne eine einzige Kommazahl geht ─────────────────────

   Die Zwischenpunkte sind Brüche mit demselben Nenner. Gerundet wird
   über `teileGerundet`, verglichen wird über die Zähler. Eine
   Kommazahl käme nie auf zwei Browsern gleich heraus, und die Runde
   bräche mit „auseinandergelaufen" ab. */
function laufeLinie(ax, ay, zx, zy, besuche) {
  const schritte = abstand(ax, ay, zx, zy);
  if (schritte === 0) { besuche(ax, ay); return; }

  const a = alsWuerfel(ax, ay);
  const b = alsWuerfel(zx, zy);

  for (let i = 0; i <= schritte; i++) {
    /* Der exakte Punkt ist (a·(N−i) + b·i) / N — hier als Zähler. */
    const px = a.wx * (schritte - i) + b.wx * i;
    const py = a.wy * (schritte - i) + b.wy * i;
    const pz = a.wz * (schritte - i) + b.wz * i;

    let rx = teileGerundet(px, schritte);
    let ry = teileGerundet(py, schritte);
    let rz = teileGerundet(pz, schritte);

    /* Drei gerundete Zahlen summieren sich selten wieder zu null. Die
       mit der größten Verschiebung wird nachgezogen — die übliche
       Würfelrundung, nur mit Zählern statt Kommazahlen. */
    const wegX = Math.abs(rx * schritte - px);
    const wegY = Math.abs(ry * schritte - py);
    const wegZ = Math.abs(rz * schritte - pz);
    if (wegX > wegY && wegX > wegZ) rx = -ry - rz;
    else if (wegY > wegZ) ry = -rx - rz;
    else rz = -rx - ry;

    const feld = vonWuerfel(rx, rz);
    if (besuche(feld.x, feld.y) === false) return;
  }
}

/* Alle Felder der Linie von (ax,ay) nach (zx,zy), **beide Enden
   eingeschlossen**, in Laufrichtung. Kennt die Karte nicht: Das ist
   reine Geometrie, und wer sie prüft, soll sie ohne Karte prüfen
   können. */
export function linienFelder(ax, ay, zx, zy) {
  ganzeKoordinaten(ax, ay, zx, zy);
  const gedreht = !inFesterReihenfolge(ax, ay, zx, zy);
  const felder = [];
  const sammle = (x, y) => { felder.push({ x, y }); };
  if (gedreht) laufeLinie(zx, zy, ax, ay, sammle);
  else laufeLinie(ax, ay, zx, zy, sammle);
  if (gedreht) felder.reverse();
  return felder;
}

/* Steht zwischen Auge und Ziel nichts im Weg? Start- und Zielfeld
   blocken nie — sonst sähe niemand aus dem eigenen Türrahmen heraus und
   niemand ein Wesen, das hinter einem Fass steht.

   Die Ebenen von Auge **und** Ziel gehen in jede Zwischenfrage ein:
   `blocktSichtlinie` vergleicht mit dem Höheren von beiden. Deshalb
   sieht man von einem Plateau über niedrige Kanten hinweg, und deshalb
   bleibt die Antwort dieselbe, wenn man Auge und Ziel vertauscht. */
export function sichtlinie(karte, ax, ay, zx, zy) {
  ganzeKoordinaten(ax, ay, zx, zy);
  const augenEbene = karte.ebeneBei(ax, ay);
  const zielEbene = karte.ebeneBei(zx, zy);
  let frei = true;
  const pruefe = (x, y) => {
    if ((x === ax && y === ay) || (x === zx && y === zy)) return true;
    if (!blocktSichtlinie(karte, x, y, augenEbene, zielEbene)) return true;
    frei = false;
    return false;
  };
  if (inFesterReihenfolge(ax, ay, zx, zy)) laufeLinie(ax, ay, zx, zy, pruefe);
  else laufeLinie(zx, zy, ax, ay, pruefe);
  return frei;
}

/* Alle Feldindizes, die von (x,y) aus in `reichweite` Feldern sichtbar
   sind — das eigene Feld immer mit dabei.

   Gemessen wird in der Schachbrett-Entfernung (`abstand` aus
   `gitter.mjs`), nicht in Manhattan-Schritten: Sonst hätte das
   Sichtfeld die Form eines Rhombus, und ein Bogen würde diagonal
   weiter schießen, als das Auge reicht. Sicht und Waffenreichweite
   benutzen dieselbe Elle.

   Feldindizes und keine `{x,y}`-Objekte, weil das Ergebnis je Zug für
   jedes Wesen entsteht und danach nur noch mit `has` befragt wird —
   Zahlen in einem Set sind dafür das Billigste. */
export function sichtfeld(karte, x, y, reichweite) {
  const felder = new Set();
  if (!karte.drin(x, y)) return felder;
  felder.add(karte.index(x, y));

  /* Weiter als über die ganze Karte sieht niemand; das fängt zugleich
     `Infinity` ab, das die Schleife sonst nie verließe. */
  const grenze = karte.breite + karte.hoehe;
  const weite = Number.isFinite(reichweite)
    ? Math.min(grenze, Math.max(0, Math.floor(reichweite)))
    : grenze;

  for (let zy = y - weite; zy <= y + weite; zy++) {
    for (let zx = x - weite; zx <= x + weite; zx++) {
      if (!karte.drin(zx, zy)) continue;
      if (zx === x && zy === y) continue;
      if (sichtlinie(karte, x, y, zx, zy)) felder.add(karte.index(zx, zy));
    }
  }
  return felder;
}

/* Dasselbe für ein Wesen, mit seiner eigenen Sichtweite. */
export function sichtbarFuer(karte, wesen) {
  if (!wesen) return new Set();
  const weite = Number.isFinite(wesen.sicht) ? wesen.sicht : SICHT_STANDARD;
  return sichtfeld(karte, wesen.x, wesen.y, weite);
}

/* Welche Wesen der Beobachter sieht — in der Reihenfolge, in der sie
   in `alleWesen` stehen. Die Reihenfolge ist keine Nebensache: Wählt
   die Gegner-KI „das erste sichtbare Ziel", muss diese Liste auf vier
   Rechnern gleich aussehen.

   Tote zählen nicht als sichtbare Wesen, und sich selbst sieht niemand
   — beides würde jede Zielsuche zuerst wieder aussortieren müssen.
   Ob das Ziel im Dunkeln verborgen ist, entscheidet `spiel/licht.mjs`;
   hier zählt nur die Geometrie. */
export function sichtbareWesen(karte, beobachter, alleWesen) {
  const gesehen = [];
  if (!beobachter || !Array.isArray(alleWesen)) return gesehen;
  const feld = sichtbarFuer(karte, beobachter);
  for (const wesen of alleWesen) {
    if (!wesen || wesen === beobachter) continue;
    if (wesen.id !== undefined && wesen.id === beobachter.id) continue;
    if (wesen.lebt === false) continue;
    if (!karte.drin(wesen.x, wesen.y)) continue;
    if (feld.has(karte.index(wesen.x, wesen.y))) gesehen.push(wesen);
  }
  return gesehen;
}
