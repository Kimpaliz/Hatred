/* [Aufgabe: Prüfwesen] Nichts Verbotenes im Repository.

   Muster aus der Projektprüfung einer gewachsenen Webapp (02.09.2026),
   verallgemeinert. Zwei Sorten Verbotenes:

   1. **Dateiformate**, die in kein Quell-Repository gehören — Binär-
      programme, Archive, Netzmitschnitte, DPAPI-Blobs. Sie sind nicht
      diffbar, oft groß, und genau die Sorte Datei, in der Geheimnisse
      unbemerkt mitreisen.
   2. **Geheimnismuster** im Text — private Schlüssel, GitHub-Tokens,
      hart eingetragene Passwörter.

   ⚠️ Bewusst NICHT geprüft: Firebase-Web-Schlüssel (`AIza…`). Die sind
   per Bauart öffentlich — geschützt hat immer die Regel, nie der
   Schlüssel. Wer sie meldet, erzeugt Alarmmüdigkeit.

   Die Muster sind so geschrieben, dass diese Datei sich nicht selbst
   meldet (das Suchmuster enthält nie ein gültiges Beispiel).

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `helfer.mjs` (WURZEL, Melder) und `alpha-code.json` (`ausnahmen`).
   `pruefe-freigabe.mjs` ruft dieselben Muster zusätzlich über die
   ganze Git-Historie — diese Prüfung hier sieht nur den Arbeitsstand. */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { macheMelder, WURZEL } from "./helfer.mjs";

let ausnahmen = ["node_modules", ".git", "vendor", "dist", "build"];
try {
  const e = JSON.parse(readFileSync(join(WURZEL, "alpha-code.json"), "utf8"));
  if (Array.isArray(e.ausnahmen)) ausnahmen = [...new Set([...e.ausnahmen, ".git", "node_modules"])];
} catch { /* ohne Einstellung gilt die Standardliste */ }

export const VERBOTENE_ENDUNGEN = new Set([
  ".exe", ".dll", ".pdb", ".zip", ".rar", ".7z",
  ".pcap", ".pcapng", ".dpapi", ".pfx", ".p12", ".keystore"
]);

/* Zusammengesetzt, damit die Definition sich nicht selbst trifft. */
export const GEHEIMNIS_MUSTER = [
  ["privater Schlüssel", new RegExp("-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----")],
  ["GitHub-Token", new RegExp("ghp" + "_[A-Za-z0-9]{30,}")],
  ["GitHub-PAT", new RegExp("github" + "_pat_[A-Za-z0-9_]{30,}")],
  ["GitLab-Token", new RegExp("glpat" + "-[A-Za-z0-9_-]{20,}")],
  ["AWS-Schlüssel", new RegExp("AKIA" + "[A-Z0-9]{16}")],
  /* ⚠️ Zwei Verschärfungen, beide am 04.09.2026 an `github-zugang.mjs`
     gemessen, wo nur der **Feldname** des Git-Anmeldeprotokolls steht:

     `(?<!["'])` — sitzt das Schlüsselwort selbst in einem Literal (etwa
     als Feldname eines Protokolls, den ein `slice` abschneidet), dann
     wäre dessen schließendes Anführungszeichen das öffnende des
     vermeintlichen Werts, und alles bis zum nächsten Anführungszeichen
     derselben Zeile gälte als Passwort.

     ⚠️ **Der Fehlalarm wird hier absichtlich nicht wörtlich zitiert.**
     Ein Beispiel, das das eigene Muster erfüllt, macht die Prüfung an
     ihrer eigenen Begründung rot — beim ersten Anlauf genau passiert
     (Fehlerbuch B4). Wer eine Musterprüfung erklärt, beschreibt den
     Fall, statt ihn hinzuschreiben.

     `\n\r` in der Zeichenklasse — ein Passwort steht auf **einer**
     Zeile; ohne diese Grenze spannt das Muster über zwei und verbindet
     zwei harmlose Zeilen zu einem Fund.

     **Bekannte Lücke, bewusst nicht hier behoben:** JSON und YAML
     schreiben `"password": "…"` mit Doppelpunkt statt Gleichheitszeichen
     — das fängt dieses Muster nicht, und das war schon vorher so. */
  ["hartes Passwort", new RegExp("(?<![\"'])(?:PASSWORD|PASSWORT|SECRET)\\s*=\\s*[\"'][^\"'\\n\\r]{4,}[\"']", "i")]
];

/* `pruefe-freigabe.mjs` importiert nur die Muster — der Lauf selbst
   startet ausschließlich beim direkten Aufruf, sonst beendete `ende()`
   den fremden Prozess. */
const direkt = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

const funde = [];
function gehe(rel) {
  for (const e of readdirSync(join(WURZEL, rel), { withFileTypes: true })) {
    const r = rel === "." ? e.name : rel + "/" + e.name;
    if (e.isDirectory()) {
      if (!ausnahmen.includes(e.name)) gehe(r);
      continue;
    }
    const endung = (e.name.match(/\.[^.]+$/) || [""])[0].toLowerCase();
    if (VERBOTENE_ENDUNGEN.has(endung)) { funde.push(`verbotenes Format: ${r}`); continue; }
    if (statSync(join(WURZEL, r)).size > 2_000_000) continue;  /* große Binärdaten: nur die Endung zählt */
    const roh = readFileSync(join(WURZEL, r));
    if (roh.includes(0)) continue;                              /* binär: kein Textmuster suchbar */
    const text = roh.toString("utf8");
    for (const [name, muster] of GEHEIMNIS_MUSTER)
      if (muster.test(text)) funde.push(`${name} in ${r}`);
  }
}
if (direkt) {
  const { melde, ende } = macheMelder({ still: true });
  gehe(".");
  for (const f of funde) console.log(`    ${f}`);
  melde(funde.length === 0, "kein verbotenes Format und kein Geheimnismuster im Arbeitsstand",
    funde.length ? `${funde.length} Fund(e)` : "");
  ende();
}
