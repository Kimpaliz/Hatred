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

   `index.html` (holt diese Datei), `runtime/lobby.js` (der Vorlauf,
   bekommt `wuerfleSaat` und gibt `beiStart` zurück), `runtime/kamera.js`,
   `runtime/zeichnen.js`, `runtime/licht.js`, `runtime/partikel.js`,
   `runtime/oberflaeche.js`, `runtime/eingabe.js`, `runtime/schrift.js`,
   `spiel/lauf.mjs` (`macheLauf`, `naechsteTiefe`), `spiel/gegner-ki.mjs`
   (`planeZug`), `spiel/zug.mjs`, `spiel/sicht.mjs`, `spiel/wesen.mjs`,
   `netz/sitzung.mjs` (der einzige Ausgang jeder Aktion), `sw.js`
   (wird von hier angemeldet), `werkzeuge/pruefe-einstieg.mjs`. */

import { FARBEN } from "./palette.js";
import * as schrift from "./schrift.js";
import { KACHEL, macheLichtwerk } from "./licht.js";
import { SCHLEIM_RAMPE, machePartikelwerk } from "./partikel.js";
import { macheKamera } from "./kamera.js";
import { macheZeichner } from "./zeichnen.js";
import { macheOberflaeche, satzVon } from "./oberflaeche.js";
import { macheEingabe } from "./eingabe.js";
import { macheLobby, lesbar } from "./lobby.js";
import { richtungAus } from "./sprites.js";
import { AKTION } from "../spiel/aktionen.mjs";
import { macheLauf, naechsteTiefe } from "../spiel/lauf.mjs";
import { SEITE_BRUT, amZugWesen, wesenMitId } from "../spiel/zug.mjs";
import { planeZug } from "../spiel/gegner-ki.mjs";
import { sichtbarFuer } from "../spiel/sicht.mjs";
import { istJaeger, ruestungVon } from "../spiel/wesen.mjs";
import { macheSitzung } from "../netz/sitzung.mjs";
import { SAAT_HOECHSTENS } from "../netz/lobbycode.mjs";

/* Der feste Schritt der Abspielung. 1/60 ist der kleinste, den jeder
   Bildschirm mindestens einmal je Bild macht. */
export const SCHRITT = 1 / 60;

/* Wie viele Logikschritte ein einzelnes Bild höchstens nachholt —
   Begründung in der Kopfnotiz. */
export const HOECHSTENS_SCHRITTE = 5;

/* Die Uhr der Abspielung, in Sekunden. Gemessen wird sie nicht, sie
   ist gewählt: Ein Feld je 0,11 Sekunden ist schnell genug, dass ein
   Zug über acht Felder nicht langweilt, und langsam genug, dass man
   jedem Schritt folgen kann. */
export const TEMPO = {
  feld: 0.11, stoss: 0.14, sturz: 0.22, tod: 0.35, ruhe: 0.09, brut: 0.25
};

export const ZAHL_STEIGT = 0.9;   /* Sekunden, die eine Schadenszahl lebt */
export const ZAHL_HOCH = 12;      /* logische Bildpunkte, die sie dabei steigt */

/* Welche Teilchen zu welcher Schadensart gehören. Die Tabelle steht im
   Bildvertrag; hier ist nur die Zuordnung. */
export const SCHADEN_TEILCHEN = {
  hieb: "blut", stich: "blut", feuer: "glut", arkan: "zauberstaub",
  gift: "tropfen", sturz: "staub"
};

/* Ereignisse, die keinen Satz im Lauftext bekommen. */
export const STILLE_EREIGNISSE = new Set(["pause", "apGesetzt", "seiteDran", "ebeneGewechselt"]);

/* ── Der Abspieler ──────────────────────────────────────────────────

   Er hält die Ereignisse aus dem Kern in einer Reihe und arbeitet sie
   **nacheinander** ab. Das ist der Grund, warum es ihn gibt: Der Kern
   liefert einen ganzen Zug auf einen Schlag — gehen, treffen, stürzen,
   sterben —, und ohne Reihe stünde das Ergebnis sofort da, ohne dass
   irgendwer gesehen hätte, was passiert ist.

   Er schreibt **nicht** in den Spielstand. Was er führt, ist eine
   Nebenrechnung fürs Auge: wo eine Figur gerade zu sehen ist, wohin
   sie schaut, welche Zahl über ihr steht. */
export function macheAbspieler({
  partikelwerk = null, kamera = null, lichtwerk = null, beiSatz = null
} = {}) {
  const reihe = [];
  const anzeige = new Map();
  const blicke = new Map();
  const zahlen = [];
  let laufend = null;

  const kachelMitte = (feld) => feld * KACHEL + KACHEL / 2;

  function wirf(art, x, y, opts = {}) {
    if (partikelwerk) partikelwerk.stosseAus(art, kachelMitte(x), kachelMitte(y), opts);
  }

  function ruettle(staerke, dauer) {
    if (kamera && typeof kamera.ruettle === "function") kamera.ruettle(staerke, dauer);
  }

  function lege(ereignisse) {
    for (const ereignis of ereignisse || []) reihe.push(ereignis);
  }

  /* Eine Pause ohne Ereignis. Sie steht zwischen zwei Wesen der Brut:
     Ohne sie ziehen acht Gegner in einem Wimpernschlag, und niemand
     sieht, wer eigentlich was getan hat. */
  function pause(dauer) {
    reihe.push({ art: "pause", dauer });
  }

  function beschaeftigt() {
    return laufend !== null || reihe.length > 0;
  }

  /* ── Ein Ereignis beginnen ──────────────────────────────────────*/

  function beginne(ereignis, zustand) {
    /* Nicht jedes Ereignis ist ein Satz wert: `apGesetzt` käme nach
       jeder einzelnen Aktion und schöbe alles Lesenswerte aus dem
       Lauftext heraus. */
    if (beiSatz && !STILLE_EREIGNISSE.has(ereignis.art)) beiSatz(satzVon(zustand, ereignis));
    const wesen = wesenMitId(zustand, ereignis.wer);

    switch (ereignis.art) {
      case "pause":
        return { dauer: ereignis.dauer, tue: null };

      case "bewegt": {
        const pfad = Array.isArray(ereignis.pfad) ? ereignis.pfad : [];
        if (pfad.length < 2) return null;
        return { dauer: (pfad.length - 1) * TEMPO.feld, pfad, wer: ereignis.wer };
      }

      case "gestossen":
        return strecke(ereignis, TEMPO.stoss);

      case "gestuerzt": {
        const lauf = strecke(ereignis, TEMPO.sturz);
        /* Der Staubring beim Aufschlag - das einzige Bild, das einen
           Sturz von einem Schritt hinab unterscheidet. Er wird am
           **Ende** der Strecke geworfen, nicht am Anfang. */
        lauf.landung = true;
        return lauf;
      }

      case "schaden": {
        if (wesen) {
          const art = ereignis.art2 === "hieb" || ereignis.art2 === "stich"
            ? (ruestungVon(wesen) > 0 ? "funken" : "blut")
            : (SCHADEN_TEILCHEN[ereignis.art2] || "staub");
          const zusatz = ereignis.art2 === "gift"
            ? { farben: SCHLEIM_RAMPE, leuchtet: true } : {};
          wirf(art, wesen.x, wesen.y, zusatz);
          zahlen.push({ text: `-${ereignis.wieviel}`, x: wesen.x, y: wesen.y, alter: 0,
            farbe: ereignis.art2 === "sturz" ? FARBEN.hudWarn : FARBEN.hudSchlecht });
          ruettle(Math.min(3, 1 + ereignis.wieviel / 8), 0.16);
        }
        return { dauer: TEMPO.ruhe };
      }

      case "gestorben":
        wirf("blut", ereignis.x, ereignis.y, { anzahl: 18 });
        wirf("rauch", ereignis.x, ereignis.y);
        anzeige.set(ereignis.wer, { x: ereignis.x, y: ereignis.y, lebt: true });
        return { dauer: TEMPO.tod, stirbt: ereignis.wer };

      case "hindernisWeg":
        wirf("splitter", ereignis.x, ereignis.y);
        return { dauer: TEMPO.ruhe };

      /* Eine Fackel geht an oder aus. `runtime/zeichnen.js` holt die
         Quellen nur, wenn die **Karte** wechselt - hier wechselt nur
         ihr Inhalt, also muss es an dieser Stelle geschehen. */
      case "lichtNeu":
      case "lichtWeg":
        if (lichtwerk) lichtwerk.setzeQuellen(zustand.karte.lichter || []);
        return { dauer: TEMPO.ruhe };

      case "beute":
        if (wesen) wirf("zauberstaub", wesen.x, wesen.y, { anzahl: 6 });
        return { dauer: TEMPO.ruhe };

      /* Ein Fehlschlag bekommt eine kurze Ruhe, damit der Satz im
         Lauftext stehen bleibt; ein Treffer wird ohnehin vom
         Schadensereignis dahinter aufgehalten. */
      case "angriff":
        return { dauer: ereignis.treffer === false ? TEMPO.ruhe : 0 };

      default:
        return { dauer: 0 };
    }
  }

  function strecke(ereignis, dauer) {
    return { dauer, von: ereignis.von, nach: ereignis.nach, wer: ereignis.wer };
  }

  /* ── Ein Schritt der Uhr ────────────────────────────────────────*/

  function schritt(dt, zustand) {
    for (const zahl of zahlen) zahl.alter += dt;
    while (zahlen.length > 0 && zahlen[0].alter > ZAHL_STEIGT) zahlen.shift();

    let rest = dt;
    let wachen = 0;
    while (rest > 0 && wachen < 64) {
      wachen++;
      if (!laufend) {
        if (reihe.length === 0) break;
        const ereignis = reihe.shift();
        laufend = beginne(ereignis, zustand);
        if (!laufend) continue;
        laufend.alter = 0;
        bewege(zustand, 0);
      }
      const uebrig = laufend.dauer - laufend.alter;
      const nimm = Math.min(rest, uebrig);
      laufend.alter += nimm;
      rest -= nimm;
      bewege(zustand, laufend.alter);
      if (laufend.alter >= laufend.dauer) {
        if (laufend.wer !== undefined) anzeige.delete(laufend.wer);
        if (laufend.stirbt !== undefined) anzeige.delete(laufend.stirbt);
        if (laufend.landung) {
          wirf("staub", laufend.nach.x, laufend.nach.y);
          ruettle(3, 0.2);
        }
        laufend = null;
      }
    }
    return beschaeftigt();
  }

  /* Wo die Figur zum Zeitpunkt `alter` zu sehen ist. Zwischenwerte
     dürfen Bruchzahlen sein — gerundet wird erst beim Zeichnen, und
     zwar in `runtime/zeichnen.js`, damit es genau eine Stelle gibt. */
  function bewege(zustand, alter) {
    if (!laufend) return;
    if (laufend.pfad) {
      const anteil = laufend.dauer > 0 ? alter / laufend.dauer : 1;
      const stelle = Math.min(laufend.pfad.length - 1.0001,
        anteil * (laufend.pfad.length - 1));
      const i = Math.floor(stelle);
      const teil = stelle - i;
      const a = laufend.pfad[i];
      const b = laufend.pfad[Math.min(i + 1, laufend.pfad.length - 1)];
      anzeige.set(laufend.wer, { x: a.x + (b.x - a.x) * teil, y: a.y + (b.y - a.y) * teil });
      blicke.set(laufend.wer, richtungAus(b.x - a.x, b.y - a.y));
      return;
    }
    if (laufend.von && laufend.nach) {
      const anteil = laufend.dauer > 0 ? Math.min(1, alter / laufend.dauer) : 1;
      const x = laufend.von.x + (laufend.nach.x - laufend.von.x) * anteil;
      const y = laufend.von.y + (laufend.nach.y - laufend.von.y) * anteil;
      anzeige.set(laufend.wer, { x, y });
      blicke.set(laufend.wer,
        richtungAus(laufend.nach.x - laufend.von.x, laufend.nach.y - laufend.von.y));
    }
  }

  /* Der Spielstand fürs Auge: dieselben Felder, nur die Wesen an den
     Stellen, an denen sie **gerade** zu sehen sind. Es wird kopiert und
     nicht geschrieben — `runtime/` fasst den Spielstand nicht an. */
  function schau(zustand) {
    if (anzeige.size === 0 && blicke.size === 0) return zustand;
    const liste = [];
    const nachId = new Map();
    for (const wesen of zustand.wesen) {
      const stelle = anzeige.get(wesen.id);
      const blick = blicke.get(wesen.id);
      let sichtbar = wesen;
      if (stelle || blick !== undefined) {
        sichtbar = { ...wesen };
        if (stelle) {
          sichtbar.x = stelle.x;
          sichtbar.y = stelle.y;
          if (stelle.lebt !== undefined) sichtbar.lebt = stelle.lebt;
        }
        if (blick !== undefined) sichtbar.blick = blick;
      }
      liste.push(sichtbar);
      nachId.set(wesen.id, sichtbar);
    }
    return { ...zustand, wesen: liste, nachId };
  }

  return {
    lege, pause, schritt, beschaeftigt, schau,
    zahlen: () => zahlen,
    laenge: () => reihe.length,
    leere() { reihe.length = 0; laufend = null; anzeige.clear(); zahlen.length = 0; }
  };
}

/* ── Ein Spiel ──────────────────────────────────────────────────────

   Alles, was zwischen einem gebauten Lauf und dem Bildschirm liegt. Es
   ist eine eigene Funktion, damit eine Ebene tiefer (`naechsteTiefe`)
   dasselbe noch einmal entstehen kann — und damit die Prüfung es ohne
   Browser bauen und ein Bild anfordern kann. */
export function macheSpiel({
  ctx, zustand, sitzung, platz = null, leinwand = null,
  fensterBreite = 960, fensterHoehe = 540
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

  const eingabe = macheEingabe({
    leinwand, kamera, platz,
    zustand: () => zustand,
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
       und ein stehendes Bild. */
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
    });
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

  let lobby = null;
  let spiel = null;
  let sitzung = null;
  let angaben = null;
  let pausiert = false;
  let letzteRunde = 0;

  /* Die Maße. Das Blatt bekommt so viele Bildpunkte, wie das Fenster
     in CSS-Punkten breit ist; die Vergrößerung auf echte Gerätepunkte
     macht der Browser mit `image-rendering: pixelated`. Der eigene
     Maßstab bleibt damit ganzzahlig — genau das verlangt der
     Bildvertrag. */
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
  }

  /* ── Vollbild ───────────────────────────────────────────────────*/

  function vollbild() {
    const drin = globalThis.document && globalThis.document.fullscreenElement;
    try {
      if (drin) globalThis.document.exitFullscreen();
      else if (blatt.requestFullscreen) blatt.requestFullscreen();
    } catch { /* manche Browser verweigern es ohne Klick - dann eben nicht */ }
  }

  /* ── Der Vorlauf ────────────────────────────────────────────────*/

  const { breite, hoehe } = setzeBlatt();
  lobby = macheLobby({
    ctx, wuerfleSaat, fensterBreite: breite, fensterHoehe: hoehe,
    ablage: macheAblage(globalThis.document),
    beiStart: (was) => beginneSpiel(was)
  });

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
      fensterBreite: b, fensterHoehe: h
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
    const text = "Pause - klick ins Bild";
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
      ? (tieferMoeglich() ? "Ebene geschafft - Leertaste: tiefer hinab" : "Ebene geschafft.")
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
    } else if (lobby) lobby.zeichne(zeit);
    globalThis.requestAnimationFrame(bild);
  }

  /* ── Hörer ──────────────────────────────────────────────────────

     Die Lobby bekommt Maus und Tastatur, solange sie da ist; sobald
     das Spiel läuft, hört `runtime/eingabe.js` selbst mit. Doppelt
     angemeldet ist hier nichts: Die Lobby fragt vorher, ob sie noch
     dran ist. */
  function punktAus(fund) {
    const kasten = blatt.getBoundingClientRect();
    const x = (fund.clientX - kasten.left) * (blatt.width / (kasten.width || blatt.width));
    const y = (fund.clientY - kasten.top) * (blatt.height / (kasten.height || blatt.height));
    return { x, y };
  }

  blatt.addEventListener("mousemove", (fund) => {
    if (!lobby) return;
    const punkt = punktAus(fund);
    lobby.beiZeiger(punkt.x, punkt.y);
  });
  blatt.addEventListener("mousedown", (fund) => {
    if (pausiert) { pausiert = false; return; }
    if (!lobby) return;
    fund.preventDefault();
    const punkt = punktAus(fund);
    if (lobby.beiKlick(punkt.x, punkt.y) === "vollbild") vollbild();
  });

  globalThis.document.addEventListener("keydown", (fund) => {
    if (fund.ctrlKey || fund.metaKey || fund.altKey) return;
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
    if (!lobby || !fund.clipboardData) return;
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
    vollbild, passeAn, tiefer,
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
