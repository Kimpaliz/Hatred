# Fachprüfungen

Es gilt [AGENTS.md](../AGENTS.md). Hier liegen Verhaltenstests und Prüfhilfen.
Die Projektwächter bleiben in `werkzeuge/`.

- Eine ausführbare Prüfung heißt `pruefe-<thema>.mjs`; der Runner findet sie
  auch in Unterordnern. Jede läuft in einem eigenen Node-Prozess.
- `helfer.mjs` liefert Behauptungen, Zähler und `ende()`. `buehne-*.mjs`
  stellt Browser, Eingabe oder Oberflächen bereit und wird nicht selbst gestartet.
- Neue Regressionen am tatsächlichen Fehlerfall prüfen. Keine Schwelle senken
  oder Implementierungsdetails bloß abschreiben, um grün zu erhalten.
- Temporäre Projekte im Systemverzeichnis erzeugen und in `finally` entfernen.
  Keine Testfixture als `pruefe-*.mjs` hier ablegen, wenn der Runner sie nicht
  eigenständig ausführen soll.
- Echte Module verwenden; nur Browser/Leitung ersetzen. Bei neuen Modulpfaden
  prüfen, ob der Fachtest und der Einzeldateiexport die Form unterstützen.
- Tests bleiben ohne zusätzliche Pakete oder Zugangsdaten ausführbar.

`pnpm test:game` startet diesen Bereich, `pnpm test:list` listet alle Pfade.
`pnpm test` enthält zusätzlich die verbindlichen Projektwächter.
Die Zuordnung steht in [docs/ENTWICKLUNG.md](../docs/ENTWICKLUNG.md).
