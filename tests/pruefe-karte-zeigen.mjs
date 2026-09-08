/* [Aufgabe: Prüfwesen] Was `werkzeuge/karte-zeigen.mjs` druckt, muss
   lesbar und vollständig sein — geprüft wird die Ausgabe, nicht der
   Quelltext.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Am 06.09.2026 hat ein Durchgang durch alle Werkzeuge gefragt: Zu was
   ein Werkzeug **erzeugt**, gibt es dann auch eine Prüfung? Bei diesem
   hier lautete die Antwort nein — und in derselben Stunde fielen zwei
   Sachen auf, die es seit dem ersten Tag gab:

   · Jede Oberkante einer Tafel war **genau ein Zeichen zu breit**
     (59 gegen 58). Niemandem aufgefallen, und keine Zeile im Projekt
     hätte es je bemerkt.
   · Die Größen der Zähltabellen standen fest im Text: `new Array(6)`
     für die Flüssigkeiten, `new Array(8)` für die Böden, dazu eine
     Namensliste mit sechs Einträgen. Wer in `spiel/gitter.mjs` eine
     siebte Flüssigkeit einträgt — Säure, Wachs, was auch immer —,
     bekäme von diesem Werkzeug lautlos `undefined:NaN` gedruckt, und
     die ganze Kette bliebe grün.

   Beides ist behoben; das hier ist die Stelle, die verhindert, dass es
   wiederkommt. Geprüft wird deshalb:

   · **Alle Zeilen einer Tafel sind gleich breit.** Das ist die
     Behauptung, die den Ein-Zeichen-Fehler fängt — und sie fängt ihn
     unabhängig von der Länge des Titels, im Gegensatz zu einer festen
     Zahl.
   · **Kein `undefined`, kein `NaN`, kein `?` im Bild.** Das `?` ist die
     Notfallausgabe für ein Zeichen, das die Tabelle nicht kennt
     (`ZEICHEN_HINDERNIS[h] ?? "?"`). Erscheint es, fehlt ein Eintrag.
   · **Jede Flüssigkeit und jeder Boden aus `spiel/gitter.mjs` kommt
     namentlich vor.** Nicht die Anzahl — die Namen. Eine Zählung
     verglich nur zwei Zahlen; die Namen beweisen, dass die Zuordnung
     stimmt und nicht bloß die Länge.

   ── Was hier bewusst nicht geprüft wird ────────────────────────────

   Ob die Karte **gut** ist. Genau dafür gibt es dieses Werkzeug: Ein
   Mensch sieht es an. `tests/pruefe-landschaft.mjs` prüft, ob sie
   richtig ist. Hier steht nur, dass das Bild ankommt.

   ── Arbeitet zusammen mit ──────────────────────────────────────────

   `werkzeuge/karte-zeigen.mjs` (läuft hier als eigener Prozess),
   `spiel/gitter.mjs` (die Wahrheit über Flüssigkeiten und Böden),
   `tests/helfer.mjs`, `werkzeuge/pruefe-alles.mjs`. */

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { behaupte, gleich, abschnitt, ende, WURZEL } from "./helfer.mjs";
import { BODEN, FLUESSIG } from "../spiel/gitter.mjs";

const SAAT = "7";

abschnitt("die gedruckte Karte");

let ausgabe = "";
let lief = true;
try {
  ausgabe = execFileSync(process.execPath,
    [join(WURZEL, "werkzeuge", "karte-zeigen.mjs"), SAAT],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (fehler) {
  lief = false;
  ausgabe = String(fehler.stdout || "");
  behaupte(false, `karte-zeigen läuft durch: ${String(fehler.stderr || "").trim().split("\n")[0]}`);
}

const zeilen = ausgabe.split("\n");
behaupte(lief && zeilen.length > 40, `es kommt ein Bild heraus: ${zeilen.length} Zeilen`);

/* ── Alle Zeilen einer Tafel sind gleich breit ────────────────────── */

/* Eine Tafel beginnt mit `┌`, endet mit `└` und hat `│` dazwischen.
   Gemessen wird in Zeichen, nicht in Bytes — die Rahmenzeichen sind
   drei Bytes lang, und `length` auf der Zeichenkette zählt richtig,
   solange nichts außerhalb der Grundebene steht (Fehlerbuch C3). */
const tafeln = [];
let offen = null;
for (const zeile of zeilen) {
  if (zeile.startsWith("┌")) { offen = [zeile]; continue; }
  if (offen && (zeile.startsWith("│") || zeile.startsWith("└"))) {
    offen.push(zeile);
    if (zeile.startsWith("└")) { tafeln.push(offen); offen = null; }
  }
}
behaupte(tafeln.length >= 2, `es gibt Tafeln: ${tafeln.length}`);

for (const tafel of tafeln) {
  const breiten = new Set(tafel.map((z) => [...z].length));
  const titel = (tafel[0].match(/┌─ (.+?) ─/) || [, "?"])[1];
  gleich(breiten.size, 1,
    `die Tafel „${titel}" ist überall gleich breit (${[...breiten].join(", ")})`);
}

/* ── Nichts Unbekanntes im Bild ───────────────────────────────────── */

for (const wort of ["undefined", "NaN", "Infinity"]) {
  const wo = zeilen.findIndex((z) => z.includes(wort));
  const stelle = wo >= 0 ? ` — Zeile ${wo + 1}: ${zeilen[wo].trim()}` : "";
  behaupte(wo < 0, `nirgends „${wort}"${stelle}`);
}

/* Das `?` ist die Notfallausgabe für ein Zeichen ohne Tabelleneintrag. */
const mitFrage = tafeln.flat().filter((z) => z.includes("?"));
gleich(mitFrage.length, 0,
  `kein unbekanntes Zeichen im Bild${mitFrage.length ? ` — ${mitFrage[0].trim()}` : ""}`);

/* ── Jede Art aus dem Gitter kommt namentlich vor ──────────────────── */

abschnitt("nichts fehlt aus spiel/gitter.mjs");

const fluessigZeile = zeilen.find((z) => z.includes("Flüssig:")) || "";
const bodenZeile = zeilen.find((z) => z.trim().startsWith("Boden:")) || "";
behaupte(fluessigZeile !== "", "es gibt eine Zeile mit den Flüssigkeiten");
behaupte(bodenZeile !== "", "es gibt eine Zeile mit den Böden");

for (const name of Object.keys(FLUESSIG)) {
  if (name === "keine") continue;   /* steht als „–“ da, das ist Absicht */
  behaupte(fluessigZeile.includes(`${name}:`),
    `die Flüssigkeit „${name}" steht in der Zeile`);
}
for (const name of Object.keys(BODEN)) {
  behaupte(bodenZeile.includes(`${name}:`), `der Boden „${name}" steht in der Zeile`);
}

/* Und die Gegenprobe: nicht mehr Einträge als Arten. Sonst zählte das
   Werkzeug eine Art mit, die es im Gitter gar nicht gibt. */
gleich((fluessigZeile.match(/\S+:\d+/g) || []).length, Object.keys(FLUESSIG).length,
  "so viele Flüssigkeiten wie im Gitter");
gleich((bodenZeile.match(/\S+:\d+/g) || []).length, Object.keys(BODEN).length,
  "so viele Böden wie im Gitter");

console.log(`      · Saat ${SAAT}: ${zeilen.length} Zeilen, ${tafeln.length} Tafeln, `
  + `alle gleich breit; ${Object.keys(FLUESSIG).length} Flüssigkeiten und `
  + `${Object.keys(BODEN).length} Böden benannt`);
ende("Die gedruckte Karte");
