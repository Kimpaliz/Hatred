/* [Aufgabe: Prüfwesen] Die Sprachtrennung, so wie das Projekt sie gewählt hat.

   Fast jedes gemischtsprachige Projekt trennt irgendwann zwischen
   **Bezeichnern** (Variablen, Funktionen, Datei- und Zweignamen) und
   **Texten** (Kommentare, Doku, Nutzertexte). Der Fehler ist nie die
   Wahl — der Fehler ist, sie **nicht zu erzwingen**: Ein einziges
   `pruefeBenutzer()` zwischen 300 englischen Namen fällt niemandem
   auf, und beim zweiten wird es zur Gewohnheit.

   Diese Prüfung erzwingt die Wahl, die in `alpha-code.json` unter
   `sprache` steht:

       "sprache": {
         "bezeichner": "en",              welche Sprache Namen tragen
         "texte": "de",                   welche Sprache Kommentare tragen
         "wortliste": "docs/WORTLISTE.md",
         "ausnahmen": ["werkzeuge"]       was nicht dem Projekt gehört
       }

   **Ohne `sprache` läuft sie nicht** und sagt das auch — ein Wächter,
   der ohne Konfiguration still grün meldet, ist schlimmer als keiner.

   ⚠️ **`ausnahmen` steht standardmäßig auf `["werkzeuge"]`, und das
   ist ein Befund, kein Zufall:** Die mitgelieferten Wächter sind
   deutsch benannt (`liesDatei`, `quellDateien`, `BASELINE_DATEI`).
   Wer im eigenen Projekt englische Bezeichner wählt, bekäme sie sonst
   gemeldet — sieben Stellen, gemessen beim ersten Lauf dieser Prüfung.
   Sie gehören aber zum **Werkzeug**, nicht zum Projekt, und ein
   Werkzeug, das die Regel des Projekts erzwingt, muss ihr nicht selbst
   folgen. Wer will, nimmt `werkzeuge` aus der Liste und benennt sie um.
   Dasselbe gilt für Fremdcode, Vendor-Ordner und Generiertes.

   ── Der Kniff: die Wortliste ist nie vollständig ────────────────────

   Eine Sprache lässt sich nicht erkennen, nur eine Wortliste
   abgleichen. Das ist kein Mangel, sondern die Bauart: Die Liste
   **wächst**, sobald ein Wort durchgerutscht ist. Wer eines findet,
   trägt es ein — dann kann genau dieses nie wieder durchkommen. Nach
   zwanzig Einträgen fängt sie die Wörter, die man wirklich tippt.

   Beide Prüfungen ziehen aus **derselben** Liste, und das ist Absicht:
   `Prüfung | check` verbietet `pruefung` als Bezeichner **und**
   `Pruefung` als Ersatzschreibung im Text. Zwei Listen wären zwei
   Wahrheiten (Fehlerbuch E2).

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `helfer.mjs`, `alpha-code.json` (`sprache`) und der Wortliste,
   deren Vorlage als `vorlagen/WORTLISTE.md` beiliegt. */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { macheMelder, liesDatei, liesEinstellung, quellDateien, WURZEL } from "./helfer.mjs";

const { melde, ende } = macheMelder({ still: true });
const sprache = liesEinstellung().sprache;

if (!sprache) {
  console.log("  keine `sprache` in alpha-code.json — Prüfung übersprungen");
  console.log("    (Sprachtrennung ist eine Projektentscheidung, siehe docs/REGELN.md Regel 15)");
  melde(true, "Sprachtrennung nicht eingerichtet (bewusst)");
  ende();
}

const LISTE = sprache.wortliste || "docs/WORTLISTE.md";
if (!existsSync(join(WURZEL, LISTE))) {
  melde(false, `Wortliste fehlt: ${LISTE}`,
    "`sprache` ist gesetzt, aber die Liste, die sie erzwingt, gibt es nicht");
  ende();
}

/* Die Liste: | `deutsch` | `englisch` | … — Backticks optional. */
const paare = [];
for (const z of liesDatei(LISTE).matchAll(/^\|\s*`?([A-Za-zÄÖÜäöüß]{4,})`?\s*\|\s*`?([A-Za-z]{2,})`?\s*\|/gm))
  paare.push([z[1], z[2]]);

/* Ersatzschreibung: Prüfung → Pruefung, groß → gross. */
const ersatz = (w) => w.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
  .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss");

/* Was nicht dem Projekt gehört, folgt seiner Sprachregel nicht.
   Standard: die mitgelieferten Wächter selbst — Begründung oben. */
const AUS = sprache.ausnahmen || ["werkzeuge"];
const dateien = quellDateien()
  .filter((d) => !AUS.some((a) => d === a || d.startsWith(a + "/")));

/* ── 1 · Bezeichner und Dateinamen ──────────────────────────────────

   ⚠️ **Diese Prüfung hatte nur eine Richtung** (Befund vom 06.09.2026,
   beim Einrichten von *Hatred*). Sie meldete jeden Bezeichner, der ein
   **deutsches** Wort der Liste enthält — richtig für ein Projekt mit
   `"bezeichner": "en"`, aber genau falsch herum für eines mit
   `"bezeichner": "de"`: Dort sind deutsche Namen die Regel, und die
   Prüfung meldete sechs korrekte Namen als Fehler (`vorlage`,
   `fehler`, `groessen`, …). Ein Wächter, der die Einhaltung der Regel
   anschlägt, gewöhnt einem das Übergehen an — und dann fängt er auch
   den echten Fall nicht mehr.

   Jetzt entscheidet `sprache.bezeichner`, welche Spalte der Wortliste
   verboten ist. Der Rest ist unverändert.

   ── Warum Segmente statt `includes` ─────────────────────────────────

   In der englischen Richtung sind die verbotenen Wörter kurz (`size`,
   `art`, `error`). Ein `includes` fände `art` in `Karte` und
   `Startfeld` — die Prüfung wäre in einem deutschen Projekt sofort
   unbrauchbar. Deshalb wird der Bezeichner in seine Höckerteile
   zerlegt (`macheSegmente`), und ein Segment muss **ganz** gleich
   sein. In der deutschen Richtung bleibt es beim `includes`: deutsche
   Wörter der Liste sind lang genug, und ihre Ersatzschreibung
   (`Groesse`) muss ebenfalls gefunden werden. */
let namensfunde = 0;
const NAME = /(?:^|\s)(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-zÄÖÜäöüß_$][\w$ÄÖÜäöüß]*)/g;

/* Welche Spalte verboten ist: bei deutschen Bezeichnern die englische. */
const VERBOTEN_IST_ENGLISCH = (sprache.bezeichner || "en") === "de";

/* `bildNachFeld` → ["bild", "nach", "feld"]; `MAX_AP` → ["max", "ap"]. */
const macheSegmente = (name) => name
  .replace(/([a-zäöüß])([A-ZÄÖÜ])/g, "$1 $2")
  .split(/[^A-Za-zÄÖÜäöüß]+|\s+/)
  .filter(Boolean)
  .map((t) => t.toLowerCase());

/* Trifft das verbotene Wort auf diesen Namen zu? */
function trifft(name, de, en) {
  if (VERBOTEN_IST_ENGLISCH) return macheSegmente(name).includes(en.toLowerCase());
  const k = name.toLowerCase();
  return k.includes(de.toLowerCase()) || k.includes(ersatz(de).toLowerCase());
}

/* Was im Fehlertext steht: das gefundene Wort und die erlaubte Seite. */
const wegweis = (de, en) => VERBOTEN_IST_ENGLISCH ? `„${en}" → ${de}` : `„${de}" → ${en}`;

for (const datei of dateien) {
  /* Der Pfad selbst */
  for (const [de, en] of paare)
    if (trifft(datei, de, en)) {
      console.log(`    Dateiname: ${datei}  ·  ${wegweis(de, en)}`);
      namensfunde++;
      break;
    }
  /* Die Bezeichner darin */
  const text = liesDatei(datei);
  const gesehen = new Set();
  for (const t of text.matchAll(NAME)) {
    const bez = t[1];
    if (gesehen.has(bez)) continue;
    for (const [de, en] of paare)
      if (trifft(bez, de, en)) {
        console.log(`    Bezeichner: ${datei}  ·  ${bez}  ·  ${wegweis(de, en)}`);
        gesehen.add(bez);
        namensfunde++;
        break;
      }
  }
}

/* ── 2 · Umlaute in Texten richtig gesetzt ────────────────────────── */
let umlautfunde = 0;
if (sprache.texte === "de") {
  const mitUmlaut = paare.filter(([de]) => /[ÄÖÜäöüß]/.test(de));
  for (const datei of dateien) {
    const zeilen = liesDatei(datei).split(/\r?\n/);
    zeilen.forEach((zeile, i) => {
      /* Nur Kommentarzeilen: in Bezeichnern ist die Ersatzschreibung
         schon oben gefangen, und dort wäre sie ohnehin richtig. */
      if (!/^\s*(\/\/|\*|\/\*|#)/.test(zeile)) return;
      for (const [de] of mitUmlaut) {
        const falsch = ersatz(de);
        if (new RegExp("\\b" + falsch + "\\b", "i").test(zeile)) {
          console.log(`    Ersatzschreibung: ${datei}:${i + 1}  ·  „${falsch}" → „${de}"`);
          umlautfunde++;
          return;
        }
      }
    });
  }
}

console.log(`  ${paare.length} Wortpaar(e) aus ${LISTE}, ${dateien.length} Quelldatei(en) geprüft`);

melde(paare.length > 0, `die Wortliste ${LISTE} ist gefüllt`,
  paare.length === 0 ? "leere Liste — die Prüfung kann nichts fangen" : "");
melde(namensfunde === 0, `Bezeichner und Dateinamen: ${sprache.bezeichner}`,
  namensfunde ? `${namensfunde} Stelle(n)` : "");
melde(umlautfunde === 0, "Umlaute in Kommentaren richtig gesetzt",
  umlautfunde ? `${umlautfunde} Ersatzschreibung(en) — ae/oe/ue/ss statt ä/ö/ü/ß` : "");

ende();
