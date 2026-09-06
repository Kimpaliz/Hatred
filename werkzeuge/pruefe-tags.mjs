/* [Aufgabe: Prüfwesen] Jede Quelldatei sagt selbst, wozu sie da ist.

   Die Regel dahinter: „Verteile richtige Funktions-Tags an
   Dateien und Werkzeuge, dass immer klar ist, was ist wozu."

   Der Tag steht in den ersten Zeilen jeder Quelldatei als
   `[Aufgabe: <Tag>]` — in welchem Kommentarzeichen auch immer, deshalb
   wird nur nach der Zeichenfolge gesucht, nicht nach Syntax. Welche
   Tags es gibt, steht in **einer** Tabelle in `docs/REGELN.md`
   (Abschnitt „Ein Zweig je System"); diese Prüfung liest sie von dort,
   damit es keine zweite Liste gibt, die auseinanderlaufen kann.

   Was sie fängt: die Datei ohne Kopfnotiz, den Tippfehler im Tag und
   das neue System, das benutzt wird, bevor es in der Tabelle steht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `helfer.mjs` (Dateiliste aus `alpha-code.json`) und `docs/REGELN.md`
   (die Tag-Spalte der Systemtabelle). */

import { macheMelder, liesDatei, quellDateien } from "./helfer.mjs";

const { melde, ende } = macheMelder({ still: true });

/* Die Tag-Spalte aus der Systemtabelle: | System | Tag | Zweigname | … */
const regeln = liesDatei("docs/REGELN.md");
const tags = new Set();
for (const t of regeln.matchAll(/^\|[^|]+\|\s*`?([A-Za-zÄÖÜäöüß-]+)`?\s*\|\s*`[a-z-]+\/…?`/gm))
  tags.add(t[1]);

melde(tags.size >= 2, "die Systemtabelle in docs/REGELN.md nennt Tags",
  tags.size ? [...tags].join(", ") : "keine Tabelle im erwarteten Format gefunden");

const dateien = quellDateien();
console.log(`  ${dateien.length} Quelldateien, ${tags.size} zugelassene Tags`);

let ohne = 0, falsch = 0;
for (const d of dateien) {
  const kopf = liesDatei(d).split(/\r?\n/).slice(0, 12).join("\n");
  const m = kopf.match(/\[Aufgabe:\s*([^\]]+)\]/);
  if (!m) { ohne++; console.log(`    ohne Tag: ${d}`); continue; }
  const tag = m[1].trim();
  if (!tags.has(tag)) { falsch++; console.log(`    unbekannter Tag „${tag}": ${d}`); }
}

melde(ohne === 0, "jede Quelldatei trägt in den ersten 12 Zeilen ihr [Aufgabe: …]",
  `${ohne} Datei(en) ohne Tag`);
melde(falsch === 0, "jeder Tag steht in der Systemtabelle von docs/REGELN.md",
  `${falsch} unbekannte(r) Tag(s)`);

ende();
