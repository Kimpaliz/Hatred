/* [Aufgabe: Prüfwesen] Die Verdrahtung: Geht ein Tipp wirklich vom Blatt
   bis in den Kern — und genau einmal?

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Die Teile sind einzeln geprüft: `pruefe-eingabe-finger.mjs` misst,
   was die Eingabe aus einem Finger macht, `pruefe-felder.mjs`, wo man
   hintippen kann, `pruefe-app.mjs`, ob das ganze Spiel läuft. Alle drei
   können grün sein, und auf dem Handy passiert trotzdem nichts: Wenn
   `runtime/start.js` die Lobby an `mousedown` hängt, kommt man gar
   nicht erst ins Spiel; wenn es der Eingabe die Feldliste der Anzeige
   nicht gibt, sind die Knöpfe gezeichnet, aber unerreichbar. Beide
   Fehler liegen zwischen den Teilen, und dazwischen schaut sonst
   niemand hin.

   Diese Datei prüft deshalb **keinen** Baustein, sondern die Drähte
   zwischen ihnen — von einem nachgestellten Browser-Ereignis bis zu
   einer Zahl im Spielstand.

   ── Warum die Android-Folge und nicht ein einzelner Tipp ───────────

   Ein Tipp erzeugt auf Android **vier** Ereignisse: `pointerdown`,
   `pointerup` und danach noch einmal `mousedown` und `click` als
   nachgereichte Maus. Wer beide Wege behandelt, startet zwei Läufe
   oder geht zwei Felder weit — und der zweite Schritt geht ins Leere.
   Auf einem Handy sieht man davon nur, dass „das Spiel spinnt"; ein
   Fehlersucher lässt sich dort nicht anschließen. Deshalb steht die
   ganze Folge in `tippAndroid` und wird bei **jedem** Tipp gespielt.

   ── Warum ein eigener Browser-Ersatz ───────────────────────────────

   `werkzeuge/pruefe-app.mjs` baut denselben Ersatz, aber als eigene
   Hilfe in einer fertigen und abgenommenen Datei — herausgeholt wäre
   sie eine Änderung an fremdem Werk. Das Muster ist dasselbe und
   bewusst übernommen: ein mitschreibendes Blatt, `frisch`/`weich` für
   die Glättung nach dem Setzen der Maße, eine Reihe für
   `requestAnimationFrame`, gemerkte Hörer zum Feuern von Hand.

   Zwei Dinge kommen dazu, die es dort nicht braucht: `PointerEvent`
   und `devicePixelRatio`. Ohne das erste nähme `runtime/start.js` die
   Rückfalltür für alte Browser, und der ganze Zeigerweg bliebe
   ungeprüft; ohne das zweite ließe sich die krumme Vergrößerung des
   Handys nicht nachstellen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/start.js` (das Geprüfte: `starte`, `macheSpiel`,
   `vergroesserung`, `vollbild`), `runtime/eingabe.js` (hängt sich im
   Spiel selbst an die Zeigerereignisse), `runtime/oberflaeche.js`
   (`felder()`, `FINGER_MINDESTMASS` — die Knopfmaße), `runtime/kamera.js`
   (`vergroesserungFuer`, `feldNachBild`), `runtime/palette.js`
   (`FARBEN.hudGrund` — daran wird die Leiste im Bild wiedererkannt),
   `runtime/licht.js` (`KACHEL`), `runtime/schrift.js` (die Anzeige
   bekommt sie hereingereicht), `spiel/lauf.mjs`, `spiel/aktionen.mjs`,
   `spiel/zug.mjs`, `netz/sitzung.mjs`, `werkzeuge/helfer.mjs` und
   `werkzeuge/pruefe-alles.mjs`, das diese Datei als eigenen Prozess
   startet. */

import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";
import { macheSpiel, starte } from "../runtime/start.js";
import { FARBEN } from "../runtime/palette.js";
import * as schrift from "../runtime/schrift.js";
import { KACHEL } from "../runtime/licht.js";
import { vergroesserungFuer } from "../runtime/kamera.js";
import { FINGER_MINDESTMASS, macheOberflaeche } from "../runtime/oberflaeche.js";
import { AKTION } from "../spiel/aktionen.mjs";
import { amZugWesen } from "../spiel/zug.mjs";

/* Was dieser Lauf gemessen hat — am Schluss gedruckt, damit jede Zahl
   ihren Befehl hat: `node werkzeuge/pruefe-tippen.mjs`. */
const messungen = [];

/* Jedes Versprechen, das niemand aufgefangen hat. Node beendet den
   Prozess sonst von sich aus; mit diesem Horcher wird daraus eine
   Behauptung, und die sagt, **welches** Versprechen es war. Daran hängt
   Baustein 5: Eine abgelehnte Bildschirmdrehung ist der Normalfall und
   darf das Spiel nicht anhalten. */
const unaufgefangen = [];
process.on("unhandledRejection", (grund) => { unaufgefangen.push(String(grund)); });

/* Das Handy, an dem gemessen wird: Pixel 7 im Querformat, wie ihn
   Chromium nachstellt. Die krumme Zahl ist der ganze Punkt. */
const HANDY = { breite: 915, hoehe: 412, dpr: 2.625 };
const SAAT = 3;

/* ══════════════════════════════════════════════════════════════════
   Das mitschreibende Blatt
   ══════════════════════════════════════════════════════════════════

   Es malt nichts, es schreibt mit. `frisch` heißt: Die Blattmaße wurden
   gesetzt und die Glättung seither nicht wieder abgeschaltet — wer in
   diesem Zustand zeichnet, zeichnet weich (Fehlerbuch D1). */
function macheErsatzflaeche(breite, hoehe) {
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
   Der Browser-Ersatz
   ══════════════════════════════════════════════════════════════════ */

function macheWelt({
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

const ereignis = (zusatz = {}) => ({ preventDefault: () => {}, ...zusatz });

/* Ein Atemzug für die Versprechen. `requestFullscreen()` und
   `screen.orientation.lock()` geben Versprechen zurück; was daran
   hängt, läuft erst nach dem synchronen Schritt. */
const atemzug = () => new Promise((fertig) => setTimeout(fertig, 0));

/* Die vier Ereignisse eines einzigen Tipps auf Android — in genau
   dieser Reihenfolge, samt der nachgereichten Maus. */
function tippAndroid(welt, x, y, knopf = 0) {
  const zeiger = { clientX: x, clientY: y, button: knopf, pointerType: "touch", pointerId: 7 };
  welt.feuere("pointerdown", ereignis(zeiger));
  welt.feuere("pointerup", ereignis(zeiger));
  welt.feuere("mousedown", ereignis({ clientX: x, clientY: y, button: knopf }));
  welt.feuere("click", ereignis({ clientX: x, clientY: y, button: knopf }));
}

/* Derselbe Tipp ohne die nachgereichte Maus — der Vergleichsfall. */
function tippSauber(welt, x, y, knopf = 0) {
  const zeiger = { clientX: x, clientY: y, button: knopf, pointerType: "touch", pointerId: 7 };
  welt.feuere("pointerdown", ereignis(zeiger));
  welt.feuere("pointerup", ereignis(zeiger));
}

/* Die Leiste im **fertigen Bild** wiederfinden: der einzige Kasten in
   `FARBEN.hudGrund`, der über die ganze Breite läuft und unten
   anstößt. Gemessen wird damit, was wirklich gezeichnet wurde, und
   nicht, was eine zweite Rechnung dafür hält. */
function leisteImBild(welt) {
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
function punktVon(kamera, x, y) {
  const ecke = kamera.feldNachBild(x, y);
  const halb = Math.floor((kamera.vergroesserung * KACHEL) / 2);
  return { x: ecke.x + halb, y: ecke.y + halb };
}

/* Ein Tipp auf einen benannten Knopf des Vorlaufs. Erst ein Bild —
   wo ein Knopf liegt, weiß der Vorlauf erst, nachdem er ihn gemalt
   hat. Die Art des Tipps kommt herein, damit derselbe Weg einmal mit
   und einmal ohne die nachgereichte Maus gegangen werden kann. */
function macheTipper(welt, lauf, tipp) {
  let uhr = 16;
  return (schluessel) => {
    uhr += 16;
    welt.naechstesBild(uhr);
    const s = lauf.lobby().stellenJetzt().find((e) => e.schluessel === schluessel);
    behaupte(!!s, `der Knopf „${schluessel}" ist da`);
    if (s) tipp(welt, s.x + Math.floor(s.breite / 2), s.y + Math.floor(s.hoehe / 2));
    return s;
  };
}

/* Die Saat von Hand eintippen — ohne sie käme jeder Lauf einen anderen
   Kerker, und zwei Läufe ließen sich nicht mehr vergleichen. */
function tippeSaat(welt, tippeAuf) {
  tippeAuf("saat");
  for (let i = 0; i < 12; i++) welt.feuere("keydown", ereignis({ key: "Backspace" }));
  for (const z of String(SAAT)) welt.feuere("keydown", ereignis({ key: z }));
}

/* ══════════════════════════════════════════════════════════════════
   1 · Ein Tipp im Vorlauf startet genau einen Lauf
   ══════════════════════════════════════════════════════════════════

   Die wichtigste Behauptung dieser Datei. Sie fängt den Fehler, den man
   auf einem Handy nicht mehr auseinandernehmen kann: Der Vorlauf hängt
   an `mousedown`, der Tipp kommt zweimal an, und man steht plötzlich
   zwei Bildschirme weiter oder in einem zweiten Lauf. */
{
  abschnitt("Ein Tipp im Vorlauf startet genau einen Lauf");
  const welt = macheWelt();
  try {
    const lauf = starte(welt.blatt);

    /* Der Weg, der ohne diese Arbeit falsch wäre: Solange es
       `PointerEvent` gibt, darf auf dem Mausweg **niemand** hören. */
    gleich(welt.zaehle("mousedown"), 0, "auf `mousedown` hört im Vorlauf niemand");
    gleich(welt.zaehle("mousemove"), 0, "auf `mousemove` auch nicht");
    gleich(welt.zaehle("click"), 0, "und auf `click` erst recht nicht");
    gleich(welt.zaehle("pointerdown"), 1, "der Vorlauf hört auf `pointerdown`");
    gleich(welt.zaehle("pointermove"), 1, "und auf `pointermove`");

    welt.naechstesBild(16);
    behaupte(welt.ctx.anzahl() > 0, "der Vorlauf malt");

    /* Wie oft ein einziger Tipp bis in die Lobby durchkommt. Gezählt
       wird an der Lobby selbst und nicht am Ergebnis: „Allein" zweimal
       gedrückt sähe am Ergebnis gleich aus, der zweite Druck landete
       aber auf der **nächsten** Seite. */
    let erreicht = 0;
    const lobby = lauf.lobby();
    const urKlick = lobby.beiKlick;
    lobby.beiKlick = (x, y) => { erreicht++; return urKlick(x, y); };

    const tippeAuf = macheTipper(welt, lauf, tippAndroid);
    tippeAuf("allein");
    gleich(erreicht, 1, "ein Tipp kommt genau einmal in der Lobby an, nicht zweimal");
    gleich(lauf.lobby().stand().seite, "aufstellung", "und führt genau eine Seite weiter");
    lobby.beiKlick = urKlick;

    /* Der ganze Weg bis in den Kerker, jeder Tipp mit der vollen
       Android-Folge. Am Ende hängt genau **eine** Eingabe am Blatt:
       `pointerup` meldet niemand außer `runtime/eingabe.js` an, und die
       entsteht einmal je Lauf. Zwei Läufe wären zwei Hörer. */
    tippeSaat(welt, tippeAuf);
    gleich(lauf.lobby().stand().saat, SAAT, "die getippte Saat steht im Feld");
    tippeAuf("los");

    gleich(lauf.lobby(), null, "der Vorlauf ist fort");
    behaupte(lauf.stand() !== null, "und das Spiel steht");
    gleich(lauf.stand() && lauf.stand().tiefe, 1, "es beginnt in der ersten Tiefe");
    gleich(welt.zaehle("pointerup"), 1, "genau ein Lauf läuft — eine einzige Eingabe hört zu");
    gleich(welt.zaehle("mousedown"), 0, "und der Mausweg ist bis zuletzt leer");

    messungen.push(`Vorlauf mit der vollen Android-Folge: 1 Lauf, `
      + `${welt.hoerer.length} Hörer, ${welt.ctx.anzahl()} Rechtecke im letzten Bild`);
  } finally {
    welt.raeumeAuf();
  }
}

/* Die Gegenprobe über einen **ganzen** Weg, hin und zurück durch die
   Seiten des Vorlaufs. Gezählt wird, wie oft die Lobby einen Tipp zu
   sehen bekommt: Sechs Tipps müssen sechs Mal ankommen, ganz gleich,
   was Android hinterherschickt. Der Umweg über „Zurück" ist Absicht —
   ein zweiter Weg landete auf der **nächsten** Seite, und dort liegt an
   derselben Stelle ein anderer Knopf.

   Der Vergleich der beiden Stände am Schluss ist die Zugabe: Er sähe
   auch einen zweiten Weg, der nichts doppelt, sondern still etwas
   anderes verstellt. */
{
  abschnitt("Die nachgereichte Maus kommt nirgends an");
  const KNOEPFE = ["allein", "zurueck", "eroeffnen", "zurueck", "allein"];
  /* Nacheinander, nie ineinander: `macheWelt` hängt sich an
     `globalThis`, und zwei zugleich hingen sich gegenseitig ab. */
  const gehe = (tipp) => {
    const welt = macheWelt();
    try {
      const lauf = starte(welt.blatt);
      welt.naechstesBild(16);
      let erreicht = 0;
      const lobby = lauf.lobby();
      const urKlick = lobby.beiKlick;
      lobby.beiKlick = (x, y) => { erreicht++; return urKlick(x, y); };
      const tippeAuf = macheTipper(welt, lauf, tipp);
      for (const knopf of KNOEPFE) tippeAuf(knopf);
      tippeSaat(welt, tippeAuf);
      const vorLos = JSON.stringify(lobby.stand());
      tippeAuf("los");
      welt.naechstesBild(4800);
      const spielstand = lauf.stand();
      return {
        erreicht, vorLos,
        tiefe: spielstand && spielstand.tiefe,
        eingaben: welt.zaehle("pointerup")
      };
    } finally {
      welt.raeumeAuf();
    }
  };
  /* Sechs benannte Knöpfe plus „Saat" plus „Los". */
  const TIPPS = KNOEPFE.length + 2;
  const mitMaus = gehe(tippAndroid);
  const ohneMaus = gehe(tippSauber);
  gleich(mitMaus.erreicht, TIPPS,
    `${TIPPS} Tipps kommen ${TIPPS} mal an, auch mit der nachgereichten Maus`);
  gleich(ohneMaus.erreicht, TIPPS, `und ohne sie ebenso ${TIPPS} mal`);
  gleich(mitMaus.vorLos, ohneMaus.vorLos, `vor „Los" steht beide Male derselbe Vorlauf`);
  gleich(mitMaus.tiefe, ohneMaus.tiefe, "und danach dieselbe Tiefe");
  gleich(mitMaus.eingaben, ohneMaus.eingaben, "und gleich viele Eingaben hängen am Blatt");
  gleich(mitMaus.tiefe, 1, "beide sind wirklich im Kerker angekommen");
  messungen.push(`${TIPPS} Tipps über vier Seiten des Vorlaufs: `
    + `${mitMaus.erreicht} mal angekommen mit Android-Folge, `
    + `${ohneMaus.erreicht} mal ohne`);
}

/* ══════════════════════════════════════════════════════════════════
   Der Kerker, mit dem Daumen betreten
   ══════════════════════════════════════════════════════════════════ */

function baueKerker(welt) {
  const lauf = starte(welt.blatt);
  const tippeAuf = macheTipper(welt, lauf, tippAndroid);
  tippeAuf("allein");
  tippeSaat(welt, tippeAuf);
  tippeAuf("los");
  return lauf;
}

/* Bilder laufen lassen, bis die Abspielung leer ist und wirklich der
   eigene Jäger am Zug ist. Vorher nimmt die Eingabe nichts an — und
   eine Prüfung, die in eine gesperrte Eingabe tippt, misst nichts
   (subagent-profile, Falle 10). */
function bisZumZug(welt, lauf, uhr) {
  for (let i = 0; i < 600; i++) {
    uhr += 16;
    welt.ctx.leere();
    welt.naechstesBild(uhr);
    const spiel = lauf.spiel();
    if (!spiel) continue;
    const stand = spiel.stand();
    const dran = amZugWesen(spiel.zustand());
    if (!stand.gesperrt && stand.wartend === 0 && dran && dran.spielerPlatz === 1) {
      return { uhr, dran };
    }
  }
  return { uhr, dran: null };
}

/* Ein Nachbarfeld, das genau einen Schritt kostet. Genau einen, weil
   nur dann „einmal gegangen" und „zweimal gegangen" auseinanderfallen. */
function nachbarfeld(spiel) {
  const dran = amZugWesen(spiel.zustand());
  for (const feld of spiel.eingabe.ansicht().reichweite.values()) {
    if (feld.x === dran.x && feld.y === dran.y) continue;
    if (Math.abs(feld.x - dran.x) + Math.abs(feld.y - dran.y) !== 1) continue;
    return feld;
  }
  return null;
}

const gezaehlt = (zustand, typ) => zustand.protokoll.filter((a) => a.typ === typ).length;

/* ══════════════════════════════════════════════════════════════════
   2 · Ein Tipp im Spiel bewegt die Figur genau einmal
   ══════════════════════════════════════════════════════════════════

   Am Finger führt erst der **zweite** Tipp aus; der erste wählt nur an
   (`runtime/eingabe.js`, „Warum der Finger zwei Schritte braucht").
   Genau daran hängt diese Prüfung: Käme der nachgereichte `mousedown`
   auch an, gälte er als **Maus** — und die Maus führt sofort aus. Die
   Figur stünde also schon nach dem ersten Tipp woanders. */
{
  abschnitt("Ein Tipp im Spiel bewegt die Figur genau einmal");
  const welt = macheWelt();
  try {
    abschnittZwei: {
      const lauf = baueKerker(welt);
      behaupte(lauf.spiel() !== null, "der Kerker steht");
      const { uhr, dran } = bisZumZug(welt, lauf, 2000);
      behaupte(!!dran, "der eigene Jäger ist am Zug");
      /* Ohne Zug ist alles Weitere sinnlos — und ein geworfener Fehler
         sagte weniger als die eine gefallene Behauptung darüber. */
      if (!dran) break abschnittZwei;

      const spiel = lauf.spiel();
      const zustand = spiel.zustand();
      const ziel = nachbarfeld(spiel);
      behaupte(!!ziel, "ein Nachbarfeld für genau einen Schritt ist da");
      if (!ziel) break abschnittZwei;

      const vonX = dran.x, vonY = dran.y, apVorher = dran.ap;
      const gegangenVorher = gezaehlt(zustand, AKTION.gehen);
      const punkt = punktVon(spiel.kamera, ziel.x, ziel.y);

      tippAndroid(welt, punkt.x, punkt.y);
      gleich(dran.x, vonX, "nach dem ersten Tipp steht die Figur noch (x)");
      gleich(dran.y, vonY, "nach dem ersten Tipp steht die Figur noch (y)");
      gleich(gezaehlt(zustand, AKTION.gehen), gegangenVorher,
        "und im Protokoll steht noch kein Schritt");

      tippAndroid(welt, punkt.x, punkt.y);
      gleich(dran.x, ziel.x, "nach dem zweiten Tipp steht sie auf dem Zielfeld (x)");
      gleich(dran.y, ziel.y, "nach dem zweiten Tipp steht sie auf dem Zielfeld (y)");
      gleich(gezaehlt(zustand, AKTION.gehen), gegangenVorher + 1,
        "genau ein Schritt steht im Protokoll, nicht zwei");
      gleich(apVorher - dran.ap, ziel.kosten,
        "und genau ein Schrittpreis ist abgezogen");

      /* Und noch ein Nachschlag der nachgereichten Maus allein: Er darf
         gar nichts bewirken, auch nicht als dritter Tipp. */
      const nachX = dran.x, nachY = dran.y;
      welt.feuere("mousedown", ereignis({ clientX: punkt.x, clientY: punkt.y, button: 0 }));
      welt.feuere("click", ereignis({ clientX: punkt.x, clientY: punkt.y, button: 0 }));
      gleich(dran.x, nachX, "ein `mousedown` allein bewegt nichts (x)");
      gleich(dran.y, nachY, "ein `mousedown` allein bewegt nichts (y)");

      messungen.push(`Ein Schritt mit dem Daumen: (${vonX},${vonY}) → `
        + `(${ziel.x},${ziel.y}), ${ziel.kosten} AP, Uhr bei ${uhr} ms`);
    }
  } finally {
    welt.raeumeAuf();
  }
}
/* Die Anzeige ein zweites Mal, auf einem eigenen Blatt: Sie sagt, **wo**
   die Knöpfe liegen. Dass es dieselben sind, die das Spiel gemalt hat,
   wird nicht geglaubt, sondern verglichen — die Leistenhöhe aus dem
   fertigen Bild gegen die Leistenhöhe dieser zweiten Anzeige. Ohne
   diesen Vergleich stünden hier ausgedachte Bildpunkte. */
function knopfmasse(welt, spiel, zeit) {
  const eigenesBlatt = macheErsatzflaeche(welt.blatt.width, welt.blatt.height);
  const schatten = macheOberflaeche({ ctx: eigenesBlatt, schrift, kamera: spiel.kamera });
  const sicht = spiel.eingabe.ansicht();
  schatten.zeichne(spiel.zustand(), {
    schau: spiel.zustand(), geplant: null,
    ziel: sicht.ziel ? sicht.ziel.id : null, zeiger: sicht.zeigerFeld,
    meldungen: [], spieler: [], sichtbar: null, zeit, rundeSeit: 0
  }, { finger: true });
  return schatten;
}

/* ══════════════════════════════════════════════════════════════════
   3 · Die Leiste hängt wirklich am Tipp
   ══════════════════════════════════════════════════════════════════

   Ohne `felderLesen` sind die Knöpfe gezeichnet und unerreichbar: Der
   Tipp ginge an ihnen vorbei auf das Kartenfeld darunter. Beide Hälften
   werden behauptet — die Aktion des Knopfes kommt an, **und** das Feld
   darunter wird nicht angefasst. */
{
  abschnitt("Die Leiste hängt wirklich am Tipp");
  const welt = macheWelt();
  try {
    abschnittDrei: {
      const lauf = baueKerker(welt);
      behaupte(lauf.spiel() !== null, "der Kerker steht");
      if (!lauf.spiel()) break abschnittDrei;
      const { uhr } = bisZumZug(welt, lauf, 2000);
      const spiel = lauf.spiel();
      const zustand = spiel.zustand();
      const dran = amZugWesen(zustand);
      behaupte(!!dran, "der eigene Jäger ist am Zug");
      if (!dran) break abschnittDrei;

      /* Erst in die Fingerbedienung, sonst malt die Anzeige die schmale
         Leiste und die Knöpfe wären nicht daumengroß. */
      const nachbar = nachbarfeld(spiel);
      behaupte(!!nachbar, "ein Nachbarfeld zum Antippen ist da");
      if (!nachbar) break abschnittDrei;
      const p0 = punktVon(spiel.kamera, nachbar.x, nachbar.y);
      tippSauber(welt, p0.x, p0.y);
      welt.ctx.leere();
      welt.naechstesBild(uhr + 16);

      const schatten = knopfmasse(welt, spiel, (uhr + 16) / 1000);
      gleich(leisteImBild(welt), schatten.masse().leisteHoehe,
        "die zweite Anzeige malt dieselbe Leiste wie das Spiel");

      const felder = schatten.felder();
      behaupte(felder.length > 0, `${felder.length} Felder stehen in der Leiste`);
      const trank = felder.find((f) => f.aktion && f.aktion.typ === AKTION.trank && f.aktiv);
      const schluss = felder.find((f) => f.aktion && f.aktion.typ === AKTION.zugEnde && f.aktiv);
      behaupte(!!trank && !!schluss, `„Trank" und „Zug beenden" sind da und wählbar`);
      if (!trank || !schluss) break abschnittDrei;

      const mitteVon = (f) => ({
        x: f.x + Math.floor(f.breite / 2), y: f.y + Math.floor(f.hoehe / 2)
      });
      const pt = mitteVon(trank);
      const darunter = spiel.kamera.bildNachFeld(pt.x, pt.y);
      behaupte(zustand.karte.drin(darunter.x, darunter.y),
        `unter dem Knopf liegt wirklich ein Kartenfeld (${darunter.x},${darunter.y})`);

      const traenkeVorher = dran.traenke;
      const vonX = dran.x, vonY = dran.y;
      const zeigerVorher = spiel.eingabe.ansicht().zeigerFeld;
      /* Von einem Stand aus gezählt und nicht von null: Im Protokoll
         stehen auch die Züge der Brut, und die enden ebenfalls. */
      const trankVorher = gezaehlt(zustand, AKTION.trank);
      const gehenVorher = gezaehlt(zustand, AKTION.gehen);
      const schlussVorher = gezaehlt(zustand, AKTION.zugEnde);

      /* Ein Knopf ist eindeutig — er läuft schon beim **ersten** Tipp los
         und nicht über die zwei Schritte des Fingers. */
      tippAndroid(welt, pt.x, pt.y);
      gleich(gezaehlt(zustand, AKTION.trank) - trankVorher, 1,
        "der Tipp sendet die Aktion des Knopfes");
      gleich(traenkeVorher - dran.traenke, 1, "und der Trank ist wirklich weg");
      gleich(dran.x, vonX, "das Feld unter dem Knopf wird nicht betreten (x)");
      gleich(dran.y, vonY, "das Feld unter dem Knopf wird nicht betreten (y)");
      gleich(gezaehlt(zustand, AKTION.gehen) - gehenVorher, 0,
        "und kein Gehen kommt dazu");
      const zeigerNachher = spiel.eingabe.ansicht().zeigerFeld;
      behaupte(!zeigerNachher
        || zeigerNachher.x !== darunter.x || zeigerNachher.y !== darunter.y,
      "und der Feldzeiger springt nicht unter die Leiste");
      behaupte(JSON.stringify(zeigerVorher) === JSON.stringify(zeigerNachher)
        || zeigerNachher === null, "er bleibt, wo er war");

      /* Und der Knopf, ohne den man feststeckt. */
      const ps = mitteVon(schluss);
      tippAndroid(welt, ps.x, ps.y);
      gleich(gezaehlt(zustand, AKTION.zugEnde) - schlussVorher, 1,
        `„Zug beenden" beendet den Zug`);

      messungen.push(`Leiste am Finger: ${felder.length} Felder, `
        + `${leisteImBild(welt)} Punkte hoch, Knopf „Trank" bei `
        + `(${pt.x},${pt.y}) über Kartenfeld (${darunter.x},${darunter.y})`);
    }
  } finally {
    welt.raeumeAuf();
  }
}

/* ══════════════════════════════════════════════════════════════════
   4 · Die Fingergröße kommt an
   ══════════════════════════════════════════════════════════════════ */
{
  abschnitt("Die Fingergröße kommt an");
  const welt = macheWelt();
  try {
    abschnittVier: {
      const lauf = baueKerker(welt);
      behaupte(lauf.spiel() !== null, "der Kerker steht");
      if (!lauf.spiel()) break abschnittVier;
      const { uhr } = bisZumZug(welt, lauf, 2000);
      const spiel = lauf.spiel();

      /* Die Maus schwebt — ein `pointermove` genügt, um zu sagen, womit
         bedient wird, und rührt nichts an. */
      welt.feuere("pointermove", ereignis({ clientX: 40, clientY: 40, pointerType: "mouse" }));
      gleich(spiel.eingabe.istFinger(), false, "nach der Maus ist es keine Fingerbedienung");
      welt.ctx.leere();
      welt.naechstesBild(uhr + 16);
      const mitMaus = leisteImBild(welt);
      behaupte(mitMaus !== null, "die Leiste steht im Bild");
      behaupte(mitMaus < FINGER_MINDESTMASS,
        `mit der Maus bleibt die Leiste schmal: ${mitMaus} < ${FINGER_MINDESTMASS}`);

      const nachbar = nachbarfeld(spiel);
      behaupte(!!nachbar, "ein Nachbarfeld zum Antippen ist da");
      if (!nachbar) break abschnittVier;
      const punkt = punktVon(spiel.kamera, nachbar.x, nachbar.y);
      tippSauber(welt, punkt.x, punkt.y);
      gleich(spiel.eingabe.istFinger(), true, "nach dem Tipp ist es eine Fingerbedienung");
      welt.ctx.leere();
      welt.naechstesBild(uhr + 32);
      const mitFinger = leisteImBild(welt);
      behaupte(mitFinger >= FINGER_MINDESTMASS,
        `am Finger ist die Leiste daumengroß: ${mitFinger} >= ${FINGER_MINDESTMASS}`);
      behaupte(mitFinger > mitMaus, "und höher als die schmale");

      messungen.push(`Leistenhöhe im Bild: ${mitMaus} Punkte mit der Maus, `
        + `${mitFinger} am Finger (Mindestmaß ${FINGER_MINDESTMASS})`);
    }
  } finally {
    welt.raeumeAuf();
  }
}


/* ══════════════════════════════════════════════════════════════════
   5 · Die Vergrößerung ist immer eine ganze Zahl
   ══════════════════════════════════════════════════════════════════

   Der Fall, der ohne diese Arbeit falsch wäre: Jemand multipliziert die
   Blattmaße mit `devicePixelRatio`. Bei 412 x 915 und 2,625 wäre das
   Blatt 1081,5 Punkte breit — halbe Bildpunkte in jedem Rechteck
   (Fehlerbuch D1). Die letzte Behauptung je Fenster ist die schärfste:
   Vier verschiedene Bildpunktverhältnisse müssen **dasselbe** Blatt
   ergeben. Sobald das Verhältnis mitrechnet, sind es vier. */
{
  abschnitt("Die Vergrößerung ist immer eine ganze Zahl");
  const FENSTER = [[412, 915], [915, 412], [360, 800], [800, 360], [640, 360], [1920, 1080]];
  const VERHAELTNISSE = [1, 2, 2.625, 3];
  let handy = null;
  for (const [b, h] of FENSTER) {
    const blaetter = new Set();
    for (const dpr of VERHAELTNISSE) {
      const welt = macheWelt({ breite: b, hoehe: h, dpr });
      try {
        const lauf = starte(welt.blatt);
        welt.naechstesBild(16);
        const wie = `${b}x${h} bei ${dpr}`;
        behaupte(Number.isInteger(welt.blatt.width) && Number.isInteger(welt.blatt.height),
          `${wie}: ganze Blattmaße (${welt.blatt.width}x${welt.blatt.height})`);
        gleich(welt.ctx.masseBruch(), null, `${wie}: kein Blattmaß mit Komma`);
        const v = lauf.vergroesserung();
        behaupte(Number.isInteger(v) && v >= 1, `${wie}: Vergrößerung ${v} ist ganz und >= 1`);
        gleich(v, vergroesserungFuer(welt.blatt.width, welt.blatt.height),
          `${wie}: Blatt und Kamera rechnen dieselbe Vergrößerung`);
        blaetter.add(`${welt.blatt.width}x${welt.blatt.height}:${v}`);
        if (b === 412 && h === 915 && dpr === 2.625) {
          handy = `${welt.blatt.width} x ${welt.blatt.height}, Vergrößerung ${v}`;
        }
      } finally {
        welt.raeumeAuf();
      }
    }
    gleich(blaetter.size, 1,
      `${b}x${h}: alle vier Bildpunktverhältnisse geben dasselbe Blatt (${[...blaetter]})`);
  }
  behaupte(handy !== null, `bei 412 x 915 mit 2,625: Blatt ${handy}`);
  messungen.push(`412 x 915 bei devicePixelRatio 2,625 → Blatt ${handy} (ganzzahlig)`);
}

/* ══════════════════════════════════════════════════════════════════
   6 · Die Glättung bleibt aus
   ══════════════════════════════════════════════════════════════════

   Das Setzen von `canvas.width` stellt `imageSmoothingEnabled` zurück
   (Fehlerbuch D1). Die Mitschrift merkt sich das als `frisch` und legt
   das **erste** Rechteck ab, das in diesem Zustand fiel. Damit die
   Behauptung nicht leer ist, wird zusätzlich gezählt, wie oft die Maße
   überhaupt gesetzt wurden: Ohne einen einzigen Wechsel bewiese sie
   nichts. */
{
  abschnitt("Die Glättung bleibt nach jedem Setzen der Maße aus");
  const welt = macheWelt();
  try {
    const lauf = baueKerker(welt);
    let uhr = 3000;
    const groessen = [[412, 915], [517, 301], [1080, 2400], [360, 800], [915, 412]];
    for (const [b, h] of groessen) {
      welt.blatt.clientWidth = b;
      welt.blatt.clientHeight = h;
      welt.feuere("resize");
      /* Hier, **vor** dem nächsten Bild: Wer die Glättung erst beim
         Zeichnen zurückschaltet, verlässt sich darauf, dass ein anderer
         es tut. Genau diesen Fall fängt die Zeile — und nur ihn
         beantwortet `runtime/start.js` allein. */
      gleich(welt.ctx.frisch(), false,
        `${b}x${h}: die Glättung ist schon vor dem nächsten Bild wieder aus`);
      uhr += 16;
      welt.ctx.leere();
      welt.naechstesBild(uhr);
      gleich(welt.blatt.width, b, `nach dem Wechsel auf ${b}x${h} ist das Blatt ${b} breit`);
      behaupte(welt.ctx.anzahl() > 0, `und es wird danach wirklich gemalt (${b}x${h})`);
    }
    behaupte(lauf.spiel() !== null, "das Spiel steht die ganzen Wechsel durch");
    behaupte(welt.ctx.masseGesetzt() >= 2 * groessen.length,
      `die Blattmaße wurden ${welt.ctx.masseGesetzt()} mal gesetzt — die Prüfung ist nicht leer`);
    gleich(welt.ctx.weich(), null, "und kein einziges Rechteck fiel bei eingeschalteter Glättung");
    gleich(welt.ctx.masseBruch(), null, "und kein Blattmaß hatte ein Komma");
    messungen.push(`${welt.ctx.masseGesetzt()} mal Blattmaße gesetzt, `
      + `${groessen.length} Fensterwechsel, nie weich gezeichnet`);
  } finally {
    welt.raeumeAuf();
  }
}

/* Dasselbe im Vorlauf, wo `runtime/start.js` das Blatt allein in der
   Hand hat: Es holt sich das Blatt, setzt die Maße und zeichnet noch
   gar nichts. Bleibt die Glättung hier an, ist schon das Titelbild
   weich — und niemand käme darauf, dass es an einer Zeile im Anfang
   liegt. */
{
  abschnitt("Auch im Vorlauf bleibt die Glättung aus");
  const welt = macheWelt();
  try {
    const lauf = starte(welt.blatt);
    gleich(welt.ctx.frisch(), false, "schon vor dem ersten Bild ist die Glättung aus");
    welt.naechstesBild(16);
    behaupte(welt.ctx.anzahl() > 0, "und der Vorlauf malt");
    gleich(welt.ctx.weich(), null, "nichts wurde geglättet gezeichnet");
    welt.blatt.clientWidth = 640;
    welt.blatt.clientHeight = 360;
    welt.feuere("resize");
    gleich(welt.ctx.frisch(), false, "auch nach dem Drehen des Geräts, noch vor dem Bild");
    lauf.passeAn();
    gleich(welt.ctx.frisch(), false, "und nach `passeAn()` erst recht");
    welt.naechstesBild(32);
    gleich(welt.ctx.weich(), null, "und im Bild danach auch nicht");
  } finally {
    welt.raeumeAuf();
  }
}

/* ══════════════════════════════════════════════════════════════════
   7 · Vollbild und Querformat dürfen fehlschlagen
   ══════════════════════════════════════════════════════════════════

   Der Fehlschlag ist der Normalfall: Kein Rechner kann den Bildschirm
   drehen, viele Handys auch nicht, und `screen.orientation` fehlt
   mancherorts ganz. Jeder dieser Fälle darf das Spiel nicht anhalten. */
{
  abschnitt("Vollbild und Querformat dürfen fehlschlagen");

  /* Gewartet wird, weil `requestFullscreen()` ein Versprechen gibt und
     die Drehung erst danach kommt. Wer hier synchron nachsieht, sieht
     nichts — und hielte eine funktionierende Drehung für kaputt. */
  const probe = async (was, angaben, danach) => {
    const welt = macheWelt(angaben);
    try {
      const lauf = starte(welt.blatt);
      welt.naechstesBild(16);
      let wurf = null;
      try { lauf.vollbild(); } catch (fund) { wurf = fund.message; }
      gleich(wurf, null, `${was}: `+ "`vollbild()` wirft nicht");
      await atemzug();
      const vorher = welt.ctx.anzahl();
      welt.naechstesBild(32);
      behaupte(welt.ctx.anzahl() > vorher, `${was}: das Spiel malt danach weiter`);
      danach(welt, lauf);
    } finally {
      welt.raeumeAuf();
    }
  };

  await probe("ohne `screen`", { schirm: null }, (welt) => {
    gleich(welt.gedreht().length, 0, "ohne `screen` wird nichts gedreht");
  });
  await probe("`screen` ohne `orientation`", { schirm: {} }, (welt) => {
    gleich(welt.gedreht().length, 0, "ohne `orientation` wird nichts gedreht");
  });
  await probe("`orientation` ohne `lock`", { schirm: { orientation: {} } }, (welt) => {
    gleich(welt.gedreht().length, 0, "ohne `lock` wird nichts gedreht");
  });
  await probe("`lock` lehnt ab", {
    schirm: { orientation: { lock: () => Promise.reject(new Error("verweigert")) } }
  }, (welt) => {
    gleich(welt.gedreht().join(","), "landscape", "gedreht wird trotzdem versucht");
  });
  await probe("`lock` wirft sofort", {
    schirm: { orientation: { lock: () => { throw new Error("sofort"); } } }
  }, (welt) => {
    gleich(welt.gedreht().join(","), "landscape", "auch ein sofortiger Wurf wird gefangen");
  });
  await probe("alles geht", {}, (welt) => {
    gleich(welt.gedreht().join(","), "landscape",
      "auf ein gelungenes Vollbild folgt das Querformat");
    behaupte(welt.schriftstueck.fullscreenElement === welt.blatt, "und das Vollbild steht");
  });
  /* Ohne Vollbild keine Drehung: Android lehnt die Sperre ab, solange
     die Seite im Fenster steht — ein Versuch dort wäre eine
     Fehlermeldung ohne Nutzen. */
  await probe("das Vollbild wird abgelehnt", { vollbildGelingt: false }, (welt) => {
    gleich(welt.gedreht().length, 0, "ohne Vollbild wird gar nicht erst gedreht");
  });
  await probe("kein Versprechen vom Vollbild", { vollbildVersprechen: false }, (welt) => {
    gleich(welt.gedreht().join(","), "landscape",
      "auch ein alter Browser ohne Versprechen dreht");
  });
}

/* ══════════════════════════════════════════════════════════════════
   8 · Die Tastatur erreicht weiterhin alles
   ══════════════════════════════════════════════════════════════════

   Ein Spiel, das ohne Zeigegerät unbedienbar ist, schließt Leute aus —
   und die Umstellung auf Zeigerereignisse ist genau der Umbau, bei dem
   die Tastatur still ausfällt. */
{
  abschnitt("Die Tastatur erreicht weiterhin alles");
  const welt = macheWelt();
  try {
    abschnittAcht: {
      const lauf = baueKerker(welt);
      behaupte(lauf.spiel() !== null, "der Kerker steht");
      if (!lauf.spiel()) break abschnittAcht;
      const { uhr } = bisZumZug(welt, lauf, 2000);
      const spiel = lauf.spiel();
      const zustand = spiel.zustand();
      const dran = amZugWesen(zustand);
      behaupte(!!dran, "der eigene Jäger ist am Zug");
      if (!dran) break abschnittAcht;
      const taste = (key) => welt.feuere("keydown", ereignis({ key }));

      /* `Esc` stellt den Anfangszustand her — Zeiger auf der eigenen
         Figur. Auf einem Handy ist es der einzige Ausweg, den es gibt,
         und hier ist es zugleich der feste Punkt, von dem aus eine
         Pfeiltaste überhaupt eine Richtung hat. */
      taste("Escape");
      const start = spiel.eingabe.ansicht().zeigerFeld;
      behaupte(!!start && start.x === dran.x && start.y === dran.y,
        "der Feldzeiger steht auf der eigenen Figur");

      const ziel = nachbarfeld(spiel);
      behaupte(!!ziel, "ein Nachbarfeld für genau einen Schritt ist da");
      if (!ziel) break abschnittAcht;
      const richtung = ziel.x > dran.x ? "ArrowRight"
        : ziel.x < dran.x ? "ArrowLeft"
          : ziel.y > dran.y ? "ArrowDown" : "ArrowUp";

      taste("Tab");
      gleich(spiel.eingabe.ansicht().ganzeKarte, true, "Tab schlägt die Übersichtskarte auf");
      taste("Tab");
      gleich(spiel.eingabe.ansicht().ganzeKarte, false, "und wieder zu");

      taste(richtung);
      const nach = spiel.eingabe.ansicht().zeigerFeld;
      behaupte(!!nach && nach.x === ziel.x && nach.y === ziel.y,
        `${richtung} führt den Feldzeiger auf (${ziel.x},${ziel.y})`);

      const gehenVorher = gezaehlt(zustand, AKTION.gehen);
      const schlussVorher = gezaehlt(zustand, AKTION.zugEnde);
      taste("Enter");
      gleich(gezaehlt(zustand, AKTION.gehen) - gehenVorher, 1, "Enter geht genau einen Schritt");
      gleich(dran.x, ziel.x, "und die Figur steht dort (x)");
      gleich(dran.y, ziel.y, "und die Figur steht dort (y)");

      taste(" ");
      gleich(gezaehlt(zustand, AKTION.zugEnde) - schlussVorher, 1,
        "die Leertaste beendet den Zug");

      /* Und der Knopf, den nur die Tastatur hat. */
      taste("f");
      behaupte(welt.schriftstueck.fullscreenElement === welt.blatt, "F schaltet ins Vollbild");
      await atemzug();
      gleich(welt.gedreht().join(","), "landscape", "und dreht ins Querformat");

      messungen.push(`Tastatur im Kerker: ${richtung} + Enter geht einen Schritt, `
        + "Leertaste beendet den Zug, Tab und F kommen an");
    }
  } finally {
    welt.raeumeAuf();
  }
}

/* Die Versprechen, die dieser Lauf angestoßen hat, laufen erst nach
   dem letzten synchronen Schritt aus. Ohne dieses Warten stünde die
   Behauptung über die aufgefangenen Ablehnungen da, bevor es etwas
   aufzufangen gäbe — und wäre für immer grün. */
await new Promise((fertig) => setTimeout(fertig, 30));
gleich(unaufgefangen.length, 0,
  `kein Versprechen bleibt unaufgefangen${unaufgefangen.length
    ? ` (${unaufgefangen.join(", ")})` : ""}`);

for (const zeile of messungen) console.log(`      · ${zeile}`);
ende("Die Verdrahtung vom Tipp bis in den Kern");
