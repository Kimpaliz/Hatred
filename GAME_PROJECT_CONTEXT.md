# Kontext und Plattformvertrag für ein Dashboard-Spiel

> Vorlage für jedes neue Spiel-Repository · Vertragsversion: Games API v1 · Kontextversion: 2026-08-12.1
> Diese Datei ist Bestandteil des privaten kanonischen GitHub-Template-
> Repositories und wird beim Erzeugen eines neuen Spiels automatisch
> übernommen. Sie ist eigenständig und benötigt keinen Zugriff auf das
> Dashboard-Repository.

Dieser Text und das danebenliegende JSON-Schema bilden gemeinsam den
ausführbaren **Games Integration Contract v1**. Normative Aussagen verwenden
„muss“, „darf nicht“ oder „exakt“. Beispiele sind nur dann austauschbar, wenn
der beschriebene beobachtbare Vertrag unverändert bleibt. Änderungen an
Pflichtfeldern, Endpunkten oder Sicherheitsgrenzen benötigen eine neue
Kontextversion; inkompatible Änderungen benötigen eine neue API-Version.

## 0. Primärer Golden Path und Versionierung

Neue Spiele werden grundsätzlich über **Use this template** aus dem privaten
kanonischen GitHub-Template-Repository erzeugt. Es enthält diesen Kontext, das
Manifest-v2-Schema, gültige Platzhaltermedien und das exakt gepinnte SDK als
lokalen Workspace `packages/dashboard-games-sdk`. Damit sind Workflow,
Lockfile, Container, Launch-/Invite-Kante und Konformitätstests auf demselben
bekannten Stand. Eine vollständig manuelle Neuanlage ist die
dokumentationspflichtige Ausnahme für Migrationen oder bewusst abweichende
Tech-Stacks, nicht der normale Einstieg.

Template, SDK, Manifest, Games API und Build-Ergebnis werden unabhängig
versioniert. Dieser Kontextstand verwendet Template `2.2.0`, SDK `2.0.0`,
Manifest `schemaVersion: 2`, `games-v1` und den geschlossenen Build-Result-
Vertrag `schemaVersion: 1`. Bei bestehenden Spielen wird ein neues Template
nicht vollständig darüberkopiert: SDK, Workflow, Sicherheitsadapter und Tests
werden in einem eigenen Upgrade-PR selektiv übernommen, während Spiellogik,
Branding und gespeicherte Daten erhalten bleiben. Jede SDK-Erhöhung aktualisiert
Workspace-Pin und Lockfile gemeinsam und muss Tests, Build,
`npm run dashboard:verify` sowie den Container-Smoke-Test bestehen.

### 0.1 Versionsregel für Pull Requests

**Jeder Pull Request muss die Spielversion anheben.** Verbindlich gilt:

- `package.json` und `.dashboard/game.yml` tragen exakt dieselbe SemVer-Version
  `major.minor.patch`.
- Diese Version muss strikt größer sein als die Version auf dem Zielbranch.
- Führt das Repository eine `CHANGELOG.md`, enthält sie einen Abschnitt mit
  genau dieser Version.

Grund: Das Build-Ergebnis meldet Version und Image-Digest gemeinsam
(`dashboard-game-result` v1). Ohne Anhebung tragen zwei unterschiedliche,
unveränderliche Images dieselbe Version; Deploy-Historie, Rollback und
Support-Rückfragen in der Games-Verwaltung werden dadurch mehrdeutig.

Ein Major-Sprung bedeutet eine Änderung an Manifest, Fähigkeiten, gespeicherten
Daten oder Games-API-Kompatibilität. Änderungen an Optik, Inhalt oder Build
bleiben Minor oder Patch.

Die Regel ist ausführbar: `scripts/check-version-bump.mjs` vergleicht gegen den
Zielbranch und läuft im Job `verify` als Schritt „Verify version bump“ für jedes
`pull_request`-Event. Damit sie das Zusammenführen wirklich blockiert, wird
`verify` in den Branch-Schutzregeln des Standardbranches als erforderlicher
Status-Check geführt.

## 1. Auftrag

Baue ein kleines, webbasiertes Multiplayer-Spiel, das über einen zentralen
Dashboard-Spielehub gestartet wird. Das Spiel besitzt einen Browser-Client und
einen autoritativen Server. Es läuft als eigener isolierter Container, übernimmt
die Dashboard-Identität über einen Einmalcode und speichert dauerhaften
Meta-Fortschritt ausschließlich über die Dashboard Games API.

Genre und Framework sind frei. Koop, Roguelike-Runs, Freischaltungen und
langfristiger Fortschritt sind vorgesehen. Der Plattformvertrag darf nicht durch
eine spielspezifische Sonderintegration umgangen werden.

Nach der externen Entwicklung wird die HTTPS-URL des privaten Repositories in
der Games-Verwaltung eingetragen. Das Dashboard validiert Manifest und
GitHub-App-Zugriff, startet den fest vereinbarten Workflow und übernimmt nur das
verifizierte GHCR-Image. Nach einem gesunden Production-Deploy ist das Spiel im
Spiele-Hub startbar. Spätere externe Änderungen werden in der Verwaltung mit
„Neu laden & Build starten“ synchronisiert und erneut über denselben Workflow
gebaut; das Dashboard checkt oder verändert den Spielquellcode nicht selbst.

## 2. Feste Architekturregeln

- Ein privates GitHub-Repository entspricht genau einem Spiel.
- V1 liefert ein Fullstack-Image: statischer Client und HTTP-/WebSocket-Backend
  im selben Container.
- Der Game-Server ist autoritativ für Lobby, Match, Run, Zufall, Schaden,
  Belohnungen und Ergebnisvalidierung.
- Der Browser darf sich niemals Punkte, Inventar oder Fortschritt selbst
  bestätigen.
- Der Container greift weder auf Dashboard-Datenbank noch Docker-Socket oder
  Host-Dateisystem zu.
- Dauerhafter Fortschritt wird nur über authentifiziertes HTTPS mit der Games
  API gelesen und geschrieben.
- GitHub Actions testet und baut; der Live-Server checkt keinen Quellcode aus.
- Images und Deployments sind durch Digest unveränderlich.
- Keine Secrets in Client-Bundle, Repository, Image, URL oder Log.

## 3. Empfohlene Repository-Struktur

```text
.
├─ .dashboard/
│  └─ game.yml
├─ .github/
│  └─ workflows/
│     └─ dashboard-game.yml
├─ src/
│  ├─ client/
│  ├─ server/
│  └─ shared/
├─ public/
├─ tests/
├─ Dockerfile
├─ package.json
├─ package-lock.json
├─ README.md
└─ GAME_PROJECT_CONTEXT.md
```

Andere Strukturen sind erlaubt, solange Manifest, Workflow, Dockerfile,
Endpunkte und Sicherheitsgrenzen eingehalten werden.

### 3.1 Verbindliche Liefer- und Annahmecheckliste

Ein Repository gilt für das Dashboard erst dann als vollständig lieferbar, wenn
alle folgenden Dateien auf demselben Commit vorhanden sind:

| Datei | Verbindlicher Inhalt |
| --- | --- |
| `.dashboard/game.yml` | Geschlossenes Manifest `schemaVersion: 2` mit Games-v1-API-Kompatibilität, ID, Version, Runtime-Endpunkten, Fähigkeiten, Ressourcenlimits und allen drei Medienpfaden. |
| `public/dashboard/cover.<avif|png|jpg|jpeg|webp>` | Verpflichtendes Katalogbild; der im Manifest angegebene Pfad und die Datei liegen auf demselben Commit. |
| `public/dashboard/hero.<avif|png|jpg|jpeg|webp>` | Verpflichtendes Hero-Bild; der im Manifest angegebene Pfad und die Datei liegen auf demselben Commit. |
| `public/dashboard/icon.<avif|png|jpg|jpeg|webp>` | Verpflichtendes Spiel-Icon; der im Manifest angegebene Pfad und die Datei liegen auf demselben Commit. |
| `.github/workflows/dashboard-game.yml` | Workflow exakt an diesem Dateipfad, mit Top-Level-Trigger `workflow_dispatch`, ohne benutzerdefinierte Pflicht-Inputs startbar; er verwendet den von GitHub aufgelösten `${{ github.sha }}` als Build-Commit für Tests, Image, GHCR und Ergebnisartefakt. |
| `Dockerfile` | Reproduzierbares Multi-Stage-Image, non-root Runtime, deklarierter Port und eigener Docker-`HEALTHCHECK`. |
| Lockfile des Paketmanagers | Vollständig eingecheckte, reproduzierbare Abhängigkeitsauflösung. |
| Unit-/Integrations-/Smoke-Tests | Nachweise für Health, Version, Launch/Exchange und alle verwendeten Games-API-Funktionen. |
| `README.md` | Lokaler Start, Tests, Architektur, Fortschrittsschema und unterstützte Plattformfunktionen. |

`GAME_PROJECT_CONTEXT.md` soll als unveränderte Arbeitsgrundlage im Repository
liegen, ist aber kein Runtime-Artefakt. Zusätzliche Dateien und eine andere
Quellstruktur sind erlaubt. Keines der folgenden Ergebnisse darf durch eine
README-Aussage, einen Tag oder ein manuell gebautes Image ersetzt werden:

- erfolgreicher Test- und Container-Smoke-Lauf,
- in GHCR veröffentlichtes Image,
- von GitHub/Docker ermittelter unveränderlicher `sha256:`-Image-Digest,
- exakt benanntes Actions-Artefakt `dashboard-game-result`,
- darin auf oberster Ebene `dashboard-game-result.json` nach Abschnitt 12.

Fehlt auch nur einer dieser Punkte, bleibt der Build nicht deploybar. Das gilt
insbesondere für Workflows, die nur testen oder nur ein GHCR-Tag pushen, aber
kein verifiziertes Ergebnisartefakt hochladen.

## 4. Verbindliches Manifest

Datei: `.dashboard/game.yml`

Die maschinenlesbare Quelle der Wahrheit für jede neue Repository-Anbindung und
jeden erneuten Repository-Sync ist
[`game-manifest-v2.schema.json`](game-manifest-v2.schema.json). Ein vollständiges
Beispiel liegt unter [`examples/game-v2.yml`](examples/game-v2.yml). Das Schema
ist geschlossen: Unbekannte Felder werden abgelehnt und müssen zuerst als
versionierte Plattformerweiterung aufgenommen werden.

[`game-manifest-v1.schema.json`](game-manifest-v1.schema.json) und
[`examples/game.yml`](examples/game.yml) bleiben ausschließlich als
Legacy-Vertrag erhalten. Das Dashboard darf ein bereits gespeichert und früher
gültig aufgenommenes v1-Manifest weiter ausführen oder zurückrollen. Neue
Attach-Vorgänge und jeder Sync eines Repository-Manifests müssen dagegen
`schemaVersion: 2` erfüllen; ein v1-Manifest wird dort mit einem verständlichen
Upgradehinweis abgewiesen. Diese Trennung verhindert, dass eine bestehende
Production durch eine nachträgliche semantische Verschärfung von v1 ungültig
wird.

```yaml
schemaVersion: 2
id: koop-tower-defense
name: Koop Tower Defense
summary: Verteidigt eure Basis gemeinsam gegen immer stärkere Wellen.
version: 0.1.0
apiCompatibility: games-v1

runtime:
  type: fullstack
  port: 8080
  healthPath: /healthz
  versionPath: /version.json
  websocketPath: /ws

capabilities:
  multiplayer: true
  persistentProgress: true
  achievements: true
  leaderboards: true

resources:
  cpu: 0.5
  memoryMb: 256
  pids: 128

media:
  coverPath: public/dashboard/cover.webp
  heroPath: public/dashboard/hero.webp
  iconPath: public/dashboard/icon.png
```

Regeln:

- `id` ist nach der Registrierung unveränderlich, kleingeschrieben und
  ein DNS-taugliches Label mit höchstens 63 Zeichen
  (`^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$`).
- `version` folgt SemVer und stimmt mit `/version.json` überein.
- `schemaVersion` ist für Neuaufnahme und Sync exakt `2`; sie versioniert das
  Repositorymanifest und ist unabhängig von `apiCompatibility`.
- `apiCompatibility` ist für diesen Vertrag weiterhin exakt `games-v1`.
- Der Prozess lauscht auf `0.0.0.0:<runtime.port>`.
- Runtime-Pfade beginnen mit `/`, enthalten weder Query/Fragment noch `.`- oder
  `..`-Segmente und sind paarweise verschieden.
- Medienpfade sind relative Repository-Pfade ohne Traversal. Erlaubt sind AVIF,
  PNG, JPEG und WebP; SVG wird wegen aktiver Inhalte nicht übernommen. Manifest v2
  verlangt exakt je eine Datei `public/dashboard/cover.<ext>`,
  `public/dashboard/hero.<ext>` und `public/dashboard/icon.<ext>` sowie alle
  drei korrespondierenden Manifestfelder. Die Dateien müssen auf demselben
  Commit wie Manifest und Build vorhanden und als echte dekodierbare Bilder
  lesbar sein; eine externe URL ersetzt keine Lieferdatei.
- Der Hub lädt dieses Artwork unverändert vom Spiel-Host, ein Spiel bezahlt seine
  Bildgröße also mit der Ladezeit des gesamten Katalogs. Verbindliches Budget je
  Rolle: **Cover ≤ 300 KB, Hero ≤ 400 KB, Icon ≤ 80 KB**, bevorzugt WebP oder AVIF
  in Anzeigegröße (Hero ≤ 1600×900, Cover ≤ 1280×720, Icon ≤ 512×512). Verlustfreie
  Voll-PNGs verfehlen dieses Budget um eine Größenordnung. `verify-repository.mjs`
  und der Container-Smoke-Test prüfen es; die Dashboard-Verwaltung zeigt zusätzlich
  jede Rolle mit ihrem Budget an. Das Artwork wird unter einer digest-gestempelten
  URL (`?v=<activeImageDigest>`) ausgeliefert und ist damit unveränderlich — der
  Spiel-Host cacht es entsprechend mit
  `Cache-Control: public, max-age=31536000, immutable`.
- Katalogadministratoren dürfen nach der Aufnahme optionale URL-Overrides für
  Cover, Hero oder Icon setzen. Diese Overrides sind Dashboard-Metadaten, keine
  Manifestfelder, und ändern weder den Repositoryvertrag noch das Buildartefakt.
  Fehlt ein Override oder wird es entfernt, fällt der Katalog deterministisch
  auf das aus dem Repository übernommene Bild zurück.
- Der Ressourcenwunsch liegt innerhalb des v1-Vertrags (0,1–2 CPU, 128–2048
  MiB RAM, 32–512 PIDs). Das Dashboard darf darunterliegende administrative
  Grenzwerte erzwingen, aber nie über den Manifestwunsch hinaus freigeben.
- Zusätzliche Services oder höhere Ressourcen werden nicht eigenmächtig per
  Compose eingeführt, sondern als Plattformerweiterung angefragt.

## 5. Runtime-Endpunkte des Spiels

### `GET /healthz`

Schnell, ohne Anmeldung und ohne sensible Details:

```json
{
  "status": "ok",
  "gameId": "koop-tower-defense",
  "version": "0.1.0"
}
```

`200` bedeutet bereit für Traffic. Bei fehlenden kritischen Abhängigkeiten ist
ein Nicht-2xx-Status zurückzugeben. Keine Tokens, internen URLs oder Stacktraces.

### `GET /version.json`

```json
{
  "gameId": "koop-tower-defense",
  "version": "0.1.0",
  "commitSha": "0123456789abcdef",
  "apiCompatibility": "games-v1",
  "builtAt": "2026-08-02T12:00:00Z"
}
```

### `GET /`

Liefert die Browser-Anwendung. Die App liest den Launch-Code aus dem
URL-Fragment, entfernt ihn sofort mit `history.replaceState` und sendet ihn nur
an das eigene Backend.

Alle Browsermodule müssen mit ihrem tatsächlichen Medientyp ausgeliefert
werden. Insbesondere gelten in v1:

| Ressource | Verbindlicher `Content-Type` |
| --- | --- |
| HTML | `text/html; charset=utf-8` |
| CSS | `text/css; charset=utf-8` |
| `.js` und `.mjs` | `text/javascript; charset=utf-8` oder `application/javascript; charset=utf-8` |
| JSON | `application/json; charset=utf-8` |
| WebAssembly, falls verwendet | `application/wasm` |
| Manifestmedien | der zum tatsächlichen AVIF-/PNG-/JPEG-/WebP-Inhalt passende Bildtyp |

Ein unbekannter Modulpfad antwortet mit `404` und nicht mit der HTML-Shell.
Der Container-Smoke-Test muss die Einstiegseite, jedes von ihr transitiv
importierte Browsermodul und mindestens einen JSON-Endpunkt abrufen. Ein
erfolgreicher HTML-Fallback mit falschem MIME-Typ ist kein bestandener Test.

### Öffentliche Plattform- und Sessionendpunkte

Diese Endpunkte gehören zum Game-Backend auf derselben Origin wie der Client.
Sie sind **nicht** die Dashboard Games API. Jede JSON-Antwort, einschließlich
4xx/5xx-Antworten, verwendet `Content-Type: application/json; charset=utf-8`
und `Cache-Control: no-store`. Jeder Request mit JSON-Body sendet
`Content-Type: application/json`; Form-, Query- oder Fragmentwerte ersetzen
keinen JSON-Body.

#### `GET /api/platform`

Gibt ausschließlich öffentliche Fähigkeiten aus, niemals Service-Key, interne
API-URL, Session- oder Invite-Token:

```json
{
  "mode": "dashboard",
  "requiresDashboardSession": true,
  "guestSessionsSupported": true,
  "dashboardLaunchUrl": "https://dashboard.example.test/?view=games"
}
```

`guestSessionsSupported` ist nur bei sicher implementiertem Multiplayer-Gastzugang
`true`. `dashboardLaunchUrl` ist eine von der Plattformkonfiguration abgeleitete
HTTPS-URL und keine vom Einladungslink frei gelieferte Zieladresse.

#### `POST /api/session`

Tauscht einen aus dem Fragment entfernten Dashboard-Launch-Code ausschließlich
serverseitig aus:

```json
{ "launchCode": "opaque-one-time-code" }
```

Die Antwort setzt ein `Secure; HttpOnly; SameSite=Strict`-Cookie und liefert
die serialisierte Spielsession einschließlich eines einmal verwendbaren,
höchstens 60 Sekunden gültigen `wsToken`. Launch-Code und Service-Key erscheinen
nie in Cookie, URL, Antwort oder Log.

#### `GET /api/session/current`

Nimmt ausschließlich das HttpOnly-Cookie wieder auf. Bei gültiger Dashboard-
oder Gastsession liefert die Route deren öffentliche Spielerangaben und einen
frischen `wsToken`; ohne aktive Session antwortet sie mit `401` als JSON. Ein
`401` bei einer gültigen Multiplayer-Einladung führt im Client zur Auswahl
„Gast“ oder „Dashboard-Anmeldung“, nicht zu einem funktionslosen Hauptmenü.

#### `POST /api/session/ws-token`

Stellt für die aktive Cookie-Session einen neuen, einmal verwendbaren und
kurzlebigen WebSocket-Token aus. Der WebSocket akzeptiert weder das Cookie noch
Launch-, Invite- oder Service-Token als Ersatz.

#### `POST /api/session/guest`

Existiert nur für `capabilities.multiplayer: true` und benötigt:

```json
{
  "code": "ABC234",
  "inviteToken": "opaque-high-entropy-capability",
  "displayName": "Gast"
}
```

Der Server prüft Lobby, freie Spielerrolle, Invite-Gültigkeit und Rate-Limit
mit einer absichtlich einheitlichen Ablehnung für unbekannte oder falsche
Einladungen. Die erzeugte Gastsession ist an genau diese Lobby und Spielerrolle
gebunden, endet spätestens mit Runde/Lobby, besitzt weder Dashboard-`sessionId`
noch Dashboard-`player.id`, Fortschritt, Rewards oder Statistikberechtigung und
darf weder Lobby/Singleplayer erstellen noch eine andere Lobby oder DEV-Funktion
verwenden. Der Anzeigename wird serverseitig normalisiert und an die Session
gebunden. Das Cookie und der One-shot-`wsToken` folgen denselben Schutzregeln
wie bei `/api/session`.

### `WS /ws`

Akzeptiert ausschließlich ein kurzlebiges, vom Game-Backend ausgestelltes
WebSocket-Token. Launch-Code und Dashboard-Service-Key sind keine dauerhaften
WebSocket-Credentials.

## 6. Umgebungsvariablen

| Variable | Zweck |
| --- | --- |
| `PORT` | interner HTTP-/WebSocket-Port |
| `NODE_ENV` | `production`, `test` oder `development` |
| `DASHBOARD_GAMES_API_URL` | vollständige Games-v1-Basis einschließlich `/api/modules/games/v1`; der Client hängt nur relative `service/...`-Pfade an |
| `DASHBOARD_GAME_ID` | registrierte, unveränderliche Game-ID |
| `DASHBOARD_GAME_API_KEY` | geheimer Service-Schlüssel, nur serverseitig |
| `GAME_VERSION` | veröffentlichte SemVer-Version |
| `COMMIT_SHA` | exakter Quell-Commit |
| `PUBLIC_BASE_URL` | öffentliche URL dieses Deployments |

Der Prozess bricht beim Start verständlich ab, wenn eine zwingende Variable
fehlt. Werte und insbesondere `DASHBOARD_GAME_API_KEY` dürfen nicht geloggt oder
an den Client serialisiert werden.

## 7. Start und Session-Austausch

### Identitätskette und Authentik-Grenze

Die Anmeldung lokaler Benutzer findet ausschließlich am Dashboard über
Authentik statt. Das Dashboard ordnet das angemeldete Authentik-Konto seinem
internen Benutzer und anschließend einem opaken Games-Spielerprofil zu. Für das
Spiel gilt verbindlich diese Identitätskette:

```text
Authentik-Konto → Dashboard-Benutzer → opakes Games-Spielerprofil → einmaliger Launch-Code → Game-Session
```

Das Spiel kommuniziert niemals direkt mit Authentik und implementiert für
Dashboard-Benutzer keinen eigenen Authentik-/OIDC-Login. Es erhält weder
Authentik-Cookies oder -Tokens noch Gruppenmitgliedschaften, E-Mail-Adressen,
interne Authentik-IDs oder interne Dashboard-User-IDs. Anmeldung,
Gruppenzuordnung und Dashboard-Berechtigungen bleiben alleinige Verantwortung
des Dashboards. Das Spiel bindet Laufzeitdaten ausschließlich an die nach dem
serverseitigen Launch-Code-Austausch gelieferte opake `player.id`.

1. Das Dashboard öffnet ungefähr
   `https://<game-host>/#launch_code=<einmalcode>`.
2. Der Client liest und entfernt das Fragment und sendet den Code per HTTPS an
   sein eigenes Backend, zum Beispiel `POST /api/session`.
3. Das Backend tauscht ihn serverseitig bei der Dashboard Games API:

```http
POST /api/modules/games/v1/service/sessions/exchange
Authorization: Bearer ${DASHBOARD_GAME_API_KEY}
Content-Type: application/json
```

```json
{
  "launchCode": "opaque-one-time-code",
  "gameId": "koop-tower-defense",
  "gameVersion": "0.1.0"
}
```

Erwartete Antwort:

```json
{
  "sessionId": "opaque-game-session-id",
  "expiresAt": "2026-08-02T12:30:00Z",
  "player": {
    "id": "opaque-player-id",
    "displayName": "Fuchs",
    "avatarUrl": null
  },
  "progress": {
    "schemaVersion": 1,
    "version": 7,
    "data": {}
  }
}
```

Der Launch-Code ist höchstens 60 Sekunden gültig, an dieses Spiel gebunden und
einmal verwendbar. Ein fehlgeschlagener Austausch darf nicht durch Query-
Parameter-Identität oder eine ungebundene Gastidentität umgangen werden. Der
explizite Gastvertrag aus Abschnitt 5 ist die einzige Ausnahme und verleiht
keine Dashboard-Identität. Das Spiel speichert für Dashboard-Sessions nur die
opake `player.id`.

Die Dashboard-Session ist zunächst 30 Minuten gültig. Bis der geplante
Avatar-Asset-Endpunkt existiert, ist `avatarUrl` in v1 `null`; der Service erhält
keine große Avatar-Data-URL und niemals E-Mail oder interne User-ID.

### 7.1 Multiplayer-Einladung, Gast und Auth-Rückkehr

Eine Spielereinladung ist eine eng begrenzte Capability für genau einen freien
Sitz, keine Dashboard-Anmeldung. Das kanonische Format lautet:

```text
https://<game-host>/?code=ABC234&mode=player#invite=<opaque-token>
```

- `code` ist ein nicht geheimer Lobbybezeichner. `invite` besitzt mindestens
  128 Bit kryptografische Zufälligkeit und steht ausschließlich im Fragment,
  damit Reverse-Proxy, Authentik, Serverlogs und `Referer` ihn nicht erhalten.
- Der Client akzeptiert einen alten Query-Invite höchstens während einer
  dokumentierten Migration, verschiebt ihn sofort in flüchtigen Speicher und
  entfernt ihn aus der URL. Neu erzeugte Links verwenden nur das Fragment.
- Der Server bindet den Token an Game, Lobby und Spielerrolle. Beim ersten
  erfolgreichen Binden des freien Sitzes wird er atomar verbraucht. Reconnect
  verwendet danach einen getrennten Sitz-Token plus dieselbe Serveridentität.
- Ein verbrauchter, abgelaufener oder widerrufener Token ist nicht erneut
  verwendbar. Für eine neue Einladung rotiert der autoritative Server auf einen
  neuen Zufallswert; nur aktuell berechtigte Lobbyspieler dürfen diese Rotation
  anfordern. Lobby-/Rundenende widerruft alle zugehörigen Invite- und
  Gastsessions.
- Wer den vollständigen Link besitzt, kann den angebotenen Sitz vor dem Verbrauch
  beanspruchen. Deshalb wird er wie ein Geheimnis behandelt, nicht öffentlich
  gepostet und niemals in Telemetrie oder Fehlertext ausgegeben.

Ohne aktive Game-Cookie-Session zeigt der Client vor dem Verbindungsaufbau zwei
explizite Wege:

1. **Als Gast ohne Statistiken beitreten.** Erst die bewusste Auswahl ruft
   `POST /api/session/guest` auf. Der Gast erhält nur die rundenbezogene
   Spielfähigkeit aus Abschnitt 5.
2. **Mit Dashboard-Konto beitreten.** Das Spiel legt den Invite-Token mit kurzer
   TTL im `sessionStorage` seiner eigenen Origin ab und navigiert im selben Tab
   zur festen `dashboardLaunchUrl`, ergänzt nur um Game-ID und den nicht
   geheimen Lobbycode. Der geschützte Dashboard-Aufruf durchläuft bei Bedarf
   Authentik, erzeugt anschließend über den normalen Launch-Endpunkt einen
   frischen Code und navigiert zur serverseitig gelieferten `publicUrl` zurück:

   ```text
   https://<game-host>/?code=ABC234&mode=player#launch_code=<one-time-code>
   ```

   Nach dem Launch-Austausch liest das Spiel den ursprünglichen Invite aus
   seinem origin-eigenen `sessionStorage`, verbraucht ihn beim Sitzbeitritt und
   löscht den Eintrag. Das funktioniert genauso für einen bereits im Dashboard
   angemeldeten Spieler, der noch keine Game-Session besitzt.

Das Dashboard akzeptiert dabei weder `returnTo` noch eine freie Ziel-URL. Es
startet die angegebene, berechtigte Game-ID und verwendet ausschließlich die
`publicUrl` seiner gesunden Production-Deploymentdaten. Der Invite-Token wird
nie an Dashboard oder Authentik übertragen. Navigation in einen neuen Tab ist
für diesen Handoff unzulässig, weil der bewusst tabgebundene `sessionStorage`
sonst nicht verfügbar wäre. Fehlt oder verfällt der Eintrag, wird kein Sitz
erteilt; der Nutzer öffnet den ursprünglichen Invite erneut.

## 8. Vom Game-Server genutzte Dashboard-Endpunkte

`DASHBOARD_GAMES_API_URL` ist bereits die **vollständige Games-v1-Basis-URL**,
zum Beispiel
`https://dashboard.example.test/api/modules/games/v1`. Der Game-Server hängt
den Prefix `/api/modules/games/v1` niemals ein zweites Mal an. Er entfernt bei
der Konfiguration höchstens abschließende Slashes und ergänzt ausschließlich
die unten genannten relativen Pfade. Jeder Request nutzt den Bearer-Service-Key
und `Accept: application/json`; Requests mit Body verwenden zusätzlich
`Content-Type: application/json`. Eine 2xx-Antwort ohne JSON-Content-Type oder
ohne parsebaren JSON-Body ist ein Protokollfehler. Netzwerkfehler werden mit
begrenztem exponentiellem Backoff wiederholt; Mutationen benötigen stabile
Idempotenzschlüssel.

### Session aktiv halten

```http
POST /service/sessions/{sessionId}/heartbeat
```

Nicht pro Frame senden; ein moderates Intervall bzw. fachliche Aktivität reicht.
Der Dashboard-Server schreibt höchstens alle 15 Sekunden einen Heartbeat und
verlängert eine aktive Session jeweils auf 30 Minuten Restlaufzeit.

### Fortschritt lesen

```http
GET /service/players/{playerId}/progress
```

### Fortschritt atomar schreiben

```http
PUT /service/players/{playerId}/progress
Content-Type: application/json
```

```json
{
  "schemaVersion": 1,
  "expectedVersion": 7,
  "data": {
    "unlockedTowers": ["archer", "ice"],
    "metaCurrency": 120
  },
  "idempotencyKey": "run_01H..._reward_v1"
}
```

Bei Erfolg steigt `version`. Bei `409` enthält die Antwort den aktuellen Stand;
der Server lädt neu und führt eine fachlich sichere Zusammenführung durch. Nie
blind einen neueren Fortschritt überschreiben.

### Run-Checkpoint

```http
POST /service/sessions/{sessionId}/checkpoint
Content-Type: application/json
```

```json
{
  "eventId": "evt_01H...",
  "runId": "run_01H...",
  "playerId": "opaque-player-id",
  "checkpoint": "wave-10",
  "stats": { "waves": 10, "kills": 84 },
  "gameVersion": "0.1.0"
}
```

### Run abschließen

```http
POST /service/sessions/{sessionId}/finish
Content-Type: application/json
```

```json
{
  "eventId": "evt_01H...",
  "runId": "run_01H...",
  "participants": [
    {
      "playerId": "opaque-player-id-a",
      "result": "victory",
      "stats": { "shots": 18, "durationSeconds": 1460 },
      "rewards": { "metaCurrency": 40 }
    },
    {
      "playerId": "opaque-player-id-b",
      "result": "defeat",
      "stats": { "shots": 21, "durationSeconds": 1460 },
      "rewards": { "metaCurrency": 10 }
    }
  ],
  "gameVersion": "0.1.0",
  "finishedAt": "2026-08-02T12:25:00Z"
}
```

`eventId` bleibt bei Retries identisch. Wiederholungen dürfen Punkte oder
Belohnungen nicht doppelt zählen. `participants` enthält jeden an diesem Run
beteiligten Dashboard-Spieler genau einmal und die zur jeweiligen Person
gehörenden Werte. Die `player.id` der aufrufenden Dashboard-Session muss
enthalten sein; fremde, unbekannte oder doppelte IDs werden abgewiesen. Bei
kompetitiven Spielen darf es kein einziges Top-Level-`result` für Gewinner und
Verlierer geben: `victory`, `defeat`, `draw`, individuelle Statistiken und
Rewards stehen am jeweiligen Teilnehmer. Kooperative Spiele verwenden ebenfalls
`participants` und dürfen denselben fachlichen Ausgang pro Teilnehmer melden.

Gäste und virtuelle Gegner erscheinen niemals in `participants`. Ihre Anwesenheit
darf in anonymen Matchstatistiken berücksichtigt werden, erzeugt aber weder
Spielerprofil, Run-Zeile, Fortschritt, Achievement, Ranglistenwert noch Reward.
Besitzt eine Runde keinen Dashboard-Teilnehmer, wird kein `/finish` an das
Dashboard gesendet. Bei mehreren aktiven Dashboard-Sessions kann der Game-Server
den Run über eine dieser Sessions abschließen; der vollständige Teilnehmerblock
bleibt für alle Retries unverändert.

### Fachliche Ereignisse bündeln

```http
POST /service/events/batch
```

Der Body enthält ein Array `events` mit höchstens 50 Einträgen. Jeder Eintrag
besitzt `eventId`, `type`, `data` sowie für spielerbezogene Werte `playerId`;
`occurredAt` ist optional. Bekannte materialisierte Typen sind:

```json
{
  "events": [
    {
      "eventId": "evt_xp_01H...",
      "type": "xp.grant",
      "playerId": "opaque-player-id",
      "data": { "amount": 25 }
    },
    {
      "eventId": "evt_stat_01H...",
      "type": "stat.increment",
      "playerId": "opaque-player-id",
      "data": { "statId": "enemies-defeated", "delta": 84 }
    },
    {
      "eventId": "evt_achievement_01H...",
      "type": "achievement.progress",
      "playerId": "opaque-player-id",
      "data": {
        "achievementId": "tower-master",
        "definitionVersion": 1,
        "progress": 7
      }
    }
  ]
}
```

`achievement.unlock` verwendet ebenfalls `achievementId` und
`definitionVersion`. Unbekannte fachliche Typen werden nur journalisiert und
verändern keine XP-, Statistik- oder Achievement-Werte. Jeder Retry verwendet
denselben unveränderten `eventId`. Keine Positionsdaten, Frames, Tastendrücke
oder hochfrequente Kampftelemetrie senden.

## 9. Fortschrittsmodell

- Das Spiel dokumentiert ein JSON-Schema für `progress.data`.
- `schemaVersion` ändert sich bei Schemaänderungen, `version` bei jedem Update.
- Additive Änderungen und sinnvolle Defaults sind zu bevorzugen.
- Inkompatible Änderungen benötigen eine deterministische, getestete Migration.
- Belohnungen werden serverseitig aus validierten Ergebnissen berechnet.
- Checkpoints sind sparsam, idempotent und — falls unterstützt — nach Neustart
  wiederaufnehmbar.
- Ranglistenwerte beruhen auf serverseitig bestätigten Runs.

## 10. Multiplayer-Sicherheit

- Der Server kontrolliert Lobby, Teams, Seed, Zeit, Treffer, Belohnungen und
  Matchende.
- Client-Nachrichten sind Wünsche, keine bestätigten Zustandsänderungen.
- Jede WebSocket-Nachricht wird schema- und größenvalidiert.
- Verbindung, Nachrichtenrate und Lobby-Aktionen erhalten Limits.
- Reconnect nutzt kurzlebige Sessiondaten und eine begrenzte Grace-Period.
- Cross-Lobby- und Cross-Player-Zugriffe werden getestet.
- Invite-Token sind serverseitig gehasht oder gleichwertig geschützt, werden
  konstantzeitlich verglichen, atomar verbraucht und bei Rotation sowie
  Lobbyende widerrufen.
- Gastidentitäten besitzen einen getrennten Typ und eine Lobbybindung. Eine
  Gast-ID wird nie als Dashboard-`player.id` interpretiert oder an die
  Dashboard Games API gesendet.
- Unbekannte oder veraltete Clientversionen werden verständlich abgewiesen.
- Logs nutzen opake IDs und enthalten keine Tokens oder vollständigen Profile.

## 11. Docker- und Prozessvertrag

Das `Dockerfile` ist reproduzierbar und möglichst klein:

- Multi-Stage-Build und Lockfile-Installation,
- fest gepinnte Runtime-Hauptversion,
- Produktion ohne Dev-Abhängigkeiten und Quell-Credentials,
- eigener non-root User,
- `EXPOSE 8080` beziehungsweise Manifest-Port,
- eigener Docker-`HEALTHCHECK`, der den im Manifest angegebenen `healthPath`
  ohne externe Werkzeuge oder Zugangsdaten prüft; ein Image ohne Healthcheck ist
  nicht deploybar,
- `SIGTERM` behandeln und HTTP/WebSocket sauber beenden,
- keine Laufzeitinstallation von Paketen,
- keine eingebetteten `.env`-, npm-, GitHub- oder Registry-Secrets,
- Schreibzugriff nur nach `/tmp`, keine dauerhaften lokalen Dateien.

Der Container muss mit read-only Root-Dateisystem, gedroppten Capabilities,
`no-new-privileges`, CPU/RAM/PID-Limits und ohne Host-Volumes laufen.
Er wird ausschließlich an sein von der Plattform erzeugtes, projektbezogenes
Compose-Netz angeschlossen. Nur die Plattform verbindet Traefik zusätzlich mit
diesem Netz. Das Repository definiert weder Compose-Netzwerke noch Traefik-
Labels, Hostnamen oder Routingdateien.

## 12. GitHub Actions und Veröffentlichung

Workflow: `.github/workflows/dashboard-game.yml`.

### 12.1 Dispatch-Protokoll und exakte Commitauflösung

Das Dashboard sendet beim Workflow-Dispatch ausschließlich den Git-Ref. Der
Request-Body entspricht genau:

```json
{
  "ref": "<branch-or-tag>"
}
```

Das Dashboard sendet keine benutzerdefinierten Workflow-Inputs.
`workflow_dispatch` muss deshalb allein mit dem Ref startbar sein. Der Workflow
darf unter `workflow_dispatch` keine Pflicht-Inputs wie `commit_sha` definieren.
Optionale Inputs dürfen weder für die Auswahl des Quell-Commits erforderlich
sein noch den vom Dashboard gestarteten Build verändern.

GitHub löst den übergebenen Ref beim Erzeugen des Workflow-Events zu einem
unveränderlichen Commit auf. `${{ github.sha }}` ist der exakte Commit des
gestarteten Workflow-Runs. Der Workflow übernimmt diesen Wert unverändert als
`SOURCE_SHA`, checkt mit `actions/checkout` exakt diesen SHA aus und prüft danach
zwingend:

```bash
test "$(git rev-parse HEAD)" = "$SOURCE_SHA"
```

`dashboard-game-result.json`, `/version.json`, der Image-Tag und sämtliche
Provenienzangaben müssen genau diesen Commit ausweisen. Weder ein erneut
aufgelöster Branchname noch ein Input, Tag oder späterer Branch-Stand darf
`SOURCE_SHA` als Quelle der Build-Identität ersetzen.

Kanonisches Grundmuster (ohne `workflow_dispatch.inputs`):

```yaml
name: Dashboard game

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  packages: write

env:
  SOURCE_SHA: ${{ github.sha }}

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ env.SOURCE_SHA }}

      - name: Verify exact source commit
        shell: bash
        run: |
          test "$(printf '%s' "$SOURCE_SHA" | grep -Ec '^[0-9a-f]{40,64}$')" = "1"
          test "$(git rev-parse HEAD)" = "$SOURCE_SHA"
```

Pull Requests führen mindestens Lint, Typprüfung und Tests aus. Ein vom
Dashboard ausgelöster Build läuft für einen exakten Commit-SHA und:

1. installiert Abhängigkeiten reproduzierbar,
2. führt Unit-, Integrations- und Buildtests aus,
3. baut das Image,
4. prüft den deklarierten Health-/Versionpfad und den Docker-`HEALTHCHECK` in
   einem Container-Smoke-Test,
5. veröffentlicht nach GHCR,
6. liefert Image, Digest, Commit-SHA, Version und Testergebnis als Metadaten.

Der Workflow muss mindestens `contents: read` und `packages: write` besitzen.
Er darf keine langfristigen Registry-Zugangsdaten enthalten; für GHCR wird das
kurzlebige `GITHUB_TOKEN` verwendet. Der Image-Name ist vollständig
kleingeschrieben. Nach dem Push wird der Digest aus dem Build-/Registry-Ergebnis
übernommen, nicht aus einem Tag geraten und nicht selbst aus einem ZIP oder
Dateihash berechnet.

Vor dem Upload muss der Workflow den Ergebnisvertrag selbst prüfen und bei
fehlendem oder ungültigem Digest abbrechen. `commitSha` entspricht exakt dem vom
Workflow gebauten Commit, `version` exakt dem Manifest, `sourceUrl` genau diesem
Commit und `testsPassed: true` darf erst nach erfolgreichen Tests sowie dem
Container-Smoke-Test geschrieben werden.

Der Workflow lädt dafür genau ein kleines Actions-Artefakt mit dem Namen
`dashboard-game-result` hoch. Es enthält im Archiv auf oberster Ebene die Datei
`dashboard-game-result.json` nach diesem geschlossenen Vertrag:

```json
{
  "schemaVersion": 1,
  "image": {
    "reference": "ghcr.io/kimpaliz/koop-tower-defense",
    "digest": "sha256:<64 lowercase hex characters>"
  },
  "commitSha": "<40-64 lowercase hex characters>",
  "version": "0.1.0",
  "provenance": {
    "sourceUrl": "https://github.com/Kimpaliz/koop-tower-defense/commit/<sha>",
    "builtAt": "2026-08-02T18:00:00Z",
    "testsPassed": true
  }
}
```

Das Dashboard liest dieses Artefakt nach dem signierten `workflow_run`-Webhook
mit einem kurzlebigen GitHub-Installation-Token. Artefaktname, Dateiname,
Größe, Felder, GHCR-Referenz und Digestformat werden geschlossen validiert; der
gemeldete Commit muss exakt dem Workflow-Commit entsprechen. Der Digest des
ZIP-Artefakts ist ausdrücklich nicht der Image-Digest.

Das Dashboard zeigt den GitHub-Ablauf für den gebauten Commit direkt in der
Deploymentansicht: Run- und Runnerstatus, Jobs, Steps, Laufzeiten und – mit
`logs.view` – begrenzte Jobprotokolle. Ein wartender `ubuntu-latest`-Job wird von
GitHub gehostet und verlangt keinen Self-hosted Runner im Spiel-Repository.
Ungewöhnlich lange Wartezeiten werden als GitHub-Kapazitätsproblem kenntlich
gemacht und mit dem GitHub-Status verlinkt.

Buildanforderungen sind zusätzlich an den aufgelösten Commit-SHA gebunden.
Wiederholte Requests für denselben aktiven oder bereits erfolgreichen Commit
verwenden den vorhandenen Build und dispatchen keinen identischen Workflow ein
zweites Mal. Ein echter Retry ist für einen beendeten fehlgeschlagenen oder
abgebrochenen Lauf vorgesehen; ein neuer Quellstand besitzt ohnehin einen neuen
SHA.

Jeder erfolgreiche Build liefert genau **einen** Image-Digest. Drei verschiedene
Digests sind keine Anforderung an ein einzelnes Spiel-Repository: Sie werden nur
für die einmalige Plattformabnahme benötigt (gesunde Basis, gesundes Update und
absichtlich fehlerhafter Kandidat für den Rollback-Nachweis).

### 12.2 Minimaler Abschluss des Workflows

Unabhängig vom verwendeten Framework muss der letzte Teil des Workflows diese
beobachtbaren Ergebnisse erzeugen:

1. Das Image wurde unter `ghcr.io/<owner>/<game>` gepusht.
2. Der Push-Schritt liefert `sha256:<64 lowercase hex characters>` zurück.
3. `dashboard-game-result.json` wird aus genau diesem Digest und dem gebauten
   Commit erzeugt und gegen den obigen JSON-Vertrag geprüft.
4. `actions/upload-artifact` lädt die Datei unter dem unveränderten Namen
   `dashboard-game-result` hoch; im Artefakt liegt die JSON-Datei direkt auf der
   obersten Ebene.
5. Fehlt einer dieser Werte oder ist der Container-Healthcheck negativ, endet
   der Workflow fehlgeschlagen und veröffentlicht kein positives Ergebnis.

Ein erfolgreicher Workflow ohne dieses Artefakt ist aus Sicht des Dashboards
kein erfolgreicher Game-Build.

Das Image wird im Lauf **genau einmal** gebaut. Gepusht wird derselbe lokal
geladene Container, der zuvor den Smoke-Test bestanden hat; ein zweiter Build
für den Push ist unzulässig, weil er die Basis-Images erneut über eine fremde
Registry auflöst und damit ein bereits verifiziertes Ergebnis an einer
vorübergehenden Registry-Störung scheitern lässt. Build und Push wiederholen
sich bei solchen Störungen bis zu dreimal, bevor der Lauf fehlschlägt.

Ein Git-Push auf den im Dashboard ausgewählten Ref ist kein Produktionsdeploy.
Das Dashboard zeigt nur „Update verfügbar“ und stellt aktive Production-Version,
neue Manifest-Version, Commit-SHA und die erste Zeile der Commit-Nachricht
gegenüber. Pushes auf andere Refs ändern den Hinweis nicht. Staging/Produktion
werden bewusst auf einen konkreten Digest gesetzt; bei negativem Healthcheck
wird der vorherige Digest wiederhergestellt.

### 12.3 Optionaler Staging-Testlauf und Production

Staging ist in Games v1 ein **optionaler, kurzlebiger Testlauf**, kein
Production-Gate. Ein durch GitHub Actions erfolgreich verifizierter Digest darf
direkt nach Production deployt werden. Production übernimmt den Digest erst nach
bestandenem eigenen Healthcheck; bei einem fehlgeschlagenen Update stellt der
Deployment-Runner den zuvor gesunden Digest wieder her. Der Betreiber wählt
Staging insbesondere dann, wenn Migrationen, neue Runtime-Abhängigkeiten,
Routing, Credentials oder ein risikoreiches Multiplayerprotokoll vor dem
Livewechsel real geprüft werden sollen.

Ein Staging-Deploy ist kein zweiter dauerhafter Produktionscontainer. Nach dem
Test wird er über die Dashboard-Aktion **„Testlauf beenden“** gestoppt. Diese
Aktion darf ausschließlich das deterministisch aus Game-ID und `staging`
abgeleitete Compose-Projekt betreffen, entfernt keine Volumes oder
Buildartefakte, verändert Production nicht, widerruft die aktive
Staging-Service-Credential und ist idempotent. Danach lautet der beobachtbare
Staging-Zustand `stopped`; Telemetrie darf ihn nicht weiter als aktiven Spieler-
oder Laufzeitprovider zählen. Ein späterer Testlauf benötigt einen neuen
expliziten Staging-Deploy.

## 13. Lokale Entwicklung

Firebase oder andere externe Dienste dürfen frühe Prototypen unterstützen. Die
produktive Plattformintegration muss hinter einer kleinen Adapter-Schicht
liegen, sodass der Dashboard-Vertrag lokal gemockt und später ohne Umbau genutzt
werden kann.

Das Repository stellt bereit:

- einen dokumentierten lokalen Startbefehl,
- einen Fake-/Dev-Games-API-Adapter ohne Produktionsschlüssel,
- zwei Testspieler und einen reproduzierbaren Multiplayer-Smoke-Test,
- Fixtures für leeren, alten und aktuellen Fortschritt,
- einen Container-Smoke-Test für Health und Version.

Produktionscode darf bei nicht erreichbarer Games API keine Entwicklungsidentität
oder automatisch privilegierten Gastspieler erzeugen.

## 14. Pflicht-Tests

- Manifest: v1 bleibt als gespeicherter Legacy-Stand lesbar; Neuaufnahme und
  Sync lehnen v1 ab. Bei v2 werden fehlendes `media`, `coverPath`, `heroPath`
  oder `iconPath`, falsches Verzeichnis, SVG, Traversal und unbekannte Felder
  abgewiesen; alle drei echten Dateien werden aus demselben Commit gelesen.
- Browserlieferung: HTML, CSS, jedes transitive `.js`/`.mjs`, JSON und optional
  WASM antworten mit passendem MIME-Typ; ein fehlendes Modul liefert `404` statt
  HTML.
- API-Basis: eine vollständige `DASHBOARD_GAMES_API_URL` erzeugt exakt
  `<base>/service/...` und niemals einen doppelten
  `/api/modules/games/v1/api/modules/games/v1`-Pfad; Nicht-JSON gilt als Fehler.
- Launch-Code: gültig, abgelaufen, falsches Spiel und Replay.
- Plattformsession: `/api/platform`, Launch-Austausch, aktuelle Cookie-Session,
  One-shot-WS-Token, Token-Ablauf und Cookie-Attribute.
- Einladung: Fragment wird sofort bereinigt; falsche Lobby, falscher Token,
  Replay, paralleler Claim, Rotation, Ablauf und Lobbyende; Invite-Werte fehlen
  vollständig in URL-Logs und Dashboard-Handoff.
- Gast: bewusste Auswahl, servergebundener Name, gültiger Join und Reconnect;
  Lobby-Erstellung, Singleplayer, fremde Lobby, DEV, Fortschritt, Events und
  Statistik sind serverseitig verboten.
- Auth-Rückkehr: ohne Game-Session über Dashboard/Authentik und im bereits
  angemeldeten Dashboard-Fall; Rückkehr in dieselbe Lobby mit frischem
  `launch_code`; ungültiger oder abgelaufener `sessionStorage`-Handoff erteilt
  keinen Sitz; keine freie `returnTo`-URL und kein Open Redirect.
- Kein Service-Key im Browser-Bundle oder in Logs.
- WebSocket: gültige Session, Ablauf, Reconnect, Rate-/Größenlimit.
- Zwei Clients sehen denselben autoritativen Matchzustand.
- Fortschritt: Erststand, Update, `409`, Retry und Schema-Migration.
- Run-Finish: Gewinner und Verlierer erhalten getrennte `participants`-Einträge;
  Gast oder virtueller Gegner fehlt; fremde oder doppelte ID wird abgewiesen;
  Event-Retry zählt Belohnungen exakt einmal.
- Deployment: direkter Production-Deploy ohne Staging, optionaler gesunder
  Staging-Testlauf und idempotentes „Testlauf beenden“ ohne Production-Mutation.
- Neustart/`SIGTERM` beendet Verbindungen kontrolliert.
- Image startet als non-root mit read-only Dateisystem.
- `/healthz` und `/version.json` stimmen mit Manifest und Image überein.

### 14.1 Ausführbare Conformance-Reihenfolge

CI und Dashboard bewerten nicht eine README-Zusage, sondern diese beobachtbare
Reihenfolge:

1. Manifest gegen `game-manifest-v2.schema.json` validieren und die drei
   Medieninhalte am angegebenen Repository-Commit öffnen.
2. Lockfile-Installation, Lint/Typprüfung sowie Unit- und Integrationstests
   ohne Produktionssecrets ausführen.
3. Image bauen, als non-root mit read-only Root-Dateisystem starten und
   Health-/Versionsantwort gegen Manifest und Commit prüfen.
4. Browser-Smoke-Test inklusive transitiver Module und MIME-Typen ausführen.
5. Im Mock-/Testmodus Dashboard-Launch, Cookie-/WS-Session, Gastinvite,
   authentifizierten Invite-Handoff und kompetitives Finish vollständig prüfen.
6. Erst danach Image pushen, Registry-Digest bestimmen und das geschlossene
   `dashboard-game-result` mit `testsPassed: true` erzeugen.
7. Optional Staging deployen und anschließend den Testlauf beenden; oder den
   verifizierten Digest direkt nach Production deployen. In beiden Fällen den
   umgebungseigenen Healthcheck und Rollbackpfad prüfen.

Ein ausgelassener Schritt, eine nur manuell bestätigte UI oder ein erfolgreicher
HTTP-Status mit falschem Content-Type ist kein konformes Ergebnis.

## 15. Definition of Done

Ein Spiel ist bereit zur Dashboard-Anbindung, wenn:

- Manifest v2, fester Workflow, Dockerfile und README vollständig sind,
- Cover, Hero und Icon aus `public/dashboard/` auf dem Build-Commit vorliegen,
- das Image ohne Secrets gebaut und lokal im Sicherheitsprofil gestartet wurde,
- Launch und Session-Austausch ausschließlich serverseitig funktionieren,
- eingeladene Gäste sicher rundenbezogen ohne Statistiken spielen können und
  Dashboard-Spieler nach Anmeldung direkt in die Einladung zurückkehren,
- Multiplayer autoritativ und gegen offensichtliche Manipulation abgesichert ist,
- Fortschritt versioniert, migrierbar und idempotent gespeichert wird,
- kompetitive Ergebnisse pro Dashboard-Teilnehmer statt als gemeinsames
  Top-Level-Ergebnis gemeldet werden,
- Health, Version, Shutdown und Logs betrieblich brauchbar sind,
- alle Pflicht-Tests grün sind,
- jeder Pull Request die Version nach Abschnitt 0.1 anhebt und der Job `verify`
  als erforderlicher Status-Check geführt wird,
- keine spielspezifischen Dashboard- oder Hostzugriffe erforderlich sind.

Wenn eine Idee diesen Vertrag nicht abbilden kann, wird sie vor der Umsetzung als
explizite Plattformänderung dokumentiert. Es wird kein stiller Sonderweg gebaut.
