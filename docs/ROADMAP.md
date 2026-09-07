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
