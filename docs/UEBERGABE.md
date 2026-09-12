# Übergabe — was ein neuer Mitarbeiter zuerst wissen muss

Diese Seite ist am 08.09.2026 für die Übergabe an **Codex** geschrieben
worden. Sie ersetzt kein anderes Dokument: `AGENTS.md` ist der gemeinsame
Einstieg, `docs/REGELN.md` sagt, wie hier gearbeitet wird,
`docs/ROADMAP.md` sagt, was als Nächstes kommt. Hier steht das, was in
keinem davon steht — **was gemessen wurde, was daraus folgt, und wo die
Fallen liegen**.

Alle Zahlen tragen ihr Datum und den Befehl, mit dem sie nachgerechnet
werden (Regel 11). Wer sie übernimmt, ohne sie neu zu rechnen,
übernimmt eine Behauptung von gestern.

**Einordnung nach der Strukturintegration am 08.09.2026:** Die historischen
Messungen und offenen Entscheidungen unten beziehen sich auf den übergebenen
Stand bis `d7271d0`. Fachprüfungen liegen nun unter `tests/`; ihre hier genannten
Pfade sind entsprechend nachgeführt. Regel 6 grenzt den browserfreien Regelkern
ausdrücklich von Netzadaptern ab. Die frühere Unklarheit dazu in Abschnitt 7
ist als datierter Befund zu lesen. Arbeitsabläufe stehen in
[AGENTEN.md](AGENTEN.md), die Prüfbefehle in [ENTWICKLUNG.md](ENTWICKLUNG.md).

---

## 1. Der Stand, gemessen am 08.09.2026

| | |
| --- | --- |
| Ablageort | `https://github.com/Kimpaliz/Hatred` |
| Spielbar unter | `https://kimpaliz.github.io/Hatred/` |
| `main` vor dieser Übergabe | `3ceef0c` — „flaeche: das Zugangswort gewechselt" |
| Prüfkette | `node werkzeuge/pruefe-alles.mjs` |
| Spiel im Browser starten | `node werkzeuge/vorschau.mjs` |
| Eine Karte im Text ansehen | `node werkzeuge/karte-zeigen.mjs 7` |

Vor dem Spiel steht ein Zugangswort. Es steht **in keiner Datei dieses
Ablageorts**, nur sein Fingerabdruck in `runtime/torwaechter.js`; wer es
braucht, fragt Jannik. Ein neues Wort rechnet
`node werkzeuge/zugangswort.mjs <wort>` aus — das Werkzeug sucht das
Wort vorher wörtlich im ganzen Baum und sagt ab, wenn es dort schon
steht (Fehlerbuch F1).

### Vorgänge

Geschlossen: #1, #2, #3, #6, #7, #8, #9, #11. Offen: #4, #5, #10 und
#12 bis #23 aus der Welle 2, dazu **#24 bis #31** für die Welle 3 —
einer je Schritt, jeder mit Janniks Wortlaut oben und seiner Abnahme.

Die Welle 2 ist nicht verworfen, sie ruht: #10 und #12 bis #23 werden
wieder aufgenommen, wenn die Welt steht.

**Achtung bei #8** („Ebenen mit Wasserbecken und Abgründen"): Der
Vorgang ist abgenommen worden, und die Abnahme war zu dem Zeitpunkt
wahr. Janniks Auftrag vom 08.09.2026 nimmt die Höhen aber vorerst
wieder heraus — damit misst die Abnahme von #8 danach eine leere Menge.
Das ist keine Regression und kein Fehler; es ist der Grund, warum in
Welle 3 der letzte Schritt „Höhen zurück" heißt und nicht „Höhen neu".

---

## 2. Janniks Auftrag vom 08.09.2026, im Wortlaut

> „sehr gut schon. aber wir müssen uns über die weltgenerierung erst
> mal im klaren werden.
>
> erst mal möchte ich nur räume und verbindungsgänge ohne
> höhenunterschiede haben.
>
> gut erkennbare wände, dass ist unendlich wichtig das auf den ersten
> blick gut zu erkennen ist wo Wände sind
>
> lichtkegel sicht, soll in zwei stufen existieren. gut sichtbar /
> dämmerlicht „pixelige schatten übergang"
>
> erst mal keine anderen deko assets. nur pure landscape
>
> massives gestein also das was nicht bespielt werden kan. soll als
> solches erkennbar sein. von der seite aus die man sehen kann bis hin
> ins tiefe gestein wird die textur davon immer dunkler pxliger.
>
> dann erst fangen wir mit unterschiedlichen höhen an."

Dazu eine Fehlermeldung:

> „aktuell wenn ich auf karte klicke um mir alles anzeigen zu lassen
> gibt es grafikfehler und alles sieht komisch aus."

Sein Wortlaut wird zitiert, nicht umformuliert. Wer eine Anforderung
aus diesen Sätzen ableitet, schreibt die Ableitung dazu — die
Ableitungen unten sind gemessen, nicht geraten.

---

## 3. Der eine Befund, an dem die ganze Welle hängt

**Die Wände tragen im Bild keine eigene Auskunft. Was man heute sieht,
macht das Licht.**

> **Berichtigung vom 12.09.2026.** Die Prozentzahlen dieses Abschnitts
> stammen aus einem Werkzeug, das danebentastete: Es nahm den
> „Felspunkt" mit `Math.round` genau auf der Naht zweier Feldmitten, und
> weil die Feldgrenze eine Voronoi-Entscheidung je Bildpunkt ist, lag
> dieser Punkt oft im Boden. Von den 94 damals gemeldeten Grenzen waren
> nur 46 wirklich Fels gegen Boden. **Der Befund selbst stimmt** — die
> Wand trug im reinen Gesteinsbild keine eigene Auskunft —, aber die
> 51,1 % sind es nicht: Dieselbe Lage, mit der berichtigten Messlatte
> gemessen, ergibt **22,2 %**. Der Grund steht im Changelog-Eintrag vom
> 12.09.2026 („Die Messlatte für den Wandkontrast tastete daneben"), die
> gültigen Zahlen in [ROADMAP.md](ROADMAP.md) unter W1.

Zwei Messungen nebeneinander, beide am 08.09.2026:

**a) Im fertig gezeichneten Bild** (mit Licht und Nebel) sind Wände
deutlich dunkler als der Boden — mittlere Helligkeit 21,65 gegen 73,25,
Abstand **51,60** von 255.

**b) Im reinen Gesteinsbild** (ohne Licht, so wie es der Kartenknopf
zeigt) verschwindet dieser Abstand:

```bash
node werkzeuge/miss-wandkontrast.mjs
```

| Fall | Sprung Boden→Fels | Körnung im Boden | Sprung/Körnung | „Felspunkt dunkler" |
| --- | --- | --- | --- | --- |
| flach, eine Ebene | −0,34 | 5,41 | **0,06** | 51,1 % |
| heute, alle Grenzen | 2,37 | 12,96 | **0,18** | 43,4 % |
| heute, gleiche Ebene | 1,13 | 12,96 | **0,09** | 44,4 % |

Zu lesen: Der Helligkeitssprung an einer Wandgrenze ist **sechs- bis
sechzehnmal kleiner als das Rauschen innerhalb einer Bodenfläche**. Und
die Richtung des Sprungs ist ein Münzwurf — bei 51,1 % ist der Felspunkt
dunkler, bei 48,9 % heller. Reiner Zufall wäre 50,0 %.

Daraus folgen drei Dinge, und alle drei sind unangenehm:

1. **Janniks Fehlermeldung zum Kartenknopf ist kein Zeichenfehler,
   sondern genau dieser Befund.** Der Knopf nimmt den Nebel weg. Ohne
   Nebel fällt die einzige Quelle der Wanderkennung weg, und übrig
   bleibt ein Rauschteppich ohne Wände. Es „sieht komisch aus", weil es
   ohne Licht nichts zu sehen gibt.
2. **Flach macht die Wände schlechter, nicht besser.** In
   `runtime/granit-feld.js:200` steht `(0,63 + ebene * 0,27)`: Ein Feld
   auf Ebene 3 ist um den Faktor 1,44/0,90 heller als eines auf Ebene 1.
   Weil Wände meist höher stehen als der Boden davor, kommt der heutige
   Rest an Erkennbarkeit aus der **Höhe**. Nimmt man die Höhen heraus,
   fällt Sprung/Körnung von 0,18 auf 0,06.
3. **Deshalb kommt die Wand vor der flachen Karte.** Wer erst flach
   macht und dann die Wände anfasst, hat dazwischen einen Zustand, in
   dem Jannik das Spiel nicht bedienen kann.

Konturen gibt es heute **nur an Höhenkanten**: Auf der flachen Karte
zählt das Werkzeug 0 helle und 0 dunkle Konturpunkte, auf der echten
Karte 3.243 und 8.708. Eine Wandkontur, die nicht an der Höhe hängt,
existiert nicht.

**Und die naheliegende Abhilfe reicht nicht.** Zur Probe wurde der
Faktor in `granit-feld.js:200` auf Wandfeldern mit 0,45 multipliziert,
der Fels also um 55 % abgedunkelt. Gemessen: Der Münzwurf steigt von
51,1 % auf **80,9 %**, das Verhältnis Sprung/Körnung von 0,06 auf
**2,97**. Das ist eine große Verbesserung — und jede fünfte Kante bleibt
trotzdem falschherum, weil ein heller Krümel im Fels eine dunkle Tönung
schlägt. Wer über 95 % will, braucht eine **Kontur** und nicht nur einen
Ton. (Die Probe diente nur der Messung; sie ist nicht eingebaut.)

> **Berichtigung vom 12.09.2026.** Auch diese beiden Zahlen stammen aus
> der schiefen Messlatte, und der Schluss daraus war falsch: Mit der
> berichtigten Messung genügt ein **Ton** sehr wohl. Gebaut wurde genau
> das — der Fels verliert von der Naht an Licht statt erst neunzehn
> Bildpunkte tief —, und es steht bei 99,7 % statt der hier vermuteten
> 80,9 %, ganz ohne neue Kontur. Der Weg dahin steht im Changelog vom
> 12.09.2026 („Der Fels war heller als der Boden").

---

## 4. Was schon da ist und nicht neu gebaut werden muss

**Räume und Gänge braucht keinen neuen Erzeuger.** `spiel/welt-feld.mjs`
kann das bereits: `raumBei` (Zeile 116) setzt einen Raum je Skelettzelle,
`machePfad` (Zeile 154) zieht geschwungene Gänge dazwischen. Was daraus
eine Höhle statt einer Raumfolge macht, sind drei Zahlen in
`spiel/bauart.mjs` — `schwelle`, `wamp` und `wamp2`. Mit
`schwelle: 2`, `wamp: 0`, `wamp2: 0` und flachen Höhen ergaben 20 Saaten
im Mittel **472,9 offene Felder, 1 zusammenhängender Bereich, 1 Plateau,
0 unerreichbare Felder, 0 Fehler** (gemessen am 08.09.2026).

Die Raumdichte hängt an `sektorFaktor`: von 3,60 Räumen (21,1 % offen)
bis 40,50 Räumen (74,4 % offen). Das ist ein Regler, keine Umbauarbeit.

**Ein Tiefenmaß für „massives Gestein" ist billig.** Eine Flutfüllung
vom offenen Raum aus gibt jedem Felsfeld seine Entfernung zur Sichtseite.
Über 10 Saaten: Tiefe 1 sind 20,76 % aller Felsfelder, Tiefe 2 15,31 %,
Tiefe 3 12,13 %, und die größte Tiefe reicht je nach Saat bis 13 bis 30.
**0 Felsfelder ohne Tiefe.** Der geglättete Verlauf über alle 701.568
Weltbildpunkte einer 56×40-Karte kostet 483 ms — ein Aufschlag von
**26,3 %** auf den heutigen Materialdurchlauf von rund 1.841 ms.

Ein Entwurf für die Verdunkelung, gemessen: Faktor 0,7792 bei Tiefe 1,
0,4456 bei Tiefe 2, 0,2245 bei Tiefe 3, 0,1160 bei Tiefe 4 und danach
konstant 0,1000. Das ist Janniks „immer dunkler" als Zahlenreihe.

**Nicht brauchbar als Tiefenmaß ist `wandNaehe`.** Es sättigt bei 4,25
Feldern, während die echte Tiefe bis 13 bis 19 reicht. Wer es dafür
nimmt, bekommt ab Tiefe 5 überall dasselbe.

**Deko abschalten ist ein Aufruf** (`setzeZier`); genau 1 Behauptung
fällt dabei. **Aber:** Die Fackelsockel kommen aus `setzeFackeln`
(26,50 je Karte) und sind heute die **einzige** Lichtquelle. Wer sie
mit der Deko abschaltet, macht die Karte schwarz.

---

## 5. Die fünf offenen Entscheidungen

Diese Fragen sind Jannik am 08.09.2026 gestellt und noch nicht
beantwortet worden. Sie stehen hier, damit niemand sie stillschweigend
für sich beantwortet.

**E1 — Kommen die Wände vor der flachen Karte?**
Die Messung sagt ja (Abschnitt 3), die Reihenfolge in Janniks Nachricht
sagt „erst mal nur räume und verbindungsgänge". Die empfohlene
Reihenfolge in `docs/ROADMAP.md` folgt der Messung. Wenn Jannik anders
entscheidet, gibt es dazwischen einen unbedienbaren Zustand — das ist
seine Entscheidung, nicht unsere.

**E2 — Was soll der Kartenknopf tun?**
Heute nimmt er nur den Nebel weg; er zoomt nicht heraus. Zwei Lesarten
von „auf karte klicke um mir alles anzeigen zu lassen": eine
Übersichtskarte (herausgezoomt, vereinfacht) oder das Spielbild ohne
Nebel. Die zweite ist das, was heute passiert, und genau die sieht
„komisch aus".

**E3 — Was heißt „lichtkegel sicht in zwei stufen"?**
Der Wortlaut fordert zwei Stufen: „gut sichtbar" und „dämmerlicht". Die
angenommene Abnahme von Vorgang #9 fordert **„Licht in mindestens fünf
Stufen, nicht als Schalter"**. Das ist ein echter Widerspruch, kein
Missverständnis. Mögliche Auflösung: zwei Stufen der **Sicht** (sehe
ich das Feld gut oder dämmrig) bei weiterhin fünf Stufen der
**Helligkeit** innerhalb jeder Stufe. Das ist eine Vermutung und muss
bestätigt werden.

**E4 — Wie viele Räume soll eine Karte haben?**
`sektorFaktor` spannt von 3,60 bis 40,50 Räume. Ohne Janniks Antwort
ist jede Wahl geraten.

**E5 — Darf es schwerer werden?**
Ohne Höhen fällt der Höhenvorteil im Kampf weg. Gemessen: Ein Lauf, der
heute 40 Runden hält, endet flach in **Runde 27** mit Niederlage. Das
ist eine Spielbalance-Frage und keine Prüfungsfrage — die Prüfung hat
recht.

---

## 6. Die Fallen

Diese Stellen sehen grün aus und sind es nicht. Sie sind einzeln
gemessen; wer sie nicht kennt, hält einen leeren Beweis für einen
Beweis.

**Wie sie gemessen wurden.** In einem eigenen Arbeitsbaum wurden die
Höhen abgeschaltet — in `spiel/bauart.mjs` `hoehenSchwellen: [9, 9, 9]`
und `wandAnhebung: 0` — und die ganze Kette laufen gelassen. Wer das
nachstellen will:

```bash
git worktree add --detach ../wt-flach main
# in ../wt-flach: hoehenSchwellen auf [9, 9, 9], wandAnhebung auf 0
cd ../wt-flach && node werkzeuge/pruefe-alles.mjs
```

Ergebnis am 08.09.2026: **4 Prüfungen rot, 19 Behauptungen gefallen** —
`abgrund` 6, `landschaft` 8, `lauf` 3, `tippen` 2. (Eine fünfte,
`arbeitsweise`, war nur wegen der uneingetragenen Probeänderung rot.)
Neunzehn von rund 43.900. Das klingt beruhigend und ist der Befund:

**F-A — Eine Prüfung, die eine leere Menge misst, ist grün.**
`tests/pruefe-becken.mjs` blieb **53 von 53 Behauptungen grün** und
druckte dabei wörtlich: *„30 Karten 44 × 32: 0 mit Wasser auf
mindestens zwei Ebenen, 30 trocken, 0.0 Wasserkacheln je Karte"*. Sie
prüft Aussagen **über** die gefundenen Becken, nicht die Aussage, dass
es welche gibt. Bei `pruefe-abgrund.mjs` fielen 6 Behauptungen — und die
Gesamtzahl sank von 124 auf 122: **zwei sind lautlos verschwunden**,
weil ihre Schleife über eine leere Liste lief. Wer die Höhen abschaltet,
ergänzt diese Prüfungen **vorher** um eine Mindestmengen-Behauptung.

**F-B — `tests/pruefe-tippen.mjs` trägt fest eingetragene
Bildschirmkoordinaten.** Sie beschreiben die heutige Karte. Flach
gemessen meldete sie: *„und die Figur steht dort (x): ist 31, soll
30"* — ein Fehler, den es nicht gibt. Vor jeder Änderung an der
Erzeugung dort nachsehen.

**F-C — `tests/pruefe-lauf.mjs` scheitert flach in Runde 27, und
das ist richtig so.** Wörtlich: *„der Lauf hält 40 volle Runden durch,
ohne vorher zu enden: ist 27, soll 40"*, und der Ausgang lautet
„niederlage", wo null stehen sollte. Die Niederlage ist echt (siehe E5).
Die Prüfung ist
nicht zu entschärfen; entweder Jannik nimmt die härtere Balance an, oder
der Kampf bekommt einen Ausgleich für den fehlenden Höhenvorteil.

**F-D — Der Kartenknopf wird von keiner einzigen Prüfung im Bild
angesehen.** Es gibt `pruefe-karte-zeigen.mjs`, aber es prüft das
Textbild des Werkzeugs, nicht das Bild im Spiel. Deshalb ist Janniks
Befund nie angeschlagen.

**F-E — Es gibt heute keinen Lichtkegel an der Figur** — weder als
Regel in `spiel/` noch als Bild in `runtime/`. Das Licht kommt
ausschließlich aus den Fackelsockeln. Wer „Lichtkegel" liest und
annimmt, es gebe schon einen, sucht vergeblich.

Dazu unbedingt `docs/FEHLERBUCH.md` lesen, bevor der erste Einzeiler
geschrieben wird. Dort stehen die Fehler, die sich in diesem Projekt
**wiederholt** haben, mit ihrem Erkennungszeichen.

---

## 7. Lose Enden

Vier bekannte Stellen, keine davon dringend, alle gemessen am
08.09.2026:

- **Regel 6 nennt `spiel/` und `netz/`, geprüft wird nur `spiel/`.**
  Das steht offen in der Kopfnotiz von `werkzeuge/pruefe-kern.mjs`, ist
  also bekannt und nicht versteckt. Eine Fundstelle in `netz/` wäre
  betroffen (`setTimeout` in `netz/vermittler.mjs`).
- **Zwei Dateien verweisen auf eine „Regel 16", die es nicht gibt** —
  `werkzeuge/vorgaenge.mjs:75` und `werkzeuge/pruefe-vorgaenge.mjs:55`.
  `docs/REGELN.md` hat 14 Regeln. Entweder die Regel schreiben oder den
  Verweis berichtigen; `pruefe-regelwerk.mjs` fängt diesen Fall heute
  nicht, weil es von den Regeln zu den Dateien liest und nicht zurück.
- **`tests/pruefe-app.mjs` hat 999 Zeilen** bei einer Grenze von
  1.000 (Regel 8). Die nächste Ergänzung dort muss die Datei teilen.
- **Elf Zweige warten auf Löschung**, alle zusammengeführt oder
  verworfen: `kern/sechseck`, `bild/koernung`,
  `pruef/scotophobia-merkmale`, `doku/regel-14-verweis`,
  `integration/8-9`, `kern/abgrund-und-becken`, `werk/kette-auf-main`,
  `flaeche/torwaechter`, `flaeche/finger`, `aufbau/erste-fassung`,
  `probe/zugangstest`. Sie zu löschen braucht Rechte, die die
  Arbeitssitzung nicht hatte.

---

## 8. Wie hier gearbeitet wird — die Kurzfassung

Ausführlich in `docs/REGELN.md`. Was einen neuen Mitarbeiter am ehesten
stolpern lässt:

1. **Nie auf `main` schreiben.** Zweig anlegen, `WORKCLAIM.md` lesen und
   eintragen, dann erst schreiben.
2. **Merge, Push, Veröffentlichung nur auf Janniks ausdrückliches Ja.**
   Auch bei einer Kleinigkeit.
3. **Jede Zahl ist gemessen**, und der Befehl steht daneben. Eine Zahl
   aus einem einzigen Lauf ist keine Messung (Fehlerbuch C9).
4. **Jede neue Prüfung wird zuerst absichtlich rot gemacht**, und im
   Bericht steht wörtlich, was sie gemeldet hat. Geprüft wird der Fall,
   der ohne die Arbeit falsch wäre.
5. **Umbau und Inhalt getrennt.** Ein Umbau ohne sichtbare Änderung wird
   byteweise über `zustandsSumme()` als folgenlos bewiesen.
6. **Deutsch mit echten Umlauten** in allen Texten für Menschen.
7. **Doku trägt die Begründung, nicht den Stand.** Kein „ist live", kein
   „erledigt", kein Häkchen an einem Plan-Schritt. Zustandsaussagen nur
   datiert.
8. **Ein roter Ausgangsstand wird gemeldet, nicht überbaut.**

Jannik programmiert nicht. Alles Technische wird gebaut und ihm
anschließend in normaler Sprache erklärt — keine Fachwörter ohne
Übersetzung, keine Aufgabe an ihn, die Code voraussetzt.
