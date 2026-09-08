# Werkzeuge und Projektwächter

Es gilt [AGENTS.md](../AGENTS.md). Dieser Ordner ist Entwicklungsinfrastruktur;
Browser- und Regelmodule dürfen ihn nicht importieren.

- `vorschau.mjs`: lokaler HTTP-Server. `eine-datei.mjs`: vorhandener HTML-Export.
- `karte-zeigen.mjs` und `werkstatt-auftrag.mjs`: Kartenansicht und Sprite-Aufträge.
- `helfer.mjs`: gemeinsame Projektwurzel, Konfiguration, Dateiliste und Melder.
  Die zustandsbehafteten Fachbehauptungen liegen in `tests/helfer.mjs`.
- `pruefe-alles.mjs`: beide Prüfbereiche entdecken, pro Datei ein Prozess,
  echte Fehlercodes weitergeben. `pruefe-arbeitsweise.mjs` läuft zuletzt.
- Andere `pruefe-*.mjs`: Regeln und Projektzustand prüfen. Neue Quellordner
  sowohl in `alpha-code.json` als auch in der Kopfnotizprüfung erfassen.
- `vorgaenge.mjs` und `github-zugang.mjs` können externe Aktionen ausführen.
  Die normale Kette bleibt offline; keine Online-Option oder Schreibaktion
  allein zur Aufräumarbeit verwenden. Geheimnisse nie ausgeben.

`pnpm check` führt die Wächter aus. Nach Werkzeugänderungen auch ihre
Fachprüfungen in `tests/` und abschließend `pnpm test` ausführen.
Exportdateien und Messprotokolle gehören nicht zwischen die Quellen.
