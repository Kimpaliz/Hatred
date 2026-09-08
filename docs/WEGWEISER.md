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
| Höhlenform und Rasterabtastung | `spiel/welt-feld.mjs`, `spiel/bauart.mjs`, `spiel/landschaft.mjs` |
| Feldmitten, Rasterkanten, Auswahl | `spiel/raster.mjs`, `runtime/kamera.js` |
| „Der Gegner benimmt sich dumm" | `spiel/gegner-ki.mjs` |
| „Ein Zug soll mehr Punkte haben" | `spiel/zug.mjs` → `AP_JE_ZUG` |
| Eine neue Aktionsart | `spiel/aktionen.mjs` **und** die Ereignisliste in `docs/SPIEL.md` |
| Granitmaterial und Bodenrelief | `runtime/granit-material.js` |
| UI-, Licht- und Effektfarben | `runtime/palette.js` |
| Eine Figur sieht falsch aus | `runtime/sprite-daten.js` |
| Funken, Blut, Staub | `runtime/partikel.js` |
| Boden, Wände, Höhenkanten, Treppenanschlüsse | `runtime/granit-feld.js` |
| Zeichenreihenfolge und Sichtnebel | `runtime/zeichnen.js` |
| Höhle und Treppen visuell vergleichen | `werkzeuge/topdown-vorschau.html` |
| Lebensbalken, Punkteanzeige, Zugleiste | `runtime/oberflaeche.js` |
| „Eine Bewegung läuft zu schnell/langsam ab" | `runtime/abspieler.js` → `TEMPO` |
| „Man kommt nicht zusammen" | `netz/sitzung.mjs`, `netz/verbindung.mjs` |
| „Nur wir sollen hereinkommen" — das Zugangswort vor dem Vorlauf, und was der Riegel wirklich taugt | `runtime/torwaechter.js` (Kopfnotiz) |
| Das Zugangswort wechseln | `node werkzeuge/zugangswort.mjs <neues wort>` |
| Die Prüfkette | `werkzeuge/pruefe-alles.mjs` |

## Die Reihenfolge eines Bildes

1. `runtime/start.js` taktet `runtime/abspieler.js` und fragt dessen
   sichtbaren Zwischenstand ab: Bewegung, Schaden, Sturz.
2. `runtime/zeichnen.js` setzt das Terrain aus `runtime/granit-feld.js`,
   Wesen und Zielmarkierungen zusammen.
3. `runtime/licht.js` legt die Lichtkarte darüber — als **zwei**
   Zeichenaufrufe: je Lage ein Pixelpuffer, ungeglättet und ganzzahlig
   vergrößert. Warum nicht mehr als einzelne Rechtecke, steht in der
   Kopfnotiz der Datei.
4. `runtime/partikel.js` streut Funken, Blut, Staub. Danach deckt der
   Zeichner ungesehene Hexfelder ab, damit auch Effekte verborgen bleiben.
5. `runtime/start.js` und `runtime/oberflaeche.js` zeichnen Schadenszahlen,
   Kosten, Anzeige und Zugleiste.
6. Erst wenn die Liste leer ist, nimmt `runtime/eingabe.js` wieder
   Befehle an. **Nie mittendrin** — sonst kann man während einer
   fremden Bewegung klicken, und der Kern bekommt eine Aktion, deren
   Voraussetzung sich gerade ändert.

Formeln, Höhenkanten, Treppen und Speichergrenzen sind in
[GRANIT-RASTER.md](GRANIT-RASTER.md) beschrieben.

## Die eine Zahl, an der alles hängt

`spiel/lauf.mjs → zustandsSumme(zustand)` — eine Prüfzahl über Karte,
alle Wesen, Runde und Zeiger. Nach jeder Runde vergleichen alle Rechner
sie. Sind sie verschieden, ist der Lauf auseinandergelaufen, und
`netz/sitzung.mjs` bricht ab, statt zwei verschiedene Spiele
weiterzuspielen.

Wer den Kern ändert und diese Zahl nicht versteht, baut Desyncs.
