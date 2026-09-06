/* [Aufgabe: Netz] Der eigene Vermittler: ein Brett mit Fächern, auf
   dem zwei Rechner beim Verbinden je einen Zettel hinterlegen.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Zwei Rechner in zwei Wohnungen kennen einander nicht. Einer muss
   dem anderen einmal sagen, wo er erreichbar ist. Der Einladungscode
   (`netz/vermittler.mjs`, Weg 1) macht das über einen Menschen, der
   kopiert; das hier macht dasselbe über ein Programm, das einer von
   euch laufen lässt.

   **Was hier ausdrücklich nicht passiert.** Kein Konto, kein Kennwort,
   keine Datenbank, kein Spielstand, kein Spielzug. Sobald die beiden
   Rechner sich gefunden haben, reden sie direkt miteinander, und
   dieses Programm hat mit dem Abend nichts mehr zu tun. Es kennt weder
   `spiel/` noch die Regeln — es weiß nicht einmal, dass es um ein
   Spiel geht.

   **Warum gewöhnliche Anfragen und kein Dauerdraht.** Ein Dauerdraht
   (WebSocket) bräuchte ein fremdes Paket oder viel Handarbeit am
   Protokoll. Er lohnt sich, wenn ständig etwas fließt — hier fließt
   **einmal** etwas, beim Verbinden. Zwei Anfragen im Sekundentakt für
   ein paar Sekunden sind dafür genug, und sie kommen ohne jede
   Abhängigkeit aus.

   **Warum „nichts gefunden" mit Erfolg antwortet und nicht mit
   Fehler.** Der Gast fragt nach dem Angebot, bevor der Gastgeber es
   abgelegt hat — das ist der **Normalfall** und nicht der Ausnahmefall.
   Wäre es ein Fehler, stünde in jedem Protokoll ein roter Eintrag je
   Sekunde, und der eine echte Fehler ginge darin unter. Deshalb: 200
   mit dem Wort `nichts`, und der Aufrufer bekommt `null`.

   **Warum jeder Zettel eine Frist hat.** Ein Vermittler, der alles
   behält, wächst still, bis der Rechner steht. Und ein Angebot von
   gestern ist wertlos: Die Leitung dahinter gibt es längst nicht mehr.
   Aufgeräumt wird bei jeder Anfrage — kein Wecker, keine Nebenläufigkeit,
   keine zweite Stelle, an der etwas passieren kann.

   **Warum das Brett von der Leitung getrennt ist.** `macheBrett`
   kennt keine Anfragen, nur Fächer, Zeit und Grenzen. So lässt sich
   die Verfallsfrist mit einer erfundenen Uhr prüfen, ohne Minuten zu
   warten — und die Regel, wann ein Zettel weg ist, steht an genau
   einer Stelle.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/vermittler.mjs` (`vermittlerUeberBroker` ist die Gegenstelle
   und spricht genau diese zwei Wege an; **nicht** umgekehrt eingebunden,
   damit der Vermittler im Browser lädt), `docs/NETZ.md` (sagt Jannik,
   wie er das hier startet und was es ihn kostet),
   `werkzeuge/pruefe-leitung.mjs` (startet dieses Programm wirklich auf
   einem freien Hafen und redet über echte Anfragen mit ihm). */

import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

/* Wie lange ein Zettel liegen bleibt. Fünf Minuten sind großzügig für
   etwas, das in fünf Sekunden abgeholt wird — und kurz genug, dass ein
   vergessener Vermittler nach dem Abend leer ist. */
export const FRIST_MS = 300000;

/* Wie groß ein Zettel höchstens ist. Ein Einladungscode für eine
   Leitung liegt bei ein paar hundert Zeichen; die Zahl hier ist das
   Vielfache davon und nicht die Messung — gemessen wird in
   `werkzeuge/pruefe-leitung.mjs`, und die Messung steht im Bericht,
   nicht hier im Kommentar. */
export const ZETTEL_HOECHSTENS = 4096;

/* Wie viele Fächer gleichzeitig belegt sein dürfen. Vier Freunde
   brauchen sechs; alles darüber ist entweder eine sehr große Runde
   oder jemand, der das Brett vollschreibt. */
export const FAECHER_HOECHSTENS = 512;

export const PFAD_BRETT = "/brett/";

/* Derselbe Fachname wie in `netz/vermittler.mjs`. Er steht hier
   nochmals als Muster und nicht als Einfuhr: Diese Datei läuft
   allein — wer sie startet, soll nicht den halben Ordner brauchen. */
const FACH_MUSTER = /^[A-Za-z0-9-]{1,40}$/;

/* ── Das Brett ──────────────────────────────────────────────────────*/

export function macheBrett({
  frist = FRIST_MS,
  jetzt = () => Date.now(),
  zettelHoechstens = ZETTEL_HOECHSTENS,
  faecherHoechstens = FAECHER_HOECHSTENS
} = {}) {
  const faecher = new Map();

  function raeumeAuf() {
    const zeit = jetzt();
    let weg = 0;
    for (const [fach, eintrag] of faecher) {
      if (eintrag.bis <= zeit) { faecher.delete(fach); weg++; }
    }
    return weg;
  }

  return {
    raeumeAuf,
    anzahl() { raeumeAuf(); return faecher.size; },

    /* Gibt `{ok, grund}` zurück und wirft nicht: Jeder Grund hier
       kommt von außen und muss als Satz zurück an den Absender. */
    lege(fach, zettel) {
      raeumeAuf();
      if (typeof fach !== "string" || !FACH_MUSTER.test(fach)) {
        return { ok: false, grund: "Der Fachname taugt nicht." };
      }
      if (typeof zettel !== "string" || zettel.trim() === "") {
        return { ok: false, grund: "Der Zettel ist leer." };
      }
      if (zettel.length > zettelHoechstens) {
        return {
          ok: false,
          grund: `Der Zettel ist länger als ${zettelHoechstens} Zeichen.`
        };
      }
      /* Ein belegtes Fach zählt nicht doppelt — sonst wäre das Brett
         voll, sobald jemand seinen eigenen Zettel erneuert. */
      if (!faecher.has(fach) && faecher.size >= faecherHoechstens) {
        return { ok: false, grund: "Auf dem Brett ist gerade kein Fach frei." };
      }
      faecher.set(fach, { zettel, bis: jetzt() + frist });
      return { ok: true };
    },

    /* `null` heißt „da liegt nichts" und ist kein Fehler. */
    hole(fach) {
      raeumeAuf();
      if (typeof fach !== "string" || !FACH_MUSTER.test(fach)) return null;
      const eintrag = faecher.get(fach);
      return eintrag ? eintrag.zettel : null;
    }
  };
}

/* ── Die Antworten ──────────────────────────────────────────────────

   Getrennt vom Anschluss, damit jede Antwort ohne Leitung prüfbar ist.
   `antwortAuf` bekommt drei Zeichenketten und gibt drei zurück — mehr
   Zustand hat dieser Vermittler nicht. */

const KOPF_OFFEN = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
  "content-type": "text/plain;charset=utf-8"
};

const SEITE = [
  "Hatred — Vermittler.",
  "",
  "Er hilft zwei Rechnern, sich einmal zu finden. Danach reden sie",
  "direkt miteinander, und hier läuft nichts mehr durch.",
  "",
  "  Ablegen:  POST /brett/<Fach>   mit dem Einladungscode als Inhalt",
  "  Abholen:  GET  /brett/<Fach>   antwortet „nichts\" oder „da\" und den Code",
  "",
  "Gespeichert wird nur der Code, und nur für ein paar Minuten.",
  ""
].join("\n");

export function macheBroker({ brett = null, ...angaben } = {}) {
  const tafel = brett || macheBrett(angaben);
  let anschluss = null;

  function antwortAuf({ verfahren, pfad, koerper = "" }) {
    if (verfahren === "OPTIONS") return { kode: 204, kopf: KOPF_OFFEN, koerper: "" };

    if (pfad === "/" || pfad === "") {
      if (verfahren !== "GET") {
        return { kode: 405, kopf: KOPF_OFFEN, koerper: "Hier geht nur GET.\n" };
      }
      return { kode: 200, kopf: KOPF_OFFEN, koerper: SEITE };
    }

    if (!pfad.startsWith(PFAD_BRETT)) {
      return { kode: 404, kopf: KOPF_OFFEN, koerper: "Diesen Weg gibt es hier nicht.\n" };
    }

    /* Eine halbe Prozentfolge in der Adresse lässt `decodeURIComponent`
       werfen. Das ist von außen herstellbar und darf den Vermittler
       nicht anhalten — also derselbe Satz wie bei jedem anderen
       untauglichen Fachnamen. */
    let fach = null;
    try { fach = decodeURIComponent(pfad.slice(PFAD_BRETT.length)); }
    catch { fach = null; }
    if (fach === null || !FACH_MUSTER.test(fach)) {
      return {
        kode: 400,
        kopf: KOPF_OFFEN,
        koerper: "Der Fachname darf nur Buchstaben, Ziffern und Striche haben.\n"
      };
    }

    if (verfahren === "GET") {
      const zettel = tafel.hole(fach);
      /* Kein 404: Begründung in der Kopfnotiz. */
      if (zettel === null) return { kode: 200, kopf: KOPF_OFFEN, koerper: "nichts\n" };
      return { kode: 200, kopf: KOPF_OFFEN, koerper: `da\n${zettel}` };
    }

    if (verfahren === "POST") {
      const gelegt = tafel.lege(fach, koerper);
      if (!gelegt.ok) return { kode: 400, kopf: KOPF_OFFEN, koerper: `${gelegt.grund}\n` };
      return { kode: 200, kopf: KOPF_OFFEN, koerper: "abgelegt\n" };
    }

    return { kode: 405, kopf: KOPF_OFFEN, koerper: "Hier geht nur GET oder POST.\n" };
  }

  return {
    brett: tafel,
    antwortAuf,

    /* Hafen 0 heißt „such dir einen freien" — genau das braucht die
       Prüfung, damit zwei Läufe nebeneinander nicht kollidieren. */
    starte(hafen = 7788, gastgeber = "0.0.0.0") {
      return new Promise((fertig, gescheitert) => {
        anschluss = createServer((anfrage, antwort) => {
          const stuecke = [];
          let bytes = 0;
          let zuviel = false;
          anfrage.on("data", (stueck) => {
            bytes += stueck.length;
            /* Die Grenze greift schon während des Empfangs: Wer erst
               alles sammelt und dann misst, hat es längst im
               Speicher. */
            if (bytes > ZETTEL_HOECHSTENS * 4) { zuviel = true; return; }
            stuecke.push(stueck);
          });
          anfrage.on("end", () => {
            const pfad = (anfrage.url || "/").split("?")[0];
            const ergebnis = zuviel
              ? { kode: 413, kopf: KOPF_OFFEN, koerper: "Das ist zu viel Text.\n" }
              : antwortAuf({
                verfahren: anfrage.method,
                pfad,
                koerper: Buffer.concat(stuecke).toString("utf8")
              });
            antwort.writeHead(ergebnis.kode, ergebnis.kopf);
            antwort.end(ergebnis.koerper);
          });
        });
        anschluss.on("error", gescheitert);
        anschluss.listen(hafen, gastgeber, () => fertig(anschluss.address().port));
      });
    },

    halt() {
      return new Promise((fertig) => {
        if (!anschluss) { fertig(); return; }
        const alt = anschluss;
        anschluss = null;
        alt.close(() => fertig());
      });
    }
  };
}

/* ── Von der Hand gestartet ─────────────────────────────────────────

   `node netz/broker.mjs 7788`. Nur beim direkten Aufruf — wer diese
   Datei einbindet (die Prüfung tut das), bekommt keinen Anschluss,
   den er nicht bestellt hat. */
const direkt = import.meta.url === pathToFileURL(process.argv[1] || "").href;
if (direkt) {
  const hafen = Number(process.argv[2] || 7788);
  const broker = macheBroker();
  broker.starte(hafen).then((wirklich) => {
    console.log(`Hatred-Vermittler läuft auf Hafen ${wirklich}.`);
    console.log("Deine Freunde tragen im Spiel die Adresse dieses Rechners ein,");
    console.log(`zum Beispiel  http://<deine-Adresse>:${wirklich}`);
    console.log("Beenden mit Strg+C.");
  }).catch((fund) => {
    console.log(`Der Vermittler konnte nicht starten: ${fund.message}`);
    process.exitCode = 1;
  });
}
