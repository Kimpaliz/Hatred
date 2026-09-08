/* [Aufgabe: Prüfwesen] Hält jeden „*Geprüft:*"-Verweis in
   `docs/REGELN.md` gegen die Prüfdatei, die er nennt.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Unter der Regel „Alle Importpfade sind relativ" stand als Beweis
   `werkzeuge/pruefe-verweise.mjs` (bis zum 07.09.2026). Jene Datei hält
   Markdown-Verweise der Doku gegen die Platte und sieht keinen einzigen
   Importpfad. Die Regel war also unbelegt — und der Verweis sah richtig
   aus, weil es die Datei gibt. Genau daran fiel es zwei Wochen lang
   niemandem auf.

   Geprüft wird deshalb der Fall, der ohne diese Arbeit falsch wäre.
   Die naheliegende Prüfung — „gibt es die genannte Datei?" — wäre an
   jenem Tag **grün** geblieben. Sie fängt den Tippfehler im Dateinamen,
   nicht die falsche Datei.

   Der Beweis muss von beiden Seiten kommen: Die Regel nennt die Datei,
   **und die Datei nennt in ihrer Kopfnotiz die Regelnummer zurück**.
   Wer eine Prüfung fälschlich als Beweis einträgt, müsste dafür ihre
   Kopfnotiz aufschlagen und dort eine Unwahrheit hinschreiben. Das ist
   keine Unachtsamkeit mehr.

   Gelesen wird ausschließlich die **Kopfnotiz**, nicht die ganze Datei.
   Eine Nummer, die irgendwo im Rumpf in einem Meldetext steht,
   beantwortet die Frage „wofür ist diese Datei da" nicht — und sie
   entwertete die Prüfung sofort: `pruefe-arbeitsweise.mjs` schreibt
   „Regel 1" seit jeher in ihre Meldungen, und `pruefe-app.mjs` trug die
   Nummer mitten im Rumpf. Eine Rumpfsuche hätte beide durchgewinkt.

   Die Form ist **eine einzige**: `docs/REGELN.md <Nummer>`, Backticks um
   den Pfad erlaubt. Zwei Formen nebeneinander wären zwei Suchmuster, und
   das zweite vergisst man beim Ändern.

   ── Was hier bewusst nicht geprüft wird ────────────────────────────

   Ob eine Prüfung ihre Regel **inhaltlich** einlöst. Das kann keine
   Maschine lesen; es bleibt Handarbeit. Diese Datei sichert nur, dass
   die Behauptung von beiden Seiten unterschrieben ist — wer sie
   einseitig ändert, wird rot. Ebenso wenig verlangt sie, dass jede
   Regel einen Nachweis hat: Regeln wie „jede Zahl ist gemessen" sind
   Haltung und haben absichtlich keine Prüfdatei.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `docs/REGELN.md` (die Verweise), jeder dort genannten
   `werkzeuge/pruefe-…mjs` (nur die Kopfnotiz, nur gelesen),
   `werkzeuge/helfer.mjs` (Behauptungen und Abschluss) und
   `werkzeuge/pruefe-alles.mjs`, das diese Datei als eigenen Prozess
   startet. */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { abschnitt, behaupte, gleich, ende, liesDatei, WURZEL } from "./helfer.mjs";

const QUELLE = "docs/REGELN.md";

/* Gemessen am 08.09.2026: 10 Verweise in 9 Absätzen — die Zahl druckt
   `node werkzeuge/pruefe-regelwerk.mjs` bei jedem Lauf. Der Boden steht
   hier, damit ein stilles Verschwinden auffällt: Wer einen Nachweis
   streicht, muss diese Zahl mit der Hand senken. */
const MINDESTENS_VERWEISE = 10;

/* Die eine erlaubte Form eines Rückverweises. */
const nenntRegel = (kopf, nummer) => {
  for (const treffer of kopf.matchAll(/`?docs\/REGELN\.md`?\s+(\d+)/g))
    if (Number(treffer[1]) === nummer) return true;
  return false;
};

/* Alle Regelnummern, die eine Kopfnotiz zurückgibt. */
const genannteRegeln = (kopf) =>
  [...kopf.matchAll(/`?docs\/REGELN\.md`?\s+(\d+)/g)].map((t) => Number(t[1]));

/* Die Kopfnotiz ist alles bis zum ersten Kommentarschluss — dieselbe
   Grenze, die `pruefe-kopfnotiz.mjs` zieht. */
function kopfnotiz(text) {
  const zeilen = text.split(/\r?\n/);
  const schluss = zeilen.findIndex((z) => z.includes("*/"));
  return schluss < 0 ? "" : zeilen.slice(0, schluss + 1).join("\n");
}

/* Jeder Nachweis-Absatz mit seiner Regelnummer und den Dateien, die er
   nennt. Ein Absatz endet an der ersten leeren Zeile: Der Nachweis zu
   Regel 14 nennt zwei Dateien über vier Zeilen hinweg. */
function liesAbsaetze(text) {
  const zeilen = text.split(/\r?\n/);
  const raus = [];
  let regel = null;
  for (let i = 0; i < zeilen.length; i++) {
    const nummeriert = /^## (\d+)\./.exec(zeilen[i]);
    if (nummeriert) { regel = Number(nummeriert[1]); continue; }
    if (/^## /.test(zeilen[i])) { regel = null; continue; }
    if (!/^\*Geprüft:\*/.test(zeilen[i])) continue;
    let absatz = "";
    for (let j = i; j < zeilen.length && zeilen[j].trim() !== ""; j++) absatz += zeilen[j] + " ";
    const dateien = [...absatz.matchAll(/`([^`]+\.mjs)`/g)].map((t) => t[1]);
    raus.push({ regel, zeile: i + 1, dateien });
  }
  return raus;
}

/* ── 1. Selbstprobe ─────────────────────────────────────────────────
   Erst der Leser, dann das Dokument. Ein Leser, der nichts findet,
   ließe jede Schleife unten leer laufen und meldete für immer „grün" —
   der schlimmste denkbare Fehler an dieser Stelle. */
{
  abschnitt("Der Leser");

  const probe = [
    "## 3. Etwas", "", "Text.", "",
    "*Geprüft:* `werkzeuge/pruefe-eins.mjs` für das eine und",
    "`werkzeuge/pruefe-zwei.mjs` für das andere.", "",
    "## Ohne Nummer", "", "*Geprüft:* `werkzeuge/pruefe-drei.mjs`.", ""
  ].join("\n");
  /* Der Ersatzwert ist kein Schmuck: Findet der Leser nichts, soll die
     Selbstprobe das **behaupten** und nicht an einem Zugriff auf
     `undefined` abstürzen. Ein Absturz ist zwar auch rot, sagt aber
     nicht, was fehlt. */
  const leer = { regel: "kein Absatz", dateien: [] };
  const probeAbsaetze = liesAbsaetze(probe);
  const [erster = leer, zweiter = leer] = probeAbsaetze;
  gleich(probeAbsaetze.length, 2, "beide Nachweis-Absätze werden gefunden");
  gleich(erster.dateien.length, 2, "ein Absatz über zwei Zeilen nennt beide Dateien");
  gleich(erster.regel, 3, "der Absatz kennt die Nummer seiner Regel");
  gleich(zweiter.regel, null, "ein Absatz außerhalb einer nummerierten Regel hat keine");
  gleich((liesAbsaetze("*Geprüft:* nichts in Backticks.\n")[0] ?? leer).dateien.length, 0,
    "ein Absatz ohne Dateinamen nennt keine Datei");
  gleich(liesAbsaetze("Text über *Geprüft:* mitten in der Zeile.\n").length, 0,
    "nur am Zeilenanfang gilt es als Nachweis");

  abschnitt("Der Rückverweis");
  const kopf = kopfnotiz(
    "/* [Aufgabe: Prüfwesen] X.\n   Deckt docs/REGELN.md 7. */\nconst a = 1;\n");
  behaupte(nenntRegel(kopf, 7), "die Kopfnotiz gibt ihre Nummer zurück");
  behaupte(!nenntRegel(kopf, 8), "eine andere Nummer gilt nicht als Rückverweis");
  behaupte(nenntRegel("`docs/REGELN.md` 13", 13), "Backticks um den Pfad sind erlaubt");
  behaupte(!nenntRegel("docs/REGELN.md, Regel 13", 13),
    "nur die eine Form zählt, nicht eine Nummer hinter einem Komma");
  behaupte(!nenntRegel(kopfnotiz("/* X. */\nmelde(1, `docs/REGELN.md 7`);\n"), 7),
    "eine Nummer im Rumpf zählt nicht — nur die Kopfnotiz");
  gleich(genannteRegeln("docs/REGELN.md 7 und docs/REGELN.md 8").join(","), "7,8",
    "beide Nummern einer Kopfnotiz werden gelesen");
  gleich(kopfnotiz("const a = 1;\n"), "", "eine Datei ohne Kopfnotiz liefert leeren Text");
}

/* ── 2. Das Dokument ────────────────────────────────────────────────*/

const regeltext = liesDatei(QUELLE);
const absaetze = liesAbsaetze(regeltext);
const verweise = absaetze.flatMap((a) => a.dateien.map((d) => ({ regel: a.regel, datei: d })));
const marken = (regeltext.match(/^\*Geprüft:\*/gm) || []).length;

{
  abschnitt("Der Bestand");

  gleich(absaetze.length, marken, `der Leser sieht jeden Nachweis-Absatz in ${QUELLE}`);
  behaupte(verweise.length >= MINDESTENS_VERWEISE,
    `${QUELLE} nennt mindestens ${MINDESTENS_VERWEISE} Nachweise (jetzt ${verweise.length})`);

  for (const a of absaetze) {
    behaupte(a.dateien.length > 0,
      `${QUELLE}:${a.zeile}: der Nachweis nennt eine Datei in Backticks`);
    behaupte(a.regel !== null,
      `${QUELLE}:${a.zeile}: der Nachweis steht unter einer nummerierten Regel`);
  }
}

{
  abschnitt("Die genannte Datei gibt es");
  for (const v of verweise) {
    behaupte(existsSync(join(WURZEL, v.datei)),
      `Regel ${v.regel} nennt \`${v.datei}\` — und die Datei liegt da`);
  }
}

/* Der Wächter. Am 07.09.2026 wäre er rot gewesen: `pruefe-verweise.mjs`
   spricht in ihrer Kopfnotiz von Markdown-Verweisen und nirgends von
   der Regel, für die sie als Beweis eingetragen war. */
const koepfe = new Map();
for (const v of verweise) {
  if (koepfe.has(v.datei) || !existsSync(join(WURZEL, v.datei))) continue;
  koepfe.set(v.datei, kopfnotiz(liesDatei(v.datei)));
}

{
  abschnitt("Die Datei nennt ihre Regel zurück");
  for (const v of verweise) {
    const kopf = koepfe.get(v.datei);
    /* Beides ist oben schon gemeldet; hier nur nicht zweimal. */
    if (kopf === undefined || v.regel === null) continue;
    behaupte(nenntRegel(kopf, v.regel),
      `\`${v.datei}\` steht unter Regel ${v.regel}, ihre Kopfnotiz nennt ` +
      `\`docs/REGELN.md ${v.regel}\` aber nicht (genannt: ` +
      `${genannteRegeln(kopf).join(", ") || "keine Regel"})`);
  }
}

{
  abschnitt("Beide Richtungen decken sich");

  /* Eine Datei unter zwei Regeln deckt zwei verschiedene Sachen. Nennt
     sie nur eine Nummer zurück, bleibt die andere unbelegt — und
     niemand sieht es, weil ja „irgendeine" Nummer dasteht. */
  const jeDatei = new Map();
  for (const v of verweise) {
    if (!jeDatei.has(v.datei)) jeDatei.set(v.datei, new Set());
    jeDatei.get(v.datei).add(v.regel);
  }

  for (const [datei, nummern] of jeDatei) {
    const kopf = koepfe.get(datei);
    if (kopf === undefined || nummern.size < 2) continue;
    const soll = [...nummern].sort((a, b) => a - b);
    const fehlend = soll.filter((n) => !nenntRegel(kopf, n));
    behaupte(fehlend.length === 0,
      `\`${datei}\` deckt die Regeln ${soll.join(" und ")} — ihre Kopfnotiz ` +
      `muss beide nennen (es fehlt: ${fehlend.join(", ")})`);
  }

  /* Die Gegenrichtung: eine Nummer in der Kopfnotiz, unter der die
     Datei gar nicht steht. So kam „Regel 14" in `pruefe-doku-status.mjs`
     zustande — eine Nummer aus einem fremden Regelwerk, mitkopiert. */
  for (const [datei, kopf] of koepfe) {
    const soll = jeDatei.get(datei);
    const zuviel = genannteRegeln(kopf).filter((n) => !soll.has(n));
    behaupte(zuviel.length === 0,
      `\`${datei}\` nennt Regel ${zuviel.join(", ")}, steht aber nur unter ` +
      `Regel ${[...soll].sort((a, b) => a - b).join(", ")}`);
  }
}

const doppelt = [...koepfe.keys()]
  .filter((d) => verweise.filter((v) => v.datei === d).length > 1);

console.log(`      · ${verweise.length} Nachweis-Verweise in ${absaetze.length} Absätzen, ` +
  `${koepfe.size} Prüfdateien`);
console.log(`      · mehrfach genannt: ${doppelt.join(", ") || "keine"}`);

ende("Regelwerk und Nachweise");
