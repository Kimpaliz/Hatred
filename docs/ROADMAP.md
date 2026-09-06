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
