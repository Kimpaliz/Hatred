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

**C5 — Ein „✓" eines Werkzeugs sagt nichts über sein Ergebnis.** Am
06.09.2026 meldete `werkzeuge/eine-datei.mjs` *„✓ 43 Module → 780,8 kB"*
und lieferte eine Datei, die im Browser keine einzige Zeile ausführte
(`Unexpected token 'export'`). Eine kaputte Datei ist genauso groß wie
eine heile; die Größe ist kein Beweis. **Woran man es erkennt, bevor
man hineinläuft:** Gibt es zu dem, was ein Werkzeug *erzeugt*, eine
Prüfung, die das Erzeugte selbst anfasst? Wenn nicht, ist das Werkzeug
ungeprüft, egal wie grün die Kette ist — sie war es hier, 36 Prüfungen
lang. Gegenmittel steht in `tests/pruefe-einzeldatei.mjs`:
bauen, dann `node --check` auf das Ergebnis.

**C7 — Ein verschachteltes Antwortformat für Agenten schlägt fehl,
nachdem die Arbeit schon getan ist.** Am 07.09.2026 haben sechs Agenten
je 12–15 Messungen durchgeführt und **keiner** konnte abliefern: Das
vorgegebene Format verlangte eine Liste von Objekten mit Auswahlfeldern,
und die Prüfung wies fünf Versuche je Agent zurück. 375.742 Token für
nichts. **Woran man es erkennt, bevor man hineinläuft:** Könnte man das
Format selbst aus dem Kopf fehlerfrei ausfüllen? Wenn nein, ist es zu
eng. Reiner Text mit festen Überschriften kommt immer durch — und lässt
sich hinterher genauso lesen.

**C6 — Ein Bündler aus Mustern kennt nur die Formen, die er kennt.**
Dieselbe Sache von der anderen Seite: Als `runtime/oberflaeche.js` eine
Weiterausfuhr bekam (`export { … } from "./x.js"`), passte kein Muster,
und die Zeile blieb **wörtlich** stehen — geräuschlos. **Woran man es
erkennt:** Wer eine Datei aufteilt und die Namen durchreicht, führt eine
neue Modulform ein. Danach die Einzeldatei bauen und zerteilen lassen,
nicht nur die Kette laufen lassen. Jedes Musterwerkzeug braucht die
Stelle, an der es zugibt, dass es etwas nicht verstanden hat.

**C8 — Ein „*Geprüft:*"-Verweis zeigt auf eine Datei, die etwas ganz
anderes prüft.** Unter Regel 14 („Alle Importpfade sind relativ") stand
als Beweis `pruefe-verweise.mjs`. Jene Datei hält Markdown-Verweise der
Doku gegen die Platte und sieht **keinen einzigen** Importpfad. Die
Regel war damit unbelegt — und weil es die genannte Datei gibt und ihr
Name plausibel klingt, stand das rund zwei Wochen unbemerkt da (Befund
vom 07.09.2026). Dieselbe Fehlannahme stand ein zweites Mal im Kopf von
`.github/workflows/pages.yml`.
**Woran man es erkennt, bevor man hineinläuft:** Die genannte Datei
aufschlagen und nach dem **Gegenstand** der Regel suchen. Steht er nicht
drin, ist die Regel unbelegt; ein Dateiname beweist nichts.
*Prüfung:* `pruefe-regelwerk.mjs`. Sie fragt ausdrücklich **nicht**, ob
es die Datei gibt — das wäre am 07.09.2026 grün geblieben —, sondern ob
die Datei in ihrer **Kopfnotiz** die Regelnummer zurückgibt.

**C9 — Eine Zahl aus einem Lauf ist keine Messung.** Am 08.09.2026 ergab
ein einzelner Bildratenlauf für dieselbe Änderung **+9 Prozent**, fünf
abwechselnde Läufe für genau dieselbe Änderung **+82 Prozent**. Beide
Zahlen waren echt gemessen; die erste war die Tagesform der Maschine.
*Deshalb:* Stände **abwechselnd** messen (a, b, a, b, …), nie erst alle
a und dann alle b — sonst misst man den Lastverlauf des Rechners.
Median nehmen, Spanne und Zahl der Läufe mitschreiben. Die Tabelle im
Changelog-Eintrag vom 08.09.2026 („Licht als gebündelter Pixelpuffer")
zeigt die Form.
*Anzeichen:* Eine Verbesserung, die sich beim zweiten Nachmessen
halbiert oder verdoppelt.

**C10 — Eine Ausgabe, die durch `tail` läuft, ist bis zum Ende des
Befehls unsichtbar.** `tail` muss das Ende kennen und puffert deshalb,
bis der Strom schließt. Am 08.09.2026 lief ein Messlauf eine halbe
Stunde, ohne dass jemand sah, dass er längst hing — die Kette druckt je
Prüfung eine Zeile, und keine davon kam an.
*Deshalb:* Lange Läufe in eine Datei schreiben und die Datei nebenher
ansehen: `<befehl> > /tmp/lauf.txt 2>&1; echo "code=$?"`, dazwischen
`tail /tmp/lauf.txt`. Dieselbe Zeile löst auch C1.
*Anzeichen:* Ein Befehl „arbeitet" minutenlang, ohne eine einzige Zeile
zu liefern, obwohl das Werkzeug sonst laufend welche druckt.

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

## Klasse F — Geheimnisse und Ausgeliefertes

**F1 — Ein Zugangswort, das im eigenen Ablageort steht.** Am 07.09.2026
war „grubenhund" als Wort für das Tor vorgeschlagen — der Name eines
Gegners aus dem eigenen Katalog. Er steht zwölfmal in neun Dateien
(gemessen am 08.09.2026 mit `grep -roi grubenhund . | wc -l` und
`grep -ril grubenhund . | wc -l`), mehrere davon werden an den Browser
ausgeliefert. Ein Wörterbuchangriff, der **nur** die Wörter des eigenen
Baums durchprobiert, hätte das Wort in einer Viertelstunde gefunden —
gegen ein Tor, das mit 200.000 Runden rechnet und deshalb sicher aussah.
**Woran man es erkennt, bevor man hineinläuft:** Das Wort **vor** dem
Rechnen im Baum suchen, und zwar wörtlich statt über Fingerabdrücke —
das kostet Millisekunden statt Minuten und ist genauer.
*Gegenmittel:* `werkzeuge/zugangswort.mjs` tut genau das. Wer ein Wort
nimmt, das schon dasteht, bekommt keine Zeile zum Austauschen, sondern
eine Absage mit der Fundstelle; `--suche` fährt den ganzen Angriff
einmal vor.
*Anzeichen:* Das Wort „fühlt sich passend an" — es kommt aus der
Fachsprache des Projekts. Genau das ist der Fehler.

## Klasse G — Prüfungen, die nichts mehr prüfen

**G1 — Eine Prüfung, die eine leere Menge misst, ist grün.** Am
08.09.2026 wurden zum Messen die Höhen abgeschaltet (`spiel/bauart.mjs`:
`hoehenSchwellen` auf `[9, 9, 9]`, `wandAnhebung` auf `0`) und die ganze
Kette laufen gelassen. Von rund 43.900 Behauptungen fielen **19**.
`tests/pruefe-becken.mjs` blieb dabei **53 von 53 grün** und druckte
wörtlich: *„30 Karten 44 × 32: 0 mit Wasser auf mindestens zwei Ebenen,
30 trocken, 0.0 Wasserkacheln je Karte"*. Sie prüft Aussagen **über**
die gefundenen Becken — und keine davon wird falsch, wenn es kein
einziges Becken mehr gibt. Bei `pruefe-abgrund.mjs` sank die Zahl der
Behauptungen zugleich von 124 auf 122: **zwei sind lautlos
verschwunden**, weil ihre Schleife über eine leere Liste lief. Eine
verschwundene Behauptung meldet niemand; sie fehlt einfach.
**Woran man es erkennt, bevor man hineinläuft:** Vor jedem Umbau, der
etwas *weglässt*, den Umbau erst in einem Arbeitsbaum zur Probe machen
und die Kette laufen lassen. Bleibt eine Prüfung grün, deren Gegenstand
gerade verschwunden ist, fehlt ihr die Mindestmengen-Behauptung. Und die
Zahl der Behauptungen je Prüfung vorher und nachher vergleichen — sie
darf nicht sinken.
*Gegenmittel:* Jede Prüfung, die über eine gefundene Menge redet, sagt
**zuerst**, wie viele es mindestens sein müssen. Das ist Regel 10 in
ihrer strengsten Lesart: geprüft wird der Fall, der ohne die Arbeit
falsch wäre — und „es gibt gar keine" ist dieser Fall.
*Anzeichen:* Eine Prüfung, deren Meldezeile lauter Nullen enthält und
die trotzdem ein Häkchen bekommt.

**G2 — Fest eingetragene Koordinaten in einer Prüfung.** Dieselbe Probe
machte `tests/pruefe-tippen.mjs` rot: *„und die Figur steht dort
(x): ist 31, soll 30"*. Die 30 beschreibt die Karte, wie der Erzeuger
sie heute erzeugt, und sonst nichts. Wer den Erzeuger ändert, bekommt
einen Fehler gemeldet, den es nicht gibt — und gewöhnt sich das
Übergehen an, was schlimmer ist als der Fehler.
**Woran man es erkennt:** In der Prüfung nach Zahlenpaaren suchen, die
wie Feldkoordinaten aussehen. Steht daneben keine Ableitung, sondern nur
die Zahl, hängt die Prüfung an einer bestimmten Karte.
*Gegenmittel:* Das Ziel aus der Karte holen statt es hinzuschreiben —
etwa „das erste begehbare Feld nördlich der Figur".
*Anzeichen:* Eine Prüfung wird rot, ohne dass jemand ihren Gegenstand
angefasst hat.
