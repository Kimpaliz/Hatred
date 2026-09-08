# Sitzung und Verbindung

Es gilt [AGENTS.md](../AGENTS.md). Nicht alle Dateien hier sind browserfrei:

- `sitzung.mjs` ordnet Aktionen, prüft Berechtigung und Zustandssummen. Sie
  erhält Sendefunktionen und bleibt unabhängig von der konkreten Leitung.
- `verbindung.mjs` baut die Browser-Verbindung auf. `lobbycode.mjs` und
  `nachrichten.mjs` definieren Einladung und Nachrichtenformat.
- `vermittler.mjs` organisiert die Vermittlung; `broker.mjs` ist das optionale
  Node-Programm dafür. Der Broker wird nicht in den Browser importiert.

Keine Protokoll-, Codeformat- oder Reihenfolgeänderung als bloßes Aufräumen
behandeln. Ungültige oder verspätete Nachrichten dürfen weder Aktionen
doppelt anwenden noch einen unbemerkten anderen Spielstand erzeugen.

Gezielt: `node tests/pruefe-netz.mjs` und `node tests/pruefe-leitung.mjs`.
Die örtlichen Prüfungen ersetzen keinen nachgewiesenen Internet-Koop zwischen
Geräten. Grenzen stehen in [docs/PROJEKTGRENZE.md](../docs/PROJEKTGRENZE.md).
