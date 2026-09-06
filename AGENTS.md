# AGENTS.md — Bauregeln für dieses Dashboard-Spiel

Verbindlich für jeden Agenten und jeden Menschen, der in diesem Repository
arbeitet. Die Datei gilt für dieses Template und unverändert für jedes daraus
erzeugte Spiel. Sie muss nicht angefordert werden: Sie ist die Anweisung, die
ohne Nachfrage befolgt wird.

## 0. In dreißig Sekunden

- `GAME_PROJECT_CONTEXT.md` ist der Vertrag, diese Datei ist die
  Arbeitsanweisung. Vertrag lesen, bevor Plattformcode angefasst wird.
- Jeder Pull Request hebt die Version an: `package.json`, `.dashboard/game.yml`
  und ein Abschnitt in `CHANGELOG.md`.
- Vor jedem Push: `npm run check:version` und `npm run verify`.
- Vor dem ersten Web-Deploy: `npm run check:release` muss grün sein
  (Abschnitt 5). Ohne diese Liste wird nicht deployt.
- Die Sicherheitsgrenzen aus Abschnitt 3 werden nie „vorübergehend“ gelockert.
- Was in Abschnitt 1 als nicht gefordert steht, wird nicht gebaut, nicht
  eingefordert und nicht als offene Aufgabe gemeldet.

## 1. Projektrahmen: privat, im Freundeskreis

Diese Spiele sind private Freizeitprojekte. Sie laufen im eigenen Dashboard und
werden ausschließlich mit direkt eingeladenen Freunden gespielt. Es gibt keine
Öffentlichkeit, keinen Store, keine Kundschaft.

**Ausdrücklich nicht gefordert.** Nicht anlegen, nicht einplanen, nicht als
Lücke melden, nicht als Vorbedingung für einen Deploy behandeln:

- Alpha-, Beta-, Early-Access- oder Playtest-Phasen, Testerlisten, Wartelisten,
  Feedbackrunden, Feature-Freeze-Fenster, Release-Trains, Roadmaps.
- Lizenzdateien, Copyright-Header, EULA, AGB, Datenschutzerklärung, Impressum,
  Altersfreigaben, Marketing- oder Storematerial, Analytics, Consent-Banner.
- Support-Zusagen, SLAs, Kompatibilitätsversprechen gegenüber Fremdnutzern,
  Beitrags- oder Verhaltensrichtlinien.
- Zertifizierte Barrierefreiheit oder Lokalisierung. Gute Standardwerte gerne,
  Nachweispflicht nein.
- Ein Staging-Testlauf (Kontext 12.3) ist optional. Der Normalfall ist der
  direkte Production-Deploy des verifizierten Digests.

**Trotzdem hart**, weil echte Konten, echte Freunde und ein echter Host
betroffen sind: alles in Abschnitt 3 und die Freigabeliste in Abschnitt 5.
Privat heißt sorgfältig, nicht beliebig.

## 2. Bevor du etwas änderst

1. `GAME_PROJECT_CONTEXT.md` mindestens in den Abschnitten 0, 2, 3.1, 5, 7, 12,
   14 und 15 gelesen.
2. `npm ci` einmal ausgeführt, `npm test` grün gesehen. Ein roter Ausgangsstand
   wird zuerst gemeldet, nicht überbaut.
3. Geklärt, ob die Aufgabe Spiellogik ist (frei gestaltbar) oder
   Plattformkante berührt (Manifest, Session, WebSocket, Workflow, Dockerfile,
   Endpunkte, SDK). Plattformkanten werden nur bewusst und dokumentiert
   geändert.
4. Bestehende Struktur weiterverwendet: `src/server/` autoritativ,
   `src/client/` Darstellung, `test/` Nachweise, `public/dashboard/` Medien.

## 3. Harte Regeln

Nicht verhandelbar, auch nicht „nur lokal“ oder „nur zum Debuggen“:

- Der Server ist autoritativ für Lobby, Match, Run, Zufall, Schaden,
  Belohnungen und Ergebnisse. Der Browser bestätigt sich niemals selbst
  Punkte, Inventar oder Fortschritt.
- Kein Secret in Clientbundle, Repository, Manifest, Image, URL oder Log. Der
  Service-Key existiert ausschließlich als Runtime-Variable.
- Launch-Code, Invite und WebSocket-Token bleiben serverseitig, einmalig und
  kurzlebig. Cookies bleiben `Secure; HttpOnly; SameSite=Strict`.
- Keine frei steuerbare Rücksprung-URL, kein Open Redirect, keine direkte
  Authentik-Integration im Spiel.
- Dauerhafter Fortschritt läuft nur über die Games API, idempotent und
  versioniert. Kein lokaler Ersatzspeicher als „Zwischenlösung“.
- Das Image bleibt reproduzierbar, non-root, read-only-tauglich, mit eigenem
  `HEALTHCHECK`. Kein Zugriff auf Docker-Socket, Hostpfade oder
  Dashboard-Datenbank.
- Unbekannte Pfade liefern JSON-`404`, niemals die HTML-Shell. Module behalten
  ihren JavaScript-MIME-Typ.
- Das SDK bleibt exakt auf den eingecheckten Workspace gepinnt. Eine Erhöhung
  ist ein eigener Pull Request mit vollständigem grünem Lauf.
- Tests werden nicht übersprungen, deaktiviert oder aufgeweicht, um grün zu
  werden. Ein roter Test beschreibt ein Problem.

## 4. Arbeitsweise je Pull Request

- Ein Pull Request löst eine Sache. Kein Sammelumbau nebenbei, keine
  Formatierungswellen über fremde Dateien.
- Version anheben: `package.json` und `.dashboard/game.yml` tragen exakt
  dieselbe SemVer-Version, größer als der Zielbranch. Major nur bei Manifest,
  Fähigkeiten, gespeicherten Daten oder Games-API-Kompatibilität.
- `CHANGELOG.md` bekommt einen Abschnitt mit genau dieser Version, in Sätzen,
  die ein Mitspieler versteht.
- Neues Verhalten bekommt einen Test. Ein gefixter Fehler bekommt den Test, der
  ihn vorher gezeigt hätte.
- Lokal vor dem Push, in dieser Reihenfolge:

  ```text
  npm run check:version
  npm run verify
  ```

- `.github/pull_request_template.md` wird ausgefüllt, nicht gelöscht.
- Der Job `verify` ist im Standardbranch als erforderlicher Status-Check
  eingetragen. Fehlt er, wird er eingetragen, bevor weiter gebaut wird.

## 5. Freigabe für den ersten Web-Deploy

Der erste Deploy ist der Moment, in dem Freunde das Spiel im Hub sehen. Bis
dahin gilt jede der folgenden Zeilen als erfüllt oder das Spiel wird nicht
angebunden. `npm run check:release` prüft die maschinell prüfbaren Punkte und
gibt eine Liste mit `OK` und `FEHLT` aus.

### 5.1 Identität

- `.dashboard/game.yml`: eigene `id` (klein, bindestrichfähig, stabil), eigener
  `name`, eigene `summary` und `description`. Keine Vorlagentexte mehr.
- `package.json` trägt einen eigenen Paketnamen.
- `README.md` beschreibt dieses Spiel: Start, Tests, Architektur,
  Fortschrittsschema, genutzte Plattformfunktionen.
- Keine `TODO(gameplay)`-Marker mehr im Quellcode.

### 5.2 Medien

- `public/dashboard/cover.png`, `hero.png` und `icon.png` sind eigenes Artwork,
  nicht mehr die Platzhalter der Vorlage.
- Format und Pfad bleiben wie im Manifest, alle drei liegen auf demselben
  Commit wie der Build.
- Größenbudget: Cover ≤ 300 KB, Hero ≤ 400 KB, Icon ≤ 80 KB. Vollverlustfreie
  PNGs sprengen das; Anzeigegröße plus Kompression halten es mühelos ein.
- Mindestmaße: Cover ab 960×540 im Querformat, Hero ab 1280×720 im Querformat,
  Icon quadratisch ab 128×128. Das Cover ist die Kachel im Hub — es muss auch
  klein und neben anderen Spielen erkennbar sein.

### 5.3 Menü und Bedienung

Ein Spiel, das nur eine nackte Spielfläche zeigt, ist nicht deploybar. Der
Client hat eine sichtbare Menüstruktur mit einem Wurzelelement
`data-menu="main"` (oder einem `<nav>`-Element) und mindestens:

- Start beziehungsweise Lobby erstellen,
- Mitspieler einladen,
- Kurzanleitung mit Ziel und Steuerung,
- Einstellungen für Anzeigename und Ton,
- sichtbarer Weg zurück in den Spiele-Hub.

Dazu gehört: Jeder Zustand ist verlassbar (kein Sackgassen-Screen), Verbindungs-
und Fehlerzustände stehen als Text im UI, und ein Reconnect führt zurück in die
laufende Runde statt in einen leeren Bildschirm.

### 5.4 Version und Verlauf

- Der erste Web-Deploy trägt mindestens `1.0.0`.
- `package.json` und `.dashboard/game.yml` tragen dieselbe Version, und
  `CHANGELOG.md` hat einen Abschnitt dazu.
- Die Version ist im Client sichtbar: ein Element mit `data-app-version` (oder
  `id="app-version"`), gefüllt aus `/version.json`. Bei einer Rückfrage im
  Freundeskreis muss ohne Nachfrage klar sein, welcher Stand läuft.

### 5.5 Verträge

- `GET /healthz` und `GET /version.json` antworten als JSON ohne Cache und
  passen zu Manifest und Build-Commit.
- `GET /api/platform`, `POST /api/session`, `GET /api/session/current`,
  `POST /api/session/ws-token`, `POST /api/session/guest` und `WS /ws`
  verhalten sich wie in Kontext-Abschnitt 5 und 7 beschrieben.
- `.dashboard/game.yml` validiert gegen `contracts/game-manifest-v2.schema.json`
  und die gemeldeten `capabilities` stimmen mit dem überein, was das Spiel
  wirklich kann. Kein `persistentProgress: true` ohne echten Fortschrittspfad.
- `.github/workflows/dashboard-game.yml` liegt unverändert an seinem Pfad und
  ist ohne Pflicht-Inputs startbar.
- Der Lauf erzeugt das Artefakt `dashboard-game-result` mit
  `dashboard-game-result.json` und `testsPassed: true`. Ein manuell gebautes
  Image oder ein grüner Testlauf allein ist kein Deploy.

### 5.6 Betrieb

- Der Container startet non-root mit read-only Root-Dateisystem und beendet sich
  auf `SIGTERM` sauber.
- Logs enthalten keine Tokens, Invites, Cookies oder Service-Keys.
- Zwei Browser sehen denselben autoritativen Matchzustand; Gäste spielen
  rundenbezogen ohne Fortschritt und Statistik.
- Ressourcenwerte im Manifest passen zum realen Bedarf.

### 5.7 Der Freigabelauf

```text
npm run check:release
npm run verify
```

`check:release` ist bewusst kein CI-Gate: Während der Entwicklung ist ein
Vorlagenzustand normal. Vor dem ersten Deploy und vor jedem Deploy, der
Branding, Menü oder Manifest verändert, muss der Lauf ohne `FEHLT` durchgehen.
Was der Lauf nicht prüfen kann — Menüführung, Anleitung, Reconnect, Optik —
wird einmal von Hand durchgespielt, mit zwei Browsern und einem eingeladenen
Gast.

## 6. Nach dem ersten Deploy

- Jede weitere Änderung geht denselben Weg: Version anheben, Pull Request,
  grüner `verify`-Job, Dashboard-Build, neuer unveränderlicher Digest.
- Rollback bedeutet: einen bereits verifizierten alten Digest erneut
  deployen. Kein Hotfix am laufenden Container.
- Ändern sich Branding, Menü oder Manifest, gilt Abschnitt 5 erneut.
- Ein Template-Upgrade wird selektiv übernommen: Workflow, SDK,
  Sicherheitsadapter und Tests vergleichen, Spiellogik und Branding bewahren.

## 7. Wenn etwas nicht passt

Wenn eine Spielidee den Vertrag nicht abbilden kann, wird das vor der Umsetzung
als ausdrückliche Plattformänderung beschrieben und entschieden. Es wird kein
stiller Sonderweg gebaut, keine Sicherheitsgrenze umgangen und keine Prüfung
entschärft, damit eine Funktion passt.

Unklarheiten werden gefragt, wenn die Antwort das Ergebnis ändert. Sonst gilt
die dokumentierte Annahme, festgehalten im Pull Request.
