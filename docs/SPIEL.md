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

Das Bild, auf das er zeigt, ist ein Kerkerbild: schwarze Tiefe ringsum,
ein warmer Fackelkreis, blaue und grüne Leuchtpfützen, eine große rote
Blutlache, harte weiße Spießreihen an der Wand, alles rechtwinklig und
exakt von oben. Daraus folgt fast der ganze Bildteil dieses Dokuments.

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

**Vier Ebenen**, nicht mehr: Auf einem exakt von oben gesehenen Bild gibt
es keine Perspektive. Die Höhe kann nur über drei Mittel erzählt werden —
Grundhelligkeit, harte Schattenkante nach unten, helle Oberkante. Bei
mehr als vier Stufen laufen die Helligkeiten so eng zusammen, dass das
Auge sie nicht mehr trennt (gemessen in `runtime/palette.js`: schon bei
vier Stufen liegen die engsten Nachbarn 14 von 255 auseinander).

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

## 4. Warum „richtige Landschaftsgenerierung" nicht Rauschen heißt

Ein Rauschfeld in Wände und Böden zu übersetzen ist in zwanzig Zeilen
gemacht und sieht nach zwanzig Zeilen aus: Es gibt keine Räume, keine
Türen, keine Absicht. Ein Kerker braucht Absicht.

`spiel/landschaft.mjs` baut deshalb in Schritten, die man einzeln
ansehen kann (`node werkzeuge/karte-zeigen.mjs`):

1. **Räume** durch fortgesetzte Teilung — Halle, Gruft, Kammer,
   Brunnen, Altarraum, Eingang, Ausgang.
2. **Gänge** als minimal aufspannender Baum über die Raummitten, *plus*
   ein Fünftel Zusatzverbindungen. Ein reiner Baum hat genau einen Weg
   zwischen zwei Räumen — dann kann man nie umgehen und nie umgangen
   werden, und jede Begegnung ist ein Flur.
3. **Höhen** aus einem Rauschfeld, aber **an den Raumgrenzen
   eingerastet**: ein Raum hat eine Grundebene. Sonst sähen die
   Plateaukanten aus wie Rauschen statt wie Bauwerk.
4. **Rampen** an jeder Ebenengrenze, die sonst zwei Bereiche trennt.
5. **Erreichbarkeit** wird mit den *echten* Höhenregeln nachgeflutet —
   nicht mit einer vereinfachten Kopie. Eine Karte, auf der der Ausgang
   nicht erreichbar ist, ist kein Schönheitsfehler, sondern ein
   unspielbarer Lauf.
6. Flüssigkeiten, Zier, Lichter, Startfelder, Ausgang.

## 5. Warum das Bild so aussieht wie es aussieht

Aus dem Bild, das Jannik geschickt hat, sind vier Dinge übernommen:

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
