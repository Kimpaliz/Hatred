/* [Aufgabe: Regelkern] Erreichbarkeit — kommt man überall hin?

   ── Warum eine eigene, unterste Datei ──────────────────────────────

   Zwei Hälften des Kartenbaus fragen dasselbe: `landschaft.mjs`, wenn
   es Rampen setzt und Nebenräume verfüllt, und `ausstattung.mjs`, wenn
   es prüft, ob ein Fass gerade den einzigen Weg verstopft hat.

   Läge die Antwort in einer der beiden, müsste die andere sie von dort
   holen — und weil `landschaft.mjs` die Ausstattung ohnehin aufruft,
   wäre das ein Ringschluss. Der bricht im Bündler
   (`werkzeuge/eine-datei.mjs`) ab, weil die Reihenfolge dann nicht mehr
   eindeutig ist. Eine dritte Datei unter beiden löst es ohne Kunstgriff.

   ⚠️ **Hier wird nicht nachgerechnet, sondern gefragt.** Die Kosten
   kommen aus `spiel/hoehen.mjs`. Eine eigene Kopie der Höhenregeln an
   dieser Stelle wäre ein zweites Regelwerk, und zwei Regelwerke laufen
   auseinander (Fehlerbuch E2) — nur merkt es hier niemand, weil eine
   Karte, die „laut Prüfung" begehbar ist, im Spiel trotzdem eine
   Sackgasse hat.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/hoehen.mjs` (die echten Laufkosten), `spiel/kachelhilfe.mjs`,
   `spiel/gitter.mjs`. Gelesen von `spiel/landschaft.mjs`,
   `spiel/ausstattung.mjs` und `werkzeuge/pruefe-landschaft.mjs`. */

import { richtungen } from "./gitter.mjs";
import { laufKosten } from "./hoehen.mjs";
import { PIXEL_JE_FELD } from "./bauart.mjs";

/* Bildpunkte je Kachel — der Kürzel, der hier oft gebraucht wird. */
const P = PIXEL_JE_FELD;
import {
  spalte, zeile, offen, gebiete, alleDabei, gegen, plateaus
} from "./kachelhilfe.mjs";

/* Die billigsten Laufkosten von den Quellen zu jedem Feld; -1 heißt
   unerreichbar. Eimer statt Halde: Ein Schritt kostet 1 bis 3, die
   Eimer bleiben flach, und nichts hängt an einer Sortierung, die zwei
   Rechner verschieden auflösen (Fehlerbuch B2). */
export function laufKostenFeld(karte, quellen) {
  const kosten = new Int32Array(karte.anzahl).fill(-1);
  const eimer = [[]];
  for (const q of quellen) {
    if (!karte.drin(q.x, q.y) || karte.blocktBewegung(q.x, q.y)) continue;
    const i = karte.index(q.x, q.y);
    if (kosten[i] < 0) { kosten[i] = 0; eimer[0].push(i); }
  }
  for (let stand = 0; stand < eimer.length; stand++) {
    for (const i of eimer[stand]) {
      if (kosten[i] !== stand) continue;
      const x = spalte(karte, i), y = zeile(karte, i);
      for (const r of richtungen(y)) {
        const nx = x + r.dx, ny = y + r.dy;
        const preis = karte.drin(nx, ny) ? laufKosten(karte, x, y, nx, ny) : null;
        if (preis === null) continue;
        const j = ny * karte.breite + nx, neu = stand + preis;
        if (kosten[j] >= 0 && kosten[j] <= neu) continue;
        kosten[j] = neu;
        while (eimer.length <= neu) eimer.push([]);
        eimer[neu].push(j);
      }
    }
  }
  return kosten;
}

/* Was von den Quellen aus mit den **echten** Schrittregeln erreichbar
   ist. `rueckwaerts` dreht jede Kante um: Dann steht da, von wo aus
   man die Quelle erreicht. Beides wird gebraucht, weil hinab überall
   geht und hinauf nur über eine Rampe — die Grube, aus der man nicht
   mehr herauskommt, ist genau die vorwärts erreichbare Kachel, die
   rückwärts nicht erreichbar ist. `fenster` begrenzt die Suche auf
   einen Kasten, damit `zierErlaubt` nicht die halbe Karte flutet. */
export function erreichbareFelder(karte, quellen, rueckwaerts = false, fenster = null) {
  const gut = new Uint8Array(karte.anzahl);
  const drin = (x, y) => karte.drin(x, y) && !karte.blocktBewegung(x, y) && (!fenster ||
    (Math.abs(x - fenster.x) <= fenster.weite && Math.abs(y - fenster.y) <= fenster.weite));
  const stapel = [];
  for (const q of quellen) {
    const i = karte.index(q.x, q.y);
    if (!drin(q.x, q.y) || gut[i]) continue;
    gut[i] = 1;
    stapel.push(i);
  }
  while (stapel.length) {
    const i = stapel.pop();
    const x = spalte(karte, i), y = zeile(karte, i);
    for (const r of richtungen(y)) {
      const nx = x + r.dx, ny = y + r.dy;
      if (!drin(nx, ny) || gut[ny * karte.breite + nx]) continue;
      const geht = rueckwaerts
        ? laufKosten(karte, nx, ny, x, y) : laufKosten(karte, x, y, nx, ny);
      if (geht === null) continue;
      gut[ny * karte.breite + nx] = 1;
      stapel.push(ny * karte.breite + nx);
    }
  }
  return gut;
}

/* Hin **und** zurück. Alles andere ist eine Falle mit Aussicht. */
export function beidseitigErreichbar(karte, quellen, fenster = null) {
  const hin = erreichbareFelder(karte, quellen, false, fenster);
  const her = erreichbareFelder(karte, quellen, true, fenster);
  for (let i = 0; i < hin.length; i++) hin[i] = hin[i] && her[i] ? 1 : 0;
  return hin;
}

/* ═══ Erreichbarkeit — mit den echten Regeln ════════════════════════════════
   Zusammenhängende offene Gebiete **ohne** Höhenregeln — die grobe
   Frage („liegt Fels dazwischen?"); die feine stellt `erreichbareFelder`. */
export function offeneGebiete(karte) {
  return gebiete(karte, (i) => offen(karte, i), alleDabei);
}

/* (c) Die Nur-Diagonale in **einem** Zweierblock: (x,y) und (x+1,y+1)
   offen, (x+1,y) und (x,y+1) gesperrt — oder über die andere
   Diagonale. Im Bild ein Durchgang, im Spiel keiner, denn hier wird in
   vier Richtungen gegangen. Gefragt wird nach `offen` und nicht nach
   „ist Wand": Säule und Fass sperren genauso. Mehr als ein Fund je
   Block ist unmöglich — die zweite Diagonale bräuchte offen, was die
   erste gesperrt verlangt. */
export function diagonalFund(karte, x, y) {
  if (x < 0 || y < 0 || x + 1 >= karte.breite || y + 1 >= karte.hoehe) return null;
  const a = y * karte.breite + x, b = a + 1, c = a + karte.breite, d = c + 1;
  for (const [p, q, w1, w2] of [[a, d, b, c], [b, c, a, d]]) {
    if (!offen(karte, p) || !offen(karte, q)) continue;
    if (offen(karte, w1) || offen(karte, w2)) continue;
    return { p, q, w1, w2 };
  }
  return null;
}

/* Alle Nur-Diagonalen der Karte, in fester Reihenfolge. Die Prüfung
   behauptet über dieselbe Liste, die der Erzeuger abarbeitet — sonst
   gäbe es zwei Auslegungen desselben Begriffs. */
export function nurDiagonalen(karte) {
  const funde = [];
  for (let y = 0; y < karte.hoehe - 1; y++) {
    for (let x = 0; x < karte.breite - 1; x++) {
      const fund = diagonalFund(karte, x, y);
      if (fund) funde.push(fund);
    }
  }
  return funde;
}

/* Das größte Plateau — von dort wird geflutet. Die erste offene Kachel
   liegt am oberen Rand, oft in einer Nische; dann hinge die ganze
   Rampensetzung an einer Ecke der Karte. */
export function groesstesPlateauFeld(karte) {
  const { nummer, groessen } = plateaus(karte);
  let beste = -1;
  for (let m = 0; m < groessen.length; m++) {
    if (beste < 0 || groessen[m] > groessen[beste]) beste = m;
  }
  for (let i = 0; beste >= 0 && i < karte.anzahl; i++) if (nummer[i] === beste) return i;
  return -1;
}

/* Die Mitte einer Kachel in Bildpunkten — als Funktion, damit die
   eine Umrechnung nicht an sieben Stellen verschieden dasteht. */
export const kachelMitte = (k) => k * P + P / 2;
