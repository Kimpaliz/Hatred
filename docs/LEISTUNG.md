# Rechenleistung gezielt verbessern

Diese Hinweise sind mögliche Folgeaufträge, keine Änderung der Spielmechanik.
Vor jedem Umbau denselben Spielstand, dieselbe Saat, Fenstergröße und Zoomstufe
messen. Ein schnellerer Lauf ist nur vergleichbar, wenn Bild und Regeln gleich
bleiben. Profil zuerst, gezielte Änderung danach.

## Vorhandene Entlastung bewahren

Die Kamera begrenzt die Weltzeichnung auf ihren Ausschnitt. `runtime/start.js`
berechnet Sicht nach Zustandsänderungen, `runtime/eingabe.js` hält erreichbare
Felder vor, und `runtime/licht.js` speichert feste Schattenwürfe.
`spiel/wegfindung.mjs` benutzt eine Prioritätswarteschlange mit stabiler
Reihenfolge. Diese Mechanismen nicht durch bequemere Vollberechnungen ersetzen.

## Kandidaten für einen beauftragten Performance-Durchgang

| Stelle | Möglicher besserer Weg | Nachweis vor Übernahme |
| --- | --- | --- |
| [Lichtberechnung](../runtime/licht.js), `rechne()` | Unveränderte Lichtbeiträge wiederverwenden oder den benötigten Ausschnitt samt Lichtreichweite begrenzen | Zeit für feste und bewegte Quellen; identische sichtbare Farbfelder |
| [Gegner-KI](../spiel/gegner-ki.mjs), Aktionsplanung | Erreichbarkeit und Wege innerhalb desselben Planungszustands wiederverwenden | Zahl der Wegsuchen und Entscheidungszeit; identische Aktionen und Zustandssummen |
| [Weltzeichnung](../runtime/zeichnen.js), `bild()` | Statisches Gelände zwischenspeichern; Figuren, Flüssigkeiten, Licht und Partikel getrennt weiterzeichnen | Zeichenaufrufe und Bildzeit; identisches Bild bei Sicht-, Zoom- und Höhenwechseln |

Das sind anhand des Quelltexts abgeleitete Kandidaten, keine gemessenen
Engpässe. Die Optimierung muss ihre zusätzlichen Speicher- und
Invalidierungskosten rechtfertigen. Geänderte Karten, tote Wesen, neue
Lichtquellen und Kamerazoom dürfen keine veralteten Zwischenergebnisse zeigen.

## Entwicklungszeit

Gezielte Einzelprüfungen und `pnpm check` verkürzen Rückmeldungen während der
Arbeit. Zur Übergabe bleibt `pnpm test` vollständig. Tests nicht unkontrolliert
parallelisieren: Browserersatz verändert globale Objekte, einige Prüfungen
starten Prozesse und legen temporäre Dateien an. Die Prozessgrenzen erhalten.
