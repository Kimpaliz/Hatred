/* [Aufgabe: Prüfwesen] Prüft den warmen Vorlauf und seine erreichbaren Fingerflächen.

   ── Warum am Zeichenblatt ────────────────────────────────────────

   Eine warme Palette allein beweist keine warme Oberfläche: Der
   Vorlauf könnte weiterhin die alten HUD-Farben malen. Deshalb liest
   diese Prüfung die wirklichen Rechtecke einschließlich der Schrift.
   Die Sollfarben beschreiben den vereinbarten Ton unabhängig von der
   Palette. Der frühere Vorlauf muss daran scheitern (Regel 10).

   Eine feine Zeile darf keinen kleinen Knopf bedeuten. Die fünf Seiten
   werden über echte Klicks aufgebaut, Gastgeber und Gast mit dem echten
   Codeformat. Nur die Verbindung ist ersetzt, damit kein Netz entsteht.
   Geprüft werden auch das Warten vor und nach der Codeerzeugung,
   Hochformat, Querformat und vier Plätze mit mindestens 48 Punkten.

   ── Arbeitet zusammen mit ────────────────────────────────────────

   `runtime/lobby.js` (Seiten, Eingabe und Zeichnung),
   `runtime/palette.js` (Farben, über die Zeichnung geprüft),
   `runtime/schrift.js` (echte Buchstaben und deren Schatten),
   `netz/vermittler.mjs` (echte Einladungen ohne echte Verbindung),
   `tests/helfer.mjs`, `werkzeuge/pruefe-alles.mjs`. */

import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";
import { macheLobby, fachFuer, heldenZiffern, ANHANG_ANGEBOT } from "../runtime/lobby.js";
import { SCHATTEN_FARBE } from "../runtime/schrift.js";
import { macheCode } from "../netz/lobbycode.mjs";
import { ANGEBOT, ANTWORT, schreibeAngabe, vermittlerVonHand } from "../netz/vermittler.mjs";

const TON = {
  grund: "#08090b", flaeche: "#111113", aktiv: "#24201a", linie: "#504638",
  schrift: "#e9deca", titel: "#f6f2ea", matt: "#ab9e89", akzent: "#e6b878",
  gut: "#adc49a", warn: "#efb879"
};
const GROESSEN = [[412, 915], [915, 412], [960, 540], [1366, 768], [360, 640], [1920, 1080]];
const SEITEN = [
  "start", "allein", "gastgeber2", "gastgeber4", "beitreten",
  "wartenLeer", "wartenCode", "verbindenLeer", "verbindenCode"
];
const ERLAUBT = new Set([...Object.values(TON), SCHATTEN_FARBE]);
let bilder = 0;
let fingerflaechen = 0;
let kleinsterKontrast = Infinity;
const gemalteFarben = new Set();

function macheBlatt() {
  let farbe = "#000000";
  let weich = true;
  const rechtecke = [];
  return {
    rechtecke,
    get fillStyle() { return farbe; },
    set fillStyle(wert) { farbe = wert; },
    get imageSmoothingEnabled() { return weich; },
    set imageSmoothingEnabled(wert) { weich = wert; },
    fillRect(x, y, breite, hoehe) {
      rechtecke.push({ x, y, breite, hoehe, farbe, weich });
    }
  };
}

/* `zeigeCode` ist bewusst manuell: Das Bild vor der asynchronen
   Codeerzeugung gehört ebenso zum Vorlauf wie der fertige Code. */
function macheNetz() {
  const leitungen = [];
  return {
    leitungen,
    vermittlerVonHand,
    macheVerbindung({ istGastgeber, vermittler, fach }) {
      const leitung = {
        hoerer: [],
        beiZustand(fn) { this.hoerer.push(fn); },
        oeffne() { return new Promise(() => {}); },
        async zeigeCode() {
          const anhang = istGastgeber ? "-angebot" : "-antwort";
          await vermittler.lege(fach + anhang, {
            art: istGastgeber ? ANGEBOT : ANTWORT, leitung: "v=0 Pruefleitung"
          });
        }
      };
      leitungen.push(leitung);
      return leitung;
    }
  };
}

function macheProbe(breite = 960, hoehe = 540) {
  const ctx = macheBlatt();
  const netzwerk = macheNetz();
  const lobby = macheLobby({
    ctx, fensterBreite: breite, fensterHoehe: hoehe,
    wuerfleSaat: () => 4711, beiStart() {}, netzwerk,
    ablage: { async kopiere() {}, async hole() { return ""; } }
  });
  const zeichne = () => {
    ctx.rechtecke.length = 0;
    lobby.zeichne();
    return ctx.rechtecke;
  };
  const stelle = (schluessel) => {
    zeichne();
    const gefunden = lobby.stellenJetzt().find((s) => s.schluessel === schluessel);
    if (!gefunden) throw new Error(`Keine Trefferfläche für ${schluessel}`);
    return gefunden;
  };
  const klick = (schluessel) => {
    const s = stelle(schluessel);
    lobby.beiKlick(s.x + Math.floor(s.breite / 2), s.y + Math.floor(s.hoehe / 2));
  };
  return { ctx, lobby, netzwerk, zeichne, stelle, klick };
}

async function baueSeite(probe, name) {
  if (name === "start") return;
  if (name === "allein") { probe.klick("allein"); return; }
  if (name === "beitreten") { probe.klick("beitreten"); return; }
  if (name.startsWith("gastgeber") || name.startsWith("warten")) {
    probe.klick("eroeffnen");
    if (name !== "gastgeber2") probe.klick("spieler:4");
    if (name.startsWith("warten")) probe.klick("los");
  } else {
    const fach = fachFuer(macheCode(4711), 2,
      heldenZiffern(["grabraeuber", "flammenpriester"]));
    const einladung = schreibeAngabe({
      art: ANGEBOT, fach: fach + ANHANG_ANGEBOT, leitung: "v=0 Pruefleitung"
    });
    probe.klick("beitreten");
    probe.lobby.beiEinfuegen(einladung);
    probe.klick("verbindenLos");
  }
  if (name.endsWith("Code")) await probe.netzwerk.leitungen[0].zeigeCode();
}

function enthaelt(rect, x, y) {
  return x >= rect.x && x < rect.x + rect.breite
    && y >= rect.y && y < rect.y + rect.hoehe;
}

function farbeBei(rechtecke, x, y) {
  return rechtecke.findLast((r) => enthaelt(r, x, y))?.farbe;
}

function innen(rechtecke, s) {
  return rechtecke.filter((r) => r.x >= s.x && r.y >= s.y
    && r.x + r.breite <= s.x + s.breite && r.y + r.hoehe <= s.y + s.hoehe);
}

function heller(hex) {
  const rgb = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function kontrast(a, b) {
  const werte = [heller(a), heller(b)].sort((x, y) => x - y);
  return (werte[1] + 0.05) / (werte[0] + 0.05);
}

abschnitt("Vorlauf: neun Zustände auf sechs Fenstergrößen");
for (const [breite, hoehe] of GROESSEN) {
  for (const name of SEITEN) {
    const probe = macheProbe(breite, hoehe);
    await baueSeite(probe, name);
    const rechtecke = probe.zeichne();
    const wie = `${name} bei ${breite}×${hoehe}`;
    bilder++;
    const seite = name.startsWith("gastgeber") || name === "allein" ? "aufstellung"
      : name.startsWith("warten") ? "warten"
        : name.startsWith("verbinden") ? "verbinden" : name;
    gleich(probe.lobby.stand().seite, seite, `${wie}: richtige Seite`);
    if (breite === 1920 && hoehe === 1080) {
      behaupte(probe.lobby.stand().stufe <= 2, `${wie}: höchstens zweifache Vergrößerung`);
    }
    gleich(rechtecke[0]?.farbe, TON.grund, `${wie}: der gemalte Grund ist fast schwarz`);
    behaupte(rechtecke.some((r) => r.farbe === TON.titel), `${wie}: der Titel ist Creme`);
    behaupte(rechtecke.some((r) => r.farbe === TON.matt), `${wie}: warme Nebenzeilen`);
    const fremd = [...new Set(rechtecke.map((r) => r.farbe))].filter((f) => !ERLAUBT.has(f));
    gleich(fremd.join(","), "", `${wie}: keine alten kühlen HUD-Farben`);
    behaupte(rechtecke.every((r) => [r.x, r.y, r.breite, r.hoehe].every(Number.isInteger)),
      `${wie}: alle Rechtecke auf ganzen Bildpunkten`);
    behaupte(rechtecke.every((r) => !r.weich), `${wie}: kein geglättetes Rechteck`);
    for (const r of rechtecke) gemalteFarben.add(r.farbe);
    for (const s of probe.lobby.stellenJetzt()) {
      fingerflaechen++;
      behaupte(s.breite >= 48 && s.hoehe >= 48, `${wie}: ${s.schluessel} mindestens 48×48`);
      behaupte(s.x >= 0 && s.y >= 0 && s.x + s.breite <= breite && s.y + s.hoehe <= hoehe,
        `${wie}: ${s.schluessel} vollständig im Fenster`);
    }
  }
}

abschnitt("Vorlauf: ruhige Zeile, Tastaturfokus und Mauszeiger");
{
  const probe = macheProbe();
  const s = probe.stelle("eroeffnen");
  const stufe = probe.lobby.stand().stufe;
  const ruhe = innen(probe.zeichne(), s);
  behaupte(ruhe.some((r) => r.farbe === TON.linie && r.breite > s.breite / 2
    && r.hoehe <= 2 * stufe && r.y > s.y + s.hoehe / 2), "Ruheknopf hat eine feine Unterlinie");
  behaupte(!ruhe.some((r) => r.breite > s.breite / 2 && r.hoehe <= 2 * stufe
    && r.y === s.y), "Ruheknopf trägt keinen oberen Kastenrahmen");
  probe.lobby.beiTaste("ArrowDown");
  const fokus = innen(probe.zeichne(), s);
  behaupte(JSON.stringify(fokus) !== JSON.stringify(ruhe), "Tastaturfokus ändert das Bild");
  behaupte(fokus.some((r) => r.farbe === TON.akzent && r.hoehe > 2 * stufe
    && r.breite <= 3 * stufe && r.x <= s.x + 4 * stufe), "Fokus hat eine linke Akzentmarke");
  const andere = probe.stelle("beitreten");
  const ohne = innen(probe.zeichne(), andere);
  probe.lobby.beiZeiger(andere.x + 4, andere.y + 4);
  const drueber = innen(probe.zeichne(), andere);
  behaupte(JSON.stringify(ohne) !== JSON.stringify(drueber), "Mauszeiger ändert die ruhige Zeile");
  behaupte(drueber.some((r) => r.farbe === TON.akzent), "Mauszeiger besitzt einen warmen Akzent");
  probe.lobby.beiZeiger(-1, -1);
  gleich(JSON.stringify(innen(probe.zeichne(), andere)), JSON.stringify(ohne),
    "Beim Verlassen kommt die ruhige Zeile zurück");
}

abschnitt("Vorlauf: gewählte Klasse und aktives Eingabefeld");
{
  const probe = macheProbe();
  probe.klick("allein");
  probe.klick("held:5");
  const s = probe.stelle("held:5");
  const rechtecke = probe.zeichne();
  const stufe = probe.lobby.stand().stufe;
  gleich(farbeBei(rechtecke, s.x + Math.floor(s.breite / 2), s.y + 5 * stufe), TON.aktiv,
    "Gewählte Klasse trägt die warme Fläche");
  behaupte(innen(rechtecke, s).some((r) => [TON.schrift, TON.titel].includes(r.farbe)
    && r.hoehe <= stufe && r.y > s.y + 10 * stufe && r.y < s.y + s.hoehe - 10 * stufe),
    "Gewählte Klasse bleibt in Creme lesbar");
  for (const schluessel of ["name", "saat"]) {
    const feld = probe.stelle(schluessel);
    const ruhe = innen(probe.zeichne(), feld);
    probe.klick(schluessel);
    const aktiv = innen(probe.zeichne(), feld);
    behaupte(JSON.stringify(ruhe) !== JSON.stringify(aktiv), `${schluessel}: Fokus ist sichtbar`);
    behaupte(aktiv.some((r) => r.farbe === TON.akzent), `${schluessel}: Fokus ist warm`);
    probe.lobby.beiTaste("Escape");
  }
}

abschnitt("Vorlauf: Rückmeldungen und lesbare Schriftkontraste");
{
  const probe = macheProbe();
  probe.klick("beitreten");
  probe.klick("verbindenLos");
  behaupte(probe.zeichne().some((r) => r.farbe === TON.warn), "Ungültiger Code wird warm gewarnt");
  probe.lobby.beiEinfuegen("keinCode");
  behaupte(probe.zeichne().some((r) => r.farbe === TON.gut),
    "Einfügemeldung hat den warmen Grünton");
  for (const textfarbe of [TON.schrift, TON.matt]) {
    behaupte(gemalteFarben.has(textfarbe), `${textfarbe}: tatsächlich als Schrift gemalt`);
    for (const grund of [TON.grund, TON.flaeche, TON.aktiv]) {
      behaupte(gemalteFarben.has(grund), `${grund}: tatsächlich als Fläche gemalt`);
      const wert = kontrast(textfarbe, grund);
      kleinsterKontrast = Math.min(kleinsterKontrast, wert);
      behaupte(wert >= 4.5,
        `${textfarbe} gegen ${grund}: Kontrast ${wert.toFixed(2)} mindestens 4,5`);
    }
  }
}

console.log(`  Gemessen: ${bilder} Bilder, ${fingerflaechen} Fingerflächen, `
  + `kleinster Schriftkontrast ${kleinsterKontrast.toFixed(2)}:1.`);
ende("Vorlauf: Ton, Fokus und Fingerflächen");
