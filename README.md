# Dashboard Golden Path Game 2.1.0

Diese private GitHub-Vorlage ist die kanonische Quelle für neue Spiele auf
Dashboard Games v1 und Manifest v2. Sie enthält das fest gepinnte SDK unter
`packages/dashboard-games-sdk`, `GAME_PROJECT_CONTEXT.md`, das JSON-Schema und
gültige Platzhalterbilder unter `public/dashboard/`.

## Neuer Spielstand in fünf Schritten

1. In GitHub **Use this template** wählen und daraus ein neues privates
   Repository in der vorgesehenen Organisation erzeugen.
2. ID, Name, Texte und Version in `.dashboard/game.yml`, `package.json`,
   `src/client/app.mjs` und den Smoke-Test-Variablen konsistent anpassen.
   `CHANGELOG.md` auf die eigene Startversion zurücksetzen; die Versionsregel
   für Pull Requests darin bleibt bestehen.
3. Die drei generierten Bilder durch eigenes Branding ersetzen. Namen und
   Manifestpfade bleiben `public/dashboard/cover.png`, `hero.png` und
   `icon.png`, sofern nicht alle Verweise gemeinsam geändert werden.
4. `npm ci`, `npm test`, `npm run build` und `npm run dashboard:verify`
   ausführen. Danach die eigentliche autoritative Spiellogik ergänzen.
5. Commit pushen, den Job `verify` in den Branch-Schutzregeln des
   Standardbranches als erforderlichen Status-Check eintragen, das neue
   Repository im Dashboard anbinden und den festen Workflow
   `.github/workflows/dashboard-game.yml` durch das Dashboard starten lassen.

Die manuelle Neuanlage eines Repositories ohne diese Vorlage ist nur für
Migrationen oder bewusst abweichende Tech-Stacks vorgesehen. Auch dann bleibt
der vollständige Vertrag in `GAME_PROJECT_CONTEXT.md` verbindlich.

## Lokal starten

Node.js 20 oder neuer ist erforderlich. Kopiere `.env.example` nach `.env`,
setze ausschließlich lokale Testwerte und lade sie mit deinem bevorzugten
Werkzeug in die Prozessumgebung. Die Anwendung liest `.env` nicht selbst und
verhindert so versehentliches Einbacken in das Image.

```text
npm ci
npm test
npm run build
npm run dashboard:verify
npm start
```

Die Laufzeit benötigt `PORT`, `DASHBOARD_GAMES_API_URL` als vollständige
Games-v1-Basis, `DASHBOARD_GAME_ID`, `DASHBOARD_GAME_API_KEY`, `GAME_VERSION`,
`COMMIT_SHA` und `PUBLIC_BASE_URL`. Der Service-Key ist ein Runtime-Secret und
darf weder im Repository noch in Actions-Variablen, Browsercode, Image oder
Logs stehen.

## Enthaltener Plattformvertrag

- `GET /healthz` und `GET /version.json` liefern JSON ohne Cache.
- `GET /api/platform` enthält nur öffentliche Fähigkeiten und die aus der
  Dashboard-API-Origin abgeleitete feste Hub-URL.
- `POST /api/session` tauscht einen Fragment-Launch-Code serverseitig über das
  lokale `@dashboard/games-sdk` aus und setzt ein
  `Secure; HttpOnly; SameSite=Strict`-Cookie.
- `GET /api/session/current` und `POST /api/session/ws-token` geben neue,
  höchstens 60 Sekunden gültige One-shot-WebSocket-Tokens aus.
- `POST /api/session/guest` verbraucht eine hochentropische Einladung atomar
  und erzeugt eine lobbygebundene Session ohne Dashboard-ID, Fortschritt,
  Rewards oder Statistikrecht.
- `WS /ws` nimmt das One-shot-Token nur als zweites WebSocket-Subprotokoll an;
  Cookie, Launch-, Invite- und Service-Token sind kein Ersatz.
- Browsermodule besitzen JavaScript-MIME. Unbekannte Dateien liefern eine
  echte JSON-`404` und niemals die HTML-Shell.

Die kleine In-Memory-Lobby zeigt den vollständigen sicheren Einladungsweg. Sie
passt zum vorgesehenen einzelnen Fullstack-Container. Bei einer späteren
Mehrinstanz-Architektur muss die atomare Sitzvergabe in einen explizit
freigegebenen gemeinsamen Store verlegt werden.

Der Browser entfernt `launch_code` und `invite` sofort aus dem Fragment. Für
die Dashboard-Anmeldung hält er das Invite kurz im tabgebundenen
`sessionStorage`, überträgt nur Game-ID und nicht geheimen Lobbycode zum festen
Spiele-Hub und verbraucht das Invite nach dem Rücksprung. Es gibt keine vom
Einladungslink steuerbare Ziel-URL und keine direkte Authentik-Integration im
Spiel.

## Was angepasst werden soll

- `TODO(gameplay)`: autoritative Spielzustände, Frames, Sieg/Niederlage und
  gegebenenfalls Fortschritts-/Eventmeldungen über das SDK.
- Branding: Name, Texte und die drei Manifestmedien.

Alle anderen Sicherheits- und Veröffentlichungsgrenzen sind bereits fest
umgesetzt. Deaktiviere nicht die Origin-Prüfung, den geschlossenen JSON-Vertrag,
One-shot-Tokens, non-root Docker-Runtime oder die exakte Commitprüfung.

## Workflow und Ergebnisartefakt

Pull Requests führen Installation, Tests, Build und SDK-Konformitätsprüfung
aus. Ein Dashboard-Dispatch baut exakt `${{ github.sha }}`, prüft den Container,
publiziert das kleingeschriebene GHCR-Image und verwendet den vom Push-Schritt
gelieferten Digest. Das Image wird dabei genau einmal gebaut: Veröffentlicht
wird exakt der Container, der den Smoke-Test bestanden hat. Build und Push
wiederholen sich bei vorübergehenden Registry-Fehlern bis zu dreimal.
Danach entsteht genau ein Actions-Artefakt
`dashboard-game-result` mit einer obersten Datei
`dashboard-game-result.json` nach dem geschlossenen Schema v1. Es gibt keine
Pflicht-Inputs und keinen langfristigen Registry-Schlüssel.

## Versionsregel für Pull Requests

**Jeder Pull Request hebt die Version an.** `package.json` und
`.dashboard/game.yml` tragen dieselbe SemVer-Version, diese muss größer sein als
die des Zielbranches, und `CHANGELOG.md` bekommt einen Abschnitt dazu. Grund:
Das Build-Ergebnis meldet Version und Image-Digest gemeinsam an das Dashboard —
ohne Anhebung tragen zwei verschiedene unveränderliche Images dieselbe Version.

Lokal prüfen:

```text
npm run check:version
```

Standardbasis ist `origin/main`; ein anderer Zielbranch wird als Argument oder
über `VERSION_BASE_REF` übergeben. In der CI läuft dieselbe Prüfung als Schritt
„Verify version bump“ im Job `verify`. Damit die Regel das Zusammenführen
wirklich blockiert, muss `verify` in den Branch-Schutzregeln des
Standardbranches als erforderlicher Status-Check eingetragen sein — das gilt für
dieses Template und für jedes daraus erzeugte Spiel.

## Versionen und Upgrades

Template, SDK, Manifest und Games API sind getrennte Verträge:

| Baustein | Dieser Stand | Upgrade-Regel |
| --- | --- | --- |
| Starter-Template | 2.1.0 | Für neue Repositories vollständig verwenden; bestehende Spiele nicht blind überschreiben. |
| lokales SDK | 2.0.0 | Exakt als Workspace pinnen; Upgrade als eigener PR mit allen Tests. |
| Manifest | schemaVersion 2 | Nur bei einem neuen Schema ändern; Medien und Runtimevertrag gemeinsam validieren. |
| Dashboard Games API | games-v1 | Erst nach angekündigter Kompatibilitätsänderung wechseln. |
| Build-Ergebnis | schemaVersion 1 | Nicht eigenmächtig erweitern; der Dashboard-Parser validiert geschlossen. |

Ein Template-Upgrade wird in ein bestehendes Spiel selektiv übernommen:
Workflow, SDK, Sicherheitsadapter und Tests vergleichen, Spiellogik und Branding
bewahren, Versionen bewusst erhöhen und einen neuen unveränderlichen Digest
bauen. Rollback bleibt auf alte bereits verifizierte Digests möglich.
