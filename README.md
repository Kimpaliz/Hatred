# Hatred

Ein **rundenbasierter Koop-Dungeon-Crawler** für den Browser, zu einem
bis vier über das Internet. Dark Fantasy, exakt von oben, Pixelgrafik.

Ein Raster, sechs Aktionspunkte je Zug und ein Schlachtfeld, das aus
**vier Höhenebenen** besteht: Wer oben steht, sieht weiter und trifft
besser — aber hinauf kommt man nur über eine Rampe, und stoßen kann
einen jeder.

## Spielen

```bash
node werkzeuge/vorschau.mjs
```

Dann <http://127.0.0.1:8145/> öffnen. Unter Windows genügt ein
Doppelklick auf `Vorschau-starten.cmd`.

Es braucht keine Paketinstallation und kein Konto — nur Node ab Version 22
und einen Browser. Mit pnpm funktioniert auch `pnpm dev`. Der Server ist nötig, weil
Browser Module nicht von der Festplatte laden.

## Zusammen spielen

Einer öffnet eine Runde und bekommt einen **Einladungscode**. Die
anderen fügen ihn ein. Über die Leitung geht dabei nur, *was jemand tun
will* — „Wesen 3 geht nach (12, 8)" —, nie der ganze Spielstand. Jeder
Rechner rechnet das Ergebnis selbst aus und vergleicht danach eine
Prüfzahl. Läuft etwas auseinander, sagt das Spiel es sofort, statt zwei
verschiedene Spiele weiterzuspielen.

## Steuerung

| | |
| --- | --- |
| Feld anwählen, hingehen | Linksklick |
| Angreifen | Rechtsklick auf den Gegner |
| Aktion wählen | `1`–`6` oder die Leiste unten |
| Stoßen | `S`, dann Richtung |
| Wacht (auf den nächsten warten) | `W` |
| Zug beenden | `Leertaste` |
| Karte ganz zeigen | `Tab` gedrückt halten |

## Was drin steckt

- **Vier Höhenebenen** mit Rampen, Stürzen, Sicht über niedrige Mauern
  hinweg und einem Stoß, der beides zusammenbringt
- **Erzeugte Kerker** aus Räumen, Gängen mit Rundwegen und
  eingerasteten Plateaus — kein Rauschfeld
- **Aktionspunkte** statt „Bewegen plus eine Aktion": sechs Punkte,
  und die Wahl gehört dir
- **Lichtquellen** mit farbigem, an Wänden gestopptem Abfall — und
  Dunkelheit, in der man wirklich verborgen ist
- **Pixelpartikel**: Funken, Blut, Staub, Glut, Zauberstaub
- Sprites als **Text im Repository**, keine Bilddatei

## Für wen hier weiterbaut

| Frage | Datei |
| --- | --- |
| Wie fange ich als Agent an? | [AGENTS.md](AGENTS.md) |
| Wie starte, prüfe und exportiere ich? | [docs/ENTWICKLUNG.md](docs/ENTWICKLUNG.md) |
| Wie arbeiten mehrere Agenten zusammen? | [docs/AGENTEN.md](docs/AGENTEN.md) |
| Was wird gebaut und warum so? | [docs/SPIEL.md](docs/SPIEL.md) |
| Wo fasse ich für Wunsch X an? | [docs/WEGWEISER.md](docs/WEGWEISER.md) |
| Was kommt als Nächstes, und warum in dieser Reihenfolge? | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Welche Regeln gelten? | [docs/REGELN.md](docs/REGELN.md) |
| Welche Fehler wiederholen sich? | [docs/FEHLERBUCH.md](docs/FEHLERBUCH.md) |
| Was wurde zuletzt geändert? | [CHANGELOG.md](CHANGELOG.md) |
| Wo lohnt sich eine spätere Leistungsoptimierung? | [docs/LEISTUNG.md](docs/LEISTUNG.md) |

```bash
pnpm test          # vollständige Abnahme
pnpm check         # nur Projektwächter
pnpm test:game     # nur Fachprüfungen
pnpm test:list     # alle Prüfdateien zeigen
pnpm build         # HTML-Export nach dist/hatred.html
pnpm map 7         # Karte der Saat 7 in der Konsole
```

## Keine Abhängigkeiten

Keine Paketabhängigkeiten. Das Spiel besteht aus den Dateien in diesem Ordner.
Die Netzwege und ihre Voraussetzungen stehen in [docs/NETZ.md](docs/NETZ.md).
Alle pnpm-Befehle haben einen direkten Node-Aufruf; siehe Entwicklungshilfe.

## Ordnerstruktur

```text
spiel/       Regeln, Welt, KI und Inhaltskataloge
runtime/     Browserdarstellung, Eingabe und Oberfläche
netz/        Sitzungen, Verbindungen und optionaler Vermittler
tests/       Fachprüfungen und Prüfhilfen
werkzeuge/   Vorschau, Export und Projektwächter
docs/        Spielvertrag, Systemkarte und Arbeitsabläufe
dist/        erzeugte Dateien, nicht versioniert
```

`AGENTS.md` ist der gemeinsame Einstieg; lokale Anleitungen grenzen die
Bereiche ab. `WORKCLAIM.md` koordiniert aktive Schreibaufträge.
