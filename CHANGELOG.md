# Changelog

Jede Änderung, oben, mit **Warum** und **Messung**. Ein Eintrag ohne
Zahl ist eine Behauptung (Regel 4 und 11).

## 06.09.2026 — Das Projekt entsteht

**Auftrag, wörtlich:** *„multyplayer rundenbasiert dungeoncrawler. in
raster unterteilt. schöne pixel grafik. richtige landschaftsgenerierung.
das schlachtfeld kann aus unterschiedlichen höhen bestehen"* · *„stil wie
auf dem bild. auch mit licht quellen. pixel partikeln."*

**Drei Entscheidungen des Auftraggebers** (Gespräch vom 06.09.2026):
Name **Hatred**; Koop **sofort übers Internet**; Zugsystem
**Aktionspunkte**.

### Fundament

- `spiel/zufall.mjs` — gesäter Strom (mulberry32), rein ganzzahlig
  angestoßen. `zweig()` gibt abgeleitete Ströme, damit die Landschaft
  würfeln kann, ohne den Kampfstrom zu verschieben (Fehlerbuch B4).
  *Warum:* An dieser einen Datei hängt, ob vier Rechner dieselbe Runde
  bitgleich ausrechnen — und damit der ganze Internet-Koop.
  *Gemessen:* Saat 41 gibt zweimal `60,81,31,91,6`.

- `spiel/gitter.mjs` — das Raster als flache `Uint8Array`-Reihen
  (Boden, Ebene, Hindernis, Flüssigkeit, Rampe) statt Objekten je Feld.
  *Warum:* 56 × 40 Felder als Objekte wären je Sichtberechnung 2.240
  Zeigerverfolgungen; als Zahlenreihe ist es eine Adressrechnung. Und
  nur flache Reihen lassen sich **byteweise** vergleichen — genau das
  braucht die Desync-Erkennung. Außerhalb der Karte gilt als Wand
  (Fehlerbuch A1). Vier Laufrichtungen, nicht acht, damit
  Aktionspunkte ganze Zahlen bleiben.
  *Gemessen:* `summe()` einer 8 × 6-Testkarte ist reproduzierbar
  `3797352887`.

- `runtime/palette.js` — alle Farben an einer Stelle, plus die
  Ebenenrampe `EBENEN_TON = [0.55, 1, 1.45, 2]`.
  *Warum:* Auf einem exakt von oben gesehenen Bild fehlt jede
  Perspektive; die Höhe kann nur über Helligkeit, harte Schattenkante
  und helle Oberkante erzählt werden.
  *Gemessen:* Über alle acht Bodenarten und beide Töne liegt der
  **engste** Sprung zwischen zwei Ebenen bei **14,50** von 255
  Rec.-709-Helligkeit (Schwelle 14). Vor der Korrektur an `erde0`
  waren es 13,4 — die Erde hätte ihre Höhenstufen nicht gezeigt.

- `werkzeuge/helfer.mjs` — das Prüfgerüst (60 Zeilen statt eines
  Testläufers aus dem Paketverzeichnis).
  *Warum:* Gebraucht werden vier Dinge — Behauptung, Name, Zähler,
  Rückgabewert für die Schale.

### Dokumentation

- `CLAUDE.md`, `docs/SPIEL.md`, `docs/REGELN.md`, `docs/WEGWEISER.md`,
  `docs/ROADMAP.md`, `docs/FEHLERBUCH.md`, `README.md`,
  `alpha-code.json`, `WORKCLAIM.md`.
  *Warum:* Das Fehlerbuch steht **vor** dem ersten Bauschritt, nicht
  danach — die Fehlerklassen A (Raster und Höhen), B (Determinismus)
  und E (Züge) sind aus dem Schwesterprojekt bekannt und kosten sonst
  je einen halben Tag.
