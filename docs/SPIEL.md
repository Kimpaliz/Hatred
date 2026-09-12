# Was gebaut wird — und warum genau so

Janniks Auftrag wörtlich:

> „multyplayer rundenbasiert dungeoncrawler. in raster unterteilt. schöne
> pixel grafik. richtige landschaftsgenerierung. das schlachtfeld kann aus
> unterschiedlichen höhen bestehen"
>
> „stil wie auf dem bild. auch mit licht quellen. pixel partikeln."

Dazu drei Entscheidungen aus dem Gespräch vom 06.09.2026:

| Frage | Janniks Antwort |
| --- | --- |
| Name | **Hatred** |
| Wie spielt ihr zusammen? | **Sofort übers Internet** |
| Wie fühlt sich ein Zug an? | **Aktionspunkte** |

Präzisierung vom 08.09.2026: Die Grafik und Höhlenerzeugung sollen
Scotophobia (Granithöhle) übernehmen. Treppen müssen zusammenpassen,
Wände und Ebenen lesbar bleiben. Das zuvor gewählte Hexraster bleibt
die Grundlage. Der frühere Kerkerlook mit einzelnen Wandblöcken ist
damit abgelöst.

Präzisierung vom 12.09.2026 — sie ersetzt den Satz *„Der Blick muss
exakt senkrecht sein"* aus der Präzisierung davor: **Der Blick ist leicht
gekippt.** Man sieht die Oberseite jedes Feldes **und** die Südflanke
von allem, was höher ist als sein Nachbar darunter — Etagenkanten wie
massiver Fels. Janniks Wortlaut: *„Aktuell sind wände von böden und
etagen auf denen man laufen kann unglaublich schlecht zu unterscheiden."*
Vorlage sind die Plateaus mit sichtbarer Erdkante aus *Battle Brothers*.
Dazu: **ein Feld ist 32 Bildpunkte breit** statt 16. Eine Parallaxe beim
Kameraschwenk ist vorgemerkt, *„später als versuch mit gekippter
sicht"*, und keine Zusage. Die Entscheidung steht als Vorgang #33.

Die Übertragung von Quellformeln auf spielbare Rasterfelder beschreibt
[GRANIT-RASTER.md](GRANIT-RASTER.md).

---

## 1. Warum rundenbasiert alles andere leichter macht

Ein Echtzeitspiel über das Internet muss dreißigmal je Sekunde
entscheiden, wessen Wahrheit gilt, und Verzögerung verstecken. Ein
rundenbasiertes Spiel muss das nie: Zwischen zwei Zügen darf eine halbe
Sekunde vergehen, ohne dass es jemand merkt.

Deshalb ist bei **Hatred** die Reihenfolge umgekehrt zu den meisten
Spielen: Erst steht der Rechenkern, dann das Bild. Über die Leitung geht
**eine Aktion** — „Wesen 3 geht nach (12, 8)" —, und jeder Rechner
rechnet sich das Ergebnis selbst aus. Das sind ein paar Dutzend Bytes je
Zug statt eines ständigen Stroms.

Voraussetzung dafür ist, dass alle Rechner **bitgleich** rechnen. Das
ist der Grund für zwei harte Regeln:

- `spiel/` kennt keinen Browser, keine Uhr, kein `Math.random`.
- Jeder Zufall kommt aus einem gesäten Strom (`spiel/zufall.mjs`), der
  beim Start des Laufs einmal gesetzt und danach nur noch gereicht wird.

Wer eine dieser Regeln bricht, merkt es nicht sofort — das Spiel läuft
weiter, nur eben auf jedem Rechner anders. Deshalb prüft
`werkzeuge/pruefe-kern.mjs` sie per Textsuche, und
`spiel/lauf.mjs → zustandsSumme()` rechnet nach jeder Runde eine
Prüfzahl aus, die alle vergleichen.

## 2. Warum Aktionspunkte und nicht „Bewegen plus eine Aktion"

Bei „Bewegen plus eine Aktion" ist jeder Zug im Kern dieselbe Frage:
wohin und auf wen. Mit Aktionspunkten wird daraus eine Rechnung mit
Wahlmöglichkeit: sechs Punkte, ein Schwerthieb kostet drei — also zwei
Hiebe und kein Schritt, oder ein Hieb und drei Schritte, oder gar kein
Hieb und Wacht.

Sechs Punkte sind bewusst gewählt: Sie teilen sich durch zwei und drei,
also lassen sich Waffen mit 2 AP (drei Schläge) und 3 AP (zwei Schläge)
bauen, ohne dass ein Punkt übrig bleibt und ärgert.

## 3. Warum das Schlachtfeld Höhen hat — und warum genau vier

Ein Raster ohne Höhen ist eine Fläche mit Hindernissen. Sobald es Höhen
gibt, bekommt jedes Feld eine zweite Eigenschaft, und daraus entstehen
Entscheidungen, die vorher nicht existierten: Von oben sieht man weiter
und trifft besser, aber hinauf kommt man nur über eine Rampe und das
kostet doppelt. Wer oben steht, kann gestoßen werden.

**Vier Ebenen** bleiben die taktische Vorgabe. Die Kamera verschiebt
höhere Felder nicht. Die Höhe zeigt sich als **Flanke**: Unter jeder
Kante, hinter der ein höheres Feld liegt, sieht man dessen nach Süden
zeigende Seite als eigene Fläche aus eigenem Material — so, wie man ein
Plateau von schräg oben sieht. Massiver Fels ist höher als jeder Boden
und bekommt dieselbe Flanke. Eine echte Verbindung über eine Treppe
unterbricht sie. (Bis zum 12.09.2026 stand hier: Säume und Konturen von
einem Bildpunkt entlang aller sechs Kanten. Von exakt oben hat eine
Klippe keine Seite — und ein Bildpunkt auf sechzehn ist nichts. Das war
der gemessene Grund, warum Etagen und Wände nicht zu unterscheiden
waren.)

| Ebene | was sie ist |
| --- | --- |
| 0 | Graben — Wasser, Lava, Kanal. Man sieht kaum heraus. |
| 1 | Boden — der Normalfall. |
| 2 | Podest, Empore, Altarstufe. |
| 3 | Hochplateau — der beste Platz für einen Schützen. |

Die Regeln dazu stehen an **einer** Stelle (`spiel/hoehen.mjs`) und
nirgends sonst. Das ist wichtiger, als es klingt: Höhenregeln sind
verstreut immer falsch, weil jede Stelle sie ein bisschen anders auslegt.

**Der Stoß** ist die Aktion, die aus dem Höhensystem ein Spiel macht.
Zwei Aktionspunkte, ein Feld Schub — und wer dabei zwei Ebenen fällt,
nimmt Schaden und verliert seinen Rest-Zug. Ohne den Stoß wären Höhen
nur ein Trefferbonus; mit ihm sind sie eine Gefahr, auf die man achtet.

## 4. Wie die Granithöhle zum Schlachtfeld wird

`spiel/welt-feld.mjs` erzeugt Scotophobias kontinuierliches Distanzfeld:
Räume, geschwungene Gänge, verformter Fels und Inseln. Danach macht
`spiel/landschaft.mjs` daraus eine endliche taktische Karte:

1. Neun Proben um jede Hexmitte entscheiden über Fels oder freien Boden.
2. Das Höhenfeld wird an denselben Hexmitten gelesen und bereinigt.
3. Rampen verbinden die Plateaus; unerreichbare Restflächen werden bereinigt.
4. Abgründe, geschlossene Wasserbecken, trockene Startfelder, Boden,
   Zier und Licht werden aus dieser spielbaren Karte abgeleitet.
5. Der Ausgang wird mit den tatsächlichen Bewegungsregeln erreichbar platziert.

Die kontinuierliche Form bleibt die Quelle. Begehbarkeit, Sicht und
Höhenwechsel werden ausschließlich auf der fertigen Rasterkarte entschieden.

## 5. Warum das Bild so aussieht wie es aussieht

Die Granithöhle gibt das Material vor: Granitkorn, Adern, Geröll am
Wandfuß und unregelmäßiges Bodenrelief werden in Weltkoordinaten
berechnet. Sie wiederholen sich nicht an jeder Feldkante. Dazu kommen
die Anforderungen an die taktische Darstellung:

- **Schwarz ist wirklich schwarz.** Was kein Licht bekommt, verschwindet
  fast — aber nicht ganz (`GRUNDHELLE = 0.16`), weil ein taktisches
  Spiel das Gelände zeigen muss. Schon erkundete, aber unbeleuchtete
  Felder liegen dazwischen (`ERINNERT_HELLE`).
- **Licht ist warm, Dunkelheit ist kühl.** Die ganze Palette folgt
  dieser einen Regel.
- **Wenige, kräftige Farbflecken.** Blaues Arkanlicht, grüner Schleim,
  rote Blutlache, orangefarbenes Feuer — jeweils groß und satt, nicht
  über die Karte verstreut.
- **Harte Kanten.** Keine weichen Verläufe, keine Zwischenschritte
  zwischen Bildpunkten. Alles wird auf ganze Bildpunkte gerundet, die
  Vergrößerung ist immer ganzzahlig.

**Es gibt keine Bilddatei.** Jede Figur steht als Text im Repository,
eine Zeile je Bildpunktzeile, ein Zeichen je Farbe. Das ist diffbar,
prüfbar und ohne Bildbearbeitung änderbar — und man sieht im
Änderungsvergleich, welcher Bildpunkt sich bewegt hat.

## 6. Was Licht im Spiel bedeutet, nicht nur im Bild

Licht ist zweimal da, und das ist Absicht:

- `spiel/licht.mjs` rechnet die **spielrelevante** Helligkeit —
  deterministisch, ohne Flackern. Wer im Dunkeln steht, ist ab einer
  gewissen Entfernung verborgen. Das ist eine Regel, also gehört sie in
  den Kern.
- `runtime/licht.js` macht daraus das **Bild**: Flackern, Farbmischung,
  weicher Abfall. Nichts davon darf eine Regel beeinflussen — sonst
  hinge das Spielergebnis daran, wie ein Browser rundet.

## 7. Was ausdrücklich **nicht** gebaut wird

- Konten, Anmeldung, fremde Datenbank. Es gibt keinen Spielserver.
- Bezahlung, Werbung, Ladenseite.
- Bestenlisten über das Netz, Freundeslisten, Chat.
- Übersetzungen. Das Spiel ist deutsch.
- Bilddateien für Sprites.
- Ton — bis Jannik ihn ausdrücklich möchte.

## 8. Offene Fragen an den Auftraggeber

Diese Punkte sind **entschieden zu treffen**, nicht von uns zu raten.
Sie stehen als Vorgang, nicht als Häkchen.

1. ~~**Vermittlung im Netz.**~~ **Beantwortet am 06.09.2026.** Die
   Frage war, wie sich zwei Rechner in zwei Wohnungen finden: Code von
   Hand, eigener Vermittler, oder ein dauerhaft laufender Dienst. Der
   dritte Weg war ausgeschlossen, weil er einen *fremden* Dienst
   bedeutet hätte. Er tut es nicht: Es ist Janniks eigene
   Dashboard-Plattform. Die Anbindungsabsicht ist kein Nachweis einer
   Integration in diesem Checkout. Die Bestandsgrenze steht in
   [PROJEKTGRENZE.md](PROJEKTGRENZE.md); die direkte Leitung ohne
   Server bleibt als zweiter Weg bestehen.
2. **Wie viele Kerkertiefen** ein Lauf hat, bevor er endet.
3. **Ob Tod endgültig ist** oder ein Mitspieler aufheben kann.
