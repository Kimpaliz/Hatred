# @dashboard/games-sdk

Version `2.0.0` ist die dependency-light ESM-Basis fuer Dashboard-Spiel-Repositories mit Manifest v2. Das Paket haengt zur Laufzeit nur fuer den Repository-Verifier von `yaml` ab; Browser- und Service-Helfer haben keine Drittanbieter-Abhaengigkeiten.

## Installation und Exporte

```sh
npm install --save-dev @dashboard/games-sdk@2.0.0
```

```js
import {
  consumeFragmentCredentials,
  parsePlatformDescriptor,
  createDashboardResumeUrl,
  storeInviteHandoff,
  takeInviteHandoff
} from "@dashboard/games-sdk/browser";
import { createGamesServiceClient } from "@dashboard/games-sdk/service";
```

Alle Exporte sind echtes ESM. Verfuegbar sind `.`, `./browser`, `./service`, `./contract` und `./verify`.

## Browser: Launch und Einladung

Fragment-Credentials muessen vor Rendern, Logging oder Telemetrie genau einmal gelesen und sofort aus der sichtbaren URL entfernt werden:

```js
const { launchCode, inviteToken } = consumeFragmentCredentials({
  location: window.location,
  history: window.history
});
```

`consumeFragmentCredentials` entfernt sowohl `launch_code` als auch `invite` per `replaceState`, auch wenn die anschliessende Validierung fehlschlaegt. Andere Fragment-Parameter bleiben erhalten.

Der Authentik-Rueckweg darf niemals aus einem Invite, Query-Parameter oder frei gewaehlten `returnTo` gebaut werden. Die Basis kommt ausschliesslich vom Spielserver aus `GET /api/platform` und wird vor Verwendung geprueft:

```js
const platform = parsePlatformDescriptor(await fetch("/api/platform").then((r) => r.json()));

storeInviteHandoff({
  gameId: "roguelike-billard",
  code: "ABC234",
  inviteToken
});

window.location.assign(createDashboardResumeUrl(platform, {
  gameId: "roguelike-billard",
  code: "ABC234"
}));
```

Nach der Rueckkehr wird das tabgebundene `sessionStorage`-Handoff genau einmal entnommen:

```js
const handoff = takeInviteHandoff({ gameId: "roguelike-billard", code: "ABC234" });
```

Das Handoff ist standardmaessig zehn Minuten, maximal 15 Minuten gueltig. Es ist kein Ersatz fuer serverseitige Invite-Rotation, Rate Limits oder die Autorisierung von `POST /api/session/guest`. Gast-Sessions muessen serverseitig auf das eingeladene Spiel bzw. die Runde begrenzt bleiben und duerfen keine persistente Statistik schreiben.

## Service-Client

`baseUrl` ist immer die bereits vollstaendige, servergelieferte Games-v1-Basis. Das SDK haengt nie selbst einen API-Prefix an:

```js
const games = createGamesServiceClient({
  baseUrl: "https://dashboard.example/api/modules/games/v1",
  apiKey: process.env.DASHBOARD_GAMES_SERVICE_KEY,
  gameId: "roguelike-billard",
  gameVersion: "1.2.3"
});

const session = await games.exchangeLaunchCode(launchCode);
await games.heartbeat(session.sessionId);
await games.putProgress(session.playerId, {
  schemaVersion: 1,
  expectedVersion: 4,
  data: { unlockedTables: 3 },
  idempotencyKey: crypto.randomUUID()
});
await games.finish(session.sessionId, {
  eventId: crypto.randomUUID(),
  runId: session.runId,
  participants: [
    { playerId: session.playerId, result: "win", stats: { score: 12 }, rewards: {} }
  ]
});
```

Weitere Methoden: `getProgress`, `checkpoint` und `batchEvents`. Requests senden bzw. akzeptieren JSON strikt. Ein falscher Content-Type, ungueltiges JSON und strukturierte API-Fehler werden als `GamesServiceError` ausgegeben.

## Repository-Verifier

```json
{
  "scripts": {
    "dashboard:verify": "dashboard-games-verify ."
  }
}
```

```sh
npx dashboard-games-verify .
npx dashboard-games-verify . --json
```

Der Verifier prueft:

- `.dashboard/game.yml` nach dem Manifest-v2-Vertrag und ohne unbekannte Felder;
- die kanonischen Dateien `public/dashboard/cover.*`, `hero.*` und `icon.*` inklusive Dateiendung und Magic Bytes;
- `Dockerfile`, `README.md`, `package.json` und genau ein Lockfile;
- die Package-Scripts `test`, `build` und `dashboard:verify`;
- `.github/workflows/dashboard-game.yml` mit manuellem Lauf ohne Pflicht-Inputs, unveraendertem `github.sha`, den drei Scripts und dem Ergebnisartefakt `dashboard-game-result/dashboard-game-result.json`.

Exit-Code `0` bedeutet konform, `1` Konformitaetsfehler und `2` Aufruf- oder Laufzeitfehler.

## Sicherheitsgrenzen

- `launch_code` und `invite` sind Geheimnisse im Fragment: nicht persistieren, loggen oder in Query-Strings kopieren.
- Eine Resume-URL wird nur aus einer von `parsePlatformDescriptor` akzeptierten festen HTTPS-Dashboard-Basis erzeugt; dadurch wird ein offener Redirect vermieden.
- `sessionStorage` bindet das Invite-Handoff an den aktuellen Tab. Die serverseitige Einmalverwendung und Rotation des Invite-Tokens bleibt zwingend.
- Der Service-Key ist ausschliesslich fuer den Spielserver. Er darf nie in Browser-Code, Images, Logs oder Build-Artefakte gelangen.
- `participants` beim kompetitiven Finish ist die vollstaendige, serverseitig validierte Teilnehmerliste; Gast-Teilnehmer werden nicht als persistente Dashboard-Spieler verbucht.
