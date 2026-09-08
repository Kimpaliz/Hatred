# Regelkern

Es gilt [AGENTS.md](../AGENTS.md). Dieser Bereich enthält Spielregeln und
Inhaltsdaten, keine Darstellung, Browser-APIs oder Netzwerktransporte.

- Zufall wird aus `zufall.mjs` gereicht. Keine Uhr, Timer oder freie Zufallsquelle.
- `aktionen.mjs` validiert und führt aus. Abgelehnte Aktionen dürfen keinen
  Zustand verändern. Ereignisse beschreiben das Ergebnis für die Darstellung.
- `lauf.mjs` hält den Lauf und `zustandsSumme()`. Gleiche Saat plus gleiche
  Aktionsfolge muss dieselben Ergebnisse liefern, auch im Koop.
- `gitter.mjs` ist die gemeinsame Rastergrundlage. Ränder, Höhen und Rampen
  gegen Höhen-, Sicht- und Wegfindungsprüfungen prüfen.
- `raster.mjs` definiert Feldmitten, Hexgrenzen und Weltprojektion. Darstellung,
  Eingabe und Erzeugung verwenden dieselbe Geometrie.
- `katalog/` enthält Waffen, Gegner, Helden und Fähigkeiten. Regeländerungen
  gehören in die zuständigen Systeme, nicht in Textsprite-Daten.
- Keine Exportnamen oder Katalogschlüssel ändern, ohne ihre Nutzer in
  `runtime/`, `netz/`, den Tests und dem Einzeldateiexport zu prüfen.

Passende Prüfungen für Höhen, Sicht, Wegfindung, Kampf, Züge, Lauf, KI und
Katalog mit `pnpm test:list` finden. `node werkzeuge/pruefe-kern.mjs` schützt
die Umgebungsgrenze. Nach Regeländerungen die vollständige Kette samt
Netzprüfungen ausführen.
