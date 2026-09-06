/* [Aufgabe: Bild] Die Kamera: rechnet zwischen Feld, Weltpunkt und
   Bildschirm um — mit ganzzahliger Vergrößerung und ganzzahliger Lage.

   ── Warum die Vergrößerung eine ganze Zahl sein muss ───────────────

   Ein Faktor wie 2,7 legt jede zweite Kachelkante auf einen halben
   Bildpunkt. Der Browser glättet dann die Kante weg, und aus harter
   Pixelgrafik wird ein weiches Bild — der Fehler, an dem diese Art
   Grafik stirbt (Fehlerbuch D1). `Math.floor`, mindestens 1: lieber
   ein schwarzer Rand am Fenster als eine weiche Kante.

   Aus demselben Grund wird die **Lage** vor dem Zeichnen gerundet, und
   zwar in Weltpunkten, nicht in Bildschirmpunkten. Der Unterschied ist
   der ganze Witz: Rundet man erst nach der Vergrößerung, kann eine
   Figur um zwei Bildschirmpunkte gegen das Kachelraster verschoben
   stehen — bei Vergrößerung 4 also um einen halben logischen Punkt.
   Man sieht es nicht sofort, aber das Bild „wackelt" beim Laufen.

   ── Warum die Kamera weich folgt, aber hart springt ────────────────

   Weich, weil ein Sprung bei jedem Zugwechsel den Blick verliert: Wer
   nicht sieht, **wohin** die Kamera gegangen ist, muss sich auf der
   Karte neu zurechtfinden. Hart auf ganze Punkte, weil die Weichheit
   nur die *innere* Zahl betreffen darf. Die innere Zahl läuft mit
   Nachkommastellen weiter und wird erst beim Herausgeben gerundet —
   rundet man sie selbst, bleibt die Kamera einen Punkt vor dem Ziel
   stehen, weil der nächste Schritt auf null rundet.

   ── Warum der kleinste sichtbare Ausschnitt aus dem Kern kommt ─────

   Die Vergrößerung entscheidet, wie viel man sieht — und wie viel man
   sehen **muss**, ist eine Regel: Ein Spieler, der weniger überblickt,
   als seine Figur weit sieht, kann nicht planen. Also wird die
   Untergrenze aus dem Heldenkatalog gerechnet (`WEITESTE_SICHT`) statt
   als Zahl hingeschrieben. Kommt eine Klasse mit weiterem Blick dazu,
   wächst der Ausschnitt von selbst mit.

   Das ist keine Regel, die hier entschieden wird: Die Sichtweite steht
   im Kern, diese Datei liest sie nur.

   ── Warum das Rütteln nicht an den Kartenrand geklemmt wird ────────

   Die Lage wird auf die Karte begrenzt, der Rüttelversatz kommt
   **danach** obendrauf. Sonst verschluckt genau der Rand das Rütteln —
   und der Sturz von der Kante am Kartenrand ist der Augenblick, in dem
   man den Schlag am dringendsten sehen will. `runtime/zeichnen.js`
   malt den Grund (`FARBEN.leere`) unter die Welt; die wenigen Punkte,
   die dabei über den Rand hinausgehen, sind schwarz und nicht leer.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/licht.js` (`KACHEL` — die 16 steht dort und nicht hier noch
   einmal), `spiel/katalog/helden.mjs` (`sicht` je Klasse, daraus der
   kleinste Ausschnitt), `spiel/gitter.mjs` (die Karte, deren `breite`
   und `hoehe` die Weltmaße geben), `runtime/zeichnen.js` und
   `runtime/oberflaeche.js` (fragen `sichtbareFelder`, `feldNachBild`,
   `vergroesserung`), `runtime/eingabe.js` (`bildNachFeld` für den
   Mauszeiger), `runtime/schrift.js` (bekommt `vergroesserung` als
   `gross`) und `werkzeuge/pruefe-schrift.mjs`, das jede Zahl hier
   nachrechnet. Entscheidet selbst keine Regel. */

import { KACHEL } from "./licht.js";
import { HELDEN } from "../spiel/katalog/helden.mjs";

/* Die weiteste Sicht aller Heldenklassen — gemessen, nicht geschätzt.
   `node werkzeuge/pruefe-schrift.mjs` druckt die Zahl mit. */
export const WEITESTE_SICHT = HELDEN.reduce((weit, klasse) => Math.max(weit, klasse.sicht), 0);

/* So viele Felder müssen in die kürzere Fensterkante passen: einmal
   die volle Sicht nach jeder Seite, dazu das Feld, auf dem die Figur
   steht. Daran hängt die Vergrößerung. */
export const MINDEST_FELDER = 2 * WEITESTE_SICHT + 1;
export const MINDEST_KANTE = MINDEST_FELDER * KACHEL;

/* Wie viel vom Rückstand die Kamera je Sekunde aufholt. 0,995 heißt:
   nach einer Sekunde ist ein halbes Prozent übrig, bei 16 Punkten je
   Feld also weniger als ein Zehntel Bildpunkt — angekommen. Bei 60
   Bildern je Sekunde sind das 8,45 % je Bild, nach einer Viertelsekunde
   73,4 % des Weges. Beide Zahlen rechnet `pruefe-schrift.mjs` nach. */
const FOLGE_JE_SEKUNDE = 0.995;

/* Näher als ein Viertel Bildpunkt ist nichts mehr zu sehen; dann wird
   das Ziel genommen. Ohne dieses Aufsetzen nähert sich die Kamera
   ewig an, und „ist sie angekommen?" hätte keine Antwort. */
const SCHNAPP = 0.25;

/* Zwei Frequenzen, die nicht ineinander aufgehen: Ein einzelner Sinus
   wäre ein Schaukeln, zwei ergeben ein Zucken. In Bogenmaß je Sekunde,
   also rund 6,5 und 4,6 Schwingungen — schnell genug für einen Schlag,
   langsam genug, dass bei 60 Bildern je Sekunde kein Flimmern entsteht. */
const RUETTEL_SCHNELL = 41.0;
const RUETTEL_LANGSAM = 29.0;
const RUETTEL_PHASE = 1.7;

/* Die ganzzahlige Vergrößerung für eine Fenstergröße. Steht als eigene
   Funktion da, damit die Oberfläche sie fragen kann, **bevor** es eine
   Karte gibt (Vorschau, Lobby). */
export function vergroesserungFuer(fensterBreite, fensterHoehe) {
  const kuerzere = Math.min(fensterBreite, fensterHoehe);
  if (!Number.isFinite(kuerzere) || kuerzere <= 0) return 1;
  return Math.max(1, Math.floor(kuerzere / MINDEST_KANTE));
}

export function macheKamera({ fensterBreite, fensterHoehe, karte }) {
  if (!karte || !Number.isInteger(karte.breite) || !Number.isInteger(karte.hoehe)) {
    throw new Error("macheKamera: eine Karte mit ganzzahliger Breite und Höhe muss herein");
  }

  /* Die weichen Zahlen bleiben in der Hülle. Nach außen gibt es nur
     `eckeX`/`eckeY`, und die sind immer ganz — so kann niemand aus
     Versehen mit einer Bruchzahl zeichnen. */
  let zielX = (karte.breite * KACHEL) / 2;
  let zielY = (karte.hoehe * KACHEL) / 2;
  let weichX = zielX;
  let weichY = zielY;
  let ruettelRest = 0;
  let ruettelDauer = 0;
  let ruettelStaerke = 0;
  let versatzX = 0;
  let versatzY = 0;

  /* Wie viele Weltpunkte das Fenster breit ist. `ceil`, weil eine halb
     angeschnittene Spalte am Rand trotzdem gezeichnet werden muss —
     sonst blitzt dort ein schwarzer Streifen. */
  function sichtBreite() { return Math.ceil(kamera.fensterBreite / kamera.vergroesserung); }
  function sichtHoehe() { return Math.ceil(kamera.fensterHoehe / kamera.vergroesserung); }

  function setzeFenster(breite, hoehe) {
    kamera.fensterBreite = Math.max(1, Math.round(breite));
    kamera.fensterHoehe = Math.max(1, Math.round(hoehe));
    kamera.vergroesserung = vergroesserungFuer(kamera.fensterBreite, kamera.fensterHoehe);
    lege();
    return kamera.vergroesserung;
  }

  /* Der Kameraschritt eines Bildes. `x`/`y` sind **Felder**, gern mit
     Nachkommastellen — eine Figur mitten im Schritt steht auf 3,5.
     `sofort` setzt ohne Weichzeichnen um (Zugbeginn, Sprung), `dt` ist
     die vergangene Zeit in Sekunden; sie macht die Bewegung unabhängig
     davon, wie schnell der Rechner Bilder liefert. */
  function folge(x, y, sofort = false, dt = 1 / 60) {
    zielX = x * KACHEL + KACHEL / 2;
    zielY = y * KACHEL + KACHEL / 2;
    if (sofort) {
      weichX = zielX;
      weichY = zielY;
    } else {
      const anteil = anteilFuer(dt);
      weichX += (zielX - weichX) * anteil;
      weichY += (zielY - weichY) * anteil;
      if (Math.abs(zielX - weichX) < SCHNAPP) weichX = zielX;
      if (Math.abs(zielY - weichY) < SCHNAPP) weichY = zielY;
    }
    ruettelSchritt(dt);
    lege();
    return kamera;
  }

  /* Treffer, Sturz, berstendes Fass. `staerke` in Weltpunkten, `dauer`
     in Sekunden. Ein zweiter Schlag während eines laufenden macht ihn
     stärker und länger, nie schwächer und nie kürzer — sonst schnitte
     ein Nadelstich die Erschütterung einer Explosion ab. */
  function ruettle(staerke, dauer) {
    if (!(staerke > 0) || !(dauer > 0)) return kamera;
    ruettelStaerke = Math.max(ruettelStaerke, staerke);
    ruettelDauer = Math.max(dauer, ruettelRest);
    ruettelRest = ruettelDauer;
    return kamera;
  }

  /* Feld → Bildschirm, linke obere Ecke des Feldes. Erst in Weltpunkten
     runden, dann vergrößern: So liegt jede Figur auf demselben Raster
     wie der Boden unter ihr. */
  function feldNachBild(feldX, feldY) {
    return {
      x: (Math.round(feldX * KACHEL) - kamera.eckeX) * kamera.vergroesserung,
      y: (Math.round(feldY * KACHEL) - kamera.eckeY) * kamera.vergroesserung
    };
  }

  /* Bildschirm → Feld, für den Mauszeiger. `floor`, nicht `round`:
     Gefragt ist, auf welchem Feld der Punkt **liegt**, und das gilt auch
     links und oberhalb der Karte, wo die Zahlen negativ werden. */
  function bildNachFeld(punktX, punktY) {
    return {
      x: Math.floor((punktX / kamera.vergroesserung + kamera.eckeX) / KACHEL),
      y: Math.floor((punktY / kamera.vergroesserung + kamera.eckeY) / KACHEL)
    };
  }

  /* Welche Felder das Fenster berührt, beide Enden eingeschlossen und
     auf die Karte begrenzt. `rand` gibt einen Kranz dazu, für Dinge,
     die über ihr Feld hinausragen. */
  function sichtbareFelder(rand = 0) {
    const zusatz = Math.max(0, Math.trunc(rand));
    return {
      vonX: Math.max(0, Math.floor(kamera.eckeX / KACHEL) - zusatz),
      vonY: Math.max(0, Math.floor(kamera.eckeY / KACHEL) - zusatz),
      bisX: Math.min(karte.breite - 1,
        Math.floor((kamera.eckeX + sichtBreite() - 1) / KACHEL) + zusatz),
      bisY: Math.min(karte.hoehe - 1,
        Math.floor((kamera.eckeY + sichtHoehe() - 1) / KACHEL) + zusatz)
    };
  }

  /* Der Anteil des Rückstands, der in `dt` Sekunden aufgeholt wird.
     Über die Potenz und nicht linear, damit zwei halbe Schritte
     dasselbe ergeben wie ein ganzer — sonst hinge die Kamerafahrt an
     der Bildrate. */
  function anteilFuer(dt) {
    if (!(dt > 0)) return 0;
    return 1 - Math.pow(1 - FOLGE_JE_SEKUNDE, dt);
  }

  function ruettelSchritt(dt) {
    if (ruettelRest <= 0) {
      versatzX = 0;
      versatzY = 0;
      return;
    }
    ruettelRest = Math.max(0, ruettelRest - Math.max(0, dt));
    if (ruettelRest === 0) {
      ruettelStaerke = 0;
      versatzX = 0;
      versatzY = 0;
      return;
    }
    /* Linear abklingend, und nur aus der Zeit gerechnet: Zweimal
       dieselbe Zeitfolge gibt dasselbe Bild — nur so lässt sich ein
       Bildschirmfoto nachstellen. Kein Zufall im Bild. */
    const abfall = ruettelRest / ruettelDauer;
    const seit = ruettelDauer - ruettelRest;
    versatzX = Math.round(ruettelStaerke * abfall * Math.sin(seit * RUETTEL_SCHNELL));
    versatzY = Math.round(ruettelStaerke * abfall
      * Math.sin(seit * RUETTEL_LANGSAM + RUETTEL_PHASE));
  }

  /* Die einzige Stelle, an der `eckeX`/`eckeY` entstehen: gerundet,
     auf die Karte begrenzt, danach der Rüttelversatz. Ist die Karte
     kleiner als das Fenster, wird sie mittig gestellt statt geklemmt —
     sonst klebte eine kleine Karte in der linken oberen Ecke. */
  function lege() {
    kamera.eckeX = kanteFuer(weichX, sichtBreite(), kamera.weltBreite) + versatzX;
    kamera.eckeY = kanteFuer(weichY, sichtHoehe(), kamera.weltHoehe) + versatzY;
  }

  function kanteFuer(mitte, sicht, welt) {
    const spanne = welt - sicht;
    if (spanne <= 0) return Math.round(spanne / 2);
    return Math.min(spanne, Math.max(0, Math.round(mitte - sicht / 2)));
  }

  /* Alles, was von außen zu sehen ist. Die Zahlen stehen **nur** hier
     und nicht zusätzlich in der Hülle: zwei Stellen für dieselbe Zahl
     wären zwei Wahrheiten. Und es sind gebundene Funktionen, kein
     `this` — `const { feldNachBild } = kamera` muss weiterlaufen, sonst
     stolpert die Zeichenschleife an einer Stelle, die harmlos aussieht. */
  const kamera = {
    karte,
    weltBreite: karte.breite * KACHEL,
    weltHoehe: karte.hoehe * KACHEL,
    fensterBreite: 1,
    fensterHoehe: 1,
    vergroesserung: 1,
    eckeX: 0,
    eckeY: 0,
    sichtBreite, sichtHoehe, setzeFenster, folge, ruettle,
    feldNachBild, bildNachFeld, sichtbareFelder
  };

  setzeFenster(fensterBreite, fensterHoehe);
  return kamera;
}
