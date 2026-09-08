/* [Aufgabe: Prüfwesen] Prüft Sichtfeld und Regellicht — Symmetrie,
   Schatten, Höhe über Kanten, Verborgenheit im Dunkeln, Gleichlauf.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Die eine Frage, die diese Datei wirklich stellt, ist die Symmetrie.
   Sie wird deshalb **nicht an einem Beispiel** geprüft, sondern über
   jedes Feldpaar einer gewürfelten Testkarte — rund 38.000 geordnete
   Paare. Ein Beispiel würde nichts beweisen: Asymmetrische Sicht
   entsteht nur bei halben Steigungen und nur dort, wo genau auf dem
   umstrittenen Zwischenfeld etwas steht. Man findet sie nicht durch
   Hinsehen, sondern durch Zählen.

   Damit die Symmetrieprüfung nicht bloß eine Selbstverständlichkeit
   feststellt, steht in dieser Datei ein **zweiter, absichtlich naiver**
   Bau derselben Sichtlinie: Bresenham ohne feste Paarreihenfolge, wie
   man ihn zuerst schreibt. Er wird über dieselbe Karte geschickt und
   muss asymmetrisch sein. Wäre er es nicht, stellte die Testkarte die
   Frage gar nicht, und die grüne Symmetrieprüfung wäre wertlos.

   Weiter wird gerade das geprüft, was ohne die Arbeit falsch wäre:

   · Licht durch eine Wand — der naive Bau addiert einfach den Abfall
     über die Entfernung und beleuchtet den Nachbarraum mit.
   · Licht über eine höhere Kante — dieselbe Falle, eine Ebene weiter.
   · Höhe schlägt Sichtblockade: Von Ebene 3 sieht man über eine
     Ebene-2-Mauer, von Ebene 1 nicht. Wer nur die Augenebene
     vergleicht statt des Höheren von Auge und Ziel, verliert die halbe
     Regel — und zwar unsymmetrisch.
   · Verborgen ist ein **Und** aus Dunkelheit und Entfernung. Wer nur
     die Helligkeit prüft, macht jeden unbeleuchteten Winkel zum
     Versteck, auch Auge in Auge.
   · Genau 0,25 hell ist **nicht** dunkler als 0,25 — die Schwelle
     selbst, der Fall, den ein `<=` still umdreht.
   · Die Reichweiten der Lichtarten hier und in `runtime/palette.js`
     müssen dieselben Zahlen sein, sonst sieht ein Feld hell aus und
     gilt trotzdem als dunkel. Deshalb wird die Palette als Text
     gelesen und Zahl für Zahl verglichen — als Text, weil `spiel/`
     nichts aus `runtime/` importieren darf und die Prüfung diese Naht
     trotzdem bewachen soll.
   · Gleichlauf: zweimal dieselbe Karte, byteweise dasselbe
     `Float32Array`. Ein Lichtfeld entscheidet über Treffbarkeit; liefe
     es zwischen zwei Rechnern auseinander, wäre das Ziel für den einen
     verborgen und für den anderen nicht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `tests/helfer.mjs` (das Prüfgerüst), `spiel/sicht.mjs` und
   `spiel/licht.mjs` (das Geprüfte), `spiel/gitter.mjs`,
   `spiel/hoehen.mjs` und `spiel/zufall.mjs` (Karten und Regeln für die
   Testkarten), `runtime/palette.js` (nur gelesen, für den Vergleich der
   Lichtreichweiten), `werkzeuge/pruefe-alles.mjs` (startet diese Datei
   als eigenen Prozess und liest den Rückgabewert). */

import { readFileSync } from "node:fs";
import { abschnitt, behaupte, gleich, nahe, tiefGleich, wirft, ende } from "./helfer.mjs";
import { macheKarte, alleFelder, abstand, HINDERNIS, RAMPE } from "../spiel/gitter.mjs";
import { blocktSichtlinie } from "../spiel/hoehen.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import {
  SICHT_STANDARD, linienFelder, sichtlinie, sichtfeld, sichtbarFuer, sichtbareWesen
} from "../spiel/sicht.mjs";
import {
  SICHT_IM_DUNKELN, VERBORGEN_UNTER, LICHT_WEITEN, LICHT_WEITE_STANDARD,
  helligkeitsfeld, helligkeitBei, istVerborgen
} from "../spiel/licht.mjs";

/* Gemessene Zahlen gehören in die Ausgabe, nicht in einen Kommentar —
   sonst steht im Changelog eine Schätzung. */
const messung = (text) => console.log(`      · ${text}`);

const flach = (breite = 14, hoehe = 14) => macheKarte(breite, hoehe);

/* ── Die Linie selbst ───────────────────────────────────────────── */

abschnitt("Linie");
{
  tiefGleich(linienFelder(3, 3, 3, 3), [{ x: 3, y: 3 }], "eine Linie auf sich selbst ist ein Feld");

  const waagerecht = linienFelder(2, 5, 6, 5);
  gleich(waagerecht.length, 5, "vier Felder weit sind fünf Felder");
  tiefGleich(waagerecht[0], { x: 2, y: 5 }, "das Auge ist dabei");
  tiefGleich(waagerecht[4], { x: 6, y: 5 }, "das Ziel ist dabei");
  behaupte(waagerecht.every((f) => f.y === 5), "eine waagerechte Linie bleibt waagerecht");

  /* Seit dem Sechseck (Vorgang #7) misst nur noch ein Maßband. Von
     (0,0) auf gerader Zeile nach (2,1) sind es drei Schritte, also vier
     Felder mit beiden Enden. Auf dem Quadrat wären es zwei gewesen —
     genau daran erkennt man, dass Sehen und Gehen jetzt dasselbe
     Raster meinen. */
  const schraeg = linienFelder(0, 0, 2, 1);
  gleich(schraeg.length, abstand(0, 0, 2, 1) + 1, "Länge ist die Entfernung plus eins");
  gleich(schraeg.length, 4, "und das sind hier vier Felder");

  /* Jeder Schritt der Linie ist ein echter Nachbarschritt. Ohne diese
     Behauptung könnte die Linie über Felder springen, die niemand
     betreten kann — und man sähe durch eine Wand, ohne sie zu fragen. */
  for (const [ax, ay, zx, zy] of [[0, 0, 9, 4], [3, 8, 7, 1], [2, 3, 2, 9], [5, 5, 0, 5]]) {
    const linie = linienFelder(ax, ay, zx, zy);
    let keinNachbar = 0;
    for (let i = 1; i < linie.length; i++) {
      if (abstand(linie[i - 1].x, linie[i - 1].y, linie[i].x, linie[i].y) !== 1) keinNachbar++;
    }
    gleich(keinNachbar, 0, `jeder Schritt in ${ax},${ay} → ${zx},${zy} ist ein Nachbarschritt`);
  }

  /* Kein Feld darf übersprungen werden — sonst blickt man durch eine
     Wand hindurch, ohne sie je gefragt zu haben. */
  for (const [ax, ay, zx, zy] of [[0, 0, 9, 4], [9, 4, 0, 0], [3, 8, 7, 1], [5, 5, 5, 0]]) {
    const linie = linienFelder(ax, ay, zx, zy);
    gleich(linie.length, abstand(ax, ay, zx, zy) + 1, `Länge ${ax},${ay} → ${zx},${zy}`);
    let luecken = 0;
    for (let i = 1; i < linie.length; i++) {
      const dx = Math.abs(linie[i].x - linie[i - 1].x);
      const dy = Math.abs(linie[i].y - linie[i - 1].y);
      if (dx > 1 || dy > 1) luecken++;
    }
    gleich(luecken, 0, `keine Lücke in ${ax},${ay} → ${zx},${zy}`);
  }

  /* Der Kern: Hin und zurück ist dieselbe Linie, nur umgedreht. */
  let ungleich = 0;
  for (let ay = 0; ay < 7; ay++) {
    for (let ax = 0; ax < 7; ax++) {
      for (let zy = 0; zy < 7; zy++) {
        for (let zx = 0; zx < 7; zx++) {
          const hin = linienFelder(ax, ay, zx, zy);
          const her = linienFelder(zx, zy, ax, ay).reverse();
          if (JSON.stringify(hin) !== JSON.stringify(her)) ungleich++;
        }
      }
    }
  }
  gleich(ungleich, 0, "hin und zurück ist dieselbe Linie (2401 Paare)");

  wirft(() => linienFelder(0.5, 0, 3, 0), "halbe Koordinaten werden abgewiesen");
  wirft(() => sichtlinie(flach(), 0, 0, 3, Number.NaN), "NaN wird abgewiesen");
}

/* ── Was eine Sichtlinie aufhält ────────────────────────────────── */

abschnitt("Sichtlinie");
{
  const k = flach();
  gleich(sichtlinie(k, 2, 2, 9, 9), true, "über eine leere Karte sieht man");
  gleich(sichtlinie(k, 2, 2, 2, 2), true, "sich selbst sieht man");
  gleich(sichtlinie(k, 2, 2, 3, 2), true, "den Nachbarn auch");

  k.setze(5, 2, { hindernis: HINDERNIS.wand });
  gleich(sichtlinie(k, 2, 2, 9, 2), false, "eine Wand dazwischen blockt");
  gleich(sichtlinie(k, 9, 2, 2, 2), false, "aus der Gegenrichtung ebenso");
  gleich(sichtlinie(k, 5, 2, 9, 2), true, "wer in der Wand steht, sieht heraus");
  gleich(sichtlinie(k, 2, 2, 5, 2), true, "und wird gesehen");
  gleich(sichtlinie(k, 4, 2, 6, 2), false, "aber hindurch sieht niemand");

  /* Ein Gitter blockt Bewegung, nicht Sicht — der Unterschied ist der
     Grund, warum `blocktSicht` und `blocktBewegung` zwei Listen sind. */
  k.setze(5, 2, { hindernis: HINDERNIS.gitter });
  gleich(sichtlinie(k, 2, 2, 9, 2), true, "durch ein Gitter sieht man hindurch");
  k.setze(5, 2, { hindernis: HINDERNIS.saeule });
  gleich(sichtlinie(k, 2, 2, 9, 2), false, "eine Säule blockt");
  k.setze(5, 2, { hindernis: HINDERNIS.fass });
  gleich(sichtlinie(k, 2, 2, 9, 2), true, "ein Fass deckt, blockt aber nicht die Sicht");
}

/* ── Höhe schlägt Sichtblockade ─────────────────────────────────── */

abschnitt("Höhe");
{
  const k = flach();
  k.setze(5, 5, { ebene: 2 });                 /* eine Kante, kein Hindernis */

  gleich(sichtlinie(k, 3, 5, 7, 5), false, "von Ebene 1 blockt die Ebene-2-Mauer");
  gleich(sichtlinie(k, 7, 5, 3, 5), false, "in beide Richtungen");

  k.setze(3, 5, { ebene: 3 });
  gleich(sichtlinie(k, 3, 5, 7, 5), true, "von Ebene 3 sieht man über die Ebene-2-Mauer");
  gleich(sichtlinie(k, 7, 5, 3, 5), true, "und wer oben steht, wird von unten gesehen");

  /* Eine echte Wand hilft keine Höhe. */
  k.setze(5, 5, { hindernis: HINDERNIS.wand });
  gleich(sichtlinie(k, 3, 5, 7, 5), false, "über eine Wand sieht auch Ebene 3 nicht");
  k.setze(5, 5, { hindernis: HINDERNIS.keins });

  /* Aus dem Graben heraus sieht man fast nichts. */
  k.setze(3, 5, { ebene: 0 });
  k.setze(7, 5, { ebene: 0 });
  gleich(sichtlinie(k, 3, 5, 7, 5), false, "aus dem Graben blockt schon eine Ebene-2-Kante");
}

/* ── Symmetrie über eine ganze Karte ────────────────────────────── */

/* Eine gewürfelte Testkarte: Wände, Säulen, Gitter und alle vier
   Ebenen. Gewürfelt, weil handgemalte Karten immer die Steigungen
   auslassen, an denen es kippt. */
function testkarte(saat, breite = 14, hoehe = 14) {
  const z = macheZufall(saat);
  const k = macheKarte(breite, hoehe);
  for (const { x, y } of alleFelder(k)) {
    k.setze(x, y, {
      ebene: z.trifft(0.30) ? z.ganz(0, 3) : 1,
      hindernis: z.trifft(0.16)
        ? z.ausListe([HINDERNIS.wand, HINDERNIS.saeule, HINDERNIS.gitter])
        : HINDERNIS.keins,
      rampe: z.trifft(0.20) ? z.ganz(1, 4) : RAMPE.keine
    });
  }
  return k;
}

/* Genau der Bau, den `spiel/sicht.mjs` vermeidet: Bresenham von A nach
   Z, ohne das Paar vorher in eine feste Reihenfolge zu bringen. Steht
   hier, um zu belegen, dass diese Testkarte die Frage überhaupt
   stellt. */
function naiveSichtlinie(karte, ax, ay, zx, zy) {
  let x = ax;
  let y = ay;
  const breit = Math.abs(zx - ax);
  const hoch = -Math.abs(zy - ay);
  const schrittX = ax < zx ? 1 : -1;
  const schrittY = ay < zy ? 1 : -1;
  let fehler = breit + hoch;
  const augenEbene = karte.ebeneBei(ax, ay);
  const zielEbene = karte.ebeneBei(zx, zy);
  for (;;) {
    const amEnde = (x === ax && y === ay) || (x === zx && y === zy);
    if (!amEnde && blocktSichtlinie(karte, x, y, augenEbene, zielEbene)) return false;
    if (x === zx && y === zy) return true;
    const doppelt = 2 * fehler;
    if (doppelt >= hoch) { fehler += hoch; x += schrittX; }
    if (doppelt <= breit) { fehler += breit; y += schrittY; }
  }
}

abschnitt("Symmetrie");
{
  const REICHWEITE = 6;
  const k = testkarte(20260906);
  const felder = new Map();
  const begonnen = process.hrtime.bigint();
  for (const { x, y, i } of alleFelder(k)) felder.set(i, sichtfeld(k, x, y, REICHWEITE));
  const dauer = Number(process.hrtime.bigint() - begonnen) / 1e6;

  let einseitig = 0;
  let sichtbar = 0;
  let blockiert = 0;
  let naivEinseitig = 0;
  for (const a of alleFelder(k)) {
    for (const b of alleFelder(k)) {
      if (abstand(a.x, a.y, b.x, b.y) > REICHWEITE) continue;
      const aSiehtB = felder.get(a.i).has(b.i);
      const bSiehtA = felder.get(b.i).has(a.i);
      if (aSiehtB !== bSiehtA) einseitig++;
      else if (aSiehtB) sichtbar++;
      else blockiert++;
      if (naiveSichtlinie(k, a.x, a.y, b.x, b.y) !== naiveSichtlinie(k, b.x, b.y, a.x, a.y)) {
        naivEinseitig++;
      }
    }
  }

  gleich(einseitig, 0, "kein einziges Paar sieht einseitig");
  /* Ohne diese beiden wäre eine Karte ohne jede Wand auch „symmetrisch". */
  behaupte(sichtbar > 5000, `es kommen sichtbare Paare vor (${sichtbar})`);
  behaupte(blockiert > 1000, `es kommen blockierte Paare vor (${blockiert})`);
  /* Die Gegenprobe: Der naive Bau **muss** hier scheitern. */
  behaupte(naivEinseitig > 0,
    `der naive Bau ist auf dieser Karte asymmetrisch (${naivEinseitig} Paare)`);

  messung(`Sichtfelder: ${k.anzahl} Stück, Reichweite ${REICHWEITE}, ${dauer.toFixed(1)} ms`);
  messung(`Paare: ${sichtbar} sichtbar, ${blockiert} blockiert, ${einseitig} einseitig`);
  messung(`naiver Bau ohne feste Paarreihenfolge: ${naivEinseitig} einseitige Paare`);

  /* Und dasselbe noch einmal auf einer anderen Karte, damit nicht eine
     einzelne glückliche Saat den Beweis trägt. */
  for (const saat of [7, 41, 1988]) {
    const andere = testkarte(saat, 11, 11);
    let fehler = 0;
    for (const a of alleFelder(andere)) {
      for (const b of alleFelder(andere)) {
        if (sichtlinie(andere, a.x, a.y, b.x, b.y) !== sichtlinie(andere, b.x, b.y, a.x, a.y)) {
          fehler++;
        }
      }
    }
    gleich(fehler, 0, `Saat ${saat}: jede Sichtlinie gilt in beide Richtungen`);
  }
}

/* ── Das Sichtfeld ──────────────────────────────────────────────── */

abschnitt("Sichtfeld");
{
  const k = flach();
  const eigenes = sichtfeld(k, 6, 6, 0);
  gleich(eigenes.size, 1, "Reichweite 0 sieht nur das eigene Feld");
  behaupte(eigenes.has(k.index(6, 6)), "und dieses immer");

  const drei = sichtfeld(k, 6, 6, 3);
  gleich(drei.size, 49, "auf freier Karte ist Reichweite 3 ein 7×7-Quadrat");
  behaupte(drei.has(k.index(9, 9)), "die Ecke des Quadrats gehört dazu");
  behaupte(!drei.has(k.index(10, 6)), "ein Feld zu weit gehört nicht dazu");

  gleich(sichtfeld(k, -1, 6, 3).size, 0, "von außerhalb der Karte sieht man nichts");

  /* Am Rand wird das Quadrat beschnitten, nicht umgeklappt. */
  const ecke = sichtfeld(k, 0, 0, 2);
  gleich(ecke.size, 9, "in der Ecke bleibt ein Viertel des Quadrats");

  /* Der Schatten hinter einer Wand: Felder fehlen, und zwar dahinter. */
  const w = flach();
  w.setze(6, 4, { hindernis: HINDERNIS.wand });
  const mitWand = sichtfeld(w, 6, 6, 4);
  const ohneWand = sichtfeld(flach(), 6, 6, 4);
  behaupte(mitWand.size < ohneWand.size, "eine Wand nimmt Felder weg");
  behaupte(mitWand.has(w.index(6, 4)), "die Wand selbst sieht man");
  behaupte(!mitWand.has(w.index(6, 3)), "was dahinter liegt, nicht");
  behaupte(mitWand.has(w.index(6, 5)), "was davor liegt, schon");
  messung(`Wandschatten: ${ohneWand.size - mitWand.size} von ${ohneWand.size} Feldern verdeckt`);

  /* Kreuzprobe: `sichtfeld` und `sichtlinie` müssen sich einig sein —
     sonst kann eine der beiden still etwas anderes rechnen. */
  const p = testkarte(1234, 12, 12);
  let uneinig = 0;
  for (const a of alleFelder(p)) {
    const feld = sichtfeld(p, a.x, a.y, 5);
    for (const b of alleFelder(p)) {
      if (abstand(a.x, a.y, b.x, b.y) > 5) continue;
      if (feld.has(b.i) !== sichtlinie(p, a.x, a.y, b.x, b.y)) uneinig++;
    }
  }
  gleich(uneinig, 0, "Sichtfeld und Sichtlinie sagen dasselbe");
}

/* ── Wesen ──────────────────────────────────────────────────────── */

abschnitt("Wesen");
{
  const k = flach(20, 20);
  const held = { id: 1, x: 10, y: 10, lebt: true, sicht: 4 };
  const feld = sichtbarFuer(k, held);
  behaupte(feld.has(k.index(14, 10)), "vier Felder weit sieht er");
  behaupte(!feld.has(k.index(15, 10)), "fünf nicht mehr");

  const ohneWert = sichtbarFuer(k, { id: 2, x: 10, y: 10, lebt: true });
  gleich(ohneWert.size, (2 * SICHT_STANDARD + 1) ** 2,
    "ohne eigene Sichtweite gilt SICHT_STANDARD");
  gleich(sichtbarFuer(k, null).size, 0, "kein Wesen sieht nichts");

  const nah = { id: 2, x: 12, y: 10, lebt: true };
  const fern = { id: 3, x: 18, y: 10, lebt: true };
  const tot = { id: 4, x: 11, y: 10, lebt: false };
  const hinterWand = { id: 5, x: 10, y: 7, lebt: true };
  k.setze(10, 8, { hindernis: HINDERNIS.wand });

  const alle = [held, nah, fern, tot, hinterWand];
  const gesehen = sichtbareWesen(k, held, alle);
  tiefGleich(gesehen.map((w) => w.id), [2], "nur das nahe, lebende, freie Wesen");
  behaupte(!gesehen.includes(held), "sich selbst sieht niemand");

  /* Die Reihenfolge ist die der Liste — die Gegner-KI wählt danach. */
  const zweiterNah = { id: 6, x: 8, y: 10, lebt: true };
  const zwei = sichtbareWesen(k, held, [zweiterNah, nah]);
  tiefGleich(zwei.map((w) => w.id), [6, 2], "die Reihenfolge der Liste bleibt");
  const umgedreht = sichtbareWesen(k, held, [nah, zweiterNah]);
  tiefGleich(umgedreht.map((w) => w.id), [2, 6], "und kehrt sich mit ihr um");

  gleich(sichtbareWesen(k, held, []).length, 0, "eine leere Liste gibt nichts");
  gleich(sichtbareWesen(k, null, alle).length, 0, "ohne Beobachter auch nicht");
}

/* ── Das Regellicht ─────────────────────────────────────────────── */

abschnitt("Licht");
{
  const k = flach(20, 20);
  k.lichter.push({ x: 10, y: 10, art: "fackel", staerke: 1 });
  const f = helligkeitsfeld(k);
  const weite = LICHT_WEITEN.fackel;
  const erwartet = (dx, dy) => 1 - (dx * dx + dy * dy) / (weite * weite);

  nahe(helligkeitBei(f, 10, 10, k), 1, 1e-6, "am Licht selbst volle Stärke");
  nahe(helligkeitBei(f, 12, 10, k), erwartet(2, 0), 1e-6, "zwei Felder: quadratischer Abfall");
  nahe(helligkeitBei(f, 14, 10, k), erwartet(4, 0), 1e-6, "vier Felder ebenso");
  nahe(helligkeitBei(f, 13, 12, k), erwartet(3, 2), 1e-6, "auch schräg zählt der echte Abstand");

  /* Der Abfall ist quadratisch, nicht linear — sonst wäre er hier
     0,6923 statt 0,9053. */
  behaupte(helligkeitBei(f, 12, 10, k) > 1 - 2 / weite + 0.1,
    "zwei Felder neben der Fackel ist es heller als bei linearem Abfall");

  gleich(helligkeitBei(f, 17, 10, k), 0, "jenseits der Reichweite ist es dunkel");
  gleich(helligkeitBei(f, 10, 3, k), 0, "und weiter weg erst recht");
  gleich(helligkeitBei(f, -1, 10, k), 0, "außerhalb der Karte ist es dunkel");
  gleich(helligkeitBei(null, 10, 10, k), 0, "ohne Feld ist es dunkel");
  gleich(f.length, k.anzahl, "das Feld hat ein Maß je Kartenfeld");
  behaupte(f instanceof Float32Array, "und ist ein Float32Array");
}

abschnitt("Licht und Wände");
{
  const k = flach(20, 20);
  k.setze(10, 8, { hindernis: HINDERNIS.wand });
  k.lichter.push({ x: 10, y: 10, art: "fackel", staerke: 1 });
  const f = helligkeitsfeld(k);

  behaupte(helligkeitBei(f, 10, 9, k) > 0.5, "vor der Wand ist es hell");
  behaupte(helligkeitBei(f, 10, 8, k) > 0.5, "die Wand selbst wird angeleuchtet");
  gleich(helligkeitBei(f, 10, 7, k), 0, "hinter der Wand kommt kein Licht an");
  gleich(helligkeitBei(f, 10, 6, k), 0, "und dahinter auch nicht");
  behaupte(helligkeitBei(f, 12, 10, k) > 0.5, "seitlich an der Wand vorbei schon");

  /* Ein Gitter hält kein Licht auf — es hält nur Füße auf. */
  const g = flach(20, 20);
  g.setze(10, 8, { hindernis: HINDERNIS.gitter });
  g.lichter.push({ x: 10, y: 10, art: "fackel", staerke: 1 });
  behaupte(helligkeitBei(helligkeitsfeld(g), 10, 7, g) > 0.4,
    "durch ein Gitter fällt Licht");

  /* Und die Höhe wirft denselben Schatten wie für das Auge. */
  const h = flach(20, 20);
  h.setze(10, 8, { ebene: 2 });
  h.lichter.push({ x: 10, y: 10, art: "fackel", staerke: 1 });
  const fh = helligkeitsfeld(h);
  gleich(helligkeitBei(fh, 10, 7, h), 0, "über eine Ebene-2-Kante fällt kein Licht");
  behaupte(helligkeitBei(fh, 10, 8, h) > 0.5, "die Kante selbst liegt im Schein");
}

abschnitt("Lichter zusammen");
{
  const k = flach(20, 20);
  k.lichter.push({ x: 8, y: 10, art: "fackel", staerke: 1 });
  const eins = helligkeitBei(helligkeitsfeld(k), 12, 10, k);
  k.lichter.push({ x: 16, y: 10, art: "fackel", staerke: 1 });
  const zwei = helligkeitBei(helligkeitsfeld(k), 12, 10, k);
  behaupte(zwei > eins, "zwei Fackeln sind heller als eine");

  /* Gedeckelt wird erst am Ende — zwei volle Lichter geben genau 1. */
  const d = flach(20, 20);
  d.lichter.push({ x: 10, y: 10, art: "fackel", staerke: 1 });
  d.lichter.push({ x: 10, y: 10, art: "fackel", staerke: 1 });
  gleich(helligkeitBei(helligkeitsfeld(d), 10, 10, d), 1, "mehr als voll hell wird es nicht");

  /* Zusatzlichter zählen wie Kartenlichter, nur später. */
  const z = flach(20, 20);
  const nurZusatz = helligkeitsfeld(z, [{ x: 10, y: 10, art: "fackel", staerke: 1 }]);
  gleich(helligkeitBei(nurZusatz, 10, 10, z), 1, "ein Zusatzlicht leuchtet auch");
  gleich(helligkeitBei(helligkeitsfeld(z), 10, 10, z), 0, "ohne Licht bleibt es schwarz");

  /* Reichweite: aus der Art, aus dem Eintrag, oder der Standardwert. */
  const r = flach(24, 24);
  const gold = helligkeitsfeld(r, [{ x: 12, y: 12, art: "gold", staerke: 1 }]);
  gleich(helligkeitBei(gold, 12 + Math.ceil(LICHT_WEITEN.gold), 12, r), 0,
    "eine goldene Glut reicht nur zweieinhalb Felder");
  const eigen = helligkeitsfeld(r, [{ x: 12, y: 12, art: "gold", staerke: 1, weite: 9 }]);
  behaupte(helligkeitBei(eigen, 12 + 5, 12, r) > 0,
    "eine eigene Reichweite im Eintrag schlägt die der Art");
  const unbekannt = helligkeitsfeld(r, [{ x: 12, y: 12, art: "irrlicht", staerke: 1 }]);
  behaupte(helligkeitBei(unbekannt, 12 + 3, 12, r) > 0,
    "eine unbekannte Lichtart leuchtet mit der Standardreichweite");
  gleich(helligkeitBei(unbekannt, 12 + Math.ceil(LICHT_WEITE_STANDARD), 12, r), 0,
    "und nicht weiter");

  /* Stärke 0 und Lichter außerhalb der Karte richten nichts an. */
  gleich(helligkeitBei(helligkeitsfeld(r, [{ x: 12, y: 12, art: "fackel", staerke: 0 }]),
    12, 12, r), 0, "ein Licht ohne Stärke leuchtet nicht");
  gleich(helligkeitBei(helligkeitsfeld(r, [{ x: -3, y: 12, art: "blitz", staerke: 1 }]),
    0, 12, r), 0, "ein Licht außerhalb der Karte leuchtet nicht herein");
}

/* ── Verborgen im Dunkeln ───────────────────────────────────────── */

abschnitt("Verborgen");
{
  gleich(SICHT_IM_DUNKELN, 2, "im Dunkeln sieht man zwei Felder weit");
  nahe(VERBORGEN_UNTER, 0.25, 1e-12, "dunkel ist unter 0,25");

  const k = flach(24, 24);
  const dunkel = helligkeitsfeld(k);
  const ziel = { id: 2, x: 12, y: 12, lebt: true };

  gleich(istVerborgen(k, dunkel, { x: 10, y: 12 }, ziel), false,
    "auf zwei Feldern ist im Dunkeln niemand verborgen");
  gleich(istVerborgen(k, dunkel, { x: 12, y: 12 }, ziel), false,
    "auf dem eigenen Feld erst recht nicht");
  gleich(istVerborgen(k, dunkel, { x: 9, y: 12 }, ziel), true,
    "auf drei Feldern schon");
  gleich(istVerborgen(k, dunkel, { x: 7, y: 12 }, ziel), true,
    "auf fünf Feldern ist ein Wesen im Dunkeln verborgen");
  gleich(istVerborgen(k, dunkel, { x: 8, y: 8 }, ziel), true,
    "schräg gilt dieselbe Elle");

  /* Im Licht hilft die Entfernung nicht. */
  const hell = flach(24, 24);
  hell.lichter.push({ x: 12, y: 12, art: "fackel", staerke: 1 });
  const feldHell = helligkeitsfeld(hell);
  gleich(istVerborgen(hell, feldHell, { x: 7, y: 12 }, ziel), false,
    "im Fackelschein ist auf fünf Feldern niemand verborgen");

  /* Der Handel des Spiels: Wer die Fackel trägt, leuchtet sich selbst
     an — und wird damit auf jede Entfernung sichtbar. */
  const traeger = { id: 3, x: 12, y: 12, lebt: true };
  const mitFackel = helligkeitsfeld(k, [{ x: traeger.x, y: traeger.y, art: "fackel", staerke: 1 }]);
  gleich(istVerborgen(k, mitFackel, { x: 7, y: 12 }, traeger), false,
    "ein Fackelträger ist nie verborgen");
  gleich(istVerborgen(k, mitFackel, { x: 2, y: 2 }, traeger), false,
    "auch quer über die Karte nicht");

  /* Die Schwelle selbst: genau 0,25 ist nicht dunkler als 0,25. */
  const genau = flach(24, 24);
  genau.lichter.push({ x: 12, y: 12, art: "gold", staerke: VERBORGEN_UNTER });
  const feldGenau = helligkeitsfeld(genau);
  gleich(helligkeitBei(feldGenau, 12, 12, genau), VERBORGEN_UNTER, "genau 0,25 hell");
  gleich(istVerborgen(genau, feldGenau, { x: 7, y: 12 }, ziel), false,
    "genau 0,25 ist nicht dunkler als 0,25");

  gleich(istVerborgen(k, dunkel, null, ziel), false, "ohne Beobachter ist nichts verborgen");
  gleich(istVerborgen(k, dunkel, { x: 0, y: 0 }, null), false, "ohne Ziel auch nicht");
}

/* ── Die Reichweiten stimmen mit der Palette überein ────────────── */

abschnitt("Lichtweiten");
{
  const text = readFileSync(new URL("../runtime/palette.js", import.meta.url), "utf8");
  const von = text.indexOf("export const LICHT_ARTEN");
  const bis = text.indexOf("\n};", von);
  behaupte(von >= 0 && bis > von, "LICHT_ARTEN ist in runtime/palette.js zu finden");

  const ausPalette = new Map();
  for (const treffer of text.slice(von, bis).matchAll(/(\w+):\s*\{[^}]*?weite:\s*([\d.]+)/g)) {
    ausPalette.set(treffer[1], Number(treffer[2]));
  }
  gleich(ausPalette.size, Object.keys(LICHT_WEITEN).length,
    "gleich viele Lichtarten hier wie in der Palette");
  for (const [art, weite] of ausPalette) {
    gleich(LICHT_WEITEN[art], weite, `Reichweite "${art}" wie in runtime/palette.js`);
  }
}

/* ── Gleichlauf ─────────────────────────────────────────────────── */

abschnitt("Gleichlauf");
{
  /* Eine Karte mit Wänden, Höhen **und** Lichtern — sonst vergleicht
     der Gleichlauf lauter Nullen miteinander. */
  const baue = (saat) => {
    const k = testkarte(saat, 16, 16);
    const z = macheZufall(saat ^ 0x5f5f);
    for (let n = 0; n < 6; n++) {
      k.lichter.push({
        x: z.ganz(0, k.breite - 1),
        y: z.ganz(0, k.hoehe - 1),
        art: z.ausListe(Object.keys(LICHT_WEITEN)),
        staerke: z.zwischen(0.4, 1)
      });
    }
    return k;
  };

  const bytes = (feldA) => Array.from(new Uint8Array(feldA.buffer, feldA.byteOffset,
    feldA.byteLength)).join(",");

  const a = helligkeitsfeld(baue(20260906));
  const b = helligkeitsfeld(baue(20260906));
  gleich(bytes(a), bytes(b), "zweimal dieselbe Karte gibt byteweise dasselbe Lichtfeld");

  const c = helligkeitsfeld(baue(7));
  behaupte(bytes(c) !== bytes(a), "eine andere Saat gibt ein anderes Lichtfeld");

  /* Das Feld darf nicht einförmig sein, sonst prüft der Vergleich
     nichts: Es muss helle, halbhelle und dunkle Felder geben. */
  let dunkel = 0;
  let halb = 0;
  let voll = 0;
  for (const wert of a) {
    if (wert === 0) dunkel++;
    else if (wert >= 1) voll++;
    else halb++;
  }
  behaupte(dunkel > 0, `es gibt dunkle Felder (${dunkel})`);
  behaupte(halb > 20, `es gibt halbhelle Felder (${halb})`);
  messung(`Lichtfeld 16×16: ${dunkel} dunkel, ${halb} halbhell, ${voll} voll`);

  /* Auch das Sichtfeld muss zweimal dasselbe geben — es ist ein Set,
     also wird die Reihenfolge mitverglichen. */
  const k1 = testkarte(41, 13, 13);
  const k2 = testkarte(41, 13, 13);
  const reihe = (k) => {
    const teile = [];
    for (const { x, y } of alleFelder(k)) teile.push([...sichtfeld(k, x, y, 5)].join("."));
    return teile.join("|");
  };
  gleich(reihe(k1), reihe(k2), "zweimal dieselbe Karte gibt dieselben Sichtfelder");
  behaupte(reihe(k1) !== reihe(testkarte(42, 13, 13)),
    "eine andere Karte gibt andere Sichtfelder");
}

ende("Sicht und Licht");
