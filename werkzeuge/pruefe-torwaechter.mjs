/* [Aufgabe: Prüfwesen] Der Torwächter: das Wort, sein Fingerabdruck und
   die Frage, ob das Wort selbst irgendwo im Repository gelandet ist.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   An diesem Riegel gehen vier Dinge schief, und drei davon **lautlos**:

   · **Das Wort steht plötzlich im Repository.** Jemand erklärt in einem
     Kommentar, im Changelog oder in einer Prüfung, wie das Tor
     funktioniert — und schreibt das Wort dabei hin. Der Riegel ist
     damit weg, und nichts wird rot. Das ist die wichtigste Behauptung
     dieser Datei.
   · **Die Runden verschwinden.** Wer die Schleife „vereinfacht",
     bekommt denselben Aufbau mit einem einzelnen Hash — und aus
     Stunden werden Sekunden. Man sieht es dem Fingerabdruck nicht an.
   · **Der Vergleich bricht früh ab.** Ein `return` in der
     Vergleichsschleife nimmt die konstante Zeit heraus. Ergebnis
     gleich, Eigenschaft weg.
   · **Der Speicher wirft.** Im privaten Fenster wirft schon der
     Zugriff auf `localStorage`. Ohne Fangarm bleibt die Seite schwarz
     — und zwar genau bei dem Mitspieler, der privat surft.

   ── Wie hier ohne das Wort geprüft wird ────────────────────────────

   Das echte Wort darf in **keiner** Datei stehen, auch nicht in dieser.
   Also wird das ganze Werk an einem **Probewort** geprüft:
   `macheTor({ fingerabdruck })` nimmt den Fingerabdruck entgegen, und
   die Prüfung reicht ihm den des Probeworts. Verraten ist damit nichts
   — wer den Quelltext hat, kann ohnehin jede Zeile davon umschreiben.
   Vom **ausgelieferten** Fingerabdruck wird nur behauptet, was sich
   ohne das Wort behaupten lässt: seine Form, und dass er zu keinem der
   naheliegenden Rateversuche und zu keinem Wort aus den Tor-Dateien
   gehört.

   ── Was hier bewusst nicht geprüft wird ────────────────────────────

   · **Dass das echte Wort das Tor öffnet.** Dafür müsste es hier
     stehen, und dann wäre es keins mehr. Geprüft wird stattdessen, dass
     Werkzeug und Torwächter für **dasselbe** Wort auf **denselben**
     Fingerabdruck kommen — wer mit `node werkzeuge/zugangswort.mjs`
     eine Zeile erzeugt, bekommt also ein Tor, das sich mit genau dem
     Wort öffnet, das er eingetippt hat.
   · **Der ganze Baum.** Der Wörterbuchangriff unten läuft über die
     Dateien, in denen vom Tor die Rede ist. Über **alle** elftausend
     Wörter des Baums geht `node werkzeuge/zugangswort.mjs --suche` —
     das dauert Minuten und gehört deshalb nicht in die Kette. Dass es
     Minuten dauert, ist kein Mangel, sondern der Beweis, dass die
     200.000 Runden wirken. Den anderen Weg deckt das Werkzeug selbst
     ab: Beim **Wechseln** des Wortes liegt es im Klartext vor, und
     dann wird wörtlich gesucht statt gerechnet — in Millisekunden.
     Geprüft wird hier, dass es das wirklich tut.
   · **Ob der Riegel etwas taugt.** Er taugt wenig, und das steht so in
     der Kopfnotiz von `runtime/torwaechter.js`. Eine Prüfung kann nur
     nachsehen, ob er das tut, was er zu tun vorgibt.

   ── Arbeitet zusammen mit ──────────────────────────────────────────

   `runtime/torwaechter.js` (das Geprüfte), `werkzeuge/zugangswort.mjs`
   (als eigener Prozess gestartet, nie eingelesen — es beendet sich
   selbst), `runtime/start.js` (die Verdrahtung vor dem Vorlauf),
   `werkzeuge/buehne-browser.mjs` (das nachgestellte Handy samt
   mitschreibendem Blatt), `werkzeuge/helfer.mjs` (Behauptungen und
   Abschluss) und `werkzeuge/pruefe-alles.mjs`, das diese Datei als
   eigenen Prozess startet. */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { abschnitt, behaupte, gleich, wirft, ende, WURZEL } from "./helfer.mjs";
import { ereignis, macheWelt } from "./buehne-browser.mjs";
import { ganzzahlig, macheErsatzflaeche } from "./buehne-oberflaeche.mjs";
import {
  FINGERABDRUCK, RUNDEN, SALZ, SPEICHER_SCHLUESSEL, fingerabdruckMitRunden, fingerabdruckVon,
  gleicherFingerabdruck, macheTor, merkeTor, normalisiere, torErinnert, vergissTor, wortStimmt
} from "../runtime/torwaechter.js";
import { starte } from "../runtime/start.js";

/* Was dieser Lauf gemessen hat - am Schluss gedruckt, damit jede Zahl
   ihren Befehl hat: `node werkzeuge/pruefe-torwaechter.mjs`. */
const messungen = [];

/* Das Probewort. Es ist nicht das echte, und es darf ruhig jeder lesen.
   **Zusammengesetzt und nicht ausgeschrieben**, und zwar aus einem
   Grund: `werkzeuge/zugangswort.mjs` lehnt ab dem 07.09.2026 jedes Wort
   ab, das schon irgendwo im Baum steht — zu Recht. Ausgeschrieben stünde
   das Probewort in dieser Datei und wäre damit selbst so ein Wort; die
   Prüfung könnte das Werkzeug dann gar nicht mehr befragen. So steht es
   nirgends, und beide Regeln gelten weiter. */
const PROBEWORT = "stein" + "krug";
const PROBEABDRUCK = fingerabdruckVon(PROBEWORT);

/* Ein einfacher Speicher, wie ihn der Browser stellt. */
function macheSpeicher() {
  const inhalt = new Map();
  return {
    getItem: (name) => (inhalt.has(name) ? inhalt.get(name) : null),
    setItem: (name, wert) => { inhalt.set(name, String(wert)); },
    removeItem: (name) => { inhalt.delete(name); },
    inhalt
  };
}

/* Ein Speicher, bei dem **schon der Zugriff** wirft - der Fall aus dem
   privaten Fenster. Nicht `getItem` wirft, sondern die Eigenschaft
   selbst; wer nur `getItem` umbaut, prüft den falschen Fall. */
function mitWerfendemSpeicher(tuWas) {
  const alt = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let zugriffe = 0;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { zugriffe++; throw new Error("Zugriff auf Website-Daten verweigert"); }
  });
  try {
    return { wert: tuWas(), zugriffe: () => zugriffe };
  } finally {
    delete globalThis.localStorage;
    if (alt) Object.defineProperty(globalThis, "localStorage", alt);
  }
}

/* Eine Messung, die nicht am ersten Aufruf hängt: Erst warmlaufen
   lassen, dann mehrfach messen und mitteln. */
function misst(tuWas, wiederholungen) {
  tuWas();
  const beginn = process.hrtime.bigint();
  for (let i = 0; i < wiederholungen; i++) tuWas();
  return Number(process.hrtime.bigint() - beginn) / 1e6 / wiederholungen;
}

/* ══════════════════════════════════════════════════════════════════
   1 · Der Fingerabdruck
   ══════════════════════════════════════════════════════════════════

   Am Wiedererkennen hängt das Merken: Käme für dasselbe Wort zweimal
   etwas anderes heraus, müsste Jannik es bei jedem Start neu tippen -
   und niemand käme darauf, dass es am Hash liegt. */
{
  abschnitt("Der Fingerabdruck");

  gleich(fingerabdruckVon(PROBEWORT), PROBEABDRUCK,
    "dasselbe Wort ergibt zweimal denselben Fingerabdruck");
  gleich(fingerabdruckVon(`  ${PROBEWORT.toUpperCase()}  `), PROBEABDRUCK,
    "Großbuchstaben und Leerzeichen außen ändern nichts");
  gleich(fingerabdruckVon("Stein" + "Krug"), PROBEABDRUCK,
    "und gemischte Schreibung auch nicht");
  behaupte(fingerabdruckVon(PROBEWORT + "e") !== PROBEABDRUCK,
    "ein Buchstabe mehr ergibt einen anderen Fingerabdruck");
  behaupte(fingerabdruckVon("stein" + " " + "krug") !== PROBEABDRUCK,
    "ein Leerzeichen **innen** ist ein anderes Wort");

  behaupte(/^[0-9a-f]{16}$/.test(PROBEABDRUCK),
    `ein Fingerabdruck sind 16 Hexstellen (64 Bit): ${PROBEABDRUCK}`);
  behaupte(/^[0-9a-f]{16}$/.test(FINGERABDRUCK),
    `auch der ausgelieferte: ${FINGERABDRUCK}`);

  gleich(normalisiere(undefined), "", "nichts wird zu einem leeren Wort, nicht zu „undefined“");
  gleich(normalisiere(null), "", "und `null` ebenso");

  /* Das Salz lässt sich **von außen nicht** nachweisen: Ein fester,
     öffentlicher Vorsatz macht aus der einen Hashfunktion nur eine
     andere, und wer sie ausschließlich über `fingerabdruckVon` befragt,
     sieht keinen Unterschied - egal, was er einsetzt. Also wird auch
     hier die Form gelesen, wie beim Vergleich weiter unten. Was das
     Salz leistet, ist ohnehin nur eins: Eine fertige Tabelle
     vorgerechneter FNV-Werte aus dem Netz passt auf dieses Tor nicht. */
  behaupte(/SALZ\s*\+\s*normalisiere\(wort\)/.test(String(fingerabdruckMitRunden)),
    "das Salz steht vor dem Wort und geht mit ins Gehashte");
  behaupte(SALZ.length >= 6, `das Salz ist ${SALZ.length} Zeichen lang, nötig sind 6`);
}

/* ══════════════════════════════════════════════════════════════════
   2 · Die Runden sind wirklich da
   ══════════════════════════════════════════════════════════════════

   Zwei Wege, und beide werden gebraucht. Der **Vergleich** bindet die
   veröffentlichte Zahl an das, was `fingerabdruckVon` wirklich rechnet
   - das ist der harte, jederzeit wiederholbare Teil. Die **Zeit**
   beweist zusätzlich, dass die Runden nicht wegoptimiert wurden;
   gemessen wird sie als **Verhältnis** zweier Rundenzahlen im selben
   Lauf, nicht als absolute Zahl. Eine absolute Untergrenze in
   Millisekunden hinge am Rechner, an der Tageslaune des Übersetzers und
   daran, wer sonst noch rechnet - sie wäre auf einem schnellen Rechner
   von morgen rot, ohne dass etwas kaputt wäre. */
{
  abschnitt("Die Runden");

  gleich(RUNDEN, 200000, "es sind 200.000 Runden");
  gleich(fingerabdruckVon(PROBEWORT), fingerabdruckMitRunden(PROBEWORT, RUNDEN),
    "die veröffentlichte Rundenzahl ist die, die wirklich gerechnet wird");
  behaupte(fingerabdruckMitRunden(PROBEWORT, 1) !== PROBEABDRUCK,
    "eine einzige Runde ergibt etwas anderes - die Runden wirken");
  behaupte(fingerabdruckMitRunden(PROBEWORT, RUNDEN - 1) !== PROBEABDRUCK,
    "und eine Runde weniger schon");

  const wenig = misst(() => fingerabdruckMitRunden(PROBEWORT, 2000), 20);
  const viel = misst(() => fingerabdruckVon(PROBEWORT), 5);
  const verhaeltnis = viel / wenig;
  /* Erwartet wird das Hundertfache (200.000 zu 2.000). Verlangt wird
     das Dreißigfache: Der Abstand lässt Messrauschen zu und schlägt
     trotzdem an, sobald jemand die Schleife herausnimmt - dann wäre
     das Verhältnis 1. */
  behaupte(verhaeltnis >= 30,
    `200.000 Runden dauern ${verhaeltnis.toFixed(0)}-mal so lange wie 2.000 `
    + `(${viel.toFixed(1)} ms gegen ${wenig.toFixed(2)} ms), verlangt sind 30`);
  messungen.push(`ein Versuch: ${viel.toFixed(1)} ms bei ${RUNDEN} Runden `
    + `(2.000 Runden: ${wenig.toFixed(2)} ms, Verhältnis ${verhaeltnis.toFixed(0)})`);
  messungen.push(`ein Wörterbuch mit 500.000 Wörtern dauert damit `
    + `${((viel * 500000) / 3600000).toFixed(1)} Stunden`);
}

/* ══════════════════════════════════════════════════════════════════
   3 · Der Vergleich läuft in konstanter Zeit
   ══════════════════════════════════════════════════════════════════

   Geprüft wird die **Form** der Funktion, nicht die Uhr. Eine
   Zeitmessung wäre hier nicht verlässlich zu wiederholen: Der
   Unterschied zwischen „bricht ab" und „läuft durch" liegt bei sechzehn
   Zeichen im Bereich von Nanosekunden und verschwindet im Rauschen des
   Übersetzers. Die Form dagegen ist eindeutig - in dieser Schleife darf
   weder `break` noch `return` stehen. */
{
  abschnitt("Vergleich in konstanter Zeit");

  const quelle = String(gleicherFingerabdruck);
  const koerper = quelle.slice(quelle.indexOf("{"));
  behaupte(!/\bbreak\b/.test(koerper), "kein `break` im Vergleich");
  gleich((koerper.match(/\breturn\b/g) || []).length, 1,
    "genau ein `return`, und das steht hinter der Schleife");
  behaupte(/for\s*\([^)]*i\s*<\s*weite/.test(koerper),
    "die Schleife läuft über die ganze Länge (`weite`)");
  behaupte(/Math\.max\(/.test(koerper),
    "und `weite` ist die größere der beiden Längen, nicht die kürzere");

  /* Und dazu das Verhalten - die Form allein sagt nicht, dass richtig
     verglichen wird. */
  behaupte(gleicherFingerabdruck("abc", "abc"), "Gleiches ist gleich");
  behaupte(!gleicherFingerabdruck("abc", "abd"), "der letzte Buchstabe zählt");
  behaupte(!gleicherFingerabdruck("abc", "zbc"), "der erste auch");
  behaupte(!gleicherFingerabdruck("abc", "abcd"), "eine andere Länge ist ein Unterschied");
  behaupte(!gleicherFingerabdruck("abcd", "abc"), "in beide Richtungen");
  behaupte(gleicherFingerabdruck("", ""), "zwei leere Ketten sind gleich");
}

/* ══════════════════════════════════════════════════════════════════
   4 · Das Wort steht in keiner Datei
   ══════════════════════════════════════════════════════════════════

   Die wichtigste Behauptung dieser Datei, und sie kommt ohne das Wort
   aus: Statt danach zu suchen, wird jedes Wort des Baums **gegen das
   Tor gehalten**. Öffnet eines, dann steht es im Repository - und dann
   ist der Riegel weg.

   **Welche Wörter.** Ein Versuch kostet gemessen rund 20 ms; der ganze
   Baum hat über elftausend verschiedene Wörter, das wären vier Minuten
   in einer Kette, die eine Minute dauert. Geprüft werden deshalb die
   Wörter, die es **nur** in den Dateien gibt, in denen vom Tor die Rede
   ist - genau die Stelle, an der ein Versehen landet: Wer das Wort
   hinschreibt, schreibt es dorthin, wo er das Tor erklärt. Wörter, die
   auch anderswo im Baum vorkommen, sind älter als das Tor; für sie ist
   `node werkzeuge/zugangswort.mjs --suche` da, das den ganzen Baum
   nimmt.

   **Warum der Changelog nur mit seiner obersten Notiz zählt.** Er
   wächst mit jeder Änderung, und mit ihm die Prüfzeit. Jede Notiz war
   einmal die oberste und ist dabei geprüft worden - die Kette läuft bei
   jeder Änderung (Regel 4). Geprüft wird also weiter alles, nur jedes
   einmal statt jedes Mal. */
{
  abschnitt("Das Wort steht in keiner Datei");

  const NENNT_DAS_TOR = /torwaechter|Torwächter|zugangswort|Zugangswort/;
  const AUSSEN = new Set([".git", "node_modules", "vendor", "dist", "build"]);
  const WORTMUSTER = /[A-Za-zÄÖÜäöüß]{3,40}/g;

  const torDateien = [];
  const restDateien = [];
  const gehe = (rel) => {
    for (const eintrag of readdirSync(join(WURZEL, rel), { withFileTypes: true })) {
      const kind = rel === "." ? eintrag.name : rel + "/" + eintrag.name;
      if (eintrag.isDirectory()) {
        if (!AUSSEN.has(eintrag.name)) gehe(kind);
        continue;
      }
      if (statSync(join(WURZEL, kind)).size > 2_000_000) continue;
      const roh = readFileSync(join(WURZEL, kind));
      if (roh.includes(0)) continue;
      const text = roh.toString("utf8");
      /* Vom Changelog nur die oberste Notiz - Begründung oben. */
      const teil = kind === "CHANGELOG.md" ? text.split(/\n(?=## )/).slice(0, 2).join("\n") : text;
      (NENNT_DAS_TOR.test(text) ? torDateien : restDateien).push({ kind, teil });
    }
  };
  gehe(".");

  const woerterVon = (text) => {
    const raus = new Set();
    for (const treffer of text.matchAll(WORTMUSTER)) raus.add(normalisiere(treffer[0]));
    return raus;
  };

  const anderswo = new Set();
  for (const datei of restDateien) for (const wort of woerterVon(datei.teil)) anderswo.add(wort);

  const zuPruefen = new Map();
  for (const datei of torDateien) {
    for (const wort of woerterVon(datei.teil)) {
      if (anderswo.has(wort) || zuPruefen.has(wort)) continue;
      zuPruefen.set(wort, datei.kind);
    }
  }

  behaupte(torDateien.length >= 3,
    `${torDateien.length} Dateien reden vom Tor: ${torDateien.map((d) => d.kind).join(", ")}`);
  behaupte(zuPruefen.size >= 50,
    `${zuPruefen.size} Wörter gibt es nur dort - genug, dass die Suche etwas zu tun hat`);

  const beginn = Date.now();
  const funde = [];
  for (const [wort, datei] of zuPruefen) {
    if (gleicherFingerabdruck(fingerabdruckVon(wort), FINGERABDRUCK)) {
      funde.push(`„${wort}" in ${datei}`);
    }
  }
  const dauer = (Date.now() - beginn) / 1000;
  gleich(funde.length, 0,
    `kein Wort der Tor-Dateien öffnet das Tor${funde.length ? ` - ${funde.join(", ")}` : ""}`);
  messungen.push(`Wörterbuchangriff auf das eigene Tor: ${zuPruefen.size} Wörter aus `
    + `${torDateien.length} Dateien in ${dauer.toFixed(1)} s, kein Treffer`);

  /* Und die Wörter, die ein Fremder zuerst probiert. Sie stehen hier,
     weil ein Zugangswort, das „hatred" lautet, kein Zugangswort ist. */
  const NAHELIEGEND = [
    "hatred", "kerker", "jannik", "spiel", "geheim", "einlass", "passwort", "zugang",
    "hatred2026", "freunde", "dunkel", "schatten"
  ];
  const geraten = NAHELIEGEND.filter((wort) => wortStimmt(wort));
  gleich(geraten.length, 0,
    `keins der ${NAHELIEGEND.length} naheliegenden Wörter öffnet das Tor`
    + `${geraten.length ? ` - ${geraten.join(", ")}` : ""}`);

  /* Der Fingerabdruck selbst gehört an genau eine Stelle. Steht er
     zweimal im Baum, läuft eine der beiden Stellen irgendwann dem Wort
     hinterher, ohne dass jemand es merkt. */
  const traegerDesAbdrucks = [];
  for (const datei of [...torDateien, ...restDateien]) {
    if (datei.teil.includes(FINGERABDRUCK)) traegerDesAbdrucks.push(datei.kind);
  }
  gleich(traegerDesAbdrucks.join(","), "runtime/torwaechter.js",
    "der Fingerabdruck steht nur in runtime/torwaechter.js");
}

/* ══════════════════════════════════════════════════════════════════
   5 · Das Tor selbst
   ══════════════════════════════════════════════════════════════════ */

function macheTorprobe(zusatz = {}) {
  const ctx = macheErsatzflaeche();
  let geoeffnet = 0;
  const tor = macheTor({
    ctx,
    fingerabdruck: PROBEABDRUCK,
    beiOffen: () => { geoeffnet++; },
    fensterBreite: 640,
    fensterHoehe: 360,
    ...zusatz
  });
  const tippeAuf = (schluessel) => {
    tor.zeichne();
    const stelle = tor.stellenJetzt().find((s) => s.schluessel === schluessel);
    if (!stelle) throw new Error(`keine Stelle „${schluessel}"`);
    return tor.beiKlick(stelle.x + 2, stelle.y + 2);
  };
  const tippeWort = (wort) => {
    for (const zeichen of wort) tor.beiTaste(zeichen);
  };
  const loesche = () => {
    for (let i = 0; i < 60; i++) tor.beiTaste("Backspace");
  };
  return { ctx, tor, tippeAuf, tippeWort, loesche, wieOft: () => geoeffnet };
}

{
  abschnitt("Das Tor: das Wort entscheidet");

  const probe = macheTorprobe();
  gleich(probe.tor.stand().offen, false, "das Tor ist zu");
  gleich(probe.wieOft(), 0, "und `beiOffen` ist nicht gerufen worden");

  probe.tor.beiTaste("Enter");
  gleich(probe.wieOft(), 0, "ein leeres Feld öffnet nichts");
  behaupte(/Tipp erst das Wort/.test(probe.tor.stand().meldung),
    "und der Satz sagt, was zu tun ist");

  for (const falsch of [PROBEWORT + "e", `${PROBEWORT.toUpperCase()}!`, "eisentor"]) {
    probe.loesche();
    probe.tippeWort(falsch);
    probe.tor.beiTaste("Enter");
    gleich(probe.wieOft(), 0, `„${falsch}" öffnet das Tor nicht`);
    gleich(probe.tor.stand().versuch, falsch,
      `und „${falsch}" bleibt stehen - niemand tippt zweimal alles neu`);
    behaupte(/stimmt nicht/.test(probe.tor.stand().meldung),
      "die Meldung bleibt ruhig und sagt, dass es nicht stimmt");
  }

  probe.loesche();
  probe.tippeWort(PROBEWORT.toUpperCase());
  probe.tor.beiTaste("Enter");
  gleich(probe.wieOft(), 1, "das richtige Wort öffnet das Tor, auch in Großbuchstaben");
  gleich(probe.tor.stand().offen, true, "und das Tor weiß es");

  /* Zweimal derselbe Schlüssel darf nicht zwei Vorläufe bauen - genau
     der Fehler, den die nachgereichte Maus auf Android auslöst
     (`werkzeuge/pruefe-tippen.mjs`). */
  probe.tor.beiTaste("Enter");
  probe.tippeAuf("eintreten");
  gleich(probe.wieOft(), 1, "`beiOffen` wird genau einmal gerufen, auch bei zwei Tipps");
}

{
  abschnitt("Das Tor: Bedienung und Bild");

  const probe = macheTorprobe();
  const flaechen = probe.tor.zeichne();
  behaupte(flaechen > 0, `${flaechen} Flächen auf dem Torbild`);
  gleich(probe.ctx.rechtecke.every(ganzzahlig), true,
    "kein Rechteck liegt auf einem halben Bildpunkt");

  const stellen = probe.tor.stellenJetzt();
  gleich(stellen.length, 2, "zwei Stellen: das Feld und der Knopf");
  for (const stelle of stellen) {
    behaupte(stelle.hoehe >= 48,
      `die Fläche „${stelle.schluessel}" ist ${stelle.hoehe} Bildpunkte hoch, nötig sind 48`);
  }

  /* Der Zeiger fährt über den Knopf und wieder hinaus. */
  const knopf = stellen.find((s) => s.schluessel === "eintreten");
  gleich(probe.tor.beiZeiger(knopf.x + 2, knopf.y + 2), "eintreten", "der Zeiger findet den Knopf");
  gleich(probe.tor.beiZeiger(0, 0), null, "und daneben liegt nichts");
  gleich(probe.tor.beiKlick(0, 0), null, "ein Tipp ins Leere tut nichts");

  /* Einfügen: der Weg, den ein Mitspieler nimmt, dem Jannik das Wort
     geschickt hat. */
  probe.tor.beiEinfuegen("  stein krug \n");
  gleich(probe.tor.stand().versuch, PROBEWORT, "eingefügter Text kommt ohne Leerräume an");
  probe.tor.beiTaste("Enter");
  gleich(probe.wieOft(), 1, "und öffnet das Tor");

  /* Ohne Browser gibt es kein `document` - dann muss alles weiter über
     `beiTaste` gehen, sonst wäre diese Prüfung hier gar nicht möglich. */
  gleich(globalThis.document, undefined, "in dieser Prüfung gibt es kein `document`");

  const leer = macheTorprobe();
  leer.tor.setzeFenster(360, 640);
  const hochkant = leer.tor.zeichne();
  behaupte(hochkant > 0, `${hochkant} Flächen auch im Hochformat`);
  gleich(leer.ctx.rechtecke.every(ganzzahlig), true,
    "auch hochkant liegt nichts auf einem halben Bildpunkt");
  behaupte(leer.tor.stand().stufe >= 1, "die Vergrößerung ist mindestens 1 und ganzzahlig");
  gleich(Number.isInteger(leer.tor.stand().stufe), true, "und wirklich ganzzahlig");

  wirft(() => macheTor({}), "ein Tor ohne Zeichenblatt");
  wirft(() => macheTor({ ctx: macheErsatzflaeche() }), "ein Tor ohne `beiOffen`");
}

/* ══════════════════════════════════════════════════════════════════
   6 · Der Speicher darf ausfallen
   ══════════════════════════════════════════════════════════════════ */
{
  abschnitt("Merken - und wenn der Speicher wirft");

  const alt = globalThis.localStorage;
  const speicher = macheSpeicher();
  globalThis.localStorage = speicher;
  try {
    vergissTor();
    gleich(torErinnert(PROBEABDRUCK), false, "am Anfang ist nichts gemerkt");
    gleich(merkeTor(PROBEABDRUCK), true, "das Merken gelingt");
    gleich(torErinnert(PROBEABDRUCK), true, "und wird wiedererkannt");
    gleich(speicher.getItem(SPEICHER_SCHLUESSEL), PROBEABDRUCK,
      "gemerkt wird der Fingerabdruck");
    gleich(torErinnert("0".repeat(16)), false,
      "ein anderer Fingerabdruck wird nicht wiedererkannt - ein neues Wort fragt neu");
    gleich(vergissTor(), true, "und vergessen geht auch");
    gleich(torErinnert(PROBEABDRUCK), false, "danach ist nichts mehr gemerkt");

    /* Das Tor merkt sich selbst, sobald es aufgeht. */
    const probe = macheTorprobe();
    probe.tippeWort(PROBEWORT);
    probe.tor.beiTaste("Enter");
    gleich(torErinnert(PROBEABDRUCK), true, "ein offenes Tor merkt sich das für das nächste Mal");

    /* **Nach** dem Öffnen durchgesehen, nicht davor: Ein Tor, das
       nebenher noch das Wort selbst hinterlegt, fiele bei einer
       früheren Durchsicht nicht auf - da liegt nur der eine Eintrag,
       den die Prüfung selbst geschrieben hat. Jetzt liegt drin, was
       das Tor für richtig hält. */
    behaupte(speicher.inhalt.size >= 1, `${speicher.inhalt.size} Eintrag/Einträge im Speicher`);
    for (const [name, wert] of speicher.inhalt) {
      behaupte(/^[0-9a-f]{16}$/.test(wert),
        `im Speicher steht unter „${name}" nur ein Fingerabdruck, kein Wort: „${wert}"`);
    }
  } finally {
    if (alt === undefined) delete globalThis.localStorage; else globalThis.localStorage = alt;
  }

  /* Und jetzt der Fall aus dem privaten Fenster: Schon der Zugriff
     wirft. Nichts davon darf nach außen dringen. */
  /* Jeder Aufruf einzeln abgefangen: Fliegt der Fund durch, stürzt die
     ganze Prüfung ab und druckt **keine** ihrer Behauptungen mehr -
     auch nicht die gefallene (Fehlerbuch C5). So wird aus dem Absturz
     eine Behauptung mit Namen und Fehlertext. */
  const sicher = (tuWas) => {
    try { return tuWas(); } catch (fund) { return `WIRFT: ${fund.message}`; }
  };
  const lauf = mitWerfendemSpeicher(() => ({
    erinnert: sicher(() => torErinnert(PROBEABDRUCK)),
    gemerkt: sicher(() => merkeTor(PROBEABDRUCK)),
    vergessen: sicher(() => vergissTor()),
    geoeffnet: sicher(() => {
      const probe = macheTorprobe();
      probe.tor.zeichne();
      probe.tippeWort(PROBEWORT);
      probe.tor.beiTaste("Enter");
      return probe.wieOft();
    })
  }));
  gleich(lauf.wert.erinnert, false, "ein werfender Speicher heißt: nichts gemerkt");
  gleich(lauf.wert.gemerkt, false, "das Merken meldet ehrlich, dass es nicht ging");
  gleich(lauf.wert.vergessen, false, "und das Vergessen ebenso");
  gleich(lauf.wert.geoeffnet, 1, "das Tor geht trotzdem auf - die Seite läuft weiter");
  behaupte(lauf.zugriffe() >= 3,
    `der werfende Speicher ist ${lauf.zugriffe()}-mal angefasst worden - er war wirklich im Weg`);
}

/* ══════════════════════════════════════════════════════════════════
   7 · Werkzeug und Torwächter rechnen dasselbe
   ══════════════════════════════════════════════════════════════════

   `werkzeuge/zugangswort.mjs` wird als eigener Prozess gestartet und
   nicht eingelesen: Es beendet sich selbst (`process.exit`) und nähme
   diese Prüfung mit. Geprüft wird die Zeile, die Jannik wirklich zu
   sehen bekommt. */
{
  abschnitt("Das Werkzeug zum Wortwechsel");

  const lauf = spawnSync(process.execPath, [join(WURZEL, "werkzeuge/zugangswort.mjs"), PROBEWORT],
    { encoding: "utf8", cwd: WURZEL });
  gleich(lauf.status, 0, "das Werkzeug läuft durch");
  const zeile = (lauf.stdout || "").split("\n")
    .find((z) => z.startsWith("export const FINGERABDRUCK ="));
  behaupte(!!zeile, "es druckt die Zeile zum Austauschen");
  gleich(zeile, `export const FINGERABDRUCK = "${PROBEABDRUCK}";`,
    "Werkzeug und Torwächter kommen für dasselbe Wort auf denselben Fingerabdruck");
  behaupte(/runtime\/torwaechter\.js/.test(lauf.stdout),
    "und es sagt, in welche Datei die Zeile gehört");
  behaupte(/KEINE Datei/.test(lauf.stdout),
    "und warnt davor, das Wort selbst irgendwohin zu schreiben");

  const ohne = spawnSync(process.execPath, [join(WURZEL, "werkzeuge/zugangswort.mjs")],
    { encoding: "utf8", cwd: WURZEL });
  behaupte(ohne.status !== 0, "ohne Wort ist es kein Erfolg");
  behaupte(/zugangswort\.mjs/.test(ohne.stdout), "sondern eine Hilfe");

  /* Der Fall, der am 07.09.2026 wirklich eingetreten ist: Als Wort war
     der Name einer Figur aus dem eigenen Katalog vorgeschlagen - er
     stand dreizehnmal im Repository. Nur an dieser einen Stelle liegt
     das Wort im Klartext vor; nur hier lässt es sich also wörtlich
     suchen, und das kostet Millisekunden statt der fünfeinhalb Minuten,
     die ein Fingerabdruckvergleich über den ganzen Baum braucht. */
  const drin = spawnSync(process.execPath,
    [join(WURZEL, "werkzeuge/zugangswort.mjs"), "torwaechter"],
    { encoding: "utf8", cwd: WURZEL });
  behaupte(drin.status !== 0,
    "ein Wort, das schon im Baum steht, wird abgelehnt");
  behaupte(/steht schon \d+-mal im Repository/.test(drin.stdout),
    "und die Absage sagt, wie oft es dasteht");
  behaupte(!/export const FINGERABDRUCK/.test(drin.stdout),
    "eine Zeile zum Austauschen bekommt man dafür nicht");

  /* Der Name entscheidet, ob `pruefe-alles.mjs` die Datei für eine
     Prüfung hält. Eine „Prüfung", die nichts behauptet, wäre für immer
     grün. */
  const inWerkzeugen = readdirSync(join(WURZEL, "werkzeuge"));
  behaupte(inWerkzeugen.includes("zugangswort.mjs"), "das Werkzeug liegt in werkzeuge/");
  behaupte(!/^pruefe-.+\.mjs$/.test("zugangswort.mjs"),
    "und heißt nicht `pruefe-…`, sonst startete die Kette es als Prüfung");
}

/* ══════════════════════════════════════════════════════════════════
   8 · Die Verdrahtung: das Tor steht vor dem Vorlauf
   ══════════════════════════════════════════════════════════════════

   Der Fall, der ohne diese Arbeit falsch wäre: Das Tor wird gezeichnet,
   aber der Vorlauf steht schon dahinter und nimmt Tipps entgegen. Dann
   wäre der Riegel ein Bild und sonst nichts. */
{
  abschnitt("Die Verdrahtung in start.js");

  const alt = globalThis.localStorage;
  globalThis.localStorage = macheSpeicher();
  const welt = macheWelt();
  try {
    vergissTor();
    const lauf = starte(welt.blatt);
    behaupte(lauf.tor() !== null, "beim ersten Start steht das Tor da");
    gleich(lauf.lobby(), null, "und der Vorlauf ist noch gar nicht gebaut");
    gleich(lauf.stand(), null, "es läuft auch kein Spiel");

    welt.naechstesBild(16);
    behaupte(welt.ctx.rechtecke().length > 0, "das Tor malt");
    /* Erst wer gemalt hat, weiß, wo seine Flächen liegen. Ohne diese
       Behauptung stünde weiter unten ein Absturz statt eines Fundes,
       wenn die Zeichenschleife das Tor überginge. */
    gleich(lauf.tor().stellenJetzt().length, 2, "und kennt danach seine zwei Flächen");

    /* Ein falsches Wort über die echten Hörer - Tastatur und Tipp.
       Ab hier wird jeder Zugriff auf das Tor abgesichert: Geht es
       fälschlich auf, ist das ein **Fund** und darf keine Ausnahme
       werden - eine abgestürzte Prüfung druckt keine einzige ihrer
       Behauptungen, auch nicht die gefallene (Fehlerbuch C5). */
    const stelle = lauf.tor().stellenJetzt().find((s) => s.schluessel === "wort")
      || { x: -1, y: -1 };
    welt.feuere("pointerdown", ereignis({
      clientX: stelle.x + 2, clientY: stelle.y + 2, button: 0, pointerType: "touch"
    }));
    for (const zeichen of "eisentor") welt.feuere("keydown", ereignis({ key: zeichen }));
    gleich(lauf.tor() && lauf.tor().stand().versuch, "eisentor", "jede Taste geht in das Feld");
    welt.feuere("keydown", ereignis({ key: "Enter" }));
    behaupte(lauf.tor() !== null, "ein falsches Wort lässt das Tor zu");
    gleich(lauf.lobby(), null, "und den Vorlauf ungebaut");

    /* Einfügen und Größenänderung erreichen das Tor auch. */
    welt.feuere("paste", ereignis({ clipboardData: { getData: () => "eisen" } }));
    gleich(lauf.tor() && lauf.tor().stand().versuch, "eisen",
      "eingefügt wird ins Tor, nicht in den Vorlauf");
    welt.blatt.clientWidth = 520;
    welt.blatt.clientHeight = 300;
    welt.feuere("resize");
    welt.naechstesBild(32);
    gleich(welt.blatt.width, 520, "eine Größenänderung erreicht das Blatt");
    gleich(welt.ctx.masseBruch(), null, "und setzt keine gebrochenen Maße");
    /* Und sie muss auch **das Tor** erreichen: Bleibt es bei den alten
       Maßen, liegen seine Knöpfe neben dem Blatt - man sieht sie, trifft
       sie aber nicht mehr. */
    const draussen = (lauf.tor() ? lauf.tor().stellenJetzt() : [])
      .filter((s) => s.x < 0 || s.y < 0 || s.x + s.breite > 520 || s.y + s.hoehe > 300);
    gleich(draussen.length, 0,
      "nach der Größenänderung liegt keine Fläche des Tores neben dem Blatt"
      + `${draussen.length ? ` (${draussen.map((s) => s.schluessel).join(", ")})` : ""}`);
  } finally {
    welt.raeumeAuf();
    if (alt === undefined) delete globalThis.localStorage; else globalThis.localStorage = alt;
  }
}

{
  abschnitt("Ein gemerktes Tor fragt nicht noch einmal");

  const alt = globalThis.localStorage;
  globalThis.localStorage = macheSpeicher();
  const welt = macheWelt();
  try {
    merkeTor();
    const lauf = starte(welt.blatt);
    gleich(lauf.tor(), null, "wer das Wort schon einmal hatte, sieht kein Tor mehr");
    behaupte(lauf.lobby() !== null, "sondern gleich den Vorlauf");
    gleich(lauf.lobby() && lauf.lobby().stand().seite, "start", "und zwar auf der Titelseite");
  } finally {
    welt.raeumeAuf();
    if (alt === undefined) delete globalThis.localStorage; else globalThis.localStorage = alt;
  }
}

for (const zeile of messungen) console.log(`      · ${zeile}`);
console.log(`      · Salz „${SALZ}", ${RUNDEN} Runden, Fingerabdruck ${FINGERABDRUCK}`);
ende("Der Torwächter");
