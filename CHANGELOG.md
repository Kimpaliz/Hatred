# Changelog

Jede Änderung, oben, mit **Warum** und **Messung**. Ein Eintrag ohne
Zahl ist eine Behauptung (Regel 4 und 11).

## 06.09.2026 — Das Projekt wird auf Alpha-Code umgestellt

**Auftrag, wörtlich:** *„bitte mit skill alpha code arbeiten!"*

Bis hierher war die Methode nachgebaut — aus dem Schwesterprojekt
`where-shadows-crawl` abgelesen, das ihr Ergebnis ist. Jetzt liegt das
Original vor (`florianfinn/claude-skills`,
`plugins/alpha-code/skills/alpha-code`), und `einrichten.mjs` hat das
echte Gerüst aufgestellt.

**Gemessen:** 13 Dateien angelegt, 9 übersprungen (das Skript
überschreibt nie). Die Kette wuchs von **12 auf 22 Prüfungen**.

### Was dazukam

- Neun Wächter der Arbeitsweise: `pruefe-arbeitsweise` (nie auf `main`,
  Changelog-Pflicht) · `pruefe-tags` · `pruefe-verweise` ·
  `pruefe-workclaim` · `pruefe-geheimnisse` · `pruefe-altlasten` ·
  `pruefe-doku-status` · `pruefe-sprache` · `pruefe-vorgaenge`. Dazu
  `pruefe-freigabe` **außerhalb** der Kette (vor einer Veröffentlichung)
  und `vorgaenge.mjs` für den Vorgangs-Tracker.
- `.claude/PROJEKTPROFIL.md`, `docs/WORTLISTE.md`.
- `docs/REGELN.md` bekam die **Systemtabelle** in der Form, die
  `pruefe-tags` liest: System · Tag · Zweig · Bereiche, sieben Systeme.
  *Warum das vorher nicht ging:* Meine Tabelle hatte drei Spalten und
  keine Tag-Spalte. Der Wächter fand deshalb **null** zugelassene Tags
  und meldete alle 52 Quelldateien als falsch etikettiert — ein Wächter
  ohne Tabelle ist kein Wächter.
- `WORKCLAIM.md` in der Vorlagenform (Bereich · Besitzer · Ziel · Seit).
- `docs/ROADMAP.md`: Die offenen Entscheidungen sind **keine Phase**
  mehr. *Warum:* Eine Entscheidung hat eine andere Lebensdauer als die
  Arbeit, die auf sie wartet — als Absatz in einer Phase verschwände sie
  mit deren Abschluss, ohne beantwortet zu sein. Jede Phase trägt jetzt
  ihr Abnahmekriterium.

### Zwei echte Befunde am Skill selbst

1. **`pruefe-sprache` hatte nur eine Richtung.** Sie meldete jeden
   Bezeichner, der ein **deutsches** Wort der Wortliste enthält — richtig
   für ein Projekt mit `"bezeichner": "en"`, genau falsch herum für
   Hatred mit `"bezeichner": "de"`. *Gemessen:* sechs korrekte deutsche
   Namen als Fehler gemeldet (`vorlage`, `fehler`, `groessen`,
   `einstellungenAus`, `vorlagenZahl`, `vorlage`). Ein Wächter, der die
   Einhaltung der Regel anschlägt, gewöhnt einem das Übergehen an — und
   dann fängt er auch den echten Fall nicht mehr.
   *Behoben:* `sprache.bezeichner` entscheidet jetzt, welche Spalte
   verboten ist. In der englischen Richtung wird der Bezeichner dafür in
   seine Höckerteile zerlegt statt per `includes` gesucht — sonst fände
   `art` sich in `Karte` und `Startfeld`, und die Prüfung wäre in einem
   deutschen Projekt sofort unbrauchbar.
   *Rot-Beweis:* `export const errorTemplate = 1;` in `spiel/gitter.mjs`
   → „Bezeichner: spiel/gitter.mjs · errorTemplate · „template" →
   Vorlage", Rückgabewert 1. Daneben `export const kartenStartArt = 2;`
   → **nicht** gemeldet, obwohl „art" als Teilzeichenkette darin steht.
   Beides zurückgenommen, Datei per Prüfsumme identisch.

2. **Die Werkzeuge des Skills brechen die Maße dieses Projekts.**
   `werkzeuge/vorgaenge.mjs` hat zwölf Zeilen über 100 Zeichen.
   *Entschieden:* Sie werden **nicht** umformatiert. `pruefe-kopfnotiz`
   führt eine ausdrückliche Liste `AUS_DEM_SKILL` und nimmt genau diese
   zwölf Dateien von der Spalten- und Gliederungsregel aus — Kopfnotiz,
   Tag und die 1000-Zeilen-Grenze gelten weiter. *Begründung:* dieselbe,
   die der Skill selbst für `sprache.ausnahmen: ["werkzeuge"]` gibt —
   ein Werkzeug, das die Regel des Projekts erzwingt, muss ihr nicht
   selbst folgen. Sonst müsste man es bei jedem Skill-Update erneut
   umformatieren, und eine Verbesserung am Skill käme hier nie an.
   Die Liste ist ausdrücklich und nicht `werkzeuge/*` — eine eigene
   Datei kann sich nicht hineinschmuggeln.

### Was beim Umstellen aufgefallen ist

- `werkzeuge/pruefe-kopfnotiz.mjs` trug selbst einen verschriebenen Tag
  (`[Aufgabe: Prüfwesn]`) — von der eigenen Prüfung nicht gefangen, weil
  es damals noch keine Systemtabelle gab, gegen die sie hätte prüfen
  können. Berichtigt; die Fixtur, die das Verschreiben absichtlich
  prüft, blieb erhalten.
- `helfer.mjs` trägt jetzt **zwei** Melder: `behaupte`/`gleich` für die
  Fachprüfungen dieses Spiels und `macheMelder` aus dem Skill für die
  Wächter der Arbeitsweise. Sie stoßen nicht zusammen, und der Skill
  darf unverändert `./helfer.mjs` importieren.

**Stand am 06.09.2026, 11:33 Uhr:** 18 von 22 Prüfungen grün. Rot sind
`landschaft`, `ki` und `lauf` — dort läuft gerade der Umbau auf die
Pixelslop-Engine, `pruefe-landschaft.mjs` gehört noch zum alten
Erzeuger. Rot ist außerdem `vorgaenge`: Die fünf Phasen brauchen ihre
Vorgänge auf GitHub, und die anzulegen ist eine Handlung nach außen —
sie wartet auf Janniks ausdrückliches Ja (Regel 3).

---

## 06.09.2026 — Janniks Pixelslop-Engine löst den eigenen Erzeuger ab

**Auftrag, wörtlich:** *„wegen der Landschaft. benutze meine pixelslop
engine aus scotophobia, aber erst mal nur mit wasser und ohne gase."* ·
*„die landschft muss auf ein kachel raster feld generiert werden. also
wände im raster muster, aber trotzdem natürliche wände."*

Der erste Erzeuger teilte die Karte in Rechtecke und verband sie mit
Gängen. Er lief und war grün — aber er war nicht das, was Jannik wollte.
Ersetzt durch seine eigene Engine aus `Kimpaliz/granithoehle`
(„Scotophobia: Shapes in the Dark").

- `spiel/welt-rauschen.mjs` — `hash`, `vn`, `fbm`, `sstep`, `smin`,
  `smax`, **Zeichen für Zeichen** aus Scotophobia übernommen.
  *Warum unverändert:* Wer die beiden Dateien nebeneinanderlegt, soll
  einen Unterschied als Unterschied sehen und nicht als Umformulierung.
  Eine Weltformel, die man „ein bisschen aufgeräumt" übernimmt, erzeugt
  andere Höhlen — und niemand merkt, warum.
  *Warum als eigene Datei neben `rauschen.mjs`:* Die Aufrufform ist eine
  andere (`fbm(x, y, s, oct)` statt `fbm(saat, x, y, opts)`). Zwei
  Funktionen gleichen Namens mit vertauschten Argumenten in einer Datei
  sind die Sorte Falle, die erst nach Wochen zuschnappt.

- `spiel/welt-feld.mjs` — die Weltformel: eine vorzeichenbehaftete
  Distanz je Punkt, positiv im Fels, negativ im Hohlraum. Drei Schichten
  übereinander: Höhlenrauschen für die Form, Skelett aus Räumen und
  Gängen für die Erreichbarkeit, Verzerrung für die Organik. Dazu die
  Felsinseln, deren Radius dem vorhandenen Platz folgt statt einem Wurf.
  *Weggelassen mit Absicht:* Gase (ausdrücklich nicht gewollt), alle
  Flüssigkeiten außer Wasser, Kristalle, Materialpass,
  Beleuchtungsrelief. Das sind Bildsachen; hier geht es um Spielregeln.
  *Neu dazu:* `hoeheBei`/`ebeneBei`. Scotophobia kennt Höhe nur als
  Relief der Oberfläche, hier ist sie eine Regel mit vier Ebenen. Sie
  wird an **derselben verzerrten Stelle** abgetastet wie das Formfeld —
  sonst kreuzen sich Höhenkanten und Felskanten, statt zueinander zu
  passen.

- `spiel/bauart.mjs` — alle Werte als Tabelle, keiner im Erzeuger.
  *Warum die Zahlen andere sind als in Scotophobia:* Dort ist die Welt
  unendlich und wird in Bildpunkten durchwandert; hier ist sie ein Feld
  von 56 × 40 Kacheln zu je 16 Bildpunkten. Ein Sektor von 215
  Bildpunkten wäre fast ein Viertel der Karte — es gäbe sechs Räume auf
  dem ganzen Schlachtfeld.
  *Umgerechnet:* Sektor 215 → 120 px · Verzerrung 300 → 160 px
  (Amplitude mal Frequenz 0,572 statt 0,70 — unter 1, die Topologie
  bleibt also erhalten und das Skelett darf mitverzerrt werden) ·
  Höhlenfrequenz 0,0026 → 0,0046 (Wellenlänge 13,6 statt 24 Kacheln).
  *Gemessen* über fünf Saaten (3, 7, 11, 19, 23) auf 56 × 40 Kacheln,
  Anteil offener Kacheln bei 3 × 3 Überabtastung:

  | `schwelle` | 0,620 | 0,660 | **0,700** | 0,740 |
  | --- | --- | --- | --- | --- |
  | offen | 59,8 % | 54,6 % | **50,1 %** | 47,1 % |

  Gesetzt ist **0,700**. Scotophobia steht auf 0,620, weil man dort eine
  Höhle *durchwandert* und Enge stört. Hier sieht man das Schlachtfeld
  auf einen Blick, und die Hälfte muss Fels sein — sonst gibt es keine
  Deckung, keine Engstelle und nichts zu umgehen.

---

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
