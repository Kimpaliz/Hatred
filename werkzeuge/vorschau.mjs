/* [Aufgabe: Werkzeug] Der kleine Server, der das Spiel daheim ausliefert.

   ── Warum es ihn überhaupt braucht ─────────────────────────────────

   Das Spiel besteht aus ES-Modulen. Browser weigern sich, Module über
   `file://` zu laden — nicht aus Bosheit, sondern weil dann jede
   heruntergeladene HTML-Datei den ganzen Rechner lesen könnte. Also
   braucht es eine Adresse mit `http://`, und dafür genügen hundert
   Zeilen.

   Was hier ausgeliefert wird, ist **byteweise** derselbe Ordner, der
   auch im Netz liegt. Kein Bauschritt, keine zweite Wahrheit, in der
   ein Fehler stecken könnte, den daheim niemand sieht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `index.html` (der Einstieg) und `.github/workflows/pages.yml`
   (dasselbe Ergebnis, nur im Netz). Ändert nichts am Spiel. */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const HAFEN = Number(process.env.HAFEN) || 8145;

const TYPEN = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};

/* Der einzige sicherheitsrelevante Punkt an dieser Datei: Ohne diese
   Prüfung holt `GET /../../../etc/passwd` genau das. `normalize` allein
   genügt nicht — erst der Vergleich mit der Wurzel. */
function sicherAufloesen(pfad) {
  /* `decodeURIComponent` **wirft** bei einem halben Prozentzeichen —
     und geworfen wird hier, außerhalb des `try` im Hörer darunter.
     Am 06.09.2026 gemessen: `GET /%` beendete den ganzen Server mit
     `URIError: URI malformed`, Rückgabewert 1. Die nächste Anfrage
     bekam gar keine Antwort mehr.

     Das ist kein Randfall. Es reicht ein Prozentzeichen in der
     Adresszeile, ein Tippfehler in einem Verweis, ein Suchprogramm
     das die Adresse abschneidet — und Jannik steht vor einem Spiel,
     das „eben noch lief\u201c. Eine Adresse, die sich nicht entschlüsseln
     lässt, ist keine Datei in diesem Ordner: also `null`, also 403,
     wie jeder andere Weg nach draußen auch. */
  let roh;
  try {
    roh = decodeURIComponent(pfad.split("?")[0]);
  } catch {
    return null;
  }
  const ziel = normalize(join(WURZEL, roh === "/" ? "index.html" : roh));
  if (ziel !== WURZEL && !ziel.startsWith(WURZEL + sep)) return null;
  return ziel;
}

const server = createServer(async (anfrage, antwort) => {
  const ziel = sicherAufloesen(anfrage.url || "/");
  if (!ziel) {
    antwort.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    antwort.end("Außerhalb des Projektordners.");
    return;
  }
  try {
    const angaben = await stat(ziel);
    const datei = angaben.isDirectory() ? join(ziel, "index.html") : ziel;
    const inhalt = await readFile(datei);
    antwort.writeHead(200, {
      "content-type": TYPEN[extname(datei)] || "application/octet-stream",
      /* Kein Zwischenspeicher: Wer am Spiel baut, will neu laden und
         das Neue sehen, nicht das von vor zehn Minuten. */
      "cache-control": "no-store"
    });
    antwort.end(inhalt);
  } catch {
    antwort.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    antwort.end(`Nicht gefunden: ${anfrage.url}`);
  }
});

server.listen(HAFEN, "127.0.0.1", () => {
  console.log("");
  console.log("  ┌──────────────────────────────────────────────┐");
  console.log("  │  Hatred läuft.                               │");
  console.log(`  │  http://127.0.0.1:${String(HAFEN).padEnd(28)}│`);
  console.log("  │  Beenden mit Strg+C                          │");
  console.log("  └──────────────────────────────────────────────┘");
  console.log("");
});
