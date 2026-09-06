# Projektgrenze zur Dashboard-Games-Plattform

Status: **beschlossen** · Stand: 06.09.2026

Hatred hat einen Nachbarn: Janniks eigene **Dashboard-Games-Plattform**.
Ihr Vertrag liegt als `GAME_PROJECT_CONTEXT.md` und `AGENTS.md` im
Repository, ihr geprüftes Bausatz-Paket unter
`packages/dashboard-games-sdk`.

## Wie es dazu kam

Jannik hat das Repository aus der Plattform-Vorlage erzeugt („Dashboard
Golden Path Game 2.2.0") und auf die Frage, ob sie weichen soll,
geantwortet: *„vorlage nur weg wenn sie keinen mehrwert hat."*

**Sie hat Mehrwert, und zwar genau den, der hier gefehlt hat.** Der
Beleg steht in ihrem eigenen Quelltext, `src/server/websocket.mjs`:

```js
// TODO(gameplay): Frames hier an die autoritative Spiellogik anbinden.
socket.on("data", () => socket.end());
```

Die Vorlage ist die Fassung, Hatreds `spiel/` ist der Inhalt. Was sie
mitbringt, ist genau das, was ein Internet-Koop braucht und was mit dem
Spiel selbst nichts zu tun hat:

| Sie bringt mit | steht in |
| --- | --- |
| Lobbys mit sechsstelligem Code, Einladungen, Gastzugang | `src/server/lobbies.mjs`, 93 Zeilen |
| Sitzungen, Cookies, kurzlebige WebSocket-Marken | `src/server/sessions.mjs`, 153 Zeilen |
| Der WebSocket-Handschlag samt Herkunftsprüfung | `src/server/websocket.mjs`, 57 Zeilen |
| Der Bausatz für Browser und Dienst, mit Tests | `packages/dashboard-games-sdk`, 926 Zeilen |
| Manifest, Gesundheitsprüfung, Auslieferung | `.dashboard/game.yml`, `Dockerfile` |

Der Lobbycode dort ist bereits **gehärtet**: ein Alphabet ohne 0/O und
1/I, zeitkonstanter Geheimnisvergleich, Ablauffrist, Versuchszähler.
Genau das hätte hier von Hand entstehen müssen — schlechter.

## Damit ist eine offene Entscheidung beantwortet

`docs/SPIEL.md` 8.1 fragte, wie sich zwei Rechner in zwei Wohnungen
finden: Einladungscode von Hand, eigener Vermittler, oder ein dauerhaft
laufender Dienst. **Die Antwort ist der dritte Weg — aber es ist kein
fremder Dienst, sondern Janniks eigener.** Das war der Einwand, der den
dritten Weg vorher ausgeschlossen hat, und er gilt nicht mehr.

## Hatred besitzt

- `spiel/` — alle Spielregeln. Kennt weder Browser noch Leitung noch
  Plattform.
- `runtime/` — das Bild und die Bedienung im Browser.
- `netz/sitzung.mjs` — der Schiedsrichter: Aktionen ordnen, anwenden,
  Rundensummen vergleichen. **Kennt seine Leitung nicht**, sondern
  bekommt zwei Funktionen zum Senden gereicht.
- `werkzeuge/`, `docs/`, `CLAUDE.md` — die Alpha-Code-Arbeitsweise.

## Die Plattform besitzt

- `src/server/` — Lobby, Sitzung, WebSocket, HTTP.
- `packages/dashboard-games-sdk/` — der gepinnte Bausatz. **Fremdcode.**
- `contracts/`, `.dashboard/game.yml` — Manifest und Schema.
- `GAME_PROJECT_CONTEXT.md`, `AGENTS.md` — der Vertrag und die
  Bauregeln. Beide gelten hier unverändert weiter.

## Erlaubte Verbindung

In **eine** Richtung, über eine benannte Stelle:

```text
Dashboard-Plattform
  └─ liefert einen WebSocket-Rahmen an src/server/websocket.mjs
       └─ netz/sitzung.mjs nimmt ihn als Aktion entgegen
            └─ spiel/aktionen.mjs rechnet, gibt Ereignisse zurück
                 └─ zurück durch dieselbe Leitung
```

**Verboten:**

- `spiel/` importiert nichts aus `src/server/`, `packages/` oder
  `netz/`. Die Regel „der Kern kennt keinen Browser" gilt wörtlich auch
  für „der Kern kennt keine Plattform" — daran hängt, dass vier Rechner
  bitgleich rechnen.
- Quelltext aus `packages/dashboard-games-sdk` wird **nicht kopiert**.
  Er ist gepinnt; eine Kopie veraltet lautlos.
- Kein geteiltes Geheimnis im Repository. Was der Dienst braucht, kommt
  aus der Umgebung (`.env.example` zeigt, welche Namen).

## Was passiert, wenn die Grenze fällt

Der teure Fall ist nicht der Absturz, sondern der stille: Sobald
`spiel/` etwas von der Plattform liest — die Uhr des Servers, eine
Spieler-Kennung, eine Zufallszahl von dort —, rechnen zwei Rechner
verschieden, und **niemand merkt es**, bis die Rundensumme auseinander
läuft. `werkzeuge/pruefe-kern.mjs` prüft die Textseite davon; die
Denkseite prüft niemand außer dem, der es baut.

## Zwei Wege ins Spiel, ein Schiedsrichter

Hatred behält daneben die **direkte** Leitung (`netz/verbindung.mjs`,
Einladungscode zum Kopieren, ohne jeden Server). Das ist keine
Doppelarbeit, sondern derselbe Schiedsrichter an einer zweiten
Steckdose:

| Weg | braucht | wofür |
| --- | --- | --- |
| Dashboard | die laufende Plattform | der bequeme Abend zu viert |
| Direkt | nichts | schnell zu zweit, oder wenn das Dashboard steht |

Beide reichen `netz/sitzung.mjs` dieselben zwei Sendefunktionen. Wäre
der Schiedsrichter an eine Leitung gebunden, gäbe es ihn zweimal — und
zwei Schiedsrichter sind zwei Regelwerke (Fehlerbuch E2).
