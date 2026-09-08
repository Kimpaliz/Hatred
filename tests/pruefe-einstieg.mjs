/* [Aufgabe: Prüfwesen] Misst den Einstieg: die Seite, den Vorlauf, die
   Abspielung und den Zwischenspeicher — alles ohne Browser.

   ── Warum ein Ersatzblatt und ein Ersatz-Arbeiter ──────────────────

   Vier Fehler stehen an dieser Stelle, und **keinen** davon sieht man
   im fertigen Bild rechtzeitig:

   · Ein Pfad mit führendem Schrägstrich in `index.html`. Daheim läuft
     alles, unter `kimpaliz.github.io/hatred/` bleibt die Seite weiß —
     ohne Fehlermeldung (docs/REGELN.md 14).
   · Ein `fillRect` auf einer halben Bildpunktkante oder eine nach dem
     Setzen der Blattmaße vergessene Abschaltung der Glättung. Beides
     ist im Bild ein Hauch Unschärfe, den man für den Bildschirm hält
     (Fehlerbuch D1). In der **Aufrufliste** ist beides eindeutig.
   · Eine Abspielung, die die Ereignisliste auf einen Schlag ausführt.
     Der Spielstand wäre richtig, nur hätte niemand gesehen, was
     passiert ist — und die Eingabe nähme mitten in der Bewegung Klicks
     an, deren Voraussetzung sich gerade ändert.
   · Ein Zwischenspeicher, der zuerst antwortet. Er liefert für immer
     eine alte Fassung aus, und im Netz-Koop endet die Runde daraufhin
     mit „auseinandergelaufen" — die teuerste Art, es zu merken.

   Deshalb bekommt der Zeichenweg hier ein Blatt, das nichts malt,
   sondern mitschreibt, und `sw.js` einen erfundenen Arbeiter-Rahmen,
   in dem es wirklich läuft. Behauptet wird über die Mitschrift.

   ── Was hier nicht geprüft wird ────────────────────────────────────

   Ob das Bild schön ist. Das entscheidet der Auftraggeber, und dafür
   gibt es `node werkzeuge/vorschau.mjs`.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `index.html`, `sw.js`, `runtime/start.js`, `runtime/lobby.js` (das
   Geprüfte), `runtime/schrift.js`, `runtime/palette.js`,
   `spiel/lauf.mjs`, `spiel/katalog/helden.mjs`, `netz/sitzung.mjs`,
   `netz/vermittler.mjs`, `netz/lobbycode.mjs`,
   `tests/helfer.mjs` (Behauptungen und Abschluss) und
   `werkzeuge/pruefe-alles.mjs`, das diese Datei als eigenen Prozess
   startet. */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { abschnitt, behaupte, gleich, wirft, ende } from "./helfer.mjs";
import { HELDEN } from "../spiel/katalog/helden.mjs";
import { macheLauf, zustandsSumme } from "../spiel/lauf.mjs";
import { AKTION } from "../spiel/aktionen.mjs";
import { amZugWesen } from "../spiel/zug.mjs";
import { macheSitzung } from "../netz/sitzung.mjs";
import { macheCode } from "../netz/lobbycode.mjs";
import { ANGEBOT, ANTWORT, schreibeAngabe, vermittlerVonHand } from "../netz/vermittler.mjs";
import {
  ANHANG_ANGEBOT, ANHANG_ANTWORT, fachFuer, heldenZiffern, lesbar, leseFach, macheLobby, umbrich
} from "../runtime/lobby.js";
import { SCHRITT, macheAblage, macheSpiel, starte } from "../runtime/start.js";
/* Der Abspieler ist am 06.09.2026 aus `start.js` in seine eigene Datei
   gezogen (Regel 8: 999 von 1000 Zeilen). Er wird hier direkt geholt
   und nicht über `start.js` durchgereicht — ein Durchreichen wäre eine
   zweite Wahrheit über seinen Ort. */
import { TEMPO, macheAbspieler } from "../runtime/abspieler.js";

const WURZEL = dirname(dirname(fileURLToPath(import.meta.url)));

/* Was diese Prüfung gemessen hat. Sie wird am Schluss gedruckt, damit
   jede Zahl, die irgendwo im Projekt steht, hier ihren Befehl hat:
   `node tests/pruefe-einstieg.mjs`. */
const messungen = [];
const liesWurzel = (name) => readFileSync(join(WURZEL, name), "utf8");

/* ── Das mitschreibende Zeichenblatt ────────────────────────────────

   Dieselbe Bauart wie in `tests/pruefe-zeichnen.mjs`: nur die
   Methoden, die wirklich benutzt werden, und `canvas.width` als echtes
   Feld mit Schreibmelder — genau daran hängt der Glättungsfehler. */
function macheErsatzflaeche(breite = 640, hoehe = 360, angaben = {}) {
  const mitschrift = angaben.mitschrift !== false;
  const pruefzahl = angaben.pruefzahl !== false;
  const aufrufe = [];
  let blattBreite = breite;
  let blattHoehe = hoehe;
  let farbe = "#000000";
  let anzahl = 0;
  let summe = 0x811c9dc5;
  let rechtecke = 0;
  let frisch = false;
  let bruch = null;
  let weich = null;
  let erster = null;

  /* Jeder Aufruf geht durch diese eine Tür. Die beiden Funde -
     halber Bildpunkt und geglättetes Zeichnen - werden **im
     Vorbeigehen** festgestellt, damit für sie keine Liste gebraucht
     wird: Ein Kerkerbild sind dreißigtausend Rechtecke, und zwölf
     Bilder davon im Speicher zu halten kostet mehr Zeit als das
     Zeichnen selbst. */
  function merke(eintrag) {
    anzahl++;
    if (erster === null) erster = eintrag;
    if (pruefzahl) {
      const text = eintrag.join("|");
      for (let i = 0; i < text.length; i++) {
        summe = Math.imul(summe ^ text.charCodeAt(i), 0x01000193) >>> 0;
      }
    }
    if (mitschrift) aufrufe.push(eintrag);
    if (eintrag[0] === "blattBreite" || eintrag[0] === "blattHoehe") frisch = true;
    else if (eintrag[0] === "glaettung" && eintrag[1] === false) frisch = false;
    else if (eintrag[0] === "rechteck") {
      rechtecke++;
      if (frisch && weich === null) weich = eintrag;
      if (bruch === null
        && ![eintrag[1], eintrag[2], eintrag[3], eintrag[4]].every(Number.isInteger)) {
        bruch = eintrag;
      }
    }
  }

  const canvas = {
    get width() { return blattBreite; },
    set width(wert) { blattBreite = wert; merke(["blattBreite", wert]); },
    get height() { return blattHoehe; },
    set height(wert) { blattHoehe = wert; merke(["blattHoehe", wert]); }
  };
  return {
    aufrufe,
    canvas,
    anzahl: () => anzahl,
    summe: () => summe,
    rechtecke: () => rechtecke,
    erster: () => erster,
    bruch: () => bruch,
    weich: () => weich,
    set imageSmoothingEnabled(wert) { merke(["glaettung", wert]); },
    get imageSmoothingEnabled() { return false; },
    set fillStyle(wert) { farbe = wert; merke(["farbe", wert]); },
    get fillStyle() { return farbe; },
    set globalCompositeOperation(wert) { merke(["mischen", wert]); },
    get globalCompositeOperation() { return "source-over"; },
    fillRect(x, y, b, h) { merke(["rechteck", x, y, b, h, farbe]); }
  };
}

/* ── 1 · Die Einstiegsseite ─────────────────────────────────────────*/

{
  abschnitt("Einstiegsseite");
  const seite = liesWurzel("index.html");

  behaupte(/<html[^>]*\slang="de"/.test(seite), "die Seite sagt, dass sie deutsch ist");
  gleich((seite.match(/<canvas\b/g) || []).length, 1, "genau ein Zeichenblatt");
  gleich((seite.match(/<script\b/g) || []).length, 1, "genau ein Skript");
  behaupte(/<script type="module" src="\.\/runtime\/start\.js"><\/script>/.test(seite),
    "das Skript ist ein Modul und wird relativ geholt");
  behaupte(/image-rendering:\s*pixelated/.test(seite), "harte Kanten sind angesagt");
  behaupte(/overflow:\s*hidden/.test(seite), "kein Rollbalken");
  behaupte(/<noscript>/.test(seite) && /JavaScript/.test(seite),
    "ohne JavaScript steht ein Hinweis da");
  behaupte(/#bild\s*\{\s*display:\s*none/.test(seite),
    "der Hinweis wird nicht vom Zeichenblatt verdeckt");

  /* Der Fall, der ohne diese Arbeit falsch wäre: ein Pfad mit
     führendem Schrägstrich. Er funktioniert daheim und nirgends
     sonst. */
  const pfade = [...seite.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  behaupte(pfade.length >= 2, `${pfade.length} Verweise in der Seite`);
  const absolut = pfade.filter((p) => p.startsWith("/") || /^[a-z]+:/.test(p));
  gleich(absolut.length, 0,
    `kein Verweis ist absolut${absolut.length ? ` (${absolut.join(", ")})` : ""}`);
  for (const pfad of pfade) {
    behaupte(existsSync(join(WURZEL, pfad)), `${pfad} liegt wirklich da`);
  }

  /* Und dasselbe für die Module: `runtime/start.js` zieht die halbe
     Werkstatt nach - ein einziger absoluter Pfad darin bliebe still. */
  const quelle = liesWurzel("runtime/start.js") + liesWurzel("runtime/lobby.js");
  const einfuhr = [...quelle.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
  behaupte(einfuhr.length >= 15, `${einfuhr.length} Einfuhrpfade in start.js und lobby.js`);
  gleich(einfuhr.filter((p) => p.startsWith("/")).length, 0,
    "kein Einfuhrpfad beginnt mit einem Schrägstrich");
  for (const pfad of einfuhr) {
    behaupte(existsSync(join(WURZEL, "runtime", pfad)), `${pfad} ist von runtime/ aus erreichbar`);
  }
}

/* ── 2 · Der Zwischenspeicher ───────────────────────────────────────

   `sw.js` wird hier wirklich ausgeführt: in einem erfundenen
   Arbeiter-Rahmen, dessen Netz und Speicher mitschreiben. Nur so lässt
   sich behaupten, dass **zuerst** gefragt und erst dann gespeichert
   wird — die Reihenfolge ist der ganze Punkt dieser Datei. */

function macheArbeiter({ netzAntwort = null, imSpeicher = null } = {}) {
  const spur = [];
  const sammlungen = new Map([["hatred-v0-alt", new Map()], ["hatred-v1", new Map()]]);
  if (imSpeicher) sammlungen.get("hatred-v1").set(imSpeicher.url, imSpeicher.antwort);

  const hoerer = new Map();
  const self = {
    location: { origin: "https://beispiel.test" },
    addEventListener: (name, fn) => hoerer.set(name, fn),
    skipWaiting: () => { spur.push("skipWaiting"); return Promise.resolve(); },
    clients: { claim: () => { spur.push("claim"); return Promise.resolve(); } }
  };
  const caches = {
    keys: async () => [...sammlungen.keys()],
    delete: async (name) => { spur.push(`weg:${name}`); return sammlungen.delete(name); },
    open: async (name) => ({
      put: async (anfrage, antwort) => {
        spur.push(`abgelegt:${anfrage.url}`);
        if (!sammlungen.has(name)) sammlungen.set(name, new Map());
        sammlungen.get(name).set(anfrage.url, antwort);
      }
    }),
    match: async (anfrage) => {
      spur.push(`gesucht:${anfrage.url}`);
      for (const sammlung of sammlungen.values()) {
        if (sammlung.has(anfrage.url)) return sammlung.get(anfrage.url);
      }
      return undefined;
    }
  };
  const netz = async (anfrage) => {
    spur.push(`gefragt:${anfrage.url}`);
    if (!netzAntwort) throw new Error("kein Netz");
    return netzAntwort;
  };
  class Antwort {
    constructor(koerper, angaben = {}) {
      this.koerper = koerper;
      this.status = angaben.status || 200;
      this.ok = this.status < 400;
      this.headers = angaben.headers || {};
      this.type = "basic";
    }
    clone() { return this; }
  }

  const quelle = liesWurzel("sw.js");
  // eslint-disable-next-line no-new-func
  new Function("self", "caches", "fetch", "Response", quelle)(self, caches, netz, Antwort);
  return { self, hoerer, spur, sammlungen, Antwort };
}

function macheAnfrage(url, angaben = {}) {
  return {
    url,
    method: angaben.method || "GET",
    mode: angaben.mode || "cors",
    headers: { has: (name) => (angaben.range === true && name === "range") }
  };
}

async function feuere(hoerer, name, ereignis) {
  const fn = hoerer.get(name);
  if (!fn) throw new Error(`kein Hörer für ${name}`);
  fn(ereignis);
  if (ereignis.wartet) await ereignis.wartet;
  if (ereignis.antwort) return await ereignis.antwort;
  return null;
}

function macheAbrufEreignis(anfrage) {
  const ereignis = { request: anfrage, antwort: null };
  ereignis.respondWith = (versprechen) => { ereignis.antwort = versprechen; };
  return ereignis;
}

{
  abschnitt("Zwischenspeicher");
  const quelle = liesWurzel("sw.js");
  behaupte(/\[Aufgabe: Oberfläche\]/.test(quelle.split("\n").slice(0, 12).join("\n")),
    "sw.js trägt seine Kopfnotiz");
  behaupte(/const FASSUNG = \d+;/.test(quelle) && /hatred-v\$\{FASSUNG\}/.test(quelle),
    "die Fassung steht im Namen der Sammlung");

  const arbeiter = macheArbeiter();
  behaupte(arbeiter.hoerer.has("install") && arbeiter.hoerer.has("activate")
    && arbeiter.hoerer.has("fetch"), "install, activate und fetch sind angemeldet");

  await feuere(arbeiter.hoerer, "install", { waitUntil: (p) => { arbeiter.wartet = p; } });
  behaupte(arbeiter.spur.includes("skipWaiting"),
    "eine neue Fassung wartet nicht auf das Schließen aller Reiter");

  let warten = null;
  arbeiter.hoerer.get("activate")({ waitUntil: (p) => { warten = p; } });
  await warten;
  behaupte(arbeiter.spur.includes("weg:hatred-v0-alt"), "die alte Sammlung wird gelöscht");
  behaupte(!arbeiter.spur.includes("weg:hatred-v1"), "die laufende Sammlung bleibt");
  behaupte(arbeiter.spur.includes("claim"), "die laufende Seite wird sofort übernommen");
}

{
  abschnitt("Zwischenspeicher: erst das Netz");
  /* Der Fall, der ohne diese Arbeit falsch wäre: Läuft das Netz, darf
     die Antwort **nicht** aus dem Speicher kommen - auch dann nicht,
     wenn dort etwas liegt. */
  const ausDemNetz = { neu: true, ok: true, clone: () => "abschrift" };
  const arbeiter = macheArbeiter({ netzAntwort: ausDemNetz });
  const anfrage = macheAnfrage("https://beispiel.test/runtime/start.js");
  const antwort = await feuere(arbeiter.hoerer, "fetch", macheAbrufEreignis(anfrage));
  gleich(antwort.neu, true, "die Antwort kommt aus dem Netz");
  const zuerst = arbeiter.spur[0];
  gleich(zuerst, `gefragt:${anfrage.url}`, "gefragt wird vor allem anderen");
  behaupte(arbeiter.spur.includes(`abgelegt:${anfrage.url}`), "eine Abschrift wird abgelegt");
  behaupte(!arbeiter.spur.some((s) => s.startsWith("gesucht:")),
    "im Speicher wird gar nicht erst nachgesehen, solange das Netz antwortet");
}

{
  abschnitt("Zwischenspeicher: ohne Netz");
  const arbeiter = macheArbeiter({
    imSpeicher: { url: "https://beispiel.test/runtime/start.js", antwort: { alt: true } }
  });
  const anfrage = macheAnfrage("https://beispiel.test/runtime/start.js");
  const antwort = await feuere(arbeiter.hoerer, "fetch", macheAbrufEreignis(anfrage));
  gleich(antwort.alt, true, "ohne Netz kommt die Abschrift");

  const leer = macheArbeiter();
  const fehlt = macheAnfrage("https://beispiel.test/index.html", { mode: "navigate" });
  const absage = await feuere(leer.hoerer, "fetch", macheAbrufEreignis(fehlt));
  gleich(absage.status, 503, "ohne Netz und ohne Abschrift gibt es eine Absage");
  behaupte(/offline/.test(absage.koerper) && /Verbinde dich/.test(absage.koerper),
    "die Absage ist ein deutscher Satz, der sagt, was zu tun ist");

  const fremd = macheArbeiter();
  const draussen = macheAbrufEreignis(macheAnfrage("https://andere.test/x.js"));
  fremd.hoerer.get("fetch")(draussen);
  gleich(draussen.antwort, null, "eine fremde Adresse wird nicht angefasst");
  const senden = macheAbrufEreignis(macheAnfrage("https://beispiel.test/x", { method: "POST" }));
  fremd.hoerer.get("fetch")(senden);
  gleich(senden.antwort, null, "eine Sendung wird nicht angefasst");
  const stueck = macheAbrufEreignis(macheAnfrage("https://beispiel.test/x", { range: true }));
  fremd.hoerer.get("fetch")(stueck);
  gleich(stueck.antwort, null, "ein Teilabruf wird nicht angefasst");
}

/* ── 3 · Der Fachname, der die Runde trägt ──────────────────────────*/

{
  abschnitt("Fachname");
  const code = macheCode(4711);
  const ziffern = heldenZiffern(["spaeher", "bluthexer", "bogenschuetzin"]);
  gleich(ziffern, "045", "die Klassen werden zu Ziffern");
  const fach = fachFuer(code, 3, ziffern);
  gleich(fach, `${code.replace("-", "")}-3-045`, "der Fachname setzt sich richtig zusammen");

  const gelesen = leseFach(fach + ANHANG_ANGEBOT);
  gleich(gelesen.saat, 4711, "die Saat kommt heil zurück");
  gleich(gelesen.platz, 3, "der Platz kommt heil zurück");
  gleich(gelesen.spielerZahl, 3, "die Spielerzahl steckt in der Länge der Ziffern");
  gleich(gelesen.helden.join(","), "spaeher,bluthexer,bogenschuetzin", "und die Truppe auch");
  gleich(leseFach(fach + ANHANG_ANTWORT).saat, 4711, "der Antwort-Anhang stört nicht");

  /* Der Fall, der ohne die Prüfziffer falsch wäre: ein vertippter
     Lobbycode führte zwei Freunde in zwei verschiedene Kerker, und das
     merkte erst die Rundensumme - eine Runde später. */
  const knapp = code.replace("-", "");
  let vertippt = 0;
  for (let i = 0; i < knapp.length; i++) {
    const anders = knapp[i] === "2" ? "3" : "2";
    const falsch = knapp.slice(0, i) + anders + knapp.slice(i + 1);
    if (leseFach(`${falsch}-2-05`) === null) vertippt++;
  }
  gleich(vertippt, knapp.length, `alle ${knapp.length} Vertipper fallen auf`);
  gleich(leseFach(`${knapp}-1-045`), null, "Platz 1 gehört dem Gastgeber und ist kein Gastplatz");
  gleich(leseFach(`${knapp}-4-045`), null, "ein Platz jenseits der Truppe fällt auf");
  gleich(leseFach(`${knapp}-2-9`), null, "eine Klassenziffer, die es nicht gibt, fällt auf");
  gleich(leseFach("unsinn"), null, "Unsinn ist kein Fachname");

  /* Die eine Behauptung, an der der ganze Einladungscode hängt: Was
     der Gast aus dem Fachnamen baut, muss **bitgleich** dasselbe sein
     wie das, was der Gastgeber gebaut hat. Weicht ein einziges Feld
     ab, endet die Sitzung beim ersten Beitritt mit
     „auseinandergelaufen" (netz/sitzung.mjs). */
  const truppe = ["grabraeuber", "flammenpriester"];
  const beimGastgeber = macheLauf({ saat: 4711, spielerZahl: 2, tiefe: 1, heldenWahl: truppe });
  const ausDemCode = leseFach(fachFuer(macheCode(4711), 2, heldenZiffern(truppe)));
  const beimGast = macheLauf({
    saat: ausDemCode.saat, spielerZahl: ausDemCode.spielerZahl, tiefe: 1,
    heldenWahl: ausDemCode.helden
  });
  gleich(zustandsSumme(beimGast), zustandsSumme(beimGastgeber),
    "Gast und Gastgeber bauen aus dem einen Code denselben Kerker");
  const andereTruppe = macheLauf({
    saat: 4711, spielerZahl: 2, tiefe: 1, heldenWahl: ["spaeher", "flammenpriester"]
  });
  behaupte(zustandsSumme(andereTruppe) !== zustandsSumme(beimGastgeber),
    "eine andere Truppe gäbe eine andere Prüfzahl - die Klassen müssen also mitreisen");
}

/* ── 4 · Der Vorlauf ────────────────────────────────────────────────*/

function macheLobbyProbe(zusatz = {}) {
  const ctx = macheErsatzflaeche(640, 360, { pruefzahl: false });
  let gestartet = null;
  const lobby = macheLobby({
    ctx,
    wuerfleSaat: () => 4711,
    beiStart: (was) => { gestartet = was; },
    fensterBreite: 640,
    fensterHoehe: 360,
    ...zusatz
  });
  const klick = (schluessel) => {
    lobby.zeichne();
    const stelle = lobby.stellenJetzt().find((s) => s.schluessel === schluessel);
    if (!stelle) throw new Error(`keine Stelle „${schluessel}"`);
    return lobby.beiKlick(stelle.x + 2, stelle.y + 2);
  };
  return { ctx, lobby, klick, holeStart: () => gestartet };
}

{
  abschnitt("Vorlauf: Schrift und Bildpunkte");
  gleich(lesbar("Was er wirkt — und zahlt gern …"), "Was er wirkt - und zahlt gern ...",
    "Zeichen, die die Pixelschrift nicht hat, werden ersetzt");
  for (const klasse of HELDEN) {
    const zeilen = umbrich(klasse.zier, 52);
    behaupte(zeilen.length <= 2, `„${klasse.name}" passt in zwei Zeilen`);
    behaupte(zeilen.join(" ") === lesbar(klasse.zier), `„${klasse.name}" wird nicht beschnitten`);
  }

  const probe = macheLobbyProbe();
  const rechtecke = probe.lobby.zeichne();
  behaupte(rechtecke > 0, `${rechtecke} Flächen auf der Titelseite`);
  messungen.push(`Titelseite bei 640x360: ${rechtecke} Flächen, Vergrößerung `
    + `${probe.lobby.stand().stufe}`);
  gleich(probe.ctx.bruch(), null, "kein Rechteck liegt auf einem halben Bildpunkt");
  gleich(probe.ctx.weich(), null, "nichts wird geglättet gezeichnet");
  gleich(probe.ctx.erster()[0], "glaettung", "die Glättung wird vor dem ersten Rechteck aus");
}

{
  abschnitt("Vorlauf: allein");
  const probe = macheLobbyProbe();
  gleich(probe.lobby.stand().seite, "start", "es beginnt auf der Titelseite");
  probe.klick("allein");
  gleich(probe.lobby.stand().seite, "aufstellung", "der Knopf führt zur Aufstellung");

  probe.klick("held:5");
  gleich(probe.lobby.stand().helden.join(","), "bogenschuetzin", "die Klassenwahl greift");

  probe.klick("saat");
  for (const zeichen of "abc") probe.lobby.beiTaste(zeichen);
  probe.klick("los");
  gleich(probe.holeStart(), null, "mit einer unsinnigen Saat geht es nicht los");
  behaupte(/Saat muss eine ganze Zahl/.test(probe.lobby.stand().meldung),
    "und der Satz sagt, was zu tun ist");

  probe.klick("wuerfeln");
  gleich(probe.lobby.stand().saat, 4711, "die gewürfelte Saat steht sichtbar im Feld");
  probe.klick("los");
  const start = probe.holeStart();
  gleich(start.saat, 4711, "die Saat geht an das Spiel");
  gleich(start.spielerZahl, 1, "allein heißt eine Figur");
  gleich(start.istGastgeber, true, "auch allein ist man Gastgeber der eigenen Sitzung");
  gleich(start.verbindungen.length, 0, "und hat keine Leitung");
}

/* Eine erfundene Leitung. Der Vermittler bleibt **echt**: Damit läuft
   der Einladungscode wirklich durch `schreibeAngabe`, und geprüft wird
   der Code, den Jannik später kopiert - nicht ein nachgebauter. */
function macheLeitungsErsatz() {
  const gebaut = [];
  const macheVerbindungErsatz = ({ istGastgeber, vermittler, fach }) => {
    const leitung = {
      istGastgeber, fach, gesendet: [], zustandHoerer: [], empfangHoerer: [],
      async oeffne() {
        const anhang = istGastgeber ? "-angebot" : "-antwort";
        await vermittler.lege(fach + anhang, {
          art: istGastgeber ? ANGEBOT : ANTWORT, leitung: "v=0 erfundene Netzkarte"
        });
        return new Promise((fertig) => { leitung.oeffneFertig = fertig; });
      },
      sende(text) { leitung.gesendet.push(text); return true; },
      beiEmpfang(fn) { leitung.empfangHoerer.push(fn); },
      beiZustand(fn) { leitung.zustandHoerer.push(fn); },
      schliesse() {}
    };
    gebaut.push(leitung);
    return leitung;
  };
  return { gebaut, netzwerk: { macheVerbindung: macheVerbindungErsatz, vermittlerVonHand } };
}

{
  abschnitt("Vorlauf: Runde eröffnen");
  const netz = macheLeitungsErsatz();
  const probe = macheLobbyProbe(netz);
  probe.klick("eroeffnen");
  gleich(probe.lobby.stand().spielerZahl, 2, "eine eröffnete Runde beginnt zu zweit");
  probe.klick("spieler:3");
  gleich(probe.lobby.stand().spielerZahl, 3, "die Spielerzahl lässt sich stellen");
  probe.klick("platz:2");
  probe.klick("held:1");
  gleich(probe.lobby.stand().helden[1], "schildtraeger", "Platz 2 bekommt seine Klasse");

  probe.klick("los");
  await new Promise((f) => setTimeout(f, 0));
  gleich(probe.lobby.stand().seite, "warten", "danach wird gewartet");
  gleich(probe.lobby.stand().wartetAuf, 2, "und zwar auf Platz 2");
  const code = probe.lobby.stand().code;
  behaupte(code.startsWith("HAT1."), `der Einladungscode steht da (${code.length} Zeichen)`);
  messungen.push(`Einladungscode mit einer erfundenen Netzkarte: ${code.length} Zeichen`);
  gleich(netz.gebaut.length, 1, "es wird genau eine Leitung geöffnet, nicht drei");
  gleich(netz.gebaut[0].fach,
    fachFuer(probe.lobby.stand().lobbycode, 2, heldenZiffern(probe.lobby.stand().helden)),
    "das Fach trägt Lobbycode, Platz und Truppe");

  /* Der Fall, der ohne diese Arbeit falsch wäre: eine Antwort, die zu
     einem anderen Platz gehört. Ohne Prüfung wartete der Gastgeber
     drei Minuten und wüsste nicht, warum. */
  const fremd = schreibeAngabe({
    art: ANTWORT, fach: fachFuer(probe.lobby.stand().lobbycode, 3, "015"), leitung: "v=0 fremd"
  });
  probe.lobby.beiEinfuegen(fremd);
  probe.klick("annehmen");
  behaupte(/anderen Platz|anderen Runde/.test(probe.lobby.stand().meldung),
    "eine fremde Antwort wird mit einem deutschen Satz abgewiesen");

  probe.lobby.beiEinfuegen(schreibeAngabe({
    art: ANGEBOT, fach: netz.gebaut[0].fach + ANHANG_ANGEBOT, leitung: "v=0 eigener"
  }));
  probe.klick("annehmen");
  behaupte(/eigener Einladungscode/.test(probe.lobby.stand().meldung),
    "der eigene Code wird als solcher erkannt");
}

{
  abschnitt("Vorlauf: beitreten");
  /* Der Gastgeber baut einen echten Einladungscode, der Gast liest ihn
     - und muss daraus dieselbe Saat und dieselbe Truppe holen. Geht
     das schief, bauen beide verschiedene Kerker, und `netz/sitzung.mjs`
     bricht beim ersten Beitritt ab. */
  const lobbycode = macheCode(999);
  const fach = fachFuer(lobbycode, 2, heldenZiffern(["grabraeuber", "flammenpriester"]));
  const einladung = schreibeAngabe({
    art: ANGEBOT, fach: fach + ANHANG_ANGEBOT, leitung: "v=0 echte Netzkarte"
  });

  const netz = macheLeitungsErsatz();
  const probe = macheLobbyProbe(netz);
  probe.klick("beitreten");
  probe.lobby.beiEinfuegen("kein Code");
  probe.klick("verbindenLos");
  behaupte(probe.lobby.stand().meldung !== "" && !/undefined/.test(probe.lobby.stand().meldung),
    `ein falscher Code gibt einen deutschen Satz: ${probe.lobby.stand().meldung}`);

  probe.lobby.beiEinfuegen(einladung);
  probe.klick("verbindenLos");
  await new Promise((f) => setTimeout(f, 0));
  gleich(probe.lobby.stand().seite, "verbinden", "danach wird verbunden");
  gleich(probe.lobby.stand().spielerZahl, 2, "die Spielerzahl kommt aus dem Code");
  gleich(probe.lobby.stand().helden.join(","), "grabraeuber,flammenpriester",
    "die Truppe kommt aus dem Code");
  gleich(probe.lobby.stand().platz, 2, "und der eigene Platz auch");
  behaupte(probe.lobby.stand().code.startsWith("HAT1."),
    "der Gast bekommt seinen Antwortcode zum Zurückschicken");

  netz.gebaut[0].oeffneFertig(true);
  await new Promise((f) => setTimeout(f, 0));
  const start = probe.holeStart();
  gleich(start.saat, 999, "und das Spiel beginnt mit der Saat des Gastgebers");
  gleich(start.istGastgeber, false, "der Gast ist nicht Gastgeber");
  gleich(start.verbindungen.length, 1, "er hält genau eine Leitung");
}

/* ── 5 · Die Abspielung ─────────────────────────────────────────────*/

{
  abschnitt("Abspieler");
  const zustand = { karte: null, wesen: [], nachId: new Map(), spieler: [] };
  const saetze = [];
  const abspieler = macheAbspieler({ beiSatz: (satz) => saetze.push(satz) });

  const pfad = [
    { x: 2, y: 2, ebene: 1, kosten: 0 }, { x: 3, y: 2, ebene: 1, kosten: 1 },
    { x: 4, y: 2, ebene: 1, kosten: 2 }, { x: 5, y: 2, ebene: 1, kosten: 3 }
  ];
  abspieler.lege([
    { art: "bewegt", wer: 1, pfad, apRest: 3 },
    { art: "wacht", wer: 1 }
  ]);
  zustand.wesen = [{ id: 1, art: "spaeher", seite: "jaeger", x: 5, y: 2, lebt: true }];
  zustand.nachId.set(1, zustand.wesen[0]);

  behaupte(abspieler.beschaeftigt(), "mit Ereignissen in der Reihe ist der Abspieler beschäftigt");
  abspieler.schritt(SCHRITT, zustand);
  const halb = abspieler.schau(zustand).wesen[0];
  behaupte(halb.x < 5, `nach einem Schritt steht die Figur erst bei x=${halb.x.toFixed(2)}, `
    + "nicht schon am Ziel");
  gleich(zustand.wesen[0].x, 5, "der Spielstand selbst wurde dabei nicht angefasst");

  /* Die Uhr: drei Felder zu je TEMPO.feld. Ein Feld weniger oder mehr
     fiele hier auf, im Bild nicht. */
  let gelaufen = SCHRITT;
  while (abspieler.beschaeftigt() && gelaufen < 5) {
    abspieler.schritt(SCHRITT, zustand);
    gelaufen += SCHRITT;
  }
  behaupte(gelaufen >= 3 * TEMPO.feld, `die Bewegung dauerte ${gelaufen.toFixed(2)} s, `
    + `mindestens ${(3 * TEMPO.feld).toFixed(2)} s`);
  behaupte(gelaufen < 3 * TEMPO.feld + 0.2, "und nicht wesentlich länger");
  messungen.push(`drei Felder gehen: ${gelaufen.toFixed(2)} s bei ${TEMPO.feld} s je Feld`);
  behaupte(!abspieler.beschaeftigt(), "danach ist die Reihe leer");
  gleich(abspieler.schau(zustand).wesen[0].x, 5, "und die Figur steht auf ihrem Feld");
  gleich(saetze.length, 2, "jedes Ereignis wurde als Satz gemeldet");
  behaupte(saetze.every((s) => s !== "" && !/undefined/.test(s)), "und jeder Satz ist deutsch");

  const still = macheAbspieler({ beiSatz: (satz) => saetze.push(satz) });
  const vorher = saetze.length;
  still.lege([{ art: "apGesetzt", wer: 1, ap: 3 }]);
  still.schritt(SCHRITT, zustand);
  gleich(saetze.length, vorher, "apGesetzt verstopft den Lauftext nicht");
}

/* ── 6 · Ein ganzes Spiel, ohne Browser ─────────────────────────────*/

const PROBE_BREIT = 400;
const PROBE_HOCH = 260;

function macheSpielProbe(saat = 7, blattArt = { mitschrift: false, pruefzahl: false }) {
  const zustand = macheLauf({ saat, spielerZahl: 1, tiefe: 1 });
  const sitzung = macheSitzung({ istGastgeber: true, zustand });
  const ctx = macheErsatzflaeche(PROBE_BREIT, PROBE_HOCH, blattArt);
  const spiel = macheSpiel({
    ctx, zustand, sitzung, platz: 1, fensterBreite: PROBE_BREIT, fensterHoehe: PROBE_HOCH
  });
  spiel.setzeFenster(PROBE_BREIT, PROBE_HOCH);
  return { zustand, sitzung, ctx, spiel };
}

{
  abschnitt("Spiel: Bild");
  const probe = macheSpielProbe();
  let zeit = 0;
  for (let i = 0; i < 12; i++) { zeit += SCHRITT; probe.spiel.bild(zeit); }

  const rechtecke = probe.ctx.rechtecke();
  behaupte(rechtecke > 1000, `${rechtecke} Rechtecke in 12 Bildern`);
  messungen.push(`Kerker bei ${PROBE_BREIT}x${PROBE_HOCH}: `
    + `${Math.round(rechtecke / 12)} Rechtecke je Bild`);
  gleich(probe.ctx.bruch(), null, "kein Rechteck auf einem halben Bildpunkt");
  gleich(probe.ctx.weich(), null,
    "nach dem Setzen der Blattmaße wird nichts geglättet gezeichnet");

  /* Der Fall, der ohne die Warteschlange falsch wäre: Die Eingabe
     nähme mitten in der Abspielung Klicks an. */
  const frisch = macheSpielProbe();
  gleich(frisch.spiel.stand().wartend > 0, true,
    `der Rundenanfang liegt als ${frisch.spiel.stand().wartend} Ereignisse in der Reihe`);
  frisch.spiel.bild(SCHRITT);
  frisch.spiel.bild(2 * SCHRITT);
  /* Gefragt wird die **Eingabe selbst** und nicht die eigene
     Buchführung: Eine Sperre, die nur im Kopf des Spiels steht, hält
     keinen einzigen Klick auf. */
  gleich(frisch.spiel.eingabe.ansicht().gesperrt, true,
    "solange abgespielt wird, ist die Eingabe taub");
  let uhr = 2 * SCHRITT;
  for (let i = 0; i < 400 && frisch.spiel.stand().wartend > 0; i++) {
    uhr += SCHRITT;
    frisch.spiel.bild(uhr);
  }
  frisch.spiel.bild(uhr + SCHRITT);
  gleich(frisch.spiel.eingabe.ansicht().gesperrt, false, "danach nimmt sie wieder an");
}

{
  abschnitt("Spiel: die Brut zieht durch die Sitzung");
  const probe = macheSpielProbe();
  let zeit = 0;
  const takte = (wieOft) => {
    for (let i = 0; i < wieOft; i++) { zeit += SCHRITT; probe.spiel.bild(zeit); }
  };
  takte(60);

  /* Der Jäger beendet seinen Zug - danach ist die Brut dran, und sie
     muss von selbst ziehen. Ohne die Klammer in `runtime/start.js`
     stünde das Spiel hier für immer. */
  const dran = amZugWesen(probe.zustand);
  behaupte(dran !== null && dran.seite === "jaeger", "zuerst ist ein Jäger am Zug");
  const vorher = probe.zustand.protokoll.length;
  probe.sitzung.willAktion({ typ: AKTION.zugEnde, wer: dran.id });
  takte(1200);

  const nachher = probe.zustand.protokoll.length;
  behaupte(nachher > vorher + 1, `die Brut hat ${nachher - vorher - 1} Aktionen gespielt`);
  /* Und zwar **durch die Sitzung**: Nur was dort durchging, steht im
     Protokoll und wäre über eine Leitung bei den Gästen angekommen. */
  gleich(probe.sitzung.stand().naechsteNummer, nachher + 1,
    "jede angewandte Aktion trägt eine Nummer der Sitzung");
  behaupte(probe.zustand.runde >= 2 || probe.zustand.vorbei !== null,
    `nach dem Brutzug ist Runde ${probe.zustand.runde}`);
  behaupte(probe.spiel.stand().meldungen > 0, "im Lauftext stehen Sätze");
}

{
  abschnitt("Spiel: dieselbe Saat, dieselbe Mitschrift");
  /* Zweimal dasselbe Spiel muss byteweise dieselbe Aufrufliste geben.
     Ein `Math.random` im Bild ließe den Boden flimmern - und jeden
     Bildschirmfoto-Bericht wertlos werden. */
  /* Verglichen wird eine Prüfzahl über die ganze Mitschrift und nicht
     die Mitschrift selbst: Zwölf Bilder sind fünfzehn Millionen
     Zeichen, und zwei davon im Speicher zu halten ist der teuerste
     Weg zu derselben Aussage. */
  const wie = (saat) => {
    const probe = macheSpielProbe(saat, { mitschrift: false, pruefzahl: true });
    let zeit = 0;
    for (let i = 0; i < 12; i++) { zeit += SCHRITT; probe.spiel.bild(zeit); }
    return { summe: probe.ctx.summe(), anzahl: probe.ctx.anzahl() };
  };
  const eins = wie(12345);
  const zwei = wie(12345);
  gleich(zwei.anzahl, eins.anzahl, `${eins.anzahl} Aufrufe, beide Male gleich viele`);
  gleich(zwei.summe, eins.summe, "und dieselbe Prüfzahl darüber");
  messungen.push(`12 Bilder derselben Saat: ${eins.anzahl} Aufrufe, Prüfzahl ${eins.summe}`);
  const anders = wie(54321);
  behaupte(anders.summe !== eins.summe, "eine andere Saat gibt ein anderes Bild");
}

/* Kommentare heraus, bevor gesucht wird. Ohne das schlüge diese
   Prüfung bei jeder Datei an, die `Math.random` **verbietet** - und ein
   Wächter, der die Einhaltung der Regel meldet, gewöhnt einem das
   Übergehen an. */
function ohneKommentare(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function listeOrdner(ordner) {
  const raus = [];
  for (const name of readdirSync(join(WURZEL, ordner)).sort()) {
    const rel = `${ordner}/${name}`;
    if (statSync(join(WURZEL, rel)).isDirectory()) raus.push(...listeOrdner(rel));
    else if (/\.(js|mjs)$/.test(name)) raus.push(rel);
  }
  return raus;
}

{
  abschnitt("Nur eine Zufallsquelle");
  /* `spiel/` prüft `pruefe-kern.mjs`. Hier geht es um `runtime/` und
     `netz/`: Ein zweiter Wurf dort wäre das Ende des Netz-Koop, und er
     fiele nie als Fehler auf - das Spiel liefe weiter, nur auf jedem
     Rechner anders. */
  const dateien = [...listeOrdner("runtime"), ...listeOrdner("netz"), "sw.js"];
  behaupte(dateien.length > 15, `${dateien.length} Dateien durchsucht`);
  const gefunden = dateien.filter((d) => /Math\.random/.test(ohneKommentare(liesWurzel(d))));
  behaupte(/Math\.random/.test(liesWurzel("runtime/zeichnen.js")),
    "runtime/zeichnen.js nennt Math.random - im Kommentar, und das zählt nicht");
  gleich(gefunden.join(", "), "runtime/start.js",
    "Math.random steht in genau einer Datei unter runtime/, netz/ und sw.js");
}

/* ── 7 · Die Verdrahtung im Browser ─────────────────────────────────

   `starte` holt das Blatt, meldet die Hörer an und wechselt vom
   Vorlauf ins Spiel. Ohne einen erfundenen Browser bliebe genau dieser
   Teil ungeprüft - und er ist der, in dem ein Tippfehler die Seite
   schwarz lässt, ohne dass irgendwo etwas steht. */
function macheBrowserErsatz() {
  const ctx = macheErsatzflaeche(640, 360, { mitschrift: false, pruefzahl: false });
  const hoerer = [];
  const melde = (wo, name, fn) => hoerer.push({ wo, name, fn });
  const schriftstueck = {
    visibilityState: "visible",
    fullscreenElement: null,
    addEventListener: (name, fn) => melde("schrift", name, fn),
    removeEventListener: () => {}
  };
  /* Maße **durchgereicht**: Im Browser ist das Blatt dasselbe Ding wie
     `ctx.canvas`. Zwei getrennte Felder hätten die Prüfung an genau
     der Stelle blind gemacht, an der der Glättungsfehler entsteht. */
  const blatt = {
    get width() { return ctx.canvas.width; },
    set width(wert) { ctx.canvas.width = wert; },
    get height() { return ctx.canvas.height; },
    set height(wert) { ctx.canvas.height = wert; },
    clientWidth: 640, clientHeight: 360,
    ownerDocument: schriftstueck,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 }),
    addEventListener: (name, fn) => melde("blatt", name, fn),
    removeEventListener: () => {},
    requestFullscreen: () => { schriftstueck.fullscreenElement = blatt; }
  };
  const bilder = [];
  const alt = {
    document: globalThis.document,
    raf: globalThis.requestAnimationFrame,
    an: globalThis.addEventListener
  };
  globalThis.document = schriftstueck;
  globalThis.requestAnimationFrame = (fn) => { bilder.push(fn); return bilder.length; };
  globalThis.addEventListener = (name, fn) => melde("fenster", name, fn);

  return {
    ctx, blatt, hoerer, bilder, schriftstueck,
    feuere(name, ereignis = {}) {
      for (const h of [...hoerer]) if (h.name === name) h.fn(ereignis);
    },
    naechstesBild(zeit) {
      const fn = bilder.pop();
      bilder.length = 0;
      if (fn) fn(zeit);
    },
    raeumeAuf() {
      globalThis.document = alt.document;
      globalThis.requestAnimationFrame = alt.raf;
      globalThis.addEventListener = alt.an;
    }
  };
}

{
  abschnitt("Verdrahtung");
  const welt = macheBrowserErsatz();
  try {
    const lauf = starte(welt.blatt);
    const namen = welt.hoerer.map((h) => `${h.wo}:${h.name}`).sort();
    for (const noetig of ["blatt:mousedown", "blatt:mousemove", "fenster:blur",
      "fenster:focus", "fenster:resize", "schrift:keydown", "schrift:paste"]) {
      behaupte(namen.includes(noetig), `angemeldet: ${noetig}`);
    }
    gleich(welt.bilder.length, 1, "ein Bild ist angefordert");
    gleich(welt.blatt.width, 640, "das Blatt hat die Maße des Fensters bekommen");
    gleich(welt.ctx.erster()[0], "glaettung", "die Glättung ist vor allem anderen aus");

    welt.naechstesBild(16);
    behaupte(welt.ctx.rechtecke() > 0, "der Vorlauf malt");

    /* Der Fall, der ohne die Abschaltung in `setzeBlatt` falsch wäre:
       Das Fenster ändert sich, während pausiert ist und noch kein
       Spiel läuft. Dann setzt **allein** diese Stelle die Blattmaße,
       und das Pausenbild malt unmittelbar danach - ohne die Zeile
       wäre es das erste geglättete Bild (Fehlerbuch D1). */
    welt.feuere("blur");
    welt.blatt.clientWidth = 520;
    welt.blatt.clientHeight = 300;
    welt.feuere("resize");
    welt.naechstesBild(20);
    gleich(welt.blatt.width, 520, "das Blatt hat die neue Breite");
    gleich(welt.ctx.weich(), null, "auch nach einer Größenänderung in der Pause bleibt es hart");
    welt.feuere("focus");
    welt.blatt.clientWidth = 640;
    welt.blatt.clientHeight = 360;
    welt.feuere("resize");
    welt.naechstesBild(24);

    /* Vom Titelbild bis in den Kerker, über echte Mausklicks. */
    const klick = (schluessel) => {
      const stelle = lauf.lobby().stellenJetzt().find((s) => s.schluessel === schluessel);
      behaupte(!!stelle, `der Knopf ${schluessel} ist da`);
      welt.feuere("mousedown", {
        clientX: stelle.x + 2, clientY: stelle.y + 2, button: 0, preventDefault: () => {}
      });
    };
    klick("allein");
    welt.naechstesBild(32);
    /* Eine feste Saat eintippen: Sonst würfelte `starte` bei jedem
       Lauf einen anderen Kerker, und die gemessenen Zahlen dieser
       Prüfung wären beim zweiten Aufruf andere. */
    klick("saat");
    for (let i = 0; i < 10; i++) welt.feuere("keydown", { key: "Backspace" });
    for (const zeichen of "7") welt.feuere("keydown", { key: zeichen });
    gleich(lauf.lobby().stand().saat, 7, "die getippte Saat steht im Feld");

    /* Der Fall, der ohne diese Arbeit falsch wäre: Im Vorlauf muss
       jeder Buchstabe ins Feld gehen. Bekäme „F" hier das Vollbild,
       könnte niemand „Wolf" als Namen eintippen. */
    klick("name");
    for (const zeichen of "Wolf") welt.feuere("keydown", { key: zeichen });
    gleich(lauf.lobby().stand().name, "Wolf", "im Vorlauf geht jeder Buchstabe ins Feld");
    gleich(welt.schriftstueck.fullscreenElement, null, "und keiner ins Vollbild");
    klick("saat");
    klick("los");
    behaupte(lauf.spied === undefined, "der Vorlauf gibt ab");
    behaupte(lauf.lobby() === null, "und ist danach fort");
    behaupte(lauf.stand() !== null, "das Spiel steht");

    let zeit = 48;
    for (let i = 0; i < 10; i++) { zeit += 16; welt.naechstesBild(zeit); }
    gleich(welt.ctx.bruch(), null, "kein Rechteck auf einem halben Bildpunkt");
    gleich(welt.ctx.weich(), null, "nichts wird geglättet gezeichnet");

    /* Fokus weg: Es wird pausiert, und ein Klick weckt wieder auf.
       Gemessen wird gegen ein gewöhnliches Bild - eine feste Zahl
       veraltete beim ersten Umbau des Kerkers. */
    const zaehle = () => welt.ctx.rechtecke();
    const vorNormal = zaehle();
    welt.naechstesBild(zeit + 16);
    const normal = zaehle() - vorNormal;
    welt.feuere("blur");
    const vorPause = zaehle();
    welt.naechstesBild(zeit + 32);
    const inPause = zaehle() - vorPause;
    behaupte(inPause * 5 < normal,
      `in der Pause ${inPause} Rechtecke gegen ${normal} eines gewöhnlichen Bildes`);
    messungen.push(`Pausenbild ${inPause} Rechtecke, gewöhnliches Bild ${normal}`);
    welt.feuere("mousedown", { clientX: 1, clientY: 1, button: 0, preventDefault: () => {} });
    const vorWeiter = zaehle();
    welt.naechstesBild(zeit + 48);
    behaupte(zaehle() - vorWeiter > normal / 4, "nach dem Klick läuft es weiter");

    welt.feuere("keydown", { key: "f", preventDefault: () => {} });
    behaupte(welt.schriftstueck.fullscreenElement === welt.blatt,
      "im Spiel schaltet F das Vollbild ein");
  } finally {
    welt.raeumeAuf();
  }
}

{
  abschnitt("Zwischenablage");
  /* Der Fall, der ohne den zweiten Weg falsch wäre: Über `http://` im
     Heimnetz verweigert der neue Weg den Dienst - und der Code steht
     auf einem Zeichenblatt, auf dem sich nichts markieren lässt. Dann
     ist er unerreichbar, obwohl er dasteht. */
  const felder = [];
  const schriftstueck = {
    body: { appendChild: () => {} },
    createElement: () => {
      const feld = {
        value: "", style: {}, setAttribute: () => {}, select: () => {}, remove: () => {}
      };
      felder.push(feld);
      return feld;
    },
    execCommand: (was) => was === "copy"
  };
  /* `navigator` ist in Node ein Nur-Lese-Feld; ausgetauscht wird es
     deshalb über die Beschreibung und danach wieder zurückgelegt. */
  const alteBeschreibung = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const setzeNavi = (wert) => Object.defineProperty(globalThis, "navigator", {
    value: wert, configurable: true, writable: true
  });
  try {
    setzeNavi(undefined);
    await macheAblage(schriftstueck).kopiere("HAT1.abc");
    gleich(felder.length, 1, "ohne neuen Weg wird der alte genommen");
    gleich(felder[0].value, "HAT1.abc", "und der Code landet wirklich darin");

    let geschrieben = null;
    setzeNavi({ clipboard: { writeText: async (t) => { geschrieben = t; } } });
    await macheAblage(schriftstueck).kopiere("HAT1.xyz");
    gleich(geschrieben, "HAT1.xyz", "mit neuem Weg geht es darüber");
    gleich(felder.length, 1, "und ohne ein Feld in der Seite");

    setzeNavi({ clipboard: {} });
    const ohne = macheAblage(null);
    let gefangen = null;
    await ohne.kopiere("x").catch((fund) => { gefangen = fund; });
    behaupte(gefangen !== null, "ohne beide Wege wird geworfen statt still zu scheitern");
  } finally {
    if (alteBeschreibung) Object.defineProperty(globalThis, "navigator", alteBeschreibung);
    else delete globalThis.navigator;
  }
}

{
  abschnitt("Fehlende Angaben");
  wirft(() => macheLobby({}), "eine Lobby ohne Zeichenblatt");
  wirft(() => macheLobby({ ctx: macheErsatzflaeche() }), "eine Lobby ohne beiStart");
  wirft(() => macheLobby({ ctx: macheErsatzflaeche(), beiStart: () => {} }),
    "eine Lobby ohne Würfel");
  wirft(() => macheSpiel({}), "ein Spiel ohne Zeichenblatt");
  wirft(() => macheSpiel({ ctx: macheErsatzflaeche() }), "ein Spiel ohne Spielstand");
}

for (const zeile of messungen) console.log(`      · ${zeile}`);
ende("Einstieg");
