# Changelog

Jede Änderung, oben, mit **Warum** und **Messung**. Ein Eintrag ohne
Zahl ist eine Behauptung (Regel 4 und 11).

## 07.09.2026 — Der warme Vorlauf wird am gezeichneten Bild geprüft

**Auftrag, wörtlich:** *„Schau mal ins github hatred und arbeite mal den
nächsten optik schritt ab Dann so das man es sich ansehen kann über github seite"*

`werkzeuge/pruefe-vorlauf.mjs` prüft Merkmal 5 aus Vorgang #9 an den
wirklichen Canvas-Rechtecken. So kann eine warme Palette allein keine
kalt gebliebene Zeichnung verdecken. Die Prüfung umfasst die fünf Seiten,
Alleinspiel und zwei beziehungsweise vier Plätze sowie die Bilder vor
und nach der Codeerzeugung. Die Codes entstehen im echten Vermittler;
eine ersetzte Verbindung hält die Prüfung vollständig ohne Netzwerk.

Gemessen mit `node werkzeuge/pruefe-vorlauf.mjs`: **54 Bilder**, verteilt
auf **9 Zustände und 6 Fenstergrößen** (412 × 915, 915 × 412, 960 × 540,
1366 × 768, 360 × 640, 1920 × 1080), und **378 Trefferflächen** innerhalb
des Fensters
mit mindestens **48 × 48 Punkten**. Schrift und Nebenzeilen haben gegen
die dunklen und aktiven Flächen mindestens **6,16:1 Kontrast**; verlangt
werden 4,5:1. Mauszeiger, Tastaturfokus, gewählte Klasse, Eingabefelder
und Rückmeldungen müssen ihre vereinbarten Farben tatsächlich malen.

**Rotprobe:** Am unveränderten Vorlauf von `28a3f83` fallen **240 von
1172 Behauptungen**, Rückgabewert 1. Die Vergrößerung bleibt im neuen
Vorlauf bei 1920 × 1080 höchstens zweifach. Eine
Gegenprobe entfernt diese Kappung absichtlich: **6 von 1172 Behauptungen**
fallen, Rückgabewert 1. Nach dem Wiederherstellen bestehen **1172 von
1172**, Rückgabewert 0. Die Kopfnotizenprüfung besteht mit
**830 Behauptungen**, die Sprachprüfung mit **0 Fehlern**. Die vollständige
Prüfkette und die Veröffentlichung werden nach der Integration geprüft.

## 07.09.2026 — Vorlauf im Scotophobia-Ton (Vorgang #9, Merkmal 5)

**Auftrag, wörtlich:** *„Schau mal ins github hatred und arbeite mal den
nächsten optik schritt ab. Dann so das man es sich ansehen kann über
 github seite“*.

Der Vorlauf übernimmt Scotophobias warmes Creme auf fast Schwarz.
Titel und Unterzeilen beginnen links; dünne Linien ersetzen die Kästen.
Eine Seitenmarke zeigt Tastaturfokus und Mauszeiger, eine warme Fläche
kennzeichnet die gewählte Klasse oder das aktive Eingabefeld. Auf großen
Schirmen ist die Vergrößerung auf 2 begrenzt: bei 1920 × 1080 ist die
Menüspalte damit 640 statt 1280 Bildpunkte breit. Alle Vergrößerungen
bleiben ganzzahlig, die Pixelschrift bleibt ungeglättet.

**Aufbau:** `runtime/lobby.js` legt Seiten und Trefferflächen wie zuvor;
`runtime/lobby-bild.js` malt ausschließlich diesen Zustand. Die Farben
stehen als eigener Satz `VORLAUF` in `runtime/palette.js`. Der Zugriff
auf diese Bilddatei ist für diesen Oberflächen-Schritt nötig; die bisherigen
Farben des Kerkers und alle Regeln unter `spiel/` bleiben unverändert.

**Gemessen am 07.09.2026:** `node werkzeuge/pruefe-einstieg.mjs` zählt
10 statt 21 Flächen auf der Titelseite bei 640 × 360. Der Vorlauf fügt
keine Animation oder Lichtberechnung hinzu. Einstieg: 183 Behauptungen
grün; `node werkzeuge/pruefe-einzeldatei.mjs`: 22 grün. Im echten
Chrome-Browser: Titel, Heldenwahl und Spielstart bei 1920 × 1080 und
915 × 412; keine Skriptfehler oder fehlenden Dateien. Auf dem Handy
sind die gemessenen Trefferflächen mindestens 105 × 48 Bildpunkte groß.
Screenshots des ursprünglichen Vorlaufs, der neuen Fassung und des
Scotophobia-Menüs wurden zum visuellen Vergleich aufgenommen.

Die zusätzliche Stilprüfung und die Windows-Berichtigung der bestehenden
Prüfwerkzeuge werden auf eigenen Prüfzweigen geführt. Veröffentlichung
über den vorhandenen `gh-pages`-Zweig; Rückkehr zur vorigen Fassung durch
das Zurücknehmen des jeweiligen Veröffentlichungscommits.

## 07.09.2026 — Pfadgrenzen und Kopfnotizen auch unter Windows prüfen

`pruefe-kern.mjs` verglich den von Node zusammengesetzten Dateipfad mit
einem fest eingetragenen `/`. Unter Windows entstehen dort `\`:
**71 von 211 Behauptungen** lehnten deshalb gültige interne Einfuhren
ab. Der Vergleich verwendet jetzt den Plattformtrenner, weiterhin mit
einer vollständigen Ordnergrenze. **10 neue Selbstproben** prüfen auf
jedem Rechner Windows- und POSIX-Pfade einschließlich `..` und dem
ähnlich benannten Nachbarordner `spiel-fremd/`.

`pruefe-kopfnotiz.mjs` liest CRLF als einen Zeilenumbruch. Das CR gehört
weder zum ersten Satz noch zur Zeichenbreite. **6 neue Selbstproben**
halten LF und CRLF gleich, verlangen weiterhin einen Satz im Kopf und
unterscheiden weiterhin exakt 100 von 101 Zeichen. Ein einzelnes CR
innerhalb einer Zeile wird nicht entfernt. Vor der Berichtigung fielen
**3 dieser Proben** rot aus.

**Gemessen am 07.09.2026 unter Windows:**

| Befehl | Ergebnis |
| --- | --- |
| `node werkzeuge/pruefe-kern.mjs` | 221 Behauptungen grün |
| `node werkzeuge/pruefe-kopfnotiz.mjs` | 820 Behauptungen grün |

In einer temporären Kopie wurden zusätzlich echte Importzeilen nach
`../runtime/fremd.js` und `../spiel-fremd/fremd.mjs` eingesetzt: **beide
führten zum erwarteten Exit 1 mit der Meldung zur Kerngrenze**. Nach
Rücknahme und Umstellung aller **99 Quelldateien auf CRLF** bestanden
beide Befehle erneut mit denselben 221 und 820 Behauptungen. Die
integrierte Gesamtkette wird beim Zusammenführen geprüft.

## 07.09.2026 — Der Ablauf auf `main` prüft, statt zu veröffentlichen

**Auftrag, wörtlich:** *„nach main"* — und der erste Stand, der `main`
je erreicht hat, machte den Ablauf sofort rot.

### Was gemessen wurde

`.github/workflows/pages.yml` wollte über die Umgebung `github-pages`
selbst veröffentlichen. Er hat es nie getan und konnte es nicht:

| Lauf | Zweig | Stand | Ergebnis | Dauer |
| --- | --- | --- | --- | --- |
| 34142713477 „Seite veröffentlichen" | `main` | 89ec19c | **failure** | **1 s** |
| 34137617843 „pages build and deployment" | `gh-pages` | ebe3b27 | **success** | 26 s |

Eine Sekunde, **kein einziger ausgeführter Schritt, kein Protokoll** —
das ist keine fehlgeschlagene Prüfung, das ist eine abgewiesene
Umgebung. Der Ablageort liefert die Seite aus dem Zweig `gh-pages` aus
(„Deploy from a branch"). Dann gehört `github-pages` allein dem
eingebauten Ablauf, und jeder fremde Anforderer wird abgewiesen, bevor
er beginnt. Die zweite Zeile der Tabelle ist der Gegenbeweis: derselbe
Weg, auf dem gerade veröffentlicht wurde, lief zur selben Stunde grün.

### Was jetzt dort steht

Der Ablauf heißt `kette.yml` und fährt genau eine Sache:
`node werkzeuge/pruefe-alles.mjs` auf einem fremden Rechner. Das ist der
Teil, der etwas beweist — die Kette läuft ohne die Werkstatt, in der der
Stand entstanden ist. Veröffentlicht wird weiterhin über `gh-pages`, und
zwar bewusst nicht mit dem ganzen Ordner, sondern mit den **63 Dateien**,
die ein Browser wirklich anfragt (von 121 im Ablageort).

Zwei Wege ins Netz wären zwei Wahrheiten gewesen.

### Ein zweiter falscher Verweis, derselbe wie in Regel 14

Der Kopf der Datei nannte `werkzeuge/pruefe-verweise.mjs` als den
Schritt, der Regel 14 („Alle Importpfade sind relativ") absichert — und
rief sie als eigenen Schritt noch einmal auf. Dieselbe Fehlannahme wie
in `docs/REGELN.md` 14, heute schon einmal berichtigt: Jene Datei hält
Markdown-Verweise gegen die Platte und sieht **keinen einzigen**
Importpfad. Bewiesen wird die Regel von `pruefe-einstieg.mjs` und
`pruefe-app.mjs`, und beide laufen in der Kette ohnehin mit. Der zweite
Aufruf prüfte nichts doppelt, er behauptete es nur.

**Kette auf diesem Stand: 43 von 43 grün.**

## 07.09.2026 — Abgründe in der Landschaft, und wer hineingestoßen wird, stürzt

**Auftrag, wörtlich:** *„unterschiedliche ebenen und auf jeder ebene
kann es wasserbecken oder sbruende [Abgründe] geben"* — Vorgang #8,
Schritt 4 von vier und damit der letzte. Schritt 2 hat den Abgrund als
Feldart gebaut, Schritt 3 das Wasser auf alle Ebenen gebracht; jetzt
kommen die Löcher **auf die Karte**, und man kann jemanden hineinstoßen.

**Für Jannik:** Auf hoch gelegenem Boden brechen jetzt Löcher auf —
gemessen **17,2 je Karte** auf einer 44 × 32-Karte, auf **29 von 30**
Karten. Man kann nicht hineinlaufen; man wird hineingestoßen. Was dann
passiert, hängt davon ab, ob unter dem Loch noch Boden liegt: **167 von
516** Löchern haben einen Grund — da schlägt man auf, verliert
Lebenspunkte und steht eine Ebene tiefer. Die anderen **349** sind
bodenlos, und wer hineinfällt, ist tot. Sehen kann man weiterhin
darüber hinweg: Ein Loch nimmt niemandem die Sicht.

### Neu in `spiel/landschaft.mjs`: `grabeAbgruende(karte, saat)`

Ein eigener Schritt, aufgerufen **nach** `setzeRampen` und **vor**
`setzeWasser`. Das ist gemessen der einzige Platz, an dem kein anderer
Schritt das Loch wieder zumauert: `raeumeAuf` macht die Insel im
Abgrund zu Wand, `verfuelleNebenraeume` verfüllte in der Messung 81 von
162 begehbaren Kacheln, `verbindeMitRampen` ebenso.

Ein Loch entsteht auf einer offenen Kachel ab Ebene 2 — das ist
`STURZ_AB_STUFEN` über dem Graben und damit die Höhe, ab der ein
Abstieg überhaupt ein Sturz ist. Wie tief es geht, entscheidet der Fels
ringsum, und daraus fallen zwei Sorten Abgrund:

- **am Kliffrand** liegt nebenan offener Boden mindestens zwei Ebenen
  tiefer; das Loch bricht dorthin durch, und dieser Boden ist das
  Landefeld;
- **mitten auf dem Plateau** gibt es keinen; dann geht der Schacht in
  den Fels und der Sturz ist tödlich.

Gewürfelt wird aus `hash(Feldnummer, Randebene, Saat)` mit eigener
Saatverschiebung — kein `Math.random` (Fehlerbuch B1), kein
verschobener Zufallsstrom (B4). Zwei Sätze: 0,09 auf freier Fläche,
**0,45 am Kliffrand**, weil Fels dort weiterbricht, wo er schon
abgebrochen ist — und weil nur ein Kliffloch einen Grund hat. Mit
gleichem Satz überall wären gemessen 353 von 391 Löchern bodenlos
(90 %), mit dem Kliffsatz 349 von 516 (68 %).

**Verworfen: das Rauschfeld.** Der erste Anlauf setzte die Löcher in
Flecken, wie `setzeBoden` den Knochenteppich. Gemessen war das
schlechter, und zwar an Janniks Satz selbst: Ein Rauschfleck liegt auf
**einem** Plateau, und ein Loch trägt die Ebene seiner Sohle — also
lagen die Löcher einer Karte fast alle auf derselben Ebene. Bei
vergleichbarer Lochzahl — gemessen am 07.09.2026 an der damaligen
Fassung: 16 von 30 Karten mit Abgründen auf zwei verschiedenen Ebenen
gegen **24 von 30** beim Wurf je Kachel. Dazu
schnitten Flecken doppelt so oft einen Weg ab (113 zurückgenommene
Löcher gegen 58).

### Jedes Loch einzeln gesetzt und im Zweifel zurückgenommen

Muster: `zierErlaubt`. Kachel probeweise sperren, fragen, im Zweifel
ablehnen — gefragt wird hier aber **global** statt in einem Fenster von
7 × 7. Das ist der Unterschied, der den Ausschlag gibt: Eine Kliffkante
ist genau die Stelle, an der die örtliche Frage falsch antwortet (den
Nachbarn zwei Ebenen tiefer erreicht man von oben, von unten nie), und
mit `zierErlaubt` als Probe blieben 11 von 30 Karten ohne jeden Abgrund
und 1,3 Löcher je Karte übrig.

Drei Fragen je Kachel, und jede hat eine gemessene Zahl:

| Frage | Ohne sie gemessen |
| --- | --- |
| Bleibt jede offene Kachel beidseitig erreichbar? | 3 von 30 Karten verlieren den Ausgang |
| Hat das Loch einen Sims (Nachbar genau 1 Ebene über der Sohle)? | 184 von 704 Löchern |
| Bleibt jede Geländefläche ≥ 3 Kacheln (`MIN_EBENEN_FLAECHE`)? | `pruefe-landschaft` (h) rot |

Insgesamt werden so **293** von 809 Kandidaten wieder zurückgenommen.

### Neu in `spiel/hoehen.mjs`: `abgrundHinter` und `abgrundSturz`

`stossZiel` bleibt **Wort für Wort**, wie es war. Es fragt `begehbar`
und damit `blocktBewegung`, und der Abgrund steht dort drin — das ist
richtig so: Wegfindung, Gegner-KI und Bild dürfen ein Loch nie für ein
Zielfeld halten. Wer den Sturz will, fragt ausdrücklich danach.

`abgrundSturz` legt fest, **wohin** die Figur fällt: nicht auf die
Abgrundkachel, sondern auf die offene Nachbarkachel auf Sohlenebene.
Der Grund steht ausführlich in der Datei: Eine Figur **auf** dem
Abgrundfeld stünde auf einer Kachel, die `wegSuche`,
`erreichbareFelder` und `naechstesFreiesFeld` nie betreten — sie käme
nie wieder heraus, und keine Prüfung schlüge an. Gibt es keine solche
Kachel, ist der Sturz tödlich. Der Schaden kommt unverändert aus
`sturzTiefe`/`sturzSchaden`; eine zweite Sturzregel gibt es nicht.

### Drei Stellen stoßen hinein, nicht zwei

`pruefeSchub` (darf ich?), `schiebe` (Stoß und Hakenkette) und
`stossFolgen` (Kriegshammer). Die Falle steht im Auftrag wörtlich:
*„Wird die Frage in pruefeSchub gestellt, aber nicht in schiebe,
entsteht eine Aktion, die erlaubt ist und nichts tut."* Genau dieser
Fall ist als Prüfung gebaut und wurde rot gemacht (siehe unten).

Der Tod im bodenlosen Schacht läuft über den **gewöhnlichen**
Schadensweg (`fuegeSchadenZu` beziehungsweise `schadenEintragen` mit den
restlichen Lebenspunkten) und nicht über ein eigenes `lebt = false`.
Sonst fehlte das Ereignis `gestorben`, das gelöschte Wacht-Recht oder
der Lauf-Abschluss — je nachdem, was man vergisst.

### Zwei fremde Prüfungen mitgeändert (R2-Ausnahme, ausdrücklich benannt)

Beide liegen in `werkzeuge/` und gehören dem Zweig `pruef/`. Die Kette
wird ohne sie nicht als Ganzes grün, deshalb die Ausnahme:

**1. `spiel/landschaft.mjs`, `ebenenFlaechen` zählt Abgründe nicht mit.**
Ein Abgrundfeld trägt die Ebene seiner Sohle. Zählte es als
Geländefläche mit, wäre jedes Loch mitten auf einem Plateau eine
Ebenenfläche von **einer** Kachel und damit genau der „Ausrutscher des
Rauschens", den `MIN_EBENEN_FLAECHE` verbietet — gemessen **573**
solcher Flächen über 60 Karten statt 0. Für alles vor `grabeAbgruende` ändert
sich nichts: Bis dahin gibt es keine Abgrundkachel.

**2. `werkzeuge/pruefe-app.mjs`: die Kampffrage steht jetzt auf zwei
Kerkern.** Sie fragt „trifft die Brut überhaupt auf die Jäger?" und
stand als `wieoft("angriff") > 3` auf **einer** Karte, der Saat 7.
Vorgang #8 verändert diese Karte. Gemessen über sechs Saaten
(7, 3, 11, 19, 23, 31), einmal ohne und einmal mit Abgründen:

    ohne : 7 ·  0 · 0 · 0 · 0 ·  9 → 16 Angriffe
    mit  : 0 · 25 · 0 · 0 · 0 · 29 → 54 Angriffe

Die Einzelzahl schwankt zwischen 0 und 29 und sagt über den Kampf
nichts; die Summe hat sich mehr als verdreifacht. Auf drei von sechs
Saaten wäre die alte Schranke auch **ohne** jede Änderung rot gewesen —
sie war ein Glücksfall der Saat 7, kein Fangnetz. Die Frage steht jetzt
auf den Saaten 7 **und** 31 zusammen, Schranke **10**, gemessen **29**.
Die Schranke ist damit **höher** als vorher, nicht niedriger. Aus
demselben Grund zählt auch die Zahl der Ereignisformen jetzt über beide
Kerker: Ohne einen einzigen Angriff fehlen `angriff`, `schaden`,
`gestorben` und `lpGesetzt`, und sie fiel auf Saat 7 von 12 auf 9. Über
beide Kerker sind es gemessen **15**, mit zerbrochener
Reichweitenrechnung 12 — die Schranke steht jetzt auf 13 statt auf 10.
Der zweite Lauf läuft ohne
Bild (`malen: false`): 2,3 s statt 9,9 s, bei Zeichen für Zeichen
denselben Ereigniszahlen.

### Gemessen — die Abnahme von Vorgang #8

`node werkzeuge/pruefe-abgrund.mjs`, 30 Saaten auf 44 × 32:

| Abnahme | Gemessen |
| --- | --- |
| (a) Becken **und** Abgrund auf mindestens zwei gleichen Ebenen | **16 von 30** Karten (auf mindestens einer: 28) |
| Karten mit Abgrund überhaupt | **29 von 30** (vorher: 0) |
| Karten mit Abgründen auf zwei verschiedenen Ebenen | **22 von 30** |
| (b) Sturzschaden und eine Ebene tiefer / Tod ohne Grund | beide Fälle geprüft, 167 mit Grund gegen 349 bodenlos |
| (c) Sicht über den Abgrund, Wand blockt — dieselbe Karte | von Hand **und** an einer erzeugten Karte |
| (d) Ausgang bleibt beidseitig erreichbar | **30 von 30** |

Warum (a) nicht höher liegt: Ein Abgrund trägt die Ebene seiner Sohle,
und eine Sohle liegt zwei Ebenen unter ihrem Rand — bei vier Ebenen
sind das nur die Sohlen 0 und 1. Wasser steht auf 0, 1 und 2. Die
Schnittmenge ist also von vornherein zwei Ebenen breit, und die Karte
muss beide bedienen. 27 von 30 Karten haben überhaupt hohes Gelände auf
Ebene 2 **und** 3; das ist die Obergrenze.

### Jede neue Prüfung war rot (Regel 10)

`werkzeuge/pruefe-abgrund.mjs` wuchs von 60 auf **124 Behauptungen**.

| Absichtlicher Fehler | Was die Prüfung meldete |
| --- | --- |
| `abgrundHinter` umgedreht (`if (karte.istAbgrund(…)) return null`) | 23 von 124 gefallen, u. a. „der Abgrund hinter dem Ziel wird gefunden" |
| `abgrundSturz` nimmt jede offene Nachbarkachel statt der auf Sohlenebene | 6 gefallen: „aber es gibt kein Landefeld: ist [object Object], soll null" |
| `schiebe` ruft `stossInsLoch` nicht auf (**die Falle aus dem Auftrag**) | 12 gefallen: „gestoßen wird wirklich: apGesetzt" — die Aktion bleibt erlaubt und tut nichts |
| `stossFolgen` ruft `stossInsLoch` nicht auf | 4 gefallen: „der Hammer stößt: apGesetzt, angriff, schaden" |
| `pruefeSchub` fragt nicht, wer auf dem Landefeld steht | 1 gefallen: „der Stoß wird abgelehnt: „null"" |
| `grabeAbgruende` gar nicht aufgerufen | 6 gefallen: „0 von 30 Karten tragen einen Abgrund (verlangt: 27)" |
| `traegtRingsum` abgeschaltet | „kein einziger der 704 Abgründe hat einen Sims: ist 346, soll 0" |
| Erreichbarkeitsprobe abgeschaltet | „(d) der Ausgang bleibt auf allen 30 Karten beidseitig erreichbar: ist 3, soll 0" |
| `MIN_EBENEN_FLAECHE`-Probe abgeschaltet | `pruefe-landschaft`: „(h) keine Ebenenfläche unter 3 Kacheln: ist 1, soll 0" |
| `inReichweite` gibt immer `false` | `pruefe-app`: „0 Angriffe auf den Saaten 7 und 31" und „12 verschiedene Ereignisformen" |

### Was bewusst **nicht** geändert wurde

- **`stossZiel`** — kein Zeichen. Wegfindung, Gegner-KI und Bild sehen
  denselben Stoß wie vorher.
- **Die Gegner-KI** sieht den Abgrund weiterhin als Wand: `schubGewinn`
  fragt `stossZiel` und bewertet einen Stoß ins Loch mit 0. Die Brut
  benutzt den Abgrund also nicht. Offener Punkt für den Auftraggeber.
- **Das Bild.** Wie ein Abgrund aussieht, steht in `runtime/` und ist
  seit Schritt 2 unverändert.
- **`MIN_EBENEN_FLAECHE`, `STURZ_AB_STUFEN`, `wasserMindestSee`** und
  jede andere Prüfmarke: keine gesenkt.

## 07.09.2026 — Wasserbecken auf jeder Ebene, nicht nur im Graben

**Auftrag, wörtlich:** *„unterschiedliche ebenen und auf jeder ebene
kann es wasserbecken oder sbruende [Abgründe] geben"* — Vorgang #8,
Schritt 3 von vier. Dieser Schritt bringt das **Wasser** auf alle
Ebenen. Abgründe setzt weiterhin niemand auf eine Karte, das ist
Schritt 4. Für Jannik heißt das: Bisher lag jede Pfütze ganz unten im
Graben — auf 60 nachgerechneten Karten kein einziges nasses Feld
weiter oben. Jetzt liegen auf **52 von 60 Karten** Seen auf
mindestens **zwei verschiedenen Höhen**.

### Was neu ist: `beckenGebiete(karte)`

Eine reine Abfrage in `spiel/kachelhilfe.mjs`. Sie liefert die
**Becken** einer Karte, und ein Becken hat zwei Teile:

- den **Boden** — ein zusammenhängendes offenes Gebiet gleicher Ebene,
  dessen sämtliche offenen Nachbarn **höher** liegen. Dort kann Wasser
  nicht ablaufen;
- den **Rand** — die angrenzenden höheren offenen Kacheln, jede genau
  einmal. Von dort schaut man hinein und dorthin klettert man heraus;
  Schritt 4 braucht ihn für den Stoß.

Sie ändert nichts an der Karte und fragt über `gebiete()`, den einen
Flutfüller dieser Datei. Eine eigene Nachbarschleife wäre eine zweite
Reihenfolge gewesen, und zwei Rechner nummerierten ihre Becken
verschieden (Fehlerbuch B2).

**Warum in `kachelhilfe.mjs` und nicht in `landschaft.mjs`:** Gefragt
wird sie von `spiel/ausstattung.mjs`. Stünde sie in der Landschaft,
holte die Ausstattung sie aus der Landschaft — die die Ausstattung
ihrerseits aufruft. Das ist genau der **Ringschluss**, wegen dessen
`kachelhilfe.mjs` überhaupt existiert; im Bündler
(`werkzeuge/eine-datei.mjs`) bricht er ab. Die Begründung steht als
eigener Abschnitt in der Kopfnotiz der Datei.

### `setzeWasser` fragt nicht mehr nach der Ebene

`spiel/ausstattung.mjs` band das Wasser bisher hart an
`EBENE_GRABEN`, also an die Zahl 0. Das war falsch herum gedacht:
Nicht die *Zahl* einer Ebene macht eine Mulde, sondern dass es von ihr
aus nur hinauf geht. Ein Kessel auf Ebene 2 ist genauso ein Becken wie
der Graben — er ist nur höher. Die Mindestgröße `wasserMindestSee`
(6 Kacheln) gilt unverändert weiter, sonst stünden einzelne nasse
Kacheln im Trockenen.

Ein See liegt weiterhin ganz auf **einer** Ebene, und das ist kein
Zufall: Zwei Becken sind nie benachbart, denn das tiefere wäre ein
Nachbar des höheren — und der höhere damit kein Becken mehr.

### Die Zusage (j) ist ersetzt, nicht gelöscht

`werkzeuge/pruefe-landschaft.mjs` versprach bisher *„(j) jedes
Wasserfeld liegt in Ebene 0"*. Dieser Satz wird durch diese Aufgabe
falsch. Er ist **nicht** gestrichen, sondern durch die **stärkere**
Zusage ersetzt: *„(j) jedes Wasserfeld liegt auf einem Beckenboden —
alle offenen Nachbarn liegen höher."* Ebene 0 war eine Zahl; ein
Beckenboden ist eine Aussage über die Nachbarn und schließt die alte
Zusage für den Graben mit ein. Die Zeilenzahl der Datei steigt dabei
von 990 auf **997** — die Grenze liegt bei 1000.

### Neue Prüfung: `werkzeuge/pruefe-becken.mjs`

**20 Behauptungen**, eine eigene Datei, weil `pruefe-landschaft.mjs`
keine zehn Zeilen Luft mehr hat. Zwei Teile:

1. **Ein Saal von Hand**, in dem beide Regeln verschieden antworten:
   eine Mulde auf Ebene 1, vom Hochland (Ebene 2) umschlossen, und ein
   Graben auf Ebene 0. Die Mulde ist ein Becken — die alte Regel hätte
   sie übersehen. Die große Fläche auf Ebene 1 ist **keines**, obwohl
   sie ans Hochland grenzt: Der Graben ist ihr tieferer Nachbar, das
   Wasser liefe ab. Eine Regel *„irgendein Nachbar liegt höher"* wäre
   hier grün und trotzdem falsch. Dazu die Randzahlen **10** und **9**,
   von Hand über die beiden Richtungstabellen nachgezählt: Auf dem
   Quadratraster hätte die Mulde acht Randkacheln, auf Versatzzeilen
   sind es zehn.
2. **Dreißig erzeugte Karten** 44 × 32. Gezählt wird, auf wie vielen
   verschiedenen Ebenen Wasser steht. **Gemessen: 27 von 30** haben
   Wasser auf mindestens zwei Ebenen (über 60 Saaten: 52). **Die
   Schwelle steht bei 20 von 30**, also zwei Dritteln — sieben Karten
   Abstand, weil kein einzelner Kerker bestellt ist, sondern der
   Anteil; und nicht tiefer, weil die Hälfte keine „überwiegende
   Mehrheit" mehr wäre. Die alte Regel liefert **0 von 30**, fällt hier
   also um zwanzig Karten durch und nicht um eine.

**Zweimal absichtlich rot gemacht (Regel 10), beide Male
zurückgenommen:**

1. `setzeWasser` wieder auf Ebene 0 festgenagelt (`|| b.ebene !== 0`)
   — `pruefe-becken.mjs` meldet **3 von 20 gefallen**, wörtlich: *„auf
   0 von 30 Karten steht Wasser auf mindestens zwei Ebenen (verlangt:
   20)"*, *„auf jeder der 30 Karten steht überhaupt Wasser: ist 2, soll
   0"* und *„über den ganzen Lauf tragen 1 verschiedene Ebenen Wasser"*.
2. `setzeWasser` zusätzlich den **Rand** nass machen lassen — die neue
   Zusage (j) in `pruefe-landschaft.mjs` meldet **ist 3781, soll 0**.
   Ohne diesen zweiten Versuch wäre nicht bewiesen, dass (j) den
   Beckenboden wirklich prüft und nicht bloß mitzählt. Nebenbei fiel
   dort auch (k) — zu viel Wasser lässt zu wenige Wandfelder für
   Fackeln übrig.

### Die gemessenen Nebenwirkungen

Mehr Wasser heißt: weniger trockene Kacheln für die Startfelder und
längere Wege, weil Wasser mit `WASSER_ZUSCHLAG` zählt. Beides wurde
vorher und nachher gemessen, keines wirft:

| | vorher | jetzt |
| --- | --- | --- |
| Wasserkacheln je Karte (60 Saaten) | 71,0 | **122,3** |
| Wasser je Ebene 0/1/2/3 (60 Saaten) | 4259/0/0/0 | **4259/2840/239/0** |
| Karten mit Wasser auf ≥ 2 Ebenen | 0 von 60 | **52 von 60** |
| Seen je Karte | 2,7 | **4,9** |
| trockene offene Kacheln je Karte (20 Saaten) | 426,6 | **369,6** |
| Laufkosten zum Ausgang (20 Saaten) | 48,5 | **54,5** |
| kleinste erlaubte Karte 20 × 20, 4 Jäger, 40 Saaten | 40 gebaut, 0 Fehler | **40 gebaut, 0 Fehler** |
| schlimmste Fackeldichte (erlaubt: 40) | 30,3 | 30,3 |

Ebene 3 bleibt trocken, und das ist kein Fehler: Sie ist die höchste,
ein Becken dort müsste ringsum noch höhere Nachbarn haben. Ein
eingemauerter Hohlraum wäre einer — den gibt es auf einer erzeugten
Karte nicht, weil dort jede offene Kachel erreichbar sein muss.

### Eine Fremdänderung (Ausnahme zu Regel 2)

`werkzeuge/pruefe-landschaft.mjs` und die neue
`werkzeuge/pruefe-becken.mjs` gehören nach der Systemtabelle auf
`pruef/`, nicht auf `kern/`. Sie mussten mit auf diesen Zweig, weil die
Kette sonst als Ganzes rot bliebe: Zusage (j) behauptet wörtlich das
Gegenteil dessen, was die Aufgabe verlangt. Die Änderung dort ist auf
das Nötige beschränkt — die eine Zusage und der Import dazu.

### Die Zahlen

```bash
node werkzeuge/pruefe-alles.mjs      # 41 → 42 Prüfungen, alle grün
node werkzeuge/pruefe-becken.mjs     # 20 Behauptungen, 3,6 s
node werkzeuge/pruefe-landschaft.mjs # 139 Behauptungen
```

Wasser je Ebene, Karten mit zwei nassen Ebenen und Wasser je Karte:

```bash
node --input-type=module -e 'import { baueLandschaft } from "./spiel/landschaft.mjs";
import { FLUESSIG } from "./spiel/gitter.mjs";
const je = [0, 0, 0, 0]; let zwei = 0, nass = 0;
for (let s = 1; s <= 60; s++) {
  const k = baueLandschaft({ saat: s, breite: 44, hoehe: 32 });
  const e = new Set();
  for (let i = 0; i < k.anzahl; i++) if (k.fluessig[i] === FLUESSIG.wasser) {
    je[k.ebene[i]]++; nass++; e.add(k.ebene[i]); }
  if (e.size >= 2) zwei++;
}
console.log(je.join(" / "), "|", zwei, "|", (nass / 60).toFixed(1));'
```

Trockene Kacheln, Ausgangsentfernung und die kleinste erlaubte Karte:

```bash
node --input-type=module -e 'import { baueLandschaft } from "./spiel/landschaft.mjs";
import { laufKostenFeld } from "./spiel/erreichbarkeit.mjs";
import { FLUESSIG, BLOCKT_BEWEGUNG } from "./spiel/gitter.mjs";
let trocken = 0, kosten = 0;
for (let s = 1; s <= 20; s++) {
  const k = baueLandschaft({ saat: s, breite: 44, hoehe: 32, spielerZahl: 2 });
  const f = laufKostenFeld(k, k.starts);
  for (let i = 0; i < k.anzahl; i++) {
    if (!BLOCKT_BEWEGUNG.has(k.hindernis[i]) && k.fluessig[i] === FLUESSIG.keine) trocken++;
  }
  kosten += f[k.index(k.ausgang.x, k.ausgang.y)];
}
let gebaut = 0;
for (let s = 1; s <= 40; s++) {
  try { baueLandschaft({ saat: s, breite: 20, hoehe: 20, spielerZahl: 4 }); gebaut++; }
  catch { /* gezählt wird, was durchkommt */ }
}
console.log((trocken / 20).toFixed(1), (kosten / 20).toFixed(1), gebaut);'
```

**Was bewusst nicht geändert wurde:** `spiel/hoehen.mjs` (der
Wasserzuschlag bleibt, wie er ist), `spiel/gitter.mjs` (kein neuer
Feldwert), `runtime/` (Wasser wird gezeichnet wie bisher, nur öfter),
und `waehleStarts` — es meidet nasse Kacheln nach derselben Regel wie
zuvor, sie fällt bloß häufiger aus.

## 07.09.2026 — Der Abgrund ist eine eigene Feldart

**Auftrag, wörtlich:** *„unterschiedliche ebenen und auf jeder ebene
kann es wasserbecken oder sbruende [Abgründe] geben"* — Vorgang #8,
Schritt 2 von vier. Dieser Schritt gibt dem Abgrund einen Platz im
Raster. **Auf eine erzeugte Karte gesetzt wird noch keiner** — das ist
Schritt 3 —, und was mit einer hineingestoßenen Figur geschieht,
entscheidet Schritt 4. Für Jannik heißt das: Im Spiel ist heute noch
nichts zu sehen; das Spielbrett kennt jetzt bloß das Wort „Loch".

### Was neu ist

`HINDERNIS.abgrund = 11` in `spiel/gitter.mjs`, **unten angehängt** —
gespeicherte Läufe tragen die Zahlen und nicht die Namen, ein Wert
dazwischen hätte jeden alten Sarg umbenannt. Dazu die Frage
`karte.istAbgrund(x, y)` neben `blocktBewegung`, damit nicht vier
Module denselben Zahlenvergleich selbst schreiben.

**Gemessen an den vier Mengen** (Befehl im Abschnitt „Die Zahlen"):

| | vorher | jetzt |
| --- | --- | --- |
| Hindernisarten | 11 | **12** |
| höchster Wert | 10 | **11** |
| `BLOCKT_BEWEGUNG` | 9 | **10** |
| `BLOCKT_SICHT` | 2 | 2 |
| `GIBT_DECKUNG` | 7 | 7 |
| `ZERSTOERBAR` | 3 | 3 |
| hält auf, ohne Sicht zu nehmen **oder** Deckung zu geben | 0 | **1** |

Die letzte Zeile ist der eigentliche Inhalt dieses Schritts. Bewegung
blocken und Sicht nicht, das konnten Fass, Kiste, Altar, Gitter,
Fackelsockel, Sarg und Truhe längst — aber alle sieben geben zugleich
Deckung. Was aufhielt, war bisher **immer** auch etwas, wohinter man
sich duckt. Der Abgrund ist der erste Wert, der aufhält und weder das
eine noch das andere tut. Warum er in keiner der drei anderen Mengen
steht, ist mit je einem Satz **über** der Menge begründet, nicht im
Changelog: Dort sucht es der Nächste, der sie „aufräumen" will.

### Die Sturzregel steht als Begründung im Code

**Ein Abgrundfeld trägt in der Reihe `ebene` die Ebene seiner SOHLE,
nicht die des Randes.** Die Entscheidung steht in `spiel/hoehen.mjs`
direkt über `sturzTiefe`, weil die beiden Funktionen darunter von ihr
leben: Trüge das Loch die Ebene seines Randes, wäre die Differenz 0 und
ein Sturz hinein täte **keinen** Schaden. So rechnen `sturzTiefe` und
`sturzSchaden` unverändert richtig — Rand auf Ebene 3, Sohle auf Ebene
1 sind zwei Stufen und damit 3 Schaden. Und weil `ebene` eine der fünf
Reihen ist, die `karte.summe()` hasht, fällt die Sohle nicht aus der
Desync-Erkennung heraus, wie es eine Nebenliste täte.

### Der Abgrund sieht nicht aus wie Boden

Im Bild (`runtime/zeichnen.js`) ist er kein Sprite, sondern eine eigene
dunkle Fläche mit heller Nordkante — derselbe Bau wie die Wand, nur
andersherum: Die Wand ist ein Klotz nach oben, das Loch eine Öffnung
nach unten. Ohne das bliebe das Feld schlicht Boden, und ein Loch, das
aussieht wie Boden, ist die gefährlichste Fassung, die es hier gibt.
In der Textkarte (`werkzeuge/karte-zeigen.mjs`) steht er als `▓`, samt
Legende. Das große Bild — Tiefenverlauf, ausgefranste Ränder — ist
Vorgang #9 und ausdrücklich nicht hier.

**Auf der Zeichenfläche nachgezählt:** Ein Fenster über einer leeren
Karte erzeugt **282 Rechtecke**, dieselbe Karte mit einem Abgrund auf
einem einzigen Feld **286** — und **5** davon kommen im Bodenbild gar
nicht vor, darunter eine volle Kachel 16×16 in `#07060c` und die
1 Bildpunkt hohe helle Kante in `#5a5270`. Wäre der Abgrund ohne eigene
Fläche geblieben, stünde hier dreimal dieselbe Zahl.

```bash
node --input-type=module -e 'import { macheKarte, HINDERNIS } from "./spiel/gitter.mjs";
import { macheZeichner } from "./runtime/zeichnen.js";
import { macheKamera } from "./runtime/kamera.js";
const male = (h) => { const k = macheKarte(20, 20); const a = []; let f = "";
  if (h !== null) k.setze(10, 10, { hindernis: h, ebene: 0 });
  const ctx = { canvas: { width: 320, height: 180 }, imageSmoothingEnabled: false,
    globalCompositeOperation: "", set fillStyle(v) { f = v; }, get fillStyle() { return f; },
    fillRect: (x, y, b, g) => a.push(`${x},${y},${b},${g},${f}`) };
  macheZeichner({ ctx, kamera: macheKamera({ fensterBreite: 320, fensterHoehe: 180, karte: k }) })
    .zeichneWelt(k, null, null, 0); return a; };
const boden = male(null), loch = male(HINDERNIS.abgrund);
console.log(boden.length, loch.length, loch.filter(z => !boden.includes(z)).length);'
```

### Neue Prüfung: `werkzeuge/pruefe-abgrund.mjs`

Eine eigene Datei, weil `pruefe-landschaft.mjs` mit 990 Zeilen nur noch
10 Zeilen Luft unter der 1000-Zeilen-Grenze hat. **60 Behauptungen** auf
**einer** von Hand gebauten Karte mit Wänden und Höhen — eine Karte und
nicht zwei, weil „über den Abgrund sieht man" und „durch die Wand
nicht" sonst zwei Aussagen über zwei verschiedene Welten wären.
Geprüft wird dasselbe Feld, dreimal verschieden belegt.

Zwei Vorkehrungen, damit die Prüfung den Fall misst, der ohne diese
Arbeit falsch wäre, und nicht den, der ohnehin gewinnt:

- Die Sohle des Prüf-Abgrunds liegt bei den Begehbarkeitsfragen nur
  **eine** Ebene tiefer. Zwei Ebenen wären ein Sturz, und Stürze sind
  ohnehin kein Weg — die Prüfung bestünde dann auch ohne den Eintrag in
  `BLOCKT_BEWEGUNG`.
- Bei der Wegfindung läuft die Suche mit `stuerzeErlaubt`, und die
  Sohle liegt dort sogar auf Höhe des Randes. Sonst hielte schon die
  Rampenregel die Figur im Loch fest — aus einer Grube klettert man
  ohne Rampe nicht heraus —, und gemessen wäre die Rampenregel.

**Dreimal absichtlich rot gemacht (Regel 10), jedes Mal
zurückgenommen:**

1. `HINDERNIS.abgrund` in `BLOCKT_SICHT` geschrieben — **7 von 60
   gefallen**, darunter wörtlich: *„3 · Sicht über den Abgrund → über
   den Abgrund hinweg ist die Sicht frei"* und *„4 · Sicht vom Podest →
   von Podest zu Podest über die Sohle hinweg ist die Sicht frei"*.
2. `HINDERNIS.abgrund` aus `BLOCKT_BEWEGUNG` entfernt — **21 von 60
   gefallen**, darunter alle zwölf Richtungen und wörtlich: *„6 ·
   Wegfindung → durch die einzige Lücke, in der ein Abgrund liegt,
   führt kein Weg: ist [object Object], soll null"* und *„6 ·
   Wegfindung → kein Feld des Weges ist ein Abgrund: ist 1, soll 0"*.
3. `HINDERNIS.abgrund` in `GIBT_DECKUNG` geschrieben — **3 von 60
   gefallen**, wörtlich: *„1 · Der Wert → genau ein Hindernis hält auf,
   ohne Sicht zu nehmen oder Deckung zu geben: ist 0, soll 1"*.

Ein vierter Versuch — `istAbgrund` auf `HINDERNIS.gitter` verbogen —
warf nur **1 von 60** um. Das ist notiert, nicht schöngeredet: Die
Wegfindungsfragen filtern mit `istAbgrund`, und ein Filter, der nie
etwas findet, findet auch nichts Falsches. Deshalb fragt der Abschnitt
zusätzlich den Feldindex direkt ab.

### Zwei Fremdänderungen (Ausnahme zu Regel 2)

Beide liegen außerhalb von `kern/` und mussten mit auf diesen Zweig,
weil die Kette sonst als Ganzes rot bliebe:

- **`werkzeuge/karte-zeigen.mjs`** (`werk/`): das Zeichen `▓` und die
  Legendenzeile. Ohne Eintrag druckte das Werkzeug ein `?`, und
  `pruefe-karte-zeigen.mjs` verbietet unbekannte Zeichen im Bild.
- **`werkzeuge/pruefe-kopfnotiz.mjs`** (`pruef/`): Die bekannte
  Abweichung für `spiel/gitter.mjs` nannte Zeile **134**; der Abgrund
  hat 24 Zeilen darüber eingefügt, die Zeile steht jetzt auf **158**.
  Die Zeile selbst ist unverändert (101 Zeichen), nur ihre Nummer
  wandert. Genau dafür ist die Liste da — der Nagel wird nachgezogen,
  die Regel bleibt stehen.

`runtime/zeichnen.js` (`bild/`) ist die dritte fremde Datei, aber keine
Ausnahme im selben Sinn: `pruefe-zeichnen.mjs` verlangt zu jedem
Hindernis einen Eintrag in `DING_NAMEN`, und ohne ihn wäre die Kette
sofort rot.

### Die Zahlen

```bash
node werkzeuge/pruefe-alles.mjs        # 40 → 41 Prüfungen, alle grün
node werkzeuge/pruefe-abgrund.mjs      # 60 Behauptungen
```

Die vier Mengen zählt:

```bash
node --input-type=module -e 'import { HINDERNIS, BLOCKT_BEWEGUNG,
  BLOCKT_SICHT, GIBT_DECKUNG, ZERSTOERBAR } from "./spiel/gitter.mjs";
const nurBew = [...BLOCKT_BEWEGUNG].filter(w => !BLOCKT_SICHT.has(w));
console.log(Object.keys(HINDERNIS).length, Math.max(...Object.values(HINDERNIS)),
  BLOCKT_BEWEGUNG.size, BLOCKT_SICHT.size, GIBT_DECKUNG.size, ZERSTOERBAR.size,
  nurBew.filter(w => !GIBT_DECKUNG.has(w)).length);'
```

**Umbau ohne sichtbare Änderung, byteweise bewiesen (Regel 12).** Es
setzt noch niemand einen Abgrund, also darf sich an erzeugten Karten
**nichts** ändern:

```bash
node --input-type=module -e 'import { baueLandschaft } from "./spiel/landschaft.mjs";
const s = []; for (let i = 1; i <= 20; i++)
  s.push(baueLandschaft({ saat: i, breite: 48, hoehe: 32 }).summe());
console.log(s.join(","));'
```

Zwanzig Saaten, zwanzig Prüfsummen — vor und nach dieser Änderung
Zeichen für Zeichen dieselben, Saat 1 zum Beispiel **2740303601**.
Dazu über dieselben zwanzig Karten **11.558 begehbare Kacheln** vorher
wie nachher, und auf Saat 1 **2.070 freie Sichtpaare** vorher wie
nachher.

### Was bewusst nicht geändert wurde

`spiel/landschaft.mjs` und `spiel/ausstattung.mjs` — dort entstehen die
Abgründe und die Wasserbecken auf mehreren Ebenen, und das ist Schritt
3. `spiel/aktionen.mjs` und `spiel/kampf.mjs` — der Stoß in den Abgrund
ist Schritt 4. `stossZiel` gibt heute für ein Abgrundfeld noch `null`,
weil es `begehbar` fragt; das ist so gewollt und wird dort geändert,
wo die Sturzregel für Figuren entsteht.

## 07.09.2026 — Der Stoß rechnet endlich auch auf dem Sechseck

**Auftrag, wörtlich:** *„unterschiedliche ebenen und auf jeder ebene
kann es wasserbecken oder sbruende [Abgründe] geben"* — Vorgang #8,
Schritt 1 von vier. Reine Fehlerbehebung, kein Inhalt: Ohne einen
Stoß, der auf dem Sechseck stimmt, kann die Abnahme *„eine Figur, die
in einen Abgrund gestoßen wird, nimmt Sturzschaden"* gar nicht
funktionieren.

### Was falsch war

`stossZiel` (`spiel/hoehen.mjs`) war beim Sechseck-Umbau am selben Tag
**übersehen** worden und rechnete als einzige Funktion des Kerns noch
mit `Math.abs`/`Math.sign` auf Versatzzeilen — also im Quadratraster.

**Gemessen über alle sechs Richtungen auf beiden Zeilenparitäten —
12 Fälle, vorher 4 richtig, jetzt 12.** Die vier Fehlschläge landeten
auf einem um eine Richtung versetzten Feld, vier weitere gaben `null`,
stießen also gar nicht. Richtig waren nur Ost und West: Sie bleiben in
derselben Zeile, und nur dort kennt `Math.sign` den Versatz nicht
falsch. Befehl: `node werkzeuge/pruefe-hoehen.mjs`.

Dazu zwei Folgefehler derselben Herkunft:

- **Der gespiegelte Punkt.** `spiel/aktionen.mjs` und
  `spiel/gegner-ki.mjs` spiegelten für das *Ziehen* mit `2 * ziel - aus`.
  Das stimmt auf dem Sechseck nur, wenn beide Zeilen dieselbe Parität
  haben: Von (5,5) aus liegt der Südost-Nachbar bei (6,6), gespiegelt
  ergäbe das (4,4) — und (4,4) ist von (5,5) aus gar kein Nachbar. Neu
  ist `gespiegelt()` in `spiel/gitter.mjs`, das in Würfelkoordinaten
  rechnet; alle drei Stellen benutzen jetzt dieselbe.
- **Eine Klammer ohne Funktion.** In `spiel/gegner-ki.mjs` stand
  `if (schub > 0 &&(x, y, ziel.x, ziel.y) === 1)`. Beim Umbau war der
  Name `schussweite` entfallen, die Klammer blieb stehen — übrig war
  eine Kommaliste, die `ziel.y` liefert. Die Gegner-KI verglich also
  die **Zeile des Ziels** mit 1. Gemessen an einer Karte mit
  identischer Geometrie: derselbe Stoßplatz war in Zeile 1 **970** wert,
  in den Zeilen 3, 5 und 7 nur **270**. Jetzt `abstand(...) === 1`.

### Was das im Spiel ändert

Die Brut sieht die Kante wieder. Voller Lauf,
`node werkzeuge/pruefe-lauf.mjs`:

| | vorher | jetzt |
| --- | --- | --- |
| Stöße | 8 | **12** |
| Angriffe | 82 | **88** |
| Schaden | 198 | 183 |
| Gefallene | 6 | 5 |

Dreißig Runden zu viert auf Saat 7 (`node werkzeuge/pruefe-app.mjs`):
**764 → 757 Aktionen, 14 → 7 Angriffe**. Die Brut läuft nicht mehr
blind in den Nahkampf, sondern stellt sich an die Kante. Dreißig
Runden im Netz auf Saat 5 (`node werkzeuge/pruefe-netz.mjs`):
**3 → 4 Stöße, 36 → 38 Angriffe.**

### Zwei Prüfungen in fremden Systemen (Ausnahme zu Regel 2)

Beide liegen in `pruef/`, mussten aber mit auf diesen Zweig, weil die
Kette sonst als Ganzes rot bliebe:

- **`werkzeuge/pruefe-hoehen.mjs`** trägt zwei neue Prüfungen, jede über
  alle sechs Richtungen auf beiden Zeilenparitäten.
  - *Der Stoß.* **Rot gemacht ohne Kunstgriff** — sie war beim ersten
    Lauf gegen den unveränderten Code rot, 8 von 12 Lagen fielen, und
    meldete *„Stoß → Zeile 6: von suedost gestoßen fliegt man nach
    nordwest: ist {"x":8,"y":5} soll {"x":7,"y":5}"*.
  - *Der Zug.* Prüft die Verkettung `gespiegelt` + `stossZiel`, also
    genau das, was `aktionen.mjs` baut. **Rot gemacht**, indem
    `gespiegelt` wieder auf `2 * ziel - aus` gesetzt wurde: 8 von 12
    Lagen fielen, gemeldet *„Zeile 7: nach suedwest gezogen landet man
    beim Angreifer: ist {"x":9,"y":8} soll {"x":8,"y":8}"*.

  Drei alte Behauptungen schrieben die Quadratantwort fest und wurden
  auf die gemessene Sechseckwirklichkeit umgeschrieben (aus „von Süden
  nach Norden" wurde „von Südwest nach Nordost"). **149 → 174
  Behauptungen.**
- **`werkzeuge/pruefe-app.mjs`** verlangte über dreißig Runden mehr als
  10 Angriffe — eine Zahl, die an der Brut gemessen war, die nicht
  stoßen konnte. Sie steht jetzt bei 3, mit der Begründung im Kommentar:
  Sie soll den leeren Lauf fangen, nicht die Laune der Gegner-KI
  einfrieren. Gemessen sind es 7.

**Kette: `node werkzeuge/pruefe-alles.mjs` — 40 von 40 grün.**
## 07.09.2026 — Körnung im Fels: keine zwei Wandfelder mehr gleich

**Auftrag, wörtlich:** *„die welt soll grafisch und engine mäßig schon
so aussehen und aufgebaut sein wie mein ‚granit höhle' ‚Scotophobia'"* —
Merkmal 3 der Abnahme von Vorgang #9, wörtlich: *„Körnung im Fels. Zwei
benachbarte Wandfelder derselben Art sind nie exakt derselbe Farbwert."*

Eine Felswand war bis heute eine lackierte Fläche: **2.608 von 2.608**
benachbarten Wandpaaren gleicher Ebene trugen exakt denselben Farbwert.
Jetzt sind es **0 von 2.608**.

### Die Messungen

Alle an derselben Karte (Saat 4711, 56 × 40 Felder) und demselben
Fenster (1920 × 1080), abgelesen an der **wirklich gezeichneten** Farbe
über ein mitschreibendes Zeichenblatt:

| Was | vorher | nachher |
| --- | --- | --- |
| farbgleiche Nachbarpaare gleicher Ebene | 2.608 von 2.608 = 100,00 % | 0 von 2.608 = 0,00 % |
| gezeichnete Oberseitentöne im Bild | 4 | 24 |
| Rechtecke je Weltbild | 4.431 | 4.431 |
| Zeit je `zeichneWelt()` | 1,028 ms | 0,972 ms |
| Prüfkette | 40 Prüfungen, 12.302 Behauptungen | 41 Prüfungen, 12.371 Behauptungen |

Die Zeit ist das Kleinste aus zwanzig Runden zu je 500 Bildern — der
Median wandert mit der Last der Maschine, das Minimum nicht. Dass sie
**sinkt**, obwohl je Wandfeld eine Stufe dazukommt, liegt an einer
flachen Merkreihe für die 48 Wandtöne (vier Ebenen × zwei Seiten ×
sechs Stufen): Sie spart je Wandfeld zwei zusammengesetzte
Zeichenketten-Schlüssel und zahlt damit die Körnung mehr als zurück.

### Warum sechs Stufen und warum 7 von 255

Die Stufe ist **Dreifärbung mal Zwischenstufen**: `(wx − wz)` modulo 3
aus den Würfelkoordinaten des Sechseckgitters, dazu ein Zittern aus den
oberen acht Hashbits. Zwei benachbarte Sechsecke liegen nie im selben
Drittel — gemessen **0 von 238.402** Nachbarschaften auf 200 × 200
Feldern. Damit ist „nie gleich wie der Nachbar" garantiert und nicht
gewürfelt: Ersetzt man die Dreifärbung durch einen freien Wurf über
sechs Stufen, sind es sofort wieder **292 von 1.847** Wandpaaren im
Bild, also 15,8 %.

Die Spanne von **7 von 255** steht zwischen zwei gemessenen Schranken.
Nach oben: Der engste Ebenenabstand im Fels sitzt an der Wand-Flanke
mit **11,65**; bei 7 bleiben davon 4,65 frei, und an der Oberseite
(28,43) sogar 21,43 — die Ebenen berühren sich nicht. Nach unten: Die
multiplizierende Lichtlage frisst Kleines auf, ab Lichtstufe 2/7
überlebt erst ein Abstand von 2. Deshalb ist der Sprung **zwischen zwei
Dreifärbungs-Bändern** genau 2,0 groß — und nur der zählt, weil nur er
zwischen Nachbarn liegt.

Die Zahl ist eine Rec.-709-Zahl. `koernungsTon` verschiebt r, g und b
um denselben Betrag, und weil sich die drei Rec.-709-Gewichte zu 1
summieren, ist der Rec.-709-Versatz genau dieser Betrag. Über einen
einzelnen Kanal wäre man um bis zum Vierzehnfachen daneben: 7 Punkte
auf Blau (Gewicht 0,0722) sind 0,5 Punkte Rec. 709.

### Wie die neuen Prüfungen rot gemacht wurden

`werkzeuge/pruefe-koernung.mjs` ist neu (58 Behauptungen) und war
dreimal absichtlich rot:

1. `KOERNUNG_SPANNE = 0` → 13 von 58 gefallen, darunter *„kein
   Nachbarpaar trägt dieselbe Oberseite — zuerst 0,0 und 1,0 beide
   #433d54: ist 1847, soll 0"*.
2. Dreifärbung durch einen freien Wurf ersetzt → 4 gefallen, darunter
   *„kein Nachbarpaar teilt ein Band — das ist die Garantie: ist 79158,
   soll 0"*.
3. `KOERNUNG_SPANNE = 14` → 3 gefallen, darunter *„Flanke: die Körnung
   (14) bleibt unter dem Ebenenabstand (11.65 von 255)"*.

Die vier farbgenauen Behauptungen in `werkzeuge/pruefe-zeichnen.mjs`
(„genau ein Rechteck in exakt `wandTon(1, false)`") sind **nicht
gelöscht**, sondern auf die Wandfamilie umgestellt: ein Rec.-709-Fenster
von einer halben Spanne um den Grundton. Dass daraus kein Fenster
geworden ist, das alles schluckt, steht als Gegenprobe daneben — ohne
Wand findet es nichts. Beides wurde rot gemacht: `zeichneWand`
abgeschaltet → *„die Wand hat eine Oberseite aus der Wandfamilie: ist 0,
soll 1"*; Fenster auf 100 geweitet → *„ohne Wand findet das Fenster
keine Oberseite: ist 1, soll 0"*.

### Was dabei aufgefallen ist — und nicht geändert wurde

Eine Wand auf **Ebene 0** trennt Oberseite und Flanke nur um **20,78**
von 255; Fehlerbuch D3 verlangt für zwei Töne in einem Ding 24. Das war
schon vorher so und hat mit der Körnung nichts zu tun — sie verschiebt
den Abstand um 0,00 Punkte, weil Oberseite und Flanke dieselbe Stufe
bekommen. `werkzeuge/pruefe-zeichnen.mjs` misst nur Ebene 1 (37,6) und
war deshalb grün. Hier bleibt es eine Meldung, keine Änderung: Ebene 0
ist der Graben, und ob dort eine Wand steht, entscheidet die Palette.

Der **Boden bekommt keine Körnung**. Er trägt schon das Schachbrett aus
Grund- und Zweitton, und daran sieht man beim Laufen die eigene
Bewegung — von 1.407 benachbarten Bodenpaaren gleicher Art und Ebene
sind auf derselben Karte nur 437 farbgleich, also 31,1 %. Ob dort
zusätzlich gekörnt wird, ist eine eigene Entscheidung von Jannik.
## 07.09.2026 — Drei der fünf Scotophobia-Merkmale sind bewiesen statt behauptet

**Abnahme von #9, wörtlich:** *„Fünf benannte, prüfbare Merkmale sind
grün — Licht in mindestens fünf Stufen, farbige Quellen mischen sich,
Körnung im Fels, harte Kanten, Vorlauf im selben Ton."*

Die Merkmale **1, 2 und 4** waren schon wahr — es fehlte der Beweis.
Deshalb wurde **keine Zeile Zeichencode geändert**: `git diff --stat`
gegen `kern/sechseck` zeigt **drei** Dateien, und keine davon liegt
unter `runtime/` oder `spiel/`. Was sich ändert, sind die Prüfungen.

Gemessen mit `node werkzeuge/pruefe-bild.mjs` und
`node werkzeuge/pruefe-zeichnen.mjs`: **147 statt 138** Behauptungen im
Licht, **145 statt 104** im Weltzeichner.

### Merkmal 1 — „Licht in mindestens fünf Stufen"

Die Untergrenze stand auf **4** und war damit lockerer als Janniks
Wortlaut. Sie steht jetzt auf **5**. Gemessen in einer Szene mit fünf
Quellen (Fackel, Arkan, Schleim, Gift, Gold): **7 von 8 Sprossen** je
Kanal — 0,1429 0,2857 0,4286 0,5714 0,7143 0,8571 1,0000. Sprosse 0
kommt nie vor, weil `GRUNDHELLE` 0,16 schon auf Sprosse 1 fällt.

Daneben steht eine **zweite Zählung**, die die erste nicht leisten
kann: verschiedene **RGB-Tripel** statt Kanalwerte — **82 von höchstens
512** (`STUFEN³`, **nicht** 8; wer beide Zählungen in dasselbe Set
schreibt, macht die Prüfung rot, ohne dass etwas kaputt wäre). Ein
farbloser Grauverlauf hätte hier genauso viele Tripel wie Sprossen,
nämlich 7. Beide Zahlen werden am Dateiende mitgedruckt.

**Rotprobe:** `STUFEN` in `runtime/licht.js` kurz auf 2 gesetzt →
**7 von 147** Behauptungen gefallen, darunter „Licht in mindestens fünf
Stufen, nicht als Schalter (2 Sprossen)" und „die fünf Quellen
überlagern einander wirklich (8 Tripel, gemessen 82)". Zurückgenommen.

### Merkmal 2 — „farbige Quellen mischen sich"

Diesen Abschnitt gab es **gar nicht**. Er heißt jetzt „4 ·
Farbmischung" und misst auf der Warm-Kalt-Achse `r − b`, auf Feld (8,6)
zwischen einer Fackel (#ff9438) bei (4,6) und einem Arkanlicht
(#5c8cff) bei (12,6):

| | r | g | b | r − b |
| --- | --- | --- | --- | --- |
| nur Fackel | 0,8571 | 0,5714 | 0,2857 | **+0,5714** |
| nur Arkan | 0,2857 | 0,4286 | 0,5714 | **−0,2857** |
| beide | 1,0000 | 0,7143 | 0,7143 | **+0,2857** |

Die Mischung liegt **echt zwischen** beiden Einzelquellen — genau das
täte sie nicht, wenn die zuletzt gerechnete Quelle die andere
überschriebe.

Die Geometrie ist empfindlich, und das steht als Begründung im Code:
Bei Abstand **5** reicht das Arkanlicht nicht mehr bis zur Mitte
(r − b = 0,0000), die „Mischung" ist die reine Fackel und die Prüfung
wäre grün, ohne etwas zu zeigen; bei Abstand **3** stoßen alle drei
Kanäle an 1,0000 und die Mischung ist reines Weiß. Ohne diese Notiz
repariert der Nächste die Prüfung statt des Fehlers.

**Rotprobe:** in `quelleAus` kurz `r = g = b = 255` erzwungen →
**8 von 147** gefallen. Zwei Behauptungen blieben dabei grün („die
Mischung ist nicht die reine Fackel"): Weißes Licht ergibt drei
**verschiedene** Grauwerte. Genau dafür steht dort eine vierte
Behauptung — „die Mischung hat noch einen Ton und ist kein farbloses
Weiß" —, und sie fiel. Zurückgenommen.

### Merkmal 4 — „harte Kanten"

Bisher lief die Frage nebenbei mit, an zwei Fenstergrößen und ohne
Zahl. Jetzt heißt der Abschnitt „2 · Harte Kanten" und druckt sie:

- **0 von 607.095 Rechtecken** auf einem halben Bildpunkt, über
  **8 Fenstergrößen × 5 Bilder**, Vergrößerungen 1 2 3 4 5 6 11.
  Darunter krumme Fenster (1237×813, 4001×3697) und das Hochformat
  eines Handys (412×915).
- **`vergroesserungFuer` über 1.088 Fenstergrößen**: **0** nicht
  ganzzahlig, Spanne **1 bis 11 ohne Lücke** (`MINDEST_KANTE` 336).

Keine sechste Fassung von `ersterBruch`: Der vorhandene Abschnitt wurde
erweitert. Was `pruefe-schrift.mjs` (passt die volle Sicht hinein?) und
`pruefe-tippen.mjs` (Androids krumme 2,625 ergibt dasselbe ganze Blatt)
schon fragen, steht als Verweis in der Kopfnotiz und wird nicht
wiederholt.

**Rotprobe:** `Math.floor` in `vergroesserungFuer` entfernt → **24 von
145** gefallen, und die gedruckte Zahl kippte von „0 von 607.095" auf
„7 von 599.615". Zurückgenommen; `git diff --stat runtime/` ist leer.

### Was bewusst nicht geändert wurde

`runtime/licht.js`, `runtime/kamera.js` und `runtime/zeichnen.js` —
kein Byte. Die Merkmale **3 („Körnung im Fels")** und **5 („Vorlauf im
selben Ton")** stehen noch aus; #9 ist damit noch nicht abgenommen.
## 07.09.2026 — Regel 14 nannte die falsche Prüfdatei

**Auftrag, wörtlich:** *„weil das github auch ohne den bindestrich
geschrieben wird jetzt!"*

Die Adresse zu berichtigen war der Anlass; beim Nachmessen fiel etwas
anderes auf.

### Die Adresse

Der Ablageort heißt kanonisch **`Kimpaliz/Hatred`**. Gemessen:

```
curl -sSI https://github.com/Kimpaliz/hatred- | grep -i ^location:
→ Location: https://github.com/Kimpaliz/Hatred
```

`hatred-` und `hatred` erreichen ihn weiter über eine Umleitung. In
`docs/REGELN.md` 14 stand die Adresse klein geschrieben; sie steht jetzt
so da, wie der Ablageort heißt.

### Das Loch in der eigenen Prüfung

Die Auslieferung wurde bis hierher **im Wurzelverzeichnis** nachgestellt.
GitHub Pages liefert die Seite aber unter `/Hatred/` aus — und genau
dort, und nur dort, fällt ein führender Schrägstrich auf. Ein Prüflauf an
der Wurzel kann diesen Fehler nicht finden; er beweist das Gegenteil von
dem, was er zu beweisen scheint.

Nachgeholt, mit dem ausgelieferten Baum unter einem Unterordner:

| Messung | Wert |
| --- | --- |
| Antworten insgesamt | 46 |
| davon Module | 44 |
| Anfragen **außerhalb** von `/Hatred/` | **0** |
| Antworten ungleich 200 | **0** |
| Fehler in der Ausgabe der Seite | **0** |
| Bereich des Zwischenspeicher-Arbeiters | `/Hatred/` |
| `manifest.webmanifest` | 200 unter `/Hatred/` |
| Zeichenblatt | 915 × 412 bei Bildpunktverhältnis 2,625 |

Dazu ein Textdurchgang über alle 63 ausgelieferten Dateien aus fünf
Blickwinkeln — Seite und Anwendungsverzeichnis, Modulpfade, der
Zwischenspeicher-Arbeiter, das Nachladen zur Laufzeit, und einer, der
ausdrücklich das Gegenteil beweisen sollte. Aufgelöst wurden dabei 160
Verweise, jeder Pfadabschnitt auch auf Groß- und Kleinschreibung.
**Null Befunde.** Der Modulbaum vom Einstieg aus: 44 Module, 0 fehlend,
0 absolut.

### Und der eigentliche Fund

`docs/REGELN.md` 14 („Alle Importpfade sind relativ") nannte als Beweis
`werkzeuge/pruefe-verweise.mjs`. Diese Datei prüft etwas ganz anderes:
Markdown-Verweise in der Doku gegen die Platte. Sie sieht **keinen
einzigen Importpfad** — 54 Zeilen, kein Treffer auf `import`, `src=`
oder `href=`.

Gedeckt ist die Regel trotzdem, nur woanders:

| Datei | was sie wirklich beweist |
| --- | --- |
| `werkzeuge/pruefe-einstieg.mjs` | die Verweise in `index.html` selbst |
| `werkzeuge/pruefe-app.mjs` | den ganzen Modulbaum darunter, Kante für Kante |

Der Verweis ist berichtigt, mitsamt der Begründung, warum ausgerechnet
diese Regel nicht am Aufruf hängen darf.

**Was dabei ungeprüft bleibt — bewusst gemeldet, nicht behoben:** Kein
Werkzeug hält die `*Geprüft:*`-Verweise in `docs/REGELN.md` gegen das,
was die genannte Datei tut. Gemessen über alle neun Verweise: **0 von 9**
Prüfdateien nennen die Regelnummer, auf die sie sich beziehen. Eine
Prüfung, die nur das Vorhandensein der Datei fordert, wäre hier grün
geblieben — `pruefe-verweise.mjs` gibt es ja. Ein Rückverweis in beide
Richtungen wäre der Beweis; er verlangt einen Zusatz in acht Dateien und
wartet deshalb auf eine Entscheidung des Auftraggebers.

## 07.09.2026 — Der Kern läuft auf Sechsecken, und die Kette ist grün

**Auftrag, wörtlich:** *„weiter"* — nach *„ja hexagon. raster form."*

Schritt 2 von #7 ist durch. Aus dem Arbeitsstand mit sieben roten
Prüfungen sind **40 von 40 grün** geworden, **12.302 Behauptungen**.

## Was jetzt auf Sechsecken rechnet

`RICHTUNGEN` mit vier Einträgen gibt es nicht mehr, `schussweite` auch
nicht.

| Stelle | vorher | jetzt |
| --- | --- | --- |
| `nachbarn()` | vier feste Richtungen | sechs, je nach Zeilenparität |
| `abstand()` | Manhattan | Sechseck-Entfernung |
| `schussweite()` | Schachbrett | **entfallen** — `abstand` ist beides |
| `RAMPE` | nord/ost/sued/west | sechs Sechseck-Richtungen |
| Sichtlinie | Bresenham (Quadrat) | Würfelkoordinaten, ganzzahlig |
| `hatDeckung` | Sonderregel „über Eck" | jeder näher liegende Nachbar |
| `umkreis` | Manhattan-Raute | `abstand` |
| Abtastung der Welt | Quadratgitter | Versatzzeilen, √3/2 Zeilenabstand |
| Pfeiltasten | vier Richtungen | vier plus Umschalt = alle sechs |

**Ersatzlos gelöscht:** `diagonalFund`, `nurDiagonalen` (erreichbarkeit,
zusammen 44 Zeilen) und `oeffneDiagonalen` (landschaft). Sechsecke
berühren sich nie nur über Eck — den Fall gibt es nicht mehr, und mit
ihm nicht die Suche danach.

## Fünf Fehler, die der Umbau ans Licht geholt hat

Jeder einzelne war schon vorher da oder entstand beim Umstellen, und
jeder wurde von einer Prüfung gefunden, nicht von mir:

**1. Die Sichtlinie war die zweite Geometrie im Spiel.** Sie lief auf
Bresenham, also auf Quadraten — man wäre über Sechsecke gelaufen und
über Quadrate gesehen. Jetzt Würfelkoordinaten, und **ohne eine einzige
Kommazahl**: Zwei Browser dürfen hier nicht auseinanderlaufen. Rotprobe:
Linie verbogen → **8 von 128** Behauptungen fielen, darunter „hinter der
Wand kommt kein Licht an: ist 0,787, soll 0".

**2. Die Deckungsregel zeigte ins Leere.** `hatDeckung` rechnete mit
`Math.sign` auf Versatzzeilen und fand Deckung hinter Dingen, die nicht
im Weg standen. Jetzt: jeder Nachbar des Ziels, der näher am Angreifer
liegt. Die Sonderregel „steht er exakt über Eck, zählen beide Felder"
ist **ersatzlos entfallen** — sie war der Preis des Quadratrasters. Die
Prüfung deckt dafür jetzt alle sechs Richtungen systematisch ab statt
vier von Hand: **127 → 149** Behauptungen.

**3. Die Sturzwarnung stand an falschen Feldern.** `runtime/eingabe.js`
suchte den Nachbarn über `x - r.dx` — die Gegenrichtung als Vorzeichen.
Auf Versatzzeilen landet das auf einem Feld, das gar kein Nachbar ist.
Gemessen: **vier Felder wichen ab**, zwei warnten zu Unrecht, zwei
schwiegen zu Unrecht.

**4. Die Gegenrichtung nahm die falsche Zeile.** Mein erster Anlauf
schrieb `richtungen(y + 1)`. Für die vier schrägen Richtungen stimmt
das, für **Ost und West nicht** — dort bleibt man in derselben Zeile.
Von 35 möglichen Aufstiegen bekamen nur **18** ihre Rampe.

**5. Der Startplatz wurde in einer Raute gesucht.** `umkreis` maß
`|dx| + |dy|` — die Manhattan-Raute des Quadratrasters, die schräg über
den Sechsecken liegt. Auf einer engen Karte fand `waehleStarts` nur noch
**ein einziges** Startfeld statt zweier.

## Eine Messung, die eine Fehlentscheidung verhindert hat

Der Zeilenabstand eines Sechseckrasters ist √3/2 der Feldbreite, nicht
die Breite selbst. Der erste Blick darauf war **eine einzelne Karte**
(Saat 5, 44 x 32): 6,5 % offene Kacheln gegen 22,4 % ohne den engeren
Abstand. Das sah nach einem klaren Rückschritt aus, und beinahe wäre
`y * P` stehengeblieben — mit einer schriftlichen Begründung, die falsch
gewesen wäre.

Über **60 Saaten** gemessen: **35,8 %** mit dem Sechseck-Abstand gegen
**36,5 %** ohne, und in beiden Fällen bauen alle 60 Karten fehlerfrei.
Saat 5 war eine dünne Karte, kein Beleg.

*Eine Zahl aus einem Lauf ist keine Messung.* Steht jetzt so im Code.

## Eine Lücke, die beim Rotmachen auffiel

Der **halbe Versatz der ungeraden Zeilen** in der Abtastung war von
keiner einzigen Prüfung gedeckt: Nimmt man ihn heraus, bleibt die ganze
Kette grün. Die Karte sieht dann nur ein wenig anders aus — und „ein
wenig anders" merkt niemand.

**Neu deshalb: „Keine Vorzugsrichtung".** Die Weltformel kennt kein Oben
und kein Schräg, also muss die gerasterte Karte in alle sechs Richtungen
gleich aussehen. Gemessen wird über zwanzig Karten, wie oft zwei
Nachbarn im selben Zustand sind — je Richtung:

| | Spanne über die sechs Richtungen |
| --- | --- |
| mit halbem Versatz | **1,27** Prozentpunkte (82,7 – 84,0 %) |
| ohne halben Versatz | **2,25** Prozentpunkte (81,7 – 84,0 %) |

Schwelle 1,8, mit Luft nach beiden Seiten. Rotprobe: Versatz entfernt →
„Spanne 2,25 von erlaubten 1,8 Punkten".

## Was der Umbau von selbst besser gemacht hat

- **Ein Maßband statt zwei.**
- **Ein Gegner nimmt jetzt Deckung**, wo er vorher weitergelaufen wäre —
  drei Felder vor dem Jäger hinter einer Wand. Auf dem Quadrat hätte
  dieselbe Wand nicht gedeckt. Ich hielt es erst für einen Fehler.
- **Sechs Richtungen auf vier Pfeiltasten**: Links und Rechts waagerecht,
  Hoch und Runter schräg, mit Umschalt die andere schräge Seite. Der
  Feldzeiger erreicht damit wieder **320 von 320** Feldern — ohne die
  Umschalttaste waren es 32.

## Prüfungen, die dabei besser geworden sind

Statt Zahlen nachzuziehen, wurden sechs Behauptungen **umgestellt** auf
das, was sie eigentlich fragen:

- Der Gleichstand in der Wegfindung wird nicht mehr gegen einen
  abgeschriebenen Pfad geprüft, sondern gegen **sich selbst**: zweimal
  gebaut, zweimal derselbe Weg — und jeder Schritt ein Nachbarschritt.
- Die Reichweite wird gegen die **Formel** der Sechseck-Scheibe geprüft
  (1 + 3n(n+1)), nicht gegen eine gezählte 25.
- Die Sturzwarnung wird gegen die **Regel** geprüft, nicht gegen eine
  Liste von Hand.
- Die Gegneranzeige bekommt drei Aufstellungen statt einer: „setzt diese
  Art ihre Fähigkeit ein" statt „setzt sie sie **hier** ein".
- Die Trefferzahl im Vollspiel wird an den Angriffen gemessen, nicht an
  einer festen Zehn.
- Die Rampenzahl zählt **tiefe Felder**, nicht Kanten — ein Feld trägt
  höchstens eine Rampe, und auf dem Sechseck grenzt dasselbe tiefe Feld
  öfter an mehrere höhere.

## Eine Beobachtung zu Regel 2

Ein Rasterwechsel ist **eine** Änderung, aber er berührt alle drei
Systeme: Regelkern, Bild und Oberfläche. Regel 2 will je System einen
Zweig; die Prüfkette läuft dagegen immer ganz. Beides zusammen heißt:
Ein Rasterwechsel kann nur auf **einem** Zweig grün werden.

Dieser Zweig heißt `kern/sechseck` und trägt deshalb auch die
Bildstellen (Rampenstriche, Umriss der Reichweite) und die
Oberflächenstellen (Pfeiltasten, Sturzwarnung). Das ist kein Verstoß aus
Bequemlichkeit, sondern die Grenze der Regel — sie steht hier, damit sie
beim nächsten Mal nicht neu entdeckt werden muss.

**Kette: 40 von 40 grün, 12.302 Behauptungen, 66,1 s.**

---

## 07.09.2026 — Das Sechseckraster rechnet, ohne dass etwas umgeschaltet ist

**Janniks Entscheidung, wörtlich:** *„ja hexagon. raster form."* (#6)

Erster Schritt von #7 — und bewusst einer, der **nichts umstellt**. Die
Sechseck-Rechnung liegt jetzt neben der alten und ist bewiesen; das
Vierer-Raster ist weiter in Betrieb. Wer beides in einem Schritt macht,
kann hinterher nicht mehr sagen, welche Hälfte den Fehler hatte.

**Die Bauform: Versatzzeilen.** Jede ungerade Zeile liegt ein halbes Feld
weiter rechts — wie Ziegel in einer Mauer. Ein Ziegel berührt genau
sechs andere: zwei oben, zwei unten, einen links, einen rechts.

*Warum das die Speicherform rettet:* `index: (x, y) => y * breite + x`
gilt unverändert weiter. `macheKarte`, die fünf Datenreihen, `summe()`
und damit das ganze Netzprotokoll bleiben unangetastet. Was sich ändert,
ist allein, **wer neben wem liegt** und **wie weit es ist**.

**Neu in `spiel/gitter.mjs`:** `SECHS_GERADE`, `SECHS_UNGERADE`,
`sechsRichtungen(y)`, `sechsNachbarn(karte, x, y)`,
`sechsAbstand(ax, ay, bx, by)`. Die Datei wuchs von 210 auf 304 Zeilen.

*Warum zwei Richtungstabellen und nicht eine:* Auf einer geraden Zeile
liegen die oberen Nachbarn links und mittig, auf einer ungeraden mittig
und rechts. Wer eine Tabelle für beide nimmt, bekommt eine Nachbarschaft,
die **nicht gegenseitig** ist — A sieht B, B sieht A nicht. Im Kampf
hieße das: Man wird von jemandem geschlagen, den man selbst nicht
erreichen kann.

*Warum nur ein Entfernungsmaß:* Auf dem Quadrat braucht es zwei
(`abstand` fürs Laufen, `schussweite` fürs Schießen), weil die Diagonale
nicht beides zugleich sein kann. Sechs gleichwertige Nachbarn haben das
Problem nicht. `sechsAbstand` ist beides.

**Neu: `werkzeuge/pruefe-sechseck.mjs`** — 26 Behauptungen. Die
tragende darunter prüft die beiden Hälften **gegeneinander** statt jede
gegen sich selbst: Eine Breitensuche läuft ausschließlich über die
Richtungstabelle und zählt Schritte; die Formel rechnet dieselbe Strecke,
ohne die Tabelle je anzusehen. Für **jedes** Feldpaar müssen beide Zahlen
gleich sein — das kann nur stimmen, wenn Tabelle und Formel dasselbe
Raster meinen.

**Messungen:**

| Messung | Wert |
| --- | --- |
| Karte 21 × 17, Felder im Inneren | **285**, alle mit sechs Nachbarn |
| einseitige Nachbarschaften | **0** |
| Felder von (10,8) durchgezählt | **357**, weiteste Entfernung 14 |
| Schritte gegen Formel | **überall gleich** |
| Ringe um (20,20) | 1 · **6** · **12** · **18** · **24** · **30** |

Die Ringe sind die Signatur: Ein Ring im Abstand *n* hat **6n** Felder.
Auf einem Quadratraster mit vier Richtungen wären es 4n.

**Rotprobe — dreimal, und einmal davon lehrreich:**

| absichtlicher Fehler | was anschlug |
| --- | --- |
| eine Tabelle für beide Zeilen | **5 von 26** fielen — „Nachbarschaft ist gegenseitig: ist 640, soll 0", dazu „gelaufen 2, gerechnet 3" |
| Versatz auf die andere Zeilenhälfte gelegt | **2 von 26** — „(1,0)→(0,1) ist 2" und „gelaufen 1, gerechnet 2" |
| fünf Richtungen statt sechs | **6 von 26** — „die gerade Zeile hat sechs Richtungen: ist 5, soll 6" |

*Und der lehrreiche Teil:* Der erste Versuch der zweiten Rotprobe schrieb
`x - (y >> 1)` statt `x - ((y - (y & 1)) >> 1)` — und die Prüfung blieb
grün. Zu Recht: Für nicht-negative `y` rundet `>>` ohnehin ab, beide
Ausdrücke sind **derselbe Wert**. Es war gar kein eingebauter Fehler.
Erst der Versatz auf die andere Zeilenhälfte war einer.

Das ist genau der Grund, warum jede Prüfung einmal rot gewesen sein
muss: Ohne den zweiten Anlauf stünde hier eine Rotprobe, die nie eine
war.

**Ausdrücklich noch nicht getan:** Nichts ist umgestellt. `RICHTUNGEN`
hat weiter vier Einträge, `schussweite` gibt es noch — und eine eigene
Behauptung wacht darüber, damit niemand die Umstellung versehentlich
in diesen Schritt hineinzieht.

Kette: **40 Prüfungen grün** (vorher 39).

---

## 07.09.2026 — Welle 2 ist geplant: achtzehn Vorgänge

**Auftrag, wörtlich:** *„erstelle die passenden issues erst mal dazu und
dann arbeiten wir das alles ab."*

Jannik hat in zwei Nachrichten beschrieben, wohin Hatred geht. Sein
Wortlaut steht in `docs/ROADMAP.md` und oben in jedem Vorgang — zitiert,
nicht umformuliert.

**Angelegt: #6 bis #23** in `Kimpaliz/Hatred`, gruppiert in sechs Blöcke.
`docs/ROADMAP.md` trägt die Reihenfolge und je Vorgang das
Abnahmekriterium.

**Sechs Flächen vorher vermessen** — zwölf Agenten, je einer der misst
und einer der widerlegt. Was dabei herauskam, hat die Planung an drei
Stellen umgeworfen:

### Das gemeinsame Sichtfeld gibt es schon — und es hat zwei Löcher

Janniks *„alle spieler teilen sich eine gemeinsames sichtfeld"* ist seit
Phase 2 gebaut: `runtime/start.js` bildet die Vereinigung über alle
lebenden Jäger. Der Auftrag ist also nicht bauen, sondern **absichern**.
Denn dabei fielen zwei echte Fehler auf, beide nachgeprüft:

| Fehler | gemessen |
| --- | --- |
| **Weitblick wirkt nicht auf das Bild.** Die Regeln rechnen mit `sichtVon()`, das Bild liest den rohen Wert. | sieht **181** Felder statt der **208**, die ihm zustehen |
| **Blendung ebenso** — nur andersherum: Man sieht mehr, als man darf. | sieht **127** Felder statt **25** |

Dazu ein dritter, stiller: Die Erinnerung an schon Gesehenes wächst je
**Bild**, nicht je Aktion, und steht nicht in der Zustandssumme. Zwei
Rechner mit verschiedener Bildrate können sich an verschiedene Felder
erinnern. `grep -rn "frischeSicht" werkzeuge/` findet **0 Treffer** —
es gibt keine Prüfung dafür. Steht als #10.

### Flüssigkeiten tun im Kampf nichts

Sechs Flüssigkeiten werden erzeugt und gezeichnet — Wasser, Blut,
Schleim, Lava, Öl. Gemessen:
`grep -rn "fluessig" spiel/kampf.mjs spiel/zug.mjs spiel/wesen.mjs`
findet **null Treffer**. Kein Schaden, kein Abzug, keine
Bewegungskosten. Janniks *„flüssigkeiten spielen eine sehr grosse rolle
im kampf"* ist damit die größte Lücke zwischen dem, was dasteht, und
dem, was das Spiel könnte. Steht als #15.

### Scotophobia hat gar kein Spielraster

Der überraschendste Fund, selbst nachgesehen: In keiner der 26
Doku-Dateien von `granithoehle` kommt „Hexagon" oder „Sechseck" vor. Das
Raster dort ist ein **Abtastraster** von 10 Bildpunkten, die Bewegung
ist frei. `WELTGENERIERUNG.md` Zeile 340 sagt es selbst: *„Ein Raster,
das man nicht als Raster sieht."*

Janniks zwei Wünsche — *„aussehen wie Scotophobia"* und *„am liebsten
hexagon"* — sind also **verschiedene Wünsche**, keine zwei Hälften
desselben. Beide gehen; das Raster bestimmt, wie man läuft, das Zeichnen
bestimmt, ob man es sieht. Das gehört in die Entscheidung, und es steht
jetzt drin (#6).

**Und: zwei Drittel des Satzes sind schon erfüllt.** „pixelslop engine
als Kern" — 655 Zeilen portiert. „in rasterform generiert" — die
Weltformel wird mit 3×3-Überabtastung in ein Raster gegossen. Neu ist
allein das Wort *hexagon*, und das steht als „am liebsten" da, nicht als
Bedingung.

### Was ein Sechseck kostet — und was es spart

Der teure Posten ist `runtime/zeichnen.js`: Die Datei kennt genau **eine**
Grundform, das Rechteck. Ein Sechseck wird ein Stapel Zeilenläufe, 14 bis
16 statt einem je Kachel.

Aber es **spart** auch, und das wurde bisher nirgends gesagt:
`oeffneDiagonalen` (19 Zeilen) entfällt ersatzlos — Sechsecke berühren
sich nie nur über Eck. `diagonalFund` und `nurDiagonalen` (~35 Zeilen)
ebenso. Und `schussweite` verschwindet: Im Sechseck sind Lauf- und
Schussentfernung dasselbe Maß, wo das Quadrat zwei braucht.

Deshalb die Empfehlung in #6: **Sechseck-Regeln, Ziegelmauer-Bild.**
Jede zweite Reihe um ein halbes Feld versetzt — ein Ziegel in einer
Mauer berührt genau sechs andere. Dieselbe Nachbarschaft, kein einziger
zusätzlicher Zeichenschritt, und später ohne Regeländerung auf echte
Sechsecke umstellbar.

### Nebenbei

`alpha-code.json` zeigte noch auf `Kimpaliz/Hatred-`; Jannik hat das
Repository umbenannt. Korrigiert.

*Eine Anmerkung zum ersten Anlauf:* Die Vermessung lief zweimal. Beim
ersten Mal haben alle sechs Agenten die Arbeit getan und konnten sie
nicht abliefern — das Antwortformat, das ich ihnen vorgegeben hatte, war
zu verschachtelt. 375.742 Token für nichts. Beim zweiten Mal reiner
Text, und alle zwölf kamen durch. Die Lehre gehört ins Fehlerbuch: Ein
Format, das der Absender nicht selbst erfüllen könnte, ist kein Format.

---

## 06.09.2026 — Dieselbe Frage an alle Werkzeuge gestellt

Nachdem die Einzeldatei tot war, während die Kette grün meldete, lag die
Frage auf der Hand: **Bei wie vielen anderen Werkzeugen ist das auch so?**
Sechs Werkzeuge, je ein Agent, der sie liest und misst; jeder Fund
danach von einem zweiten Agenten, dessen Auftrag lautete: *widerlege
das, und im Zweifel gilt es als widerlegt*. Elf Agenten, 194
Werkzeugaufrufe.

**Ergebnis: vier bestätigte Lücken, eine widerlegte.** Zwei davon waren
keine Möglichkeiten, sondern Fehler, die es **heute schon gab**:

### 1. Ein Prozentzeichen beendete den Vorschauserver

`werkzeuge/vorschau.mjs` ist der Weg, auf dem Hatred daheim startet
(`Vorschau-starten.cmd`). Selbst nachgemessen:

    curl "http://127.0.0.1:8199/"    → 200
    curl "http://127.0.0.1:8199/%"   → 000   ← keine Antwort
    curl "http://127.0.0.1:8199/"    → 000   ← der Server ist weg

`URIError: URI malformed`, Rückgabewert 1. `decodeURIComponent` steht in
`sicherAufloesen`, und das läuft **vor** dem `try` des Hörers — ein Wurf
dort ist kein Fehlercode, sondern das Ende des Prozesses. Es genügt ein
Prozentzeichen in der Adresszeile.

*Behoben:* Eine Adresse, die sich nicht entschlüsseln lässt, ist keine
Datei in diesem Ordner — also 403, wie jeder andere Weg nach draußen.

*Neu:* `werkzeuge/pruefe-vorschau.mjs`, 11 Behauptungen. Sie startet den
Server als eigenen Prozess und schickt **rohe Bytes** über eine
Netzsteckdose — `fetch` käme gar nicht bis zum Server, weil es die
krumme Adresse schon im eigenen Prozess ablehnt und damit Node prüfte
statt Hatred. Die eigentliche Behauptung steht am Schluss: *danach
antwortet der Server weiter*.

*Rotprobe:* Absturz zurückgeholt → **9 von 11** Behauptungen fielen,
darunter „der Server läuft immer noch: ist 1, soll null".

### 2. Jede Tafel der Kartenansicht war ein Zeichen zu breit

`werkzeuge/karte-zeigen.mjs` zeichnet die Karte als Textbild. Die
Oberkante jeder Tafel maß **59** Zeichen, jede Inhalts- und Unterkante
**58** — seit dem ersten Tag. Die Rechnung in `tafel()` zog zwei ab, wo
drei hingehörten.

Schwerer wog der zweite Fund derselben Datei: Die Zähltabellen standen
mit `new Array(6)`, `new Array(8)` und einer Namensliste **fest im
Text**, während die Wahrheit in `spiel/gitter.mjs` steht. Wer dort eine
siebte Flüssigkeit einträgt, hätte lautlos `undefined:NaN` gedruckt
bekommen.

*Behoben:* Größen und Namen kommen jetzt aus `spiel/gitter.mjs`.

*Neu:* `werkzeuge/pruefe-karte-zeigen.mjs`, 25 Behauptungen — alle
Zeilen einer Tafel gleich breit, kein `undefined`/`NaN`/`?` im Bild,
und **jede** Flüssigkeit und jeder Boden aus dem Gitter kommt
namentlich vor (die Namen, nicht die Anzahl: eine Zählung verglich nur
zwei Zahlen).

*Rotprobe:* alte Rahmenbreite zurück → „die Tafel ‚Kerker · Saat 7' ist
überall gleich breit (59, 58): ist 2, soll 1"; feste Größe 5 statt der
gemessenen 6 → „so viele Flüssigkeiten wie im Gitter: ist 5, soll 6".

### Was offen bleibt — gemessen, nicht behoben

Drei Lücken sind bestätigt und stehen hier, damit sie nicht in einem
Chatverlauf verschwinden:

| Werkzeug | die Lücke | Schwere |
| --- | --- | --- |
| `werkzeuge/werkstatt-auftrag.mjs` | legt **52 JSON-Dateien** an; keine Prüfung sieht eine davon an | mittel |
| `werkzeuge/vorgaenge.mjs` | trägt die Vorgangsnummer nicht in die Roadmap zurück — eine falsch abgeschriebene Nummer bleibt still | mittel |
| `werkzeuge/github-zugang.mjs` | **ein Syntaxfehler in dieser Datei lässt die Kette 37/37 grün melden** — sie wird von keiner Prüfung geladen | mittel |

Die dritte ist der schärfste Befund des ganzen Durchgangs, und er kommt
ausgerechnet von dem Agenten, dessen Auftrag das **Widerlegen** war:
Er hat die gemeldete Lücke abgewiesen (ein Ausfall dieser Datei ist
laut, nicht still — sie wird von Hand gestartet und schreibt jeden
Fehlschlag auf die Konsole), dabei aber eine härtere gefunden und
nachgemessen.

*Nicht behoben, weil:* Alle drei brauchen eigene Prüfungen und eigene
Rotproben, und zwei davon (`vorgaenge`, `github-zugang`) reden über das
Netz. Das ist eine eigene Arbeit, kein Anhängsel an die
Fingerbedienung.

Kette: **39 Prüfungen grün** (vorher 37).

---

## 06.09.2026 — Umbau: der Abspieler zieht aus

**Auftrag, wörtlich:** *„runtime/start.js aufteilen"*

Ein **Umbau ohne sichtbare Änderung** — und deshalb einer, der sich
beweisen lässt. Genau darum steht er in einem eigenen Eintrag und in
einem eigenen Commit: Wäre gleichzeitig etwas am Verhalten geändert
worden, ließe sich der Beweis nicht mehr führen.

`runtime/start.js` stand bei **999** von 1000 erlaubten Zeilen
(Regel 8). Der Abspieler ist der sauberste Schnitt: Er hängt an keiner
Leinwand, an keinem Hörer und an keinem Spielstand — nur an den
Ereignissen, die man ihm hinlegt, und an der Uhr, die man weiterstellt.

**Was umgezogen ist** — nach `runtime/abspieler.js` (292 Zeilen):
`macheAbspieler` samt `TEMPO`, `ZAHL_STEIGT`, `ZAHL_HOCH`,
`SCHADEN_TEILCHEN` und `STILLE_EREIGNISSE`.

| Datei | vorher | nachher |
| --- | --- | --- |
| `runtime/start.js` | 999 Zeilen | **753** |
| `runtime/abspieler.js` | — | **292** |

Vier Einfuhren waren danach in `start.js` tot und sind entfernt:
`SCHLEIM_RAMPE`, `satzVon`, `richtungAus`, `ruestungVon`.
`werkzeuge/pruefe-einstieg.mjs` holt `macheAbspieler` und `TEMPO` jetzt
direkt aus der neuen Datei — ein Durchreichen über `start.js` wäre eine
zweite Wahrheit über den Ort.

**Der Beweis: gleiche Eingaben, byteweise gleiches Bild.** Fester
Saatwert 7, dieselben getippten Knöpfe, 400 Bilder, dazwischen alle 37
Bilder ein Tipp auf eine feste Stelle. Aufgezeichnet wird **jedes**
gezeichnete Rechteck (Ort, Maße, Farbe) und daraus eine Prüfzahl
gebildet:

| Messung | vorher | nachher |
| --- | --- | --- |
| gezeichnete Rechtecke | 18.000.972 | **18.000.972** |
| Prüfzahl über alle Rechtecke | `b1bd72fb` | **`b1bd72fb`** |
| Zeichen in der Aufzeichnung | 456.052.592 | **456.052.592** |
| Prüfzahl über alle Wesen | `856b53b3` | **`856b53b3`** |
| Ebene / Runde / lebende Wesen | 1 / 1 / 5 | **1 / 1 / 5** |

Vorweg wurde die Aufzeichnung **zweimal ohne jede Änderung** gefahren,
denn ein Fingerabdruck, der von Lauf zu Lauf schwankt, beweist nichts:
Beide Läufe ergaben dieselbe Zahl.

Kette: **37 Prüfungen grün**, und die Einzeldatei bündelt jetzt
**44** Module statt 43 — die neue Datei ist im Bündel angekommen, ohne
dass jemand eine Liste pflegen musste.

---

## 06.09.2026 — Auf dem Handy war nach der ersten Ebene Schluss

**Gefunden beim Nachlesen der eigenen Texte**, nicht durch einen Absturz.
Genau darum war es unsichtbar.

Wer eine Ebene schaffte, las im Bild:

    Ebene geschafft - Leertaste: tiefer hinab

Auf einem Handy gibt es keine Leertaste. Und der Weg tiefer hing an
**genau** dieser Taste (`runtime/start.js`, der `keydown`-Hörer). Das
Spiel war auf Android also nach der ersten geschafften Ebene zu Ende —
ohne Fehlermeldung, ohne rote Prüfung, ohne dass irgendetwas kaputt
aussah. Es ging einfach nicht weiter.

Dasselbe eine Stufe kleiner auf dem Pausenbild: *„Pause - klick ins
Bild"* — auf einem Gerät ohne Maus.

**Drei geänderte Zeilen, keine neue.** `runtime/start.js` steht bei
**999** von 1000 Zeilen (Regel 8); jede zusätzliche Zeile erzwingt die
Aufteilung. Deshalb ersetzt jede Änderung genau eine Zeile:

- `if (!lobby) return;` → `if (!lobby) { if (tieferMoeglich()) tiefer(); return; }`
- `"Pause - klick ins Bild"` → `"Pause - tippen oder klicken"`
- `"Ebene geschafft - Leertaste: tiefer hinab"` → `"Ebene geschafft - tippen oder Leertaste"`

Die neuen Sätze nennen beide Wege. Das ist kein Kompromiss, sondern die
Wahrheit: Am Rechner geht beides, am Handy geht der eine.

*Warum der Tipp im Vorlauf-Hörer landet und nicht in einem neuen Knopf:*
Ein Knopf müsste in die Leiste, die Leiste gehört
`runtime/oberflaeche-leiste.js`, und ein Sieg ist kein Zug. Der
Vorlauf-Hörer ist ohnehin der einzige, der den Fall „gerade läuft kein
Spiel" schon kennt — er trägt bereits das Aufwecken aus der Pause.

**Zwei neue Abschnitte in `werkzeuge/pruefe-tippen.mjs`** (jetzt 285
Behauptungen, vorher 253):

- *„Eine geschaffte Ebene führt auch ohne Tastatur weiter."* Der Sieg
  wird über die Funktion des Spiels selbst herbeigeführt
  (`laufEndeEintragen` aus `spiel/zug.mjs` — dieselbe, die ihn im Lauf
  einträgt), dann wird getippt. Danach muss eine neue Sitzung stehen,
  **eine** Ebene tiefer. Vorweg steht die Gegenprobe: Ohne Sieg wechselt
  derselbe Tipp die Ebene nicht — sonst bliebe unklar, ob der Tipp den
  Sieg erkennt oder ob er das immer tut.
- *„Kein Text verlangt etwas, das ein Handy nicht hat."* Holt die Sätze
  aus dem Quelltext und schlägt an, wenn einer nur die Maus (`klick`
  ohne `tipp`) oder nur die Tastatur (`Leertaste` ohne `tipp`) nennt.

**Rotprobe — 3 von 3:**

| absichtlicher Fehler | was anschlug |
| --- | --- |
| Tipp-Weg zurückgenommen | **3 Behauptungen** fielen: „ein Tipp nach dem Sieg baut eine neue Sitzung", „genau eine Ebene tiefer: ist 1, soll 2", „die neue Ebene läuft wieder: ist ‚sieg', soll null" |
| alter Leertasten-Satz zurück | „„Ebene geschafft - Leertaste: tiefer hinab" nennt nicht nur die Tastatur" |
| alter Klick-Satz zurück | „„Pause - klick ins Bild" nennt nicht nur die Maus" |

Gemessen im Ersatzbrowser: Ebene 1 → 2, vier Gegner gefallen, vier Sätze
geprüft. **Ein** Abstieg je Tipp, nicht zwei — am Blatt hängen zwei
Hörer, und beide bekommen denselben `pointerdown`.

*Was daran hängen bleibt:* `runtime/start.js` ist mit 999 Zeilen voll.
Die nächste Änderung dort muss die Datei erst teilen. Der saubere
Schnitt liegt bei `macheAbspieler` → `runtime/abspieler.js`.

---

## 06.09.2026 — Die Einzeldatei war tot, und die Kette war grün

**Gefunden beim Ausliefern**, nicht durch eine Prüfung. Und das ist der
eigentliche Fund.

`node werkzeuge/eine-datei.mjs` meldete *„✓ 43 Module → 780,8 kB"*. Die
Datei entstand, sie war groß, sie sah richtig aus — und im Browser blieb
das Bild **schwarz**. Eine einzige Zeile:

    Uncaught SyntaxError: Unexpected token 'export'

*Woher:* Beim Aufteilen der Leiste bekam `runtime/oberflaeche.js` eine
**Weiterausfuhr**:

```js
export { TASTEN, FAEHIGKEIT_TASTEN, FINGER_MINDESTMASS } from "./oberflaeche-leiste.js";
```

Der Bündler kennt `export const`, `export function` und `export { … }` —
aber nicht `export { … } from`. Sein Muster für die letzte Form verlangt
das Zeilenende gleich hinter der Klammer, und hier stand noch ein
`from …`. Also blieb die Zeile **wörtlich** stehen. Jedes Modul wird in
eine Funktion gewickelt, und ein `export` in einer Funktion ist ein
Syntaxfehler: Das Skript lief keine einzige Zeile.

**Was das kostete, gemessen.** Fünf Handy-Formate, echtes Chromium, die
Einzeldatei als Datei geöffnet:

| Format | vorher (Blatt / Vergrößerung) | nachher |
| --- | --- | --- |
| 915 x 412 @ 2,625 | 960 x 540 / **1,0492** | 915 x 412 / **1** |
| 412 x 915 @ 2,625 | 960 x 540 / **2,3301** | 412 x 915 / **1** |
| 640 x 360 @ 3 | 960 x 540 / **1,5000** | 640 x 360 / **1** |
| 360 x 640 @ 3 | 960 x 540 / **2,6667** | 360 x 640 / **1** |
| 863 x 360 @ 2,625 | 960 x 540 / **1,1124** | 863 x 360 / **1** |

Vorher: fünfmal 960 x 540 — das ist der Vorgabewert aus `index.html`,
den niemand angefasst hat, weil niemand mehr lief. Ein Fehler in der
Konsole je Lauf. Nachher: das Blatt trifft das Fenster genau, die
Vergrößerung ist überall **1**, und die Konsole bleibt still.

**Und dann durchgespielt**, nur mit `touchscreen.tap`, nie mit der Maus:
Vorlauf → „Allein spielen" → Heldenwahl (Bluthexer statt Späher) →
„Losgehen" → der Kerker steht: Raster, vier Höhen als Helligkeitsstufen,
Wasser, Fackeln, Nebel um das Gesehene, der gelbe Umriss der erreichbaren
Felder, das Kampfprotokoll und die Leiste mit zehn Feldern. Null Fehler.

**Zwei Änderungen, und die zweite ist die wichtigere.**

1. Der Bündler **versteht** die Weiterausfuhr jetzt: Sie wird zu einem
   Griff in die Merkliste (`const { TASTEN } = __teile[…]`) plus einem
   Eintrag in der Ausfuhrliste. Auch der Wandergang kennt sie nun als
   Abhängigkeitskante — sonst stünde das durchgereichte Modul unter
   Umständen gar nicht in der Datei.
2. Der Bündler wird **laut**. Was nach dem Wickeln noch mit `import`
   oder `export` beginnt, hat kein Muster verstanden; das wirft jetzt
   mit Datei und Zeile. Seine eigene Kopfnotiz versprach das seit dem
   ersten Tag (*„soll auffallen statt geräuschlos durchzurutschen"*) —
   nur setzte den Satz nichts durch.

**Neu: `werkzeuge/pruefe-einzeldatei.mjs`** — 22 Behauptungen. Sie baut
die Datei und zerteilt sie mit `node --check` als Modul, so wie der
Browser sie lädt. Sie prüft außerdem, dass die Weiterausfuhr *aufgelöst*
und nicht bloß *gestrichen* wurde (gestrichen wäre syntaktisch sauber
und trotzdem falsch), und hält das laute Muster gegen vier Formen, die
es fangen muss, und fünf, die es in Ruhe lassen muss.

**Rotprobe, zweimal:**

| absichtlicher Fehler | was anschlug |
| --- | --- |
| Weiterausfuhr wieder unverstanden | **5 von 22** fielen — zuerst „SyntaxError: Unexpected token 'export'", dann die Stelle: *Zeile 9249* |
| laute Stelle stumm geschaltet | **4 von 22** fielen — das Muster erkennt `export default`, `export *`, Standardimport und Weiterausfuhr nicht mehr |

*Die Lehre, und sie gehört ins Fehlerbuch:* Ein Werkzeug, das „✓" meldet,
hat damit nichts über sein Ergebnis gesagt. Eine kaputte Datei ist
genauso groß wie eine heile. Geprüft gehört, was herauskommt — nicht,
dass etwas herauskam. Die Kette hat 36 Prüfungen lang niemals die
gebaute Datei angefasst; jetzt sind es 37, und eine davon tut es.

---

## 06.09.2026 — Der Kerker gehorcht dem Daumen

**Auftrag, wörtlich:** *„ja bitte hauptsächlich android compatible.
nutte subagent orchestation skill"*

Das Spiel lief bis eben nur mit einer Maus. Auf einem Android-Handy war
es unbedienbar — nicht „unschön", sondern unbedienbar: Ein Tipp löste
jede Aktion **zweimal** aus, die Leiste war dreizehn Bildpunkte hoch,
und die Zielanzeige hing am Schweben, das ein Finger nicht kann.

**Vier Flächen, vier Arbeitsbäume, ein Prüfer.** Aufgeteilt nach Datei,
nicht nach Tätigkeit, damit sich niemand ins Gehege kommt:

- `runtime/eingabe.js` — Zeigerereignisse statt Maus. Der Browser
  liefert bei einem Tipp die ganze Folge `pointerdown touchstart
  pointerup touchend click`; gehört wird **entweder** der Zeiger
  **oder** die Maus, nie beides (`runtime/start.js:939`). Ein zweiter
  Finger wird abgewiesen, damit kein Doppeltipp-Zoom das Bild verzieht.
- `runtime/oberflaeche.js` — die Leiste kennt einen Fingermodus und
  wird darin **48 Bildpunkte** hoch. Was gerade nicht geht, steht matt
  da, statt beim Antippen still zu versagen. Statt Schweben: zwei
  Schritte — erst antippen, dann bestätigen.
- `index.html`, `runtime/lobby.js` — Blattmaße für Android festgenagelt,
  Ruhezone, Knöpfe in 48 Punkten, quer zweispaltig, und ein verstecktes
  Eingabefeld, damit die echte Tastatur aufgeht.
- `runtime/start.js` — die Verdrahtung: Vollbild und Querformat hängen
  an einer Nutzergeste (ohne die verweigert Android beides), und die
  Vergrößerung wird **ganzzahlig** gerechnet, obwohl `devicePixelRatio`
  auf dem Pixel 7 krumm ist (2,625). Halbe Bildpunkte machen aus
  Pixelgrafik Matsch.

**Messung — die ganze Kette:** 36 Prüfungen grün in 66,5 s. 26 davon
melden **12.037 Behauptungen**, die zehn Wächter 27 weitere: **12.064**.
Die längsten Dateien liegen bei 999, 999 und 996 Zeilen (Regel 8: 1000).

**Messung — echtes Chromium, nicht der Ersatz.** Ein unabhängiger Prüfer
hat das gebaute Bündel in einem echten Browser bei 915 x 412 mit
`deviceScaleFactor` 2,625 und `hasTouch` geöffnet und **ausschließlich**
`page.tap()` benutzt:

- **9 von 9 Tipps kamen genau einmal an** — trotz der vollen
  Ereignisfolge. Das war der Fehler, der das Spiel unbedienbar machte.
- Die Leiste misst **genau 48 Reihen** (y 364…411). Im Hochformat
  360 x 640 ebenfalls 48.
- Vergrößerung **1** — ganzzahlig, keine halben Bildpunkte.
- Drei Züge durchgespielt: ein Schritt kostet 1 von 6 Aktionspunkten;
  der Knopf „Karte" schaltet um, **ohne** dass die Figur läuft; Zugende
  bringt eine neue Runde mit 6 Punkten zurück.
- Alle vier Extremkanten eines Knopfes treffen ihn.
- Konsole: nur der 404 für `favicon.ico`, den der Browser selbst holt.
  Alle 43 Module kamen mit 200.

**Rotprobe — 4 von 4 schlugen an** (eine Prüfung, die nie rot war, prüft
womöglich nichts):

| absichtlicher Fehler | was anschlug |
| --- | --- |
| `mousedown` zusätzlich gehört | „ein Tipp kommt genau einmal in der Lobby an, nicht zweimal: ist 2, soll 1" |
| Fingermodus abgeschaltet | „am Finger ist die Leiste daumengroß: 13 >= 48" |
| Knopf um 3 Punkte verschoben | **50 von 953** Behauptungen fielen |
| Sperre für gesperrte Knöpfe entfernt | „die Figur geht nicht auf das erreichbare Feld darunter: ist 2, soll 0" |

**Ein Befund des Prüfers, hiermit behoben:** In
`werkzeuge/buehne-browser.mjs` stand „Pixel 7 … wie ihn Chromium
nachstellt" — Playwrights eigene Angabe für dasselbe Gerät ist aber
863 x 360, weil sie die Browserleisten schon abzieht. Die Zahl 915 x 412
stimmt trotzdem: Sie ist der **ganze** Bildschirm, und im Vollbild wird
genau der gezeichnet. Jetzt steht die Quelle dabei und der Befehl, der
die andere Zahl nachrechnet (Regel 11).

**Neu als Werkzeug:** drei geteilte Bühnen — `buehne-eingabe.mjs`,
`buehne-oberflaeche.mjs`, `buehne-browser.mjs`. Sie behaupten nichts,
darum heißen sie nicht `pruefe-`; sie stellen den Aufbau bereit, den
zwei Prüfungen gemeinsam brauchen. `werkzeuge/eine-datei.mjs` wurde neu
geschrieben: Jedes Modul bekommt seinen eigenen Bereich, nachdem
**27 Namen** im Bündel kollidierten. Der Ordner war in Ordnung, das
Werkzeug war es nicht.

**Was der Prüfer ausdrücklich nicht prüfen konnte:** echte Hardware;
Vollbild und Querformat wurden nie ausgelöst; die Sperre für den zweiten
Finger ist im Betrieb nie angesprungen; Koop zu zweit bis viert an einem
Gerät wurde nicht gespielt.

---

## 06.09.2026 — Rüstzeug für verteiltes Arbeiten

**Auftrag, wörtlich:** *„nutte subagent orchestation skill"*

- `.claude/subagent-profile.md` — die stillen Fallen dieser Fläche, damit sie
  in jeden Auftrag wörtlich hineingehen statt als Verweis. Zehn Stück, alle
  aus dieser Sitzung gemessen: halbe Bildpunkte, zurückgesetzte Glättung,
  **doppelt ausgelöste Aktionen bei Tipp auf Android**, fehlendes Schweben,
  krummes `devicePixelRatio`, Doppeltipp-Zoom, Vollbild ohne Nutzergeste,
  48 Bildpunkte Mindestmaß.
- `WORKCLAIM.md` — vier Ansprüche eingetragen, einer je Fläche.

**Ein Fehler dabei, und er ist lehrreich:** Beide Dateien lagen beim Anlegen
der Arbeitsbäume **noch nicht im Commit**. Die drei Agenten arbeiteten
deshalb ohne das Profil — einer meldete es („`.claude/subagent-profile.md`
gibt es nicht"), ein zweiter trug sich regelkonform selbst in `WORKCLAIM.md`
ein und schrieb damit in eine fremde Datei. Beides war richtig gehandelt und
mein Versäumnis.

*Die Lehre:* Was ein Agent lesen soll, muss **committet** sein, bevor der
Arbeitsbaum entsteht — ein Arbeitsbaum kennt nur Commits, keine offenen
Änderungen. Steht jetzt im Profil.

---

## 06.09.2026 — Das Spiel ist im Netz erreichbar

**Auftrag, wörtlich:** *„linl zum spielen?"*

<https://kimpaliz.github.io/Hatred-/> — Zweig `gh-pages`, ausgeliefert
von GitHub Pages.

*Warum ein eigener Zweig und kein Bauschritt:* Der Zweig trägt genau
den Ordner, der auch daheim läuft — `index.html`, `runtime/`, `spiel/`,
`netz/`. Was live geht, ist byteweise das, was
`node werkzeuge/vorschau.mjs` ausliefert. Ein Bauschritt dazwischen
wäre eine zweite Wahrheit, in der ein Fehler stecken könnte, den daheim
niemand sieht.

*Warum `.nojekyll`:* Ohne diese leere Datei schiebt GitHub Pages jede
Auslieferung durch Jekyll, und Jekyll schluckt stillschweigend jeden
Ordner mit führendem Unterstrich — ohne Fehlermeldung.

**Gemessen, weil `github.io` aus dieser Umgebung nicht erreichbar ist:**
Der Zweig wurde lokal aus einem **Unterordner** über HTTP ausgeliefert
(`http://127.0.0.1:8155/Hatred-/`) und im echten Browser durchgespielt —
Titelbild, Heldenwahl, Kerker, keine Fehler außer dem `favicon.ico`,
das jeder Browser von selbst anfragt. Der Unterordner ist der Punkt:
Genau dort scheitern absolute Pfade, und genau dagegen steht Regel 14.

Bestätigt hat es GitHub selbst: der Lauf *pages build and deployment*
auf `gh-pages` steht auf **completed / success**.

⚠️ Sobald das Repository von `Hatred-` auf `hatred` umbenannt ist,
lautet die Adresse <https://kimpaliz.github.io/hatred/>; die alte
leitet weiter.

---

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
