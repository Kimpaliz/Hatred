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
