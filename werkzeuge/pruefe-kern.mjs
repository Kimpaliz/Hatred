/* [Aufgabe: Prüfwesen] Hält `spiel/` browserfrei: Textsuche nach den
   verbotenen Wörtern — aber nur dort, wo wirklich Code steht.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   An dieser einen Regel hängt der Netz-Koop. Steht irgendwo unter
   `spiel/` eine Uhr, ein Fenster oder ein ungesäter Würfel, rechnen
   zwei Rechner dieselbe Runde verschieden — und zwar nicht sofort und
   nicht sichtbar, sondern irgendwann mitten im Spiel. Ein Fehler, den
   man beim Lesen nicht findet, muss gesucht werden, bevor er auftritt.

   Geprüft wird der Fall, der ohne diese Arbeit falsch wäre:

   · Eine stumpfe Textsuche schlägt bei jedem Kommentar an, in dem
     `Math.random` erklärt wird — und genau das steht in drei Dateien
     (`spiel/zufall.mjs` erklärt ausführlich, warum es das **nicht**
     benutzt). Eine Prüfung, die daran rot wird, schaltet jemand nach
     zwei Tagen ab. Also werden Kommentare vorher weggeschnitten.
   · Wer Kommentare mit einem Zeilenmuster wegschneidet, verschluckt
     `//` in einer Zeichenkette und in einem regulären Ausdruck — und
     übersieht danach alles, was dahinter steht. Der Schneider hier ist
     deshalb ein kleiner Zustandsautomat, der Zeichenketten, Schablonen
     (samt `${…}`) und reguläre Ausdrücke auseinanderhält.
   · Zeichenketten sind **kein** Freibrief: `el["document"]` ist Code.
     Weggeschnitten wird ausschließlich, was ein Kommentar ist.
   · Die Selbstprobe unten füttert den Schneider mit genau den Fällen,
     an denen er scheitern könnte, und verlangt Fund oder Nicht-Fund.
     Ohne sie prüfte diese Datei womöglich nichts: Ein Schneider, der
     versehentlich **alles** wegschneidet, meldet für immer „grün".

   Dazu zwei Regeln aus demselben Grund: Unter `spiel/` liegen nur
   `.mjs`-Dateien, und ihre Einfuhren zeigen nur nach `spiel/`. Ein
   `import "node:fs"` liefe im Browser nicht, ein Griff nach `runtime/`
   liefe in Node nicht — beides bräche denselben Vertrag wie `window`.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   Allem unter `spiel/` (nur gelesen, nie geändert), `werkzeuge/
   helfer.mjs` (Behauptungen und Abschluss) und `werkzeuge/
   pruefe-alles.mjs`, das diese Datei als eigenen Prozess startet. */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, extname, relative, sep, posix, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";

const WURZEL = dirname(dirname(fileURLToPath(import.meta.url)));
const KERN = join(WURZEL, "spiel");

/* Die Liste aus dem Vertrag, Wort für Wort. `Math.random` ist der
   einzige Eintrag mit einem Punkt darin — der muss maskiert werden,
   sonst passt der Punkt auf jedes Zeichen und `Mathxrandom` zählte. */
const VERBOTEN = [
  "window", "document", "canvas", "Date", "performance",
  "Math.random", "setTimeout", "requestAnimationFrame", "localStorage"
];

const musterFuer = (wort) => new RegExp(`\\b${wort.replace(/\./g, "\\.")}\\b`, "g");

/* ── Der Schneider ──────────────────────────────────────────────────
   Gibt denselben Text zurück, in dem jedes Kommentarzeichen durch ein
   Leerzeichen ersetzt ist — Zeilenumbrüche bleiben stehen. So bleiben
   Zeilen- und Spaltennummern der Fundstellen die des Originals; eine
   Meldung „Zeile 214" muss im Editor stimmen, sonst sucht man länger
   als man baut. */

/* Ein `/` beginnt einen regulären Ausdruck nur, wenn davor kein Wert
   steht. Nach `)`, `]`, einem Namen oder einer Zahl ist es geteilt. */
const WERT_DAVOR = /[)\]}\w$"'`]/;
const SCHLUESSELWORT_DAVOR =
  /\b(return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/;

function beginntRegulaeren(bisher) {
  const knapp = bisher.replace(/\s+$/, "");
  if (knapp === "") return true;
  if (SCHLUESSELWORT_DAVOR.test(knapp)) return true;
  return !WERT_DAVOR.test(knapp[knapp.length - 1]);
}

function ohneKommentare(text) {
  let aus = "";
  let i = 0;
  /* Stapel für Schablonen: `${` schaltet zurück in den Code-Zustand,
     die passende `}` wieder in die Schablone. Ohne den Stapel endete
     `` `a${"`"}b` `` an der falschen Stelle. */
  const schablonen = [];
  let klammern = 0;

  const kopiere = (bis) => { aus += text.slice(i, bis); i = bis; };

  while (i < text.length) {
    const c = text[i], d = text[i + 1];

    if (c === "/" && d === "/") {
      while (i < text.length && text[i] !== "\n") { aus += " "; i++; }
      continue;
    }
    if (c === "/" && d === "*") {
      let schluss = text.indexOf("*/", i + 2);
      schluss = schluss < 0 ? text.length : schluss + 2;
      for (; i < schluss; i++) aus += text[i] === "\n" ? "\n" : " ";
      continue;
    }
    if (c === "\"" || c === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== c) { j += text[j] === "\\" ? 2 : 1; }
      kopiere(Math.min(j + 1, text.length));
      continue;
    }
    if (c === "`") {
      schablonen.push(klammern);
      klammern = 0;
      aus += c; i++;
      continue;
    }
    if (schablonen.length > 0 && klammern === 0) {
      /* Innerhalb einer Schablone: bis zum Ende oder bis `${`. */
      if (c === "\\") { kopiere(Math.min(i + 2, text.length)); continue; }
      if (c === "$" && d === "{") { klammern = 1; kopiere(i + 2); continue; }
      aus += c; i++;
      continue;
    }
    if (schablonen.length > 0 && klammern > 0) {
      if (c === "{") klammern++;
      if (c === "}") {
        klammern--;
        if (klammern === 0) { aus += c; i++; continue; }
      }
    }
    if (c === "`" ) { aus += c; i++; continue; }
    if (c === "/" && beginntRegulaeren(aus)) {
      let j = i + 1, inKlasse = false;
      while (j < text.length) {
        const z = text[j];
        if (z === "\\") { j += 2; continue; }
        if (z === "[") inKlasse = true;
        else if (z === "]") inKlasse = false;
        else if (z === "/" && !inKlasse) break;
        else if (z === "\n") break;
        j++;
      }
      kopiere(Math.min(j + 1, text.length));
      continue;
    }
    if (c === "}" && schablonen.length > 0 && klammern === 0) {
      /* Schließt die Schablone wieder auf — nur der Vollständigkeit
         halber; `${` hat oben schon zurückgeschaltet. */
      aus += c; i++;
      continue;
    }
    aus += c; i++;
  }
  return aus;
}

/* Alle Fundstellen eines Textes, mit Zeile und Spalte. */
function fundstellen(quelle) {
  const code = ohneKommentare(quelle);
  const zeilen = code.split("\n");
  const roh = quelle.split("\n");
  const treffer = [];
  for (const wort of VERBOTEN) {
    const muster = musterFuer(wort);
    for (let n = 0; n < zeilen.length; n++) {
      muster.lastIndex = 0;
      let t;
      while ((t = muster.exec(zeilen[n])) !== null) {
        treffer.push({ wort, zeile: n + 1, spalte: t.index + 1, text: (roh[n] || "").trim() });
      }
    }
  }
  treffer.sort((a, b) => a.zeile - b.zeile || a.spalte - b.spalte);
  return treffer;
}

function sammle(ordner, aus = []) {
  for (const name of readdirSync(ordner).sort()) {
    const pfad = join(ordner, name);
    if (statSync(pfad).isDirectory()) sammle(pfad, aus);
    else aus.push(pfad);
  }
  return aus;
}

/* `join` löst zuvor `..` auf. Der Trenner hält ähnlich benannte
   Nachbarordner wie `spiel-fremd/` außerhalb der Kerngrenze. */
function liegtUnter(ziel, wurzel, trenner = sep) {
  return ziel.startsWith(wurzel + trenner);
}

/* Beide Pfadarten laufen auf jedem Rechner, auch in der Linux-Kette. */
{
  abschnitt("Pfadgrenzen");
  for (const pfade of [posix, win32]) {
    const kern = pfade.join("wurzel", "spiel");
    const erlaubt = pfade.join(kern, "katalog", "waffen.mjs");
    behaupte(liegtUnter(erlaubt, kern, pfade.sep),
      `${pfade.sep}: eine verschachtelte Einfuhr bleibt im Kern`);
    for (const woher of ["../runtime/start.js", "../spiel-fremd/fremd.mjs", ".."]) {
      behaupte(!liegtUnter(pfade.join(kern, woher), kern, pfade.sep),
        `${pfade.sep}: Einfuhr "${woher}" verlässt den Kern`);
    }
    behaupte(!liegtUnter(kern, kern, pfade.sep),
      `${pfade.sep}: der Kernordner selbst ist keine Datei im Kern`);
  }
}

/* ── 1. Der Schneider selbst ────────────────────────────────────────
   Zuerst die Selbstprobe. Wäre sie unten, liefe im Fehlerfall erst die
   ganze Kernprüfung mit einem kaputten Werkzeug durch. */
{
  abschnitt("Schneider");

  const wortIn = (quelle) => fundstellen(quelle).map((f) => f.wort).join(",");

  gleich(wortIn("const a = 1; // window"), "", "Zeilenkommentar zählt nicht");
  gleich(wortIn("/* Math.random */\nconst a = 1;"), "", "Blockkommentar zählt nicht");
  gleich(wortIn("/* zwei\n   Zeilen mit Date\n*/\nconst a = 1;"), "",
    "mehrzeiliger Kommentar zählt nicht");
  gleich(wortIn("const s = \"window\";"), "window", "Zeichenkette ist Code, kein Freibrief");
  gleich(wortIn("const s = \"// kein Kommentar\"; window.x = 1;"), "window",
    "`//` in einer Zeichenkette schneidet den Rest nicht weg");
  gleich(wortIn("const s = '/* auch nicht */'; document.x = 1;"), "document",
    "`/*` in einer Zeichenkette schneidet den Rest nicht weg");
  gleich(wortIn("const r = /\\/\\/nix/; setTimeout(f, 0);"), "setTimeout",
    "`//` im regulären Ausdruck schneidet den Rest nicht weg");
  gleich(wortIn("const t = `a${\"//\"}b`; localStorage.x;"), "localStorage",
    "`//` in einer Schablone schneidet den Rest nicht weg");
  gleich(wortIn("const t = `a${ f(\"`\") }b`; canvas;"), "canvas",
    "Gegenschrägstrich-freies Rückwärtszeichen in `${…}` beendet die Schablone nicht");
  gleich(wortIn("let x = a / b; // Date"), "", "geteilt wird nicht als regulärer Ausdruck gelesen");
  gleich(wortIn("const d = new Date();"), "Date", "ein echter Zugriff wird gefunden");
  gleich(wortIn("performance.now();"), "performance", "auch ohne Zuweisung");
  gleich(wortIn("Mathxrandom(); Datei; fensterwindowX;"), "",
    "keine Treffer mitten in längeren Namen");
  gleich(wortIn("const w = { window: 1 };"), "window", "auch als Feldname — der Vertrag ist hart");

  /* Die Zeilennummer muss die des Originals sein, nicht die des
     geschnittenen Textes. */
  const fund = fundstellen("/* Kopf\n   mehr Kopf\n*/\nconst a = 1;\nwindow.x = 2;");
  gleich(fund.length, 1, "genau eine Fundstelle");
  gleich(fund[0].zeile, 5, "Zeilennummer bleibt die des Originals");
  gleich(fund[0].spalte, 1, "Spaltennummer bleibt die des Originals");

  /* Und der Gegenbeweis, dass der Schneider nicht einfach alles
     wegwirft: Was er zurückgibt, muss noch Code sein. */
  const rest = ohneKommentare("/* weg */ const a = 1;").trim();
  gleich(rest, "const a = 1;", "der Schneider lässt den Code stehen");
}

/* ── 2. Die eiserne Regel ───────────────────────────────────────────*/
const dateien = sammle(KERN);
let geprueft = 0, zeilenGesamt = 0;

{
  abschnitt("spiel/ ohne Browser");
  behaupte(dateien.length >= 10, `unter spiel/ liegen Dateien (${dateien.length})`);

  for (const pfad of dateien) {
    const kurz = relative(WURZEL, pfad);
    gleich(extname(pfad), ".mjs", `${kurz}: unter spiel/ liegen nur .mjs-Dateien`);
    if (extname(pfad) !== ".mjs") continue;

    const quelle = readFileSync(pfad, "utf8");
    geprueft++;
    zeilenGesamt += quelle.split("\n").length;

    const treffer = fundstellen(quelle);
    for (const f of treffer) {
      behaupte(false, `${kurz}:${f.zeile}:${f.spalte} verbotenes Wort "${f.wort}" — ${f.text}`);
    }
    if (treffer.length === 0) behaupte(true, `${kurz}: browserfrei`);
  }
}

/* ── 3. Die Einfuhren bleiben im Kern ───────────────────────────────*/
{
  abschnitt("Einfuhren");
  const einfuhr = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g;

  for (const pfad of dateien) {
    if (extname(pfad) !== ".mjs") continue;
    const kurz = relative(WURZEL, pfad);
    const code = ohneKommentare(readFileSync(pfad, "utf8"));
    einfuhr.lastIndex = 0;
    let t;
    while ((t = einfuhr.exec(code)) !== null) {
      const woher = t[1];
      const eigen = woher.startsWith("./") || woher.startsWith("../");
      behaupte(eigen, `${kurz}: Einfuhr "${woher}" ist kein eigener Pfad`);
      if (!eigen) continue;
      const ziel = join(dirname(pfad), woher);
      behaupte(liegtUnter(ziel, KERN), `${kurz}: Einfuhr "${woher}" führt aus spiel/ heraus`);
    }
  }
}

console.log(`      · ${geprueft} Dateien, ${zeilenGesamt} Zeilen durchsucht, ` +
  `${VERBOTEN.length} verbotene Wörter`);

ende("Kern ohne Browser");
