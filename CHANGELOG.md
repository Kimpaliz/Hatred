# Changelog

Jede Änderung, oben, mit **Warum** und **Messung**. Ein Eintrag ohne
Zahl ist eine Behauptung (Regel 4 und 11).

## 06.09.2026 — Die fünf Phasen haben ihre Vorgänge

**Auftrag:** Jannik hat auf die Frage aus dem letzten Bericht mit „ja"
geantwortet — das war die einzige der drei Bitten, die eine Handlung von
hier verlangte (Regel 3: Veröffentlichung nur auf ein ausdrückliches Ja).

Angelegt in `Kimpaliz/Hatred-`: **#1 bis #5**, Etikett `track`, jede
Phase mit ihrem Abnahmekriterium und `Begründung: docs/ROADMAP.md`.
Die Nummern stehen als `Vorgang: #N` in `docs/ROADMAP.md` — **jede
Verbindung wird zweimal geschrieben**, sonst ist sie von einer Seite
unsichtbar.

*Nebenbefund:* `werkzeuge/vorgaenge.mjs` kam nicht durch — der
`GITHUB_TOKEN` in dieser Umgebung ist abgelaufen (*GitHub 401: Bad
credentials*). Angelegt wurden sie deshalb über die GitHub-Werkzeuge
der Sitzung. Das Werkzeug ist in Ordnung, der Zugang war es nicht; wer
es daheim mit `gh auth token` aufruft, kommt durch.

**Damit ist die Kette zum ersten Mal vollständig grün: 34 von 34.**

---

## 06.09.2026 — Das Spiel läuft, und der Nebel deckt jetzt auch das Licht ab

**Gemessen im echten Browser** (Chromium, Einzeldatei aus
`werkzeuge/eine-datei.mjs`): Titelbild → Heldenwahl → Kerker, **keine
Fehler in der Konsole**. Bildschirmfotos in der Sitzung.

### Ein Fehler, den zwei Anläufe nicht gefangen haben

Die Lichtkarte weiß nichts vom Nebel des Krieges: Sie legt ihre warmen
Anteile **additiv** über das ganze Fenster — auch über Fels, in dem nie
jemand stand. Im Bild wurde daraus ein brauner Schleier über der halben
Karte, also genau das Gegenteil der Vorlage, auf die Jannik gezeigt hat
(*„schwarze Tiefe ringsum"*).

Behoben in `runtime/zeichnen.js → deckeUngesehenes`: Nie gesehene
Felder bekommen ihr Schwarz **nach** dem Licht ein zweites Mal. Das ist
billiger und ehrlicher, als der Lichtkarte die Sichtbarkeit
beizubringen — sie rechnet, was leuchtet; was man davon sehen darf,
entscheidet der Nebel.

**Zwei Anläufe davor waren still falsch**, und beide Male sah das Bild
plausibel aus, weil jeder Lauf eine andere Saat hat:

1. Der erste benutzte `istDrin`, das für eine **fehlende** Menge
   absichtlich `true` liefert („kein Nebel gesetzt, also alles
   sichtbar"). Damit galt jedes Feld als erinnert, und die Abdeckung
   traf kein einziges.
2. Der zweite las die Feldgrenzen aus `kameraFenster()` — das liefert
   Bildpunkte (`x`, `y`, `breite`, `hoehe`) und keine Feldgrenzen. Die
   Schleife lief **kein einziges Mal**.

*Deshalb prüft `pruefe-zeichnen.mjs` Abschnitt 13 jetzt nicht die
Absicht, sondern die Wirkung:* Genau ein Feld ist sichtbar, und die
Prüfung sucht den **letzten** Zeichenaufruf, der ein fernes Feld trifft.
Er muss die Leerfarbe tragen. *Rot-Beweis:* ohne die Abdeckung steht
dort `rgb(36,36,36)` statt `#04040a`.

### Was die Abnahme gefunden hat

- `werkzeuge/pruefe-app.mjs` — 92 Behauptungen, 21,7 s. Sie spielt das
  **ganze** Spiel ohne Browser durch: 42 Module am Einstieg, 140
  Einfuhrpfade, alle relativ und vorhanden · 200 Bilder → 5.932.238
  Rechtecke aus 7.046.121 Aufrufen, keines auf einem Bruchteil eines
  Bildpunktes · **30 Runden zu viert** über eine Leitung, die nur
  Zeichenketten weiterreicht: 766 Aktionen, 23 Angriffe, und nach jeder
  Runde tragen alle vier Spielstände dieselbe `zustandsSumme()` · drei
  Kerkertiefen, 360 Aktionen, 360 Bilder.
- **Ein echter Absturz** steckte darin: Sobald sich eine Figur
  *bewegte*, fragte die Aktionsleiste mit der halb gelaufenen Position
  nach — `sicht: Feldkoordinaten müssen ganze Zahlen sein
  (45.06…,6 → 37,16)`. Ohne die Reparatur bricht der 30-Runden-Lauf
  nach zwei Runden ab. Behoben in `runtime/oberflaeche.js` und
  `runtime/start.js`.
- `werkzeuge/eine-datei.mjs` wickelt jetzt **jedes Modul in seinen
  eigenen Namensraum**. Der erste Anlauf hängte alles hintereinander —
  das ging, bis das Projekt groß wurde: **27 Namen** standen in zwei
  Dateien zugleich (`hash`, `fbm`, `ZEICHEN`, `P`, `TRENNER`, …), fast
  alle davon privat. Sie umzubenennen wäre die falsche Antwort gewesen:
  Der Ordner ist in Ordnung, das Werkzeug war es nicht. *Gemessen:* 42
  Module → 734,7 kB in einer Datei, im Browser fehlerfrei.

**Stand am 06.09.2026: 31 von 33 Prüfungen grün.** Rot ist nur
`vorgaenge` — die fünf Phasen brauchen ihre Vorgänge auf GitHub, und
das ist eine Handlung nach außen (Regel 3).

---

## 06.09.2026 — Bild, Netz und die Kliffe

Sprites, Licht, Pixelpartikel, Höhenkanten, Anzeige, Bedienung, die
Internet-Sitzung und der Einstieg. Die Kette wuchs von 22 auf **33**
Prüfungen; grün sind 31.

### Die Kliffe — ein Befund, keine Verbesserung

**Gemessen** über zehn Saaten, nachdem die Landschaft auf die
Pixelslop-Engine stand: **1,8** Absturzkanten je Karte gegen **260,5**
einstufige. Damit war der Stoß tot — man kann niemanden hinunterstoßen,
wo es nirgends hinunter geht. `docs/SPIEL.md` 3 nennt ihn *„die Aktion,
die aus dem Höhensystem ein Spiel macht"*; eine Regel, die auf der
erzeugten Karte nie greift, ist keine.

*Warum:* Ein stetiges Rauschfeld muss auf dem Weg von Ebene 0 nach
Ebene 2 durch das Band der Ebene 1, und dieses Band ist ein bis zwei
Kacheln breit. Zwei Ebenen Unterschied zwischen **benachbarten**
Kacheln kann es so kaum geben.

*Behoben* in `spiel/landschaft.mjs → schneideKliffe`: Eine Kachel, die
zugleich einen tieferen **und** einen höheren Nachbarn hat, ist die
ganze Böschung — eine Kachel breit. Sie fällt der stärkeren Seite zu,
und aus 0-1-2 wird 0-2. Nicht ein Absturz wird hinzuerfunden, sondern
das schmale Zwischenband entfernt. Dieselbe Bauart wie bei den
Felsinseln der Engine: nicht aus dem Rauschen hoffen, sondern setzen.

*Messung nachher:* **7,3** Absturzkanten je Karte auf 44 × 32 (Schranke
in der Prüfung: 5). Ein erster Anlauf über ganze Flächen statt Kacheln
brachte nur 1,8 → 2,1 — die Zwischenflächen sind keine schmalen Bänder,
sondern große Gebiete. *Rot-Beweis:* mit ausgehängtem Kliffschnitt
fällt die Prüfung auf **1,3** und schlägt an.

### Was die Kliffe an anderer Stelle umgeworfen haben

Zwei Prüfungen hingen an Zahlen der alten Welt. Beide sind **nicht**
gesenkt, sondern auf die richtige Aussage gebracht:

- `pruefe-netz.mjs` hing an einer **gemessenen Saat**: Mit Saat 5
  trafen sich die Seiten zufällig. Auf der größeren, offeneren Höhle
  fielen in dreißig Runden **null** Angriffe, null Stöße, null Tränke —
  der Gleichlauf lief über zwei Rechner, die spazieren gingen. Jetzt
  suchen die Jäger den nächsten Gegner (`zumGegner`, deterministisch
  nach Wegkosten, bei Gleichstand nach Kennung). *Gemessen:* 59
  Angriffe, 3 Stöße, 2 Tränke, 7 Fähigkeiten.
  Dabei fiel eine zweite falsche Behauptung auf: „genau dreißig Runden".
  Der Lauf endet jetzt in Runde 17, **weil die Brut fällt** — ein Lauf,
  der gewonnen wird, ist kein Fehler. Geprüft wird jetzt, dass *jede
  gespielte* Runde gleichgelaufen ist. Das ist die stärkere Aussage.
- `pruefe-lauf.mjs`: Schaden 182 statt über 200, Tote 7 statt 8. Die
  Schranken sind keine Balancewerte, sondern die Frage „ist der Ablauf
  überhaupt gehaltvoll". Sie stehen jetzt bei 100 und 4 — deutlich
  unter dem Gemessenen, damit sie den leeren Lauf fangen und nicht die
  Bauart der Karte einfrieren.

### Vier Dateien geteilt, ohne Verhaltensänderung

`spiel/landschaft.mjs` wuchs mit dem Kliffschnitt auf 1.070 Zeilen,
`werkzeuge/pruefe-lauf.mjs` auf 1.014. Die Grenze liegt bei 1.000, und
eine Datei über der Grenze wird **geteilt**, nicht geduldet (Regel 8).

- `spiel/kachelhilfe.mjs` — Feldindex, Richtung, Gebietssuche, Plateaus.
- `spiel/erreichbarkeit.mjs` — kommt man überall hin.
- `spiel/ausstattung.mjs` — Wasser, Boden, Zier, Licht, Starts, Ausgang.
- `werkzeuge/pruefe-protokoll.mjs` — die Übersetzung für die Leitung.

*Warum drei statt einer:* `landschaft.mjs` ruft die Ausstattung auf,
und die Ausstattung muss die Erreichbarkeit fragen — als zwei Dateien
wäre das ein **Ringschluss**. Der läuft im Browser meist, bricht aber
im Bündler (`werkzeuge/eine-datei.mjs`) ab, weil die Reihenfolge dann
nicht mehr eindeutig ist. Zwei untere Dateien lösen es ohne Kunstgriff.

*Der Umbau ist bewiesen:* Nach der Teilung liefert dieselbe Saat
byteweise dieselben Zahlen — 7,3 Absturzkanten, 548,8 offene Kacheln,
39,0 %. Gleiche Eingaben, gleiches Ergebnis.

### Gemessen an den neuen Teilen

- **Sprites:** 4.965 Behauptungen. Gemessen mit dem Skill
  `pixel-werkstatt` (Fall B), Brücke in `werkzeuge/werkstatt-auftrag.mjs`
  — sie übersetzt die Farbnamen dieses Spiels in die Hex-Aufträge, die
  der Skill liest, und misst gegen die **echten** Untergründe.
- **Landschaft:** 60 Karten, 39,0 % offen, alle vier Ebenen, 64,1
  Rampen, 3,0 Seen, 29,2 Fackeln je Karte.
- **Licht:** 7 Helligkeitsstufen über 11.520 Lichtpunkt-Kanäle, 1,8 ms
  je Durchgang bei 44 × 32 Feldern mit 30 Fackeln.
- **Partikel:** 10.000 Ausstöße bei Vorrat 2.000 → 2.000 lebende.
- **Netz:** 2.000 Lobbycodes, 480.000 Tippfehler und 13.533 Dreher —
  **0 durchgerutscht**.

---

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
