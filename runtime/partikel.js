/* [Aufgabe: Bild] Pixelpartikel aus festem Vorrat — Funken, Blut,
   Staub, Glut, Zauberstaub, Rauch, Splitter und Tropfen.

   ── Warum ein fester Vorrat und kein Erzeugen je Bild ──────────────

   Ein Treffer stößt zehn Teilchen aus, ein Kampf hat hundert Treffer,
   und jedes Bild rechnet weiter. Wer je Ausstoß neue Objekte anlegt,
   erzeugt in einer Minute Zehntausende kurzlebige Objekte; die
   Aufräumarbeit dahinter kommt als Ruckeln zurück, und zwar genau im
   Getümmel, wo es am meisten stört. Deshalb steht der Vorrat beim
   Anlegen fest und wird nur noch überschrieben.

   **Was passiert, wenn er voll ist.** Der Ring überschreibt das am
   längsten belegte Fach. Er wirft nicht, er verschluckt den Ausstoß
   nicht, und die Zahl lebender Teilchen kann die Höchstzahl nie
   überschreiten. Ein Funkenregen, der plötzlich aussetzt, weil der
   Vorrat voll ist, sieht kaputt aus; ein Funkenregen, dessen ältestes
   Korn eine Zehntelsekunde früher verschwindet, fällt niemandem auf.

   ── Warum „Schwere" hier bremst und nicht fallen lässt ─────────────

   Das Bild ist **exakt von oben**. Es gibt kein Unten — ein Teilchen,
   das „fällt", flöge im Bild nach Süden, und der ganze Kerker
   bekäme eine Schräglage, die er nicht hat. `schwere` ist deshalb die
   Bremsung je Sekunde: Was schwer ist, kommt schnell zur Ruhe und
   bleibt liegen (Blut, Splitter); was leicht ist, treibt weiter
   (Rauch, Zauberstaub). Dasselbe gilt für die Glut: Von oben gesehen
   steigt nichts sichtbar, also erzählt sie ihr Steigen durch
   Verharren und langsames Verlöschen.

   ── Warum das Verblassen über Farben läuft und nicht über Alpha ────

   Ein durchscheinendes Teilchen mischt sich mit dem Untergrund, und
   der Browser rechnet dabei Zwischentöne aus, die in keiner Palette
   stehen — aus Pixelgrafik wird Farbbrei. Jede Ausstoßart hat
   stattdessen eine **Farbrampe** aus drei Tönen der Palette, und das
   Teilchen wandert sie mit sinkendem Leben hinab. Das ist das
   Verblassen, das Pixelgrafik kennt.

   ── Warum die Bewegung in Teilschritten läuft ──────────────────────

   Ein Splitter fliegt 130 Bildpunkte je Sekunde, ein Bild dauert eine
   Sechzigstelsekunde — das sind gut zwei Bildpunkte. Bei einem
   Ruckler von einer Zehntelsekunde sind es dreizehn, und damit
   springt er über eine ganze Wand hinweg, ohne sie je zu berühren.
   Deshalb wird jeder Schritt in Stücke von höchstens einem halben
   Feld zerlegt. Das ist der Fall, der ohne diese Arbeit falsch wäre —
   und er tritt nur bei Last auf, also genau dann, wenn niemand
   hinsieht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/palette.js` (`FARBEN` — jeder Ton kommt von dort),
   `runtime/licht.js` (`KACHEL`, und `leuchtende()` liefert ihm die
   bewegten Quellen), `spiel/zufall.mjs` (`macheZufall` — derselbe
   Strom wie im Kern, hier aber ein eigener, damit das Streuen keinen
   Trefferwurf verschiebt), `spiel/gitter.mjs` mittelbar über die
   gereichte Karte (`blocktBewegung`, `ebeneBei`), `runtime/zeichnen.js`
   (zeichnet vorher die Welt) und `werkzeuge/pruefe-bild.mjs`. */

import { FARBEN } from "./palette.js";
import { KACHEL } from "./licht.js";
import { macheZufall } from "../spiel/zufall.mjs";

/* Höchstens ein halbes Feld je Teilschritt — siehe Kopfnotiz. */
const SCHRITT_HOECHSTENS = KACHEL / 2;

/* Wie viel Schwung ein Aufprall übrig lässt. Nicht 0 (dann klebte
   alles an der Wand, als wäre sie Leim) und nicht nahe 1 (dann
   springt Blut wie ein Flummi durch den Raum). */
const PRALL = 0.4;

/* ── Die acht Ausstoßarten ──────────────────────────────────────────

   Je Art: `farben` die Rampe von hell nach dunkel, `anzahl` wie viele
   Teilchen ein Ausstoß wirft, `tempo` in Bildpunkten je Sekunde,
   `leben` in Sekunden, `schwere` die Bremsung je Sekunde, `kante` die
   Kantenlänge in Bildpunkten (1 oder 2), `leuchtet`, ob das Teilchen
   ins Licht einträgt, und `schrumpft`, ob es zur Hälfte des Lebens
   von 2 auf 1 zurückgeht. */
export const AUSSTOSS = {
  /* Stahl auf Stahl. Wenige, sehr schnelle, sehr kurze Funken, die
     hell anfangen und über Orange verglühen — die Kürze ist das
     ganze Erzählen: Ein Funke, der eine halbe Sekunde lebt, sieht aus
     wie ein Leuchtkäfer. Sie leuchten, sonst hörte der Regen im
     Dunkeln an einer unsichtbaren Kante auf. */
  funken: {
    farben: [FARBEN.flammeWeiss, FARBEN.flammeHell, FARBEN.glut],
    anzahl: [6, 10], tempo: [40, 110], leben: [0.18, 0.35],
    schwere: 6, kante: 1, leuchtet: true, schrumpft: false
  },

  /* Stahl in Fleisch. Mehr Teilchen als bei Funken, langsamer, deutlich
     länger sichtbar und schwer: Blut fliegt kurz und bleibt dann
     liegen. Die Rampe geht von hellem Rot ins fast Schwarze — dieselbe
     Rampe, aus der die Blutlachen des Kerkers gemalt sind. */
  blut: {
    farben: [FARBEN.blut2, FARBEN.blut1, FARBEN.blut0],
    anzahl: [8, 14], tempo: [30, 80], leben: [0.30, 0.60],
    schwere: 9, kante: 1, leuchtet: false, schrumpft: false
  },

  /* Der Aufschlag nach einem Sturz. Viele, langsame, lang lebende
     Körner in Steintönen, die flach nach allen Seiten wegkriechen —
     ein Staubring, kein Springbrunnen. Er ist das einzige Bild, das
     einen Sturz von zwei Ebenen von einem Schritt hinab unterscheidet,
     und darf deshalb ruhig eine Sekunde stehen bleiben. */
  staub: {
    farben: [FARBEN.stein3, FARBEN.stein2, FARBEN.stein1],
    anzahl: [10, 16], tempo: [12, 34], leben: [0.50, 0.90],
    schwere: 4, kante: 1, leuchtet: false, schrumpft: false
  },

  /* Fackeln und Lava, dauerhaft. Ein bis zwei Körner je Ausstoß, kaum
     Tempo, langes Leben — sie sollen über der Flamme stehen, nicht von
     ihr wegfliegen. Wer hier die Zahl erhöht, bekommt aus dreißig
     Fackeln einen Funkenschneesturm. */
  glut: {
    farben: [FARBEN.flammeHell, FARBEN.flamme, FARBEN.glutTief],
    anzahl: [1, 2], tempo: [2, 7], leben: [0.90, 1.60],
    schwere: 1.2, kante: 1, leuchtet: true, schrumpft: false
  },

  /* Arkane Wirkung. Fast schwerelos, taumelt lange, leuchtet kalt —
     der Gegenentwurf zum Funken: Wo Stahl kurz und heiß spritzt,
     schwebt Zauber langsam und blau. Ohne diesen Unterschied sähe
     jeder Zauber aus wie ein Schwerthieb. */
  zauberstaub: {
    farben: [FARBEN.arkanWeiss, FARBEN.arkanHell, FARBEN.arkan1],
    anzahl: [8, 14], tempo: [10, 30], leben: [0.60, 1.10],
    schwere: 0.6, kante: 1, leuchtet: true, schrumpft: false
  },

  /* Rauch. Wenige, große, sehr langsame, sehr lange Flecken in
     Steintönen, die zur Hälfte des Lebens von zwei auf einen
     Bildpunkt zusammengehen — das ist bei Draufsicht die einzige
     Art, „es löst sich auf" zu zeigen. */
  rauch: {
    farben: [FARBEN.stein2, FARBEN.stein1, FARBEN.stein0],
    anzahl: [3, 6], tempo: [4, 12], leben: [1.20, 2.00],
    schwere: 0.4, kante: 2, leuchtet: false, schrumpft: true
  },

  /* Ein zerborstenes Fass. Das schnellste und schwerste im Vorrat, und
     als einziges zwei Bildpunkte breit: Holz fliegt weit, prallt
     hörbar ab und liegt dann herum. Die Rampe endet in der Kontur,
     damit die letzten Späne zu Schatten werden statt zu verschwinden. */
  splitter: {
    farben: [FARBEN.holz1, FARBEN.holz0, FARBEN.kontur],
    anzahl: [7, 12], tempo: [50, 130], leben: [0.35, 0.70],
    schwere: 7, kante: 2, leuchtet: false, schrumpft: false
  },

  /* Schleim und Wasser. Kurze, schwere Spritzer. Die Rampe steht auf
     Wasser; für Schleim reicht man `farben` und `leuchtet` mit —
     zwei fast gleiche Einträge in dieser Tabelle wären zwei
     Wahrheiten über dieselbe Bewegung. */
  tropfen: {
    farben: [FARBEN.wasserGlanz, FARBEN.wasser1, FARBEN.wasser0],
    anzahl: [4, 8], tempo: [20, 55], leben: [0.25, 0.50],
    schwere: 8, kante: 1, leuchtet: false, schrumpft: false
  }
};

/* Die Rampe für schleimige Tropfen — eine Beigabe, kein neuer
   Eintrag: `stosseAus("tropfen", x, y, { farben: SCHLEIM_RAMPE,
   leuchtet: true })`. */
export const SCHLEIM_RAMPE = [FARBEN.schleimHell, FARBEN.schleim1, FARBEN.schleim0];

const RUNDUM = Math.PI * 2;

/* Ein Feld aus einer Weltbildpunkt-Achse. Eigene Funktion, weil der
   Fehler „durch Null geteilt" hier nie auffiele: Ein Teilchen bei
   x = −1 gehört in Feld −1 und nicht in Feld 0, und `Math.trunc`
   gäbe genau das Falsche. */
const feldVon = (bildpunkt) => Math.floor(bildpunkt / KACHEL);

/* Ist der Weg von einem Feld ins nächste versperrt?

   Zwei Gründe, und der zweite ist der, den man vergisst: Eine
   **Höhenkante** ist für ein Staubkorn eine Wand. Ein Funke, der eine
   Stufe hinaufspringt, sähe aus, als schwebte er — hinab darf er
   dagegen, dann fällt er über die Kante, und genau das soll er. */
function versperrt(karte, vonX, vonY, zuX, zuY) {
  if (!karte) return false;
  if (zuX === vonX && zuY === vonY) return false;
  if (!karte.drin(zuX, zuY)) return true;
  if (karte.blocktBewegung(zuX, zuY)) return true;
  return karte.ebeneBei(zuX, zuY) > karte.ebeneBei(vonX, vonY);
}

/* ── Das Werk ───────────────────────────────────────────────────────

   `saat` macht den Ausstoß wiederholbar: Zweimal dasselbe Werk mit
   derselben Saat und denselben Aufrufen ergibt dieselben Teilchen.
   Ohne das ließe sich am Partikelbild nichts messen — und ein
   Bildschirmfoto wäre nicht nachstellbar. */
export function machePartikelwerk(hoechstzahl = 2000, saat = 0x51ed2701) {
  const anzahl = Math.max(1, Math.floor(hoechstzahl) || 1);
  const zufall = macheZufall(saat);
  const vorrat = new Array(anzahl);
  for (let i = 0; i < anzahl; i++) {
    vorrat[i] = {
      x: 0, y: 0, vx: 0, vy: 0, leben: 0, lebenMax: 1,
      farbe: FARBEN.kontur, farben: AUSSTOSS.staub.farben,
      groesse: 1, schwere: 0, leuchtet: false, schrumpft: false, staerke: 1
    };
  }
  let naechstes = 0;
  let lebend = 0;

  /* Die Liste für `leuchtende()` samt ihren Einträgen wird
     wiederverwendet — sonst entstünde je Bild genau der Objektberg,
     den der feste Vorrat vermeiden soll. */
  const leuchtVorrat = [];
  const leuchtListe = [];

  const spanneAus = (wert, standard) => Array.isArray(wert) ? wert : standard;

  /* Wirft einen Schwall. `opts`: `anzahl`, `tempo` und `leben` als
     Paar `[von, bis]`, `richtung` und `streuung` im Bogenmaß,
     `farben` als eigene Rampe, dazu `leuchtet`, `groesse` und
     `staerke`. Gibt zurück, wie viele Teilchen geworfen wurden. */
  function stosseAus(art, x, y, opts = {}) {
    const vorlage = AUSSTOSS[art];
    if (!vorlage || !Number.isFinite(x) || !Number.isFinite(y)) return 0;
    const wieViele = Number.isFinite(opts.anzahl)
      ? Math.max(0, Math.floor(opts.anzahl))
      : zufall.ganz(vorlage.anzahl[0], vorlage.anzahl[1]);
    const tempo = spanneAus(opts.tempo, vorlage.tempo);
    const leben = spanneAus(opts.leben, vorlage.leben);
    const farben = Array.isArray(opts.farben) && opts.farben.length
      ? opts.farben : vorlage.farben;
    const leuchtet = opts.leuchtet === undefined ? vorlage.leuchtet : opts.leuchtet === true;
    const kante = Number.isFinite(opts.groesse) ? (opts.groesse >= 2 ? 2 : 1) : vorlage.kante;
    const staerke = Number.isFinite(opts.staerke) ? opts.staerke : 1;
    const streuung = Number.isFinite(opts.streuung) ? opts.streuung : RUNDUM;
    const richtung = Number.isFinite(opts.richtung) ? opts.richtung : 0;

    for (let n = 0; n < wieViele; n++) {
      const winkel = richtung + zufall.zwischen(-streuung / 2, streuung / 2);
      const schwung = zufall.zwischen(tempo[0], tempo[1]);
      const dauer = zufall.zwischen(leben[0], leben[1]);
      const teilchen = vorrat[naechstes];
      naechstes = (naechstes + 1) % anzahl;
      if (teilchen.leben <= 0) lebend++;
      teilchen.x = x;
      teilchen.y = y;
      teilchen.vx = Math.cos(winkel) * schwung;
      teilchen.vy = Math.sin(winkel) * schwung;
      teilchen.leben = dauer;
      teilchen.lebenMax = dauer;
      teilchen.farben = farben;
      teilchen.farbe = farben[0];
      teilchen.groesse = kante;
      teilchen.schwere = vorlage.schwere;
      teilchen.leuchtet = leuchtet;
      teilchen.schrumpft = vorlage.schrumpft;
      teilchen.staerke = staerke;
    }
    return wieViele;
  }

  /* Ein Teilstück der Bewegung, Achse für Achse. Getrennt, weil ein
     Teilchen, das schräg auf eine Ecke trifft, sonst stecken bliebe:
     So rutscht es an der Wand entlang, statt davor zu stehen. */
  function schiebe(teilchen, dt, karte) {
    const vonX = feldVon(teilchen.x);
    const vonY = feldVon(teilchen.y);
    const zielX = teilchen.x + teilchen.vx * dt;
    if (versperrt(karte, vonX, vonY, feldVon(zielX), vonY)) teilchen.vx = -teilchen.vx * PRALL;
    else teilchen.x = zielX;
    const zielY = teilchen.y + teilchen.vy * dt;
    const jetztX = feldVon(teilchen.x);
    if (versperrt(karte, jetztX, vonY, jetztX, feldVon(zielY))) teilchen.vy = -teilchen.vy * PRALL;
    else teilchen.y = zielY;
  }

  function bewege(teilchen, dt, karte) {
    let rest = dt;
    /* Zwanzig Teilstücke reichen für 20 × 8 = 160 Bildpunkte in einem
       Bild — mehr fliegt hier nichts, und eine feste Obergrenze ist
       das einzige, was eine Endlosschleife sicher ausschließt. */
    for (let versuch = 0; versuch < 20 && rest > 0; versuch++) {
      const schwung = Math.hypot(teilchen.vx, teilchen.vy);
      const stueck = schwung * rest > SCHRITT_HOECHSTENS
        ? SCHRITT_HOECHSTENS / schwung : rest;
      schiebe(teilchen, stueck, karte);
      rest -= stueck;
    }
  }

  /* Ein Zeitschritt für alle. `dt` in Sekunden, `karte` darf fehlen —
     dann fliegt alles frei, was für die Anzeige über dem Spielfeld
     genügt. Gibt die Zahl der lebenden Teilchen zurück. */
  function schritt(dt, karte) {
    if (!(dt > 0)) return lebend;
    for (const teilchen of vorrat) {
      if (teilchen.leben <= 0) continue;
      teilchen.leben -= dt;
      if (teilchen.leben <= 0) { teilchen.leben = 0; lebend--; continue; }
      const bremse = Math.max(0, 1 - teilchen.schwere * dt);
      teilchen.vx *= bremse;
      teilchen.vy *= bremse;
      bewege(teilchen, dt, karte);
      const verbraucht = 1 - teilchen.leben / teilchen.lebenMax;
      const stufen = teilchen.farben.length;
      const stufe = Math.min(stufen - 1, Math.floor(verbraucht * stufen));
      teilchen.farbe = teilchen.farben[stufe];
      if (teilchen.schrumpft && verbraucht >= 0.5) teilchen.groesse = 1;
    }
    return lebend;
  }

  /* Zeichnet jedes lebende Teilchen als gefülltes Rechteck auf
     **ganzen** Bildpunkten. Die Zwischenposition wird vor der
     Umrechnung abgerundet, nicht danach: Wer erst mit der
     Vergrößerung multipliziert und dann rundet, bekommt bei
     Vergrößerung 4 eine Kante, die um bis zu drei Bildpunkte
     wandert (Fehlerbuch D1). Gibt die Zahl der Rechtecke zurück. */
  function zeichne(ctx, kamera = {}) {
    if (!ctx) return 0;
    ctx.imageSmoothingEnabled = false;
    const vergroesserung = Math.max(1, Math.floor(kamera.vergroesserung || 1));
    const eckeX = Math.round(kamera.x || 0);
    const eckeY = Math.round(kamera.y || 0);
    const blatt = ctx.canvas || {};
    const fensterBreite = Number.isFinite(kamera.breite) ? kamera.breite
      : (Number.isFinite(blatt.width) ? blatt.width : 0);
    const fensterHoehe = Number.isFinite(kamera.hoehe) ? kamera.hoehe
      : (Number.isFinite(blatt.height) ? blatt.height : 0);
    let gezeichnet = 0;
    let letzte = null;
    for (const teilchen of vorrat) {
      if (teilchen.leben <= 0) continue;
      const kante = teilchen.groesse * vergroesserung;
      const schirmX = (Math.floor(teilchen.x) - eckeX) * vergroesserung;
      const schirmY = (Math.floor(teilchen.y) - eckeY) * vergroesserung;
      if (fensterBreite > 0 && (schirmX + kante <= 0 || schirmX >= fensterBreite)) continue;
      if (fensterHoehe > 0 && (schirmY + kante <= 0 || schirmY >= fensterHoehe)) continue;
      if (teilchen.farbe !== letzte) { ctx.fillStyle = teilchen.farbe; letzte = teilchen.farbe; }
      ctx.fillRect(schirmX, schirmY, kante, kante);
      gezeichnet++;
    }
    return gezeichnet;
  }

  /* Die leuchtenden Teilchen als Lichtquellen für
     `runtime/licht.js`. **`x` und `y` sind Felder, keine
     Bildpunkte** — die Lichtkarte rechnet in Feldern und leuchtet aus
     der Feldmitte; deshalb das halbe Feld Abzug, sonst säße der Funke
     im Bild ein halbes Feld weiter unten rechts als in der Welt.

     Die Stärke sinkt mit dem Leben: Ein verglühender Funke, der bis
     zum letzten Bild gleich hell leuchtet und dann verschwindet,
     lässt den ganzen Raum zucken. */
  function leuchtende() {
    leuchtListe.length = 0;
    let n = 0;
    for (const teilchen of vorrat) {
      if (teilchen.leben <= 0 || !teilchen.leuchtet) continue;
      if (!leuchtVorrat[n]) leuchtVorrat[n] = { x: 0, y: 0, farbe: "", staerke: 0 };
      const eintrag = leuchtVorrat[n];
      eintrag.x = teilchen.x / KACHEL - 0.5;
      eintrag.y = teilchen.y / KACHEL - 0.5;
      eintrag.farbe = teilchen.farbe;
      eintrag.staerke = teilchen.staerke * (teilchen.leben / teilchen.lebenMax);
      leuchtListe.push(eintrag);
      n++;
    }
    return leuchtListe;
  }

  return {
    hoechstzahl: anzahl,
    stosseAus, schritt, zeichne, leuchtende,
    anzahlLebend: () => lebend,
    teilchen: () => vorrat,
    /* Alles auf einmal löschen — beim Wechsel in eine neue Kerkertiefe
       darf kein Funke aus dem alten Stockwerk übrig bleiben. */
    leere() {
      for (const teilchen of vorrat) teilchen.leben = 0;
      lebend = 0;
      naechstes = 0;
      return anzahl;
    }
  };
}
