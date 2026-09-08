# Darstellung und Bedienung

Es gilt [AGENTS.md](../AGENTS.md). Hier werden Spielereignisse dargestellt und
Eingaben zu Aktionen übersetzt. Keine Kampfwerte oder Spielregeln hier erfinden.

- `start.js` verbindet Sitzung, Eingabe, Abspieler und Bild. Keine zweite
  Animationsschleife oder zusätzliche Eingabe während laufender Ereignisse.
- `zeichnen.js` setzt die Welt zusammen; `granit-feld.js` zeichnet das Gelände,
  `granit-material.js` liefert dessen Material. `palette.js` trägt UI-, Licht-
  und Effektfarben. `licht.js` und `partikel.js` ergänzen Effekte.
- `torwaechter.js` schaltet den Vorlauf nach Eingabe des Zugangsworts frei.
  Zugangswort und Fingerabdruck nicht im Rahmen einer Strukturarbeit ändern.
- `kamera.js` steuert Ausschnitt und ganzzahligen Zoom. HUD-Größe bleibt vom
  Nutzerzoom getrennt. Canvas-Glättung nach jeder Größenänderung ausschalten.
- `ansicht.js` behandelt Zoom/Vollbild und grenzt Mehrfingergesten ab.
  Ein Einzeltipp darf eine Aktion auslösen; Pinch und zusätzliche Android-
  Mausereignisse dürfen keine zweite Spielaktion erzeugen.
- `eingabe.js`, `oberflaeche.js` und `oberflaeche-leiste.js` teilen sich
  Bedienflächen. Wichtige Angaben müssen ohne Maus-Hover erreichbar sein;
  Fingerflächen mindestens 48 CSS-Pixel groß halten.
- Textsprites bleiben in `sprite-daten.js`, Palette und Zeichenformen getrennt.

Die Prüfungen `tests/pruefe-app.mjs`, `tests/pruefe-einstieg.mjs`,
`tests/pruefe-tippen.mjs` und die gezielten Bild-/Eingabeprüfungen verwenden
einen Browserersatz. Echte Vollbild-, Touch- und Layoutänderungen zusätzlich
im Browser prüfen. Nach neuen Modulformen `pnpm build` und die
Einzeldateiprüfung ausführen.
