/* [Aufgabe: Oberfläche] Der Torwächter: ein Wort vor dem Vorlauf, damit
   nicht jeder, der die Adresse aufschnappt, in Janniks Runde steht.

   ── Was dieser Riegel ist, und was er nicht ist ────────────────────

   Er ist ein Riegel, kein Schloss, und das steht hier, damit es
   niemand später für mehr hält. Der Fingerabdruck weiter unten wird
   **mit ausgeliefert**: Wer die Seite öffnet, kann ihn lesen — im
   Quelltext, in der Einzeldatei, im Zwischenspeicher des Browsers. Wer
   Rechenzeit übrig hat, probiert ein Wörterbuch dagegen durch; die
   200.000 Runden je Versuch machen daraus Stunden statt Sekunden, und
   Stunden sind keine Ewigkeit. Und wer das Wort einmal hat, gibt es
   weiter, ohne dass hier irgendetwas davon merkt. Was der Riegel
   leistet, ist genau eins: Er hält den Zufallsbesucher ab, der die
   Seite gefunden hat und sonst nichts weiß. Mehr nicht.

   Echter Schutz bräuchte einen Server, der das Wort prüft und das
   Spiel erst danach herausgibt — und einen Server will dieses Projekt
   ausdrücklich nicht (CLAUDE.md, „Ausdrücklich nicht gefordert").
   Jannik ist das vorher gesagt worden, er hat sich trotzdem für den
   Riegel entschieden. Deshalb ist er so gut gebaut, wie ein Riegel
   sein kann — und deshalb steht hier keine Beschönigung.

   ── Warum FNV-1a von Hand und nicht `crypto.subtle` ───────────────

   Das Spiel soll auch als **eine einzelne Datei von der Festplatte**
   laufen (`werkzeuge/eine-datei.mjs`, Aufruf über `file://`). Dort
   gibt es `crypto.subtle` nicht — der Browser gibt die Web-Krypto nur
   in einem „sicheren Kontext" heraus, und eine Datei von der Platte
   ist keiner. Ein Torwächter, der dort wirft, macht aus dem Riegel
   eine verschlossene Tür ohne Klinke. Also reines JavaScript: FNV-1a
   mit `Math.imul` und XOR, dasselbe ganzzahlige Muster wie in
   `spiel/rauschen.mjs` und in der Prüfzahl von
   `werkzeuge/pruefe-einstieg.mjs`.

   **Warum 200.000 Runden.** Ein einzelner Hash über ein Wort ist in
   Sekundenbruchteilen gerechnet; ein Wörterbuch mit einer halben
   Million Wörtern wäre in einer knappen Minute durch. Gemessen kostet
   ein Versuch hier 20,3 ms (`node werkzeuge/pruefe-torwaechter.mjs`) —
   dasselbe Wörterbuch dauert damit knapp drei Stunden. Das ist der
   ganze Gewinn: Aus „durchprobieren" wird „sich hinsetzen müssen".

   **Warum zwei Ströme.** Ein einzelner 32-Bit-Fingerabdruck hat vier
   Milliarden Werte; irgendein Wort, das zufällig denselben trifft,
   wäre kein Hexenwerk. Zwei Ströme mit verschiedenen Anfangswerten
   ergeben 64 Bit, und damit ist der Zufallstreffer keine Rechnung mehr
   wert.

   **Warum in konstanter Zeit verglichen wird.** Ein Vergleich, der
   beim ersten Unterschied abbricht, braucht für „erste Stelle falsch"
   messbar weniger Zeit als für „erste acht Stellen richtig" — daraus
   liest man den Fingerabdruck Stelle für Stelle aus, statt ihn zu
   raten. Hier steht er ohnehin im Quelltext, der Angriff wäre also
   sinnlos; aber der ganze Durchlauf kostet nichts, und eine Gewohnheit,
   die nichts kostet, wird nicht aufgegeben.

   ── Warum dieselbe Schnittstelle wie die Lobby ────────────────────

   `runtime/start.js` hat genau eine Zeichenschleife und genau einen
   Satz Hörer. Bekäme das Tor einen eigenen Weg dorthin, gäbe es zwei
   Bedienungen, die auseinanderlaufen können — die zweite merkt man
   erst auf dem Handy. Also: `zeichne`, `beiKlick`, `beiTaste`,
   `beiZeiger`, `beiEinfuegen`, `setzeFenster`, `stand`,
   `stellenJetzt` — Wort für Wort wie `macheLobby`, und `start.js`
   fragt nur, welches der beiden gerade da ist.

   Der Aufbau (Spaltenbreite, Ersatzzeichen, Umbruch) wird aus
   `runtime/lobby.js` **geholt**, nicht abgeschrieben. Was dort nicht
   herausgereicht wird — die Zeilenhöhen und das Malen —, steht hier
   noch einmal: `lobby.js` hat 999 von 1000 erlaubten Zeilen (Regel 8),
   dort passt keine Ausfuhr mehr hinein. Das ist keine zweite Wahrheit
   über dieselbe Sache, sondern ein zweites Blatt in derselben
   Handschrift; wenn `lobby.js` eines Tages geteilt wird, gehören beide
   an dieselbe Stelle.

   ── Warum das Merken nur den Fingerabdruck speichert ──────────────

   Niemand soll das Wort bei jedem Start neu tippen. Gemerkt wird
   deshalb im Browser (`localStorage`) — aber **nicht das Wort**,
   sondern nur der Fingerabdruck. Wer den Speicher ausliest, hat damit
   genau das, was ohnehin im Quelltext steht, und keinen Buchstaben
   mehr.

   Jeder Zugriff auf den Speicher steht in `try`/`catch`, und zwar
   schon der Zugriff selbst: Im privaten Fenster und bei blockierten
   Website-Daten wirft bereits `globalThis.localStorage`, nicht erst
   `getItem`. Ohne den Fangarm bliebe die Seite schwarz — mit ihm fragt
   sie eben jedes Mal nach dem Wort.

   ── Warum `macheTor` einen Fingerabdruck annimmt ──────────────────

   Der zweite Wert von `macheTor({ fingerabdruck })` ist nicht für den
   Betrieb da, sondern für die Prüfung: Das echte Wort darf in keiner
   Datei dieses Projekts stehen, auch nicht in einer Prüfdatei. Also
   prüft `werkzeuge/pruefe-torwaechter.mjs` das ganze Werk an einem
   **Probewort** mit eigenem Fingerabdruck. Verraten ist damit nichts —
   wer den Quelltext hat, kann ohnehin jede Zeile davon umschreiben.

   ── Arbeitet zusammen mit ──────────────────────────────────────────

   `runtime/start.js` (baut das Tor vor dem Vorlauf und reicht ihm
   Zeiger, Tastatur und Einfügen), `runtime/lobby.js` (`SPALTE`,
   `MINDEST_BREITE`, `lesbar`, `umbrich` — und das Vorbild für Aufbau
   und Bedienung), `runtime/schrift.js`, `runtime/palette.js`,
   `index.html` (`#eingabefeld`, die Tastatur des Handys),
   `werkzeuge/zugangswort.mjs` (rechnet den Fingerabdruck für ein neues
   Wort aus und benutzt dafür die Funktionen von hier),
   `werkzeuge/pruefe-torwaechter.mjs`. */

import * as schrift from "./schrift.js";
import { FARBEN } from "./palette.js";
import { MINDEST_BREITE, SPALTE, lesbar, umbrich } from "./lobby.js";

/* Das Salz. Es macht aus dem Fingerabdruck einen, der nur zu diesem
   Spiel gehört: Eine fertige Tabelle vorgerechneter FNV-Werte aus dem
   Netz passt damit auf nichts mehr. Es ist kein Geheimnis und muss
   keines sein — es darf sich nur nie wieder ändern, sonst passt der
   Fingerabdruck unten nicht mehr zum Wort. */
export const SALZ = "hatred-tor";

/* Wie oft der Hash über (Salz + Wort) wiederholt wird. Begründung in
   der Kopfnotiz; gemessen wird die Zahl in
   `werkzeuge/pruefe-torwaechter.mjs`. */
export const RUNDEN = 200000;

/* Der Fingerabdruck des Wortes, das das Tor öffnet — und das Einzige,
   was davon im Repository steht. Neu gerechnet wird er mit
   `node werkzeuge/zugangswort.mjs <neues wort>`; das Werkzeug druckt
   genau diese Zeile zum Austauschen. */
export const FINGERABDRUCK = "1a143e45b781e7e4";

/* Unter diesem Namen liegt der Fingerabdruck im Browser, wenn das Tor
   einmal offen war. */
export const SPEICHER_SCHLUESSEL = "hatred-tor-offen";

/* Die beiden Zahlen von FNV-1a, 32 Bit: der Streufaktor und der
   Anfangswert. `ANFANG_B` ist die obere Hälfte des 64-Bit-Anfangswerts
   derselben Familie — zwei Ströme aus einer Verwandtschaft, aber mit
   verschiedenem Start, damit sie nicht dasselbe rechnen. */
const STREUER = 0x01000193;
const ANFANG_A = 0x811c9dc5;
const ANFANG_B = 0xcbf29ce4;

/* Leerzeichen außen weg, alles klein: Niemand soll sich an einem
   großen Anfangsbuchstaben wundtippen, und das Handy schreibt das
   erste Zeichen von sich aus groß. */
export function normalisiere(wort) {
  if (wort === undefined || wort === null) return "";
  return String(wort).trim().toLowerCase();
}

/* Ein Durchgang FNV-1a über eine Zeichenkette. Ganzzahlig mit
   `Math.imul`, XOR und `>>> 0` — dasselbe Muster wie `ganzHash` in
   `spiel/rauschen.mjs`: Jeder Browser rechnet damit dasselbe. */
function fnv(anfang, futter) {
  let h = anfang >>> 0;
  for (let i = 0; i < futter.length; i++) {
    h = Math.imul(h ^ futter.charCodeAt(i), STREUER) >>> 0;
  }
  return h >>> 0;
}

const achtStellen = (zahl) => (zahl >>> 0).toString(16).padStart(8, "0");

/* Der Fingerabdruck mit frei gewählter Rundenzahl. Er steht hier
   heraus, damit die Prüfung nachrechnen kann, dass die Arbeit wirklich
   mit der Rundenzahl wächst — ohne die Funktion ein zweites Mal
   nachzubauen. Im Betrieb ruft ihn nur `fingerabdruckVon`. */
export function fingerabdruckMitRunden(wort, runden) {
  const futter = SALZ + normalisiere(wort);
  let a = ANFANG_A >>> 0;
  let b = ANFANG_B >>> 0;
  for (let runde = 0; runde < runden; runde++) {
    a = fnv(a ^ runde, futter);
    b = fnv(b ^ a, futter);
  }
  return achtStellen(a) + achtStellen(b);
}

export function fingerabdruckVon(wort) {
  return fingerabdruckMitRunden(wort, RUNDEN);
}

/* Vergleich in konstanter Zeit: **alle** Stellen werden durchlaufen,
   auch wenn die erste schon nicht passt. Deshalb steht in dieser
   Schleife weder `break` noch `return` — wer eines einbaut, nimmt
   genau die Eigenschaft heraus, um die es hier geht. Fehlende Stellen
   zählen als 0 (`NaN | 0`), und die Längen gehen als erster
   Unterschied mit ein. */
export function gleicherFingerabdruck(links, rechts) {
  const eins = String(links);
  const zwei = String(rechts);
  const weite = Math.max(eins.length, zwei.length);
  let unterschied = eins.length ^ zwei.length;
  for (let i = 0; i < weite; i++) {
    unterschied |= (eins.charCodeAt(i) | 0) ^ (zwei.charCodeAt(i) | 0);
  }
  return unterschied === 0;
}

export function wortStimmt(wort, abdruck = FINGERABDRUCK) {
  return gleicherFingerabdruck(fingerabdruckVon(wort), abdruck);
}

/* ── Das Merken im Browser ──────────────────────────────────────────

   Alle drei Zugriffe fangen alles ab, und zwar ab der ersten Zeile:
   Schon `globalThis.localStorage` wirft, wo Website-Daten gesperrt
   sind. Wo nichts gespeichert werden kann, fragt das Tor eben bei
   jedem Start — das ist unbequem, aber es läuft. */

function speicherHolen() {
  const speicher = globalThis.localStorage;
  if (!speicher || typeof speicher.getItem !== "function") return null;
  return speicher;
}

export function torErinnert(abdruck = FINGERABDRUCK) {
  try {
    const speicher = speicherHolen();
    if (!speicher) return false;
    const gemerkt = speicher.getItem(SPEICHER_SCHLUESSEL);
    return typeof gemerkt === "string" && gleicherFingerabdruck(gemerkt, abdruck);
  } catch {
    return false;
  }
}

export function merkeTor(abdruck = FINGERABDRUCK) {
  try {
    const speicher = speicherHolen();
    if (!speicher || typeof speicher.setItem !== "function") return false;
    speicher.setItem(SPEICHER_SCHLUESSEL, abdruck);
    return true;
  } catch {
    return false;
  }
}

export function vergissTor() {
  try {
    const speicher = speicherHolen();
    if (!speicher || typeof speicher.removeItem !== "function") return false;
    speicher.removeItem(SPEICHER_SCHLUESSEL);
    return true;
  } catch {
    return false;
  }
}

/* ── Das Bild ───────────────────────────────────────────────────────

   Zeilenhöhen in logischen Bildpunkten, vor der Vergrößerung — dieselben
   Zahlen wie im Vorlauf. `feld` und `knopf` sind **48**, weil Android
   48 Punkte als kleinste Fläche für einen Daumen vorgibt. */
const HOCH = { titel: 34, unter: 12, text: 10, leer: 6, knopf: 48, feld: 48 };

export function macheTor({
  ctx, beiOffen, fingerabdruck = FINGERABDRUCK,
  fensterBreite = 960, fensterHoehe = 540
} = {}) {
  if (!ctx || typeof ctx.fillRect !== "function") {
    throw new Error("macheTor: ein Zeichenblatt mit fillRect muss herein");
  }
  if (typeof beiOffen !== "function") {
    throw new Error("macheTor: ohne `beiOffen` käme niemand jemals hinein");
  }

  let breite = Math.max(1, Math.round(fensterBreite));
  let hoehe = Math.max(1, Math.round(fensterHoehe));
  let stufe = 1;
  let gezeichnet = 0;

  let versuch = "";
  let meldung = "";
  let meldungGut = false;
  let offen = false;
  let zeiger = 0;
  let stellen = [];
  let unterZeiger = null;

  /* Das Feld ist von Anfang an das, was Tasten bekommt: Es gibt genau
     eines, und wer auf einer Tastatur tippt, meint es. Der **Fokus**
     wird trotzdem erst beim Tippen auf das Feld geholt (`feldZeigen`) —
     Android zeigt seine Tastatur nur, wenn das aus einer Nutzergeste
     heraus geschieht, und ein Fokus beim Bauen der Seite ist keine. */
  let feldDran = true;

  /* ── Das unsichtbare Feld fürs Handy ─────────────────────────────
     Wortgleich zum Vorlauf (`runtime/lobby.js`): Android zeigt seine
     Tastatur nur einem Element mit echtem Fokus, nie einem
     Zeichenblatt. Fehlt `document.getElementById` (Prüfung ohne
     Browser), bleibt `feld` `null` und alles läuft über `beiTaste`. */
  const dokument = globalThis.document;
  const feld = (dokument && typeof dokument.getElementById === "function")
    ? dokument.getElementById("eingabefeld") : null;

  function feldZeigen() {
    if (!feld) return;
    feld.setAttribute("inputmode", "text");
    feld.removeAttribute("pattern");
    if (feld.value !== versuch) feld.value = versuch;
    try { feld.focus(); } catch { /* verweigert ein Browser das, bleibt es eben zu */ }
  }

  function feldVerbergen() {
    if (feld) { try { feld.blur(); } catch { /* siehe oben */ } }
  }

  /* Jede echte Tastatureingabe landet hier - auch die, die `beiTaste`
     nie als `keydown` sieht (Autokorrektur, Wischtippen). */
  if (feld) {
    feld.addEventListener("input", () => {
      if (feldDran) versuch = feld.value;
    });
  }

  function feldMitziehen() {
    if (feld && feldDran && feld.value !== versuch) feld.value = versuch;
  }

  function sage(text, gut = false) {
    meldung = lesbar(text);
    meldungGut = gut === true;
  }

  /* ── Die eine Seite ─────────────────────────────────────────────

     Sie sagt, was zu tun ist, und **nicht**, wie das Wort lautet: kein
     Anfangsbuchstabe, keine Länge, kein Rätsel. Wer es nicht hat, soll
     hier nichts lernen. */
  function zeilenVon() {
    return [
      { art: "titel", text: "HATRED" },
      { art: "unter", text: "Geschlossene Runde" },
      { art: "leer" },
      {
        art: "text", farbe: FARBEN.hudMatt,
        text: "Dieses Spiel ist für Jannik und seine Freunde."
      },
      {
        art: "text", farbe: FARBEN.hudMatt,
        text: "Tipp das Wort ein, das du von ihm bekommen hast."
      },
      { art: "leer" },
      { art: "feld", schluessel: "wort", marke: "Wort" },
      { art: "knopf", schluessel: "eintreten", text: "Eintreten" }
    ];
  }

  /* ── Aus Zeilen werden Stellen auf dem Blatt ────────────────────*/

  function summeHoehe(zeilen) {
    let summe = 0;
    for (const zeile of zeilen) summe += HOCH[zeile.art] || HOCH.text;
    return summe;
  }

  function gesamtHoehe(zeilen) {
    return summeHoehe(zeilen) + 2 * HOCH.text;
  }

  /* Ganzzahlig und mindestens 1 - eine gebrochene Vergrößerung legte
     jede Kante auf einen halben Bildpunkt (Fehlerbuch D1). */
  function stufeFuer(zeilen) {
    const nachBreite = Math.floor(breite / MINDEST_BREITE);
    const nachHoehe = Math.floor(hoehe / gesamtHoehe(zeilen));
    return Math.max(1, Math.min(nachBreite, nachHoehe));
  }

  function lege(zeilen) {
    stellen = [];
    stufe = stufeFuer(zeilen);
    const spaltenBreite = SPALTE * stufe;
    const x0 = Math.round((breite - spaltenBreite) / 2);
    let y = Math.max(0, Math.round((hoehe - gesamtHoehe(zeilen) * stufe) / 2));
    for (const zeile of zeilen) {
      const hoch = (HOCH[zeile.art] || HOCH.text) * stufe;
      zeile.x = x0;
      zeile.y = y;
      zeile.breite = spaltenBreite;
      zeile.hoehe = hoch;
      if (zeile.art === "knopf" || zeile.art === "feld") {
        stellen.push({
          schluessel: zeile.schluessel, x: x0, y, breite: spaltenBreite, hoehe: hoch
        });
      }
      y += hoch;
    }
    if (zeiger >= stellen.length) zeiger = Math.max(0, stellen.length - 1);
    return zeilen;
  }

  /* ── Malen ──────────────────────────────────────────────────────*/

  function male(x, y, b, h, farbe) {
    if (b <= 0 || h <= 0) return;
    ctx.fillStyle = farbe;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(b), Math.round(h));
    gezeichnet++;
  }

  function rahmen(x, y, b, h, farbe) {
    male(x, y, b, stufe, farbe);
    male(x, y + h - stufe, b, stufe, farbe);
    male(x, y, stufe, h, farbe);
    male(x + b - stufe, y, stufe, h, farbe);
  }

  function text(inhalt, x, y, farbe, gross = stufe) {
    return schrift.zeichne(ctx, lesbar(inhalt), x, y, farbe, { gross });
  }

  function mittig(inhalt, x, y, b, farbe, gross = stufe) {
    const sauber = lesbar(inhalt);
    const weite = schrift.breiteVon(sauber) * gross;
    return text(sauber, x + Math.round((b - weite) / 2), y, farbe, gross);
  }

  function mitteY(kastenHoehe) {
    return Math.max(0, Math.round(((kastenHoehe - stufe) - schrift.ZEICHEN_HOCH * stufe) / 2));
  }

  function maleKnopf(stelle, beschriftung) {
    const dran = stellen[zeiger] && stellen[zeiger].schluessel === stelle.schluessel;
    const drueber = unterZeiger === stelle.schluessel;
    male(stelle.x, stelle.y, stelle.breite, stelle.hoehe - stufe, FARBEN.hudGrund);
    rahmen(stelle.x, stelle.y, stelle.breite, stelle.hoehe - stufe,
      (dran || drueber) ? FARBEN.hudSchrift : FARBEN.hudRahmen);
    mittig(beschriftung, stelle.x, stelle.y + mitteY(stelle.hoehe), stelle.breite,
      FARBEN.hudSchrift);
  }

  function maleFeld(zeile) {
    const marke = `${zeile.marke}:`;
    const markeBreite = schrift.breiteVon(lesbar(marke)) * stufe + 3 * stufe;
    const x = zeile.x + markeBreite;
    const b = zeile.breite - markeBreite;
    const mitte = mitteY(zeile.hoehe);
    text(marke, zeile.x, zeile.y + mitte, FARBEN.hudMatt);
    male(x, zeile.y, b, zeile.hoehe - stufe, FARBEN.hudGrund);
    rahmen(x, zeile.y, b, zeile.hoehe - stufe, feldDran ? FARBEN.gold1 : FARBEN.hudRahmen);
    /* Getippt wird sichtbar, nicht als Punktereihe: Auf einem Handy
       vertippt man sich, und wer seinen eigenen Fehler nicht sieht,
       tippt ihn dreimal. Vor fremden Blicken schützt das Wort ohnehin
       nichts - es steht auf demselben Zettel wie die Adresse. */
    const passt = Math.max(1, Math.floor(b / stufe / schrift.VORSCHUB) - 1);
    const sicht = versuch.length > passt ? versuch.slice(versuch.length - passt) : versuch;
    text(sicht + (feldDran ? "_" : ""), x + 2 * stufe, zeile.y + mitte, FARBEN.hudSchrift);
  }

  /* Gibt zurück, wie viele **Flächen** gemalt wurden - wie im Vorlauf
     ohne die Buchstaben, die `runtime/schrift.js` selbst zählt. */
  function zeichne() {
    feldMitziehen();
    gezeichnet = 0;
    ctx.imageSmoothingEnabled = false;
    male(0, 0, breite, hoehe, FARBEN.leere);
    const zeilen = lege(zeilenVon());

    for (const zeile of zeilen) {
      if (zeile.art === "titel") {
        mittig(zeile.text, zeile.x, zeile.y, zeile.breite, FARBEN.blut2, 4 * stufe);
      } else if (zeile.art === "unter") {
        mittig(zeile.text, zeile.x, zeile.y, zeile.breite, FARBEN.hudMatt);
      } else if (zeile.art === "text") {
        text(zeile.text, zeile.x, zeile.y, zeile.farbe || FARBEN.hudSchrift);
      } else if (zeile.art === "knopf") {
        maleKnopf(zeile, zeile.text);
      } else if (zeile.art === "feld") {
        maleFeld(zeile);
      }
    }

    if (meldung !== "") {
      const breit = Math.floor(breite / stufe / schrift.VORSCHUB) - 2;
      for (const [i, zeile] of umbrich(meldung, breit).slice(0, 2).entries()) {
        mittig(zeile, 0, hoehe - (2 - i) * HOCH.text * stufe, breite,
          meldungGut ? FARBEN.hudGut : FARBEN.hudWarn);
      }
    }
    return gezeichnet;
  }

  /* ── Was ein Tipp bedeutet ──────────────────────────────────────*/

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

  /* Ein falsches Wort gibt eine ruhige Meldung und **lässt den
     Tippversuch stehen**: Wer sich in einem von zehn Buchstaben
     vertippt hat, soll den einen ändern und nicht alles neu tippen. */
  function pruefe() {
    if (normalisiere(versuch) === "") {
      sage("Tipp erst das Wort ein, dann auf Eintreten.");
      return false;
    }
    if (!wortStimmt(versuch, fingerabdruck)) {
      sage("Das Wort stimmt nicht. Frag Jannik - von ihm kommt es.");
      return false;
    }
    merkeTor(fingerabdruck);
    sage("Willkommen.", true);
    if (!offen) {
      offen = true;
      feldDran = false;
      feldVerbergen();
      beiOffen();
    }
    return true;
  }

  function tue(schluessel) {
    if (schluessel === undefined || schluessel === null) return null;
    if (schluessel === "wort") { feldDran = true; feldZeigen(); return schluessel; }
    if (schluessel === "eintreten") { pruefe(); return schluessel; }
    return schluessel;
  }

  function beiKlick(px, py) {
    const stelle = stelleBei(px, py);
    if (!stelle) return null;
    zeiger = stellen.indexOf(stelle);
    return tue(stelle.schluessel);
  }

  function schiebeZeiger(richtung) {
    lege(zeilenVon());
    if (stellen.length === 0) return;
    zeiger = (zeiger + richtung + stellen.length) % stellen.length;
    feldDran = stellen[zeiger].schluessel === "wort";
    if (feldDran) feldZeigen(); else feldVerbergen();
  }

  /* Enter bestätigt - immer, egal auf welcher der beiden Stellen der
     Zeiger gerade steht. Es gibt nur eine Sache zu tun. */
  function beiTaste(taste) {
    if (taste === "Tab" || taste === "ArrowDown") { schiebeZeiger(1); return null; }
    if (taste === "ArrowUp") { schiebeZeiger(-1); return null; }
    if (taste === "Enter") { pruefe(); return "eintreten"; }
    if (taste === "Escape") { sage(""); return null; }
    if (!feldDran) return null;
    if (taste === "Backspace") {
      versuch = versuch.slice(0, -1);
      return null;
    }
    if ([...String(taste)].length === 1) versuch += taste;
    return null;
  }

  function beiEinfuegen(inhalt) {
    versuch = String(inhalt).replace(/\s+/g, "");
    sage("Eingefügt. Jetzt auf Eintreten.", true);
    return "wort";
  }

  function setzeFenster(neueBreite, neueHoehe) {
    breite = Math.max(1, Math.round(neueBreite));
    hoehe = Math.max(1, Math.round(neueHoehe));
    return stufe;
  }

  function stand() {
    return { offen, versuch, meldung, meldungGut, feldDran, stufe };
  }

  return {
    zeichne, setzeFenster, beiZeiger, beiKlick, beiTaste, beiEinfuegen, stand,
    /* Wie im Vorlauf: die Stellen, die gerade anklickbar sind. Ohne sie
       ließe sich die Bedienung nur über Bildpunkte prüfen, die niemand
       ausrechnen kann. */
    stellenJetzt: () => stellen.map((s) => ({ ...s }))
  };
}
