# Scotophobias Granithöhle im Hexraster

## Quelle und verbindlicher Blick

Der Auftrag vom 08.09.2026 verlangt Scotophobias Höhlenstil und
Erzeugung, exakt senkrechte Draufsicht, anschließende Treppen und klar
erkennbare Wände und Ebenen. Das vorhandene Sechseckraster bleibt.

> **Berichtigung vom 12.09.2026.** Die „exakt senkrechte Draufsicht" ist
> zurückgenommen. Janniks Entscheidung E6 (Vorgang #33) ersetzt sie: Der
> Blick ist leicht gekippt, man sieht die Südflanke von allem Höheren.
> Verbindlich ist [SPIEL.md](SPIEL.md); alles andere in diesem Dokument —
> Höhlenstil, Erzeugung, Treppen, Raster — bleibt unberührt.

Quellstand: `Kimpaliz/granithoehle`, Commit
`d3460e97399b9748e1043a488c119dd3b7ec528c`, am 08.09.2026 gelesen.
Die Formparameter entsprechen den Quellwerten `sector=215`, `corr=1.15`.
Quellformel und Quellmaterial sind übernommen; die vier taktischen
Ebenen, endliche Kartengrenze und Wasserbecken gehören zu Hatred.
Scotophobias gesamter Simulationsumfang ist kein Bestandteil dieses Umbaus.

**Abgrenzung dieses Branch-Stands vom 08.09.2026:** Der Auftrag wurde
um Scotophobias Sicht- und Lichtsystem erweitert und anschließend
ausdrücklich zum sofortigen Abschluss des bisherigen Stands angehalten.
Diese zusätzliche Übernahme ist am 08.09.2026 noch offen. Sicht und Licht
verwenden hier Hatreds Verfahren mit korrigierter Hexprojektion. Die vollständige
beleuchtete Übersicht ist im Browser zu langsam; Messung und Ursache
stehen im [Changelog](../CHANGELOG.md).

Die Kamera verwendet nur Welt-X und Welt-Y. Höhe verändert Farbe,
Relief und Kanten, niemals die Bildschirmposition. Wandvorderseiten
und perspektivisch versetzte Plateaus sind ausgeschlossen.

## Ein Ort für alle Systeme

`spiel/raster.mjs` definiert Feldmitten, Ecken, Weltmaße und Rückrechnung.
Eine Feldbreite beträgt 16 Weltpixel, der Zeilenabstand ist
`16 × sqrt(3) / 2`. Ungerade Zeilen sind um acht Weltpixel versetzt.
Ein Pixel gehört zur nächsten Hexmitte. Dadurch verwenden Generator,
Terrain, Mausauswahl, Kamera, Licht und Partikel dieselbe Geometrie.

| Aufgabe | Datei | Übergabe |
| --- | --- | --- |
| Kontinuierliche Höhlenform | `spiel/welt-feld.mjs` | Distanz zum freien Raum |
| Quellparameter und taktische Höhen | `spiel/bauart.mjs` | Gesäte Formparameter |
| Wand- und Höhenabtastung, Erreichbarkeit | `spiel/landschaft.mjs` | Endliche Hexkarte |
| Wasser, Boden, Zier, Raumzuordnung | `spiel/ausstattung.mjs` | Ausstattung auf derselben Karte |
| Granit, Boden, Geröll und Mikrorelief | `runtime/granit-material.js` | Farbe und Materialhöhe je Weltpixel |
| Normalen, Umgebungsverdeckung, Konturen, Treppen | `runtime/granit-feld.js` | Transparente Feldbilder |
| Wesen, Licht, Effekte, Sichtnebel | `runtime/zeichnen.js` | Vollständiges Spielbild |

Die Weltfassung im Netz-Handschlag wird auf 2 erhöht. Alte und neue
Erzeugung dürfen keine gemeinsame Partie mit unterschiedlichen Karten starten.

## Zusammenhängende Treppen und lesbare Grenzen

Trittlinien verwenden eine gemeinsame Weltphase und feste Achsen für
alle sechs Richtungen. Benachbarte Läufe gleicher Richtung und
Grundhöhe teilen eine Fläche ohne innere Wangen. Aufeinanderfolgende
Stufen verbinden sich nur an ihrem tatsächlichen Aufstieg.

Eine Rampe ist optisch nur gültig, wenn ihr Feld und das Zielfeld
begehbar sind und das Ziel genau eine Ebene höher liegt. Unpassende
Richtungen, Sperren oder Höhenunterschiede behalten ihre Kontur.
Eine geöffnete Treppenkante darf benachbarte Klippen nicht mit öffnen.

Wände haben eigene Granitstruktur und einen umlaufenden dunklen Saum.
Höhenkanten entstehen entlang aller sechs Seiten: heller Rand oben,
dunkler Rand unten. Es gibt keine bevorzugte sichtbare Südwand.
Abgründe bleiben als dunkle Fläche mit Rand erkennbar.

## Rechenaufwand

Der Materialpass mit Normalen und Umgebungsverdeckung wird gespeichert.
Der Browser zeichnet danach transparente Feldbilder mit deaktivierter
Glättung. Eine Signatur über drei Nachbarringe erkennt Geländeänderungen
auch dann, wenn die Kartenarrays direkt verändert wurden.

Der begrenzte Speicher hält 4.096 Felder. Eine ganze Standardkarte mit
56 × 40 = 2.240 Feldern passt hinein. Die Prüfung liest sie zweimal und
verlangt weiterhin 2.240 Berechnungen. Mit einem kleineren Speicher
würde bereits die unveränderte Übersicht ständig alles neu berechnen.

Für deutlich größere Karten wäre ein Speicher zusammenhängender
Bildabschnitte der nächste sinnvolle Schritt: weniger Zeichenaufrufe
und weniger Signaturprüfungen pro Bild. Für die Standardkarte verhindert
die vorhandene Wiederverwendung bereits erneute Materialberechnungen.

## Sicht- und Funktionsprüfung

`node werkzeuge/vorschau.mjs` starten, dann
[die Geländevorschau](../werkzeuge/topdown-vorschau.html) öffnen.
Sie verwendet den tatsächlichen Spielzeichner. Die Höhle lässt sich
per Saat wechseln. Die Treppenansicht zeigt breite Läufe, alle sechs
Richtungen, mehrere Höhen, Wasser und einen Abgrund. Raster und
Fackellicht lassen sich zum Vergleichen umschalten.

| Befehl | Aussage |
| --- | --- |
| `node tests/pruefe-granit-generator.mjs` | Quellwerte, einheitliche Wand-/Höhenproben, trockene Starts |
| `node tests/pruefe-granit-material.mjs` | Referenzfarben, Relief und Material über Abschnittsgrenzen |
| `node tests/pruefe-granit-feld.mjs` | Tatsächliche Treppenpixel, gesperrte Übergänge, Konturen und Speicher |
| `node tests/pruefe-raster-projektion.mjs` | Kamera, Auswahl, Licht und Effekte auf derselben Hexgeometrie |
| `node tests/pruefe-zeichnen.mjs` | Zusammengesetztes Spielbild, harte Pixel, Wesen und Sichtnebel |
| `node werkzeuge/pruefe-alles.mjs` | Vollständige Projektprüfkette einschließlich Spiel- und Netzregeln |

Messwerte eines konkreten Laufs gehören datiert in [CHANGELOG.md](../CHANGELOG.md).
