# Entwickeln und prüfen

Hatred läuft als Browserprojekt aus ES-Modulen. Node ab Version 22 führt
Werkzeuge und Prüfungen aus. `package.json` markiert auch `.js` ausdrücklich
als ES-Module und hält Hatred unabhängig von einer Paketdatei im Elternordner.

Es gibt keine Paketabhängigkeiten und keinen notwendigen Installationsschritt.
pnpm bietet kurze Befehle; dieselben Skripte funktionieren direkt mit Node.

## Befehle

| Zweck | Mit pnpm | Direkt mit Node |
| --- | --- | --- |
| Spielen | `pnpm dev` | `node werkzeuge/vorschau.mjs` |
| Vollständige Abnahme | `pnpm test` | `node werkzeuge/pruefe-alles.mjs` |
| Fachprüfungen | `pnpm test:game` | `node werkzeuge/pruefe-alles.mjs --tests` |
| Projektwächter | `pnpm check` | `node werkzeuge/pruefe-alles.mjs --checks` |
| Alle Prüfdateien anzeigen | `pnpm test:list` | `node werkzeuge/pruefe-alles.mjs --list` |
| Einzeldatei exportieren | `pnpm build` | `node werkzeuge/eine-datei.mjs --nach dist/hatred.html` |
| Karte einer Saat ansehen | `pnpm map 7` | `node werkzeuge/karte-zeigen.mjs 7` |

Die Vorschau ist unter <http://127.0.0.1:8145/> erreichbar. Unter Windows startet
auch `Vorschau-starten.cmd` denselben Server. Ein anderer Port wird mit der
Umgebungsvariablen `HAFEN` gewählt.

`pnpm build` legt `dist/hatred.html` als HTML-Export an. Das ist keine
Veröffentlichung und ersetzt nicht den normalen Einstieg über `index.html`
mit seinen Modulen. Der Direktaufruf des Exportwerkzeugs ohne `--nach` behält
seinen bisherigen Zielpfad neben dem Repository.

## Welche Prüfung gehört zu welchem System?

Alle folgenden Fachprüfungen liegen unter `tests/`; die Tabelle nennt Themen,
keine zweite vollständige Liste. Maßgeblich ist die automatische Entdeckung
mit `pnpm test:list`.

| Änderung | Besonders relevante Prüfungen |
| --- | --- |
| Raster, Höhen, Wege, Sicht | `pruefe-sechseck`, `pruefe-hoehen`, `pruefe-wegfindung`, `pruefe-sicht` |
| Landschaft | `pruefe-landschaft`, `pruefe-abgrund`, `pruefe-becken` |
| Kampf, Aktionen, KI | `pruefe-kampf`, `pruefe-zug`, `pruefe-ki`, `pruefe-lauf` |
| Inhalte | `pruefe-katalog`, `pruefe-sprites`, `pruefe-protokoll` |
| Bild und Gelände | `pruefe-zeichnen`, `pruefe-gelaende-bild`, `pruefe-koernung`, `pruefe-bild` |
| Kamera und Ansichtsleiste | `pruefe-kamera-zoom`, `pruefe-ansicht`, `pruefe-schrift` |
| Granit und Projektion | `pruefe-granit-feld`, `pruefe-granit-generator`, `pruefe-granit-material`, `pruefe-raster-projektion` |
| Lichtpuffer und Zugang | `pruefe-licht-puffer`, `pruefe-torwaechter` |
| UI und Eingabe | `pruefe-oberflaeche`, `pruefe-felder`, `pruefe-eingabe`, `pruefe-tippen` |
| Lobby und Browserstart | `pruefe-vorlauf`, `pruefe-einstieg`, `pruefe-app` |
| Koop und Vermittlung | `pruefe-netz`, `pruefe-leitung` |
| Werkzeuge | `pruefe-einzeldatei`, `pruefe-vorschau`, `pruefe-karte-zeigen`, `pruefe-pruefkette` |

Einzelprüfung beispielsweise: `node tests/pruefe-kamera-zoom.mjs`.
Ein roter Rückgabewert muss untersucht werden; keine Schwelle zum Beruhigen
der Kette senken. Fehlerfälle für neue Wächter zuerst nachweisen.

## Prüfkette und Dateipfade

`werkzeuge/pruefe-alles.mjs` entdeckt `pruefe-*.mjs` in `tests/` und
`werkzeuge/` rekursiv. Helfer werden nicht gestartet. Jede Prüfung bekommt
einen eigenen Prozess, die Projektwurzel als Arbeitsordner und höchstens
120 Sekunden. Auch nach einem Fehler laufen weitere Prüfungen; die ganze
Kette endet dann mit Rückgabewert 1. Die Arbeitsweiseprüfung läuft zuletzt.
Ein leerer ausgewählter Bereich ist ein Fehler, kein grünes Ergebnis.

Die Fachprüfungen bleiben direkt unter `tests/`, damit ihre relativen Wege
zum Spiel kurz bleiben. Bei einer späteren Unterteilung deren Importpfade
und `import.meta.url`-Auflösungen anpassen. Historische Changelog-Befehle und
Quellkopfnotizen können noch `werkzeuge/pruefe-<thema>.mjs` nennen: Für die
umgezogenen Fachtests gilt nun `tests/pruefe-<thema>.mjs`; Wächter bleiben
unter `werkzeuge/`. Kein zweiter Satz ausführbarer Testkopien wird gepflegt.

## Ausgaben und Arbeitsumgebung

`dist/`, `build/`, `test-results/`, `coverage/` und Protokolle werden nicht
versioniert. Reproduzierbare Tests erzeugen ihre Wegwerfdateien außerhalb
des Projekts. EditorConfig vereinheitlicht UTF-8 und Einrückung ohne eine
Massenumformatierung vorhandener Dateien. Git speichert Textdateien mit LF;
Windows-Starter werden mit CRLF ausgecheckt. Eine leere pnpm-Lockdatei hält
auch den Stand ohne Abhängigkeiten fest.

In PowerShell den echten Rückgabewert unmittelbar nach Node erfassen:

```powershell
node werkzeuge/pruefe-alles.mjs
$pruefExit = $LASTEXITCODE
exit $pruefExit
```

Die CI verwendet denselben direkten Node-Aufruf auf Node 22, sowohl für
Pull Requests nach `main` als auch für Änderungen auf `main`. Sie prüft nur.
Der Veröffentlichungsweg wird separat und nur mit Autorisierung bedient.
