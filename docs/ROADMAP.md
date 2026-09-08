# Was als Nächstes — und warum in dieser Reihenfolge

Diese Seite sagt **warum** die Reihenfolge so ist. Was fertig ist, steht
im Vorgang, nicht hier (Regel 13). Jede Phase trägt ihre Vorgangsnummer
als `Vorgang: #N`, sobald sie einen hat, und ihr **Abnahmekriterium** —
den einen Satz, an dem sich entscheidet, ob sie fertig ist.

Die **offenen Entscheidungen** stehen bewusst nicht hier, sondern als
eigene Vorgänge mit dem Etikett `entscheidung`; ihre Begründung in
[SPIEL.md](SPIEL.md) 8. Eine Entscheidung hat eine andere Lebensdauer
als die Arbeit, die auf sie wartet — als Absatz in einer Phase
verschwände sie mit deren Abschluss, ohne beantwortet zu sein.

## Phase 1 — Der Rechenkern, bevor irgendetwas leuchtet

Vorgang: #1
**Abnahme:** `node werkzeuge/pruefe-alles.mjs` ist grün, und ein Lauf
über 40 Runden ergibt in zwei frisch gebauten Zuständen nach **jeder**
Runde dieselbe `zustandsSumme()`.


`spiel/` vollständig: Raster mit Höhen, Landschaft, Sicht, Licht als
Regel, Wegfindung, Katalog, Kampf, Züge und Aktionspunkte, Gegner-KI,
Lauf, Protokoll. Dazu je eine Prüfung.

*Warum zuerst:* Weil sich ohne den Kern nichts messen lässt. Eine
Landschaft, die schön aussieht, aber deren Ausgang nicht erreichbar ist,
fällt erst auf, wenn jemand vierzig Minuten spielt — oder in drei
Sekunden, wenn eine Prüfung sie über sechzig Saaten flutet.

## Phase 2 — Das Bild

Vorgang: #2
**Abnahme:** Eine erzeugte Karte ist im Browser vollständig zu sehen —
Höhenkanten, Rampen, Wasser, Fackellicht, Partikel — und kein
Zeichenaufruf liegt auf einem halben Bildpunkt.


Palette, Sprites als Text, Höhenkanten, Lichtkarte mit farbigen Quellen,
Pixelpartikel, Anzeige, Maus- und Tastenbedienung.

*Warum danach:* Weil das Bild den Kern liest und nicht umgekehrt. Wer
zuerst zeichnet, baut die Regeln in den Zeichner ein — und danach ist
Netz-Koop nicht mehr billig, sondern unmöglich.

## Phase 3 — Das Netz

Vorgang: #3
**Abnahme:** Zwei Rechner spielen dreißig Runden und haben nach jeder
Runde dieselbe `zustandsSumme()`; eine absichtlich verfälschte
Nachricht wird abgelehnt und ändert nichts.


Sitzung mit Schiedsrichter, Verbindung, Einladungscode, Desync-Wächter.

*Warum danach und nicht davor:* Der Kern ist ab Phase 1 netzfähig
(deterministisch, Aktionen statt Zuständen). Das Netz ist deshalb eine
dünne Schicht und keine Umbauarbeit. Vorher gebaut wäre es eine Schicht
über etwas, das sich noch bewegt.

## Phase 4 — Der Kerker als Lauf

Vorgang: #4
**Abnahme:** Ein Lauf über drei Kerkertiefen ist von Anfang bis Ende
spielbar und endet mit Sieg oder Niederlage.


Mehrere Tiefen, Beute, Truhen, Fähigkeiten steigern, Ausgang und
Abstieg, Sieg und Niederlage.

*Warum danach:* Es ist Inhalt, kein Umbau. Inhalt auf einem noch
wackeligen Unterbau muss zweimal gebaut werden.

## Phase 5 — Was Jannik nach dem ersten Abend sagt

Vorgang: #5
**Abnahme:** gibt es nicht — diese Phase wird von Janniks Rückmeldung
geschrieben, nicht vorher.


Bewusst leer. Der erste Abend zu viert sagt mehr über die Balance als
jede Messung — und eine Roadmap, die schon weiß, was danach kommt, hat
nicht zugehört.


---

# Welle 2 — Janniks Auftrag vom 07.09.2026

Phase 5 stand hier als *„bewusst leer — der erste Abend sagt mehr als
jede Messung"*. Sie ist jetzt beschrieben, und zwar nicht von uns: Am
07.09.2026 hat Jannik in zwei Nachrichten gesagt, wohin das Spiel geht.
Sein Wortlaut steht in den Vorgängen #6 bis #23, jeweils oben.

Die Reihenfolge unten ist **eine Empfehlung**, keine Festlegung — sie
folgt einer einzigen Regel: *Was viele andere Sachen blockiert, kommt
zuerst; was nur an sich selbst hängt, kann warten.*

## Block A — die Frage, die alles andere aufhielt

Vorgang: #6
**Abnahme:** erfüllt am 07.09.2026 — *„ja hexagon. raster form."*

*Warum sie zuerst kam:* Sie war die einzige Frage, die die Form jedes
Feldes festlegt. Wer Wasserbecken oder Optik vorher baut, baut sie
danach ein zweites Mal.

*Offen geblieben, aber nicht blockierend:* ob die Felder auch **aussehen**
sollen wie Sechsecke. Beide Wege beginnen mit denselben Regeln; erst
danach unterscheiden sie sich, und nur im Zeichnen. Die Frage wird
gestellt, wenn die Karte steht — dann ist sie ein Austausch des
Bodenmalers, keine Regeländerung.

## Block B — der Unterbau

Vorgang: #7
**Abnahme:** Eine Figur erreicht von jedem Feld genau sechs Nachbarn,
es gibt nur noch **ein** Entfernungsmaß statt zweier, und der Umbau
davor ist byteweise als folgenlos bewiesen.

*Warum danach:* Das Raster bestimmt die Form der Becken, die Form der
Becken bestimmt, was gezeichnet wird. Umgekehrt malt man zweimal.

### Ebenen mit Wasserbecken und Abgründen

Vorgang: #8
**Abnahme:** Eine erzeugte Karte hat auf mindestens zwei Ebenen je ein
Wasserbecken und einen Abgrund; man sieht über Abgründe hinweg und
kann jemanden hineinstoßen.

### Optik nach Scotophobia

Vorgang: #9
**Abnahme:** Fünf benannte, prüfbare Merkmale sind grün — Licht in
mindestens fünf Stufen, farbige Quellen mischen sich, Körnung im Fels,
harte Kanten, Vorlauf im selben Ton.

*Warum das trotzdem vorziehbar ist:* Licht und Nebel in Stufen hängen
nicht an der Feldform. Das ist der eine Teil, der ohne Verlust vor die
Rasterfrage passt.

## Block C — sehen und verstehen

Vorgang: #10
**Abnahme:** Ein Held mit Weitblick sieht im Bild genauso weit wie nach
den Regeln, ein geblendeter ebenso, und zwei Rechner mit verschiedener
Bildrate erinnern sich an dieselben Felder.

*Warum hier:* Das gemeinsame Sichtfeld gibt es schon — aber es trägt
zwei gemessene Fehler, die heute falsche Sicht erzeugen. Das ist
Reparatur, kein Ausbau, und Reparatur geht vor.

### Kamera näher dran und zoombar

Vorgang: #11
**Abnahme:** Voreingestellt sieht man deutlich weniger Felder als
heute, jede Zoomstufe ist eine ganze Zahl, zwei Finger zoomen und ein
Finger tippt weiterhin genau einmal.

### Klare Anzeige, die nichts dauerhaft verdeckt

Vorgang: #12
**Abnahme:** Die dauerhaft verdeckte Fläche ist kleiner als die heute
gemessenen 7,84 % (Handy, Maus) beziehungsweise 11,84 % (Handy,
Finger) — und kein Wert, den ein Spieler braucht, ist unerreichbar.

### Gegner: Werte, Fähigkeiten und Merkmale einsehbar

Vorgang: #13
**Abnahme:** Jeder Wert aus dem Gegnerkatalog ist auf höchstens einem
Handgriff erreichbar, geprüft gegen den Katalog statt gegen eine Liste
von Hand.

## Block D — Kampf und Inhalt

Vorgang: #14
**Abnahme:** Eine Figur ohne Waffe kann zuschlagen, und Fausthieb und
Dolch unterscheiden sich in mindestens zwei Werten spürbar im Kampf.

*Warum absichtlich klein:* Zwei Waffen mit klarem Unterschied sind der
Maßstab, an dem sich Waffe drei messen lassen muss.

### Flüssigkeiten im Kampf

Vorgang: #15
**Abnahme:** Jede der sechs Flüssigkeiten hat mindestens eine messbare
Wirkung; Öl fängt an einer Flamme Feuer, Wasser löscht es; zwei Rechner
kommen auf dieselbe Zustandssumme.

*Warum das die größte Lücke ist:* Sechs Flüssigkeiten werden heute
erzeugt und gezeichnet — und tun im Kampf **nichts**. Gemessen:
`grep -rn "fluessig" spiel/kampf.mjs spiel/zug.mjs spiel/wesen.mjs`
findet null Treffer.

### Gegnervölker: Untote, Monster, Dämonen, Kultisten

Vorgang: #16
**Abnahme:** Jeder Gegner hat genau ein Volk und mindestens ein
Merkmal; jedes Volk hat ein Verhalten, das die anderen nicht haben.

### Elite-Gegner und Bosse

Vorgang: #17
**Abnahme:** Zwei Rechner mit derselben Saat bekommen dieselben
Elite-Zusätze auf denselben Gegnern, und ein Elite ist ohne Antippen
erkennbar.

### Item-System und Beute

Vorgang: #18
**Abnahme:** Kein Gegenstand hat eine eigene Regel im Code — jeder ist
eine Liste von Wirkungen; gleiche Wirkungen stapeln sich; zwei Rechner
finden dieselbe Beute an denselben Stellen.

## Block E — die Home-Base

Vorgang: #19
**Abnahme:** Jede Kategorie ist mit einem Tipp erreichbar, die Base
sieht bei jedem Start gleich aus, zwei Browser sehen dieselbe Lobby —
und es geht **kein Ort** über die Leitung.

*Warum das jetzt einfach ist:* Hier stand bis zum 07.09.2026 die
größte technische Warnung des ganzen Plans. Gleichzeitige Bewegung hat
keine Reihenfolge, und das Netz-Koop von Hatred steht darauf, dass alle
Rechner dieselben Züge in derselben Reihenfolge rechnen — zwei Spieler
laufen zur selben Zeit, und wer zuerst da war, kann auf zwei Rechnern
verschieden ausfallen.

Jannik hat die Frage weggeräumt, bevor wir sie beantworten mussten:
*„man könnte in der base auch statt sich zu bewegen einfach einen
passendes ui haben mit lobby und den einzelnen handwerkern als
kategorie"*. Wo niemand läuft, kann niemand aneinander vorbeilaufen.
Kein zweiter Netzmodus, kein zweites Protokoll — nur Handlungen, wie
das Spiel sie ohnehin schon verschickt.

*Warum trotzdem zuletzt:* Die Base ist der Rahmen, in dem alles andere
Sinn ergibt. Ohne Kiste ist Beute wertlos, ohne Missionen sind Biome
Zierde. Sie kann unabhängig entstehen, aber sie braucht etwas, das sie
umrahmt.

### Private Kiste — Besitz über alle Läufe

Vorgang: #20
**Abnahme:** Beute überlebt das Neuladen; ein abgebrochener
Schreibvorgang hinterlässt die alte Kiste, nie eine kaputte; eine Kiste
aus der Vorfassung wird gelesen statt weggeworfen.

### Schmiede, Alchimist, Arcanist

Vorgang: #21
**Abnahme:** Jede Werkstatt kann mindestens eine Sache, die die anderen
beiden nicht können — geprüft, nicht behauptet.

### Missionen: Ziele und Biome

Vorgang: #22
**Abnahme:** Mindestens drei Zieltypen, jeder gewinnbar **und**
verlierbar; mindestens zwei Biome, die sich in drei messbaren Werten
unterscheiden; zwei Rechner erzeugen byteweise dieselbe Karte.

*Die Reihenfolge in diesem Block ist fest:* Ohne Base keine Kiste, ohne
Kiste keine Werkstatt, ohne Base kein gemeinsamer Missionsstart.

## Block F — vorgemerkt, nicht gebaut

Vorgang: #23
**Abnahme:** gibt es nicht. Dieser Vorgang wird geschlossen, wenn
Jannik ihn aufteilt und aufruft.

Er steht als Vorgang, damit die Absicht nicht verlorengeht — und damit
niemand sie als Lücke meldet.

---

**Was diese Welle nicht ändert.** Die Grenzen aus `CLAUDE.md` gelten
weiter: kein Server, kein fremder Dienst zur Laufzeit, kein Konto,
keine Bilddateien, kein Ton. Die private Kiste (#20) liegt im Browser —
das ist der Grund, warum sie an Gerät und Browser hängt, und die
einzige Stelle dieser Welle, an der eine Projektgrenze spürbar wird.

---

# Welle 3 — Die Weltgenerierung, Auftrag vom 08.09.2026

Jannik hat die Welle 2 unterbrochen: *„sehr gut schon. aber wir müssen
uns über die weltgenerierung erst mal im klaren werden."* Sein Wortlaut
steht vollständig in [UEBERGABE.md](UEBERGABE.md) 2 und oben in jedem
Vorgang dieser Welle.

Die Welle 2 ist damit nicht verworfen. Sie ruht: Die Vorgänge #10 und
#12 bis #23 bleiben stehen und werden wieder aufgenommen, wenn die Welt
steht.

**Warum die Reihenfolge hier von Janniks Reihenfolge abweicht.** Er
nennt zuerst die flache Karte und danach die Wände. Die Messung sagt
das Gegenteil, und zwar deutlich: Die heutigen Wände sind im Bild
überhaupt nur zu erkennen, weil sie höher stehen als der Boden davor
(`runtime/granit-feld.js:200`, Faktor `0,63 + ebene * 0,27`) und weil
der Nebel alles Unbeleuchtete schluckt. Nimmt man die Höhen zuerst
heraus, sinkt der Helligkeitssprung an einer Wandgrenze im Verhältnis
zur Körnung des Bodens von 0,18 auf **0,06** — die Wand verschwindet
also im Rauschen, bevor irgendjemand sie ersetzt hat. Dazwischen läge
ein Zustand, den Jannik nicht bedienen kann.

Die Reihenfolge unten ist deshalb **eine Empfehlung mit Messung
dahinter**, keine Korrektur seines Auftrags. Entscheidet er anders,
wird anders gebaut — die Entscheidung steht als E1 in
[UEBERGABE.md](UEBERGABE.md) 5.

## W1 — Wände, die man ohne Licht erkennt

Vorgang: #24
**Abnahme:** Auf einer flachen Karte ist der Felspunkt an mindestens
**95 %** aller Grenzen dunkler als der Bodenpunkt daneben (gemessen am
08.09.2026: 51,1 %, also ein Münzwurf), und der Sprung ist **größer als
die Körnung im Boden** — Verhältnis mindestens 1,5 statt der heute
gemessenen 0,06. Nachzurechnen mit
`node werkzeuge/miss-wandkontrast.mjs`.

*Warum zuerst:* Weil jeder folgende Schritt an dieser Zahl hängt und
zwei davon sie verschlechtern. Und weil Janniks eigener Satz sie zur
wichtigsten Sache erklärt: *„gut erkennbare wände, dass ist unendlich
wichtig"*.

*Warum die Schwelle bei 95 % liegt und nicht bei 80 %:* Den Fels
einfach dunkler zu tönen genügt nicht. Zur Probe am 08.09.2026 mit dem
Faktor 0,45 auf Wandfeldern gemessen: Der Münzwurf steigt von 51,1 %
auf **80,9 %**, das Verhältnis zur Körnung von 0,06 auf 2,97 — jede
fünfte Kante bleibt trotzdem falschherum. Der Grund ist die Körnung
selbst: Ein heller Krümel im Fels schlägt eine dunkle Tönung. Über
95 % kommt nur, wer dem Fels eine **Kontur** gibt statt nur einen Ton.

## W2 — Massives Gestein, das nach Tiefe dunkler wird

Vorgang: #25
**Abnahme:** Jedes Felsfeld trägt eine gemessene Tiefe zur Sichtseite
(0 Felder ohne), die Verdunkelung fällt über mindestens vier Stufen
streng monoton, und der Materialdurchlauf einer 56×40-Karte wird um
höchstens 30 % teurer als die heute gemessenen 1.841 ms.

*Warum das billig ist:* Das Tiefenmaß gibt es als Flutfüllung vom
offenen Raum aus; über zehn Saaten hat es 0 Lücken und reicht bis Tiefe
13 bis 30. Der geglättete Verlauf über alle 701.568 Weltbildpunkte
kostet 483 ms, also 26,3 % Aufschlag. **Nicht** dafür zu gebrauchen ist
`wandNaehe` — es sättigt bei 4,25 Feldern.

## W3 — Deko aus, Licht bleibt an

Vorgang: #26
**Abnahme:** Keine Zier mehr auf der Karte, und trotzdem mindestens 20
Fackelsockel je Karte — beides in **einer** Prüfung behauptet, damit
niemand das eine mit dem anderen abschaltet.

*Warum die Warnung nötig ist:* Deko abschalten ist ein einziger Aufruf
(`setzeZier`), und genau 1 Behauptung fällt dabei. Die Fackelsockel
kommen aber aus `setzeFackeln` (26,50 je Karte) und sind heute die
einzige Lichtquelle im Spiel. Wer beides für Zierde hält, macht die
Karte schwarz.

## W4 — Nur Räume und Gänge, eine Ebene

Vorgang: #27
**Abnahme:** Über 20 Saaten: genau **1** zusammenhängender Bereich,
**0** unerreichbare Felder, genau **1** Ebene und mindestens 400 offene
Felder je Karte.

*Warum kein neuer Erzeuger nötig ist:* `spiel/welt-feld.mjs` kann Räume
(`raumBei`, Zeile 116) und geschwungene Gänge (`machePfad`, Zeile 154)
bereits. Drei Zahlen in `spiel/bauart.mjs` schalten von Höhle auf
Raumfolge um; mit `schwelle: 2`, `wamp: 0`, `wamp2: 0` und flachen
Höhen ergaben 20 Saaten im Mittel 472,9 offene Felder, 1 Bereich, 1
Plateau, 0 unerreichbare Felder.

*Was vorher passieren muss:* `pruefe-becken.mjs` bleibt grün, wenn es
gar keine Becken mehr gibt — sie prüft Aussagen **über** die gefundenen,
nicht die Aussage, dass es welche gibt. Ohne eine
Mindestmengen-Behauptung merkt niemand, dass hier eine Prüfung die leere
Menge misst. Das ist W7, und es gehört vor diesen Schritt.

*Und was dabei zusätzlich rot wird:* Bei flachen Höhen fielen am
08.09.2026 auch `landschaft` (8 Behauptungen), `lauf` (3) und `tippen`
(2). `lauf` ist echt (siehe W8), `tippen` hat fest eingetragene
Bildschirmkoordinaten und meldet *„die Figur steht dort (x): ist 31,
soll 30"* — ein Fehler, den es nicht gibt.

## W5 — Sicht in zwei Stufen

Vorgang: #28
**Abnahme:** offen, bis Entscheidung **E3** beantwortet ist. Janniks
Wortlaut *„lichtkegel sicht, soll in zwei stufen existieren"* steht
gegen die angenommene Abnahme von #9 (*„Licht in mindestens fünf
Stufen, nicht als Schalter"*). Beides zugleich geht nur, wenn „zwei
Stufen" die **Sicht** meint und „fünf Stufen" die **Helligkeit** —
das ist eine Vermutung und muss bestätigt werden.

*Was heute fehlt:* Einen Lichtkegel an der Figur gibt es nicht, weder
als Regel in `spiel/` noch als Bild in `runtime/`. Alles Licht kommt
aus den Fackelsockeln.

## W6 — Der Kartenknopf

Vorgang: #29
**Abnahme:** Eine Prüfung sieht das Bild an, das der Kartenknopf
erzeugt, und schlägt an, wenn Wände darin nicht vom Boden zu trennen
sind. Was der Knopf zeigen **soll**, ist Entscheidung **E2**.

*Warum es heute kaputt aussieht:* Der Knopf nimmt den Nebel weg. Der
Nebel ist die einzige Quelle der Wanderkennung (W1). Janniks Befund
*„gibt es grafikfehler und alles sieht komisch aus"* ist damit kein
Zeichenfehler, sondern derselbe Befund wie W1 — nur ungefiltert. Keine
Prüfung sieht dieses Bild heute an.

## W7 — Die Wächter nachziehen

Vorgang: #30
**Abnahme:** Keine Prüfung redet mehr über eine Menge, ohne zuerst zu
behaupten, dass sie nicht leer ist. Schaltet man die Höhen ab, ist
`pruefe-becken.mjs` **rot** statt grün, und die Zahl der Behauptungen,
die dabei **lautlos verschwinden**, ist 0 statt der gemessenen 2.

*Warum das eine eigene Arbeit ist:* Am 08.09.2026 wurden die Höhen in
einem eigenen Arbeitsbaum abgeschaltet und die ganze Kette laufen
gelassen. Von rund 43.900 Behauptungen fielen **19** — `abgrund` 6,
`landschaft` 8, `lauf` 3, `tippen` 2. `pruefe-becken.mjs` blieb 53 von
53 grün und druckte dabei *„30 trocken, 0.0 Wasserkacheln je Karte"*.
Bei `abgrund` sank die Gesamtzahl von 124 auf 122 — zwei Behauptungen
sind lautlos verschwunden. Das klingt beruhigend und ist es nicht: Es
heißt, dass die Prüfkette einen Umbau dieser Größe fast nicht bemerkt.

## W8 — Höhen zurück

Vorgang: #31
**Abnahme:** Die Abnahme von #8 gilt wieder (zwei Ebenen mit Becken und
Abgrund je Karte), **und** das Verhältnis aus W1 bleibt über seiner
Schwelle — die Wände dürfen ihre Erkennbarkeit nicht wieder an die Höhe
abgeben.

*Warum zuletzt:* Janniks Reihenfolge, wörtlich: *„dann erst fangen wir
mit unterschiedlichen höhen an."*

*Was dabei zu klären ist:* Ohne Höhen fällt der Höhenvorteil im Kampf
weg. Ein Lauf, der heute 40 Runden hält, endet flach in Runde 27 mit
Niederlage (`node werkzeuge/pruefe-lauf.mjs`). Diese Prüfung wird nicht
entschärft — entweder nimmt Jannik die härtere Balance an (Entscheidung
**E5**), oder der Kampf bekommt einen Ausgleich.
