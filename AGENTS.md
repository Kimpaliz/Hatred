# Hatred — Einstieg für Agenten

Hatred ist ein rundenbasierter Koop-Dungeon-Crawler für den Browser.
Spielregeln, Dark-Fantasy-Pixelgrafik und deutsche Texte sind durch
[docs/SPIEL.md](docs/SPIEL.md) festgelegt. Janniks Auftrag bestimmt den Umfang;
keine zusätzlichen Mechaniken, Gestaltung oder Abhängigkeiten nebenbei einführen.

Jannik entscheidet fachlich. Ergebnisse verständlich erklären, Nutzerwünsche
wörtlich zitieren und ihm keine Aufgabe überlassen, die Programmierkenntnisse
voraussetzt.

## Vor dem Schreiben

1. `git status --short --branch`, `git worktree list` und
   [WORKCLAIM.md](WORKCLAIM.md) lesen. Fremde Änderungen bewahren.
2. [docs/REGELN.md](docs/REGELN.md) und die einschlägigen Einträge in
   [docs/FEHLERBUCH.md](docs/FEHLERBUCH.md) lesen. Den eigenen Auftrag gegen
   [docs/ROADMAP.md](docs/ROADMAP.md) abgrenzen; der Plan beauftragt keine Umsetzung.
3. Einen passenden Zweig anlegen und konkrete Dateien beanspruchen. Vor einer
   größeren Änderung `pnpm test` ausführen; einen roten Ausgang erklären.
4. [docs/WEGWEISER.md](docs/WEGWEISER.md) und die lokale `AGENTS.md` des
   betroffenen Bereichs lesen. Nur den benötigten Kontext laden.

## Zuständigkeiten

| Bereich | Verantwortung | Lokale Anleitung |
| --- | --- | --- |
| `spiel/` | Deterministische Regeln, Karte, KI und Inhalte | [spiel/AGENTS.md](spiel/AGENTS.md) |
| `runtime/` | Darstellung, Eingabe und Browserlebenszyklus | [runtime/AGENTS.md](runtime/AGENTS.md) |
| `netz/` | Sitzungen, direkte Verbindung und Vermittlung | [netz/AGENTS.md](netz/AGENTS.md) |
| `tests/` | Fachprüfungen und Browserersatz | [tests/AGENTS.md](tests/AGENTS.md) |
| `werkzeuge/` | Lokale Werkzeuge und Projektwächter | [werkzeuge/AGENTS.md](werkzeuge/AGENTS.md) |
| `docs/` | Spielvertrag, Begründungen und Arbeitsabläufe | [docs/AGENTEN.md](docs/AGENTEN.md) |

## Grenzen, die jede Änderung bewahren muss

- `spiel/` importiert weder Browser, Netz, Werkzeuge noch Tests. Zufall kommt
  aus dem gereichten Saatenstrom; gleiche Aktionen ergeben dieselbe Zustandssumme.
- Das Netz überträgt geordnete Aktionen. `netz/sitzung.mjs` bleibt vom
  Verbindungsadapter getrennt; Adapter dürfen Browser- oder Node-APIs verwenden.
- Browserimporte bleiben relativ, damit der Start unter `/Hatred/` funktioniert.
- Sprites bleiben Textdaten, Zoom ganzzahlig, Pixelkanten ungeglättet.
- Texte, Kommentare und Commit-Betreff deutsch mit ä, ö, ü und ß. Bestehende
  deutsche Bezeichner und Ordnernamen bewahren; keine pauschale Umbenennung.
- Keine Quelldatei über 1.000 Zeilen. Vor einer Erweiterung Verantwortung schneiden,
  statt eine zweite Sache an eine fast volle Datei anzuhängen.
- Keine Konten, Bezahlung, Fremdpakete, Ton oder Plattformintegration ohne
  entsprechenden Auftrag. Die tatsächliche Grenze steht in
  [docs/PROJEKTGRENZE.md](docs/PROJEKTGRENZE.md).

## Prüfen und übergeben

`pnpm test` ist die vollständige Abnahme. `pnpm check` führt nur Projektwächter
aus; `pnpm test:game` nur Fachprüfungen. Beide Teilwege ersetzen die Gesamtkette
bei der Übergabe nicht. Ohne pnpm: `node werkzeuge/pruefe-alles.mjs`.

Jede Änderung gehört mit Warum und Messung oben in [CHANGELOG.md](CHANGELOG.md).
Neue Prüfungen müssen ihren Fehlerfall nachweislich erkennen. Nach Modul- oder
Exportänderungen zusätzlich `pnpm build`; sichtbare Änderungen im Browser prüfen.
Ausgaben in `dist/` oder im temporären Systemverzeichnis ablegen.

Ein schreibender Besitzer pro Datei. Parallele Schreibaufträge erhalten eigene
Worktrees und einen begrenzten Auftrag nach [docs/AGENTEN.md](docs/AGENTEN.md).
Claude über das vorhandene `claude.cmd` nur mit benanntem Mehrwert einsetzen.

Merge, Push, Veröffentlichung und externe Nachrichten benötigen ausdrückliche
Autorisierung. Eine bereits erteilte Autorisierung gilt im vereinbarten Umfang
weiter. Beim Abschluss Dateien, Prüfungen und Einschränkungen nennen und den
eigenen Workclaim freigeben.
