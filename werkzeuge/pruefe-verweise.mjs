/* [Aufgabe: Prüfwesen] Kein Verweis zeigt ins Leere.

   Ein Wegweiser, der auf eine Datei zeigt, die es nicht mehr gibt, ist
   schlimmer als kein Wegweiser — er wird geglaubt. Diese Prüfung hält
   jeden Markdown-Verweis in der Doku gegen die Platte.

   Geprüft werden **nur** echte Markdown-Verweise `[Text](pfad)`. Nackte
   Dateinamen in Backticks bleiben absichtlich draußen: Ein Name wie
   `helfer.mjs` kann aus jedem Ordner gemeint sein, und eine Prüfung, die
   raten muss, meldet Falsches — das ist einmal mit 15 Fehlalarmen auf
   einen Schlag passiert.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `helfer.mjs`, Markdown in der Wurzel, docs/, .claude/ und den
   Quellordnern. Damit werden auch die lokalen Agentenanleitungen geprüft. */

import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { macheMelder, liesDatei, liesEinstellung, WURZEL } from "./helfer.mjs";

const { melde, ende } = macheMelder({ still: true });

const seiten = new Set(readdirSync(WURZEL, { withFileTypes: true })
  .filter((d) => d.isFile() && d.name.endsWith(".md")).map((d) => d.name));
/* docs/ rekursiv: Ein Unterordner voller Verweise (etwa architecture/,
   domains/, migration/, operations/, history/) wäre sonst unsichtbar —
   in einem gewachsenen Projekt lagen 18 tote Verweise genau dort. */
const sammleDocs = (rel) => {
  for (const d of readdirSync(join(WURZEL, rel), { withFileTypes: true })) {
    const r = rel + "/" + d.name;
    if (d.isDirectory()) sammleDocs(r);
    else if (d.name.endsWith(".md")) seiten.add(r);
  }
};
for (const rel of new Set(["docs", ".claude", ...liesEinstellung().quellordner])) {
  if (existsSync(join(WURZEL, rel))) sammleDocs(rel);
}

let verweise = 0, tot = 0;
for (const seite of seiten) {
  const text = liesDatei(seite);
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
    const ziel = m[1];
    if (/^[a-z]+:/.test(ziel)) continue;          /* http:, mailto:, … */
    verweise++;
    const voll = join(WURZEL, dirname(seite), decodeURIComponent(ziel));
    if (!existsSync(voll)) { tot++; console.log(`    tot: ${seite} → ${ziel}`); }
  }
}

console.log(`  ${seiten.size} Seiten, ${verweise} Dateiverweise`);
melde(tot === 0, "jeder Markdown-Verweis zeigt auf eine vorhandene Datei",
  `${tot} tote(r) Verweis(e)`);

ende();
