/* [Aufgabe: Prüfwesen] Die Werkbank, auf der ein Handy nachgestellt
   wird: ein mitschreibendes Zeichenblatt, ein Fenster mit krummem
   Bildpunktverhältnis und die vier Ereignisse eines Tipps auf Android.

   ── Warum das eine eigene Datei ist ────────────────────────────────

   `werkzeuge/pruefe-tippen.mjs` misst damit die Verdrahtung vom Tipp
   bis in den Kern. Beides in einer Datei riss die Grenze von tausend
   Zeilen (Regel 8) — und die wird nicht geduldet, sondern geteilt.
   Eine Kulisse gehört ohnehin keiner Vorstellung: Wer morgen den
   Vorlauf oder das Vollbild von einer zweiten Seite her messen will,
   soll dieselbe Bühne bekommen und nicht eine zweite bauen, die
   langsam auseinanderläuft.

   Der Name beginnt bewusst nicht mit `pruefe-`: `pruefe-alles.mjs`
   startet jede Datei dieses Musters als eigene Prüfung, und eine
   „Prüfung", die nichts behauptet, wäre für immer grün. Diese Datei
   behauptet nichts und ruft `ende()` nicht auf.
   `werkzeuge/buehne-eingabe.mjs` und `werkzeuge/buehne-oberflaeche.mjs`
   tun dasselbe für die Bedienung und die Anzeige — dasselbe Muster,
   und zwei Muster für dieselbe Sache wären wieder zwei Wahrheiten.

   ── Warum `PointerEvent` und `devicePixelRatio` dazugehören ────────

   `werkzeuge/pruefe-app.mjs` baut einen ähnlichen Ersatz, aber ohne
   diese beiden. Ohne `PointerEvent` nimmt `runtime/start.js` die
   Rückfalltür für alte Browser, und der ganze Zeigerweg bliebe
   ungeprüft; ohne `devicePixelRatio` ließe sich die krumme
   Vergrößerung eines Handys gar nicht nachstellen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/pruefe-tippen.mjs` (misst hierüber),
   `werkzeuge/pruefe-bild.mjs` und `werkzeuge/pruefe-raster-projektion.mjs`
   (nehmen `macheBildflaeche` für den Pixelpuffer des Lichts),
   `runtime/start.js`
   (holt sich `document`, `requestAnimationFrame` und das Blatt von
   hier), `runtime/eingabe.js` (hängt sich an dieselben Hörer),
   `runtime/palette.js` (`FARBEN.hudGrund` — daran wird die Leiste im
   Bild wiedererkannt), `runtime/licht.js` (`KACHEL`),
   `runtime/torwaechter.js` (`merkeTor` — für `torSchonOffen`),
   `werkzeuge/buehne-eingabe.mjs` und `werkzeuge/buehne-oberflaeche.mjs`
   (dasselbe Muster). */

import { FARBEN } from "../runtime/palette.js";
import { KACHEL } from "../runtime/licht.js";
import { merkeTor } from "../runtime/torwaechter.js";

/* Das Handy, an dem gemessen wird: ein Pixel 7 quer, mit dem **ganzen**
   Bildschirm — 412 x 915 CSS-Punkte bei devicePixelRatio 2,625. Das ist
   das Maß aus der Geräteliste von Chrome DevTools.

   Playwright führt dasselbe Gerät mit kleineren Zahlen, weil es die
   Browserleisten schon abzieht. Nachzurechnen, wo Playwright liegt —
   dieses Projekt braucht es nicht, die Prüfkette läuft am Ersatzbrowser
   hierunter:

     node -e "console.log(require('playwright-core').devices['Pixel 7 landscape'])"

   Am 06.09.2026 so gemessen: 863 x 360 bei 2,625. Hier steht bewusst die
   größere Zahl, denn gemessen wird die Zeichenfläche im Vollbild ohne
   Leisten — genau der Fall, für den das Spiel gebaut ist. Die krumme
   2,625 fällt in beiden Angaben gleich aus und ist der eigentliche
   Punkt: Sie macht halbe Bildpunkte, wenn man sie nicht abfängt. */
export const HANDY = { breite: 915, hoehe: 412, dpr: 2.625 };

/* ══════════════════════════════════════════════════════════════════
   Der Browser eines Mitspielers, der schon einmal drin war
   ══════════════════════════════════════════════════════════════════

   Seit dem 07.09.2026 steht vor dem Vorlauf der Torwächter
   (`runtime/torwaechter.js`): Ohne das Zugangswort entsteht die Lobby
   gar nicht erst. Jede Prüfung, die den **Vorlauf** oder das Spiel
   dahinter misst, braucht deshalb einen Browser, in dem das Wort schon
   einmal getippt wurde — den zweiten Start, den jeder Mitspieler nach
   dem ersten hat.

   Das ist kein Schleichweg um den Riegel: Gemerkt wird derselbe
   Fingerabdruck, den auch das Tor hinterlegt, und das Wort selbst
   kommt hier so wenig vor wie in jeder anderen Datei. Das Tor
   **selbst** prüft `werkzeuge/pruefe-torwaechter.mjs`, und nur dort. */
export function torSchonOffen() {
  const inhalt = new Map();
  globalThis.localStorage = {
    getItem: (name) => (inhalt.has(name) ? inhalt.get(name) : null),
    setItem: (name, wert) => { inhalt.set(name, String(wert)); },
    removeItem: (name) => { inhalt.delete(name); }
  };
  merkeTor();
  return inhalt;
}
/* ══════════════════════════════════════════════════════════════════
   Das mitschreibende Blatt
   ══════════════════════════════════════════════════════════════════

   Es malt nichts, es schreibt mit. `frisch` heißt: Die Blattmaße wurden
   gesetzt und die Glättung seither nicht wieder abgeschaltet — wer in
   diesem Zustand zeichnet, zeichnet weich (Fehlerbuch D1). */
export function macheErsatzflaeche(breite, hoehe) {
  let blattBreite = breite;
  let blattHoehe = hoehe;
  let farbe = "#000000";
  let frisch = false;
  let weich = null;
  let masseBruch = null;
  let masseGesetzt = 0;
  let rechtecke = [];

  function merke(art, wert) {
    if (art === "masse") {
      frisch = true;
      masseGesetzt++;
      if (masseBruch === null && !Number.isInteger(wert)) masseBruch = wert;
      return;
    }
    if (art === "glaettung") { if (wert === false) frisch = false; return; }
  }

  const canvas = {
    get width() { return blattBreite; },
    set width(wert) { blattBreite = wert; merke("masse", wert); },
    get height() { return blattHoehe; },
    set height(wert) { blattHoehe = wert; merke("masse", wert); }
  };

  return {
    canvas,
    leere() { rechtecke = []; },
    rechtecke: () => rechtecke,
    /* `true` heißt: Die Maße wurden gesetzt und die Glättung ist seither
       nicht wieder abgeschaltet worden. Wer erst beim nächsten Bild
       zurückschaltet, hat Glück gehabt — nicht recht. */
    frisch: () => frisch,
    anzahl: () => rechtecke.length,
    weich: () => weich,
    masseBruch: () => masseBruch,
    masseGesetzt: () => masseGesetzt,
    set imageSmoothingEnabled(wert) { merke("glaettung", wert); },
    get imageSmoothingEnabled() { return false; },
    set fillStyle(wert) { farbe = wert; },
    get fillStyle() { return farbe; },
    set globalCompositeOperation(wert) { void wert; },
    get globalCompositeOperation() { return "source-over"; },
    fillRect(x, y, b, h) {
      if (frisch && weich === null) weich = { x, y, b, h, farbe };
      rechtecke.push({ x, y, b, h, farbe });
    }
  };
}

/* ══════════════════════════════════════════════════════════════════
   Das Blatt, das einen Pixelpuffer mitschreibt
   ══════════════════════════════════════════════════════════════════

   Seit dem 08.09.2026 legt `runtime/licht.js` sein Licht nicht mehr als
   Zehntausende Rechtecke auf, sondern als **einen** Pixelpuffer je
   Lage: `putImageData` auf ein Nebenblatt, `drawImage` ganzzahlig
   vergrößert aufs Hauptblatt. Ein Blatt, das nur `fillRect`
   mitschreibt, sähe davon **nichts** und meldete für immer grün — der
   schlimmste denkbare Ausgang (Fehlerbuch C5). Dieses hier schreibt
   beides mit: die Bildpunkte, die in den Puffer geschrieben wurden,
   und die Stelle, an der er gelandet ist.

   Zwei Griffe, ohne die es nichts sähe:

   · **Das Nebenblatt kommt über `canvas.ownerDocument`** — derselbe
     Weg, den `runtime/licht.js` und `runtime/granit-feld.js` im
     Browser gehen. Ein erfundener zweiter Weg prüfte einen Weg, den
     der Browser nie geht.
   · **Der Puffer wird kopiert**, nicht gemerkt. Das Licht füllt für die
     zweite Lage denselben Speicher noch einmal; wer sich die Kiste
     merkt statt ihres Inhalts, hat am Ende zweimal die warme Lage und
     merkt es nie.

   `glaettung` wird bei jeder Lage **mitgeschrieben**: Beim Vergrößern
   ist ein eingeschaltetes `imageSmoothing` genau der Fehler, an dem
   Pixelgrafik stirbt (Fehlerbuch D1) — und an einem `drawImage` sieht
   man ihn dem Ergebnis nicht an. */
export function macheBildflaeche(breite, hoehe) {
  const aufrufe = [];
  const lagen = [];
  let blattBreite = breite;
  let blattHoehe = hoehe;
  let glaettung = true;
  let mischen = "source-over";
  let letzterPuffer = null;
  let nebenblaetter = 0;

  const nebenZiel = {
    createImageData: (b, h) => ({ width: b, height: h,
      data: new Uint8ClampedArray(b * h * 4) }),
    putImageData(bild, x, y) {
      letzterPuffer = { breite: bild.width, hoehe: bild.height, daten: bild.data.slice() };
      aufrufe.push(["puffer", bild.width, bild.height, x, y]);
    }
  };
  const nebenblatt = {
    width: 0, height: 0, getContext: (art) => (art === "2d" ? nebenZiel : null)
  };
  const schriftstueck = {
    createElement(art) {
      if (art !== "canvas") return null;
      nebenblaetter++;
      return nebenblatt;
    }
  };

  return {
    canvas: {
      get width() { return blattBreite; },
      set width(wert) { blattBreite = wert; glaettung = true; },
      get height() { return blattHoehe; },
      set height(wert) { blattHoehe = wert; glaettung = true; },
      ownerDocument: schriftstueck
    },
    aufrufe: () => aufrufe.slice(),
    /* Eine Lage je `drawImage`: womit gemischt wurde, wohin sie kam,
       wie groß sie gezogen wurde und welche Bildpunkte darin standen. */
    lagen: () => lagen.slice(),
    nebenblaetter: () => nebenblaetter,
    nebenMasse: () => ({ breite: nebenblatt.width, hoehe: nebenblatt.height }),
    set imageSmoothingEnabled(wert) { glaettung = wert; aufrufe.push(["glaettung", wert]); },
    get imageSmoothingEnabled() { return glaettung; },
    set fillStyle(wert) { aufrufe.push(["farbe", wert]); },
    get fillStyle() { return "#000000"; },
    set globalCompositeOperation(wert) { mischen = wert; aufrufe.push(["mischen", wert]); },
    get globalCompositeOperation() { return mischen; },
    fillRect(x, y, b, h) { aufrufe.push(["rechteck", x, y, b, h]); },
    drawImage(quelle, x, y, b, h) {
      aufrufe.push(["bild", x, y, b, h]);
      lagen.push({ mischen, glaettung, x, y, breite: b, hoehe: h, puffer: letzterPuffer });
    }
  };
}

/* Ein Bildpunkt aus dem Puffer einer Lage — `null` außerhalb. Vier
   Bytes von Hand zusammenzusuchen ist in jeder zweiten Behauptung
   dieselbe Rechnung, und einmal falsch gezählt ist eine grüne
   Prüfung, die den Blaukanal für den roten hält. */
export function bildpunkt(lage, x, y) {
  const puffer = lage && lage.puffer;
  if (!puffer || x < 0 || y < 0 || x >= puffer.breite || y >= puffer.hoehe) return null;
  const i = (y * puffer.breite + x) * 4;
  return { r: puffer.daten[i], g: puffer.daten[i + 1],
    b: puffer.daten[i + 2], a: puffer.daten[i + 3] };
}

/* ══════════════════════════════════════════════════════════════════
   Der Browser-Ersatz
   ══════════════════════════════════════════════════════════════════ */

export function macheWelt({
  breite = HANDY.breite, hoehe = HANDY.hoehe, dpr = HANDY.dpr,
  schirm = { orientation: { lock: () => Promise.resolve() } },
  vollbildVersprechen = true, vollbildGelingt = true
} = {}) {
  const ctx = macheErsatzflaeche(breite, hoehe);
  const hoerer = [];
  const melde = (wo, name, fn) => hoerer.push({ wo, name, fn });
  const nimm = (wo, name, fn) => {
    const stelle = hoerer.findIndex((h) => h.wo === wo && h.name === name && h.fn === fn);
    if (stelle >= 0) hoerer.splice(stelle, 1);
  };
  const gedreht = [];
  const schriftstueck = {
    visibilityState: "visible",
    fullscreenElement: null,
    addEventListener: (name, fn) => melde("schrift", name, fn),
    removeEventListener: (name, fn) => nimm("schrift", name, fn),
    getElementById: () => null,
    exitFullscreen: () => { schriftstueck.fullscreenElement = null; }
  };
  const blatt = {
    get width() { return ctx.canvas.width; },
    set width(wert) { ctx.canvas.width = wert; },
    get height() { return ctx.canvas.height; },
    set height(wert) { ctx.canvas.height = wert; },
    clientWidth: breite,
    clientHeight: hoehe,
    ownerDocument: schriftstueck,
    getContext: () => ctx,
    getBoundingClientRect: () => ({
      left: 0, top: 0, width: blatt.clientWidth, height: blatt.clientHeight
    }),
    addEventListener: (name, fn) => melde("blatt", name, fn),
    removeEventListener: (name, fn) => nimm("blatt", name, fn),
    requestFullscreen: () => {
      if (!vollbildGelingt) {
        return vollbildVersprechen ? Promise.reject(new Error("abgelehnt")) : undefined;
      }
      schriftstueck.fullscreenElement = blatt;
      return vollbildVersprechen ? Promise.resolve() : undefined;
    }
  };
  const bilder = [];
  const alt = {
    document: globalThis.document,
    raf: globalThis.requestAnimationFrame,
    an: globalThis.addEventListener,
    zeiger: globalThis.PointerEvent,
    dpr: globalThis.devicePixelRatio,
    schirm: globalThis.screen
  };
  globalThis.document = schriftstueck;
  globalThis.requestAnimationFrame = (fn) => { bilder.push(fn); return bilder.length; };
  globalThis.addEventListener = (name, fn) => melde("fenster", name, fn);
  /* Ohne das nähme `runtime/start.js` die Rückfalltür für alte Browser,
     und der ganze Zeigerweg bliebe ungeprüft. */
  globalThis.PointerEvent = function PointerEvent() {};
  globalThis.devicePixelRatio = dpr;
  /* Aufgeschrieben wird nur, was der Bildschirm wirklich kann: Wo es
     kein `lock` gibt, wird auch keins untergeschoben — sonst prüfte der
     Fall „`orientation` ohne `lock`" eine Sperre, die es nur in der
     Prüfung gibt. */
  const echterHalt = schirm && schirm.orientation && schirm.orientation.lock;
  if (!schirm) delete globalThis.screen;
  else if (!echterHalt) globalThis.screen = schirm;
  else {
    globalThis.screen = { ...schirm, orientation: { ...schirm.orientation,
      lock: (wie) => { gedreht.push(wie); return echterHalt(wie); } } };
  }

  return {
    ctx, blatt, hoerer, bilder, schriftstueck,
    gedreht: () => gedreht.slice(),
    zaehle: (name) => hoerer.filter((h) => h.name === name).length,
    feuere(name, ereignis = {}) {
      let getroffen = 0;
      for (const h of [...hoerer]) {
        if (h.name !== name) continue;
        getroffen++;
        h.fn(ereignis);
      }
      return getroffen;
    },
    naechstesBild(zeitMs) {
      const fn = bilder.pop();
      bilder.length = 0;
      if (fn) fn(zeitMs);
    },
    raeumeAuf() {
      globalThis.document = alt.document;
      globalThis.requestAnimationFrame = alt.raf;
      globalThis.addEventListener = alt.an;
      globalThis.PointerEvent = alt.zeiger;
      globalThis.devicePixelRatio = alt.dpr;
      globalThis.screen = alt.schirm;
    }
  };
}

export const ereignis = (zusatz = {}) => ({ preventDefault: () => {}, ...zusatz });

/* Ein Atemzug für die Versprechen. `requestFullscreen()` und
   `screen.orientation.lock()` geben Versprechen zurück; was daran
   hängt, läuft erst nach dem synchronen Schritt. */
export const atemzug = () => new Promise((fertig) => setTimeout(fertig, 0));

/* Die vier Ereignisse eines einzigen Tipps auf Android — in genau
   dieser Reihenfolge, samt der nachgereichten Maus. */
export function tippAndroid(welt, x, y, knopf = 0) {
  const zeiger = { clientX: x, clientY: y, button: knopf, pointerType: "touch", pointerId: 7 };
  welt.feuere("pointerdown", ereignis(zeiger));
  welt.feuere("pointerup", ereignis(zeiger));
  welt.feuere("mousedown", ereignis({ clientX: x, clientY: y, button: knopf }));
  welt.feuere("click", ereignis({ clientX: x, clientY: y, button: knopf }));
}

/* Derselbe Tipp ohne die nachgereichte Maus — der Vergleichsfall. */
export function tippSauber(welt, x, y, knopf = 0) {
  const zeiger = { clientX: x, clientY: y, button: knopf, pointerType: "touch", pointerId: 7 };
  welt.feuere("pointerdown", ereignis(zeiger));
  welt.feuere("pointerup", ereignis(zeiger));
}

/* Und die Maus: dieselben Zeigerereignisse, nur mit `pointerType`
   „mouse" — samt dem Schweben, das es am Finger gar nicht gibt. */
export function klickMaus(welt, x, y, knopf = 0) {
  const zeiger = { clientX: x, clientY: y, button: knopf, pointerType: "mouse", pointerId: 1 };
  welt.feuere("pointermove", ereignis(zeiger));
  welt.feuere("pointerdown", ereignis(zeiger));
  welt.feuere("pointerup", ereignis(zeiger));
}

/* Die Leiste im **fertigen Bild** wiederfinden: der einzige Kasten in
   `FARBEN.hudGrund`, der über die ganze Breite läuft und unten
   anstößt. Gemessen wird damit, was wirklich gezeichnet wurde, und
   nicht, was eine zweite Rechnung dafür hält. */
export function leisteImBild(welt) {
  let gefunden = null;
  for (const r of welt.ctx.rechtecke()) {
    if (r.farbe !== FARBEN.hudGrund) continue;
    if (r.x !== 0 || r.b !== welt.blatt.width) continue;
    if (r.y + r.h !== welt.blatt.height) continue;
    if (gefunden === null || r.h > gefunden) gefunden = r.h;
  }
  return gefunden;
}

/* Der Bildpunkt in der Mitte einer Kachel. Nicht die Ecke: Ein Fehler
   um einen halben Bildpunkt fiele dort nicht auf. */
export function punktVon(kamera, x, y) {
  const ecke = kamera.feldNachBild(x, y);
  const halb = Math.floor((kamera.vergroesserung * KACHEL) / 2);
  return { x: ecke.x + halb, y: ecke.y + halb };
}
