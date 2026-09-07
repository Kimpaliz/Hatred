/* [Aufgabe: Oberfläche] Der Anfang: Zeichenblatt holen, Saat würfeln,
   Lauf bauen, Ereignisse abspielen — und alles zusammenhalten.

   ── Warum hier und nur hier gewürfelt wird ─────────────────────────

   `Math.random` kommt im ganzen Spiel genau einmal vor, nämlich in
   `wuerfleSaat`. Alles danach läuft aus dem gesäten Strom
   (`spiel/zufall.mjs`), und daran hängt der billige Koop: Vier Rechner
   bekommen dieselbe Saat und rechnen dieselbe Runde bitgleich. Ein
   zweiter Aufruf irgendwo tiefer im Spiel wäre kein Schönheitsfehler,
   sondern das Ende der Netzfähigkeit — deshalb steht der eine hier
   oben, wo man ihn sieht.

   ── Warum alles durch die Sitzung geht, auch allein ────────────────

   Es gibt genau **einen** Weg, mit dem sich der Spielstand ändert:
   `netz/sitzung.mjs → willAktion`. Auch ein Spieler ohne Mitspieler
   bekommt eine Sitzung, nur eben eine ohne Leitung. Das ist kein
   Umweg: Sonst gäbe es zwei Abläufe — einen für allein, einen fürs
   Netz —, und der seltener gespielte wäre der, in dem der Fehler
   sitzt. So ist Alleinspielen exakt der Netzfall mit null Gästen.

   Aus demselben Grund zieht die **Brut** hier nicht über
   `spieleBrutZug`: Der wendet die Aktionen unmittelbar an, und die
   Gäste erführen nie davon. Stattdessen holt der Gastgeber den Plan
   bei `planeZug` — der einzigen Stelle mit Spielverstand — und schiebt
   ihn Aktion für Aktion durch dieselbe Sitzung wie ein Mensch. Was
   hier steht, ist die Klammer aus `spiel/lauf.mjs` und kein zweiter
   Verstand: Vorschlag holen, prüfen lassen, ein abgelehnter Vorschlag
   beendet den Zug.

   ── Warum ein fester Zeitschritt für die Abspielung ────────────────

   Die Abspielung ist eine Uhr: eine Figur geht 0,11 Sekunden je Feld.
   Hinge dieser Schritt an der Bildrate, liefe dieselbe Bewegung auf
   einem 144-Hz-Bildschirm anders als auf 60 Hz — und ein Sturz wäre
   auf dem schnellen Rechner vorbei, bevor man ihn gesehen hat. Also:
   Logik in festen Portionen, Bild so oft wie möglich.

   Gedeckelt wird beides. Ein Reiterwechsel liefert beim Zurückkommen
   eine Lücke von Sekunden; ohne Deckel holte das Spiel sie in einem
   einzigen Bild nach, und alle Teilchen wären auf einmal alt.

   ── Warum keine Kostenvorschau nachgebaut wird ─────────────────────

   `runtime/eingabe.js` rechnet die Kosten der Aktion unter dem Zeiger
   bereits aus und gibt sie in `ansicht().kosten` heraus. Diese Datei
   **zeigt diese Zahl** und baut sich keine zweite Aktion, aus der sie
   dieselben Kosten noch einmal ableitet: Eine Vorschau, die etwas
   anderes verspricht, als der Zug dann tut, ist eine Lüge an den
   Spieler — und genau so entstünde sie.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `index.html` (holt diese Datei), `runtime/torwaechter.js` (das Tor
   vor dem Vorlauf — was der Riegel ist und was nicht, steht dort),
   `runtime/lobby.js` (der Vorlauf,
   bekommt `wuerfleSaat` und gibt `beiStart` zurück), `runtime/kamera.js`,
   `runtime/zeichnen.js`, `runtime/licht.js`, `runtime/partikel.js`,
   `runtime/oberflaeche.js`, `runtime/eingabe.js`, `runtime/schrift.js`,
   `spiel/lauf.mjs` (`macheLauf`, `naechsteTiefe`), `spiel/gegner-ki.mjs`
   (`planeZug`), `spiel/zug.mjs`, `spiel/sicht.mjs`, `spiel/wesen.mjs`,
   `netz/sitzung.mjs` (der einzige Ausgang jeder Aktion), `sw.js`
   (wird von hier angemeldet), `werkzeuge/pruefe-einstieg.mjs`,
   `werkzeuge/pruefe-app.mjs`, `werkzeuge/pruefe-tippen.mjs`. */

import { FARBEN } from "./palette.js";
import * as schrift from "./schrift.js";
import { KACHEL, macheLichtwerk } from "./licht.js";
import { machePartikelwerk } from "./partikel.js";
import { macheKamera, vergroesserungFuer } from "./kamera.js";
import { macheZeichner } from "./zeichnen.js";
import { macheOberflaeche } from "./oberflaeche.js";
import { ZEIGER_FINGER, macheEingabe } from "./eingabe.js";
import { macheLobby, lesbar } from "./lobby.js";
import { macheTor, torErinnert } from "./torwaechter.js";
import { AKTION } from "../spiel/aktionen.mjs";
import { macheLauf, naechsteTiefe } from "../spiel/lauf.mjs";
import { SEITE_BRUT, amZugWesen, wesenMitId } from "../spiel/zug.mjs";
import { planeZug } from "../spiel/gegner-ki.mjs";
import { sichtbarFuer } from "../spiel/sicht.mjs";
import { istJaeger } from "../spiel/wesen.mjs";
import { macheSitzung } from "../netz/sitzung.mjs";
import { SAAT_HOECHSTENS } from "../netz/lobbycode.mjs";
import { TEMPO, ZAHL_STEIGT, ZAHL_HOCH, macheAbspieler } from "./abspieler.js";

/* Der feste Schritt der Abspielung. 1/60 ist der kleinste, den jeder
   Bildschirm mindestens einmal je Bild macht. */
export const SCHRITT = 1 / 60;

/* Wie viele Logikschritte ein einzelnes Bild höchstens nachholt —
   Begründung in der Kopfnotiz. */
export const HOECHSTENS_SCHRITTE = 5;

/* ── Ein Spiel ──────────────────────────────────────────────────────

   Alles, was zwischen einem gebauten Lauf und dem Bildschirm liegt. Es
   ist eine eigene Funktion, damit eine Ebene tiefer (`naechsteTiefe`)
   dasselbe noch einmal entstehen kann — und damit die Prüfung es ohne
   Browser bauen und ein Bild anfordern kann. */
export function macheSpiel({
  ctx, zustand, sitzung, platz = null, leinwand = null,
  fensterBreite = 960, fensterHoehe = 540, fingerVoraus = null
} = {}) {
  if (!ctx || typeof ctx.fillRect !== "function") {
    throw new Error("macheSpiel: ein Zeichenblatt mit fillRect muss herein");
  }
  if (!zustand || !zustand.karte) throw new Error("macheSpiel: ohne Spielstand geht nichts");
  if (!sitzung) throw new Error("macheSpiel: ohne Sitzung gäbe es keinen Weg für eine Aktion");

  const kamera = macheKamera({ fensterBreite, fensterHoehe, karte: zustand.karte });
  const lichtwerk = macheLichtwerk(zustand.karte);
  const partikelwerk = machePartikelwerk();
  const zeichner = macheZeichner({ ctx, kamera, lichtwerk, partikelwerk });
  const flaeche = macheOberflaeche({ ctx, schrift, kamera });

  const meldungen = [];
  const abspieler = macheAbspieler({
    partikelwerk, kamera, lichtwerk,
    beiSatz: (satz) => melde(satz)
  });

  /* Was der Vorlauf weiß, bis die Eingabe ihr erstes Ereignis sah. */
  const fingerZuvor = () => typeof fingerVoraus === "function" && fingerVoraus();

  const eingabe = macheEingabe({
    leinwand, kamera, platz,
    zustand: () => zustand,
    /* Wo die Knöpfe der Leiste liegen, weiß nur die Anzeige, die sie
       gezeichnet hat. Ohne diese Zeile sind sie zwar zu sehen, aber
       kein Tipp findet sie — er ginge als Gehbefehl auf das Kartenfeld
       darunter. Gefragt wird bei jedem Tipp neu, weil `felder()` beim
       Zeichnen gefüllt wird: Sie ist damit die Leiste, die gerade
       wirklich auf dem Schirm steht, und keine zweite Rechnung
       (Fehlerbuch E2). */
    felderLesen: () => flaeche.felder(),
    /* Der einzige Ausgang. Alles, was ein Mensch anklickt, geht hier
       hinaus und kommt als Ereignis zurück. */
    sende: (aktion) => sitzung.willAktion(aktion)
  });

  let gesperrt = false;
  let letzterTaeter = null;
  let rest = 0;
  let letzteZeit = null;
  let rundeSeit = 0;
  let sichtSchluessel = "";
  let sichtbar = new Set();
  const erinnert = new Set();

  function melde(satz) {
    const sauber = lesbar(satz);
    if (sauber === "") return;
    meldungen.push(sauber);
    while (meldungen.length > 24) meldungen.shift();
  }

  sitzung.beiEreignissen((ereignisse, angaben) => {
    const wer = angaben && angaben.aktion ? angaben.aktion.wer : null;
    if (wer !== letzterTaeter) {
      const wesen = wesenMitId(zustand, wer);
      if (wesen && wesen.seite === SEITE_BRUT) abspieler.pause(TEMPO.brut);
      letzterTaeter = wer;
    }
    abspieler.lege(ereignisse);
  });
  sitzung.beiFehler((text) => melde(text));
  abspieler.lege(zustand.ereignisse || []);

  /* ── Sicht ──────────────────────────────────────────────────────

     Die Truppe teilt, was sie sieht: Was einer der Jäger im Blick hat,
     steht auf dem Bildschirm. Neu gerechnet wird nur, wenn sich etwas
     geändert hat — ein Sichtfeld je Bild und Held wären auf einer
     großen Karte tausende Sichtlinien in der Sekunde. */
  function frischeSicht() {
    const teile = [zustand.protokoll.length, zustand.runde, zustand.amZug];
    for (const wesen of zustand.wesen) {
      if (istJaeger(wesen) && wesen.lebt) teile.push(wesen.id, wesen.x, wesen.y);
    }
    const schluessel = teile.join(",");
    if (schluessel === sichtSchluessel) return;
    sichtSchluessel = schluessel;
    const neu = new Set();
    for (const wesen of zustand.wesen) {
      if (!istJaeger(wesen) || !wesen.lebt) continue;
      for (const feld of sichtbarFuer(zustand.karte, wesen)) {
        neu.add(feld);
        erinnert.add(feld);
      }
    }
    sichtbar = neu;
  }

  function sichtbareWesenIds() {
    const raus = new Set();
    for (const wesen of zustand.wesen) {
      if (!wesen.lebt) continue;
      if (istJaeger(wesen) || sichtbar.has(zustand.karte.index(wesen.x, wesen.y))) {
        raus.add(wesen.id);
      }
    }
    return raus;
  }

  /* ── Die Brut ───────────────────────────────────────────────────*/

  function brutZug() {
    if (zustand.vorbei) return false;
    if (!sitzung.stand().istGastgeber) return false;
    const dran = amZugWesen(zustand);
    if (!dran || dran.seite !== SEITE_BRUT) return false;

    const beenden = () => sitzung.willAktion({ typ: AKTION.zugEnde, wer: dran.id });
    const plan = planeZug(zustand, dran);
    if (plan.length === 0) { beenden(); return true; }
    for (const aktion of plan) {
      if (!sitzung.willAktion(aktion)) { beenden(); break; }
      if (aktion.typ === AKTION.zugEnde) break;
      const jetzt = amZugWesen(zustand);
      if (!jetzt || jetzt.id !== dran.id) break;
    }
    return true;
  }

  /* ── Der Takt ───────────────────────────────────────────────────*/

  function takte(zeit) {
    if (letzteZeit === null) { letzteZeit = zeit; return; }
    let dt = zeit - letzteZeit;
    letzteZeit = zeit;
    if (!(dt > 0)) return;
    if (dt > 0.25) dt = 0.25;
    rest += dt;

    let getan = 0;
    while (rest >= SCHRITT && getan < HOECHSTENS_SCHRITTE) {
      rest -= SCHRITT;
      getan++;
      abspieler.schritt(SCHRITT, zustand);
      if (!abspieler.beschaeftigt()) brutZug();
    }
    if (rest > SCHRITT * HOECHSTENS_SCHRITTE) rest = 0;

    const soll = abspieler.beschaeftigt();
    if (soll !== gesperrt) {
      gesperrt = soll;
      eingabe.sperre(soll);
    }
  }

  /* ── Das Bild ───────────────────────────────────────────────────*/

  function merkerVon(sicht) {
    const marken = [];
    for (const wesen of zustand.wesen) {
      if (wesen.lebt && wesen.wacht) marken.push({ x: wesen.x, y: wesen.y, zeichen: "wachtauge" });
    }
    if (sicht.warnung && sicht.warnung.feld) {
      marken.push({ x: sicht.warnung.feld.x, y: sicht.warnung.feld.y, zeichen: "sturzpfeil" });
    }
    return {
      reichweite: sicht.gesperrt ? null : sicht.reichweite,
      weg: sicht.wegVorschau,
      ziel: sicht.ziel ? { x: sicht.ziel.x, y: sicht.ziel.y } : null,
      marken
    };
  }

  function folgtAuf(schauZustand) {
    const dran = amZugWesen(schauZustand);
    if (dran) return { x: dran.x, y: dran.y };
    for (const wesen of schauZustand.wesen) {
      if (istJaeger(wesen) && wesen.lebt) return { x: wesen.x, y: wesen.y };
    }
    return { x: zustand.karte.breite / 2, y: zustand.karte.hoehe / 2 };
  }

  /* Die Zahlen über den Köpfen. Sie steigen und verblassen; gezeichnet
     wird auf ganzen Bildpunkten, weil `runtime/schrift.js` rundet. */
  function maleZahlen() {
    const gross = kamera.vergroesserung;
    for (const zahl of abspieler.zahlen()) {
      const anteil = Math.min(1, zahl.alter / ZAHL_STEIGT);
      const ecke = kamera.feldNachBild(zahl.x, zahl.y);
      const breite = schrift.breiteVon(zahl.text) * gross;
      schrift.zeichne(ctx, zahl.text,
        ecke.x + Math.round((KACHEL * gross - breite) / 2),
        ecke.y - Math.round(ZAHL_HOCH * anteil * gross),
        anteil > 0.75 ? FARBEN.hudMatt : zahl.farbe, { gross });
    }
  }

  /* Die Kosten der Aktion unter dem Zeiger — die Zahl aus
     `runtime/eingabe.js`, nicht eine zweite. */
  function maleKosten(sicht) {
    if (sicht.kosten === null || !sicht.zeigerFeld) return;
    const gross = kamera.vergroesserung;
    const ecke = kamera.feldNachBild(sicht.zeigerFeld.x, sicht.zeigerFeld.y);
    schrift.zeichne(ctx, `${sicht.kosten} AP`, ecke.x + KACHEL * gross,
      ecke.y - schrift.ZEILE * gross, FARBEN.apKosten, { gross });
  }

  function bild(zeit) {
    takte(zeit);
    frischeSicht();
    const sicht = eingabe.ansicht();
    const schauZustand = abspieler.schau(zustand);
    const alles = sicht.ganzeKarte;

    zeichner.bild(schauZustand, {
      sichtbar: alles ? null : sichtbar,
      erinnert: alles ? null : erinnert,
      merker: merkerVon(sicht),
      folgt: folgtAuf(schauZustand)
    }, zeit);

    maleZahlen();
    maleKosten(sicht);
    /* Der **echte** Stand geht an die Anzeige, die Abspielung nur als
       `schau` daneben. Die Anzeige fragt für die Aktionsleiste und die
       Zielangabe den Kern, und der rechnet ausschließlich auf ganzen
       Feldern — mitten in einer Bewegung steht eine Figur aber auf
       einer Zwischenstelle. Wer hier die Abspielung hineinreicht,
       bekommt keinen schiefen Text, sondern einen geworfenen Fehler
       und ein stehendes Bild.

       `finger` sagt der Anzeige, womit zuletzt bedient wurde. Die Antwort
       kommt aus der Eingabe und nicht aus einer eigenen Erkennung: Es gibt
       genau eine Stelle, die es weiß, und eine zweite liefe auseinander.
       Wer mit der Maus spielt, behält die schmale Leiste; wer tippt,
       bekommt die 48 Punkte. `fingerZuvor()` überbrückt allein das
       erste Bild: Da hat die Eingabe noch nichts gesehen, der Vorlauf
       aber sehr wohl. */
    flaeche.zeichne(zustand, {
      schau: schauZustand,
      geplant: null,
      ziel: sicht.ziel ? sicht.ziel.id : null,
      zeiger: sicht.zeigerFeld,
      meldungen,
      spieler: sitzung.spielerListe(),
      sichtbar: alles ? null : sichtbareWesenIds(),
      zeit,
      rundeSeit
    }, { finger: eingabe.istFinger() || fingerZuvor() });
    return zeichner.anzahlRechtecke();
  }

  function setzeFenster(breite, hoehe) {
    zeichner.setzeFenster(breite, hoehe);
    return kamera.setzeFenster(breite, hoehe);
  }

  /* Ein Rundenwechsel blendet „Runde N" ein. Er wird hier gemerkt und
     nicht im Abspieler: Die Einblendung ist Sache der Anzeige, und der
     Abspieler kennt keine Uhr des Bildschirms. */
  function merkeRunde(zeit) { rundeSeit = zeit; }

  return {
    bild, setzeFenster, merkeRunde,
    eingabe, kamera, abspieler,
    zustand: () => zustand,
    stand: () => ({
      runde: zustand.runde, tiefe: zustand.tiefe, vorbei: zustand.vorbei,
      wartend: abspieler.laenge(), gesperrt, meldungen: meldungen.length
    }),
    loese() { eingabe.loese(); }
  };
}

/* ── Der Zufall, genau einmal ───────────────────────────────────────*/

export function wuerfleSaat() {
  return Math.floor(Math.random() * (SAAT_HOECHSTENS + 1));
}

/* ── Die Zwischenablage ─────────────────────────────────────────────

   Der Einladungscode ist ein paar hundert Zeichen lang, und auf einem
   Zeichenblatt lässt sich nichts mit der Maus markieren. Kopieren muss
   also wirklich kopieren - sonst steht auf dem Bildschirm ein Code, an
   den niemand herankommt.

   Deshalb zwei Wege: der neue (`navigator.clipboard`, braucht eine
   sichere Adresse) und der alte über ein Feld, das für einen
   Wimpernschlag in der Seite steht. Der alte greift genau dort, wo der
   neue verweigert - beim Laden über `http://` im Heimnetz. */
export function macheAblage(schriftstueck) {
  const neuerWeg = () => {
    const navi = globalThis.navigator;
    return navi && navi.clipboard ? navi.clipboard : null;
  };
  return {
    async kopiere(text) {
      const ablage = neuerWeg();
      if (ablage && typeof ablage.writeText === "function") {
        try { await ablage.writeText(text); return; } catch { /* dann der alte Weg */ }
      }
      if (!schriftstueck || typeof schriftstueck.createElement !== "function") {
        throw new Error("keine Zwischenablage");
      }
      const feld = schriftstueck.createElement("textarea");
      feld.value = text;
      feld.setAttribute("readonly", "");
      feld.style.position = "fixed";
      feld.style.opacity = "0";
      schriftstueck.body.appendChild(feld);
      feld.select();
      let gelungen = false;
      try { gelungen = schriftstueck.execCommand("copy"); } catch { gelungen = false; }
      feld.remove();
      if (!gelungen) throw new Error("keine Zwischenablage");
    },
    async hole() {
      const ablage = neuerWeg();
      if (!ablage || typeof ablage.readText !== "function") {
        throw new Error("keine Zwischenablage");
      }
      return await ablage.readText();
    }
  };
}

/* ── Alles zusammenstecken ──────────────────────────────────────────

   Ab hier wird der Browser gebraucht. Der Aufruf steht ganz unten
   hinter einer Frage nach `document`: So lässt sich diese Datei in
   Node einlesen und prüfen, ohne dass sie ein Zeichenblatt sucht, das
   es dort nicht gibt. */
export function starte(blatt) {
  const ctx = blatt.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  let tor = null;
  let lobby = null;
  let spiel = null;
  let sitzung = null;
  let angaben = null;
  let pausiert = false;
  let letzteRunde = 0;

  /* Womit zuletzt ein Zeiger auf dem Blatt lag. Ohne diesen Merker
     beginnt der Kerker in der **Mausleiste**: `runtime/eingabe.js`
     entsteht erst mit dem Spiel und hat bis zu ihrem ersten eigenen
     Ereignis keine Antwort — der allererste Tipp träfe 13 Punkte hohe
     Knöpfe und ginge daneben. Der Vorlauf weiß es längst; hier steht
     es, weil es hier entsteht, und die Eingabe bleibt unberührt. */
  let zuletztFinger = false;

  /* Die Maße in CSS-Punkten — `devicePixelRatio` geht **absichtlich
     nicht** ein. Auf Android ist er krumm (2,625): Die Maße damit
     multipliziert gäbe ein Blatt von 1081,5 Punkten Breite, also
     Bruchzahlen in jedem Rechteck darauf (Fehlerbuch D1), und
     schrumpfte jeden Fingerknopf von 48 Blattpunkten auf 18
     CSS-Punkte — keine vier Millimeter Daumen. Gemessen bei 412 x 915
     mit 2,625: Blatt 412 x 915, Vergrößerung 1 — ganzzahlig, und 48
     Punkte bleiben 48 (`node werkzeuge/pruefe-tippen.mjs`).

     Auf echte Gerätepunkte vergrößert der Browser selbst, mit
     `image-rendering: pixelated` aus `index.html`: nächster Nachbar,
     keine Glättung. Lieber Rand als ein weiches Bild. */
  function masse() {
    const breite = Math.max(1, Math.floor(blatt.clientWidth || globalThis.innerWidth || 960));
    const hoehe = Math.max(1, Math.floor(blatt.clientHeight || globalThis.innerHeight || 540));
    return { breite, hoehe };
  }

  function setzeBlatt() {
    const { breite, hoehe } = masse();
    if (blatt.width !== breite || blatt.height !== hoehe) {
      blatt.width = breite;
      blatt.height = hoehe;
    }
    /* Nach **jedem** Setzen der Maße erneut: Das Setzen stellt die
       Glättung zurück (Fehlerbuch D1). */
    ctx.imageSmoothingEnabled = false;
    return { breite, hoehe };
  }

  function passeAn() {
    const { breite, hoehe } = setzeBlatt();
    if (spiel) spiel.setzeFenster(breite, hoehe);
    if (lobby) lobby.setzeFenster(breite, hoehe);
    if (tor) tor.setzeFenster(breite, hoehe);
  }

  /* Die Vergrößerung, mit der dieses Blatt gerade arbeitet: ganzzahlig
     und mindestens 1, weil `vergroesserungFuer` abrundet. Sie steht
     hier heraus, damit die Prüfung sie bei jeder Fenstergröße und jedem
     `devicePixelRatio` nachmessen kann, ohne erst ein Spiel zu bauen. */
  function vergroesserung() {
    const { breite, hoehe } = masse();
    return vergroesserungFuer(breite, hoehe);
  }

  /* ── Vollbild und Querformat ────────────────────────────────────

     Beides braucht eine Nutzergeste, wird also nur aus einem Tipp
     heraus gerufen und nie aus einem Zeitgeber. Und beides darf
     fehlschlagen — der Normalfall: Kein Rechner dreht den Bildschirm,
     viele Handys auch nicht, und `screen.orientation` fehlt
     mancherorts ganz. Ein Spiel, das an einer abgelehnten Drehung
     stehenbliebe, wäre auf genau den Geräten hin, für die sie gedacht
     ist. Deshalb zweifach abgesichert: `try/catch` um den Aufruf und
     ein Fangarm am Versprechen. */
  function sperreQuerformat() {
    try {
      const dreh = globalThis.screen && globalThis.screen.orientation;
      if (!dreh || typeof dreh.lock !== "function") return;
      const versprechen = dreh.lock("landscape");
      if (versprechen && typeof versprechen.catch === "function") {
        versprechen.catch(() => {});
      }
    } catch { /* das Gerät kann es nicht - dann eben nicht */ }
  }

  function vollbild() {
    const drin = globalThis.document && globalThis.document.fullscreenElement;
    try {
      if (drin) { globalThis.document.exitFullscreen(); return; }
      if (!blatt.requestFullscreen) return;
      /* Gedreht wird erst nach dem **gelungenen** Vollbild: Solange die
         Seite noch im Fenster steht, lehnt Android die Sperre ab. Ältere
         Browser geben kein Versprechen zurück - dann sofort. */
      const versprechen = blatt.requestFullscreen();
      if (versprechen && typeof versprechen.then === "function") {
        versprechen.then(sperreQuerformat, () => {});
      } else sperreQuerformat();
    } catch { /* manche Browser verweigern es ohne Klick - dann eben nicht */ }
  }

  /* ── Das Tor und der Vorlauf ────────────────────────────────────

     Vor dem Vorlauf steht der Torwächter. War das Tor in diesem
     Browser schon einmal offen, entsteht es gar nicht erst und der
     Vorlauf beginnt wie eh und je - sonst tippte Jannik das Wort bei
     jedem Start neu. Was der Riegel ist und was nicht, steht in der
     Kopfnotiz von `runtime/torwaechter.js`; hier steht nur die
     Verdrahtung. */

  const { breite, hoehe } = setzeBlatt();
  if (torErinnert()) baueVorlauf(breite, hoehe);
  else {
    tor = macheTor({
      ctx, fensterBreite: breite, fensterHoehe: hoehe,
      beiOffen: () => {
        tor = null;
        const masse = setzeBlatt();
        baueVorlauf(masse.breite, masse.hoehe);
      }
    });
  }

  function baueVorlauf(b, h) {
    lobby = macheLobby({
      ctx, wuerfleSaat, fensterBreite: b, fensterHoehe: h,
      ablage: macheAblage(globalThis.document),
      beiStart: (was) => beginneSpiel(was)
    });
  }

  function beginneSpiel(was) {
    angaben = was;
    const zustand = macheLauf({
      saat: was.saat, spielerZahl: was.spielerZahl, tiefe: 1, heldenWahl: was.helden
    });
    baueSitzung(zustand, was);
    lobby = null;
  }

  function baueSitzung(zustand, was) {
    const leitungen = was.verbindungen || [];
    sitzung = macheSitzung({
      istGastgeber: was.istGastgeber,
      zustand,
      sendeAn: (wem, text) => { if (wem && typeof wem.sende === "function") wem.sende(text); },
      alleSenden: (text) => {
        for (const eintrag of leitungen) eintrag.verbindung.sende(text);
      }
    });
    for (const eintrag of leitungen) {
      eintrag.verbindung.beiEmpfang((text) => sitzung.empfange(text, eintrag.verbindung));
    }

    const { breite: b, hoehe: h } = setzeBlatt();
    spiel = macheSpiel({
      ctx, zustand, sitzung, leinwand: blatt,
      platz: was.istGastgeber ? 1 : was.platz,
      fensterBreite: b, fensterHoehe: h,
      fingerVoraus: () => zuletztFinger
    });
    spiel.setzeFenster(b, h);
    letzteRunde = zustand.runde;

    if (was.istGastgeber) sitzung.setzeName(was.name);
    else meldeDich(was.name);
  }

  /* Ein Gast meldet sich so lange an, bis er einen Platz hat. Der
     Gastgeber baut seine Sitzung erst, wenn **alle** Gäste verbunden
     sind — der erste Beitritt eines schnellen Gastes ginge sonst ins
     Leere, und niemand käme je in die Runde. */
  function meldeDich(name) {
    let versuche = 0;
    const uhr = globalThis.setInterval(() => {
      versuche++;
      if (!sitzung || sitzung.stand().platz !== 0 || versuche > 60) {
        globalThis.clearInterval(uhr);
        return;
      }
      sitzung.beitreten(name);
    }, 1000);
    sitzung.beitreten(name);
  }

  /* ── Eine Ebene tiefer ──────────────────────────────────────────

     Nur allein. Zu mehreren müsste der Abstieg über die Leitung
     abgestimmt werden, und dafür gibt es in `netz/nachrichten.mjs`
     keine Nachricht — diese Datei erfindet keine. */
  function tiefer() {
    if (!spiel || !angaben || (angaben.verbindungen || []).length > 0) return false;
    const alt = spiel.zustand();
    if (alt.vorbei !== "sieg") return false;
    spiel.loese();
    baueSitzung(naechsteTiefe(alt), angaben);
    return true;
  }

  /* ── Der Bildlauf ───────────────────────────────────────────────*/

  function pausenbild() {
    const gross = Math.max(1, Math.floor(blatt.width / 320));
    const text = "Pause - tippen oder klicken";
    ctx.fillStyle = FARBEN.kontur;
    ctx.fillRect(0, 0, blatt.width, blatt.height);
    schrift.zeichne(ctx, text,
      Math.round((blatt.width - schrift.breiteVon(text) * gross) / 2),
      Math.round((blatt.height - schrift.ZEILE * gross) / 2), FARBEN.hudSchrift, { gross });
  }

  function schlusszeile() {
    if (!spiel) return;
    const stand = spiel.stand();
    if (!stand.vorbei) return;
    const gross = Math.max(1, Math.floor(blatt.width / 320));
    const text = stand.vorbei === "sieg"
      ? (tieferMoeglich() ? "Ebene geschafft - tippen oder Leertaste" : "Ebene geschafft.")
      : "Die Truppe ist gefallen.";
    schrift.zeichne(ctx, lesbar(text),
      Math.round((blatt.width - schrift.breiteVon(lesbar(text)) * gross) / 2),
      Math.round(blatt.height / 3), FARBEN.gold1, { gross });
  }

  function tieferMoeglich() {
    return !!spiel && !!angaben && (angaben.verbindungen || []).length === 0
      && spiel.zustand().vorbei === "sieg";
  }

  function bild(jetzt) {
    const zeit = jetzt / 1000;
    if (pausiert) pausenbild();
    else if (spiel) {
      const zustand = spiel.zustand();
      if (zustand.runde !== letzteRunde) {
        letzteRunde = zustand.runde;
        spiel.merkeRunde(zeit);
      }
      spiel.bild(zeit);
      schlusszeile();
    } else if (tor) tor.zeichne(zeit);
    else if (lobby) lobby.zeichne(zeit);
    globalThis.requestAnimationFrame(bild);
  }

  /* ── Hörer ──────────────────────────────────────────────────────

     Die Lobby bekommt Zeiger und Tastatur, solange sie da ist; sobald
     das Spiel läuft, hört `runtime/eingabe.js` selbst mit. Getan wird
     danach hier nur noch eins: die Art des Zeigers merken. */
  function punktAus(fund) {
    const kasten = blatt.getBoundingClientRect();
    const x = (fund.clientX - kasten.left) * (blatt.width / (kasten.width || blatt.width));
    const y = (fund.clientY - kasten.top) * (blatt.height / (kasten.height || blatt.height));
    return { x, y };
  }

  function beiVorlaufZeiger(fund) {
    if (fund.pointerType) zuletztFinger = fund.pointerType === ZEIGER_FINGER;
    if (tor) { const wo = punktAus(fund); tor.beiZeiger(wo.x, wo.y); return; }
    if (!lobby) return;
    const punkt = punktAus(fund);
    lobby.beiZeiger(punkt.x, punkt.y);
  }

  function beiVorlaufDruck(fund) {
    /* Zuerst und immer: Der abgeschnittene Weg ist der zweite Lauf.
       Danach erst die Frage, wer gerade dran ist. */
    if (typeof fund.preventDefault === "function") fund.preventDefault();
    /* Vor der Frage nach der Lobby und auch danach: So kippt der Merker
       wieder zurück, wenn jemand im Spiel zur Maus greift. */
    if (fund.pointerType) zuletztFinger = fund.pointerType === ZEIGER_FINGER;
    if (pausiert) { pausiert = false; return; }
    /* Solange das Tor zu ist, bekommt es den Tipp - und nur es. */
    if (tor) { const wo = punktAus(fund); tor.beiKlick(wo.x, wo.y); return; }
    if (!lobby) { if (tieferMoeglich()) tiefer(); return; }
    const punkt = punktAus(fund);
    if (lobby.beiKlick(punkt.x, punkt.y) === "vollbild") vollbild();
  }

  /* Entweder Zeigerereignisse **oder** Mausereignisse, nie beide: Ein
     Tipp auf Android erzeugt nach `pointerup` noch einmal `mousedown`
     und `click` — dieselbe Stelle, nur als Maus verkleidet. Wer beide
     Wege anmeldet, drückt „Los" zweimal und startet zwei Läufe
     (`.claude/subagent-profile.md`, Falle 3); `preventDefault` allein
     wäre die zweite Absicherung, nicht die erste. Der Mausweg bleibt
     als Rückfalltür für Umgebungen ohne `PointerEvent` — sehr alte
     Browser und jedes nachgestellte Blatt in `werkzeuge/`. */
  if (globalThis.PointerEvent !== undefined) {
    blatt.addEventListener("pointermove", beiVorlaufZeiger);
    blatt.addEventListener("pointerdown", beiVorlaufDruck);
  } else {
    blatt.addEventListener("mousemove", beiVorlaufZeiger);
    blatt.addEventListener("mousedown", beiVorlaufDruck);
  }

  globalThis.document.addEventListener("keydown", (fund) => {
    if (fund.ctrlKey || fund.metaKey || fund.altKey) return;
    /* Am Tor wie im Vorlauf gehört **jede** Taste dem Eingabefeld. */
    if (tor) {
      if (fund.key === "Tab" || fund.key === " ") fund.preventDefault();
      tor.beiTaste(fund.key);
      return;
    }
    /* Im Vorlauf gehört **jede** Taste den Eingabefeldern - wer sonst
       „Wolf" heißen will, schaltet mit dem F das Vollbild um statt zu
       tippen. Dort führt allein der Knopf ins Vollbild. */
    if (lobby) {
      if (fund.key === "Tab" || fund.key === " ") fund.preventDefault();
      if (lobby.beiTaste(fund.key) === "vollbild") vollbild();
      return;
    }
    if (fund.key === "f" || fund.key === "F") { vollbild(); return; }
    if (fund.key === " " && tieferMoeglich()) { fund.preventDefault(); tiefer(); }
  });

  globalThis.document.addEventListener("paste", (fund) => {
    if (!fund.clipboardData) return;
    if (tor) {
      fund.preventDefault();
      tor.beiEinfuegen(fund.clipboardData.getData("text"));
      return;
    }
    if (!lobby) return;
    fund.preventDefault();
    lobby.beiEinfuegen(fund.clipboardData.getData("text"));
  });

  globalThis.addEventListener("resize", passeAn);
  globalThis.addEventListener("blur", () => { pausiert = true; });
  globalThis.addEventListener("focus", () => { pausiert = false; });
  globalThis.document.addEventListener("visibilitychange", () => {
    if (globalThis.document.visibilityState === "hidden") pausiert = true;
  });

  globalThis.requestAnimationFrame(bild);
  /* `lobby` und `spiel` stehen hier für die Prüfung: Ohne sie ließe
     sich die Verdrahtung dieser Funktion - Blatt holen, Hörer
     anmelden, aus dem Vorlauf ins Spiel wechseln - nur im Browser
     ansehen, und damit gar nicht. */
  return {
    vollbild, passeAn, tiefer, vergroesserung,
    tor: () => tor,
    lobby: () => lobby,
    spiel: () => spiel,
    stand: () => (spiel ? spiel.stand() : null)
  };
}

/* Der Zwischenspeicher. Über `import.meta.url` und damit ohne
   führenden Schrägstrich: Unter kimpaliz.github.io/hatred/ liegt das
   Spiel in einem Unterordner (docs/REGELN.md 14). */
function meldeZwischenspeicher() {
  const navi = globalThis.navigator;
  if (!navi || !navi.serviceWorker) return;
  if (!/^https?:$/.test(globalThis.location.protocol)) return;
  navi.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(() => {});
}

if (typeof document !== "undefined" && document.getElementById) {
  const blatt = document.getElementById("bild");
  if (blatt) {
    starte(blatt);
    meldeZwischenspeicher();
  }
}
