/* [Aufgabe: Oberfläche] Der Vorlauf: Titelbild, Heldenwahl, Saat,
   Einladungscode — alles, was vor dem ersten Zug passiert.

   ── Warum der Vorlauf auf demselben Blatt steht ────────────────────

   Er könnte aus HTML-Knöpfen bestehen - dann hätte das Spiel zwei
   Bedienungen, zwei Schriftbilder, zwei Farbsätze, zwei Stellen für
   jeden Fehler. Hier zeichnet derselbe Weg wie im Spiel
   (`runtime/schrift.js`, ganze Bildpunkte), und der Vorlauf sieht aus
   wie das, was danach kommt.

   ── Warum der Einladungscode alles trägt ───────────────────────────

   Ein Gast muss **vor** dem ersten Zug denselben Kerker bauen wie der
   Gastgeber: dieselbe Saat, Spielerzahl, Klassen. `netz/sitzung.mjs`
   vergleicht beim Beitritt die Prüfzahl über den ganzen Zustand - weicht
   ein Feld ab, endet die Sitzung sofort, zu Recht. Also muss all das
   über die Leitung, **bevor** es eine Leitung gibt - der einzige Kanal
   dafür ist der Einladungscode selbst, über seinen Fachnamen
   (`netz/vermittler.mjs`, erlaubt Buchstaben, Ziffern, Striche):

       <8 Zeichen Lobbycode>-<Platz>-<Heldenziffern>

   zum Beispiel `K7QM3F2P-2-0135`: Der Lobbycode trägt die Saat samt
   Prüfziffer (`netz/lobbycode.mjs`), die zweite Zahl den Platz, die
   letzte Gruppe je eine Ziffer für die Klasse jedes Platzes - ihre
   **Länge** ist die Spielerzahl. Der Gast liest daraus alles, was
   `macheLauf` braucht - kein zweiter Code, keine Absprache. Der Preis
   steht ehrlich da: **Die Truppe stellt der Gastgeber auf**, anders
   ginge es nur mit einer Nachricht, die `netz/nachrichten.mjs` nicht hat.

   ── Warum die Plätze nacheinander verbunden werden ─────────────────

   Bei drei Gästen gäbe es drei Angebote gleichzeitig und drei Antworten,
   die man verwechseln kann. Nacheinander ist es ein Code, ein Einfügen,
   ein Mitspieler - der Bildschirm zeigt, bei welchem man ist.

   ── Was diese Datei nicht tut ──────────────────────────────────────

   Sie entscheidet keine Regel, baut keinen Lauf, kennt keinen Spielstand.
   Am Ende ruft sie `beiStart` und ist fertig. Die Bausteine des Netzes
   werden **gereicht** (`netzwerk`), damit die Prüfung sie ohne Browser
   durch erfundene ersetzen kann.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/lobby-bild.js` (malt den fertig gelegten Vorlauf),
   `runtime/start.js` (baut die Lobby, bekommt `beiStart`, würfelt die
   Saat), `runtime/schrift.js`, `runtime/palette.js`,
   `spiel/katalog/helden.mjs` (sechs Klassen), `spiel/wesen.mjs`
   (`MAX_SPIELER`), `netz/lobbycode.mjs`, `netz/vermittler.mjs`
   (Einladungscode), `netz/verbindung.mjs` (die Leitung),
   `werkzeuge/pruefe-einstieg.mjs`. */

import * as schrift from "./schrift.js";
import { VORLAUF } from "./palette.js";
import { zeichneVorlauf } from "./lobby-bild.js";
import { HELDEN } from "../spiel/katalog/helden.mjs";
import { MAX_SPIELER } from "../spiel/wesen.mjs";
import { SAAT_HOECHSTENS, leseCode, macheCode } from "../netz/lobbycode.mjs";
import {
  ANGEBOT, ANTWORT, leseAngabe, vermittlerVonHand
} from "../netz/vermittler.mjs";
import { GESCHEITERT, OFFEN, VERBINDET, VERMITTELT, macheVerbindung } from "../netz/verbindung.mjs";

/* Die fünf Bilder des Vorlaufs. Mehr gibt es nicht, und jedes hat
   genau eine Frage: Was willst du? Wen spielst du? Wer darf herein?
   Wo bleibt er? Wo bleibe ich? */
export const SEITE = {
  start: "start",
  aufstellung: "aufstellung",
  beitreten: "beitreten",
  warten: "warten",
  verbinden: "verbinden"
};

/* Die Anhänge, die `netz/verbindung.mjs` an den Fachnamen hängt. Sie
   stehen hier als Namen, weil diese Datei den Fachnamen wieder
   zerlegen muss — eine zweite Zeichenkette an zwei Stellen wäre der
   übliche Weg, sich um einen Buchstaben zu vertun. */
export const ANHANG_ANGEBOT = "-angebot";
export const ANHANG_ANTWORT = "-antwort";

/* Die Spalte, in der alles steht — in logischen Bildpunkten, vor der
   Vergrößerung. 320 ist die Breite, in die die längste Klassenzeile
   des Katalogs passt; die Fenstergröße ändert nur die Vergrößerung,
   nie das Bild. */
export const SPALTE = 320;
export const RAND = 8;
export const MINDEST_BREITE = SPALTE + 2 * RAND;

/* Luftraum zwischen den zwei Spalten im Querformat, mehr als die 2 Punkte
   zwischen zwei Knöpfen - sonst sähe es wie eine krumme Reihe aus. */
export const SPALTEN_LUECKE = 16;
export const ZWEI_SPALTEN_BREITE = 2 * SPALTE + SPALTEN_LUECKE + 2 * RAND;

/* Zeilenhöhen, logisch, vor `stufe` (unter 672 Punkten Breite bleibt
   `stufe` immer 1, also echte Bildschirmpunkte). `knopf`/`reihe`/`feld`
   sind deshalb **48** (Androids Daumen-Vorgabe, 48dp = 48 CSS-Punkte) -
   vorher 14, für eine Maus gedacht. */
const HOCH = { titel: 34, unter: 12, text: 10, leer: 6, knopf: 48, reihe: 48, feld: 48 };

/* Zeichen, die `runtime/schrift.js` nicht hat. Ohne diese Tabelle
   stünde mitten in einem Klassenspruch des Katalogs ein leerer Kasten —
   und niemand käme darauf, dass es am Gedankenstrich liegt. */
const ERSATZ_ZEICHEN = {
  "—": "-", "–": "-", "…": "...", "„": "\"", "“": "\"", "”": "\"", "‚": "'", "‘": "'",
  "’": "'", "[": "(", "]": ")", "«": "\"", "»": "\"", "×": "x"
};

/* Macht aus beliebigem Text einen, den die Pixelschrift wirklich malen
   kann. Wird auf **jede** Zeile angewandt, die auf den Bildschirm geht. */
export function lesbar(text) {
  let raus = "";
  for (const zeichen of String(text)) raus += ERSATZ_ZEICHEN[zeichen] || zeichen;
  return raus;
}

/* Umbruch an Wortgrenzen. Ein Spruch des Katalogs ist länger als die
   Spalte, und ein abgeschnittener Satz sagt etwas anderes als der
   ganze. */
export function umbrich(text, zeichenJeZeile) {
  const worte = lesbar(text).split(/\s+/).filter((w) => w !== "");
  const zeilen = [];
  let laufend = "";
  for (const wort of worte) {
    const probe = laufend === "" ? wort : `${laufend} ${wort}`;
    if (probe.length > zeichenJeZeile && laufend !== "") {
      zeilen.push(laufend);
      laufend = wort;
    } else laufend = probe;
  }
  if (laufend !== "") zeilen.push(laufend);
  return zeilen;
}

/* ── Der Fachname, der alles trägt ──────────────────────────────────*/

export function heldenZiffern(schluessel) {
  let raus = "";
  for (const s of schluessel) {
    const stelle = HELDEN.findIndex((h) => h.schluessel === s);
    if (stelle < 0) return null;
    raus += String(stelle);
  }
  return raus;
}

export function heldenAusZiffern(ziffern) {
  if (typeof ziffern !== "string" || !/^[0-9]+$/.test(ziffern)) return null;
  const raus = [];
  for (const ziffer of ziffern) {
    const klasse = HELDEN[Number(ziffer)];
    if (!klasse) return null;
    raus.push(klasse.schluessel);
  }
  return raus;
}

export function fachFuer(lobbycode, platz, ziffern) {
  return `${String(lobbycode).replace(/-/g, "")}-${platz}-${ziffern}`;
}

/* Die Umkehrung — und der einzige Weg, auf dem ein Gast erfährt, was
   er gleich spielt. Bei jedem Zweifel `null`: Ein halb verstandener
   Code führte zwei Freunde in zwei verschiedene Kerker, und das merkt
   erst die Rundensumme, eine Runde später. */
export function leseFach(fach) {
  if (typeof fach !== "string") return null;
  let rein = fach;
  if (rein.endsWith(ANHANG_ANGEBOT)) rein = rein.slice(0, -ANHANG_ANGEBOT.length);
  if (rein.endsWith(ANHANG_ANTWORT)) rein = rein.slice(0, -ANHANG_ANTWORT.length);
  const teile = rein.split("-");
  if (teile.length !== 3) return null;
  const gelesen = leseCode(teile[0]);
  if (!gelesen) return null;
  const platz = Number(teile[1]);
  const helden = heldenAusZiffern(teile[2]);
  if (!helden || !Number.isInteger(platz)) return null;
  if (platz < 2 || platz > helden.length || helden.length > MAX_SPIELER) return null;
  return { saat: gelesen.saat, platz, helden, spielerZahl: helden.length, code: gelesen.code };
}

/* ── Die Lobby ──────────────────────────────────────────────────────*/

const KEIN_NETZ = { macheVerbindung, vermittlerVonHand };

/* Die Zwischenablage. Als gereichtes Bündel, weil `navigator` in der
   Prüfung nicht existiert — und weil ein Browser, der sie verweigert,
   hier einen deutschen Satz bekommen soll und keinen Absturz. */
const KEINE_ABLAGE = {
  async kopiere(text) {
    const ablage = globalThis.navigator && globalThis.navigator.clipboard;
    if (!ablage || typeof ablage.writeText !== "function") throw new Error("keine Ablage");
    await ablage.writeText(text);
  },
  async hole() {
    const ablage = globalThis.navigator && globalThis.navigator.clipboard;
    if (!ablage || typeof ablage.readText !== "function") throw new Error("keine Ablage");
    return await ablage.readText();
  }
};

export function macheLobby({
  ctx, beiStart, wuerfleSaat, ablage = KEINE_ABLAGE, netzwerk = KEIN_NETZ,
  fensterBreite = 960, fensterHoehe = 540
} = {}) {
  if (!ctx || typeof ctx.fillRect !== "function") {
    throw new Error("macheLobby: ein Zeichenblatt mit fillRect muss herein");
  }
  if (typeof beiStart !== "function") {
    throw new Error("macheLobby: ohne `beiStart` wüsste niemand, wann es losgeht");
  }
  if (typeof wuerfleSaat !== "function") {
    throw new Error("macheLobby: `wuerfleSaat` muss gereicht werden - der Zufall gehört "
      + "nach runtime/start.js und nicht hierher");
  }

  let breite = Math.max(1, Math.round(fensterBreite));
  let hoehe = Math.max(1, Math.round(fensterHoehe));
  let stufe = 1;

  let seite = SEITE.start;
  let art = "allein";
  let spielerZahl = 1;
  let platzWahl = 1;
  let helden = [HELDEN[0].schluessel];
  let gezeigterHeld = 0;
  let meldung = "";
  let meldungGut = false;
  let codeText = "";
  let lobbycode = "";
  let wartetAuf = 0;
  let verbunden = [];
  let leitungsSatz = "";
  let vermittler = null;
  let laeuft = false;

  const werte = { name: "", saat: String(wuerfleSaat()), code: "" };
  let aktivesFeld = null;
  let zeiger = 0;
  let stellen = [];
  let unterZeiger = null;

  /* ── Das unsichtbare Feld fürs Handy ─────────────────────────────
     Android zeigt seine Tastatur nur einem Element mit echtem Fokus, nie
     einem Zeichenblatt. `index.html` legt dafür ein unsichtbares
     `<input id="eingabefeld">` an, hier für Name/Saat/Code umbelegt.
     Fehlt `document.getElementById` (Prüfung ohne Browser), bleibt
     `feld` `null`, der alte Weg über `beiTaste` läuft unverändert. */
  const dokument = globalThis.document;
  const feld = (dokument && typeof dokument.getElementById === "function")
    ? dokument.getElementById("eingabefeld") : null;

  /* Welche Tastatur zu welchem Feld gehört - die Saat bekommt Ziffern
     statt Buchstaben, alles andere Fließtext. */
  const FELD_ART = { saat: { modus: "numeric", muster: "[0-9]*" } };

  /* Ein Feld wird aktiv: Wert und Tastaturart übernehmen, dann den Fokus
     holen - synchron in derselben Klickkette wie der Tipp (`beiKlick` →
     `tue`), sonst verweigert Android die Tastatur wie beim Vollbild. */
  function feldZeigen(schluessel) {
    if (!feld) return;
    const art = FELD_ART[schluessel] || { modus: "text", muster: "" };
    feld.setAttribute("inputmode", art.modus);
    if (art.muster) feld.setAttribute("pattern", art.muster); else feld.removeAttribute("pattern");
    if (feld.value !== werte[schluessel]) feld.value = werte[schluessel] || "";
    try { feld.focus(); } catch { /* verweigert ein Browser das, bleibt eben zu */ }
  }

  function feldVerbergen() {
    if (feld) { try { feld.blur(); } catch { /* siehe oben */ } }
  }

  /* Jede echte Tastatureingabe landet hier - auch die, die `beiTaste` nie
     als `keydown` sieht (Autokorrektur, Wischtippen); überschreibt am Ende
     ohnehin mit dem wahren Feldwert, auch wenn `beiTaste` mittippt. */
  if (feld) {
    feld.addEventListener("input", () => {
      if (aktivesFeld !== null) werte[aktivesFeld] = feld.value;
    });
  }

  /* Für jede Wertänderung ohne Tastatur (Einfügen, Würfeln); läuft in
     `zeichne()`, spätestens ein Bild später sichtbar. */
  function feldMitziehen() {
    if (feld && aktivesFeld !== null && feld.value !== werte[aktivesFeld]) {
      feld.value = werte[aktivesFeld] || "";
    }
  }

  /* ── Sätze, die sagen, was zu tun ist ───────────────────────────*/

  function sage(text, gut = false) {
    meldung = lesbar(text);
    meldungGut = gut === true;
  }

  /* Aus einem Fund wird ein Satz. Die Bausteine des Netzes werfen
     bereits deutsche Sätze; was trotzdem ohne Text ankommt, bekommt
     hier einen — ein englischer Fehlertext auf dem Bildschirm ist in
     diesem Projekt ein Fehler für sich. */
  function satzAus(fund) {
    const roh = fund && fund.message ? String(fund.message) : "";
    if (roh === "" || /[A-Za-z]{4,}\s(is|not|of|undefined)\b/.test(roh)) {
      return "Die Verbindung kam nicht zustande. Versuche es noch einmal, und prüfe, "
        + "ob ihr beide denselben Code benutzt habt.";
    }
    return roh;
  }

  const ZUSTAND_SATZ = {
    [VERMITTELT]: "Der Code ist gebaut. Schick ihn deinem Mitspieler.",
    [VERBINDET]: "Der Code ist draußen. Jetzt fehlt nur noch seine Antwort.",
    [OFFEN]: "Verbunden.",
    [GESCHEITERT]: "Die Leitung ist nicht zustande gekommen."
  };

  /* ── Zahlen aus Feldern ─────────────────────────────────────────*/

  function saatWert() {
    const roh = werte.saat.trim();
    if (roh === "") return null;
    if (!/^[0-9]+$/.test(roh)) return null;
    const zahl = Number(roh);
    if (!Number.isSafeInteger(zahl) || zahl > SAAT_HOECHSTENS) return null;
    return zahl;
  }

  function spielerName() {
    const roh = werte.name.trim();
    return roh === "" ? `Spieler ${platzWahl}` : roh;
  }

  /* ── Der Aufbau einer Seite ─────────────────────────────────────*/

  function knopfReihe(schluessel, eintraege) {
    return { art: "reihe", schluessel, eintraege };
  }

  function heldenReihen() {
    const zeilen = [];
    for (let i = 0; i < HELDEN.length; i += 3) {
      zeilen.push(knopfReihe(`held${i}`, HELDEN.slice(i, i + 3).map((h, n) => ({
        schluessel: `held:${i + n}`,
        text: h.name,
        an: helden[platzWahl - 1] === h.schluessel
      }))));
    }
    return zeilen;
  }

  function heldenBlatt() {
    const klasse = HELDEN[gezeigterHeld] || HELDEN[0];
    const zeilen = [{
      art: "text",
      text: `${klasse.name}: LP ${klasse.lpMax} . AP ${klasse.apMax} . Flink `
        + `${klasse.flinkheit} . Rüstung ${klasse.ruestung} . Sicht ${klasse.sicht}`,
      farbe: VORLAUF.schrift
    }];
    for (const zeile of umbrich(klasse.zier, Math.floor(SPALTE / schrift.VORSCHUB))) {
      zeilen.push({ art: "text", text: zeile, farbe: VORLAUF.matt });
    }
    return zeilen;
  }

  function seiteStart() {
    return [
      { art: "titel", text: "HATRED" },
      { art: "unter", text: "Ein Kerker, vier Höhen, sechs Punkte je Zug." },
      { art: "leer" },
      { art: "knopf", schluessel: "allein", text: "Allein spielen" },
      { art: "knopf", schluessel: "eroeffnen", text: "Runde eröffnen" },
      { art: "knopf", schluessel: "beitreten", text: "Einer Runde beitreten" },
      { art: "leer" },
      { art: "knopf", schluessel: "vollbild", text: "Vollbild (oder F11)" }
    ];
  }

  function seiteAufstellung() {
    const zeilen = [
      { art: "titel", text: "HATRED" },
      {
        art: "unter",
        text: art === "allein" ? "Allein - du führst eine Figur." : "Runde eröffnen"
      }
    ];
    if (art === "gastgeber") {
      zeilen.push(knopfReihe("anzahl", [2, 3, 4].map((n) => ({
        schluessel: `spieler:${n}`, text: `${n} Spieler`, an: spielerZahl === n
      }))));
      zeilen.push(knopfReihe("plaetze", helden.map((s, i) => ({
        schluessel: `platz:${i + 1}`, text: `Platz ${i + 1}`, an: platzWahl === i + 1
      }))));
    }
    zeilen.push(...heldenReihen(), ...heldenBlatt());
    /* Ab hier die zweite Spalte fürs Querformat (`spalte: 1`, siehe
       `legeZweiSpaltig`) - im Hochformat ohne Wirkung, gleiche Reihenfolge. */
    zeilen.push({ art: "leer", spalte: 1 });
    zeilen.push({ art: "feld", schluessel: "name", marke: "Dein Name", spalte: 1 });
    zeilen.push({ art: "feld", schluessel: "saat", marke: "Saat (Zahl)", spalte: 1 });
    zeilen.push({
      ...knopfReihe("saatreihe", [{ schluessel: "wuerfeln", text: "Neue Saat würfeln" }]),
      spalte: 1
    });
    zeilen.push({ art: "leer", spalte: 1 });
    zeilen.push({
      art: "knopf", spalte: 1, schluessel: "los",
      text: art === "allein" ? "Losgehen" : "Runde eröffnen und Code zeigen"
    });
    zeilen.push({ art: "knopf", schluessel: "zurueck", text: "Zurück", spalte: 1 });
    return zeilen;
  }

  function seiteBeitreten() {
    return [
      { art: "titel", text: "HATRED" },
      { art: "unter", text: "Einer Runde beitreten" },
      { art: "text", text: "Dein Gastgeber schickt dir einen langen Code.", farbe: VORLAUF.matt },
      { art: "text", text: "Füg ihn hier ein - Strg+V geht auch.", farbe: VORLAUF.matt },
      { art: "leer" },
      { art: "feld", schluessel: "name", marke: "Dein Name" },
      { art: "feld", schluessel: "code", marke: "Einladungscode" },
      { art: "knopf", schluessel: "einfuegen", text: "Aus der Zwischenablage einfügen" },
      { art: "leer" },
      { art: "knopf", schluessel: "verbindenLos", text: "Verbinden" },
      { art: "knopf", schluessel: "zurueck", text: "Zurück" }
    ];
  }

  function leitungsZeilen() {
    const zeilen = [];
    for (let p = 1; p <= spielerZahl; p++) {
      const klasse = HELDEN.find((h) => h.schluessel === helden[p - 1]);
      const wer = p === 1 ? "du (Gastgeber)"
        : verbunden.includes(p) ? "verbunden"
          : p === wartetAuf ? "wartet auf deinen Code" : "noch nicht dran";
      zeilen.push({
        art: "text",
        text: `Platz ${p}: ${klasse ? klasse.name : "?"} - ${wer}`,
        farbe: verbunden.includes(p) || p === 1 ? VORLAUF.gut : VORLAUF.matt
      });
    }
    return zeilen;
  }

  function codeZeilen() {
    if (codeText === "") {
      return [{ art: "text", text: "Der Code wird gebaut ...", farbe: VORLAUF.matt }];
    }
    const kurz = `${codeText.slice(0, 28)}... (${codeText.length} Zeichen)`;
    return [{ art: "text", text: kurz, farbe: VORLAUF.akzent }];
  }

  function seiteWarten() {
    return [
      { art: "titel", text: "HATRED" },
      { art: "unter", text: `Runde ${lobbycode}` },
      ...leitungsZeilen(),
      { art: "leer" },
      { art: "text", text: `Dein Code für Platz ${wartetAuf}:`, farbe: VORLAUF.schrift },
      ...codeZeilen(),
      { art: "knopf", schluessel: "kopieren", text: "Code kopieren" },
      { art: "leer" },
      { art: "text", text: "Er schickt dir einen Antwortcode zurück.", farbe: VORLAUF.matt },
      { art: "feld", schluessel: "code", marke: "Antwortcode" },
      { art: "knopf", schluessel: "einfuegen", text: "Aus der Zwischenablage einfügen" },
      { art: "knopf", schluessel: "annehmen", text: "Antwortcode annehmen" }
    ];
  }

  function seiteVerbinden() {
    const zeilen = [
      { art: "titel", text: "HATRED" },
      { art: "unter", text: "Fast geschafft" }
    ];
    if (codeText === "") {
      zeilen.push({ art: "text", text: "Dein Antwortcode entsteht ...", farbe: VORLAUF.matt });
    } else {
      zeilen.push({ art: "text", text: "Schick diesen Antwortcode zurück:",
        farbe: VORLAUF.schrift });
      zeilen.push(...codeZeilen());
      zeilen.push({ art: "knopf", schluessel: "kopieren", text: "Antwortcode kopieren" });
    }
    zeilen.push({ art: "leer" });
    zeilen.push({ art: "text", text: "Sobald er ihn eingefügt hat, geht es los.",
      farbe: VORLAUF.matt });
    return zeilen;
  }

  function zeilenVon() {
    if (seite === SEITE.aufstellung) return seiteAufstellung();
    if (seite === SEITE.beitreten) return seiteBeitreten();
    if (seite === SEITE.warten) return seiteWarten();
    if (seite === SEITE.verbinden) return seiteVerbinden();
    return seiteStart();
  }

  /* ── Aus Zeilen werden Stellen auf dem Blatt ────────────────────*/

  /* Summe der Zeilenhöhen - Grundlage für ein- wie zweispaltig. */
  function summeHoehe(zeilen) {
    let summe = 0;
    for (const zeile of zeilen) summe += HOCH[zeile.art] || HOCH.text;
    return summe;
  }

  /* Mit Rand am Ende, damit die letzte Zeile nicht am Bildrand klebt. */
  function gesamtHoehe(zeilen) {
    return summeHoehe(zeilen) + 2 * HOCH.text;
  }

  /* Die Vergrößerung: so groß, wie beides zulässt - Breite und Höhe.
     Ganzzahlig und mindestens 1, sonst läge jede Kante auf einem
     halben Bildpunkt (Fehlerbuch D1). */
  function stufeFuer(zeilen) {
    const nachBreite = Math.floor(breite / MINDEST_BREITE);
    const nachHoehe = Math.floor(hoehe / gesamtHoehe(zeilen));
    /* Höchstens doppelt: Auf großen Schirmen bleiben ruhige Zeilen
       mit Luft ringsum, statt die vorhandenen Knöpfe vierfach aufzublasen. */
    return Math.max(1, Math.min(2, nachBreite, nachHoehe));
  }

  /* Trägt eine Spalte ein (einzeln oder eine von zweien), gibt die Höhe
     zurück, die sie erreicht hat. */
  function legeSpalte(zeilen, x0, y0, breite0) {
    let y = y0;
    for (const zeile of zeilen) {
      const hoch = (HOCH[zeile.art] || HOCH.text) * stufe;
      zeile.x = x0;
      zeile.y = y;
      zeile.breite = breite0;
      zeile.hoehe = hoch;
      if (zeile.art === "knopf" || zeile.art === "feld") {
        stellen.push({ schluessel: zeile.schluessel, x: x0, y, breite: breite0, hoehe: hoch });
      }
      if (zeile.art === "reihe") {
        const anzahl = zeile.eintraege.length;
        const luecke = 2 * stufe;
        const teil = Math.floor((breite0 - luecke * (anzahl - 1)) / anzahl);
        zeile.teile = [];
        for (let i = 0; i < anzahl; i++) {
          const x = x0 + i * (teil + luecke);
          zeile.teile.push({ ...zeile.eintraege[i], x, y, breite: teil, hoehe: hoch });
          stellen.push({
            schluessel: zeile.eintraege[i].schluessel, x, y, breite: teil, hoehe: hoch
          });
        }
      }
      y += hoch;
    }
    return y;
  }

  function legeEinspaltig(zeilen) {
    stufe = stufeFuer(zeilen);
    const spaltenBreite = SPALTE * stufe;
    const x0 = Math.round((breite - spaltenBreite) / 2);
    const y0 = Math.max(0, Math.round((hoehe - gesamtHoehe(zeilen) * stufe) / 2));
    legeSpalte(zeilen, x0, y0, spaltenBreite);
  }

  /* Kopf plus die **höhere** der beiden Spalten - sie stehen nebeneinander. */
  function hoeheZweiSpaltig(oben, links, rechts) {
    return summeHoehe(oben) + Math.max(summeHoehe(links), summeHoehe(rechts)) + 2 * HOCH.text;
  }

  /* Kopf (Titel, Unterzeile) über die volle Breite, mittig - darunter
     links die Heldenwahl, rechts alles mit `spalte: 1`, beide ab
     derselben Höhe. */
  function legeZweiSpaltig(zeilen) {
    const oben = zeilen.filter((z) => z.art === "titel" || z.art === "unter");
    const links = zeilen.filter((z) => z.art !== "titel" && z.art !== "unter" && z.spalte !== 1);
    const rechts = zeilen.filter((z) => z.spalte === 1);
    const nachBreite = Math.floor(breite / ZWEI_SPALTEN_BREITE);
    const nachHoehe = Math.floor(hoehe / hoeheZweiSpaltig(oben, links, rechts));
    stufe = Math.max(1, Math.min(2, nachBreite, nachHoehe));

    const spaltenBreite = SPALTE * stufe;
    const luecke = SPALTEN_LUECKE * stufe;
    const blockBreite = 2 * spaltenBreite + luecke;
    const blockLinks = Math.round((breite - blockBreite) / 2);
    const y0 = Math.max(0, Math.round((hoehe - hoeheZweiSpaltig(oben, links, rechts) * stufe) / 2));

    const yNachOben = legeSpalte(oben, blockLinks, y0, blockBreite);
    legeSpalte(links, blockLinks, yNachOben, spaltenBreite);
    legeSpalte(rechts, blockLinks + spaltenBreite + luecke, yNachOben, spaltenBreite);
  }

  /* Zweispaltig nur, wenn die Seite es kennt, einspaltig nicht passt UND
     die Breite für zwei Spalten reicht - sonst lieber die gewohnte, immer
     lesbare Reihenfolge als eine selbst nicht passende zweite Spalte. */
  function zweiSpaltenBesser(zeilen) {
    if (!zeilen.some((z) => z.spalte === 1)) return false;
    if (gesamtHoehe(zeilen) * stufeFuer(zeilen) <= hoehe) return false;
    return breite >= ZWEI_SPALTEN_BREITE;
  }

  function lege(zeilen) {
    stellen = [];
    if (zweiSpaltenBesser(zeilen)) legeZweiSpaltig(zeilen); else legeEinspaltig(zeilen);
    if (zeiger >= stellen.length) zeiger = Math.max(0, stellen.length - 1);
    return zeilen;
  }

  /* ── Malen ──────────────────────────────────────────────────────*/

  function zeichne() {
    feldMitziehen();
    const zeilen = lege(zeilenVon());
    return zeichneVorlauf(ctx, {
      breite, hoehe, stufe, zeilen, stellen, zeiger, unterZeiger,
      aktivesFeld, werte, leitungsSatz, meldung, meldungGut, textHoehe: HOCH.text
    }, lesbar, umbrich);
  }

  /* ── Was ein Klick bedeutet ─────────────────────────────────────*/

  function stelleBei(px, py) {
    lege(zeilenVon());
    for (const stelle of stellen) {
      if (px < stelle.x || px >= stelle.x + stelle.breite) continue;
      if (py < stelle.y || py >= stelle.y + stelle.hoehe) continue;
      return stelle;
    }
    return null;
  }

  function beiZeiger(px, py) {
    const stelle = stelleBei(px, py);
    unterZeiger = stelle ? stelle.schluessel : null;
    return unterZeiger;
  }

  function beiKlick(px, py) {
    const stelle = stelleBei(px, py);
    if (!stelle) return null;
    zeiger = stellen.indexOf(stelle);
    return tue(stelle.schluessel);
  }

  function setzeSpielerZahl(n) {
    spielerZahl = n;
    while (helden.length < n) helden.push(HELDEN[helden.length % HELDEN.length].schluessel);
    helden = helden.slice(0, n);
    if (platzWahl > n) platzWahl = n;
  }

  function tue(schluessel) {
    if (schluessel === undefined || schluessel === null) return null;
    if (schluessel.startsWith("held:")) {
      gezeigterHeld = Number(schluessel.slice(5));
      helden[platzWahl - 1] = HELDEN[gezeigterHeld].schluessel;
      return schluessel;
    }
    if (schluessel.startsWith("platz:")) {
      platzWahl = Number(schluessel.slice(6));
      gezeigterHeld = Math.max(0,
        HELDEN.findIndex((h) => h.schluessel === helden[platzWahl - 1]));
      return schluessel;
    }
    if (schluessel.startsWith("spieler:")) {
      setzeSpielerZahl(Number(schluessel.slice(8)));
      return schluessel;
    }
    if (werte[schluessel] !== undefined) {
      aktivesFeld = schluessel; feldZeigen(schluessel); return schluessel;
    }

    aktivesFeld = null; feldVerbergen();
    switch (schluessel) {
      case "allein": art = "allein"; setzeSpielerZahl(1); seite = SEITE.aufstellung; break;
      case "eroeffnen": art = "gastgeber"; setzeSpielerZahl(2); seite = SEITE.aufstellung; break;
      case "beitreten": art = "gast"; seite = SEITE.beitreten; sage(""); break;
      case "vollbild": return "vollbild";
      case "zurueck": seite = SEITE.start; sage(""); break;
      case "wuerfeln": werte.saat = String(wuerfleSaat()); sage(""); break;
      case "los": losgehen(); break;
      case "verbindenLos": tritteBei(werte.code); break;
      case "annehmen": nimmAntwort(werte.code); break;
      case "kopieren": kopiere(); break;
      case "einfuegen": holeAusAblage(); break;
      default: break;
    }
    return schluessel;
  }

  /* ── Tastatur ───────────────────────────────────────────────────

     Ohne sie wäre der Vorlauf nur mit der Maus zu bedienen - und das
     Spiel dahinter ist ausdrücklich auch ohne Maus spielbar. */
  function beiTaste(taste) {
    if (taste === "Tab" || taste === "ArrowDown") { schiebeZeiger(1); return null; }
    if (taste === "ArrowUp") { schiebeZeiger(-1); return null; }
    if (taste === "Enter") {
      const stelle = stellen[zeiger];
      return stelle ? tue(stelle.schluessel) : null;
    }
    if (taste === "Escape") { aktivesFeld = null; feldVerbergen(); sage(""); return null; }
    if (aktivesFeld === null) return null;
    if (taste === "Backspace") {
      werte[aktivesFeld] = werte[aktivesFeld].slice(0, -1);
      return null;
    }
    if ([...String(taste)].length === 1) werte[aktivesFeld] += taste;
    return null;
  }

  function schiebeZeiger(richtung) {
    lege(zeilenVon());
    if (stellen.length === 0) return;
    zeiger = (zeiger + richtung + stellen.length) % stellen.length;
    const schluessel = stellen[zeiger].schluessel;
    aktivesFeld = werte[schluessel] !== undefined ? schluessel : null;
    if (aktivesFeld !== null) feldZeigen(aktivesFeld); else feldVerbergen();
  }

  /* Ein Einfügen aus der Zwischenablage. Es geht in das Feld, das
     gerade dran ist - und wenn keines dran ist, in das Codefeld: Wer
     Strg+V drückt, meint fast immer den Code. */
  function beiEinfuegen(inhalt) {
    const hatCode = zeilenVon().some((z) => z.art === "feld" && z.schluessel === "code");
    const ziel = aktivesFeld || (hatCode ? "code" : null);
    if (!ziel) return null;
    werte[ziel] = String(inhalt).replace(/\s+/g, "");
    sage("Eingefügt. Jetzt auf Verbinden oder Annehmen.", true);
    return ziel;
  }

  function kopiere() {
    if (codeText === "") { sage("Es gibt noch keinen Code zum Kopieren."); return; }
    ablage.kopiere(codeText)
      .then(() => sage("Code kopiert. Schick ihn deinem Mitspieler.", true))
      .catch(() => sage("Dieser Browser lässt das Kopieren nicht zu. Das passiert, wenn "
        + "die Seite als Datei geöffnet wurde - starte sie über node werkzeuge/vorschau.mjs "
        + "und öffne http://127.0.0.1:8145/."));
  }

  function holeAusAblage() {
    ablage.hole()
      .then((inhalt) => beiEinfuegen(inhalt))
      .catch(() => sage("Dieser Browser gibt die Zwischenablage nicht frei. Drücke Strg+V, "
        + "während das Fenster im Vordergrund ist."));
  }

  /* ── Losgehen ───────────────────────────────────────────────────*/

  function losgehen() {
    const saat = saatWert();
    if (saat === null) {
      sage(`Die Saat muss eine ganze Zahl von 0 bis ${SAAT_HOECHSTENS} sein. Lass das Feld `
        + "leer und drücke auf Neue Saat würfeln, wenn dir egal ist, welcher Kerker kommt.");
      return;
    }
    if (art === "allein") {
      laeuft = true;
      beiStart({
        istGastgeber: true, platz: 1, saat, helden: helden.slice(), spielerZahl,
        name: spielerName(), verbindungen: []
      });
      return;
    }
    eroeffneRunde(saat);
  }

  /* ── Gastgeber ──────────────────────────────────────────────────*/

  /* Die offenen Leitungen, nach Platz. Sie liegen hier und nicht in
     `verbunden`, weil `verbunden` nur für die Anzeige da ist - eine
     Liste, die zugleich Anzeige und Betriebsmittel wäre, verliert
     beim ersten Umbau das eine oder das andere. */
  const leitungen = new Map();

  function eroeffneRunde(saat) {
    lobbycode = macheCode(saat);
    vermittler = netzwerk.vermittlerVonHand();
    vermittler.beiText((code, fach) => {
      if (fach.endsWith(ANHANG_ANGEBOT)) codeText = code;
    });
    verbunden = [];
    werte.code = "";
    codeText = "";
    seite = SEITE.warten;
    sage("");
    naechsterGast(saat, 2);
  }

  function naechsterGast(saat, platz) {
    if (platz > spielerZahl) {
      laeuft = true;
      beiStart({
        istGastgeber: true, platz: 1, saat, helden: helden.slice(), spielerZahl,
        name: spielerName(), verbindungen: verbunden.map((p) => leitungen.get(p))
      });
      return;
    }
    wartetAuf = platz;
    codeText = "";
    werte.code = "";
    const fach = fachFuer(lobbycode, platz, heldenZiffern(helden));
    const leitung = netzwerk.macheVerbindung({ istGastgeber: true, vermittler, fach });
    leitung.beiZustand((zustand, grund) => {
      leitungsSatz = lesbar(ZUSTAND_SATZ[zustand] || grund || "");
    });
    leitung.oeffne().then(() => {
      leitungen.set(platz, { platz, verbindung: leitung });
      verbunden.push(platz);
      sage(`Platz ${platz} ist da.`, true);
      naechsterGast(saat, platz + 1);
    }).catch((fund) => sage(satzAus(fund)));
  }

  function nimmAntwort(text) {
    if (!vermittler) { sage("Es läuft gerade keine Runde, die eine Antwort erwartet."); return; }
    const roh = String(text).replace(/\s+/g, "");
    if (roh === "") {
      sage("Füg erst den Antwortcode ein, den dein Mitspieler dir schickt.");
      return;
    }
    const gelesen = leseAngabe(roh);
    if (!gelesen.ok) { sage(gelesen.grund); return; }
    if (gelesen.angabe.art !== ANTWORT) {
      sage("Das ist dein eigener Einladungscode, nicht seine Antwort. Er bekommt von dir "
        + "einen Code und schickt dir einen anderen zurück.");
      return;
    }
    const erwartet = fachFuer(lobbycode, wartetAuf, heldenZiffern(helden)) + ANHANG_ANTWORT;
    if (gelesen.angabe.fach !== erwartet) {
      sage(`Dieser Antwortcode gehört zu einer anderen Runde oder zu einem anderen Platz. `
        + `Erwartet wird gerade die Antwort für Platz ${wartetAuf}.`);
      return;
    }
    vermittler.fuegeEin(roh);
    sage("Antwort angenommen. Die Leitung wird aufgebaut.", true);
  }

  /* ── Gast ───────────────────────────────────────────────────────*/

  function tritteBei(text) {
    const roh = String(text).replace(/\s+/g, "");
    if (roh === "") {
      sage("Füg erst den Einladungscode ein, den dein Gastgeber dir geschickt hat.");
      return;
    }
    const gelesen = leseAngabe(roh);
    if (!gelesen.ok) { sage(gelesen.grund); return; }
    if (gelesen.angabe.art !== ANGEBOT) {
      sage("Das ist ein Antwortcode. Du brauchst den ersten Code des Gastgebers.");
      return;
    }
    const zerlegt = leseFach(gelesen.angabe.fach);
    if (!zerlegt) {
      sage("Dieser Code gehört zu keiner Runde dieses Spiels. Lass ihn dir noch einmal "
        + "schicken - vom ersten bis zum letzten Zeichen.");
      return;
    }
    verbindeAls(zerlegt, roh);
  }

  function verbindeAls(zerlegt, roh) {
    spielerZahl = zerlegt.spielerZahl;
    helden = zerlegt.helden;
    platzWahl = zerlegt.platz;
    lobbycode = zerlegt.code;
    codeText = "";
    seite = SEITE.verbinden;
    sage("");

    vermittler = netzwerk.vermittlerVonHand();
    vermittler.beiText((code, fach) => {
      if (fach.endsWith(ANHANG_ANTWORT)) codeText = code;
    });
    vermittler.fuegeEin(roh);

    const fach = fachFuer(zerlegt.code, zerlegt.platz, heldenZiffern(zerlegt.helden));
    const leitung = netzwerk.macheVerbindung({ istGastgeber: false, vermittler, fach });
    leitung.beiZustand((zustand, grund) => {
      leitungsSatz = lesbar(ZUSTAND_SATZ[zustand] || grund || "");
    });
    leitung.oeffne().then(() => {
      laeuft = true;
      beiStart({
        istGastgeber: false, platz: zerlegt.platz, saat: zerlegt.saat,
        helden: zerlegt.helden.slice(), spielerZahl: zerlegt.spielerZahl,
        name: spielerName(), verbindungen: [{ platz: 1, verbindung: leitung }]
      });
    }).catch((fund) => sage(satzAus(fund)));
  }

  /* ── Nach außen ─────────────────────────────────────────────────*/

  function setzeFenster(neueBreite, neueHoehe) {
    breite = Math.max(1, Math.round(neueBreite));
    hoehe = Math.max(1, Math.round(neueHoehe));
    return stufe;
  }

  function stand() {
    return {
      seite, art, saat: saatWert(), spielerZahl, platz: platzWahl,
      helden: helden.slice(), name: spielerName(), meldung, code: codeText,
      lobbycode, wartetAuf, verbunden: verbunden.slice(), stufe, laeuft
    };
  }

  return {
    zeichne, setzeFenster, beiZeiger, beiKlick, beiTaste, beiEinfuegen, stand,
    /* Nur für die Prüfung und für `runtime/start.js`: die Stellen, die
       gerade anklickbar sind. Ohne sie ließe sich die Bedienung nur
       über Bildpunkte prüfen, die niemand ausrechnen kann. */
    stellenJetzt: () => stellen.map((s) => ({ ...s }))
  };
}
