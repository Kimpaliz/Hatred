/* [Aufgabe: Prüfwesen] Kleine Dateien als Ratchet.

   Muster aus dem Nachrüsten einer gewachsenen Webapp (eine
   Baseline-Datei mit gemessenen Dateigrößen, 02.09.2026). Die Idee: Beim Nachrüsten
   eines gewachsenen Projekts wäre „keine Datei über 500 Zeilen" ein
   Vorwand für einen riskanten Komplettumbau. Stattdessen:

   - **Neue** Quelldateien bleiben unter der Grenze — hart.
   - **Bekannte Altlasten** stehen mit ihrer gemessenen Zeilenzahl in
     `docs/ALTLASTEN.md` und dürfen **nie wachsen**, nur schrumpfen.
     Beim nächsten fachlichen Eingriff wird der berührte Teil zuerst
     herausgelöst.

   Ohne `docs/ALTLASTEN.md` (Neubau) gilt schlicht: alles unter der
   Grenze. Wo sie liegt, sagt `alpha-code.json` (`zeilengrenze`,
   Standard 500).

   ⚠️ **Eine hereinkopierte Datei ist keine Altlast.** Die Liste ist
   für das, was beim Nachrüsten **schon da war** — nicht für das, was
   man später aus einem anderen Projekt übernimmt. Eine Kopie, die die
   Grenze schon beim Ankommen reißt, wird **beim Kopieren** aufgeteilt,
   nicht danach: „danach" kommt nie, und die Liste wäre der Ort, an dem
   das begründet aussieht. Der Wächter sieht den Unterschied nicht —
   er meldet jede neue Datei über der Grenze; wer sie in die Liste
   einträgt, statt sie zu teilen, umgeht diese Regel bewusst.

   Was sie fängt: die Altlast, die „nur diesmal" um dreißig Zeilen
   wächst — genau so ist dort eine Datei auf 12.548 Zeilen gewachsen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `helfer.mjs` (Quelldateien aus `alpha-code.json`) und
   `docs/ALTLASTEN.md` (die Baseline-Tabelle: | `pfad` | Zeilen | …).
   Zeilen zählt sie wie `wc -l` — Anzahl Zeilenumbrüche. */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { macheMelder, liesDatei, liesEinstellung, quellDateien, WURZEL } from "./helfer.mjs";

const { melde, ende } = macheMelder({ still: true });
/* Die Grenze steht in `alpha-code.json` (`zeilengrenze`), nicht hier.
   Sonst gäbe es sie zweimal: einmal in der Regel, einmal im Wächter —
   und beim Ändern verschiebt sich nur eine davon (Fehlerbuch E2). */
const GRENZE = liesEinstellung().zeilengrenze;

/* Die Baseline: | `pfad` | 1234 | … — nur Zeilen mit Backtick-Pfad. Wo sie
   liegt, sagt `alpha-code.json` (`altlasten`); Standard ist docs/ALTLASTEN.md. */
const BASELINE_DATEI = liesEinstellung().altlasten;
const baseline = new Map();
if (existsSync(join(WURZEL, BASELINE_DATEI)))
  for (const z of liesDatei(BASELINE_DATEI).matchAll(/^\|\s*`([^`]+)`\s*\|\s*([\d.]+)\s*\|/gm))
    baseline.set(z[1], parseInt(z[2].replace(/\./g, ""), 10));

const zaehle = (text) => (text.match(/\n/g) || []).length;

let zuGross = 0, gewachsen = 0, schrumpfbar = 0;
for (const d of quellDateien()) {
  const zeilen = zaehle(liesDatei(d));
  if (baseline.has(d)) {
    const alt = baseline.get(d);
    if (zeilen > alt) { gewachsen++; console.log(`    Altlast gewachsen: ${d} (${alt} → ${zeilen})`); }
    else if (zeilen <= GRENZE) { schrumpfbar++; console.log(`    kann aus der Altlastenliste: ${d} (${zeilen})`); }
  } else if (zeilen > GRENZE) {
    zuGross++;
    console.log(`    über ${GRENZE} Zeilen und nicht als Altlast geführt: ${d} (${zeilen})`);
  }
}

console.log(`  ${quellDateien().length} Quelldateien, ${baseline.size} geführte Altlast(en)` +
  (schrumpfbar ? `, ${schrumpfbar} davon inzwischen unter der Grenze` : ""));

melde(zuGross === 0, `keine neue Quelldatei über ${GRENZE} Zeilen`,
  zuGross ? `${zuGross} Datei(en) — herauslösen oder begründet in ${BASELINE_DATEI} aufnehmen` : "");
melde(gewachsen === 0, "keine Altlast ist gewachsen (Ratchet)",
  gewachsen ? `${gewachsen} — beim Eingriff wird der berührte Teil zuerst herausgelöst` : "");

ende();
