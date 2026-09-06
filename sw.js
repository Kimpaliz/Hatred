/* [Aufgabe: Oberfläche] Der Zwischenspeicher: einmal geladen, startet
   das Spiel auch ohne Netz — aber nie mit einer alten Fassung.

   ── Warum „erst das Netz, dann der Speicher" und nicht umgekehrt ───

   Ein Zwischenspeicher, der zuerst antwortet, ist der teuerste Fehler,
   den man hier machen kann: Er liefert **für immer** die Fassung von
   vorgestern aus, und zwar lautlos. Jannik lädt neu, sieht dasselbe
   Spiel, und niemand versteht warum — auf seinem Rechner ist eine
   Änderung nie angekommen, während sie auf allen anderen längst läuft.
   Im Netz-Koop ist das schlimmer als ein Fehler: Zwei Rechner mit
   verschiedenen Fassungen rechnen verschiedene Runden, und
   `netz/sitzung.mjs` bricht die Runde mit „auseinandergelaufen" ab.

   Deshalb ist die Reihenfolge hier umgedreht: **Erst wird gefragt,
   dann gespeichert.** Kommt eine Antwort aus dem Netz, geht sie an die
   Seite und eine Abschrift in den Speicher. Kommt keine — Funkloch,
   Zug, abgezogenes Kabel —, wird die Abschrift ausgeliefert. Der
   Speicher ist also ein Rückfall und keine Quelle. Der Preis ist eine
   Anfrage je Datei; der Gewinn ist, dass „neu laden" immer das tut,
   was draufsteht.

   **Warum keine Vorratsliste.** Ein Verzeichnis der Dateien, das beim
   Anmelden geladen wird, veraltet still: Wer eine Datei hinzufügt und
   die Liste vergisst, hat ein Spiel, das offline an einer fehlenden
   Datei stehenbleibt — und im Netz läuft alles. Hier landet stattdessen
   genau das im Speicher, was wirklich geladen wurde. Damit gilt die
   Zusage wörtlich: was einmal lief, läuft wieder.

   **Warum die Fassung im Namen der Sammlung steht.** Ein neuer Name
   ist eine leere Sammlung; beim Aktivieren fliegt jede Sammlung mit
   dem Präfix, die nicht die laufende ist. So gibt es keinen Weg, auf
   dem Reste zweier Fassungen nebeneinander liegen bleiben.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/start.js` (meldet diese Datei mit relativem Pfad an; nur
   von dort wird sie geladen), `index.html` und allem, was die Seite
   nachlädt — `runtime/*.js`, `spiel/*.mjs`, `netz/*.mjs`,
   `manifest.webmanifest`. Kennt keine Spielregel und keinen
   Spielstand. */

/* Die Fassung. Sie zu erhöhen ist die einzige Handlung, mit der man
   alte Abschriften loswird — und sie steht in genau dieser Zeile. */
const FASSUNG = 1;

const SAMMLUNG = `hatred-v${FASSUNG}`;
const PRAEFIX = "hatred-v";

/* Beim Anmelden gibt es nichts vorzuladen (Begründung oben). Das
   `skipWaiting` ist trotzdem wichtig: Ohne es bliebe eine neue Fassung
   dieser Datei so lange im Wartestand, bis Jannik jeden Reiter
   geschlossen hat — und genau so entsteht der Fall, den diese Datei
   verhindern soll. */
self.addEventListener("install", (fund) => {
  fund.waitUntil(self.skipWaiting());
});

/* Aufräumen und sofort übernehmen. `clients.claim` sorgt dafür, dass
   schon die laufende Seite von dieser Fassung bedient wird; sonst
   antwortete bis zum nächsten Laden noch die vorige. */
self.addEventListener("activate", (fund) => {
  fund.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(PRAEFIX) && name !== SAMMLUNG) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

/* Nur eigene Dateien und nur Abrufe. Alles andere — fremde Adressen,
   Teilabrufe, Sendungen — geht unberührt durch: Ein Zwischenspeicher,
   der sich in fremde Anfragen einmischt, bricht Dinge, die er gar
   nicht kennt. */
function zustaendig(anfrage) {
  if (anfrage.method !== "GET") return false;
  if (anfrage.headers.has("range")) return false;
  const ziel = new URL(anfrage.url);
  return ziel.origin === self.location.origin;
}

/* Eine Abschrift nehmen ist Beiwerk: Scheitert sie (kein Platz, eine
   Antwort ohne Körper), darf sie die Auslieferung nicht mitreißen. */
async function lege(anfrage, antwort) {
  if (!antwort || !antwort.ok || antwort.type === "opaque") return;
  try {
    const sammlung = await caches.open(SAMMLUNG);
    await sammlung.put(anfrage, antwort.clone());
  } catch { /* ohne Abschrift läuft es auch, nur nicht offline */ }
}

/* Der einzige deutsche Satz, den diese Datei je zeigt — und er sagt,
   was zu tun ist. Er erscheint nur, wenn beides fehlt: Netz und
   Abschrift; dann ist die Seite nie geladen worden. */
const ABSAGE = "Hatred ist offline und diese Datei war noch nie geladen. "
  + "Verbinde dich einmal mit dem Netz und lade die Seite neu — danach "
  + "läuft das Spiel auch ohne Verbindung.";

self.addEventListener("fetch", (fund) => {
  const anfrage = fund.request;
  if (!zustaendig(anfrage)) return;

  fund.respondWith((async () => {
    try {
      const ausDemNetz = await fetch(anfrage);
      await lege(anfrage, ausDemNetz);
      return ausDemNetz;
    } catch {
      const abschrift = await caches.match(anfrage);
      if (abschrift) return abschrift;
      /* Für einen Seitenaufruf ohne Abschrift eine lesbare Seite, für
         alles andere ein nackter Fehlschlag — ein HTML-Text anstelle
         eines Moduls wäre ein zweiter, verwirrender Fehler. */
      const seite = anfrage.mode === "navigate";
      return new Response(seite ? `<!doctype html><html lang="de"><meta charset="utf-8">`
        + `<body style="background:#04040a;color:#cfc7e0;font-family:monospace;`
        + `padding:2em;line-height:1.6">${ABSAGE}</body></html>` : ABSAGE, {
        status: 503,
        headers: {
          "content-type": seite ? "text/html; charset=utf-8" : "text/plain; charset=utf-8"
        }
      });
    }
  })());
});
