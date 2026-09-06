# Was als Nächstes — und warum in dieser Reihenfolge

Diese Seite sagt **warum** die Reihenfolge so ist. Was fertig ist, steht
im Vorgang, nicht hier (Regel 13). Jede Phase trägt ihre Vorgangsnummer
als `Vorgang: #N`, sobald sie einen hat.

## Phase 1 — Der Rechenkern, bevor irgendetwas leuchtet

`spiel/` vollständig: Raster mit Höhen, Landschaft, Sicht, Licht als
Regel, Wegfindung, Katalog, Kampf, Züge und Aktionspunkte, Gegner-KI,
Lauf, Protokoll. Dazu je eine Prüfung.

*Warum zuerst:* Weil sich ohne den Kern nichts messen lässt. Eine
Landschaft, die schön aussieht, aber deren Ausgang nicht erreichbar ist,
fällt erst auf, wenn jemand vierzig Minuten spielt — oder in drei
Sekunden, wenn eine Prüfung sie über sechzig Saaten flutet.

## Phase 2 — Das Bild

Palette, Sprites als Text, Höhenkanten, Lichtkarte mit farbigen Quellen,
Pixelpartikel, Anzeige, Maus- und Tastenbedienung.

*Warum danach:* Weil das Bild den Kern liest und nicht umgekehrt. Wer
zuerst zeichnet, baut die Regeln in den Zeichner ein — und danach ist
Netz-Koop nicht mehr billig, sondern unmöglich.

## Phase 3 — Das Netz

Sitzung mit Schiedsrichter, Verbindung, Einladungscode, Desync-Wächter.

*Warum danach und nicht davor:* Der Kern ist ab Phase 1 netzfähig
(deterministisch, Aktionen statt Zuständen). Das Netz ist deshalb eine
dünne Schicht und keine Umbauarbeit. Vorher gebaut wäre es eine Schicht
über etwas, das sich noch bewegt.

## Phase 4 — Der Kerker als Lauf

Mehrere Tiefen, Beute, Truhen, Fähigkeiten steigern, Ausgang und
Abstieg, Sieg und Niederlage.

*Warum danach:* Es ist Inhalt, kein Umbau. Inhalt auf einem noch
wackeligen Unterbau muss zweimal gebaut werden.

## Phase 5 — Was Jannik nach dem ersten Abend sagt

Bewusst leer. Der erste Abend zu viert sagt mehr über die Balance als
jede Messung — und eine Roadmap, die schon weiß, was danach kommt, hat
nicht zugehört.

---

## Offene Entscheidungen

Diese Punkte blockieren Arbeit und sind **Janniks** Entscheidung. Sie
werden hier nur benannt, nicht beantwortet.

| Frage | steht in |
| --- | --- |
| Vermittlung im Netz: Code von Hand, eigener Vermittler, oder dauerhafter Dienst? | `docs/SPIEL.md` 8.1 |
| Wie viele Kerkertiefen hat ein Lauf? | `docs/SPIEL.md` 8.2 |
| Ist Tod endgültig, oder hebt ein Mitspieler auf? | `docs/SPIEL.md` 8.3 |
