# Fehlerbuch — was sich wiederholt, und woran man es erkennt

**Vor dem ersten Shell-Einzeiler lesen.** Hier stehen die Fehler, in die
man ohne Vorwarnung hineinläuft, sortiert nach Klasse. Jeder Eintrag
sagt: das Anzeichen, die Ursache, die Prüfung, die ihn fängt.

## Klasse A — Raster und Höhen

**A1 — Der Rand.** Ein Zugriff auf `(x, -1)` liefert bei flachen
Zahlenreihen nicht „außerhalb", sondern die letzte Zeile darüber. Das
Sichtfeld schaut dann um die Karte herum.
*Deshalb:* `karte.drin(x, y)` prüft, und **außerhalb gilt als Wand** —
in `blocktBewegung`, `blocktSicht` und `gibtDeckung` gleichermaßen.
`ebeneBei` gibt außerhalb `-1`, nie `0`.
*Anzeichen:* Gegner „sehen" durch den Kartenrand.

**A2 — Die Rampe zeigt in die falsche Richtung.** Eine Rampe liegt auf
dem **tieferen** Feld und zeigt **hinauf**. Wer sie aufs obere Feld
legt, bekommt eine Karte, auf der man von oben nicht herunterkommt und
von unten nicht hinauf.
*Prüfung:* `pruefe-hoehen.mjs` — Aufstieg über eine Rampe in falscher
Richtung muss verboten sein.

**A3 — Sturz als Abstieg gezählt.** −1 Ebene ist ein Schritt, −2 ist ein
Sturz. Wer `Math.abs` nimmt, macht aus dem Aufstieg einen Sturz.
*Anzeichen:* Figuren nehmen Schaden beim Treppensteigen.

**A4 — Höhenvorteil verkehrt herum.** `ebene(angreifer) − ebene(ziel)`,
nicht umgekehrt. Der Fehler ist beim Tippen leicht und im Spiel
unsichtbar (man trifft halt schlechter von oben).
*Prüfung:* Beide Richtungen einzeln behaupten, nicht nur „es ändert sich
etwas".

## Klasse B — Determinismus und Netz

**B1 — `Math.random` schleicht sich ein.** Meist über eine Hilfsfunktion,
die „nur zum Mischen" gebraucht wird. Das Spiel läuft weiter — auf jedem
Rechner anders.
*Prüfung:* `pruefe-kern.mjs`, Textsuche über alle Code-Zeilen unter
`spiel/`.

**B2 — Ungeordnete Iteration.** `Object.keys`, `Set` und `Map` haben in
JavaScript eine **Einfügereihenfolge**, keine sortierte. Zwei Rechner,
die in anderer Reihenfolge eingefügt haben, laufen auseinander.
*Deshalb:* In der Wegfindung wird bei Kostengleichheit nach Feldindex
sortiert, und Richtungen werden immer in der Reihenfolge aus
`RICHTUNGEN` genommen.
*Anzeichen:* Der Desync-Wächter schlägt nach der zwanzigsten Runde an,
nie in der ersten.

**B3 — Gleitkomma über die Leitung.** Zwei Browser runden `0.1 + 0.2`
gleich, aber `Math.pow` und `Math.sin` nicht zwingend. Wo eine Regel an
einer Zahl hängt, wird ganzzahlig gerechnet oder ausdrücklich gerundet.

**B4 — Zufallsstrom verschoben.** Wer eine zusätzliche Fackel setzt und
dafür denselben Strom benutzt wie der Kampf, verschiebt jeden späteren
Trefferwurf. Deshalb `zufall.zweig()` für alles, was nur die Landschaft
angeht.

## Klasse C — Werkzeuge dieser Umgebung

**C1 — `<befehl> | tail -25; echo $?` meldet den Code von `tail`.**
Echten Code holen: `<befehl> > lauf.txt 2>&1; echo "code=$?"`.

**C2 — Ausgaben von Messläufen gehören außerhalb des Projekts.** Sonst
sieht die Arbeitsweise-Prüfung sie als offene Änderung. In den
Kritzelordner schreiben, nicht ins Repository.

**C3 — Zeilenenden.** Die der Zieldatei übernehmen, nicht die eigenen.
Nie mit `grep`/`cat -A` beurteilen — `file` nehmen oder Bytes zählen.

**C4 — Der Arbeitsordner springt zurück.** In dieser Umgebung setzt sich
das Arbeitsverzeichnis zwischen Befehlen zurück. Immer absolute Pfade
oder `cd <pfad> && …` in **einem** Befehl.

## Klasse D — Bild

**D1 — Halbe Bildpunkte.** Sobald eine Figur auf `x = 12.5` gezeichnet
wird, glättet der Browser sie weich — und die ganze Pixelgrafik ist
dahin. Alles wird auf ganze Bildpunkte gerundet, die Vergrößerung ist
immer **ganzzahlig**, und `imageSmoothingEnabled` ist aus.

**D2 — Gerade Kantenlängen bei Sprites.** Ein Sprite mit gerader Breite
hat keine Mitte; beim Drehen wandert sie um einen halben Bildpunkt.
Ungerade Kantenlängen nehmen.

**D3 — Zwei Töne zu nah beieinander.** Was auf dem Bildschirm
unterscheidbar aussieht, verschmilzt verkleinert zu einem Klumpen. Zwei
Töne **in einer Figur** brauchen 24 von 255 Rec.-709-Helligkeit; zwei
**Ebenen** nur 14, weil sie zusätzlich durch eine harte Schattenkante
getrennt sind.
*Prüfung:* `pruefe-palette.mjs` rechnet beide Schwellen nach.

**D4 — Licht durch die Wand.** Eine Lichtquelle, die nur nach Abstand
rechnet, leuchtet in den Nachbarraum. Der Abfall muss die Sichtlinie
kennen.

## Klasse E — Züge

**E1 — Der Zeiger überspringt.** Stirbt das Wesen, das gerade dran ist,
und man rückt den Zeiger weiter *und* entfernt es aus der Liste, kommt
das nächste nie dran.
*Prüfung:* Drei volle Runden mit einem Todesfall in der Mitte.

**E2 — Halbe Aktion.** Eine abgelehnte Aktion darf **nichts** am Zustand
geändert haben. Wer erst bewegt und dann die Punkte prüft, hat schon
verloren.

**E3 — Wacht löst nicht mitten in der Bewegung aus.** Der Fall, den man
beim ersten Bauen vergisst: Die Bewegung wird Feld für Feld
abgearbeitet, und nach **jedem** Feld wird geprüft.
