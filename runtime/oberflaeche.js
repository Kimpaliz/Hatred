/* [Aufgabe: Oberfläche] Die Anzeige über dem Bild: Aktionspunkte, Zugleiste,
   Lebensbalken, Aktionsleiste, Zielangabe, Höhenangabe, Lauftext, Spielerleiste.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Der Auftraggeber programmiert nicht. Alles, was er wissen muss, um eine
   Entscheidung zu treffen, muss **auf dem Bildschirm** stehen — in normalen
   deutschen Sätzen, ohne ein einziges Fachwort. Diese Datei ist die einzige
   Stelle, an der das geschieht.

   Drei Entscheidungen tragen den ganzen Aufbau:

   1. **Die Kostenvorschau ist die wichtigste Rückmeldung des Spiels.** Ein
      Zug, dessen Preis man erst nach dem Klicken sieht, ist kein taktisches
      Spiel, sondern ein Ratespiel. Deshalb leuchten die Punkte, die die
      geplante Aktion kosten würde, **vor** dem Klicken auf — und zwar an der
      Figur, nicht am Bildschirmrand, wo der Blick gerade nicht ist.
   2. **Die Begründung ist wichtiger als die Zahl.** „65 %" sagt niemandem,
      was er ändern soll. „+12 % von oben, -20 % durch Deckung" sagt: geh
      höher, schieß nicht durch das Fass. Deshalb steht unter jeder
      Trefferchance, woraus sie besteht — jeder Summand einzeln.
   3. **Keine einzige Zahl wird hier ausgerechnet.** Trefferchance, Kosten,
      Sturzschaden und die Liste der möglichen Aktionen kommen aus `spiel/`.
      Rechnete die Anzeige mit, gäbe es zwei Wahrheiten über „was kostet das"
      — und die eine, die der Spieler sieht, wäre die falsche (Fehlerbuch E2).

   ── Warum Zeichenblatt, Schrift und Kamera hereingereicht werden ───

   Diese Datei holt sich nichts. Sie bekommt `ctx`, `schrift` und `kamera`
   und rührt sonst nichts an. Das ist der Grund, warum sie ohne Browser
   prüfbar ist: `werkzeuge/pruefe-oberflaeche.mjs` reicht ein Blatt herein,
   das jeden Aufruf mitschreibt, und eine Schrift, die jeden Text mitschreibt
   — und behauptet danach über die Mitschrift statt über das Auge.

   ── Warum jeder Aufruf durch die Schere geht ───────────────────────

   `schneide` ist der einzige Weg zum Zeichenblatt. Sie beschneidet jedes
   Rechteck auf das Fenster und **rundet dabei nichts**: Eine Zahl mit Komma
   käme also unverändert in der Mitschrift an und fiele auf. Genau die zwei
   Fehler, die man im fertigen Bild zuerst nicht sieht (Fehlerbuch D1), sind
   damit messbar: etwas außerhalb des Fensters und etwas auf einem halben
   Bildpunkt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/oberflaeche-leiste.js` — die Aktionsleiste und die Felder,
   die ein Finger trifft; sie bekommt von hier Schere, Schrift und Maße
   und trägt in die Feldliste ein, die `felder()` ausgibt.
   Dazu `runtime/palette.js` (jede Farbe), `runtime/licht.js` (`KACHEL`),
   `runtime/sprite-daten.js` (`SPIELER_FARBEN` für die Spielerleiste),
   `runtime/schrift.js` und `runtime/kamera.js` (beide hereingereicht),
   `spiel/aktionen.mjs` (`moeglicheAktionen`, `kostenVon` — die eine Wahrheit
   über erlaubt und Preis), `spiel/zug.mjs` (wer am Zug ist),
   `spiel/kampf.mjs` und `spiel/hoehen.mjs` (Trefferchance und ihre
   Summanden, Sturz), `spiel/wesen.mjs` (Rüstung), `spiel/gitter.mjs`,
   den vier Katalogen unter `spiel/katalog/` (Namen, Preise, Waffen) und
   `werkzeuge/pruefe-oberflaeche.mjs`. Schreibt selbst **nie** in den
   Zustand. */

import { FARBEN } from "./palette.js";
import { KACHEL } from "./licht.js";
import { SPIELER_FARBEN } from "./sprite-daten.js";
import { macheLeiste } from "./oberflaeche-leiste.js";

import { EBENEN, FLUESSIG, HINDERNIS, schussweite } from "../spiel/gitter.mjs";
import { amZugWesen, wesenMitId } from "../spiel/zug.mjs";
import { kostenVon } from "../spiel/aktionen.mjs";
import {
  TREFFER_HOECHSTENS, TREFFER_MINDESTENS, ausweichAnteil, inReichweite,
  reichweiteVon, ruestungAbzug, trefferChance
} from "../spiel/kampf.mjs";
import {
  AUFSTIEG_KOSTEN, DECKUNG_MALUS, WASSER_ZUSCHLAG, betretenSchaden,
  hatDeckung, hoehenVorteil, sturzSchaden, sturzTiefe, trefferBonus
} from "../spiel/hoehen.mjs";
import { ruestungVon } from "../spiel/wesen.mjs";
import { mittlererSchaden, waffe, kenntWaffe } from "../spiel/katalog/waffen.mjs";
import { held, kenntHeld } from "../spiel/katalog/helden.mjs";
import { gegner, kenntGegner } from "../spiel/katalog/gegner.mjs";

/* ── Die Maße der Anzeige ───────────────────────────────────────────
   Alle in **logischen** Punkten; gezeichnet wird mit der ganzzahligen
   Vergrößerung der Kamera multipliziert. Damit bleibt die Anzeige auf
   jedem Bildschirm gleich groß im Verhältnis zur Figur — und jede Kante
   liegt auf einem ganzen Bildpunkt. */
const POLSTER = 2;          /* Luft zwischen Rahmen und Text            */
const RAHMEN = 1;           /* Strichstärke eines Kastens               */
const PUNKT_GROSS = 2;      /* Kantenlänge eines Aktionspunktes         */
const PUNKT_LUECKE = 1;     /* Lücke zwischen zwei Punkten              */
/* Vier und nicht zwei: Der Balken hat einen Rahmen von einem logischen
   Punkt auf jeder Seite. Bei zwei bliebe innen **null** übrig — bei
   einfacher Vergrößerung wäre der Balken dann unsichtbar, und zwar
   lautlos: Der Rahmen stünde da, die Farbe fehlte. */
const BALKEN_HOCH = 4;      /* Höhe eines Lebensbalkens                 */

/* Wie viele Wesen die Zugleiste zeigt. Acht, weil das die Runde eines
   vollen Tisches (vier Jäger, vier Brut) genau abdeckt — wer weiter
   voraus plant, plant an der Wacht der Gegner vorbei. */
export const ZUGLEISTE_WESEN = 8;

/* Wie viele Sätze der Lauftext hält. Sechs ist gemessen, nicht geraten:
   Ein Angriff wirft bis zu fünf Ereignisse (Angriff, Schaden, Stoß,
   Sturz, Tod). Bei fünf Zeilen wäre der Anfang des eigenen Zuges schon
   weggescrollt, bevor man ihn gelesen hat. */
export const LAUFTEXT_ZEILEN = 6;

/* Wie lange „Runde N" stehen bleibt, in Sekunden. */
export const RUNDE_EINBLENDUNG = 1.6;

/* Ab wann ein Lebensbalken die Farbe wechselt. */
export const LEBEN_GUT = 0.6;
export const LEBEN_WARN = 0.3;

/* Die Tasten stehen bei der Leiste, weil sie dort gebraucht werden —
   weitergereicht werden sie von hier, damit `runtime/eingabe.js` und die
   Prüfung ihren Einfuhrpfad behalten und nicht zwei Stellen kennen. */
export { TASTEN, FAEHIGKEIT_TASTEN, FINGER_MINDESTMASS } from "./oberflaeche-leiste.js";

/* ── Namen für Zahlen ───────────────────────────────────────────────
   `spiel/` kennt nur Schlüssel. Hier bekommen sie deutsche Wörter — an
   genau einer Stelle, damit „Spieß" nicht an drei Orten anders heißt. */
const HINDERNIS_NAMEN = {
  [HINDERNIS.keins]: "Nichts",
  [HINDERNIS.wand]: "Die Wand",
  [HINDERNIS.saeule]: "Die Säule",
  [HINDERNIS.fass]: "Das Fass",
  [HINDERNIS.kiste]: "Die Kiste",
  [HINDERNIS.spiess]: "Der Spieß",
  [HINDERNIS.altar]: "Der Altar",
  [HINDERNIS.gitter]: "Das Gitter",
  [HINDERNIS.fackelsockel]: "Der Fackelsockel",
  [HINDERNIS.sarg]: "Der Sarg",
  [HINDERNIS.truhe]: "Die Truhe"
};

const SCHADEN_NAMEN = {
  hieb: "Hieb", stich: "Stich", feuer: "Feuer",
  arkan: "Zauber", gift: "Gift", sturz: "Sturz"
};

const SEITEN_NAMEN = { jaeger: "Jäger", brut: "Brut" };
const BEUTE_NAMEN = { trank: "einen Trank", gold: "Gold" };

/* ── Kleine Rechnungen, die keine Regel sind ────────────────────────*/

const ganz = (wert) => Math.round(wert);
const prozent = (anteil) => Math.round(anteil * 100);

/* Mit Vorzeichen, für die Begründungszeilen: „+12", „-20". Das
   Minuszeichen ist ein gewöhnlicher Bindestrich — der Gedankenstrich
   steht nicht im Zeichenvorrat von `runtime/schrift.js`. */
function mitZeichen(zahl) {
  return (zahl > 0 ? "+" : "-") + Math.abs(zahl);
}

/* Der Name eines Wesens, so wie ihn ein Mensch sagt. Ein Jäger heißt
   nach seinem Spieler, sobald der einen Namen hat — sonst stünden bei
   vier Spielern viermal Klassennamen in der Zugleiste und niemand
   wüsste, wer davon er selbst ist. */
export function nameVon(zustand, wesenOderId) {
  const wesen = typeof wesenOderId === "object" && wesenOderId !== null
    ? wesenOderId
    : wesenMitId(zustand, wesenOderId);
  if (!wesen) return "Jemand";
  if (wesen.spielerPlatz && Array.isArray(zustand && zustand.spieler)) {
    const eintrag = zustand.spieler.find((s) => s && s.platz === wesen.spielerPlatz);
    if (eintrag && typeof eintrag.name === "string" && eintrag.name !== "") return eintrag.name;
  }
  if (kenntHeld(wesen.art)) return held(wesen.art).name;
  if (kenntGegner(wesen.art)) return gegner(wesen.art).name;
  return typeof wesen.art === "string" && wesen.art !== "" ? wesen.art : "Jemand";
}

/* Ein Ereignis als deutscher Satz.

   Diese Funktion ist der Grund, warum der Lauftext keine Kürzel zeigt:
   Das Bild bekommt vom Kern flache Objekte mit Zahlen-IDs, und ein
   Mensch liest keine Zahlen-IDs. Jede Ereignisform aus dem Vertrag
   bekommt hier genau einen Satz — und eine unbekannte Form fällt als
   Satz auf, statt still zu verschwinden. */
export function satzVon(zustand, ereignis) {
  if (!ereignis || typeof ereignis !== "object") return "Etwas ohne Namen geschieht.";
  const wer = () => nameVon(zustand, ereignis.wer);
  const ziel = () => nameVon(zustand, ereignis.ziel);

  switch (ereignis.art) {
    case "bewegt": {
      const felder = Array.isArray(ereignis.pfad) ? Math.max(0, ereignis.pfad.length - 1) : 0;
      return `${wer()} geht ${felder} Feld${felder === 1 ? "" : "er"} weit.`;
    }
    case "gestuerzt":
      return `${wer()} stürzt ${ereignis.stufen} Ebenen tief und nimmt `
        + `${ereignis.schaden} Schaden.`;
    case "angriff":
      return ereignis.treffer
        ? `${wer()} trifft ${ziel()}.`
        : `${wer()} zielt auf ${ziel()} und verfehlt.`;
    case "schaden": {
      const wodurch = SCHADEN_NAMEN[ereignis.art2] || "einen Treffer";
      return `${wer()} nimmt ${ereignis.wieviel} Schaden durch ${wodurch}, `
        + `noch ${ereignis.lpRest} Leben.`;
    }
    case "gestossen":
      return `${wer()} wird ein Feld weit gestoßen.`;
    case "gestorben":
      return `${wer()} fällt und steht nicht wieder auf.`;
    case "apGesetzt":
      return `${wer()} hat ${ereignis.ap} Aktionspunkte.`;
    case "wacht":
      return `${wer()} geht auf Wacht und hält die Waffe bereit.`;
    case "wachtLoest":
      return `${wer()} schlägt aus der Wacht auf ${ziel()} zu.`;
    case "hindernisWeg": {
      const was = HINDERNIS_NAMEN[ereignis.was] || "Etwas";
      return `${was} auf ${ereignis.x}, ${ereignis.y} zerbricht.`;
    }
    case "lichtNeu":
      return `Auf ${ereignis.x}, ${ereignis.y} brennt jetzt ein Licht.`;
    case "lichtWeg":
      return `Das Licht auf ${ereignis.x}, ${ereignis.y} erlischt.`;
    case "zugEnde":
      return `${wer()} beendet den Zug.`;
    case "rundeNeu":
      return `Runde ${ereignis.nummer} beginnt.`;
    case "seiteDran":
      return `Jetzt ist die ${SEITEN_NAMEN[ereignis.seite] || "Seite"} am Zug.`;
    case "beute":
      return `${wer()} findet ${BEUTE_NAMEN[ereignis.was] || "etwas"}.`;
    case "ebeneGewechselt":
      return `${wer()} wechselt von Ebene ${ereignis.von} auf Ebene ${ereignis.nach}.`;
    case "laufEnde":
      return ereignis.grund === "sieg"
        ? "Der Kerker ist bezwungen. Die Treppe führt hinab."
        : "Alle Jäger sind gefallen. Der Kerker behält sie.";
    default:
      return "Etwas geschieht, wofür es noch keinen Satz gibt.";
  }
}

/* ── Die Hülle ──────────────────────────────────────────────────────*/

export function macheOberflaeche({ ctx, schrift, kamera } = {}) {
  if (!ctx || typeof ctx.fillRect !== "function") {
    throw new Error("macheOberflaeche: ein Zeichenblatt mit fillRect muss herein");
  }
  if (!schrift || typeof schrift.zeichne !== "function"
    || typeof schrift.breiteVon !== "function" || !Number.isFinite(schrift.ZEILE)) {
    throw new Error("macheOberflaeche: die Schrift braucht zeichne, breiteVon und ZEILE");
  }
  if (!kamera || typeof kamera.feldNachBild !== "function") {
    throw new Error("macheOberflaeche: eine Kamera mit feldNachBild muss herein");
  }

  /* Die Maße eines Bildes. Sie werden zu Beginn jedes `zeichne` neu aus
     der Kamera geholt — das Fenster kann sich zwischen zwei Bildern
     geändert haben, und eine zweite Kopie wäre eine zweite Wahrheit. */
  let stufe = 1;
  let breite = 1;
  let hoehe = 1;
  let polster = POLSTER;
  let zeile = schrift.ZEILE;
  let gezeichnet = 0;

  /* Die Felder, die ein Finger treffen kann. Die Liste wird **beim
     Zeichnen** gefüllt: `merke` trägt jedes Feld in dem Augenblick ein,
     in dem es gemalt wird, mit genau den Maßen, mit denen gemalt wurde.
     Eine zweite Rechnung daneben liefe auseinander (Fehlerbuch E2), und
     zwar lautlos — der Finger träfe daneben, und niemand sähe warum.
     Vor dem ersten Bild ist die Liste deshalb leer und nicht geraten. */
  const felderListe = [];

  function hole() {
    stufe = Math.max(1, Math.floor(kamera.vergroesserung || 1));
    breite = Math.max(1, Math.floor(kamera.fensterBreite || 1));
    hoehe = Math.max(1, Math.floor(kamera.fensterHoehe || 1));
    polster = POLSTER * stufe;
    zeile = schrift.ZEILE * stufe;
  }

  /* ── Die Schere ───────────────────────────────────────────────────
     Der einzige Weg zum Zeichenblatt. Sie schneidet am Fensterrand ab
     und rundet **nicht**: Wer eine 12,5 hereinreicht, bekommt sie in
     der Mitschrift zurück, statt sie stillschweigend geradezubiegen. */
  function schneide(x, y, b, h) {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(breite, x + b);
    const y1 = Math.min(hoehe, y + h);
    if (!(x1 > x0) || !(y1 > y0)) return false;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    gezeichnet++;
    return true;
  }

  function fuelle(x, y, b, h, farbe) {
    ctx.fillStyle = farbe;
    return schneide(x, y, b, h);
  }

  /* Dasselbe Blatt für die Schrift: `schrift.zeichne` setzt `fillStyle`
     und ruft `fillRect` — beides geht hier durch dieselbe Schere. Ein
     Text am Fensterrand wird damit abgeschnitten statt hinausgemalt. */
  const schere = {
    get fillStyle() { return ctx.fillStyle; },
    set fillStyle(wert) { ctx.fillStyle = wert; },
    get imageSmoothingEnabled() { return false; },
    set imageSmoothingEnabled(wert) { ctx.imageSmoothingEnabled = wert; },
    fillRect(x, y, b, h) { schneide(x, y, b, h); }
  };

  function schreibe(text, x, y, farbe, gross = stufe) {
    const inhalt = String(text === undefined || text === null ? "" : text);
    if (inhalt === "") return 0;
    return schrift.zeichne(schere, inhalt, x, y, farbe, { gross, schatten: true });
  }

  const textBreite = (text) => schrift.breiteVon(String(text)) * stufe;

  /* Kürzt auf die verfügbare Breite und setzt einen Punkt ans Ende, damit
     man sieht, dass etwas fehlt. Gemessen wird mit `breiteVon` — derselben
     Rechnung, mit der auch gezeichnet wird. */
  function kuerze(text, hoechstens) {
    let inhalt = String(text);
    if (textBreite(inhalt) <= hoechstens) return inhalt;
    while (inhalt.length > 1 && textBreite(inhalt + ".") > hoechstens) {
      inhalt = inhalt.slice(0, -1);
    }
    return inhalt.length > 1 ? inhalt + "." : "";
  }

  function kasten(x, y, b, h) {
    fuelle(x, y, b, h, FARBEN.hudGrund);
    const strich = RAHMEN * stufe;
    fuelle(x, y, b, strich, FARBEN.hudRahmen);
    fuelle(x, y + h - strich, b, strich, FARBEN.hudRahmen);
    fuelle(x, y, strich, h, FARBEN.hudRahmen);
    fuelle(x + b - strich, y, strich, h, FARBEN.hudRahmen);
  }

  /* Ein Kasten aus Zeilen `{text, farbe}`. Erst messen, dann malen —
     die Aufrufer setzen ihn rechts oder unten bündig und brauchen dafür
     die Maße, bevor der erste Punkt fällt. */
  function kastenMass(zeilen, hoechstBreite) {
    let inhalt = 0;
    for (const z of zeilen) inhalt = Math.max(inhalt, textBreite(z.text));
    return {
      breite: Math.min(hoechstBreite, inhalt + 2 * polster),
      hoehe: zeilen.length * zeile + 2 * polster
    };
  }

  function maleKasten(zeilen, x, y, mass) {
    kasten(x, y, mass.breite, mass.hoehe);
    let zy = y + polster;
    for (const z of zeilen) {
      schreibe(kuerze(z.text, mass.breite - 2 * polster), x + polster, zy, z.farbe);
      zy += zeile;
    }
  }

  /* Die Farbe eines Spielerplatzes. `SPIELER_FARBEN` trägt **Namen** aus
     der Palette, keine Hexwerte — deshalb der Umweg über `FARBEN`. */
  function spielerTon(platz, welche = "hell") {
    if (!Number.isInteger(platz) || platz < 1) return FARBEN.hudSchrift;
    const eintrag = SPIELER_FARBEN[(platz - 1) % SPIELER_FARBEN.length];
    if (!eintrag) return FARBEN.hudSchrift;
    return FARBEN[eintrag[welche]] || FARBEN.hudSchrift;
  }

  const zugHoehe = () => zeile + 2 * polster;

  /* Die Maße ohne die Leiste. Sie gehen an die Leiste hinein, damit die
     dort nicht ein zweites Mal aus der Kamera rechnet — wie hoch die
     Leiste selbst wird, weiß umgekehrt nur sie. */
  function rohMasse() {
    hole();
    return { stufe, breite, hoehe, polster, zeile };
  }

  const leiste = macheLeiste({
    fuelle, schreibe, kasten, textBreite, kuerze,
    masse: rohMasse,
    merke: (feld) => felderListe.push(feld)
  });

  /* ── Aktionspunkte über der Figur ─────────────────────────────────

     Die Punkte, die die geplante Aktion kosten würde, leuchten in
     `FARBEN.apKosten` — und diese Farbe wird **nirgends sonst** in der
     Anzeige benutzt. Nur dadurch lässt sich in der Mitschrift zählen,
     wie viele Punkte hervorgehoben waren. */
  /* Wo die Punktreihe eines Wesens liegt. Als eigene Auskunft, weil zwei
     andere sie brauchen: die Eingabe, um zu wissen, worüber der Zeiger
     steht, und die Prüfung, um die Reihe im Bild wiederzufinden. Würde
     jede von ihnen die Lage selbst ausrechnen, gäbe es drei Rechnungen
     für eine Stelle - und zwei davon wären irgendwann falsch. */
  function apReihe(wesen) {
    hole();
    const apMax = Math.max(0, Math.round((wesen && wesen.apMax) || 0));
    const gross = PUNKT_GROSS * stufe;
    const schritt = (PUNKT_GROSS + PUNKT_LUECKE) * stufe;
    const gesamt = apMax * schritt - PUNKT_LUECKE * stufe;
    const ecke = kamera.feldNachBild((wesen && wesen.x) || 0, (wesen && wesen.y) || 0);
    return {
      x: ecke.x + Math.floor((KACHEL * stufe - gesamt) / 2),
      y: ecke.y - (BALKEN_HOCH + PUNKT_GROSS + 2) * stufe,
      gross, schritt, anzahl: apMax
    };
  }

  function maleAktionspunkte(wesen, kosten) {
    const reihe = apReihe(wesen);
    if (reihe.anzahl <= 0) return;
    const ap = Math.max(0, Math.min(reihe.anzahl, Math.round(wesen.ap || 0)));

    /* Wie viele der noch vorhandenen Punkte die Aktion frisst. Reicht es
       nicht, leuchten alle übrigen in der Warnfarbe - "zu teuer" ist eine
       andere Aussage als "kostet drei" und darf nicht gleich aussehen. */
    const bezahlbar = Number.isFinite(kosten) && kosten <= ap;
    const wieviele = Number.isFinite(kosten) ? Math.min(ap, Math.max(0, kosten)) : 0;
    const abStelle = bezahlbar ? ap - wieviele : 0;

    for (let i = 0; i < reihe.anzahl; i++) {
      let farbe = FARBEN.apLeer;
      if (i < ap) farbe = FARBEN.apVoll;
      if (wieviele > 0 && i >= abStelle && i < ap) {
        farbe = bezahlbar ? FARBEN.apKosten : FARBEN.hudSchlecht;
      }
      fuelle(reihe.x + i * reihe.schritt, reihe.y, reihe.gross, reihe.gross, farbe);
    }
  }

  /* ── Lebensbalken ─────────────────────────────────────────────────
     Drei Stufen, weil ein durchgehender Verlauf im Halbdunkel nicht
     ablesbar ist: Man sieht die Farbe, nicht die Länge. */
  function lebensFarbe(anteil) {
    if (anteil > LEBEN_GUT) return FARBEN.hudGut;
    if (anteil > LEBEN_WARN) return FARBEN.hudWarn;
    return FARBEN.hudSchlecht;
  }

  function maleLebensbalken(wesen) {
    const lpMax = Math.max(1, Math.round(wesen.lpMax || 1));
    const anteil = Math.max(0, Math.min(1, (wesen.lp || 0) / lpMax));
    const ecke = kamera.feldNachBild(wesen.x, wesen.y);
    const voll = KACHEL * stufe;
    const y0 = ecke.y - (BALKEN_HOCH + 1) * stufe;
    const hoch = BALKEN_HOCH * stufe;
    fuelle(ecke.x, y0, voll, hoch, FARBEN.kontur);
    const laenge = Math.round(anteil * (voll - 2 * stufe));
    if (laenge > 0) {
      fuelle(ecke.x + stufe, y0 + stufe, laenge, hoch - 2 * stufe, lebensFarbe(anteil));
    }
  }

  /* Wer bekommt einen Balken: alles, was lebt und im Fenster steht.
     `ansicht.sichtbar` darf die Menge weiter einschränken — welche Wesen
     man sieht, entscheidet `spiel/sicht.mjs` und nicht diese Datei.

     Zwei Spielstände, mit Absicht: Die **Stellen** kommen aus `schau`,
     der laufenden Abspielung — sonst spränge der Lebensbalken schon
     ans Ziel, während die Figur noch unterwegs ist. Die **Zahlen**
     kommen aus `zustand`, dem echten Stand: `geplanteKosten` fragt den
     Kern, und der Kern rechnet nur auf ganzen Feldern. */
  function maleWesen(zustand, schau, ansicht, dran) {
    const sichtbar = ansicht.sichtbar instanceof Set ? ansicht.sichtbar : null;
    for (const wesen of schau.wesen || []) {
      if (!wesen || !wesen.lebt) continue;
      if (sichtbar && !sichtbar.has(wesen.id)) continue;
      const ecke = kamera.feldNachBild(wesen.x, wesen.y);
      if (ecke.x > breite || ecke.y > hoehe) continue;
      if (ecke.x + KACHEL * stufe < 0 || ecke.y + KACHEL * stufe < 0) continue;
      maleLebensbalken(wesen);
    }
    if (!dran) return;
    const unterwegs = schau.nachId instanceof Map ? schau.nachId.get(dran.id) : null;
    maleAktionspunkte(unterwegs || dran, geplanteKosten(zustand, ansicht));
  }

  function geplanteKosten(zustand, ansicht) {
    if (!ansicht.geplant) return Infinity;
    return kostenVon(zustand, ansicht.geplant);
  }

  /* ── Zugleiste ────────────────────────────────────────────────────

     Tote werden **nicht** übersprungen, sondern durchgestrichen. Wer sie
     herausnimmt, verschiebt die ganze Reihe, und der Spieler zählt seinen
     nächsten Zug falsch ab. Der Strich sagt: der Platz war da, er ist
     leer. Umgelaufen wird über das Ende hinaus, damit auch am Rundenende
     acht Namen stehen. */
  function maleZugleiste(zustand, dran) {
    const hoch = zugHoehe();
    kasten(0, 0, breite, hoch);
    const ordnung = Array.isArray(zustand.ordnung) ? zustand.ordnung : [];
    if (ordnung.length === 0) return;

    if (zustand.vorbei) {
      const satz = zustand.vorbei === "sieg"
        ? "Der Lauf ist gewonnen."
        : "Der Lauf ist verloren.";
      schreibe(kuerze(satz, breite - 2 * polster), polster, polster, FARBEN.hudWarn);
      return;
    }

    const wieviele = Math.min(ZUGLEISTE_WESEN, ordnung.length);
    const platz = Math.floor((breite - 2 * polster) / ZUGLEISTE_WESEN);
    for (let i = 0; i < wieviele; i++) {
      const id = ordnung[(Math.max(0, zustand.amZug || 0) + i) % ordnung.length];
      const wesen = wesenMitId(zustand, id);
      const x = polster + i * platz;
      const jetzt = dran && wesen && wesen.id === dran.id && i === 0;
      if (jetzt) fuelle(x - stufe, polster - stufe, platz, zeile, FARBEN.hudRahmen);

      let farbe = FARBEN.hudMatt;
      if (wesen && wesen.lebt) {
        if (jetzt) farbe = FARBEN.hudSchrift;
        else if (wesen.spielerPlatz) farbe = spielerTon(wesen.spielerPlatz);
        else farbe = FARBEN.knochen1;
      }
      const text = kuerze(nameVon(zustand, wesen), platz - polster);
      const gemalt = schreibe(text, x, polster, farbe);
      /* Der Strich liegt auf der Mittellinie des Buchstabenkörpers und ist
         genau so breit wie der Name — daran erkennt ihn auch die Prüfung. */
      if (wesen && !wesen.lebt && gemalt > 0) {
        fuelle(x, polster + 3 * stufe, gemalt, stufe, FARBEN.hudSchlecht);
      }
    }
  }

  /* ── Spielerleiste ────────────────────────────────────────────────

     Der Verbindungszustand steht in Wörtern, nicht als Punkt in einer
     Farbe: „getrennt" versteht jeder sofort, ein roter Punkt bedeutet in
     jedem zweiten Programm etwas anderes. Fehlt die Angabe, ist der
     Spieler an diesem Rechner — dann steht „hier". */
  function maleSpielerleiste(zustand, ansicht) {
    const liste = Array.isArray(ansicht.spieler) && ansicht.spieler.length > 0
      ? ansicht.spieler
      : (zustand.spieler || []);
    if (liste.length === 0) return;

    const zeilen = [];
    for (const eintrag of liste) {
      if (!eintrag) continue;
      const stand = eintrag.verbunden === false
        ? "getrennt"
        : (eintrag.verbunden === true ? "verbunden" : "hier");
      const selbst = eintrag.selbst ? " (du)" : "";
      const name = typeof eintrag.name === "string" && eintrag.name !== ""
        ? eintrag.name
        : `Spieler ${eintrag.platz}`;
      zeilen.push({
        text: `${eintrag.platz}. ${name}${selbst}: ${stand}`,
        farbe: eintrag.verbunden === false ? FARBEN.hudSchlecht : spielerTon(eintrag.platz)
      });
    }
    if (zeilen.length === 0) return;

    const mass = kastenMass(zeilen, Math.floor(breite / 2));
    maleKasten(zeilen, breite - mass.breite - polster, zugHoehe() + polster, mass);
  }

  /* ── Zielangabe ───────────────────────────────────────────────────

     Jede Zeile ist ein Summand der Trefferchance, und jeder kommt aus
     `spiel/`. Hier wird nur `* 100` gerechnet und gerundet — die Regel,
     woher der Zuschlag kommt, steht in `spiel/hoehen.mjs`.

     Die Reihenfolge ist die Reihenfolge der Rechnung in
     `kampf.trefferChance`: Grundwert, Höhe, Deckung, Flinkheit. Wer sie
     ändert, macht aus einer Erklärung eine Aufzählung. */
  function zielZeilen(zustand, angreifer, ziel) {
    const karte = zustand.karte;
    if (!kenntWaffe(angreifer.waffe)) return null;
    const w = waffe(angreifer.waffe);
    const zeilen = [{ text: nameVon(zustand, ziel), farbe: FARBEN.hudSchrift }];

    const weite = schussweite(angreifer.x, angreifer.y, ziel.x, ziel.y);
    const traegt = reichweiteVon(karte, angreifer, ziel, w);
    if (weite > traegt) {
      zeilen.push({
        text: `Zu weit: ${weite} Felder, die Waffe trägt ${traegt}.`,
        farbe: FARBEN.hudSchlecht
      });
      return zeilen;
    }
    if (!inReichweite(karte, angreifer, ziel, w)) {
      zeilen.push({ text: "Keine freie Sichtlinie dorthin.", farbe: FARBEN.hudSchlecht });
      return zeilen;
    }

    const chance = trefferChance(karte, angreifer, ziel, w);
    zeilen.push({ text: `Trefferchance ${prozent(chance)} %`, farbe: FARBEN.hudSchrift });

    const rohRuestung = Math.max(0, ganz(ruestungVon(ziel)));
    const mittel = ganz(mittlererSchaden(w));
    const durch = ruestungAbzug(mittel, rohRuestung, w.schadensart);
    zeilen.push({ text: `Schaden etwa ${durch} bei Treffer`, farbe: FARBEN.hudSchrift });

    zeilen.push({
      text: `Grundwert der Waffe ${prozent(w.trefferGrund)} %`, farbe: FARBEN.hudMatt
    });

    const vorteil = hoehenVorteil(karte, angreifer.x, angreifer.y, ziel.x, ziel.y);
    if (vorteil !== 0) {
      const bonus = prozent(trefferBonus(vorteil));
      zeilen.push({
        text: `${mitZeichen(bonus)} % ${vorteil > 0 ? "von oben" : "von unten"}`,
        farbe: vorteil > 0 ? FARBEN.hudGut : FARBEN.hudSchlecht
      });
    }
    if (hatDeckung(karte, angreifer.x, angreifer.y, ziel.x, ziel.y)) {
      zeilen.push({
        text: `${mitZeichen(-prozent(DECKUNG_MALUS))} % durch Deckung`,
        farbe: FARBEN.hudSchlecht
      });
    }
    const ausweichen = ausweichAnteil(ziel);
    if (ausweichen > 0) {
      zeilen.push({
        text: `${mitZeichen(-prozent(ausweichen))} % durch Flinkheit`,
        farbe: FARBEN.hudSchlecht
      });
    }
    if (durch < mittel) {
      zeilen.push({
        text: `${mitZeichen(durch - mittel)} Schaden durch Rüstung`,
        farbe: FARBEN.hudSchlecht
      });
    }
    /* Wenn die Summe an eine Grenze stößt, steht das da. Sonst rechnet
       der Spieler die Zeilen nach und kommt auf eine andere Zahl. */
    if (chance >= TREFFER_HOECHSTENS) {
      zeilen.push({ text: `Mehr als ${prozent(TREFFER_HOECHSTENS)} % gibt es nie.`,
        farbe: FARBEN.hudMatt });
    } else if (chance <= TREFFER_MINDESTENS) {
      zeilen.push({ text: `Weniger als ${prozent(TREFFER_MINDESTENS)} % gibt es nie.`,
        farbe: FARBEN.hudMatt });
    }
    return zeilen;
  }

  function zielVon(zustand, ansicht) {
    const id = ansicht.ziel !== undefined && ansicht.ziel !== null
      ? ansicht.ziel
      : (ansicht.geplant ? ansicht.geplant.ziel : null);
    if (id === undefined || id === null) return null;
    const ziel = wesenMitId(zustand, id);
    return ziel && ziel.lebt ? ziel : null;
  }

  /* ── Höhenangabe ─────────────────────────────────────────────────

     Die Höhe des Feldes unter dem Zeiger und — die eigentliche Frage —
     ob der Weg dorthin ein Sturz wäre. Der Sturz ist die Regel, an der
     dieses Spiel hängt; wer ihn erst nach dem Klicken sieht, verliert
     eine Figur an eine Zahl, die er nicht kannte. */
  function hoehenZeilen(zustand, zeiger, dran) {
    const karte = zustand.karte;
    if (!karte || !karte.drin(zeiger.x, zeiger.y)) {
      return [{ text: "Außerhalb der Karte.", farbe: FARBEN.hudMatt }];
    }
    const ebene = karte.ebeneBei(zeiger.x, zeiger.y);
    const zeilen = [
      { text: `Feld ${zeiger.x}, ${zeiger.y}`, farbe: FARBEN.hudSchrift },
      { text: `Ebene ${ebene} von 0 bis ${EBENEN - 1}`, farbe: FARBEN.hudSchrift }
    ];
    if (karte.blocktBewegung(zeiger.x, zeiger.y)) {
      zeilen.push({ text: "Hier geht niemand durch.", farbe: FARBEN.hudSchlecht });
      return zeilen;
    }

    const fluessig = karte.fluessigBei(zeiger.x, zeiger.y);
    if (fluessig === FLUESSIG.wasser) {
      zeilen.push({
        text: `Wasser: ${WASSER_ZUSCHLAG} Punkt mehr je Feld.`, farbe: FARBEN.hudWarn
      });
    }
    const brennt = betretenSchaden(karte, zeiger.x, zeiger.y);
    if (brennt) {
      zeilen.push({
        text: `Lava: ${brennt.wieviel} Schaden beim Betreten.`, farbe: FARBEN.hudSchlecht
      });
    }

    if (dran) {
      const stufen = sturzTiefe(karte, dran.x, dran.y, zeiger.x, zeiger.y);
      if (stufen > 0) {
        zeilen.push({
          text: `Der Weg dorthin ist ein Sturz um ${stufen} Ebenen.`,
          farbe: FARBEN.hudSchlecht
        });
        zeilen.push({
          text: `${sturzSchaden(stufen)} Schaden, und der Zug ist zu Ende.`,
          farbe: FARBEN.hudSchlecht
        });
      } else if (ebene === karte.ebeneBei(dran.x, dran.y) + 1) {
        zeilen.push({
          text: `Hinauf nur über eine Rampe, ${AUFSTIEG_KOSTEN} Punkte.`,
          farbe: FARBEN.hudWarn
        });
      }
    }
    return zeilen;
  }

  /* ── Lauftext ────────────────────────────────────────────────────
     Der neueste Satz steht unten und am hellsten; ältere verblassen. So
     findet das Auge die neue Zeile, ohne die Liste zu lesen. */
  function maleLauftext(zustand, ansicht) {
    let saetze = [];
    if (Array.isArray(ansicht.meldungen)) {
      saetze = ansicht.meldungen.filter((s) => typeof s === "string" && s !== "");
    } else if (Array.isArray(zustand.ereignisse)) {
      saetze = zustand.ereignisse.map((e) => satzVon(zustand, e));
    }
    saetze = saetze.slice(-LAUFTEXT_ZEILEN);
    if (saetze.length === 0) return 0;

    const zeilen = saetze.map((text, i) => ({
      text,
      farbe: i === saetze.length - 1 ? FARBEN.hudSchrift : FARBEN.hudMatt
    }));
    const mass = kastenMass(zeilen, Math.floor(breite * 2 / 3));
    const y = hoehe - leiste.hoeheVon() - polster - mass.hoehe;
    maleKasten(zeilen, polster, y, mass);
    return mass.breite;
  }

  /* ── „Runde N" ───────────────────────────────────────────────────
     Nur Bild, keine Regel: Die Einblendung hängt allein an der Zeit, die
     der Aufrufer reicht. Fehlt sie, blendet nichts ein — das Spiel läuft
     trotzdem, und die Prüfung braucht keine Uhr. */
  function maleRunde(zustand, ansicht) {
    if (!Number.isFinite(ansicht.zeit) || !Number.isFinite(ansicht.rundeSeit)) return;
    const seit = ansicht.zeit - ansicht.rundeSeit;
    if (seit < 0 || seit >= RUNDE_EINBLENDUNG) return;

    const text = `Runde ${zustand.runde}`;
    const gross = 2 * stufe;
    const tb = schrift.breiteVon(text) * gross;
    const x = Math.floor((breite - tb) / 2);
    const y = Math.floor(hoehe / 3);
    kasten(x - 2 * polster, y - polster, tb + 4 * polster,
      schrift.ZEILE * gross + 2 * polster);
    schreibe(text, x, y, FARBEN.flammeHell, gross);
  }

  /* ── Das ganze Bild ──────────────────────────────────────────────

     `zustand` ist der echte Stand, `ansicht.schau` die laufende
     Abspielung — dieselben Wesen, aber auf Zwischenstellen zwischen
     zwei Feldern. Alles, was **rechnet**, bekommt den echten Stand:
     die Leiste, `kostenVon` und die Zielangabe fragen den Kern, und der
     Kern rechnet nur auf ganzen Feldern und wirft sonst
     (`spiel/sicht.mjs`, `spiel/wegfindung.mjs`). Nur die Stellen der
     Lebensbalken kommen aus der Abspielung. Fehlt `ansicht.schau`,
     ist beides derselbe Stand — dann steht auch nichts in Bewegung.

     `finger` sagt, dass ein Daumen bedient und kein Mauszeiger: Dann
     wird jedes Feld der Leiste mindestens `FINGER_MINDESTMASS` groß und
     die Leiste bricht um, statt die Felder zu quetschen. Ohne die
     Angabe bleibt jeder gezeichnete Punkt so, wie er vorher lag. */
  function zeichne(zustand, ansicht = {}, { finger = false } = {}) {
    gezeichnet = 0;
    felderListe.length = 0;
    hole();
    ctx.imageSmoothingEnabled = false;
    if (!zustand || !zustand.karte) return gezeichnet;
    const sicht = ansicht && typeof ansicht === "object" ? ansicht : {};
    const schau = sicht.schau && Array.isArray(sicht.schau.wesen) ? sicht.schau : zustand;
    const dran = amZugWesen(zustand);

    maleWesen(zustand, schau, sicht, dran);
    maleZugleiste(zustand, dran);
    maleSpielerleiste(zustand, sicht);
    leiste.maleAktionsleiste(zustand, sicht, dran, finger);
    const lauftextBreite = maleLauftext(zustand, sicht);

    /* Rechts unten, von unten nach oben gestapelt: erst die Zielangabe,
       darüber die Höhenangabe. Beide bleiben links vom Lauftext. */
    const platzRechts = Math.max(zeile, breite - lauftextBreite - 3 * polster);
    let unten = hoehe - leiste.hoeheVon() - polster;

    const ziel = zielVon(zustand, sicht);
    if (ziel && dran) {
      const zeilen = zielZeilen(zustand, dran, ziel);
      if (zeilen) {
        const mass = kastenMass(zeilen, platzRechts);
        unten -= mass.hoehe;
        maleKasten(zeilen, breite - mass.breite - polster, unten, mass);
        unten -= polster;
      }
    }
    if (sicht.zeiger && Number.isInteger(sicht.zeiger.x) && Number.isInteger(sicht.zeiger.y)) {
      const zeilen = hoehenZeilen(zustand, sicht.zeiger, dran);
      const mass = kastenMass(zeilen, platzRechts);
      unten -= mass.hoehe;
      maleKasten(zeilen, breite - mass.breite - polster, unten, mass);
    }

    maleRunde(zustand, sicht);
    return gezeichnet;
  }

  /* Die Maße dieses Bildes — damit Eingabe und Prüfung die Bänder
     treffen, ohne die Rechnung ein zweites Mal aufzuschreiben.
     `leisteHoehe` ist die Höhe der **zuletzt gezeichneten** Leiste — wie
     hoch sie wird, weiß nur die Leiste selbst. Vor dem ersten Bild gilt
     das schmale Maß. */
  function masse() {
    hole();
    return {
      stufe, breite, hoehe, polster, zeile,
      zugHoehe: zugHoehe(), leisteHoehe: leiste.hoeheVon()
    };
  }

  /* Die Felder, die ein Tipp treffen kann — in der Reihenfolge, in der
     sie gezeichnet wurden. Eine Kopie, damit niemand von außen an der
     einen Wahrheit über die Maße dreht. */
  const felder = () => felderListe.slice();

  return {
    zeichne, masse, felder, apReihe, zielZeilen, hoehenZeilen,
    aktionsGruppen: leiste.aktionsGruppen
  };
}
