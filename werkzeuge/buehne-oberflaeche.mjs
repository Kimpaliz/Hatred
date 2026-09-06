/* [Aufgabe: Prüfwesen] Die Probestellung und die zwei Mitschriften, mit
   denen die Anzeige ohne Browser gemessen wird.

   ── Warum das eine eigene Datei ist ────────────────────────────────

   Zwei Prüfungen messen an derselben Anzeige: `pruefe-oberflaeche.mjs`
   misst, **was** dasteht, und `pruefe-felder.mjs` misst, **wo** man
   hintippen kann. Beide brauchen dieselbe Stellung — eine Karte ohne
   Zufall, in der Höhenvorteil, Deckung und Sichtlinie feststehen.

   Zweimal aufgeschrieben liefe sie auseinander: Die eine Prüfung
   bekäme eine andere Karte als die andere, beide blieben grün, und die
   Zahlen in ihren Meldungen meinten verschiedene Spiele. Deshalb steht
   die Stellung **einmal** hier.

   Der Name beginnt bewusst nicht mit `pruefe-`: `pruefe-alles.mjs`
   startet jede Datei dieses Musters als eigene Prüfung, und eine
   „Prüfung", die nichts behauptet, wäre für immer grün.

   ── Warum zwei Mitschriften ────────────────────────────────────────

   Die Anzeige macht zwei Sorten Fehler, und keine sieht man im fertigen
   Bild sofort:

   1. **Fehler der Geometrie** — etwas liegt auf einem halben Bildpunkt
      oder ragt aus dem Fenster (Fehlerbuch D1). Die fängt das
      mitschreibende Zeichenblatt: In der Mitschrift ist es eine Zahl mit
      Komma und ein Rechteck mit x = -3.
   2. **Fehler der Sprache** — ein leerer Text, ein englisches Wort, ein
      Zeichen, das die Pixelschrift gar nicht kennt und als Kasten malt.
      Die fängt nur eine Mitschrift der **Texte**, und die gibt es, weil
      `macheOberflaeche` die Schrift hereingereicht bekommt statt sie
      sich zu holen.

   ── Warum die Probestellung von Hand gebaut ist ────────────────────

   `macheLauf` würfelt Karte und Brut. Für „genau drei Punkte" und
   „genau +12 %" braucht es aber eine Stellung, in der jede Zahl
   feststeht. Die Karte wird deshalb von Hand gesetzt — die Prüfungen
   lassen **zusätzlich** alles einmal über einen echten Lauf laufen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/pruefe-oberflaeche.mjs` und `werkzeuge/pruefe-felder.mjs`
   (beide messen hierüber), `runtime/oberflaeche.js` (das Geprüfte),
   `runtime/schrift.js` und `runtime/kamera.js` (hereingereicht),
   `spiel/gitter.mjs`, `spiel/wesen.mjs`, `spiel/zug.mjs` und
   `spiel/zufall.mjs` (die Stellung). */

import { macheKarte } from "../spiel/gitter.mjs";
import { macheWesen } from "../spiel/wesen.mjs";
import { macheOrdnung } from "../spiel/zug.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { macheKamera } from "../runtime/kamera.js";
import * as SCHRIFT from "../runtime/schrift.js";
import { macheOberflaeche } from "../runtime/oberflaeche.js";

/* ── Die zwei Mitschriften ──────────────────────────────────────────*/

export function macheErsatzflaeche() {
  const rechtecke = [];
  const glaettung = [];
  /* `aufrufe` hält zusätzlich die **Reihenfolge** fest. Ohne sie ließe
     sich nicht behaupten, dass die Glättung abgeschaltet wird, *bevor*
     der erste Punkt fällt — und genau das ist die Regel aus dem
     Bildvertrag. Zwei getrennte Listen wären hier zu wenig. */
  const aufrufe = [];
  let farbe = "#000000";
  return {
    rechtecke,
    glaettung,
    aufrufe,
    set imageSmoothingEnabled(wert) { glaettung.push(wert); aufrufe.push(["glaettung", wert]); },
    get imageSmoothingEnabled() { return false; },
    set fillStyle(wert) { farbe = wert; },
    get fillStyle() { return farbe; },
    fillRect(x, y, b, h) {
      rechtecke.push({ x, y, b, h, farbe });
      aufrufe.push(["rechteck", x, y, b, h, farbe]);
    }
  };
}

/* Die echte Schrift, nur mit einem Zettel davor: Gezeichnet wird, was
   auch im Spiel gezeichnet würde — mitgeschrieben wird zusätzlich der
   Text, den kein Rechteck mehr verrät. */
export function macheErsatzschrift() {
  const texte = [];
  return {
    texte,
    ZEICHEN_BREIT: SCHRIFT.ZEICHEN_BREIT,
    ZEICHEN_HOCH: SCHRIFT.ZEICHEN_HOCH,
    ABSTAND: SCHRIFT.ABSTAND,
    VORSCHUB: SCHRIFT.VORSCHUB,
    ZEILE: SCHRIFT.ZEILE,
    breiteVon: SCHRIFT.breiteVon,
    zeichne(ctx, text, x, y, farbe, wahlen = {}) {
      texte.push({ text: String(text), x, y, farbe, gross: wahlen.gross || 1 });
      return SCHRIFT.zeichne(ctx, text, x, y, farbe, wahlen);
    }
  };
}

export const ganzzahlig = (r) => [r.x, r.y, r.b, r.h].every(Number.isInteger);
export const draussen = (r, breite, hoehe) =>
  r.x < 0 || r.y < 0 || r.x + r.b > breite || r.y + r.h > hoehe;
export const mitFarbe = (rechtecke, farbe) => rechtecke.filter((r) => r.farbe === farbe);

/* ── Die Probestellung ──────────────────────────────────────────────

   Eine Karte ohne Zufall: alles Ebene 1, ein Plateau auf Ebene 2 unter
   dem Schützen. Damit stehen Höhenvorteil, Deckung und Sichtlinie fest,
   und jede Zahl der Zielangabe lässt sich von Hand nachrechnen. */
const SCHUETZE = {
  schluessel: "spaeher", lpMax: 20, apMax: 6, flinkheit: 9,
  ruestung: 0, sicht: 8, waffe: "kurzbogen", faehigkeiten: []
};
const BEUTE = {
  schluessel: "kraetzling", lpMax: 10, apMax: 6, flinkheit: 5,
  ruestung: 0, sicht: 6, waffe: "rostdolch", faehigkeiten: []
};
const TOTER = {
  schluessel: "grubenhund", lpMax: 12, apMax: 6, flinkheit: 7,
  ruestung: 0, sicht: 6, waffe: "hetzerbiss", faehigkeiten: []
};
const LETZTER = {
  schluessel: "knochendiener", lpMax: 14, apMax: 6, flinkheit: 3,
  ruestung: 0, sicht: 5, waffe: "richtschwert", faehigkeiten: []
};

export function macheProbe({ hoeheDesSchuetzen = 2, weitWeg = false } = {}) {
  const karte = macheKarte(40, 30);
  karte.saat = 4711;
  /* Zwei Fackeln, und das ist keine Zierde: `spiel/aktionen.mjs` gibt
     einen Angriff nur frei, wenn das Ziel **erkannt** ist, und im
     Dunkeln ist es das nicht (`spiel/licht.mjs`, `VERBORGEN_UNTER`).
     Ohne Licht stünde in der Aktionsleiste kein Angriff, und die
     Prüfung der Preise prüfte einen Fall, den es im Spiel nicht gibt. */
  karte.lichter = [
    { x: 6, y: 5, art: "fackel", staerke: 1 },
    { x: 8, y: 6, art: "fackel", staerke: 1 }
  ];
  /* Das Plateau: nur das Feld des Schützen liegt höher. Ein größeres
     Plateau brächte eine Kante ins Bild, die niemand braucht — und die
     Prüfung soll den Höhenvorteil messen, nicht die Landschaft. */
  karte.setze(5, 5, { ebene: hoeheDesSchuetzen });

  const schuetze = macheWesen(SCHUETZE, { id: 1, seite: "jaeger", x: 5, y: 5, spielerPlatz: 1 });
  schuetze.traenke = 1;
  const beute = macheWesen(BEUTE, { id: 2, seite: "brut", x: 8, y: 5 });
  const toter = macheWesen(TOTER, { id: 3, seite: "brut", x: 6, y: 8 });
  toter.lebt = false;
  toter.lp = 0;
  const letzter = macheWesen(LETZTER, {
    id: 4, seite: "brut", x: weitWeg ? 38 : 7, y: weitWeg ? 28 : 9
  });

  const wesen = [schuetze, beute, toter, letzter];
  const zustand = {
    saat: 4711, tiefe: 1, karte, zufall: macheZufall(4711),
    wesen,
    nachId: new Map(wesen.map((w) => [w.id, w])),
    runde: 1,
    /* Über `macheOrdnung`, damit die Reihe die echte ist: Flinkheit 9,
       7, 5, 3 ergibt genau [1, 3, 2, 4] — der Tote steht an zweiter
       Stelle und damit sichtbar in der Zugleiste. */
    ordnung: macheOrdnung(wesen),
    amZug: 0,
    seiteDran: "jaeger",
    spieler: [{ platz: 1, name: "Jannik", wesenId: 1 }],
    vorbei: null,
    protokoll: [],
    ereignisse: []
  };
  return { zustand, schuetze, beute, toter, letzter, karte };
}

export function macheBuehne(zustand, { fenster = 400, folgeAuf = null } = {}) {
  const ctx = macheErsatzflaeche();
  const schrift = macheErsatzschrift();
  const kamera = macheKamera({
    fensterBreite: fenster, fensterHoehe: fenster, karte: zustand.karte
  });
  const ziel = folgeAuf || { x: zustand.wesen[0].x, y: zustand.wesen[0].y };
  kamera.folge(ziel.x, ziel.y, true);
  const flaeche = macheOberflaeche({ ctx, schrift, kamera });
  return { ctx, schrift, kamera, flaeche };
}

export const alleTexte = (schrift) => schrift.texte.map((t) => t.text);
export const enthaelt = (schrift, teil) => alleTexte(schrift).some((t) => t.includes(teil));

