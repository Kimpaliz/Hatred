# Wegweiser — welches System redet mit welchem

Diese Seite beantwortet eine Frage: **Wo fasse ich an, wenn ich X
ändern will?** Sie sagt nicht, was fertig ist (Regel 13).

## Die vier Schichten

```
                 ┌──────────────────────────────────────────┐
   Tastatur  ──► │  runtime/   Bild, Ton der Anzeige, Maus   │
   Maus          │  kennt den Kern, der Kern kennt es nicht  │
                 └───────────────┬──────────────────────────┘
                                 │  Aktion  {typ, wer, …}
                                 ▼
                 ┌──────────────────────────────────────────┐
   Leitung  ◄──► │  netz/      Sitzung, Verbindung          │
                 │  reicht Aktionen durch, prüft Summen     │
                 └───────────────┬──────────────────────────┘
                                 │  Aktion (geordnet, nummeriert)
                                 ▼
                 ┌──────────────────────────────────────────┐
                 │  spiel/     der Regelkern                │
                 │  kennt weder Browser noch Leitung        │
                 └───────────────┬──────────────────────────┘
                                 │  Ereignis  {art, …}
                                 ▼
                          zurück an runtime/ zum Abspielen
```

**Die eine Richtung ist wichtig:** `spiel/` importiert nichts aus
`runtime/` oder `netz/`. Wer diese Richtung umdreht, bricht die
Netzfähigkeit — dann kann der Kern nicht mehr allein rechnen.

## Die Verkehrssprache

Zwei Wortarten, mehr nicht:

- **Aktion** — was jemand tun *will*. Flach, klein, durch die Leitung.
  `{typ:"gehen", wer:3, nach:{x:12,y:8}}`
- **Ereignis** — was daraufhin *geschehen* ist. Flach, ohne Objekte.
  `{art:"gestuerzt", wer:3, von:{…}, nach:{…}, stufen:2, schaden:3}`

Der Kern nimmt Aktionen und gibt Ereignisse. Das Bild spielt Ereignisse
ab. Das Netz schickt **Aktionen**, nie Ereignisse — sonst müsste jeder
Rechner der Wahrheit eines anderen glauben, statt sie nachzurechnen.

## Wo fasse ich an für …

| Wunsch | Datei |
| --- | --- |
| Eine neue Waffe, ein neuer Gegner, eine Fähigkeit | `spiel/katalog/` |
| „Der Sturz tut zu wenig weh" | `spiel/hoehen.mjs` |
| „Man sieht zu weit im Dunkeln" | `spiel/licht.mjs` (Regel), `runtime/licht.js` (nur Bild) |
| „Die Karten sehen zu gleich aus" | `spiel/landschaft.mjs` |
| „Der Gegner benimmt sich dumm" | `spiel/gegner-ki.mjs` |
| „Ein Zug soll mehr Punkte haben" | `spiel/zug.mjs` → `AP_JE_ZUG` |
| Eine neue Aktionsart | `spiel/aktionen.mjs` **und** die Ereignisliste in `docs/SPIEL.md` |
| Farben, Stil, Stimmung | `runtime/palette.js` — nur dort |
| Eine Figur sieht falsch aus | `runtime/sprite-daten.js` |
| Funken, Blut, Staub | `runtime/partikel.js` |
| Boden, Wände, Höhenkanten | `runtime/zeichnen.js` |
| Lebensbalken, Punkteanzeige, Zugleiste | `runtime/oberflaeche.js` |
| „Eine Bewegung läuft zu schnell/langsam ab" | `runtime/abspieler.js` → `TEMPO` |
| „Man kommt nicht zusammen" | `netz/sitzung.mjs`, `netz/verbindung.mjs` |
| „Nur wir sollen hereinkommen" — das Zugangswort vor dem Vorlauf, und was der Riegel wirklich taugt | `runtime/torwaechter.js` (Kopfnotiz) |
| Das Zugangswort wechseln | `node werkzeuge/zugangswort.mjs <neues wort>` |
| Die Prüfkette | `werkzeuge/pruefe-alles.mjs` |

## Die Reihenfolge eines Bildes

1. `runtime/start.js` fragt `runtime/abspieler.js`: Ist eine
   Ereignisliste in Arbeit?
2. Wenn ja: `runtime/zeichnen.js` spielt sie ab (Bewegung Feld für
   Feld, Schaden als Zahl, Sturz als Fall).
3. `runtime/licht.js` legt die Lichtkarte darüber.
4. `runtime/partikel.js` streut Funken, Blut, Staub.
5. `runtime/oberflaeche.js` zeichnet Anzeige und Zugleiste.
6. Erst wenn die Liste leer ist, nimmt `runtime/eingabe.js` wieder
   Befehle an. **Nie mittendrin** — sonst kann man während einer
   fremden Bewegung klicken, und der Kern bekommt eine Aktion, deren
   Voraussetzung sich gerade ändert.

## Die eine Zahl, an der alles hängt

`spiel/lauf.mjs → zustandsSumme(zustand)` — eine Prüfzahl über Karte,
alle Wesen, Runde und Zeiger. Nach jeder Runde vergleichen alle Rechner
sie. Sind sie verschieden, ist der Lauf auseinandergelaufen, und
`netz/sitzung.mjs` bricht ab, statt zwei verschiedene Spiele
weiterzuspielen.

Wer den Kern ändert und diese Zahl nicht versteht, baut Desyncs.
