/* [Aufgabe: Bild] Der Weltzeichner: Boden, Höhenkanten, Flüssigkeiten,
   Wände, Figuren und Merker — alles auf ganzen Bildpunkten.

   ── Warum diese Datei über das ganze Spiel entscheidet ─────────────

   Das Spielfeld hat vier Höhenebenen, und daran hängt jede Regel:
   Wer hinauf will, braucht eine Rampe; wer hinabspringt, stürzt; wer
   oben steht, trifft besser. Nichts davon ist im Bild zu sehen —
   „exakt von oben" heißt: keine Perspektive, kein Versatz, keine
   Schräge. Höhe entsteht hier allein aus drei Mitteln, und alle drei
   sind Pflicht (Bildvertrag):

   1. **Grundhelligkeit je Ebene** — `EBENEN_TON` aus der Palette.
   2. **Harte schwarze Schattenkante nach Süden**, `STUFEN_SCHATTEN`
      Bildpunkte je Stufe Unterschied, ohne jeden Verlauf.
   3. **Helle Oberkante** von einem Bildpunkt an der Nordkante des
      höheren Feldes.

   Fällt eines der drei weg, sieht der Spieler die Kante nicht, läuft
   in einen Sturz und hält das Spiel für kaputt — das ganze
   Höhensystem wäre umsonst gebaut. Deshalb misst
   `werkzeuge/pruefe-zeichnen.mjs` genau diese Balken nach, statt sie
   zu glauben.

   Rampen bekommen darum auch drei Querstriche, die zur Aufstiegsseite
   hin heller werden: Eine Rampe, der man nicht ansieht, wohin sie
   führt, ist die eine Auskunft, ohne die man nicht planen kann.

   ── Warum hier nichts zufällig ist ─────────────────────────────────

   Kein `Math.random`. Die Risse im Boden kommen aus `ganzHash` über
   Feldlage und `karte.saat`, die Wellen der Flüssigkeiten aus der
   **gereichten** Zeit. Wer den Boden je Bild neu auswürfelt, bekommt
   einen Kerker, der flimmert — und einen Bildschirmfoto-Bericht, den
   niemand nachstellen kann. Zweimal dieselbe Zeit gibt dieselbe
   Aufrufliste, und genau das prüft die Prüfdatei.

   ── Warum jedes Rechteck ganzzahlig ist ────────────────────────────

   Ein `fillRect` auf 12,5 lässt den Browser glätten, und die
   Pixelgrafik ist dahin (Fehlerbuch D1). Deshalb rechnet `kasten`
   ausschließlich in ganzen Bildpunkten: Die Kamera liefert eine
   ganzzahlige Ecke und eine ganzzahlige Vergrößerung, der Versatz
   innerhalb des Feldes ist ganz, und das Ergebnis kann gar nicht
   krumm werden. Ebenso wird `imageSmoothingEnabled` nicht einmal
   gesetzt, sondern **nach jedem** Setzen der Blattmaße erneut — das
   Setzen der Größe stellt die Eigenschaft zurück.

   ── Warum runtime hier keine Regel entscheidet ─────────────────────

   Diese Datei fragt die Karte, was auf einem Feld liegt, und
   `spiel/hoehen.mjs`, wohin eine Rampe führt. Sie entscheidet nichts:
   kein Schaden, keine Sicht, keine Wegsuche. Was sichtbar ist, kommt
   als Menge von Feldnummern herein — gerechnet hat sie
   `spiel/sicht.mjs`.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/palette.js` (jede Farbe, `bodenTon`, `STUFEN_SCHATTEN`,
   `ERINNERT_HELLE`), `runtime/licht.js` (`KACHEL`, `LICHTPUNKT`, und
   das Lichtwerk, das über die fertige Welt gelegt wird),
   `runtime/partikel.js` (Glut aus Lava, Tropfen aus Schleim),
   `runtime/sprites.js` und `runtime/sprite-daten.js` (Figuren, Dinge,
   Zeichen), `runtime/kamera.js` (Ecke, Vergrößerung, sichtbarer
   Ausschnitt), `spiel/gitter.mjs` (die Feldwerte), `spiel/hoehen.mjs`
   (`rampeZeigtNach`), `spiel/rauschen.mjs` (`ganzHash` für die Risse)
   und `werkzeuge/pruefe-zeichnen.mjs`, das jeden Aufruf mitschreibt
   und nachmisst. */

import {
  FARBEN, BODEN_FARBEN, FLUESSIG_FARBEN, EBENEN_TON, STUFEN_SCHATTEN,
  ERINNERT_HELLE, abdunkeln, bodenTon, mische
} from "./palette.js";
import { KACHEL, LICHTPUNKT } from "./licht.js";
import { SCHLEIM_RAMPE } from "./partikel.js";
import { DINGE, GEGNER_BILDER, HELDEN_BILDER, SPIELER_FARBEN, ZEICHEN } from "./sprite-daten.js";
import { RICHTUNG_NORD, bildAnzahl, macheSpriteBild } from "./sprites.js";
import { BLOCKT_SICHT, FLUESSIG, HINDERNIS, RAMPE, richtungen } from "../spiel/gitter.mjs";
import { rampeZeigtNach } from "../spiel/hoehen.mjs";
import { ganzHash } from "../spiel/rauschen.mjs";

/* ── Die Maße dieses Zeichners ──────────────────────────────────────

   `KACHEL` und `LICHTPUNKT` stehen in `runtime/licht.js` und werden
   hier nur geholt — zwei Dateien mit je eigener 16 wären zwei
   Wahrheiten. Was hier steht, ist allein die Formensprache der
   Wände, Rampen und Risse. */

/* Wie viele Bildpunkte einer Wand ihre nach Süden gewandte Flanke
   einnimmt. Ohne die Flanke ist eine Wand von oben nur eine hellere
   Fläche; mit ihr bekommt der Raum eine Kante, an der das Auge
   entlangläuft. Vier von sechzehn: schmaler wäre bei Vergrößerung 2
   nicht mehr zu sehen, breiter fräße das Feld auf. */
export const WAND_FLANKE = 4;

/* Um wie viele Stufen eine Wand höher zählt als ihr eigenes Feld —
   für Schattenbalken und Oberkante. Eine Wand auf Ebene 1 wirft
   sonst denselben Schatten wie ein Bodenfeld, nämlich keinen, und
   ein Raum ohne Wandschatten liest sich als Fläche. */
export const WAND_STUFEN = 1;

/* Wie viele von hundert Feldern einen Riss tragen. Gemessen an einer
   Karte in `werkzeuge/pruefe-zeichnen.mjs`: Bei 18 hat etwa jedes
   fünfte Feld eine Zeichnung — genug, dass die Fläche lebt, zu wenig,
   als dass sie unruhig würde. */
export const RISS_ANTEIL = 18;

/* Die drei Querstriche einer Rampe: Lage auf der Aufstiegsachse,
   Länge und Rand quer dazu, und die drei Mischanteile zur hellen
   Steinkante — der erste gehört immer zur **Aufstiegsseite**. */
export const RAMPEN_STRICHE = 3;
export const STRICH_LAGEN = [3, 7, 11];
export const STRICH_LAENGE = 10;
export const STRICH_RAND = 3;
export const STRICH_HELLE = [0.85, 0.55, 0.28];

/* Die bewegte Oberfläche. `WELLE_SCHWELLE` entscheidet, welcher
   Lichtblock einen helleren Ton bekommt, `GLANZ_SCHWELLE`, wo ein
   Glanzpunkt von zwei mal zwei Bildpunkten sitzt. Gerastert wird auf
   `LICHTPUNKT`, damit Wasser und Licht dieselbe Körnung haben. */
export const WELLE_SCHWELLE = 0.35;
export const GLANZ_SCHWELLE = 0.85;
export const WELLE_TEIL = 0.30;
const WELLE_TEMPO = 1.7;
const WELLE_QUER = 0.9;
const WELLE_LAENGS = 1.3;
const WELLE_ZWEIT = 0.7;

/* Wie oft Lava und Schleim Teilchen ausstoßen und wie viele Felder
   davon je Takt zum Zug kommen. Ohne Takt spuckt jedes Bild jedes
   Lavafeld — bei sechzig Bildern je Sekunde wäre der Vorrat in einer
   Sekunde dreimal überschrieben und nichts anderes mehr zu sehen. */
export const GLUT_TAKT = 0.25;
export const QUELL_ANTEIL = 12;

/* Wie lange ein Bild einer Bildfolge steht (Fackeln). */
const BILD_TAKT = 0.18;

/* Welcher Eintrag aus `DINGE` zu welchem Hindernis gehört. Die
   Reihenfolge ist **genau** die der Zahlen in `spiel/gitter.mjs`;
   `werkzeuge/pruefe-zeichnen.mjs` vergleicht die Länge, damit ein
   neues Hindernis nicht ohne Bild bleibt. `wand` steht auf `null`,
   weil eine Wand kein Sprite ist, sondern ein Block aus Oberseite und
   Südflanke — ein Wandsprite müsste für jede Nachbarschaft anders
   aussehen, und das sind sechzehn Raster für eine Fläche. */
export const DING_NAMEN = [
  null,            /* keins        */
  null,            /* wand         */
  "saeule",
  "fass",
  "kiste",
  "spiess",
  "altar",
  "gitter",
  "fackelsockel",
  "sarg",
  "truheZu"
];

/* ── Farben, einmal gerechnet ───────────────────────────────────────

   `bodenTon` und `mische` zerlegen Zeichenketten und setzen sie neu
   zusammen. Bei tausend sichtbaren Feldern und sechzig Bildern je
   Sekunde wären das Millionen Zeichenketten in der Minute — und zwar
   immer dieselben zwei Dutzend. Also gemerkt statt gerechnet. */

const bodenSpeicher = new Map();
const ebenenSpeicher = new Map();
const mischSpeicher = new Map();
const gedaempftSpeicher = new Map();

function bodenFarbe(bodenArt, ebene, zweit) {
  const schluessel = (bodenArt * EBENEN_TON.length + ebene) * 2 + (zweit ? 1 : 0);
  let wert = bodenSpeicher.get(schluessel);
  if (wert === undefined) {
    wert = bodenTon(bodenArt, ebene, zweit);
    bodenSpeicher.set(schluessel, wert);
  }
  return wert;
}

/* Ein beliebiger Ton auf einer Ebene — für Risse, Wände und
   Flüssigkeiten, die `bodenTon` nicht abdeckt. Dieselbe Rampe, damit
   ein Riss nicht auf Ebene 3 dunkler wirkt als der Boden daneben. */
function ebenenTon(hex, ebene) {
  const stufe = Math.max(0, Math.min(EBENEN_TON.length - 1, ebene));
  const schluessel = `${hex}|${stufe}`;
  let wert = ebenenSpeicher.get(schluessel);
  if (wert === undefined) {
    wert = abdunkeln(hex, EBENEN_TON[stufe]);
    ebenenSpeicher.set(schluessel, wert);
  }
  return wert;
}

function mischTon(hexA, hexB, teil) {
  const schluessel = `${hexA}|${hexB}|${teil}`;
  let wert = mischSpeicher.get(schluessel);
  if (wert === undefined) {
    wert = mische(hexA, hexB, teil);
    mischSpeicher.set(schluessel, wert);
  }
  return wert;
}

/* Der Nebel des Krieges für **erinnerte** Felder. Nicht über
   Durchsichtigkeit: Ein halbdurchsichtiger Schleier lässt den Browser
   Zwischentöne mischen, die in keiner Palette stehen. Stattdessen
   wird jeder Ton mit `ERINNERT_HELLE` abgedunkelt — dieselbe Farbe,
   nur dunkler, und die Kanten bleiben hart. */
function ton(hex, gedaempft) {
  if (!gedaempft) return hex;
  let wert = gedaempftSpeicher.get(hex);
  if (wert === undefined) {
    wert = abdunkeln(hex, ERINNERT_HELLE);
    gedaempftSpeicher.set(hex, wert);
  }
  return wert;
}

/* ── Sprites als Streifen ───────────────────────────────────────────

   Ein Sprite hat 15 × 15 Bildpunkte; als einzelne Rechtecke wären das
   bis zu 225 Aufrufe je Figur. Nebeneinanderliegende Bildpunkte
   derselben Farbe werden deshalb zu **einem** Rechteck zusammengelegt
   — verlustfrei, weil ein Streifen genau dieselbe Fläche in derselben
   Farbe füllt. Die Zerlegung hängt nur am Raster und wird darum
   einmal je Sprite, Richtung und Spielerfarbe gemerkt. */

const spriteSpeicher = new Map();

function streifenVon(sprite, richtung, spielerFarbe, bildNummer) {
  let fach = spriteSpeicher.get(sprite);
  if (fach === undefined) {
    fach = new Map();
    spriteSpeicher.set(sprite, fach);
  }
  const schluessel = `${richtung}|${spielerFarbe ? spielerFarbe.name : "-"}|${bildNummer}`;
  let fertig = fach.get(schluessel);
  if (fertig !== undefined) return fertig;

  const bild = macheSpriteBild(sprite, richtung, spielerFarbe || SPIELER_FARBEN[0], bildNummer);
  const streifen = [];
  for (let y = 0; y < bild.hoehe; y++) {
    let x = 0;
    while (x < bild.breite) {
      const farbe = bild.punkte[y * bild.breite + x];
      if (!farbe) { x++; continue; }
      let bis = x + 1;
      while (bis < bild.breite && bild.punkte[y * bild.breite + bis] === farbe) bis++;
      streifen.push({ x, y, breite: bis - x, farbe });
      x = bis;
    }
  }
  fertig = { breite: bild.breite, hoehe: bild.hoehe, streifen };
  fach.set(schluessel, fertig);
  return fertig;
}

/* ── Fragen an die Karte ────────────────────────────────────────────*/

/* Die **bildliche** Höhe eines Feldes: seine Ebene, und eine Stufe
   mehr, wenn dort eine Wand oder Säule steht. Genau die beiden
   blocken auch die Sicht — deshalb wird `BLOCKT_SICHT` gefragt und
   keine zweite Liste geführt, die auseinanderlaufen kann.
   Außerhalb der Karte gilt −1: dort steht nichts, was Schatten wirft
   (Fehlerbuch A1). */
export function hoeheBei(karte, x, y) {
  if (!karte.drin(x, y)) return -1;
  const i = karte.index(x, y);
  return karte.ebene[i] + (BLOCKT_SICHT.has(karte.hindernis[i]) ? WAND_STUFEN : 0);
}

/* Oberseite und Südflanke einer Wand. Beide aus der Steinreihe der
   Palette, beide auf der Ebenenrampe — die Flanke ist der dunkelste
   Stein, die Oberseite der hellste. Der Abstand zwischen beiden ist
   gemessen: `node werkzeuge/pruefe-zeichnen.mjs` druckt ihn. */
export function wandTon(ebene, flanke) {
  return ebenenTon(flanke ? FARBEN.stein0 : FARBEN.stein3, ebene);
}

/* Eine Menge sichtbarer Felder darf ein `Set` von Feldnummern sein
   (so gibt `spiel/sicht.mjs` sie) oder eine Reihe, in der die
   Feldnummer der Platz ist (`Uint8Array`). `null` heißt **alles
   sichtbar** — das braucht die Kartenansicht, die keinen Nebel hat. */
function istDrin(menge, i) {
  if (menge === null || menge === undefined) return true;
  if (typeof menge.has === "function") return menge.has(i);
  return menge[i] === 1 || menge[i] === true;
}

/* Die Welle einer Flüssigkeitsoberfläche an einem Lichtblock. Zwei
   Sinusse mit unrundem Verhältnis, wie beim Flackern des Lichts: Ein
   einzelner Sinus atmet sichtbar im Takt. Reine Funktion von Lage und
   gereichter Zeit — kein Zähler, keine Zufallszahl. */
function wellenWert(punktX, punktY, zeit) {
  const eins = Math.sin(zeit * WELLE_TEMPO + punktX * WELLE_QUER + punktY * WELLE_LAENGS);
  const zwei = Math.sin(zeit * WELLE_TEMPO * WELLE_ZWEIT - punktX * 0.5 + punktY * 0.8);
  return eins * 0.5 + zwei * 0.5;
}

/* ── Der Zeichner ───────────────────────────────────────────────────*/

export function macheZeichner({ ctx, kamera, lichtwerk = null, partikelwerk = null }) {
  if (!ctx || typeof ctx.fillRect !== "function") {
    throw new Error("macheZeichner: eine Zeichenfläche muss gereicht werden");
  }
  if (!kamera || typeof kamera.feldNachBild !== "function") {
    throw new Error("macheZeichner: eine Kamera muss gereicht werden");
  }

  let letzteFarbe = null;
  let letzteKarte = null;
  let letzteZeit = null;
  let letzterTakt = null;
  let rechtecke = 0;

  /* `fillStyle` nur setzen, wenn sich die Farbe wirklich ändert. Das
     ist kein Geiz: Jedes Setzen zerlegt eine Zeichenkette, und der
     Boden zeichnet dieselbe Farbe hundertfach hintereinander. */
  function farbe(wert) {
    if (wert !== letzteFarbe) {
      ctx.fillStyle = wert;
      letzteFarbe = wert;
    }
  }

  /* Das einzige Rechteck dieser Datei. `schirmX`/`schirmY` sind die
     ganzzahlige Bildschirmecke des Feldes, `dx`/`dy`/`breite`/`hoehe`
     zählen in **logischen** Bildpunkten innerhalb des Feldes. So kann
     kein Aufrufer versehentlich mit einer Bruchzahl zeichnen, und die
     Vergrößerung steht an genau einer Stelle. */
  function kasten(schirmX, schirmY, dx, dy, breite, hoehe, wert) {
    if (breite <= 0 || hoehe <= 0) return;
    const gross = kamera.vergroesserung;
    farbe(wert);
    ctx.fillRect(schirmX + dx * gross, schirmY + dy * gross, breite * gross, hoehe * gross);
    rechtecke++;
  }

  /* Die Maße des Zeichenblattes setzen — und **danach** die Glättung
     abschalten. Das Setzen von `width` stellt sowohl
     `imageSmoothingEnabled` als auch `fillStyle` zurück; wer nur beim
     Anlegen einmal abschaltet, malt nach der ersten Fenstergrößen-
     änderung weich (Fehlerbuch D1). */
  function setzeFenster(breite, hoehe) {
    const blatt = ctx.canvas;
    if (blatt) {
      blatt.width = Math.max(1, Math.round(breite));
      blatt.height = Math.max(1, Math.round(hoehe));
    }
    ctx.imageSmoothingEnabled = false;
    letzteFarbe = null;
    return kamera.setzeFenster(breite, hoehe);
  }

  /* Der Grund unter der Welt. Nicht durchsichtig lassen: Was neben der
     Karte liegt, ist die Leere und nicht das, was vorher dort stand. */
  function leere() {
    ctx.imageSmoothingEnabled = false;
    farbe(FARBEN.leere);
    ctx.fillRect(0, 0, kamera.fensterBreite, kamera.fensterHoehe);
    rechtecke++;
    return 1;
  }

  /* Das Fenster, wie `runtime/licht.js` und `runtime/partikel.js` es
     lesen. Eine eigene Form, weil beide `x`/`y` in Weltbildpunkten
     erwarten, die Kamera sie aber `eckeX`/`eckeY` nennt. */
  function kameraFenster() {
    return {
      x: kamera.eckeX,
      y: kamera.eckeY,
      vergroesserung: kamera.vergroesserung,
      breite: kamera.fensterBreite,
      hoehe: kamera.fensterHoehe
    };
  }

  /* ── Boden ───────────────────────────────────────────────────────*/

  /* Das Schachbrett aus Grund- und Zweitton. Ohne es ist eine große
     Halle eine einzige Fläche, auf der das Auge keinen Halt findet —
     und man sieht der Bewegung nicht an, dass man sich bewegt. */
  function zeichneBoden(karte, x, y, i, ecke, gedaempft) {
    const zweit = ((x + y) & 1) === 1;
    const grund = bodenFarbe(karte.boden[i], karte.ebene[i], zweit);
    kasten(ecke.x, ecke.y, 0, 0, KACHEL, KACHEL, ton(grund, gedaempft));
  }

  /* Risse, gestreut aus Feldlage und Kartensaat. Nicht aus
     `Math.random`: Ein Boden, der bei jedem Bild neu reißt, flimmert,
     und zwei Rechner sähen verschiedene Kerker. */
  function zeichneRisse(karte, x, y, i, ecke, gedaempft) {
    const wurf = ganzHash(karte.saat >>> 0, x, y);
    if (wurf % 100 >= RISS_ANTEIL) return;
    const satz = BODEN_FARBEN[karte.boden[i]] || BODEN_FARBEN[0];
    const wert = ton(ebenenTon(satz.riss, karte.ebene[i]), gedaempft);
    const rissX = 2 + ((wurf >>> 7) % 12);
    const rissY = 2 + ((wurf >>> 13) % 12);
    const laenge = 2 + ((wurf >>> 19) % 3);
    if (((wurf >>> 23) & 1) === 1) {
      kasten(ecke.x, ecke.y, rissX, rissY, Math.min(laenge, KACHEL - rissX), 1, wert);
    } else {
      kasten(ecke.x, ecke.y, rissX, rissY, 1, Math.min(laenge, KACHEL - rissY), wert);
    }
  }

  /* ── Flüssigkeiten ───────────────────────────────────────────────*/

  function zeichneFluessig(karte, x, y, art, ecke, zeit, gedaempft) {
    const satz = FLUESSIG_FARBEN[art];
    if (!satz) return;
    kasten(ecke.x, ecke.y, 0, 0, KACHEL, KACHEL, ton(satz.flach, gedaempft));

    const welle = mischTon(satz.flach, satz.glanz, WELLE_TEIL);
    const bloecke = KACHEL / LICHTPUNKT;
    for (let bj = 0; bj < bloecke; bj++) {
      for (let bi = 0; bi < bloecke; bi++) {
        const wert = wellenWert(x * bloecke + bi, y * bloecke + bj, zeit);
        if (wert <= WELLE_SCHWELLE) continue;
        kasten(ecke.x, ecke.y, bi * LICHTPUNKT, bj * LICHTPUNKT,
          LICHTPUNKT, LICHTPUNKT, ton(welle, gedaempft));
        /* Der Glanzpunkt sitzt **in** dem bewegten Block, nicht
           daneben: Ein Glanz auf ruhigem Wasser sähe aus wie Schmutz. */
        if (wert > GLANZ_SCHWELLE) {
          kasten(ecke.x, ecke.y, bi * LICHTPUNKT + 1, bj * LICHTPUNKT + 1,
            2, 2, ton(satz.glanz, gedaempft));
        }
      }
    }

    /* Der Rand einen Ton dunkler, und nur dort, wo die Flüssigkeit
       aufhört. Ohne ihn verläuft eine Blutlache in den Boden, statt
       eine Lache zu sein. */
    const rand = ton(satz.tief, gedaempft);
    for (const r of richtungen(y)) {
      if (karte.fluessigBei(x + r.dx, y + r.dy) === art) continue;
      const dx = r.dx > 0 ? KACHEL - 1 : 0;
      const dy = r.dy > 0 ? KACHEL - 1 : 0;
      const breite = r.dx === 0 ? KACHEL : 1;
      const hoehe = r.dy === 0 ? KACHEL : 1;
      kasten(ecke.x, ecke.y, dx, dy, breite, hoehe, rand);
    }
  }

  /* ── Rampen ──────────────────────────────────────────────────────*/

  /* Drei Querstriche quer zur Aufstiegsrichtung, zur Aufstiegsseite
     hin heller. Das ist keine Zierde: Die Rampe ist die einzige
     Stelle, an der man hinaufkommt, und ohne die Richtung im Bild
     läuft man sie von der falschen Seite an. */
  function zeichneRampe(karte, x, y, i, ecke, gedaempft) {
    const hinauf = rampeZeigtNach(karte, x, y);
    if (!hinauf) return;
    const grund = bodenFarbe(karte.boden[i], karte.ebene[i], false);
    const senkrecht = hinauf.dx === 0;
    const zurAchse = hinauf.dx + hinauf.dy < 0;
    for (let n = 0; n < RAMPEN_STRICHE; n++) {
      const lage = STRICH_LAGEN[n];
      const nahe = zurAchse ? n : RAMPEN_STRICHE - 1 - n;
      const wert = ton(mischTon(grund, FARBEN.steinKante, STRICH_HELLE[nahe]), gedaempft);
      if (senkrecht) kasten(ecke.x, ecke.y, STRICH_RAND, lage, STRICH_LAENGE, 1, wert);
      else kasten(ecke.x, ecke.y, lage, STRICH_RAND, 1, STRICH_LAENGE, wert);
    }
  }

  /* ── Wände und Höhenkanten ───────────────────────────────────────*/

  function zeichneWand(ebene, ecke, gedaempft) {
    const ebeneSicher = Math.max(0, Math.min(EBENEN_TON.length - 1, ebene));
    kasten(ecke.x, ecke.y, 0, 0, KACHEL, KACHEL - WAND_FLANKE,
      ton(wandTon(ebeneSicher, false), gedaempft));
    kasten(ecke.x, ecke.y, 0, KACHEL - WAND_FLANKE, KACHEL, WAND_FLANKE,
      ton(wandTon(ebeneSicher, true), gedaempft));
  }

  /* Die beiden Mittel, die die Höhe tragen — und der Grund, warum
     beide auf **demselben** Feld entstehen: Der Schattenbalken liegt
     auf dem tieferen Feld an dessen Nordkante, die helle Oberkante
     auf dem höheren an derselben Kante. Jedes Feld schaut also nur
     nach Norden und zeichnet eines von beiden; so kann keine Kante
     doppelt oder gar nicht gezeichnet werden. */
  function zeichneHoehe(karte, x, y, ecke, gedaempft) {
    const hier = hoeheBei(karte, x, y);
    const nord = hoeheBei(karte, x, y - 1);
    if (nord > hier) {
      const balken = Math.min(KACHEL, STUFEN_SCHATTEN * (nord - hier));
      kasten(ecke.x, ecke.y, 0, 0, KACHEL, balken, ton(FARBEN.kontur, gedaempft));
      return;
    }
    if (hier > nord && nord >= 0) {
      kasten(ecke.x, ecke.y, 0, 0, KACHEL, 1, ton(FARBEN.steinKante, gedaempft));
    }
  }

  /* ── Sprites ─────────────────────────────────────────────────────*/

  /* Welches Bild einer Bildfolge (Fackeln) gerade steht. Aus der Zeit
     und der Feldlage: Zwei Fackeln nebeneinander sollen nicht im
     Gleichtakt zucken, und derselbe Augenblick soll dasselbe Bild
     zeigen. */
  function bildNummerFuer(sprite, karte, x, y, zeit) {
    const anzahl = bildAnzahl(sprite);
    if (anzahl <= 1) return 0;
    const versatz = ganzHash(karte.saat >>> 0, x, y) % anzahl;
    const takt = Math.floor((Number.isFinite(zeit) ? zeit : 0) / BILD_TAKT);
    return (((takt + versatz) % anzahl) + anzahl) % anzahl;
  }

  /* Ein Sprite mittig auf ein Feld. Der Versatz wird **abgerundet**:
     Ein Raster von 15 auf einem Feld von 16 hat keine ganzzahlige
     Mitte, und ein halber Bildpunkt wäre genau der Fehler, den dieses
     ganze Projekt vermeidet. Lieber einen Bildpunkt aus der Mitte als
     eine weiche Kante. */
  function zeichneSprite(sprite, ecke, richtung, spielerFarbe, bildNummer, gedaempft) {
    const bild = streifenVon(sprite, richtung, spielerFarbe, bildNummer);
    const versatzX = Math.floor((KACHEL - bild.breite) / 2);
    const versatzY = Math.floor((KACHEL - bild.hoehe) / 2);
    for (const streifen of bild.streifen) {
      kasten(ecke.x, ecke.y, versatzX + streifen.x, versatzY + streifen.y,
        streifen.breite, 1, ton(streifen.farbe, gedaempft));
    }
    return bild.streifen.length;
  }

  function zeichneDing(karte, x, y, hindernis, ecke, zeit, gedaempft) {
    const name = DING_NAMEN[hindernis];
    if (!name) return;
    const sprite = DINGE[name];
    if (!sprite) return;
    const nummer = bildNummerFuer(sprite, karte, x, y, zeit);
    zeichneSprite(sprite, ecke, RICHTUNG_NORD, null, nummer, gedaempft);
  }

  /* ── Ein Feld, in der Reihenfolge, in der es entsteht ─────────────*/

  function zeichneFeld(karte, x, y, i, ecke, gedaempft, zeit) {
    zeichneBoden(karte, x, y, i, ecke, gedaempft);
    zeichneRisse(karte, x, y, i, ecke, gedaempft);
    const nass = karte.fluessig[i];
    if (nass !== FLUESSIG.keine) zeichneFluessig(karte, x, y, nass, ecke, zeit, gedaempft);
    if (karte.rampe[i] !== RAMPE.keine) zeichneRampe(karte, x, y, i, ecke, gedaempft);
    const hindernis = karte.hindernis[i];
    if (hindernis === HINDERNIS.wand) zeichneWand(karte.ebene[i], ecke, gedaempft);
    /* Der Schatten kommt **nach** der Wand: Eine Wand, die unter einem
       Plateau steht, liegt selbst im Schatten. */
    zeichneHoehe(karte, x, y, ecke, gedaempft);
    if (hindernis !== HINDERNIS.keins && hindernis !== HINDERNIS.wand) {
      zeichneDing(karte, x, y, hindernis, ecke, zeit, gedaempft);
    }
  }

  /* ── Die Welt ────────────────────────────────────────────────────*/

  /* Nie gesehene Felder noch einmal schwärzen — siehe die Begründung
     an der Aufrufstelle in `bild`. Nur die Felder im Fenster, und nur
     die wirklich ungesehenen: Ein erinnertes Feld bleibt matt sichtbar,
     sonst vergäße die Karte, was man schon erkundet hat. */
  function deckeUngesehenes(karte, sichtbar, erinnert) {
    if (!sichtbar && !erinnert) return 0;
    /* ⚠️ **Nicht `istDrin` benutzen.** Das liefert für eine fehlende
       Menge absichtlich `true` („kein Nebel gesetzt, also alles
       sichtbar") — hier wäre das genau falsch herum: Fehlt die
       Erinnerungsmenge, gälte jedes Feld als erinnert, und die
       Abdeckung träfe kein einziges. Genau so ist der braune Schleier
       beim ersten Anlauf stehen geblieben. */
    const drin = (menge, i) => {
      if (!menge) return false;
      if (typeof menge.has === "function") return menge.has(i);
      return menge[i] === 1 || menge[i] === true;
    };
    /* ⚠️ **Nicht `kameraFenster()`.** Das liefert Bildpunkte
       (`x`, `y`, `breite`, `hoehe`) und keine Feldgrenzen — beim
       ersten Anlauf stand hier `f.vonY`, war `undefined`, und die
       Schleife lief kein einziges Mal. Aufgefallen ist es nicht, weil
       jeder Lauf eine andere Saat hat und das Bild trotzdem plausibel
       aussah. */
    const f = kamera.sichtbareFelder();
    let gezeichnet = 0;
    for (let y = f.vonY; y <= f.bisY; y++) {
      for (let x = f.vonX; x <= f.bisX; x++) {
        if (!karte.drin(x, y)) continue;
        const i = y * karte.breite + x;
        if (drin(sichtbar, i) || drin(erinnert, i)) continue;
        const ecke = kamera.feldNachBild(x, y);
        kasten(ecke.x, ecke.y, 0, 0, KACHEL, KACHEL, FARBEN.leere);
        gezeichnet++;
      }
    }
    return gezeichnet;
  }

  /* `sichtbar` und `erinnert` sind Mengen von Feldnummern. Drei
     Zustände, und der mittlere ist der, den man vergisst: Was man nie
     gesehen hat, ist fast schwarz; was man **einmal** gesehen hat,
     steht gedämpft da — mit Boden, Wänden und Kanten, aber ohne
     Wesen; was man gerade sieht, steht voll da. Ein erinnertes Feld
     mit Wesen wäre eine Lüge: Der Gegner ist längst woanders. */
  function zeichneWelt(karte, sichtbar = null, erinnert = null, zeit = letzteZeit || 0) {
    if (!karte) return 0;
    ctx.imageSmoothingEnabled = false;
    const fenster = kamera.sichtbareFelder(0);
    let felder = 0;
    for (let y = fenster.vonY; y <= fenster.bisY; y++) {
      for (let x = fenster.vonX; x <= fenster.bisX; x++) {
        const i = karte.index(x, y);
        const ecke = kamera.feldNachBild(x, y);
        const gesehen = istDrin(sichtbar, i);
        if (!gesehen && !istDrin(erinnert, i)) {
          kasten(ecke.x, ecke.y, 0, 0, KACHEL, KACHEL, FARBEN.leere);
          felder++;
          continue;
        }
        zeichneFeld(karte, x, y, i, ecke, !gesehen, zeit);
        felder++;
      }
    }
    return felder;
  }

  /* ── Die Wesen ───────────────────────────────────────────────────*/

  function spriteFuerWesen(wesen) {
    const vorrat = wesen.seite === "brut" ? GEGNER_BILDER : HELDEN_BILDER;
    return vorrat[wesen.art] || GEGNER_BILDER[wesen.art] || HELDEN_BILDER[wesen.art] || null;
  }

  /* Gezeichnet wird nur, wer **jetzt** gesehen wird. Die Lage wird vor
     dem Zeichnen gerundet, damit eine Figur mitten in einem Schritt
     (x = 3,5) auf demselben Raster liegt wie der Boden unter ihr.
     `blick` darf fehlen — dann schaut die Figur nach Norden, so wie
     jedes Raster in `runtime/sprite-daten.js` gemalt ist. */
  function zeichneWesen(karte, wesenListe, sichtbar = null, spielerFarben = SPIELER_FARBEN) {
    if (!karte || !wesenListe) return 0;
    ctx.imageSmoothingEnabled = false;
    let gezeichnet = 0;
    for (const wesen of wesenListe) {
      if (!wesen || wesen.lebt === false) continue;
      const feldX = Math.round(wesen.x);
      const feldY = Math.round(wesen.y);
      if (!karte.drin(feldX, feldY)) continue;
      if (!istDrin(sichtbar, karte.index(feldX, feldY))) continue;
      const sprite = spriteFuerWesen(wesen);
      if (!sprite) continue;
      const satz = wesen.spielerPlatz
        ? (spielerFarben[wesen.spielerPlatz - 1] || SPIELER_FARBEN[0])
        : SPIELER_FARBEN[0];
      const richtung = Number.isInteger(wesen.blick) ? wesen.blick : RICHTUNG_NORD;
      zeichneSprite(sprite, kamera.feldNachBild(wesen.x, wesen.y), richtung, satz, 0, false);
      gezeichnet++;
    }
    return gezeichnet;
  }

  /* ── Merker: was der Spieler vorhat ──────────────────────────────*/

  /* `merker`: `{reichweite, weg, ziel, marken}`. `reichweite` ist eine
     Menge von Feldnummern und wird als **Umriss** gezeichnet, nicht
     als Füllung — eine gefüllte Fläche verdeckt genau das Gelände,
     nach dem man schaut. `weg` ist die Folge der Felder bis zum Ziel,
     `ziel` bekommt das Zielkreuz, `marken` sind freie Zeichen aus
     `ZEICHEN` (Wachtauge, Sturzpfeil, Ausrufezeichen). */
  function zeichneMerker(karte, merker) {
    if (!karte || !merker) return 0;
    ctx.imageSmoothingEnabled = false;
    let marken = 0;

    if (merker.reichweite) {
      const fenster = kamera.sichtbareFelder(0);
      for (let y = fenster.vonY; y <= fenster.bisY; y++) {
        for (let x = fenster.vonX; x <= fenster.bisX; x++) {
          if (!istDrin(merker.reichweite, karte.index(x, y))) continue;
          const ecke = kamera.feldNachBild(x, y);
          for (const r of richtungen(y)) {
            const nx = x + r.dx;
            const ny = y + r.dy;
            if (karte.drin(nx, ny) && istDrin(merker.reichweite, karte.index(nx, ny))) continue;
            const dx = r.dx > 0 ? KACHEL - 1 : 0;
            const dy = r.dy > 0 ? KACHEL - 1 : 0;
            kasten(ecke.x, ecke.y, dx, dy, r.dx === 0 ? KACHEL : 1, r.dy === 0 ? KACHEL : 1,
              FARBEN.apVoll);
          }
          marken++;
        }
      }
    }

    if (Array.isArray(merker.weg)) {
      for (const feld of merker.weg) {
        if (!feld || !karte.drin(feld.x, feld.y)) continue;
        zeichneSprite(ZEICHEN.wegpunkt, kamera.feldNachBild(feld.x, feld.y),
          RICHTUNG_NORD, null, 0, false);
        marken++;
      }
    }

    if (merker.ziel && karte.drin(merker.ziel.x, merker.ziel.y)) {
      zeichneSprite(ZEICHEN.zielkreuz, kamera.feldNachBild(merker.ziel.x, merker.ziel.y),
        RICHTUNG_NORD, null, 0, false);
      marken++;
    }

    if (Array.isArray(merker.marken)) {
      for (const marke of merker.marken) {
        const sprite = marke && ZEICHEN[marke.zeichen];
        if (!sprite || !karte.drin(marke.x, marke.y)) continue;
        zeichneSprite(sprite, kamera.feldNachBild(marke.x, marke.y),
          RICHTUNG_NORD, null, 0, false);
        marken++;
      }
    }
    return marken;
  }

  /* ── Teilchen aus der Landschaft ─────────────────────────────────*/

  /* Lava glüht, Schleim tropft. Beides im Takt und nur auf sichtbaren
     Feldern: Ohne Takt spuckte jedes Bild jedes Lavafeld, und der
     feste Vorrat aus `runtime/partikel.js` wäre in einer Sekunde
     mehrfach überschrieben. Welche Felder an der Reihe sind, entsteht
     aus `ganzHash` über Saat, Takt und Lage — nicht aus dem
     Zufallsstrom des Partikelwerks, damit derselbe Augenblick
     dieselben Felder trifft. */
  function stosseQuellenAus(karte, sichtbar, zeit) {
    if (!partikelwerk || !karte) return 0;
    const takt = Math.floor((Number.isFinite(zeit) ? zeit : 0) / GLUT_TAKT);
    if (takt === letzterTakt) return 0;
    letzterTakt = takt;
    const fenster = kamera.sichtbareFelder(0);
    let geworfen = 0;
    for (let y = fenster.vonY; y <= fenster.bisY; y++) {
      for (let x = fenster.vonX; x <= fenster.bisX; x++) {
        const i = karte.index(x, y);
        const art = karte.fluessig[i];
        if (art !== FLUESSIG.lava && art !== FLUESSIG.schleim) continue;
        if (!istDrin(sichtbar, i)) continue;
        if (ganzHash((karte.saat ^ takt) >>> 0, x, y) % 100 >= QUELL_ANTEIL) continue;
        const punktX = x * KACHEL + KACHEL / 2;
        const punktY = y * KACHEL + KACHEL / 2;
        if (art === FLUESSIG.lava) geworfen += partikelwerk.stosseAus("glut", punktX, punktY);
        else {
          geworfen += partikelwerk.stosseAus("tropfen", punktX, punktY,
            { farben: SCHLEIM_RAMPE, leuchtet: true });
        }
      }
    }
    return geworfen;
  }

  /* ── Das ganze Bild ──────────────────────────────────────────────*/

  /* Die Reihenfolge steht in `docs/WEGWEISER.md` und ist keine
     Geschmacksfrage: Erst die Welt, dann die Wesen, dann die Merker
     (das Zielkreuz muss **über** der Figur liegen, sonst zielt man auf
     etwas, das man nicht sieht), dann das Licht als multiplizierende
     Lage, und zuletzt die Teilchen — Funken leuchten selbst und
     dürfen vom Licht nicht abgedunkelt werden.

     `ansicht`: `{sichtbar, erinnert, merker, spielerFarben, folgt}`.
     `zeit` ist die Laufzeit in Sekunden; aus zwei aufeinanderfolgenden
     Zeiten entsteht der Zeitschritt für Teilchen und Kamera. Er wird
     gedeckelt: Ein Wechsel in einen anderen Reiter und zurück lieferte
     sonst einen Sprung von Sekunden, und alle Teilchen wären auf
     einmal alt. */
  function bild(zustand, ansicht = {}, zeit = 0) {
    const karte = zustand && zustand.karte ? zustand.karte : null;
    if (!karte) return 0;
    rechtecke = 0;
    const dt = letzteZeit === null ? 0 : Math.min(0.1, Math.max(0, zeit - letzteZeit));
    letzteZeit = zeit;

    if (lichtwerk && karte !== letzteKarte) {
      letzteKarte = karte;
      lichtwerk.setzeQuellen(karte.lichter || []);
    }
    if (ansicht.folgt) {
      kamera.folge(ansicht.folgt.x, ansicht.folgt.y, dt === 0, dt || 1 / 60);
    }

    leere();
    zeichneWelt(karte, ansicht.sichtbar, ansicht.erinnert, zeit);
    zeichneWesen(karte, zustand.wesen, ansicht.sichtbar, ansicht.spielerFarben);
    zeichneMerker(karte, ansicht.merker);

    stosseQuellenAus(karte, ansicht.sichtbar, zeit);
    if (partikelwerk) partikelwerk.schritt(dt, karte);
    if (lichtwerk) {
      lichtwerk.rechne(zeit, karte, partikelwerk ? partikelwerk.leuchtende() : []);
      /* Beide fremden Werke setzen `fillStyle` selbst — die gemerkte
         Farbe stimmt danach nicht mehr, und die nächste Fläche käme
         in der Farbe des letzten Lichtpunktes. */
      rechtecke += lichtwerk.zeichneAuf(ctx, kameraFenster());
      letzteFarbe = null;
      /* ── Das Licht wieder von dem nehmen, was niemand gesehen hat ──
         Die Lichtkarte weiß nichts vom Nebel des Krieges: Sie legt ihre
         warmen Anteile über das **ganze** Fenster, auch über Fels, in
         dem noch nie jemand stand. Im Bild wurde daraus ein
         brauner Schleier über der halben Karte — genau das Gegenteil
         der Vorlage, auf die Jannik gezeigt hat („schwarze Tiefe
         ringsum").

         Deshalb bekommen nie gesehene Felder ihr Schwarz **nach** dem
         Licht ein zweites Mal. Das ist billiger und ehrlicher, als der
         Lichtkarte die Sichtbarkeit beizubringen: Sie rechnet, was
         leuchtet; was man davon sehen darf, entscheidet der Nebel. */
      rechtecke += deckeUngesehenes(karte, ansicht.sichtbar, ansicht.erinnert);
      letzteFarbe = null;
    }
    if (partikelwerk) {
      rechtecke += partikelwerk.zeichne(ctx, kameraFenster());
      letzteFarbe = null;
    }
    return rechtecke;
  }

  return {
    KACHEL,
    setzeFenster, leere, zeichneWelt, zeichneWesen, zeichneMerker, bild,
    stosseQuellenAus,
    kameraFenster,
    anzahlRechtecke: () => rechtecke
  };
}
