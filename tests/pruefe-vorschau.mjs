/* [Aufgabe: Prüfwesen] Der Vorschauserver muss eine krumme Adresse
   überleben — nicht sie beantworten, sondern sie **überleben**.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   `werkzeuge/vorschau.mjs` ist der Weg, auf dem Jannik das Spiel daheim
   startet (`Vorschau-starten.cmd`). Am 06.09.2026 gemessen: Ein
   einziges `GET /%` beendete den ganzen Server mit
   `URIError: URI malformed` und Rückgabewert 1. Die nächste Anfrage
   bekam keine Antwort mehr — aus seiner Sicht: „Eben lief es noch."

   Der Grund war die Stelle des Wurfs. `decodeURIComponent` steht in
   `sicherAufloesen`, und das wird **vor** dem `try` des Hörers
   aufgerufen. Ein Fehler dort ist kein 500, sondern das Ende des
   Prozesses.

   Geprüft wird deshalb die Wirkung und nicht die Antwort:

   · Eine gewöhnliche Anfrage bekommt 200 — sonst misst der Rest nichts.
   · `GET /%` bekommt **eine Antwort** (403) statt gar keiner.
   · Der Weg nach draußen (`/../../etc/passwd`) bekommt 403. Diese
     Behauptung stand vorher nirgends, obwohl der Kommentar in
     `vorschau.mjs` sie „den einzigen sicherheitsrelevanten Punkt
     dieser Datei" nennt.
   · **Und danach kommt wieder eine 200.** Das ist die eigentliche
     Behauptung: Der Server lebt noch. Eine Prüfung, die nur den
     Statuscode der krummen Anfrage misst, wäre grün geblieben, wenn
     der Server danach umgefallen wäre — sie hätte den Fehler vom
     06.09. nicht gefunden.

   ── Warum rohe Netzsteckdosen und kein `fetch` ─────────────────────

   `fetch("http://…/%")` kommt gar nicht bis zum Server: Die Adresse
   wird schon im eigenen Prozess zerlegt und abgelehnt. Geprüft würde
   dann die Adressprüfung von Node, nicht der Server. Hier gehen
   deshalb genau die Bytes über die Leitung, die auch ein Browser
   schicken würde.

   ── Was hier bewusst nicht geprüft wird ────────────────────────────

   Die Inhaltstypen (`TYPEN`) und der `cache-control`-Kopf. Sie sind
   Angaben, keine Wirkung; wer sie ändert, sieht es sofort im Browser.

   ── Arbeitet zusammen mit ──────────────────────────────────────────

   `werkzeuge/vorschau.mjs` (läuft hier als eigener Prozess),
   `tests/helfer.mjs`, `werkzeuge/pruefe-alles.mjs`. */

import { spawn } from "node:child_process";
import { connect } from "node:net";
import { join } from "node:path";
import { behaupte, gleich, abschnitt, ende, WURZEL } from "./helfer.mjs";

/* Ein Hafen weit oben, aus der Prozessnummer abgeleitet: Zwei
   Prüfläufe nebeneinander sollen sich nicht den Hafen streiten. */
const HAFEN = 8300 + (process.pid % 900);

/* Eine rohe Anfrage — genau die Bytes, die auch ein Browser schickt.
   Gibt den Statuscode zurück, oder null, wenn niemand mehr antwortet. */
function frage(weg, wartezeit = 3000) {
  return new Promise((fertig) => {
    const dose = connect(HAFEN, "127.0.0.1");
    let text = "";
    let erledigt = false;
    const schluss = (wert) => {
      if (erledigt) return;
      erledigt = true;
      dose.destroy();
      fertig(wert);
    };
    dose.setTimeout(wartezeit, () => schluss(null));
    dose.on("error", () => schluss(null));
    dose.on("connect", () => {
      dose.write(`GET ${weg} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`);
    });
    dose.on("data", (stueck) => {
      text += stueck.toString("latin1");
      const kopf = text.match(/^HTTP\/1\.[01] (\d{3})/);
      if (kopf) schluss(Number(kopf[1]));
    });
    dose.on("close", () => schluss(null));
  });
}

async function warteAufServer(versuche = 60) {
  for (let i = 0; i < versuche; i++) {
    if (await frage("/", 400) !== null) return true;
    await new Promise((w) => setTimeout(w, 100));
  }
  return false;
}

abschnitt("der Vorschauserver");

const server = spawn(process.execPath, [join(WURZEL, "werkzeuge", "vorschau.mjs")], {
  env: { ...process.env, HAFEN: String(HAFEN) },
  stdio: ["ignore", "ignore", "pipe"]
});
let gemeckert = "";
server.stderr.on("data", (s) => { gemeckert += s.toString(); });

const messungen = [];
try {
  behaupte(await warteAufServer(), `der Server antwortet auf Hafen ${HAFEN}`);

  gleich(await frage("/"), 200, "die gewöhnliche Anfrage bekommt 200");

  /* Der Fall vom 06.09.2026. */
  const krumm = await frage("/%");
  behaupte(krumm !== null, "auf `GET /%` kommt überhaupt eine Antwort");
  gleich(krumm, 403, "und zwar 403 — eine Adresse ohne Sinn ist keine Datei");

  gleich(await frage("/%zz"), 403, "auch `/%zz` bekommt 403 statt eines Wurfs");
  gleich(await frage("/../../etc/passwd"), 403, "der Weg nach draußen bekommt 403");

  /* Die eigentliche Behauptung: Er lebt noch. */
  gleich(await frage("/"), 200, "und danach antwortet der Server weiter");
  gleich(await frage("/runtime/start.js"), 200, "auch auf eine echte Datei");
  gleich(await frage("/gibtesnicht.js"), 404, "und auf eine fehlende mit 404");

  gleich(server.exitCode, null, "der Server läuft immer noch");
  behaupte(!/URIError/.test(gemeckert),
    `kein URIError im Fehlerstrom${gemeckert ? `: ${gemeckert.split("\n")[0]}` : ""}`);

  messungen.push(`Hafen ${HAFEN}: 200 · /% → 403 · Ausbruch → 403 · danach wieder 200`);
} finally {
  server.kill("SIGKILL");
}

for (const zeile of messungen) console.log(`      · ${zeile}`);
ende("Der Vorschauserver");
