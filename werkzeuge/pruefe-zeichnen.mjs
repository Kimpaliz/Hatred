/* [Aufgabe: Prüfwesen] Misst den Weltzeichner über ein Zeichenblatt,
   das jeden Aufruf mitschreibt — ohne Browser.

   ── Warum ein Ersatzblatt und kein Bildvergleich ───────────────────

   Die zwei Fehler, an denen Pixelgrafik stirbt, sieht man im fertigen
   Bild erst, wenn es zu spät ist: ein `fillRect` auf einer halben
   Bildpunktkante und eine vergessene Abschaltung der Glättung
   (Fehlerbuch D1). Beide sind im Bild ein Hauch Unschärfe, den man für
   den Bildschirm hält. In der **Aufrufliste** sind beide eindeutig:
   `12.5` ist keine ganze Zahl, und ein Rechteck nach einem Setzen der
   Blattmaße ohne `imageSmoothingEnabled = false` steht schwarz auf
   weiß da.

   Deshalb bekommt der Zeichner hier ein Blatt gereicht, das nichts
   zeichnet, sondern mitschreibt. Behauptet wird über die Mitschrift.

   ── Was hier geprüft wird und was nicht ────────────────────────────

   Geprüft wird der Fall, der ohne die Arbeit falsch wäre — nicht der,
   der ohnehin gewinnt:

   · **Harte Kanten.** Kein Rechteck auf einem halben Bildpunkt, und
     die Vergrößerung ohne Komma — bei jeder Fenstergröße, nicht nur
     bei den beiden, die man von Hand ausprobiert. Das ist Janniks
     viertes Merkmal für die Kerkerstimmung und steht als eigener
     Abschnitt „2 · Harte Kanten" mit einer mitgedruckten Zahl da.
   · Eine Ebenenkante muss einen **schwarzen Balken der richtigen
     Höhe** erzeugen. Ohne ihn ist die Höhe im Bild unsichtbar, und
     das ganze Höhensystem des Spiels wäre umsonst.
   · Eine Rampe muss drei Querstriche bekommen, die zur
     Aufstiegsseite hin **heller** werden. Eine Rampe ohne Richtung
     im Bild läuft man von der falschen Seite an.
   · Ein nie gesehenes Feld darf **kein** Wesen zeigen. Der Fehler
     verrät im Spiel jede Gegnerstellung und fällt nie als Fehler auf.
   · Zweimal dieselbe Zeit muss dieselbe Aufrufliste geben. Ein
     `Math.random` im Zeichner ließe den Boden flimmern und machte
     jeden Bildschirmfoto-Bericht wertlos.

   Nicht geprüft wird, ob das Bild schön ist. Das entscheidet der
   Auftraggeber, und dafür gibt es die Vorschau.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/zeichnen.js` (das Geprüfte), `runtime/kamera.js`,
   `runtime/licht.js`, `runtime/partikel.js`, `runtime/palette.js`,
   `runtime/sprite-daten.js`, `spiel/gitter.mjs` (die Karte),
   `werkzeuge/helfer.mjs` (Behauptungen und Abschluss) und
   `werkzeuge/pruefe-alles.mjs`, das diese Datei als eigenen Prozess
   startet. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { abschnitt, behaupte, gleich, wirft, ende } from "./helfer.mjs";
import {
  BODEN, FLUESSIG, HINDERNIS, RAMPE, macheKarte, nachbarn
} from "../spiel/gitter.mjs";
import {
  ERINNERT_HELLE, FARBEN, STUFEN_SCHATTEN, abdunkeln, bodenTon, helligkeit, mische
} from "../runtime/palette.js";
import { KACHEL, LICHTPUNKT, macheLichtwerk } from "../runtime/licht.js";
import { machePartikelwerk } from "../runtime/partikel.js";
import { MINDEST_KANTE, macheKamera, vergroesserungFuer } from "../runtime/kamera.js";
import {
  DING_NAMEN, GLUT_TAKT, RAMPEN_STRICHE, RISS_ANTEIL, STRICH_HELLE, STRICH_LAENGE,
  STRICH_LAGEN, WAND_FLANKE, WAND_STUFEN, hoeheBei, macheZeichner, wandTon
} from "../runtime/zeichnen.js";

const WURZEL = dirname(dirname(fileURLToPath(import.meta.url)));

/* ── Das mitschreibende Zeichenblatt ────────────────────────────────

   Nur die Methoden, die der Zeichner wirklich benutzt. Jedes Rechteck
   merkt sich die Farbe, die zu seinem Zeitpunkt gesetzt war — sonst
   ließe sich „ein **schwarzer** Balken" gar nicht behaupten, und die
   Prüfung fiele auf jedes beliebige Rechteck herein. `canvas.width`
   ist ein echtes Feld mit Schreibmelder: Genau daran hängt der
   Glättungsfehler. */
function macheErsatzflaeche(breite = 320, hoehe = 180) {
  const aufrufe = [];
  let blattBreite = breite;
  let blattHoehe = hoehe;
  let farbe = "#000000";
  const canvas = {
    get width() { return blattBreite; },
    set width(wert) { blattBreite = wert; aufrufe.push(["blattBreite", wert]); },
    get height() { return blattHoehe; },
    set height(wert) { blattHoehe = wert; aufrufe.push(["blattHoehe", wert]); }
  };
  return {
    aufrufe,
    canvas,
    set imageSmoothingEnabled(wert) { aufrufe.push(["glaettung", wert]); },
    get imageSmoothingEnabled() { return false; },
    set fillStyle(wert) { farbe = wert; aufrufe.push(["farbe", wert]); },
    get fillStyle() { return farbe; },
    set globalCompositeOperation(wert) { aufrufe.push(["mischen", wert]); },
    get globalCompositeOperation() { return "source-over"; },
    fillRect(x, y, b, h) { aufrufe.push(["rechteck", x, y, b, h, farbe]); }
  };
}

const nurArt = (aufrufe, art) => aufrufe.filter((a) => a[0] === art);

/* Der erste Verstoß gegen die ganzen Bildpunkte — als Aufruf, damit im
   Fehlertext steht, welcher es war. */
function ersterBruch(aufrufe) {
  for (const a of nurArt(aufrufe, "rechteck")) {
    if (![a[1], a[2], a[3], a[4]].every(Number.isInteger)) return a;
  }
  return null;
}

/* Der Glättungsfehler, genau formuliert: Nach jedem Setzen von
   `canvas.width`/`height` muss `imageSmoothingEnabled = false` kommen,
   **bevor** das nächste Rechteck gezeichnet wird. Gibt den ersten
   verfrühten Aufruf zurück oder `null`. */
function ersteWeicheZeichnung(aufrufe) {
  let blattFrisch = false;
  for (const a of aufrufe) {
    if (a[0] === "blattBreite" || a[0] === "blattHoehe") blattFrisch = true;
    else if (a[0] === "glaettung" && a[1] === false) blattFrisch = false;
    else if (a[0] === "rechteck" && blattFrisch) return a;
  }
  return null;
}

/* Dieselbe Frage, eine Stufe schärfer — und erst diese Fassung fängt
   den Fehler wirklich. Die weiche Fassung oben bleibt grün, wenn eine
   **andere** Stelle die Glättung zufällig als Nächstes abschaltet
   (`bild` tut das, bevor es den Grund malt): Der Fehler in
   `setzeFenster` wäre dann von einer fremden Zeile verdeckt und käme
   in dem Augenblick zurück, in dem jemand jene Zeile entfernt.
   Verlangt wird deshalb: **unmittelbar** nach den Blattmaßen kommt die
   Abschaltung, dazwischen gar nichts. */
function ersterVerspaeteterGriff(aufrufe) {
  let blattFrisch = false;
  for (const a of aufrufe) {
    if (a[0] === "blattBreite" || a[0] === "blattHoehe") { blattFrisch = true; continue; }
    if (!blattFrisch) continue;
    if (a[0] === "glaettung" && a[1] === false) { blattFrisch = false; continue; }
    return a;
  }
  return null;
}

/* Ein vollständiger Stand: Blatt, Kamera, Licht, Teilchen, Zeichner.
   Als eigene Funktion, weil die Determinismus-Prüfung **zwei** davon
   braucht, die einander in nichts kennen dürfen. */
function macheStand(karte, fensterBreite = 320, fensterHoehe = 180) {
  const ctx = macheErsatzflaeche(fensterBreite, fensterHoehe);
  const kamera = macheKamera({ fensterBreite, fensterHoehe, karte });
  const lichtwerk = macheLichtwerk(karte);
  const partikelwerk = machePartikelwerk(300, 0x1234abcd);
  const zeichner = macheZeichner({ ctx, kamera, lichtwerk, partikelwerk });
  return { ctx, kamera, lichtwerk, partikelwerk, zeichner };
}

/* Eine ebene Karte, auf der jedes Feld dieselbe Ebene und denselben
   Boden trägt — der ruhige Untergrund, in den die Prüfungen einzelne
   Besonderheiten setzen. */
function macheProbeKarte(breite = 24, hoehe = 18, saat = 4711) {
  const karte = macheKarte(breite, hoehe);
  karte.saat = saat;
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) karte.setze(x, y, { boden: BODEN.stein, ebene: 1 });
  }
  return karte;
}

/* Alle Rechtecke, die innerhalb eines Feldes liegen. Über die
   Bildschirmecke gerechnet und nicht über die Reihenfolge im
   Protokoll: Die Reihenfolge darf sich ändern, die Lage nicht. */
function rechteckeImFeld(ctx, kamera, x, y) {
  const ecke = kamera.feldNachBild(x, y);
  const kante = KACHEL * kamera.vergroesserung;
  return nurArt(ctx.aufrufe, "rechteck").filter((a) =>
    a[1] >= ecke.x && a[1] < ecke.x + kante && a[2] >= ecke.y && a[2] < ecke.y + kante);
}

/* ── 0 · Selbstprobe des Prüfers ────────────────────────────────────
   Erst das Werkzeug, dann die Sache: Ein Prüfer, der jede Mitschrift
   für sauber hält, meldete für immer grün. */
abschnitt("0 · Selbstprobe");
{
  const ctx = macheErsatzflaeche();
  ctx.fillStyle = "#abcdef";
  ctx.fillRect(1, 2, 3, 4);
  gleich(nurArt(ctx.aufrufe, "rechteck").length, 1, "das Ersatzblatt schreibt Rechtecke mit");
  gleich(nurArt(ctx.aufrufe, "rechteck")[0][5], "#abcdef",
    "jedes Rechteck merkt sich seine Farbe");
  behaupte(ersterBruch(ctx.aufrufe) === null, "ein ganzzahliges Rechteck gilt als sauber");
  ctx.fillRect(12.5, 2, 3, 4);
  behaupte(ersterBruch(ctx.aufrufe) !== null,
    "ein Rechteck auf 12,5 schlägt an — sonst prüfte die Mitschrift nichts");

  /* Der Glättungsfehler von Hand nachgestellt: erst die Blattmaße,
     dann ein Rechteck, und dazwischen kein Abschalten. */
  const weich = [["blattBreite", 320], ["rechteck", 0, 0, 4, 4, "#000"]];
  behaupte(ersteWeicheZeichnung(weich) !== null,
    "ein Rechteck nach `width` ohne Abschalten fällt auf");
  const hart = [["blattBreite", 320], ["glaettung", false], ["rechteck", 0, 0, 4, 4, "#000"]];
  behaupte(ersteWeicheZeichnung(hart) === null, "mit Abschalten dazwischen ist es in Ordnung");
  behaupte(ersteWeicheZeichnung([["glaettung", true], ["rechteck", 0, 0, 1, 1, "#000"]]) === null,
    "ohne Setzen der Blattmaße gibt es nichts zu beanstanden");

  /* Und die scharfe Fassung: Eine Farbe zwischen Blattmaß und
     Abschaltung ist schon zu spät. */
  const spaet = [["blattBreite", 320], ["farbe", "#000"], ["glaettung", false]];
  behaupte(ersteWeicheZeichnung(spaet) === null,
    "die weiche Fassung sieht hier nichts — sie fragt nur nach Rechtecken");
  behaupte(ersterVerspaeteterGriff(spaet) !== null,
    "die scharfe Fassung schlägt an: zwischen Blattmaß und Abschaltung gehört nichts");
  behaupte(ersterVerspaeteterGriff([["blattBreite", 320], ["blattHoehe", 180],
    ["glaettung", false], ["rechteck", 0, 0, 1, 1, "#000"]]) === null,
    "zwei Blattmaße hintereinander und dann die Abschaltung sind in Ordnung");
}

/* ── 1 · Der Zeichner nimmt nichts Halbes an ────────────────────────*/
abschnitt("1 · Anlegen");
{
  const karte = macheProbeKarte();
  const kamera = macheKamera({ fensterBreite: 320, fensterHoehe: 180, karte });
  wirft(() => macheZeichner({ ctx: null, kamera }), "ohne Zeichenfläche wird geworfen");
  wirft(() => macheZeichner({ ctx: macheErsatzflaeche(), kamera: null }),
    "ohne Kamera wird geworfen");

  /* Ein neues Hindernis ohne Bild ist der Fehler, den niemand sieht:
     Das Feld bleibt leer, und man hält es für begehbar. */
  gleich(DING_NAMEN.length, Object.keys(HINDERNIS).length,
    "zu jedem Hindernis aus spiel/gitter.mjs gibt es einen Eintrag in DING_NAMEN");
  gleich(DING_NAMEN[HINDERNIS.fass], "fass", "das Fass zeigt auf sein Sprite");
  gleich(DING_NAMEN[HINDERNIS.wand], null, "die Wand ist ein Block und kein Sprite");
}

/* ── 2 · Harte Kanten, ganzzahlige Vergrößerung ─────────────────────

   Janniks viertes Merkmal für die Kerkerstimmung, aus seinem
   Wortlaut: „Exaktes top down. Pixel grafik." Im Bild heißt das genau
   zwei Dinge, und beide stehen hier: **kein Rechteck auf einem halben
   Bildpunkt** und **keine Vergrößerung mit Komma** (Fehlerbuch D1).

   Vergrößerung 1 verzeiht jeden Rundungsfehler, weil eine halbe
   logische Einheit dort auch ein halber Bildschirmpunkt wäre. Erst ab
   2 zeigt sich, wer zuerst multipliziert und dann rundet. Deshalb
   werden acht Fenstergrößen durchgezeichnet, darunter krumme wie
   1237×813 und 4001×3697 und das Hochformat eines Handys (412×915).

   ── Was anderswo steht und hier nicht noch einmal gefragt wird ─────

   `pruefe-schrift.mjs` würfelt 1.000 Fenster und fragt, ob die volle
   Sicht (`MINDEST_FELDER`) hineinpasst — eine Frage an die *Größe*
   des Ausschnitts. `pruefe-tippen.mjs` fährt vier
   Bildpunktverhältnisse durch, darunter Androids krumme 2,625, und
   verlangt, dass alle vier dasselbe ganzzahlige Blatt ergeben — eine
   Frage an das *Blatt*. Hier steht die dritte und einzige noch offene
   Frage: Liegt das, was am Ende **gezeichnet** wird, bei jeder dieser
   Vergrößerungen auf ganzen Bildpunkten? Sie braucht den vollen
   Zeichner und kann deshalb nur hier stehen.

   Die Zahl wird mitgedruckt, statt nur nebenbei geprüft zu werden:
   Wenn aus „0 von einer halben Million" einmal „0 von zwölf" wird,
   fällt das nur auf, wenn die Zahl im Protokoll steht. */
abschnitt("2 · Harte Kanten");
{
  /* Erst die Vergrößerung selbst: ein systematischer Gang über 34
     Breiten × 32 Höhen = 1.088 Fenstergrößen. Die Schritte 111 und
     123 sind mit Absicht krumm — glatte Vielfache von `MINDEST_KANTE`
     träfen jede Grenze genau und ließen einen Rundungsfehler
     unentdeckt. */
  const BREITEN = Array.from({ length: 34 }, (_, i) => 320 + i * 111);
  const HOEHEN = Array.from({ length: 32 }, (_, j) => 180 + j * 123);
  let krumm = 0;
  let zuKlein = 0;
  const gesehen = new Set();
  for (const breite of BREITEN) {
    for (const hoehe of HOEHEN) {
      const v = vergroesserungFuer(breite, hoehe);
      if (!Number.isInteger(v)) krumm++;
      if (v < 1) zuKlein++;
      gesehen.add(v);
    }
  }
  const stufen = [...gesehen].sort((a, b) => a - b);
  const wieViele = BREITEN.length * HOEHEN.length;
  gleich(wieViele, 1088, "der Gang deckt 1.088 Fenstergrößen ab");
  gleich(krumm, 0, `keine der ${wieViele} Vergrößerungen hat ein Komma`);
  gleich(zuKlein, 0, "keine Vergrößerung fällt unter 1 — ein Fenster ist nie zu klein");
  gleich(stufen[0], 1, "die kleinste Vergrößerung ist 1");
  /* Und die Spanne hat keine Lücke: 1, 2, 3 … bis zur größten. Ohne
     das bestünde der Gang auch bei einer Funktion, die nur 1 und 40
     kennt — und dazwischen sprünge das Bild. Gefragt wird über die
     Anzahl und nicht über die Liste: Bei einer krummen Vergrößerung
     stünden sonst sechzig Kommazahlen im Fehlertext. */
  gleich(stufen.length, stufen[stufen.length - 1],
    `die Spanne 1 bis ${stufen[stufen.length - 1]} hat keine Lücke (${stufen.length} Werte)`);
  const vergroesserungsBericht = `Vergrößerung über ${wieViele} Fenstergrößen `
    + `(${BREITEN[0]}–${BREITEN[BREITEN.length - 1]} × ${HOEHEN[0]}–${HOEHEN[HOEHEN.length - 1]}): `
    + `${krumm} nicht ganzzahlig, Spanne ${stufen[0]} bis ${stufen[stufen.length - 1]} `
    + `ohne Lücke, MINDEST_KANTE ${MINDEST_KANTE}`;

  /* Und nun die Wirkung. Die Karte ist mit 64 × 48 Feldern größer als
     das größte Fenster zeigt — sonst zeichnete ein 3840×2160-Fenster
     überwiegend Kartenrand, und die Zahl käme nicht zustande. */
  const bauKarte = () => {
    const karte = macheProbeKarte(64, 48, 90210);
    for (let x = 0; x < karte.breite; x++) karte.setze(x, 21, { ebene: 3 });
    karte.setze(19, 22, { ebene: 2, rampe: RAMPE.nordost });
    karte.setze(22, 21, { hindernis: HINDERNIS.wand });
    karte.setze(24, 24, { fluessig: FLUESSIG.lava });
    karte.setze(25, 24, { fluessig: FLUESSIG.schleim });
    karte.setze(17, 18, { hindernis: HINDERNIS.fass });
    karte.setze(17, 19, { hindernis: HINDERNIS.fackelsockel });
    karte.lichter = [{ x: 18, y: 19, art: "fackel", staerke: 1 }];
    return karte;
  };
  const FENSTER = [
    [320, 180, 1], [412, 915, 1], [1237, 813, 2], [1920, 1080, 3],
    [2560, 1440, 4], [1699, 2003, 5], [3840, 2160, 6], [4001, 3697, 11]
  ];
  const ZEITEN = [0, 0.2, 0.55, 1.1, 1.7];
  let alleRechtecke = 0;
  let brueche = 0;
  const gezeichnete = new Set();
  for (const [breite, hoehe, erwartet] of FENSTER) {
    const karte = bauKarte();
    const zustand = {
      karte,
      wesen: [
        { id: 1, art: "spaeher", seite: "jaeger", x: 20, y: 20, lebt: true, spielerPlatz: 1 },
        { id: 2, art: "kraetzling", seite: "brut", x: 24, y: 23, lebt: true }
      ]
    };
    const merker = {
      reichweite: new Set([karte.index(20, 20), karte.index(21, 20)]),
      weg: [{ x: 21, y: 20 }, { x: 22, y: 20 }],
      ziel: { x: 24, y: 23 },
      marken: [{ x: 23, y: 23, zeichen: "wachtauge" }]
    };
    const stand = macheStand(karte, breite, hoehe);
    stand.zeichner.setzeFenster(breite, hoehe);
    gleich(stand.kamera.vergroesserung, erwartet, `Vergrößerung bei ${breite}×${hoehe}`);
    gleich(vergroesserungFuer(breite, hoehe), erwartet,
      `${breite}×${hoehe}: Kamera und freie Funktion rechnen dieselbe Zahl`);
    gezeichnete.add(erwartet);
    for (const zeit of ZEITEN) {
      stand.zeichner.bild(zustand, { folgt: { x: 20, y: 20 }, merker }, zeit);
    }
    const rechtecke = nurArt(stand.ctx.aufrufe, "rechteck");
    const bruch = ersterBruch(stand.ctx.aufrufe);
    if (bruch) brueche++;
    alleRechtecke += rechtecke.length;
    behaupte(bruch === null,
      `${breite}×${hoehe} bei Vergrößerung ${erwartet}: jedes der ${rechtecke.length} `
      + `Rechtecke liegt auf ganzen Bildpunkten`
      + (bruch ? ` — ${JSON.stringify(bruch)}` : ""));
    behaupte(ersteWeicheZeichnung(stand.ctx.aufrufe) === null,
      `${breite}×${hoehe}: kein Rechteck fällt, bevor die Glättung abgeschaltet ist`);
    behaupte(rechtecke.length > 500,
      `${breite}×${hoehe}: es wird überhaupt etwas gezeichnet (${rechtecke.length})`);
  }
  gleich(brueche, 0, `kein Fenster zeichnet auf halbe Bildpunkte (${alleRechtecke} Rechtecke)`);
  behaupte(gezeichnete.size >= 6,
    `die Bilder decken ${gezeichnete.size} verschiedene Vergrößerungen ab, nicht nur eine`);
  const mitPunkt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const kantenBericht = `Harte Kanten: ${brueche} von ${mitPunkt(alleRechtecke)} Rechtecken auf `
    + `einem halben Bildpunkt, über ${FENSTER.length} Fenstergrößen × ${ZEITEN.length} Bilder, `
    + `Vergrößerungen ${[...gezeichnete].sort((a, b) => a - b).join(" ")}`;
  console.log(`      · ${kantenBericht}`);
  console.log(`      · ${vergroesserungsBericht}`);
}

/* ── 3 · Die Glättung, nach jedem Setzen der Blattmaße ──────────────*/
abschnitt("3 · Glättung");
{
  const karte = macheProbeKarte();
  const stand = macheStand(karte);
  stand.zeichner.setzeFenster(320, 180);
  stand.zeichner.bild({ karte, wesen: [] }, {}, 0);
  stand.zeichner.setzeFenster(640, 360);
  stand.zeichner.bild({ karte, wesen: [] }, {}, 0.1);

  gleich(nurArt(stand.ctx.aufrufe, "blattBreite").length, 2,
    "die Blattbreite wurde zweimal gesetzt");
  const weich = ersteWeicheZeichnung(stand.ctx.aufrufe);
  behaupte(weich === null,
    "nach jedem Setzen der Blattmaße wird die Glättung abgeschaltet, bevor gezeichnet wird");
  const verspaetet = ersterVerspaeteterGriff(stand.ctx.aufrufe);
  behaupte(verspaetet === null,
    "und zwar unmittelbar danach, nicht erst wenn zufällig eine andere Stelle es tut"
    + (verspaetet ? ` — dazwischen kam ${JSON.stringify(verspaetet)}` : ""));
  behaupte(nurArt(stand.ctx.aufrufe, "glaettung").every((a) => a[1] === false),
    "die Glättung wird nur abgeschaltet, nie eingeschaltet");

  /* `setzeFenster` allein, ohne alles andere: Das ist die Zeile, an
     der es hängt, und nur so ist sie festgenagelt. */
  const einzeln = macheStand(karte);
  einzeln.ctx.aufrufe.length = 0;
  einzeln.zeichner.setzeFenster(400, 240);
  const folge = einzeln.ctx.aufrufe.map((a) => a[0]).join(",");
  gleich(folge, "blattBreite,blattHoehe,glaettung",
    "setzeFenster setzt beide Maße und schaltet danach selbst die Glättung ab");
}

/* ── 4 · Die Höhe: Schattenbalken und helle Oberkante ───────────────
   Der Kern dieser Prüfung. Ebene 3 über Ebene 1: Auf dem tieferen
   Feld muss ein schwarzer Balken von STUFEN_SCHATTEN × 2 Bildpunkten
   stehen, auf dem höheren eine helle Linie von einem Bildpunkt. */
abschnitt("4 · Höhenkante");
{
  const karte = macheProbeKarte();
  for (let x = 0; x < karte.breite; x++) karte.setze(x, 5, { ebene: 3 });
  const stand = macheStand(karte);
  stand.zeichner.setzeFenster(320, 180);
  stand.kamera.folge(6, 6, true);
  stand.zeichner.zeichneWelt(karte, null, null, 0);

  const gross = stand.kamera.vergroesserung;
  const unten = stand.kamera.feldNachBild(6, 6);
  const balken = rechteckeImFeld(stand.ctx, stand.kamera, 6, 6).filter((a) =>
    a[5] === FARBEN.kontur && a[1] === unten.x && a[2] === unten.y);
  gleich(balken.length, 1, "unter der Kante steht genau ein schwarzer Balken");
  if (balken.length === 1) {
    gleich(balken[0][3], KACHEL * gross, "der Balken ist ein ganzes Feld breit");
    gleich(balken[0][4], STUFEN_SCHATTEN * 2 * gross,
      `der Balken ist ${STUFEN_SCHATTEN} Bildpunkte je Stufe hoch, hier zwei Stufen`);
  }

  const oben = stand.kamera.feldNachBild(6, 5);
  const kante = rechteckeImFeld(stand.ctx, stand.kamera, 6, 5).filter((a) =>
    a[5] === FARBEN.steinKante && a[2] === oben.y);
  gleich(kante.length, 1, "das höhere Feld bekommt genau eine helle Oberkante");
  if (kante.length === 1) gleich(kante[0][4], gross, "die Oberkante ist ein Bildpunkt hoch");

  /* Der Gegenbeweis: Ohne Unterschied darf kein Balken entstehen —
     sonst wäre die ganze Fläche schwarz gestreift. */
  const flach = macheProbeKarte();
  const zweiter = macheStand(flach);
  zweiter.zeichner.setzeFenster(320, 180);
  zweiter.kamera.folge(6, 6, true);
  zweiter.zeichner.zeichneWelt(flach, null, null, 0);
  const ohne = rechteckeImFeld(zweiter.ctx, zweiter.kamera, 6, 6)
    .filter((a) => a[5] === FARBEN.kontur || a[5] === FARBEN.steinKante);
  gleich(ohne.length, 0, "ohne Höhenunterschied gibt es weder Balken noch Oberkante");

  /* Eine Wand zählt eine Stufe höher als ihr Feld — sonst wirft eine
     Wand auf ebenem Boden keinen Schatten, und der Raum ist eine
     Fläche. */
  const mitWand = macheProbeKarte();
  mitWand.setze(6, 5, { hindernis: HINDERNIS.wand });
  gleich(hoeheBei(mitWand, 6, 5), 1 + WAND_STUFEN, "eine Wand zählt eine Stufe höher");
  gleich(hoeheBei(mitWand, 6, 6), 1, "das Feld daneben zählt seine eigene Ebene");
  gleich(hoeheBei(mitWand, -1, 5), -1, "außerhalb der Karte wirft nichts Schatten");
}

/* ── 5 · Die Wand: Oberseite und Südflanke ──────────────────────────*/
abschnitt("5 · Wand");
{
  const karte = macheProbeKarte();
  karte.setze(6, 6, { hindernis: HINDERNIS.wand });
  const stand = macheStand(karte);
  stand.zeichner.setzeFenster(320, 180);
  stand.kamera.folge(6, 6, true);
  stand.zeichner.zeichneWelt(karte, null, null, 0);

  const gross = stand.kamera.vergroesserung;
  const ecke = stand.kamera.feldNachBild(6, 6);
  const oben = wandTon(1, false);
  const flanke = wandTon(1, true);
  const oberseite = rechteckeImFeld(stand.ctx, stand.kamera, 6, 6).filter((a) => a[5] === oben);
  const seite = rechteckeImFeld(stand.ctx, stand.kamera, 6, 6).filter((a) => a[5] === flanke);
  gleich(oberseite.length, 1, "die Wand hat eine Oberseite");
  gleich(seite.length, 1, "die Wand hat eine Südflanke");
  if (oberseite.length === 1) {
    gleich(oberseite[0][4], (KACHEL - WAND_FLANKE) * gross, "die Oberseite lässt die Flanke frei");
  }
  if (seite.length === 1) {
    gleich(seite[0][2], ecke.y + (KACHEL - WAND_FLANKE) * gross, "die Flanke liegt im Süden");
    gleich(seite[0][4], WAND_FLANKE * gross, "die Flanke ist WAND_FLANKE hoch");
  }

  /* Fehlerbuch D3: Zwei Töne in **einem** Ding brauchen 24 von 255
     wahrgenommener Helligkeit, sonst verschmelzen sie verkleinert. */
  const abstand = Math.abs(helligkeit(oben) - helligkeit(flanke));
  behaupte(abstand >= 24,
    `Oberseite und Flanke trennen ${abstand.toFixed(1)} von 255 (verlangt sind 24)`);
  console.log(`      · Wand: Oberseite ${helligkeit(oben).toFixed(1)}, `
    + `Flanke ${helligkeit(flanke).toFixed(1)}, Abstand ${abstand.toFixed(1)} von 255`);
}

/* ── 6 · Die Rampe zeigt, wohin sie führt ───────────────────────────
   In allen **sechs** Richtungen, und jedes Mal muss der Strich auf der
   Aufstiegsseite der hellste sein. Eine Rampe mit gleich hellen
   Strichen sähe genauso aus wie eine verkehrt herum gemalte.

   Seit dem 07.09.2026 sind es sechs statt vier (Vorgang #7), und ein
   „nord" gibt es nicht mehr — senkrecht nach oben liegt beim Sechseck
   kein Feld, sondern eine Kante. Geprüft wird auf Zeile 6, also einer
   **geraden** Zeile; dort liegen Nordost und Südwest senkrecht über
   und unter dem Feld, die vier anderen schräg oder seitlich.

   Ob eine Rampe senkrechte oder waagerechte Striche bekommt, hängt am
   Vorzeichen ihres Schritts — das ist grob und für die schrägen
   Richtungen noch nicht schön. Es steht hier als Messung, nicht als
   Lob: Der Bodenmaler für Sechsecke ist eigene Arbeit (Vorgang #7,
   Zweig `bild/sechseck`). */
abschnitt("6 · Rampe");
{
  const faelle = [
    { rampe: RAMPE.nordost, name: "nordost", senkrecht: true, hellOben: true },
    { rampe: RAMPE.suedost, name: "südost", senkrecht: true, hellOben: false },
    { rampe: RAMPE.west, name: "west", senkrecht: false, hellOben: true },
    { rampe: RAMPE.ost, name: "ost", senkrecht: false, hellOben: false },
    { rampe: RAMPE.nordwest, name: "nordwest", senkrecht: false, hellOben: true },
    { rampe: RAMPE.suedwest, name: "südwest", senkrecht: false, hellOben: false }
  ];
  for (const fall of faelle) {
    const karte = macheProbeKarte();
    karte.setze(6, 6, { rampe: fall.rampe });
    const stand = macheStand(karte);
    stand.zeichner.setzeFenster(320, 180);
    stand.kamera.folge(6, 6, true);
    stand.zeichner.zeichneWelt(karte, null, null, 0);
    const gross = stand.kamera.vergroesserung;

    const lang = STRICH_LAENGE * gross;
    const striche = rechteckeImFeld(stand.ctx, stand.kamera, 6, 6).filter((a) =>
      (fall.senkrecht ? (a[3] === lang && a[4] === gross) : (a[4] === lang && a[3] === gross)));
    gleich(striche.length, RAMPEN_STRICHE, `Rampe ${fall.name}: drei Querstriche`);
    if (striche.length !== RAMPEN_STRICHE) continue;

    /* Nach Lage sortieren, dann die Helligkeit vergleichen: Der
       Strich, der der Aufstiegsseite am nächsten liegt, gewinnt. */
    const nachLage = striche.slice().sort((a, b) =>
      fall.senkrecht ? a[2] - b[2] : a[1] - b[1]);
    const helle = nachLage.map((a) => helligkeit(a[5]));
    const steigend = fall.hellOben
      ? helle[0] > helle[1] && helle[1] > helle[2]
      : helle[2] > helle[1] && helle[1] > helle[0];
    behaupte(steigend,
      `Rampe ${fall.name}: der Strich auf der Aufstiegsseite ist der hellste `
      + `(${helle.map((h) => h.toFixed(1)).join(" · ")})`);

    /* Und die Striche stehen wirklich auf den drei vorgesehenen
       Lagen — nicht dreimal übereinander. */
    const lagen = nachLage.map((a) => (fall.senkrecht
      ? (a[2] - stand.kamera.feldNachBild(6, 6).y) / gross
      : (a[1] - stand.kamera.feldNachBild(6, 6).x) / gross));
    gleich(lagen.join(","), STRICH_LAGEN.join(","), `Rampe ${fall.name}: die drei Lagen`);
  }

  /* Die hellste Mischung muss sich von der dunkelsten wirklich
     unterscheiden — sonst sind drei Striche drei graue Striche. */
  const grund = bodenTon(BODEN.stein, 1, false);
  const hellster = mische(grund, FARBEN.steinKante, STRICH_HELLE[0]);
  const dunkelster = mische(grund, FARBEN.steinKante, STRICH_HELLE[STRICH_HELLE.length - 1]);
  const abstand = helligkeit(hellster) - helligkeit(dunkelster);
  behaupte(abstand >= 14,
    `hellster und dunkelster Rampenstrich trennen ${abstand.toFixed(1)} von 255`);
  console.log(`      · Rampe: Striche ${helligkeit(dunkelster).toFixed(1)} bis `
    + `${helligkeit(hellster).toFixed(1)} von 255 auf Boden ${helligkeit(grund).toFixed(1)}`);
}

/* ── 7 · Nebel des Krieges ──────────────────────────────────────────
   Drei Zustände, und alle drei müssen verschieden aussehen. Der
   wichtigste Fall steht zuletzt: Auf einem nie gesehenen Feld darf
   **kein** Wesen erscheinen. */
abschnitt("7 · Nebel");
{
  const karte = macheProbeKarte();
  const stand = macheStand(karte);
  stand.zeichner.setzeFenster(320, 180);
  stand.kamera.folge(6, 6, true);

  const gesehen = karte.index(6, 6);
  const erinnert = karte.index(7, 6);
  stand.zeichner.zeichneWelt(karte, new Set([gesehen]), new Set([erinnert]), 0);

  const voll = rechteckeImFeld(stand.ctx, stand.kamera, 6, 6);
  const matt = rechteckeImFeld(stand.ctx, stand.kamera, 7, 6);
  const dunkel = rechteckeImFeld(stand.ctx, stand.kamera, 8, 6);

  const bodenHell = bodenTon(BODEN.stein, 1, ((6 + 6) & 1) === 1);
  const bodenMatt = abdunkeln(bodenTon(BODEN.stein, 1, ((7 + 6) & 1) === 1), ERINNERT_HELLE);
  behaupte(voll.some((a) => a[5] === bodenHell), "das sichtbare Feld trägt seinen vollen Bodenton");
  behaupte(matt.some((a) => a[5] === bodenMatt),
    "das erinnerte Feld trägt denselben Ton, gedämpft mit ERINNERT_HELLE");
  gleich(dunkel.length, 1, "ein nie gesehenes Feld ist ein einziges Rechteck");
  gleich(dunkel[0][5], FARBEN.leere, "und zwar in FARBEN.leere");

  /* Der Fall, der ohne diese Arbeit falsch wäre. */
  const wesen = [{ id: 1, art: "kraetzling", seite: "brut", x: 8, y: 6, lebt: true }];
  stand.ctx.aufrufe.length = 0;
  gleich(stand.zeichner.zeichneWesen(karte, wesen, new Set([gesehen])), 0,
    "auf einem nie gesehenen Feld wird kein Wesen gezeichnet");
  gleich(nurArt(stand.ctx.aufrufe, "rechteck").length, 0, "und es entsteht kein einziges Rechteck");

  stand.ctx.aufrufe.length = 0;
  gleich(stand.zeichner.zeichneWesen(karte, wesen, new Set([erinnert])), 0,
    "auch ein erinnertes Feld zeigt kein Wesen — der Gegner ist längst woanders");

  stand.ctx.aufrufe.length = 0;
  gleich(stand.zeichner.zeichneWesen(karte, wesen, new Set([karte.index(8, 6)])), 1,
    "auf einem sichtbaren Feld wird das Wesen gezeichnet");
  behaupte(nurArt(stand.ctx.aufrufe, "rechteck").length > 20,
    "und es besteht aus mehr als einer Handvoll Rechtecke");

  /* Ein Toter wird nicht gezeichnet, und wer außerhalb der Karte
     steht, auch nicht — beides wäre ein Absturz oder ein Geist. */
  stand.ctx.aufrufe.length = 0;
  gleich(stand.zeichner.zeichneWesen(karte, [{ id: 2, art: "kraetzling", seite: "brut",
    x: 8, y: 6, lebt: false }], null), 0, "ein totes Wesen wird nicht gezeichnet");
  gleich(stand.zeichner.zeichneWesen(karte, [{ id: 3, art: "kraetzling", seite: "brut",
    x: -4, y: 6, lebt: true }], null), 0, "ein Wesen außerhalb der Karte wird nicht gezeichnet");
}

/* ── 8 · Flüssigkeiten ──────────────────────────────────────────────*/
abschnitt("8 · Flüssigkeiten");
{
  const karte = macheProbeKarte();
  karte.setze(6, 6, { fluessig: FLUESSIG.wasser });
  const stand = macheStand(karte);
  stand.zeichner.setzeFenster(320, 180);
  stand.kamera.folge(6, 6, true);
  const gross = stand.kamera.vergroesserung;

  stand.zeichner.zeichneWelt(karte, null, null, 0);
  const ruhig = rechteckeImFeld(stand.ctx, stand.kamera, 6, 6);
  behaupte(ruhig.some((a) => a[5] === FARBEN.wasser1), "die Fläche liegt im flachen Ton");
  behaupte(ruhig.some((a) => a[5] === FARBEN.wasser0),
    "der Rand steht einen Ton dunkler — sonst verläuft die Lache im Boden");
  const bloecke = ruhig.filter((a) => a[3] === LICHTPUNKT * gross && a[4] === LICHTPUNKT * gross);
  behaupte(bloecke.length > 0, "die Oberfläche ist auf LICHTPUNKT gerastert");

  /* Bewegt sie sich? Zwei verschiedene Zeiten müssen verschiedene
     Bilder geben, sonst ist die Welle eine Behauptung. */
  const spaeter = macheStand(karte);
  spaeter.zeichner.setzeFenster(320, 180);
  spaeter.kamera.folge(6, 6, true);
  spaeter.zeichner.zeichneWelt(karte, null, null, 1.4);
  const bewegt = rechteckeImFeld(spaeter.ctx, spaeter.kamera, 6, 6);
  behaupte(JSON.stringify(ruhig) !== JSON.stringify(bewegt),
    "zu einer anderen Zeit sieht die Oberfläche anders aus");

  /* Lava und Schleim stoßen Teilchen aus — aber nur im Takt und nur
     dort, wo man hinsieht. */
  const heiss = macheProbeKarte();
  for (let x = 4; x < 16; x++) {
    heiss.setze(x, 6, { fluessig: FLUESSIG.lava });
    heiss.setze(x, 7, { fluessig: FLUESSIG.schleim });
  }
  const glut = macheStand(heiss);
  glut.zeichner.setzeFenster(320, 180);
  glut.kamera.folge(9, 6, true);
  const erster = glut.zeichner.stosseQuellenAus(heiss, null, 0);
  behaupte(erster > 0, `Lava und Schleim werfen Teilchen (${erster} im ersten Takt)`);
  gleich(glut.zeichner.stosseQuellenAus(heiss, null, GLUT_TAKT / 2), 0,
    "innerhalb desselben Taktes wird nicht noch einmal geworfen");
  behaupte(glut.zeichner.stosseQuellenAus(heiss, null, GLUT_TAKT * 2) > 0,
    "im nächsten Takt wieder");
  const blind = macheStand(heiss);
  blind.zeichner.setzeFenster(320, 180);
  blind.kamera.folge(9, 6, true);
  gleich(blind.zeichner.stosseQuellenAus(heiss, new Set(), 0), 0,
    "was niemand sieht, glüht auch nicht");
}

/* ── 9 · Risse: gestreut, aber gesät ────────────────────────────────*/
abschnitt("9 · Risse");
{
  const eine = macheProbeKarte(24, 18, 1);
  const andere = macheProbeKarte(24, 18, 2);
  const a = macheStand(eine);
  const b = macheStand(andere);
  const c = macheStand(macheProbeKarte(24, 18, 1));
  for (const stand of [a, b, c]) {
    stand.zeichner.setzeFenster(320, 180);
    stand.kamera.folge(6, 6, true);
  }
  a.zeichner.zeichneWelt(eine, null, null, 0);
  b.zeichner.zeichneWelt(andere, null, null, 0);
  c.zeichner.zeichneWelt(c.kamera.karte, null, null, 0);

  behaupte(JSON.stringify(a.ctx.aufrufe) !== JSON.stringify(b.ctx.aufrufe),
    "zwei Saaten geben zwei verschiedene Böden");
  gleich(JSON.stringify(a.ctx.aufrufe), JSON.stringify(c.ctx.aufrufe),
    "dieselbe Saat gibt denselben Boden — der Riss hängt an der Karte, nicht am Bild");

  /* Der Anteil, gemessen und nicht behauptet: gezählt werden die
     Felder, in denen wirklich ein Riss steht. Ein Riss ist ein
     Rechteck von einem Bildpunkt Breite oder Höhe im Risston. */
  const gross = a.kamera.vergroesserung;
  const risston = bodenTon(BODEN.stein, 1, false);
  const felder = a.kamera.sichtbareFelder(0);
  const anzahl = (felder.bisX - felder.vonX + 1) * (felder.bisY - felder.vonY + 1);
  const risse = nurArt(a.ctx.aufrufe, "rechteck").filter((z) =>
    z[5] === abdunkeln(FARBEN.steinRiss, 1.0) && (z[3] === gross || z[4] === gross)).length;
  const anteil = (risse / anzahl) * 100;
  behaupte(risse > 0, `es stehen Risse im Boden (${risse} auf ${anzahl} Feldern)`);
  behaupte(Math.abs(anteil - RISS_ANTEIL) <= 8,
    `der gemessene Anteil ${anteil.toFixed(1)} von 100 passt zu RISS_ANTEIL ${RISS_ANTEIL}`);
  behaupte(risston !== FARBEN.steinRiss, "Risston und Bodenton sind verschieden");
  console.log(`      · Risse: ${risse} auf ${anzahl} Feldern = ${anteil.toFixed(1)} von 100 `
    + `(RISS_ANTEIL ${RISS_ANTEIL})`);
}

/* ── 10 · Merker ────────────────────────────────────────────────────*/
abschnitt("10 · Merker");
{
  const karte = macheProbeKarte();
  const stand = macheStand(karte);
  stand.zeichner.setzeFenster(320, 180);
  stand.kamera.folge(6, 6, true);
  gleich(stand.zeichner.zeichneMerker(karte, null), 0, "ohne Merker wird nichts gezeichnet");

  stand.ctx.aufrufe.length = 0;
  const marken = stand.zeichner.zeichneMerker(karte, {
    reichweite: new Set([karte.index(6, 6), karte.index(7, 6)]),
    weg: [{ x: 6, y: 7 }],
    ziel: { x: 8, y: 8 },
    marken: [{ x: 9, y: 9, zeichen: "wachtauge" }]
  });
  gleich(marken, 5, "zwei Reichweitenfelder, ein Wegpunkt, ein Ziel, ein Zeichen");
  behaupte(ersterBruch(stand.ctx.aufrufe) === null, "auch die Merker liegen auf ganzen Punkten");

  /* Der Umriss läuft nur außen herum: Zwischen zwei Feldern der
     Reichweite darf keine Linie stehen, sonst ist die Fläche ein
     Gitter und man sieht das Gelände nicht mehr. */
  const gross = stand.kamera.vergroesserung;
  const ecke = stand.kamera.feldNachBild(6, 6);
  const kanten = rechteckeImFeld(stand.ctx, stand.kamera, 6, 6)
    .filter((z) => z[5] === FARBEN.apVoll);
  /* Wie viele Kanten es sein müssen, wird nicht abgeschrieben, sondern
     gezählt: alle Nachbarn, die **nicht** zur Reichweite gehören. Auf
     dem Quadrat waren das drei von vier, auf dem Sechseck sind es fünf
     von sechs — die Aussage („zwischen zwei Reichweitenfeldern steht
     keine Linie") ist dieselbe geblieben. */
  const reichSatz = new Set([karte.index(6, 6), karte.index(7, 6)]);
  const sollKanten = nachbarn(karte, 6, 6)
    .filter((n) => !reichSatz.has(karte.index(n.x, n.y))).length;
  gleich(kanten.length, sollKanten,
    `das linke Feld bekommt ${sollKanten} Kanten — eine je Nachbar außerhalb der Reichweite`);
  behaupte(!kanten.some((z) => z[1] === ecke.x + (KACHEL - 1) * gross),
    "zur Nachbarin hin bleibt der Umriss offen");

  const unbekannt = { marken: [{ x: 2, y: 2, zeichen: "gibtsnicht" }] };
  gleich(stand.zeichner.zeichneMerker(karte, unbekannt), 0,
    "ein unbekanntes Zeichen wird übergangen, statt zu werfen");
}

/* ── 11 · Zweimal dieselbe Zeit, dasselbe Bild ──────────────────────
   Zwei vollständige Stände, die einander nicht kennen, zeichnen
   dieselbe Folge von Bildern. Weicht ein einziger Aufruf ab, steckt
   irgendwo ein Zufall oder eine Uhr. */
abschnitt("11 · Determinismus");
{
  const bauKarte = () => {
    const karte = macheProbeKarte(24, 18, 90210);
    for (let x = 0; x < karte.breite; x++) karte.setze(x, 5, { ebene: 3 });
    karte.setze(6, 6, { rampe: RAMPE.nordost });
    karte.setze(9, 9, { fluessig: FLUESSIG.lava });
    karte.setze(10, 9, { fluessig: FLUESSIG.schleim });
    karte.setze(3, 3, { hindernis: HINDERNIS.fass });
    karte.setze(4, 3, { hindernis: HINDERNIS.fackelsockel });
    karte.setze(11, 11, { hindernis: HINDERNIS.wand });
    karte.lichter = [{ x: 4, y: 3, art: "fackel", staerke: 1 }];
    return karte;
  };
  const zeiten = [0, 0.2, 0.55, 1.1];
  const lauf = () => {
    const karte = bauKarte();
    const stand = macheStand(karte);
    stand.zeichner.setzeFenster(320, 180);
    const zustand = {
      karte,
      wesen: [
        { id: 1, art: "spaeher", seite: "jaeger", x: 4, y: 4, lebt: true, spielerPlatz: 1 },
        { id: 2, art: "grubenhund", seite: "brut", x: 9, y: 7, lebt: true }
      ]
    };
    for (const zeit of zeiten) {
      const ansicht = { folgt: { x: 6, y: 6 }, merker: { ziel: { x: 9, y: 7 } } };
      stand.zeichner.bild(zustand, ansicht, zeit);
    }
    return stand.ctx.aufrufe;
  };
  const ersteFolge = lauf();
  const zweiteFolge = lauf();
  gleich(zweiteFolge.length, ersteFolge.length, "beide Läufe machen gleich viele Aufrufe");
  let ersterUnterschied = -1;
  for (let i = 0; i < ersteFolge.length; i++) {
    if (JSON.stringify(ersteFolge[i]) !== JSON.stringify(zweiteFolge[i])) {
      ersterUnterschied = i;
      break;
    }
  }
  gleich(ersterUnterschied, -1, "zweimal dieselbe Zeitfolge gibt dieselbe Aufrufliste");
  behaupte(ersteFolge.length > 4000,
    `die Probe ist groß genug, um etwas zu finden (${ersteFolge.length} Aufrufe)`);
  console.log(`      · Determinismus: ${zeiten.length} Bilder, `
    + `${ersteFolge.length} Aufrufe, ${nurArt(ersteFolge, "rechteck").length} Rechtecke`);

  /* Und der Beweis, dass die Prüfung überhaupt etwas sehen könnte:
     Eine andere Zeit ergibt eine andere Liste. */
  const karte = bauKarte();
  const anders = macheStand(karte);
  anders.zeichner.setzeFenster(320, 180);
  anders.zeichner.bild({ karte, wesen: [] }, {}, 0.7);
  const gleiche = macheStand(bauKarte());
  gleiche.zeichner.setzeFenster(320, 180);
  gleiche.zeichner.bild({ karte: gleiche.kamera.karte, wesen: [] }, {}, 0.9);
  behaupte(JSON.stringify(anders.ctx.aufrufe) !== JSON.stringify(gleiche.ctx.aufrufe),
    "zwei verschiedene Zeiten geben zwei verschiedene Listen");

  /* Der Text selbst: Gesucht wird der **Aufruf**, nicht das Wort —
     in der Kopfnotiz steht `Math.random` als Begründung, und eine
     Prüfung, die daran anschlägt, prüft die Rechtschreibung. */
  const quelle = readFileSync(join(WURZEL, "runtime/zeichnen.js"), "utf8");
  behaupte(!/Math\.random\s*\(/.test(quelle), "im Zeichner wird kein Math.random gerufen");
  behaupte(!/new Date\s*\(|Date\.now\s*\(/.test(quelle), "und keine Uhr gefragt");
  behaupte(/Math\.random\s*\(/.test("const a = Math.random();"),
    "die Suche findet einen wirklichen Aufruf — sonst prüfte sie nichts");
}

/* ── 12 · Das ganze Bild ────────────────────────────────────────────*/
abschnitt("12 · Das ganze Bild");
{
  const karte = macheProbeKarte();
  karte.lichter = [{ x: 6, y: 6, art: "fackel", staerke: 1 }];
  const stand = macheStand(karte);
  stand.zeichner.setzeFenster(320, 180);
  gleich(stand.zeichner.bild(null, {}, 0), 0, "ohne Zustand wird nichts gezeichnet");
  gleich(stand.zeichner.bild({ karte: null }, {}, 0), 0, "ohne Karte auch nicht");

  const rechtecke = stand.zeichner.bild({ karte, wesen: [] }, {}, 0.5);
  behaupte(rechtecke > 1000, `ein volles Bild sind ${rechtecke} Rechtecke`);
  const mischen = nurArt(stand.ctx.aufrufe, "mischen");
  gleich(mischen[mischen.length - 1][1], "source-over",
    "nach dem Licht steht die Mischart wieder auf source-over");
  behaupte(ersterBruch(stand.ctx.aufrufe) === null, "auch im ganzen Bild ist nichts krumm");
  console.log(`      · Ein Bild bei 320×180, Vergrößerung ${stand.kamera.vergroesserung}: `
    + `${rechtecke} Rechtecke`);
}

abschnitt("13 · Der Nebel deckt auch das Licht ab");
{
  /* ⚠️ Dieser Abschnitt steht hier wegen eines Fehlers, den **zwei**
     Anläufe nicht gefangen haben und den keine Zahl gezeigt hat.

     Die Lichtkarte weiß nichts vom Nebel des Krieges: Sie legt ihre
     warmen Anteile additiv über das ganze Fenster — auch über Fels, in
     dem noch nie jemand stand. Im Bild wurde daraus ein brauner
     Schleier über der halben Karte, also genau das Gegenteil der
     Vorlage („schwarze Tiefe ringsum").

     Der erste Anlauf einer Abdeckung benutzte `istDrin`, das für eine
     fehlende Menge absichtlich `true` liefert — damit galt jedes Feld
     als erinnert und nichts wurde abgedeckt. Der zweite las die
     Feldgrenzen aus `kameraFenster()`, das Bildpunkte liefert; die
     Schleife lief kein einziges Mal. **Beide Male sah das Bild
     plausibel aus**, weil jeder Lauf eine andere Saat hat.

     Deshalb wird hier nicht die Absicht geprüft, sondern die Wirkung:
     Liegt am Ende auf einem nie gesehenen Feld die Leerfarbe? */
  const karte = macheProbeKarte();
  karte.lichter = [{ x: 6, y: 6, art: "fackel", staerke: 1 }];
  const stand = macheStand(karte);
  stand.zeichner.setzeFenster(320, 180);

  /* Genau ein Feld ist sichtbar, alles andere war nie zu sehen. */
  const sichtbar = new Set([karte.index(6, 6)]);
  stand.ctx.aufrufe.length = 0;
  stand.zeichner.bild({ karte, wesen: [] },
    { sichtbar, erinnert: new Set() }, 0.5);

  const fenster = stand.kamera.sichtbareFelder(0);
  const fern = { x: fenster.bisX, y: fenster.bisY };
  const ecke = stand.kamera.feldNachBild(fern.x, fern.y);
  /* Das Blatt schreibt ein Rechteck als ["rechteck", x, y, b, h, farbe]
     mit — die Farbe steht also im Aufruf selbst. Der **letzte**
     Aufruf, der dieses Feld trifft, gibt seine Farbe. */
  const fuellungen = nurArt(stand.ctx.aufrufe, "rechteck");
  for (const [, x, y, b, h, farbe] of fuellungen) {
    if (ecke.x >= x && ecke.x < x + b && ecke.y >= y && ecke.y < y + h) {
      fern.farbe = farbe;
    }
  }
  behaupte(fuellungen.length > 0, `${fuellungen.length} Füllungen im Bild`);
  gleich(fern.farbe, FARBEN.leere,
    `das nie gesehene Feld ${fern.x},${fern.y} bleibt am Ende die Leerfarbe`);
}

ende("Weltzeichner");
