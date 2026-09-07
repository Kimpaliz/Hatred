/* [Aufgabe: Regelkern] Die spielrelevante Helligkeit — wie hell ein
   Feld nach den **Regeln** ist und wer darum im Dunkeln verborgen steht.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Es gibt in diesem Spiel zwei Lichter, und sie dürfen nicht dieselbe
   Datei sein. Das eine ist das schöne: warmer Schein, Flackern,
   weiche Ränder, Farbe je Lichtart — das rechnet später
   `runtime/licht.js`, es darf jede Bildwiederholung anders aussehen
   und interessiert niemanden außer dem Auge. Das andere ist dieses:
   eine Zahl je Feld, aus der eine **Regel** wird — „dieses Wesen ist
   verborgen, du kannst es nicht beschießen". Eine Regel darf nicht
   flackern. Flackerte sie, wäre ein Ziel je nach Bildwiederholung
   treffbar oder nicht, und vier Rechner im Netz-Koop kämen zu
   verschiedenen Antworten über dieselbe Runde.

   Deshalb ist hier alles zeitlos: keine Uhr, kein Flackern, keine
   Zufallszahl. Dieselbe Karte gibt dasselbe `Float32Array`, byteweise.

   **Warum quadratisch mit endlicher Reichweite.** Das echte
   Abstandsgesetz (1/d²) taugt hier nicht: Bei d = 0 ist es unendlich,
   und schon zwei Felder neben einer Fackel wäre es dunkler als die
   Verborgen-Schwelle — eine Fackel, die nichts beleuchtet. Gerechnet
   wird deshalb `1 − d² / weite²`: voll am Licht, quadratisch fallend,
   genau an der Reichweite bei null. Das Quadrat des Abstands ist dabei
   `dx·dx + dy·dy` und damit eine **ganze** Zahl — es kommt keine
   Wurzel vor, die zwischen zwei Rechnern anders runden könnte.

   **Warum Licht dieselbe Sichtlinie benutzt wie das Auge.** Ohne diese
   Prüfung leuchtet eine Fackel durch die Wand, und ein Wesen im
   Nebenraum stünde plötzlich im Hellen. `sichtlinie` bringt außerdem
   die Höhenregel mit: Eine Ebene-2-Kante wirft für ein Licht auf
   Ebene 1 denselben Schatten wie für ein Auge auf Ebene 1. Zwei
   verschiedene Antworten auf dieselbe Frage wären genau die Sorte
   Regel, die auseinanderläuft.

   **Warum Fackelträger sich selbst anleuchten.** Wer eine Fackel
   trägt, wird als Zusatzlicht auf seinem eigenen Feld gereicht; dort
   ist d = 0 und damit die volle Stärke. Das ist der Handel, den dieses
   Spiel anbietet: Licht sehen heißt gesehen werden.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/gitter.mjs` (`karte.lichter`, `abstand`), `spiel/sicht.mjs`
   (`sichtlinie` — Licht wird von denselben Feldern aufgehalten wie der
   Blick), `spiel/kampf.mjs` und `spiel/gegner-ki.mjs` (fragen
   `istVerborgen`, bevor sie ein Ziel zulassen), `runtime/licht.js` (das
   schöne Licht; es darf weicher malen, muss aber dieselben
   Reichweiten benutzen — siehe `LICHT_WEITEN`). */

import { abstand } from "./gitter.mjs";
import { sichtlinie } from "./sicht.mjs";

/* Wie weit man ein Wesen im Dunkeln überhaupt noch ausmacht. Nicht 0,
   weil sonst jemand direkt vor der Nase unsichtbar wäre; nicht mehr,
   weil Dunkelheit sonst kein Versteck ist. */
export const SICHT_IM_DUNKELN = 2;

/* Unter dieser Helligkeit gilt ein Feld als dunkel. Als benannte Zahl
   und nicht als 0.25 im Text, damit die Prüfung dieselbe Zahl liest
   wie die Regel — sonst prüft sie am Ende nur sich selbst. */
export const VERBORGEN_UNTER = 0.25;

/* Die Reichweite je Lichtart, in Feldern. Dieselben Zahlen stehen in
   `runtime/palette.js` als `LICHT_ARTEN[...].weite` für das Bild.
   Doppelt, weil `spiel/` nichts aus `runtime/` importieren darf — der
   Kern muss auch ohne Browserschicht rechnen. Damit sie nicht
   auseinanderlaufen, vergleicht `werkzeuge/pruefe-sicht.mjs` beide
   Listen Zahl für Zahl: Wer eine ändert, wird von der Prüfkette an die
   andere erinnert. Ein Feld darf nicht hell aussehen und trotzdem als
   dunkel gelten. */
export const LICHT_WEITEN = {
  fackel: 6.5,
  feuer: 5.0,
  lava: 3.5,
  schleim: 3.0,
  arkan: 5.0,
  gift: 4.0,
  gold: 2.5,
  auge: 2.0,
  blitz: 9.0
};

/* Für ein Licht, dessen Art hier nicht steht. Lieber ein kleiner
   bekannter Schein als ein Licht, das lautlos gar nicht leuchtet. */
export const LICHT_WEITE_STANDARD = 4.0;

/* Die Reichweite eines einzelnen Lichts. Ein Eintrag darf seine eigene
   `weite` mitbringen — ein Zauber ist kein Katalogeintrag. */
function weiteVon(licht) {
  if (Number.isFinite(licht.weite)) return licht.weite;
  const ausArt = LICHT_WEITEN[licht.art];
  return Number.isFinite(ausArt) ? ausArt : LICHT_WEITE_STANDARD;
}

/* Die Helligkeit jedes Feldes, 0 bis 1, als `Float32Array` in
   Feldreihenfolge.

   `zusatzLichter` sind die Lichter, die nicht in der Karte stehen:
   Fackelträger, brennende Fässer, Zauber. Sie haben dieselbe Form wie
   `karte.lichter` — `{x, y, art, staerke}`, dazu wahlweise `weite`.

   Ein Feld ohne Licht ist **0**, nicht `GRUNDHELLE`. Die 0,16 aus
   `runtime/palette.js` sind der Boden des Bildes, damit der Spieler
   das Gelände noch erkennt; in der Regel wäre ein solcher Boden eine
   heimliche Grundbeleuchtung, gegen die man die Verborgen-Schwelle
   nicht mehr sauber setzen könnte.

   Die Lichter werden in fester Reihenfolge aufaddiert — erst die der
   Karte, dann die zusätzlichen, jeweils in Listenreihenfolge. Addition
   von Gleitkommazahlen ist nicht verschiebbar, und genau deshalb steht
   die Reihenfolge fest: Sie ist der Unterschied zwischen „gleiches
   Ergebnis" und „fast gleiches Ergebnis". */
export function helligkeitsfeld(karte, zusatzLichter = []) {
  const feld = new Float32Array(karte.anzahl);
  const alle = [];
  for (const licht of karte.lichter || []) alle.push(licht);
  for (const licht of zusatzLichter || []) alle.push(licht);

  for (const licht of alle) {
    if (!licht || !karte.drin(licht.x, licht.y)) continue;
    const staerke = Number.isFinite(licht.staerke) ? Math.max(0, licht.staerke) : 1;
    if (staerke <= 0) continue;
    const weite = weiteVon(licht);
    if (!(weite > 0)) continue;

    const weiteQuadrat = weite * weite;
    /* Kein Feld weiter als `weite` kann getroffen sein, und wer mehr
       als `weite` in einer Achse abliegt, liegt auch insgesamt weiter
       weg — der Kasten ist also nicht zu klein. */
    const kasten = Math.floor(weite);
    for (let y = licht.y - kasten; y <= licht.y + kasten; y++) {
      for (let x = licht.x - kasten; x <= licht.x + kasten; x++) {
        if (!karte.drin(x, y)) continue;
        const dx = x - licht.x;
        const dy = y - licht.y;
        const entfernungQuadrat = dx * dx + dy * dy;
        if (entfernungQuadrat >= weiteQuadrat) continue;
        if (!sichtlinie(karte, licht.x, licht.y, x, y)) continue;
        feld[karte.index(x, y)] += staerke * (1 - entfernungQuadrat / weiteQuadrat);
      }
    }
  }

  /* Erst ganz am Ende deckeln. Würde je Licht gedeckelt, hinge das
     Ergebnis daran, welches Licht zuerst in der Liste steht. */
  for (let i = 0; i < feld.length; i++) if (feld[i] > 1) feld[i] = 1;
  return feld;
}

/* Die Helligkeit eines einzelnen Feldes. Außerhalb der Karte ist es
   dunkel — dort steht ohnehin eine Wand. */
export function helligkeitBei(feld, x, y, karte) {
  if (!feld || !karte || !karte.drin(x, y)) return 0;
  const i = karte.index(x, y);
  return i >= 0 && i < feld.length ? feld[i] : 0;
}

/* Steht `ziel` für `beobachter` im Dunkeln?

   Zwei Bedingungen, und beide müssen zutreffen: Das Feld des Ziels ist
   dunkler als `VERBORGEN_UNTER` **und** es liegt weiter als
   `SICHT_IM_DUNKELN` Felder weg. Das „und" ist die ganze Regel — ohne
   die Entfernung wäre jeder unbeleuchtete Winkel ein Versteck, auch
   Auge in Auge, und ohne die Helligkeit könnte man sich mitten im
   Fackelschein verstecken.

   Gemessen wird in derselben Schachbrett-Elle wie das Sichtfeld
   (`abstand`), damit „außer Sichtweite" und „im Dunkeln" nicht
   zwei verschiedene Kreise um dasselbe Wesen ziehen.

   `helligkeit` ist das Feld aus `helligkeitsfeld` — es wird gereicht
   und nicht hier gerechnet, weil es je Zug **einmal** entsteht und
   danach für jedes Paar von Wesen befragt wird. */
export function istVerborgen(karte, helligkeit, beobachter, ziel) {
  if (!beobachter || !ziel) return false;
  const hell = helligkeitBei(helligkeit, ziel.x, ziel.y, karte);
  if (hell >= VERBORGEN_UNTER) return false;
  return abstand(beobachter.x, beobachter.y, ziel.x, ziel.y) > SICHT_IM_DUNKELN;
}
