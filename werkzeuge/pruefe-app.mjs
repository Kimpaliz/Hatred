/* [Aufgabe: Prüfwesen] Spielt das ganze Spiel ohne Browser durch — Seite,
   Bild, Sitzung, Runden, Kerkertiefen — und behauptet über die Mitschrift.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Jede andere Prüfung dieser Kette schneidet ein Stück heraus: `spiel/`
   ohne Bild, `runtime/zeichnen.js` ohne Sitzung, `netz/` ohne Kerker.
   Alle können grün sein, und das Spiel bleibt trotzdem schwarz. Was
   dazwischen kaputtgeht, sieht **nur** ein Lauf, der von `index.html`
   bis zur dritten Kerkertiefe alles zusammensteckt:

   · Ein Modul, das aus `index.html` heraus gar nicht erreichbar ist —
     daheim liegt es im Speicher des Bündlers, im Netz nirgends.
   · Ein Zeichenaufruf auf einem halben Bildpunkt. Im fertigen Bild ein
     Hauch Unschärfe, den man dem Bildschirm zuschreibt; in der
     Aufrufliste eine Zahl mit Komma (Fehlerbuch D1).
   · Eine Glättung, die nach dem Setzen der Blattmaße nicht wieder
     abgeschaltet wurde. Dasselbe Bild, derselbe Irrtum.
   · Ein Zustand, der über die **Sitzung** anders läuft als über
     `wendeAn` allein. Genau dort säße der Fehler, den im Koop niemand
     mehr findet, weil er erst nach zwanzig Runden auffällt.

   **Warum die Ereignisse durch `netz/sitzung.mjs` gehen und nicht
   unmittelbar durch `wendeAn`.** Weil `runtime/start.js` es auch so
   macht — auch allein. Prüfte diese Datei den kürzeren Weg, prüfte sie
   einen Weg, den das Spiel nie geht.

   **Warum `requestAnimationFrame` hier in eine Reihe legt statt sofort
   zu rufen.** `bild()` fordert am Ende das nächste Bild an. Ein Ersatz,
   der die Rückrufe unmittelbar ausführt, riefe sich selbst — bis der
   Stapel überläuft. „Sofort" heißt hier: im selben Durchgang, ohne
   Warten auf einen Bildschirm; angestoßen wird jedes Bild von Hand.

   ── Was hier **nicht** geprüft wird ────────────────────────────────

   Ob das Bild schön ist (`node werkzeuge/vorschau.mjs`), ob die KI klug
   zieht (`pruefe-ki.mjs`) und ob die Leitung eine verlorene Nachricht
   nachreicht (`pruefe-netz.mjs`, `pruefe-leitung.mjs`). Diese Datei
   fragt eine einzige Sache: **läuft es, von vorne bis hinten.**

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/helfer.mjs` (Behauptungen und Rückgabewert), `index.html`
   (der Einstieg, dessen Verweise geprüft werden), `runtime/start.js`
   (`macheSpiel`, `starte`), `runtime/lobby.js` (der Vorlauf, über den
   der Lauf beginnt), `netz/sitzung.mjs` (der einzige Weg jeder Aktion),
   `spiel/lauf.mjs` (`macheLauf`, `naechsteTiefe`, `zustandsSumme`),
   `spiel/aktionen.mjs` (`moeglicheAktionen` — die eine Liste des
   Erlaubten), `spiel/gegner-ki.mjs` (`planeZug`), `spiel/zug.mjs`,
   `spiel/zufall.mjs` (der gesäte Strom für die Spielerwahl) und
   `werkzeuge/pruefe-alles.mjs`, das diese Datei als eigenen Prozess
   startet. */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { abschnitt, behaupte, gleich, wirft, ende } from "./helfer.mjs";
import { macheSpiel, starte } from "../runtime/start.js";
import { macheSitzung } from "../netz/sitzung.mjs";
import { macheLauf, naechsteTiefe, zustandsSumme } from "../spiel/lauf.mjs";
import { AKTION, moeglicheAktionen } from "../spiel/aktionen.mjs";
import {
  amZugWesen, fuegeSchadenZu, laufEndeEintragen, SEITE_JAEGER
} from "../spiel/zug.mjs";
import { planeZug } from "../spiel/gegner-ki.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { torSchonOffen } from "./buehne-browser.mjs";

/* Der Browser eines Mitspielers, der schon einmal drin war: Seit dem
   07.09.2026 steht vor dem Vorlauf der Torwächter
   (`runtime/torwaechter.js`), und ohne das Zugangswort entsteht die
   Lobby gar nicht erst. Diese Prüfung misst den Vorlauf und was
   dahinter kommt, nicht das Tor — also bekommt sie den zweiten Start,
   den jeder Mitspieler nach dem ersten hat. Das Tor selbst prüft
   `werkzeuge/pruefe-torwaechter.mjs`. */
torSchonOffen();


const WURZEL = dirname(dirname(fileURLToPath(import.meta.url)));
const liesWurzel = (name) => readFileSync(join(WURZEL, name), "utf8");

/* Was dieser Lauf gemessen hat. Steht am Schluss, damit jede Zahl aus
   dieser Prüfung ihren Befehl hat: `node werkzeuge/pruefe-app.mjs`. */
const messungen = [];

/* Die Saaten. Sie stehen hier oben, weil jede Zahl weiter unten von
   ihnen abhängt — mit anderer Saat käme ein anderer Kerker und damit
   eine andere Messung. */
const SAAT_BILD = 3;        /* der Kerker, in dem zweihundert Bilder fallen */
const SAAT_RUNDEN = 7;      /* der Kerker der dreißig Runden */
/* Ein **zweiter** Kerker, allein für die Frage „läuft der Kampf?".
   Warum er seit dem 07.09.2026 dazugehört, steht bei der Behauptung. */
const SAAT_RUNDEN_ZWEI = 31;
const SAAT_NIEDERLAGE = 11; /* dort fällt der einzelne Jäger — gemessen */
const SAAT_TIEFEN = 23;     /* der Lauf über drei Kerkertiefen */
const BILDER = 200;
const RUNDEN = 30;
const TIEFEN = 3;

/* Wie viele Aktionen ein Rundenlauf höchstens braucht. Sie fängt keinen
   erwarteten Fall, sondern den, der eine Prüfung wertlos macht: Weist
   eine Sitzung eine Aktion ab und nimmt auch das Zugende nicht mehr an,
   dreht die Schleife für immer — die Kette hinge, statt rot zu werden.
   Gemessen braucht der Lauf zu viert 766 Aktionen für dreißig Runden
   (`node werkzeuge/pruefe-app.mjs`); 200 je Runde ist reichlich Luft. */
const SCHRITTE_JE_RUNDE = 200;

/* ══════════════════════════════════════════════════════════════════
   Das Ersatz-Zeichenblatt
   ══════════════════════════════════════════════════════════════════

   Es malt nichts, es schreibt mit. Nur die Methoden, die `runtime/`
   wirklich benutzt — mehr wäre eine Behauptung darüber, was der
   Browser kann, und keine über dieses Spiel.

   Die beiden Funde werden **im Vorbeigehen** festgestellt und nicht
   aus einer Liste nachgerechnet: Ein Kerkerbild sind zehntausende
   Rechtecke, und zweihundert Bilder davon aufzuheben kostete mehr
   Speicher als das ganze Spiel. */
function macheErsatzflaeche(breite = 640, hoehe = 360) {
  let blattBreite = breite;
  let blattHoehe = hoehe;
  let farbe = "#000000";
  let rechtecke = 0;
  let aufrufe = 0;
  /* `frisch` heißt: Die Blattmaße wurden gesetzt und die Glättung
     seither nicht abgeschaltet. Wird in diesem Zustand gezeichnet,
     zeichnet der Browser weich (Fehlerbuch D1). */
  let frisch = false;
  let erster = null;
  let bruch = null;
  let weich = null;
  let masseBruch = null;

  function merke(eintrag) {
    aufrufe++;
    if (erster === null) erster = eintrag;
    if (eintrag[0] === "blattBreite" || eintrag[0] === "blattHoehe") {
      frisch = true;
      if (masseBruch === null && !Number.isInteger(eintrag[1])) masseBruch = eintrag;
      return;
    }
    if (eintrag[0] === "glaettung") { if (eintrag[1] === false) frisch = false; return; }
    if (eintrag[0] !== "rechteck") return;
    rechtecke++;
    if (frisch && weich === null) weich = eintrag;
    if (bruch === null
      && ![eintrag[1], eintrag[2], eintrag[3], eintrag[4]].every(Number.isInteger)) {
      bruch = eintrag;
    }
  }

  const canvas = {
    get width() { return blattBreite; },
    set width(wert) { blattBreite = wert; merke(["blattBreite", wert]); },
    get height() { return blattHoehe; },
    set height(wert) { blattHoehe = wert; merke(["blattHoehe", wert]); }
  };

  return {
    canvas,
    aufrufe: () => aufrufe,
    rechtecke: () => rechtecke,
    erster: () => erster,
    bruch: () => bruch,
    weich: () => weich,
    masseBruch: () => masseBruch,
    set imageSmoothingEnabled(wert) { merke(["glaettung", wert]); },
    get imageSmoothingEnabled() { return false; },
    set fillStyle(wert) { farbe = wert; merke(["farbe", wert]); },
    get fillStyle() { return farbe; },
    set globalCompositeOperation(wert) { merke(["mischen", wert]); },
    get globalCompositeOperation() { return "source-over"; },
    fillRect(x, y, b, h) { merke(["rechteck", x, y, b, h, farbe]); }
  };
}

/* Fenster, Seite und Blatt — so viel Browser, wie `runtime/start.js`
   anfasst, und keinen Handgriff mehr. Die Maße gehen **durch** zum
   Ersatzblatt: Im Browser ist `blatt` dasselbe Ding wie `ctx.canvas`,
   und zwei getrennte Felder machten die Prüfung genau an der Stelle
   blind, an der der Glättungsfehler entsteht. */
function macheBrowserErsatz(breite = 640, hoehe = 360) {
  const ctx = macheErsatzflaeche(breite, hoehe);
  const hoerer = [];
  const melde = (wo, name, fn) => hoerer.push({ wo, name, fn });
  const schriftstueck = {
    visibilityState: "visible",
    fullscreenElement: null,
    addEventListener: (name, fn) => melde("schrift", name, fn),
    removeEventListener: () => {}
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
    getBoundingClientRect: () => ({ left: 0, top: 0, width: breite, height: hoehe }),
    addEventListener: (name, fn) => melde("blatt", name, fn),
    removeEventListener: () => {},
    requestFullscreen: () => { schriftstueck.fullscreenElement = blatt; }
  };
  const bilder = [];
  const alt = {
    document: globalThis.document,
    raf: globalThis.requestAnimationFrame,
    an: globalThis.addEventListener,
    intervall: globalThis.setInterval
  };
  globalThis.document = schriftstueck;
  globalThis.requestAnimationFrame = (fn) => { bilder.push(fn); return bilder.length; };
  globalThis.addEventListener = (name, fn) => melde("fenster", name, fn);

  return {
    ctx, blatt, hoerer, bilder, schriftstueck,
    feuere(name, ereignis = {}) {
      for (const h of [...hoerer]) if (h.name === name) h.fn(ereignis);
    },
    /* Ein Bild von Hand. Die Reihe wird geleert, weil `bild()` beim
       Laufen schon das nächste angefordert hat — sonst wüchse sie mit
       jedem Durchgang um eins. */
    naechstesBild(zeitMs) {
      const fn = bilder.pop();
      bilder.length = 0;
      if (fn) fn(zeitMs);
    },
    raeumeAuf() {
      globalThis.document = alt.document;
      globalThis.requestAnimationFrame = alt.raf;
      globalThis.addEventListener = alt.an;
      globalThis.setInterval = alt.intervall;
    }
  };
}

/* Ein Spiel wie im Browser: Zustand, Sitzung, Bild. Genau die Klammer
   aus `runtime/start.js → baueSitzung`, nur ohne Leitung — allein ist
   der Netzfall mit null Gästen. */
function macheApp(zustand, welt, vorhandene = null) {
  const sitzung = vorhandene || macheSitzung({
    istGastgeber: true, zustand, sendeAn: () => {}, alleSenden: () => {}
  });
  const spiel = macheSpiel({
    ctx: welt.ctx, zustand, sitzung, leinwand: welt.blatt, platz: 1,
    fensterBreite: welt.blatt.clientWidth, fensterHoehe: welt.blatt.clientHeight
  });
  spiel.setzeFenster(welt.blatt.clientWidth, welt.blatt.clientHeight);
  return { sitzung, spiel };
}

/* ══════════════════════════════════════════════════════════════════
   1 · Die Seite und alles, was an ihr hängt
   ══════════════════════════════════════════════════════════════════ */

{
  abschnitt("Seite und Module");
  const seite = liesWurzel("index.html");

  const verweise = [...seite.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  behaupte(verweise.length >= 2, `${verweise.length} Verweise in index.html`);

  /* Der Fall, der ohne diese Arbeit falsch wäre: ein führender
     Schrägstrich. Daheim läuft alles, unter kimpaliz.github.io/hatred/
     bleibt die Seite weiß — ohne Fehlermeldung (docs/REGELN.md 14). */
  const absolut = verweise.filter((p) => p.startsWith("/") || /^[a-zA-Z][\w+.-]*:/.test(p));
  gleich(absolut.length, 0,
    `kein Verweis in index.html ist absolut${absolut.length ? ` (${absolut.join(", ")})` : ""}`);
  for (const pfad of verweise) {
    behaupte(existsSync(join(WURZEL, pfad)), `index.html verweist auf ${pfad}, und das liegt da`);
  }

  const skripte = [...seite.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  gleich(skripte.length, 1, "genau ein Skript hängt an der Seite");

  /* ── Der ganze Modulbaum ────────────────────────────────────────

     Von diesem einen Skript aus wird jeder `from "…"`-Pfad verfolgt,
     Datei für Datei, bis nichts Neues mehr kommt. Nur so fällt ein
     Modul auf, das erst in der vierten Ebene absolut verwiesen wird —
     `pruefe-einstieg.mjs` sieht die erste, diese Datei den Baum. */
  const einstieg = resolve(WURZEL, skripte[0]);
  const offen = [einstieg];
  const gesehen = new Set();
  const fehlend = [];
  const nichtRelativ = [];
  let kanten = 0;

  while (offen.length > 0) {
    const datei = offen.pop();
    if (gesehen.has(datei)) continue;
    gesehen.add(datei);
    if (!existsSync(datei)) { fehlend.push(relative(WURZEL, datei)); continue; }
    const quelle = readFileSync(datei, "utf8");
    const pfade = [
      ...[...quelle.matchAll(/\bfrom\s+"([^"]+)"/g)].map((m) => m[1]),
      ...[...quelle.matchAll(/\bimport\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1])
    ];
    for (const pfad of pfade) {
      kanten++;
      /* Ein nackter Name wie `three` bräuchte einen Bündler oder eine
         Importkarte. Beides gibt es hier nicht — im Browser wäre das
         ein stiller Ladefehler und ein schwarzes Bild. */
      if (!pfad.startsWith("./") && !pfad.startsWith("../")) {
        nichtRelativ.push(`${relative(WURZEL, datei)} → ${pfad}`);
        continue;
      }
      offen.push(resolve(dirname(datei), pfad));
    }
  }

  gleich(nichtRelativ.length, 0,
    `jeder Einfuhrpfad im Baum ist relativ${nichtRelativ.length
      ? ` (${nichtRelativ.slice(0, 3).join(", ")})` : ""}`);
  gleich(fehlend.length, 0,
    `jedes verwiesene Modul liegt wirklich da${fehlend.length
      ? ` (${fehlend.slice(0, 3).join(", ")})` : ""}`);
  behaupte(gesehen.size >= 20, `${gesehen.size} Module hängen an index.html, ${kanten} Verweise`);

  /* Die eine Gegenprobe, ohne die der Baum nichts sagte: Die drei
     Häuser des Spiels müssen wirklich darin vorkommen. Zeigte der
     Einstieg versehentlich auf eine leere Datei, wäre alles oben
     grün — und der Kerker im Netz unerreichbar. */
  const haeuser = ["runtime/zeichnen.js", "netz/sitzung.mjs", "spiel/lauf.mjs"];
  for (const haus of haeuser) {
    behaupte(gesehen.has(resolve(WURZEL, haus)), `${haus} hängt am Einstieg`);
  }
  messungen.push(`${gesehen.size} Module am Einstieg, ${kanten} Einfuhrpfade, alle relativ`);
}

/* ══════════════════════════════════════════════════════════════════
   2 · Zweihundert Bilder
   ══════════════════════════════════════════════════════════════════ */

{
  abschnitt("Zweihundert Bilder");
  const welt = macheBrowserErsatz();
  try {
    const zustand = macheLauf({ saat: SAAT_BILD, spielerZahl: 1, tiefe: 1 });
    const { spiel } = macheApp(zustand, welt);

    let wurf = null;
    let zeit = 0;
    let leereBilder = 0;
    for (let i = 0; i < BILDER; i++) {
      zeit += 1 / 60;
      const vorher = welt.ctx.rechtecke();
      try { spiel.bild(zeit); } catch (fund) { wurf = `Bild ${i + 1}: ${fund.message}`; break; }
      if (welt.ctx.rechtecke() === vorher) leereBilder++;
    }

    gleich(wurf, null, `${BILDER} Bilder fallen, ohne dass etwas wirft`);
    gleich(leereBilder, 0, `kein einziges der ${BILDER} Bilder bleibt leer`);
    behaupte(welt.ctx.rechtecke() > BILDER * 100,
      `${welt.ctx.rechtecke()} Rechtecke in ${BILDER} Bildern`);

    /* Die zwei Funde, die man sonst erst im fertigen Bild sieht. */
    gleich(welt.ctx.bruch(), null,
      `kein Zeichenaufruf auf einem Bruchteil eines Bildpunktes${welt.ctx.bruch()
        ? ` — ${JSON.stringify(welt.ctx.bruch())}` : ""}`);
    gleich(welt.ctx.weich(), null, "nach jedem Setzen der Blattmaße ist die Glättung wieder aus");
    gleich(welt.ctx.masseBruch(), null, "die Blattmaße sind ganze Zahlen");

    messungen.push(`${BILDER} Bilder auf Saat ${SAAT_BILD}: ${welt.ctx.rechtecke()} Rechtecke, `
      + `${welt.ctx.aufrufe()} Aufrufe`);
  } finally {
    welt.raeumeAuf();
  }
}

/* ══════════════════════════════════════════════════════════════════
   3 · Dreißig Runden, zweimal
   ══════════════════════════════════════════════════════════════════ */

/* Der Spieler würfelt — aber aus einem **gesäten** Strom, und immer
   aus `moeglicheAktionen`. Beides ist Absicht:

   · Gewürfelt, weil ein festes Vorgehen immer denselben schmalen Pfad
     durchs Spiel nimmt. Wer würfelt, stößt, trinkt, hebt auf, wacht
     und springt — und trifft die Ecken, an denen es bricht.
   · Gesät, weil zwei Läufe sonst nichts miteinander zu tun hätten und
     die Prüfzahl nach jeder Runde nichts bewiese.
   · Aus `moeglicheAktionen`, weil das die **eine** Liste des Erlaubten
     ist. Baute die Prüfung sich eine zweite, prüfte sie irgendwann
     ihre eigene Liste gegen die des Spiels.

   Der Trank ist die einzige Ausnahme vom Würfeln: Ohne ihn fällt der
   einzelne Jäger, lange bevor dreißig Runden voll sind, und der
   Gleichlauf wäre über sieben Runden bewiesen statt über dreißig. */
function spielerAktion(zustand, wesen, zufall) {
  const moeglich = moeglicheAktionen(zustand, wesen);
  if (moeglich.length === 0) return { typ: AKTION.zugEnde, wer: wesen.id };
  if (wesen.lp * 2 <= wesen.lpMax) {
    const trank = moeglich.find((a) => a.typ === AKTION.trank);
    if (trank) return trank;
  }
  return zufall.ausListe(moeglich);
}

/* ── Vier Rechner in einem Prozess ─────────────────────────────────

   Jeder Platz bekommt einen **eigenen** Spielstand aus derselben Saat
   und eine eigene Sitzung; über die Leitung geht nur die Aktion. Genau
   so läuft der Koop, und genau so muss er geprüft werden: Ein Lauf, in
   dem alle vier auf denselben Zustand zeigen, kann gar nicht
   auseinanderlaufen — und bewiese deshalb nichts.

   Die „Leitung" ist ein Aufruf. Sie darf nichts können, was eine echte
   Leitung nicht kann: Sie reicht eine Zeichenkette weiter, sonst
   nichts. */
function baueTisch(saat, spielerZahl) {
  const zustaende = [];
  for (let p = 0; p < spielerZahl; p++) {
    zustaende.push(macheLauf({ saat, spielerZahl, tiefe: 1 }));
  }
  const gaeste = [];
  const wirt = macheSitzung({
    istGastgeber: true,
    zustand: zustaende[0],
    /* `wem` ist genau das, was der Gastgeber beim Empfang als Absender
       gesehen hat — hier die Sitzung des Gastes selbst. */
    sendeAn: (wem, text) => { if (wem) wem.empfange(text, null); },
    alleSenden: (text) => { for (const gast of gaeste) gast.empfange(text, null); }
  });
  for (let p = 1; p < spielerZahl; p++) {
    const halter = {};
    const gast = macheSitzung({
      istGastgeber: false,
      zustand: zustaende[p],
      alleSenden: (text) => wirt.empfange(text, halter.sitzung)
    });
    halter.sitzung = gast;
    gaeste.push(gast);
    gast.beitreten(`Spieler ${p + 1}`);
  }
  const sitzungFuer = (platz) => (platz === 1 ? wirt : gaeste[platz - 2]);
  return { zustaende, wirt, gaeste, sitzungFuer };
}

/* Ein ganzer Lauf über die Sitzung. Zurück kommen die Prüfzahlen —
   eine je Runde — und was unterwegs geschehen ist. */
function spieleRunden(saat, welt, { runden = RUNDEN, spielerZahl = 1 } = {}) {
  const zustand = macheLauf({ saat, spielerZahl, tiefe: 1 });
  const { sitzung, spiel } = macheApp(zustand, welt);
  const zufall = macheZufall(saat + 77);
  const summen = [zustandsSumme(zustand)];
  const arten = new Map();
  let abgelehnt = 0;
  let gezaehlt = 0;
  let festgefahren = false;
  let letzteRunde = zustand.runde;
  let zeit = 0;
  let wurf = null;

  sitzung.beiEreignissen((ereignisse) => {
    for (const e of ereignisse) arten.set(e.art, (arten.get(e.art) || 0) + 1);
  });

  try {
    let schritte = 0;
    while (gezaehlt < runden && !zustand.vorbei) {
      if (++schritte > runden * SCHRITTE_JE_RUNDE) { festgefahren = true; break; }
      const dran = amZugWesen(zustand);
      if (!dran) break;
      let aktion;
      if (dran.seite === SEITE_JAEGER) {
        aktion = spielerAktion(zustand, dran, zufall);
      } else {
        const plan = planeZug(zustand, dran);
        aktion = plan.length > 0 ? plan[0] : { typ: AKTION.zugEnde, wer: dran.id };
      }
      if (!sitzung.willAktion(aktion)) {
        abgelehnt++;
        sitzung.willAktion({ typ: AKTION.zugEnde, wer: dran.id });
      }
      /* Das Bild läuft mit. Ohne diesen Aufruf leerte niemand die
         Reihe des Abspielers, und dreißig Runden Ereignisse stünden
         am Schluss auf einem Haufen — geprüft wäre dann eine
         Abspielung, die es im Spiel nicht gibt. */
      zeit += 1 / 60;
      spiel.bild(zeit);
      if (zustand.runde !== letzteRunde) {
        letzteRunde = zustand.runde;
        gezaehlt++;
        summen.push(zustandsSumme(zustand));
      }
    }
  } catch (fund) {
    wurf = fund.message;
  }
  return {
    zustand, spiel, sitzung, summen, arten, abgelehnt, festgefahren,
    runden: gezaehlt, wurf
  };
}

/* Dreißig Runden zu viert, über vier Sitzungen. Nach **jeder** Runde
   wird die Prüfzahl aller vier Spielstände abgenommen — und die des
   Gastgebers zusätzlich aufgeschrieben, damit ein zweiter Lauf sie
   Zahl für Zahl wiederholen muss.

   `malen: false` lässt das Bild aus. Nur für einen Lauf gedacht, der
   allein nach dem **Spielverlauf** fragt: Gemessen am 07.09.2026
   kostet ein Lauf mit Bild 9,9 s und ohne 2,3 s, bei Zeichen für
   Zeichen denselben Ereigniszahlen. Für den Gleichlauf und für die
   Abspielung bleibt das Bild an — dort ist es der Gegenstand. */
function spieleZuViert(saat, welt,
  { runden = RUNDEN, spielerZahl = 4, malen = true } = {}) {
  const tisch = baueTisch(saat, spielerZahl);
  const zustand = tisch.zustaende[0];
  const { spiel } = macheApp(zustand, welt, tisch.wirt);
  const zufall = macheZufall(saat + 77);
  const summen = [zustandsSumme(zustand)];
  const arten = new Map();
  let abgelehnt = 0;
  let auseinander = 0;
  let gezaehlt = 0;
  let festgefahren = false;
  let letzteRunde = zustand.runde;
  let zeit = 0;
  let wurf = null;

  tisch.wirt.beiEreignissen((ereignisse) => {
    for (const e of ereignisse) arten.set(e.art, (arten.get(e.art) || 0) + 1);
  });

  try {
    let schritte = 0;
    while (gezaehlt < runden && !zustand.vorbei) {
      if (++schritte > runden * SCHRITTE_JE_RUNDE) { festgefahren = true; break; }
      const dran = amZugWesen(zustand);
      if (!dran) break;
      let aktion;
      let sitzung = tisch.wirt;
      if (dran.seite === SEITE_JAEGER) {
        aktion = spielerAktion(zustand, dran, zufall);
        sitzung = tisch.sitzungFuer(dran.spielerPlatz);
      } else {
        const plan = planeZug(zustand, dran);
        aktion = plan.length > 0 ? plan[0] : { typ: AKTION.zugEnde, wer: dran.id };
      }
      if (!sitzung.willAktion(aktion)) {
        abgelehnt++;
        sitzung.willAktion({ typ: AKTION.zugEnde, wer: dran.id });
      }
      /* Das Bild läuft mit. Ohne diesen Aufruf leerte niemand die
         Reihe des Abspielers, und dreißig Runden Ereignisse stünden
         am Schluss auf einem Haufen — geprüft wäre dann eine
         Abspielung, die es im Spiel nicht gibt. */
      zeit += 1 / 60;
      if (malen) spiel.bild(zeit);
      if (zustand.runde !== letzteRunde) {
        letzteRunde = zustand.runde;
        gezaehlt++;
        const summe = zustandsSumme(zustand);
        summen.push(summe);
        for (const anderer of tisch.zustaende) {
          if (zustandsSumme(anderer) !== summe) auseinander++;
        }
      }
    }
  } catch (fund) {
    wurf = fund.message;
  }
  return {
    zustand, spiel, tisch, summen, arten, abgelehnt, auseinander, festgefahren,
    runden: gezaehlt, wurf
  };
}

{
  abschnitt("Dreißig Runden zu viert");
  const welt = macheBrowserErsatz();
  try {
    const erster = spieleZuViert(SAAT_RUNDEN, welt);
    const zweiter = spieleZuViert(SAAT_RUNDEN, welt);
    /* Der zweite Kerker — ohne Bild, weil hier allein der Verlauf
       zählt. Begründung bei den beiden Kampfbehauptungen weiter unten. */
    const anderer = spieleZuViert(SAAT_RUNDEN_ZWEI, welt, { malen: false });

    gleich(erster.wurf, null, "der erste Lauf über dreißig Runden wirft nicht");
    gleich(zweiter.wurf, null, "der zweite ebenso");
    gleich(anderer.wurf, null, `und der Lauf auf Saat ${SAAT_RUNDEN_ZWEI} auch nicht`);
    gleich(anderer.festgefahren, false, "auch der zweite Kerker fährt sich nicht fest");
    gleich(anderer.runden, RUNDEN, `${RUNDEN} volle Runden auch auf Saat ${SAAT_RUNDEN_ZWEI}`);
    gleich(erster.festgefahren, false, "der Lauf fährt sich nicht fest");
    gleich(erster.runden, RUNDEN, `${RUNDEN} volle Runden über vier Sitzungen gespielt`);
    gleich(erster.zustand.vorbei, null, "und der Lauf ist danach noch offen");
    gleich(erster.abgelehnt, 0,
      "keine Sitzung weist eine Aktion ab, die `moeglicheAktionen` erlaubt hat");

    /* Alle vier Plätze sind wirklich am Zug gewesen. Ohne diese Probe
       könnten drei Gäste stumm danebensitzen, und der Gleichlauf wäre
       über einen Einzelspieler bewiesen. */
    const gezogen = new Set(erster.zustand.protokoll
      .map((a) => (erster.zustand.nachId.get(a.wer) || {}).spielerPlatz)
      .filter((p) => p));
    gleich(gezogen.size, 4, `alle vier Plätze haben gezogen: ${[...gezogen].sort().join(", ")}`);

    /* Der teuerste Fehler des Internet-Koop: Die vier Rechner rechnen
       verschieden und halten alle sich für richtig. */
    gleich(erster.auseinander, 0,
      `alle vier Spielstände tragen nach jeder der ${RUNDEN} Runden dieselbe Prüfzahl`);
    for (const gast of erster.tisch.zustaende.slice(1)) {
      gleich(gast.protokoll.length, erster.zustand.protokoll.length,
        "der Gast hat genau so viele Aktionen angewandt wie der Gastgeber");
    }

    /* Ohne diese Zahlen prüften die Summen einen Lauf, in dem nichts
       geschieht. Gewürfelt wird — also muss auch etwas Gewürfeltes
       herauskommen. */
    const wieoft = (art) => erster.arten.get(art) || 0;
    behaupte(wieoft("bewegt") > 20, `${wieoft("bewegt")} Bewegungen`);
    /* ── Warum diese Frage seit dem 07.09.2026 zwei Kerker braucht ──

       Sie fragt: Trifft die Brut überhaupt auf die Jäger, oder stehen
       dreißig Runden lang alle nebeneinander herum? Bis zum
       07.09.2026 stand dafür `wieoft("angriff") > 3` auf **einer**
       Karte, der Saat 7. Das war eine Zahl, die an genau diesen einen
       Kerker gebunden war — und Vorgang #8 (Abgründe) hat ihn
       verändert.

       Gemessen wurde daraufhin dieselbe Frage über sechs Saaten
       (7, 3, 11, 19, 23, 31), einmal ohne und einmal mit Abgründen:

         ohne : 7 ·  0 · 0 · 0 · 0 ·  9 → 16 Angriffe
         mit  : 0 · 25 · 0 · 0 · 0 · 29 → 54 Angriffe

       Die Einzelzahl schwankt also zwischen 0 und 29 und sagt über
       den Kampf nichts; die Summe hat sich mehr als verdreifacht. Auf
       **einer** Karte gemessen war die alte Schranke deshalb kein
       Fangnetz für den leeren Lauf, sondern ein Glücksfall der Saat 7
       — auf drei von sechs Saaten wäre sie auch ohne jede Änderung rot
       gewesen.

       Deshalb jetzt zwei Kerker und die **Summe**: 29 Angriffe
       gemessen, Schranke 10. Sie liegt damit höher als die alte (die
       auf 3 hinauslief) und hängt an mehr als einer Karte.
       Nachzurechnen mit `node werkzeuge/pruefe-app.mjs`, Messzeile
       „30 Runden zu viert". */
    const wieoftAuch = (art) => wieoft(art) + (anderer.arten.get(art) || 0);
    const angriffe = wieoftAuch("angriff");
    behaupte(angriffe > 10,
      `${angriffe} Angriffe auf den Saaten ${SAAT_RUNDEN} und ${SAAT_RUNDEN_ZWEI}`);
    /* Nicht „mehr als zehn Treffer", sondern „ein ordentlicher Teil
       der Angriffe trifft". Eine feste Trefferzahl wäre an denselben
       einen Kerker gebunden wie die Schranke darüber.

       Was diese Stelle wirklich fragt, ist: Läuft der Kampf, oder
       geht ins Leere, was gewürfelt wird? Ein Drittel Treffer ist die
       Grenze, unter der etwas grundsätzlich kaputt wäre — eine
       zerbrochene Trefferrechnung landet bei null. */
    const treffer = wieoftAuch("schaden");
    behaupte(treffer * 3 > angriffe,
      `${treffer} Treffer aus ${angriffe} Angriffen — mehr als ein Drittel`);
    behaupte(wieoft("zugEnde") > 30, `${wieoft("zugEnde")} beendete Züge`);
    /* Auch diese Frage steht über beiden Kerkern, und aus demselben
       Grund: Ob auf **einer** Karte je ein Angriff fällt, entscheidet
       die Karte. Fällt keiner, fehlen `angriff`, `schaden`,
       `gestorben` und `lpGesetzt`, und die Zahl fiel auf Saat 7 von 12
       auf 9. Über beide Kerker sind es gemessen **15**; mit einer
       vorsätzlich zerbrochenen Reichweitenrechnung 12. Die Schranke
       liegt deshalb bei 13 — über dem kaputten Fall und unter dem
       gemessenen, und höher als die alte 10. */
    const formen = new Set([...erster.arten.keys(), ...anderer.arten.keys()]);
    behaupte(formen.size >= 13,
      `${formen.size} verschiedene Ereignisformen: ${[...formen].sort().join(", ")}`);

    /* Verglichen wird jede Runde und nicht nur das Ende — sonst
       könnten sich zwei Läufe in Runde 7 trennen und in Runde 30
       zufällig wieder treffen. */
    gleich(zweiter.summen.length, erster.summen.length, "beide Läufe haben gleich viele Marken");
    let ungleich = 0;
    for (let i = 0; i < erster.summen.length; i++) {
      if (erster.summen[i] !== zweiter.summen[i]) ungleich++;
    }
    gleich(ungleich, 0, `nach jeder der ${RUNDEN} Runden dieselbe Prüfzahl in beiden Läufen`);

    /* Und die Gegenprobe: Eine Prüfzahl, die sich nie ändert, wäre
       oben genauso grün und bewiese nichts. */
    const verschieden = new Set(erster.summen).size;
    behaupte(verschieden > RUNDEN / 2,
      `${verschieden} verschiedene Prüfzahlen auf ${erster.summen.length} Marken`);
    let krumm = 0;
    for (const summe of erster.summen) {
      if (!Number.isInteger(summe) || summe < 0) krumm++;
    }
    gleich(krumm, 0, "jede Prüfzahl ist eine ganze Zahl ab null");

    gleich(welt.ctx.bruch(), null, "auch über dreißig Runden kein halber Bildpunkt");
    gleich(welt.ctx.weich(), null, "und nichts wird geglättet gezeichnet");
    messungen.push(`${RUNDEN} Runden zu viert auf Saat ${SAAT_RUNDEN}: `
      + `${erster.zustand.protokoll.length} Aktionen, ${wieoft("angriff")} Angriffe, `
      + `${verschieden} verschiedene Prüfzahlen`);
    messungen.push(`${RUNDEN} Runden zu viert, Saat ${SAAT_RUNDEN} und `
      + `${SAAT_RUNDEN_ZWEI} zusammen: ${angriffe} Angriffe, ${treffer} Treffer`);
  } finally {
    welt.raeumeAuf();
  }
}

/* ══════════════════════════════════════════════════════════════════
   4 · Wenn die Truppe fällt
   ══════════════════════════════════════════════════════════════════

   Der Fall, der ohne diese Arbeit falsch wäre: Nach dem letzten Jäger
   malt das Spiel weiter — es zeigt die Schlusszeile. Wirft es dort,
   sieht der Spieler statt „Die Truppe ist gefallen" ein eingefrorenes
   Bild und weiß nicht einmal, dass er verloren hat.

   Die Niederlage wird **herbeigeführt** und nicht abgewartet: Ob ein
   gewürfelter Jäger auf einer erzeugten Karte fällt, hängt an der
   Karte — und diese Prüfung hinge damit an der Landschaft statt am
   Spiel. Zugefügt wird der Schaden mit `fuegeSchadenZu` aus
   `spiel/zug.mjs`, also mit der Rechnung des Kerns und nicht mit einer
   zweiten daneben. */
{
  abschnitt("Niederlage");
  const welt = macheBrowserErsatz();
  try {
    const lauf = spieleRunden(SAAT_NIEDERLAGE, welt, { runden: 3 });
    gleich(lauf.wurf, null, "auch der Lauf in die Niederlage wirft nicht");
    gleich(lauf.festgefahren, false, "auch dieser Lauf fährt sich nicht fest");
    gleich(lauf.zustand.vorbei, null, "nach drei Runden steht die Truppe noch");

    const ereignisse = [];
    for (const wesen of lauf.zustand.wesen) {
      if (wesen.seite !== SEITE_JAEGER) continue;
      fuegeSchadenZu(wesen, wesen.lp, "prüfung", "sturz", ereignisse);
    }
    for (const e of laufEndeEintragen(lauf.zustand)) ereignisse.push(e);
    lauf.spiel.abspieler.lege(ereignisse);

    gleich(lauf.zustand.vorbei, "niederlage", "mit dem letzten Jäger endet der Lauf");
    behaupte(ereignisse.some((e) => e.art === "gestorben"),
      `${ereignisse.filter((e) => e.art === "gestorben").length} Jäger sind gefallen`);
    behaupte(ereignisse.some((e) => e.art === "laufEnde"), "das Laufende ist ein Ereignis");

    let wurf = null;
    const vorher = welt.ctx.rechtecke();
    let zeit = 9;
    for (let i = 0; i < 60; i++) {
      zeit += 1 / 60;
      try { lauf.spiel.bild(zeit); } catch (fund) { wurf = fund.message; break; }
    }
    gleich(wurf, null, "nach der Niederlage malt das Spiel sechzig Bilder weiter");
    behaupte(welt.ctx.rechtecke() > vorher, "und es kommt wirklich noch etwas auf das Blatt");
    gleich(lauf.spiel.stand().vorbei, "niederlage", "der Stand sagt, wie es ausging");
    gleich(welt.ctx.bruch(), null, "auch die Schlusszeile liegt auf ganzen Bildpunkten");
    messungen.push(`Niederlage auf Saat ${SAAT_NIEDERLAGE}: ${lauf.runden} Runden gespielt, `
      + `dann alle Jäger gefallen — ${welt.ctx.rechtecke() - vorher} Rechtecke danach`);
  } finally {
    welt.raeumeAuf();
  }
}

/* ══════════════════════════════════════════════════════════════════
   5 · Drei Kerkertiefen
   ══════════════════════════════════════════════════════════════════

   Genau der Weg aus `runtime/start.js → tiefer()`: alte Eingabe lösen,
   `naechsteTiefe` rufen, Sitzung und Bild neu bauen. Deshalb auch
   **allein**: Zu mehreren müsste der Abstieg über die Leitung
   abgestimmt werden, und dafür gibt es in `netz/nachrichten.mjs` keine
   Nachricht — `tiefer()` verweigert dann ausdrücklich.

   Dass der Kerker unter der Treppe ein anderer ist, dass die Jäger
   dieselben bleiben und die Brut eine neue ist, fällt nur hier auf:
   `pruefe-lauf.mjs` kennt die Sitzung nicht und `pruefe-netz.mjs`
   keinen Kerker. */
{
  abschnitt("Drei Kerkertiefen");
  const welt = macheBrowserErsatz();
  try {
    let zustand = macheLauf({ saat: SAAT_TIEFEN, spielerZahl: 1, tiefe: 1 });
    const zufall = macheZufall(SAAT_TIEFEN + 5);
    const gesehen = [];
    let wurf = null;
    let zeit = 0;
    let bilder = 0;
    let aktionen = 0;
    let abgelehnt = 0;

    for (let tiefe = 1; tiefe <= TIEFEN; tiefe++) {
      let app = null;
      try {
        app = macheApp(zustand, welt);
        const jaeger = zustand.wesen.filter((w) => w.seite === SEITE_JAEGER);
        gesehen.push({
          tiefe: zustand.tiefe,
          runde: zustand.runde,
          summe: zustand.karte.summe(),
          starts: zustand.karte.starts.length,
          jaegerIds: jaeger.map((w) => w.id).join(","),
          brutIds: zustand.wesen.filter((w) => w.seite !== SEITE_JAEGER)
            .map((w) => w.id).join(","),
          lebendeBrut: zustand.wesen.filter((w) => w.seite !== SEITE_JAEGER && w.lebt).length,
          lp: jaeger.reduce((summe, w) => summe + w.lp, 0)
        });
        /* Auf jeder Ebene wirklich spielen — sonst bewiese dieser
           Abschnitt nur, dass sich Karten bauen lassen, und nicht,
           dass man auf ihnen spielen kann. */
        for (let i = 0; i < 120 && !zustand.vorbei; i++) {
          const dran = amZugWesen(zustand);
          if (!dran) break;
          const aktion = dran.seite === SEITE_JAEGER
            ? spielerAktion(zustand, dran, zufall)
            : (planeZug(zustand, dran)[0] || { typ: AKTION.zugEnde, wer: dran.id });
          if (app.sitzung.willAktion(aktion)) aktionen++;
          else {
            abgelehnt++;
            app.sitzung.willAktion({ typ: AKTION.zugEnde, wer: dran.id });
          }
          zeit += 1 / 60;
          app.spiel.bild(zeit);
          bilder++;
        }
      } catch (fund) {
        wurf = `Tiefe ${tiefe}: ${fund.message}`;
        break;
      }
      if (tiefe < TIEFEN) {
        /* Wie im Spiel: erst die Eingabe lösen, dann hinab. Ohne das
           Lösen hingen die Hörer des alten Kerkers am Blatt, und der
           zweite Klick ginge an zwei Spiele zugleich. */
        app.spiel.loese();
        zustand = naechsteTiefe(zustand);
      }
    }

    gleich(wurf, null, `ein Lauf über ${TIEFEN} Kerkertiefen läuft durch`);
    gleich(gesehen.length, TIEFEN, `${TIEFEN} Ebenen wurden wirklich betreten`);
    gleich(gesehen.map((e) => e.tiefe).join(","), "1,2,3", "die Tiefen zählen 1, 2, 3");
    gleich(new Set(gesehen.map((e) => e.summe)).size, Math.min(TIEFEN, gesehen.length),
      "jede betretene Tiefe hat eine eigene Karte");
    gleich(abgelehnt, 0, "auch über drei Tiefen weist die Sitzung nichts Erlaubtes ab");

    for (const ebene of gesehen) {
      gleich(ebene.runde, 1, `Tiefe ${ebene.tiefe} beginnt in Runde 1`);
      gleich(ebene.starts, 1, `Tiefe ${ebene.tiefe}: ein Startfeld für einen Jäger`);
      behaupte(ebene.lebendeBrut > 0, `Tiefe ${ebene.tiefe}: ${ebene.lebendeBrut} Brut wartet`);
    }

    /* Die zwei Fälle, die man beim Bauen des Abstiegs vergisst und die
       ohne diese Prüfung erst der Spieler bemerkt: Die Jäger sind
       **dieselben** — mit ihren Wunden, ihren Tränken, ihrer Nummer —,
       die Brut ist eine **andere**. Wer die Jäger je Ebene neu
       aufstellt, macht aus einem Lauf drei Übungen; wer die Brut
       behält, schickt dieselben Leichen noch einmal ins Feld. */
    /* Nur wenn wirklich alle Tiefen betreten wurden. Sonst stünde hier
       ein Zugriff auf ein Feld, das es nicht gibt — und ein Wurf an
       dieser Stelle nähme `ende()` die Ausgabe, sodass statt der
       gefallenen Behauptungen ein Stapelabdruck erschiene. */
    if (gesehen.length === TIEFEN) {
      gleich(new Set(gesehen.map((e) => e.jaegerIds)).size, 1,
        `dieselben Jäger auf allen Tiefen: ${gesehen[0].jaegerIds}`);
      gleich(new Set(gesehen.map((e) => e.brutIds)).size, TIEFEN,
        "jede Tiefe bringt eine neue Brut");
      behaupte(gesehen[TIEFEN - 1].lp <= gesehen[0].lp,
        `die Jäger nehmen ihre Wunden mit: ${gesehen.map((e) => e.lp).join(" → ")} LP`);
    }

    behaupte(bilder >= 200, `${bilder} Bilder über drei Tiefen, ${aktionen} Aktionen`);
    gleich(welt.ctx.bruch(), null, "auch über drei Tiefen kein halber Bildpunkt");
    gleich(welt.ctx.weich(), null, "und nichts wird geglättet gezeichnet");
    messungen.push(`${TIEFEN} Tiefen auf Saat ${SAAT_TIEFEN}: ${aktionen} Aktionen, `
      + `${bilder} Bilder, LP ${gesehen.map((e) => e.lp).join(" → ")}`);
  } finally {
    welt.raeumeAuf();
  }
}

/* ══════════════════════════════════════════════════════════════════
   6 · Der Weg, den ein Mensch nimmt
   ══════════════════════════════════════════════════════════════════

   Vom Titelbild bis in den Kerker, über `starte` und über echte
   Mausklicks — der einzige Weg, auf dem im Browser je ein Spiel
   beginnt. Ohne diesen Abschnitt bewiese alles oben, dass sich ein
   Spiel bauen lässt, wenn jemand es baut. */
{
  abschnitt("Vom Titelbild in den Kerker");
  const welt = macheBrowserErsatz();
  try {
    const lauf = starte(welt.blatt);
    gleich(welt.ctx.erster()[0], "glaettung", "die Glättung ist vor dem ersten Strich aus");
    gleich(welt.bilder.length, 1, "das erste Bild ist angefordert");

    let zeit = 16;
    welt.naechstesBild(zeit);
    behaupte(welt.ctx.rechtecke() > 0, "der Vorlauf malt");

    const klick = (schluessel) => {
      const stelle = lauf.lobby().stellenJetzt().find((s) => s.schluessel === schluessel);
      behaupte(!!stelle, `der Knopf „${schluessel}" ist da`);
      if (!stelle) return;
      welt.feuere("mousedown", {
        clientX: stelle.x + 2, clientY: stelle.y + 2, button: 0, preventDefault: () => {}
      });
    };

    klick("allein");
    zeit += 16; welt.naechstesBild(zeit);
    klick("saat");
    for (let i = 0; i < 12; i++) welt.feuere("keydown", { key: "Backspace" });
    for (const zeichen of String(SAAT_BILD)) welt.feuere("keydown", { key: zeichen });
    gleich(lauf.lobby().stand().saat, SAAT_BILD, "die getippte Saat steht im Feld");
    klick("los");

    gleich(lauf.lobby(), null, "der Vorlauf ist fort");
    behaupte(lauf.stand() !== null, "und das Spiel steht");
    gleich(lauf.stand().tiefe, 1, "es beginnt in der ersten Tiefe");

    /* Zweihundert Bilder auf dem Weg, den ein Mensch nimmt — und
       zwar über `requestAnimationFrame`, nicht über `spiel.bild`. */
    const vorher = welt.ctx.rechtecke();
    let wurf = null;
    for (let i = 0; i < BILDER; i++) {
      zeit += 16;
      try { welt.naechstesBild(zeit); }
      catch (fund) { wurf = `Bild ${i + 1}: ${fund.message}`; break; }
    }
    gleich(wurf, null, `${BILDER} Bilder aus dem Bildlauf, ohne dass etwas wirft`);
    behaupte(welt.ctx.rechtecke() - vorher > BILDER * 100,
      `${welt.ctx.rechtecke() - vorher} Rechtecke in ${BILDER} Bildern des laufenden Spiels`);
    gleich(welt.ctx.bruch(), null, "kein Rechteck auf einem halben Bildpunkt");
    gleich(welt.ctx.weich(), null, "nichts wird geglättet gezeichnet");

    /* Und die Fenstergröße ändert sich mitten im Spiel — die Stelle,
       an der die Glättung am leichtesten zurückkommt. */
    welt.blatt.clientWidth = 517;
    welt.blatt.clientHeight = 301;
    welt.feuere("resize");
    zeit += 16; welt.naechstesBild(zeit);
    gleich(welt.blatt.width, 517, "das Blatt hat die neue Breite");
    gleich(welt.ctx.weich(), null, "und die Glättung bleibt auch danach aus");
    gleich(welt.ctx.bruch(), null, "und kein Rechteck rutscht auf einen halben Bildpunkt");

    messungen.push(`Vom Titelbild in den Kerker: ${welt.ctx.rechtecke()} Rechtecke, `
      + `${welt.hoerer.length} Hörer angemeldet`);
  } finally {
    welt.raeumeAuf();
  }
}

/* ══════════════════════════════════════════════════════════════════
   7 · Die Schutzwände
   ══════════════════════════════════════════════════════════════════

   Ein Spiel ohne Blatt, ohne Zustand oder ohne Sitzung darf nicht
   still halb laufen. Wer das wegnimmt, merkt es sonst erst an einem
   Bild, das aus keinem ersichtlichen Grund schwarz bleibt. */
{
  abschnitt("Schutzwände");
  const welt = macheBrowserErsatz();
  try {
    const zustand = macheLauf({ saat: SAAT_BILD, spielerZahl: 1, tiefe: 1 });
    const sitzung = macheSitzung({
      istGastgeber: true, zustand, sendeAn: () => {}, alleSenden: () => {}
    });
    wirft(() => macheSpiel({}), "ein Spiel ohne Zeichenblatt");
    wirft(() => macheSpiel({ ctx: welt.ctx }), "ein Spiel ohne Spielstand");
    wirft(() => macheSpiel({ ctx: welt.ctx, zustand }), "ein Spiel ohne Sitzung");
    wirft(() => zustandsSumme(null), "eine Prüfzahl ohne Zustand");

    /* Eine Aktion für eine fremde Figur geht nicht durch die Sitzung —
       im Koop wäre das der Zug, den ein Rechner tut und der andere
       nicht. Geprüft wird der Rückgabewert, nicht ein Wurf: Die
       Sitzung meldet, sie bricht nicht ab. */
    gleich(sitzung.willAktion({ typ: AKTION.zugEnde, wer: 999 }), false,
      "eine Aktion für ein Wesen, das es nicht gibt, kommt nicht durch");
    gleich(zustand.protokoll.length, 0, "und sie hat nichts am Spielstand geändert");
  } finally {
    welt.raeumeAuf();
  }
}

for (const zeile of messungen) console.log(`      · ${zeile}`);
ende("Das ganze Spiel");
