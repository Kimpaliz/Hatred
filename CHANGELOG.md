# Änderungsverlauf

Die hier geführte Version ist die Version aus `package.json` und
`.dashboard/game.yml`. Beide müssen identisch sein.

**Jeder Pull Request hebt diese Version an** und ergänzt hier einen Abschnitt.
`npm run check:version` und der Workflow-Schritt „Verify version bump“ setzen
das durch. Die Regel gilt für dieses Template und für jedes daraus erzeugte
Spiel; Details stehen in Abschnitt 0.1 von
[GAME_PROJECT_CONTEXT.md](./GAME_PROJECT_CONTEXT.md).

Ein aus dem Template erzeugtes Spiel beginnt seinen eigenen Verlauf: Diese Datei
wird auf die Startversion des Spiels zurückgesetzt, die Regel darüber bleibt.

## 2.2.0 — 23. August 2026

### Neu

- `AGENTS.md` als verbindliche Bauregel im Template. Sie legt den Rahmen fest
  (private Spiele, gespielt mit direkt eingeladenen Freunden), die harten
  Sicherheitsregeln, den Ablauf je Pull Request und die vollständige
  Freigabeliste für den ersten Web-Deploy: eigene Identität, eigenes Artwork in
  Cover-, Hero- und Icon-Budget, Menüstruktur, sichtbare Version, Manifest- und
  Runtimevertrag, Betrieb.
- `scripts/check-release-readiness.mjs` und `npm run check:release` prüfen den
  maschinell prüfbaren Teil dieser Liste und melden je Punkt `OK` oder `FEHLT`
  mit der konkreten Datei. Der Lauf ist bewusst kein CI-Gate: Während der
  Entwicklung darf ein Spiel im Vorlagenzustand grün bleiben, vor dem ersten
  Deploy muss die Liste ohne `FEHLT` durchgehen.
- `AGENTS.md` und der Freigabe-Check gehören zur Liefercheckliste in
  `scripts/verify-repository.mjs` und bleiben damit in jedem erzeugten Spiel
  erhalten.

### Klargestellt

- Ausdrücklich nicht gefordert und nicht als offene Aufgabe zu melden: Alpha-,
  Beta-, Early-Access- oder Playtest-Phasen, Testerlisten und Feature-Freeze-
  Fenster sowie Lizenzdateien, Copyright-Header, EULA, AGB,
  Datenschutzerklärung, Impressum, Altersfreigaben und Storematerial. Der
  Staging-Testlauf bleibt optional; der Normalfall ist der direkte
  Production-Deploy des verifizierten Digests.

### Behoben

- `package-lock.json` trug noch die Version `2.0.0` und lief damit gegen
  `package.json` auseinander. Die Version wird jetzt mit angehoben.
- `.env.example` meldete `GAME_VERSION=2.0.0` und passte nicht mehr zum
  Manifest.

## 2.1.0 — 12. August 2026

### Prozess

- Neue Regel: Jeder Pull Request hebt die Version in `package.json` und
  `.dashboard/game.yml` gemeinsam an und ergänzt einen Abschnitt in dieser
  Datei. `scripts/check-version-bump.mjs` vergleicht dazu gegen den Zielbranch
  und läuft als Schritt „Verify version bump“ im Job `verify`.
- Neue `.github/pull_request_template.md` mit der Freigabeliste.
- `scripts/verify-repository.mjs` prüft nicht mehr auf eine feste
  Templatenummer, sondern darauf, dass `package.json` und `.dashboard/game.yml`
  dieselbe SemVer-Version tragen. Das SDK bleibt exakt auf `2.0.0` gepinnt.

### Behoben

- Der Release-Workflow baute das Image zweimal: einmal für den Smoke-Test und
  danach ein zweites Mal für die Veröffentlichung. Der zweite Build löste die
  Basis-Images erneut über docker.io auf und konnte an einer vorübergehenden
  Registry-Störung scheitern, obwohl der Smoke-Test bereits bestanden war.
  Jetzt wird genau einmal gebaut; veröffentlicht wird exakt das geprüfte Image.
  Build und Push wiederholen sich bis zu dreimal.
- Smoke-Test und `dashboard-game-result.json` lasen die Version nicht mehr aus
  einer fest eingetragenen `2.0.0`, sondern aus `package.json`. Vorher meldete
  jedes aus dem Template erzeugte Spiel die Templateversion statt seiner
  eigenen, sobald es diese Stellen nicht von Hand nachzog.

## 2.0.0

Ausgangsstand dieses Verlaufs: Golden-Path-Vorlage mit Manifest v2,
`games-v1`, lokalem SDK `2.0.0`, festem Workflow, Container-Smoke-Test und
geschlossenem Build-Result-Vertrag `schemaVersion: 1`.
