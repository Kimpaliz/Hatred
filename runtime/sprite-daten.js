/* [Aufgabe: Bild] Die Pixelgrafik dieses Kerkers — als Text, nicht als
   Bilddatei. Eine Zeile je Bildpunktzeile, ein Zeichen je Bildpunkt,
   `.` ist durchsichtig.

   ── Warum kein PNG ─────────────────────────────────────────────────

   1. **Diffbar.** Wer ein Auge verschiebt, sieht im Vergleich genau
      eine geänderte Zeile. Bei einer Bilddatei sieht man „Datei
      geändert" und muss raten.
   2. **Prüfbar.** `werkzeuge/pruefe-sprites.mjs` liest dieselben
      Zeilen und misst sieben Eigenschaften, die das Auge nicht
      zuverlässig sieht — Silhouette, Wertetrennung, Merkmalstreue.
   3. **Umfärbbar.** Vier Spieler sind derselbe Umriss in vier Farben,
      ohne vier Dateien, die auseinanderlaufen.

   ── Warum alle Figuren nach Norden schauen ─────────────────────────

   Gezeichnet wird jede Figur, als liefe sie zum oberen Bildrand;
   `runtime/sprites.js` dreht sie verlustfrei in die vier Richtungen
   aus `spiel/gitter.mjs`. Deshalb muss jede Figur **asymmetrisch**
   sein: Was von oben wie ein Kreis aussieht, sieht gedreht genauso
   aus, und die Drehung wäre unsichtbar.

   Jede Art trägt darum ein **Merkmal** — eine zusammenhängende
   Farbinsel, an der man sie auch gedreht und verkleinert erkennt. Es
   steht in der Zeile über jedem Sprite und noch einmal, mit
   Begründung, in der Tabelle `MERKMAL` in
   `werkzeuge/werkstatt-auftrag.mjs`; `werkzeuge/pruefe-sprites.mjs`
   misst, dass es in allen vier Drehungen vorhanden und in einem Stück
   bleibt.

   ── Warum die Figuren heller sind, als der Kerker klingt ───────────

   Der Boden dieses Spiels ist dunkel: Stein auf Ebene 1 hat 36,8 von
   255 wahrgenommener Helligkeit, Platte auf Ebene 2 hat 59,3, Erde im
   Graben 17,6 (`node werkzeuge/pruefe-sprites.mjs` druckt die drei
   Zahlen). Zwischen ihnen liegt kein Platz von 18 Punkten Abstand;
   eine Figur ist deshalb nur dann sicher lesbar, wenn ihre mittlere
   Helligkeit **über** allen dreien liegt. Genau das verlangt die
   siebte Prüfung, und genau deshalb tragen die Sprites helle
   Mitteltöne und dunkle Konturen statt durchgehend düsterer Farben.
   Die Dunkelheit macht das Licht (`runtime/licht.js`), nicht das
   Sprite — ein Sprite, das schon dunkel gemalt ist, wird im Schatten
   schwarz und ist zweimal verloren.

   ── Keine Rechnung in den Zeilen ───────────────────────────────────

   Kein `.replace()`, kein `.repeat()`, kein Zusammenbauen. Ein
   Bildpunktraster steht da oder es steht nicht da — sonst hat
   irgendwann eine Zeile die falsche Breite und niemand findet es.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprites.js` (dreht, färbt ein, prüft die Form),
   `runtime/palette.js` (jeder Farbname steht dort),
   `spiel/katalog/gegner.mjs` und `spiel/katalog/helden.mjs` (die
   Schlüssel von `GEGNER_BILDER` und `HELDEN_BILDER` sind genau deren
   `schluessel`), `spiel/gitter.mjs` (die Namen in `DINGE` folgen
   `HINDERNIS`), `werkzeuge/pruefe-sprites.mjs` und
   `werkzeuge/werkstatt-auftrag.mjs`. */

/* ── Die vier Spielerfarben ─────────────────────────────────────────

   Drei Stufen je Spieler, und alle drei sind **Namen aus der
   Palette** — kein zweiter Farbvorrat neben `runtime/palette.js`.
   Die Stufen liegen jeweils über 24 von 255 auseinander, damit sie
   im verkleinerten Bild nicht zu einem Klumpen verschmelzen
   (Fehlerbuch D3).

   Gewählt sind vier Farbtöne, die auch ein Farbenblinder trennt, weil
   sie zugleich verschieden **hell** sind: Bernstein, Frostblau,
   Giftgrün, Purpur. `hudSchrift` als helle Stufe des Purpurs ist kein
   Versehen: `#cfc7e0` ist das blasse Ende der violetten Rampe, und
   dass die Palette ihn nach seiner ersten Verwendung benannt hat,
   ändert seinen Farbton nicht. */
export const SPIELER_FARBEN = [
  { name: "Bernstein", dunkel: "gold0", mittel: "gold1", hell: "goldHell" },
  { name: "Frostblau", dunkel: "arkan1", mittel: "arkanHell", hell: "arkanWeiss" },
  { name: "Giftgrün", dunkel: "schleim1", mittel: "fleisch2", hell: "schleimHell" },
  { name: "Purpur", dunkel: "gift1", mittel: "giftHell", hell: "hudSchrift" }
];

/* ── Die sechs Helden ───────────────────────────────────────────────
   Schlüssel wie in `spiel/katalog/helden.mjs`. `H`/`M`/`D` sind die
   Spielerfarben, `k` die Kontur. */
export const HELDEN_BILDER = {
  /* Späher — Merkmal `g`: die Kapuzenöffnung, ein Gesichtsfleck weit
     vorn im spitzen Kapuzenkeil. Sie zeigt immer nach vorn. */
  spaeher: {
    zeichen: { k: "kontur", H: "@hell", M: "@mittel", D: "@dunkel", g: "knochen0", l: "leder0" },
    bild: [
      "......kkk......",
      ".....kDgDk.....",
      "....kDggglk....",
      "....kDgggDk....",
      "...kDDDDDDDk...",
      "...kMDDDDDMk...",
      "..kMMMHHHMMMk..",
      "..kMMHHHHHMMk..",
      "..kMMHHHHHMMlk.",
      "...kMHHHHHMklk.",
      "...kMMHHHMMklk.",
      "....kMMMMMk.l..",
      "....kMMMMMk....",
      ".....kMMMk.....",
      "......kkk......"
    ]
  },

  /* Schildträger — Merkmal `e`: die Schildkante, ein zwei Bildpunkte
     dicker Riegel quer vor der Figur. Dick, weil eine einzelne Linie
     beim Verkleinern zerfällt. */
  schildtraeger: {
    zeichen: { k: "kontur", H: "@hell", M: "@mittel", D: "@dunkel", e: "wasserGlanz", i: "eisen0" },
    bild: [
      "...eeeeeeeee...",
      "...eeeeeeeee...",
      "...kiiiiiiik...",
      "....kMMMMMk....",
      "...kMMMMMMMk...",
      "..kMMMHHHMMMk..",
      "..kMMHHHHHMMk..",
      ".kiMHHHHHHHMik.",
      ".kiMHHHHHHHMik.",
      "..kMMHHHHHMMk..",
      "..kMMMHHHMMMk..",
      "...kMMMMMMMk...",
      "...kMMDDDMMk...",
      "....kMDDDMk....",
      ".....kkkkk....."
    ]
  },

  /* Flammenpriester — Merkmal `f`: die Flammenschale, ein heller
     Klumpen vor dem Kopf, aus dem die Glut steigt. */
  flammenpriester: {
    zeichen: { k: "kontur", H: "@hell", M: "@mittel", D: "@dunkel", f: "glut", g: "lava0" },
    bild: [
      ".....kgggk.....",
      "....kgfffgk....",
      "....kgfffgk....",
      ".....kgggk.....",
      "......kkk......",
      "...kMMMMMMMk...",
      "..kMMMHHHMMMk..",
      ".kMMMHHHHHMMMk.",
      ".kMMMHHHHHMMMk.",
      "..kMMHHHHHMMk..",
      "..kMMMHHHMMMk..",
      "...kMMMMMMMk...",
      "...kMDDDDDMk...",
      "....kDDDDDk....",
      ".....kkkkk....."
    ]
  },

  /* Grabräuber — Merkmal `e`: der Enterhaken, rechts vorn abgesetzt
     und am Seil `l` hängend. Er sitzt nie mittig, deshalb erkennt man
     die Drehung an ihm sofort. */
  grabraeuber: {
    zeichen: { k: "kontur", H: "@hell", M: "@mittel", D: "@dunkel", e: "wasserGlanz", l: "leder0" },
    bild: [
      "........keeek..",
      "........keeek..",
      ".........kek...",
      "......kkkllk...",
      ".....kDDDlk....",
      "....kDDDDDk....",
      "...kMMMHMMk....",
      "...kMMHHHMMk...",
      "..kMMHHHHHMMk..",
      "..kMMHHHHHMMk..",
      "...kMMHHHMMk...",
      "...kMMMMMMMk...",
      "....kMMMMMk....",
      "....kMMMMMk....",
      ".....kkkkk....."
    ]
  },

  /* Bluthexer — Merkmal `b`: die Blutschale in beiden Händen vor der
     Brust, ein dunkelroter Kern mit hellem Rand. */
  bluthexer: {
    zeichen: { k: "kontur", H: "@hell", M: "@mittel", D: "@dunkel", b: "blut1", r: "blut0" },
    bild: [
      ".....krrrk.....",
      "....krbbbrk....",
      "....krbbbrk....",
      ".....krrrk.....",
      "....kMMMMMk....",
      "...kMMMMMMMk...",
      "..kMMMHHHMMMk..",
      "..kMMHHHHHMMk..",
      ".kMMMHHHHHMMMk.",
      ".kMMMHHHHHMMMk.",
      "..kMMMHHHMMMk..",
      "...kMMMMMMMk...",
      "...kMDDDDDMk...",
      "....kDDDDDk....",
      ".....kkkkk....."
    ]
  },

  /* Bogenschützin — Merkmal `h`: der Bogenrücken, ein zwei Bildpunkte
     dicker Bogen quer vor der Figur, an den Enden nach hinten
     gezogen. */
  bogenschuetzin: {
    zeichen: { k: "kontur", H: "@hell", M: "@mittel", D: "@dunkel", h: "knochen0", s: "leder0" },
    bild: [
      "..hh.......hh..",
      "..hh.......hh..",
      "...hh.....hh...",
      "....hhhhhhh....",
      "....hhhhhhh....",
      ".....kkkkk.....",
      "....kMMMMMk....",
      "...kMMHHHMMk...",
      "..kMMHHHHHMMk..",
      "..kMMHHHHHMMks.",
      "...kMMHHHMMkss.",
      "...kMMMMMMMkss.",
      "....kMMDDMk.s..",
      "....kMDDDMk....",
      ".....kkkkk....."
    ]
  }
};

/* ── Die zehn Arten der Brut ────────────────────────────────────────
   Schlüssel wie in `spiel/katalog/gegner.mjs`. Keine Spielerfarben:
   Die Brut gehört niemandem. */
export const GEGNER_BILDER = {
  /* Krätzling — Merkmal `z`: die Zahnreihe, breiter als der Schädel.
     „Zu viele Zähne" ist seine Beschreibung im Katalog, also trägt er
     sie als Silhouette. */
  kraetzling: {
    zeichen: { k: "kontur", z: "knochen2", F: "fleisch2", f: "fleisch1" },
    bild: [
      "...............",
      "...............",
      "...............",
      ".....kzzzk.....",
      "....kzzzzzk....",
      "....kFFFFFk....",
      "...kFFfffFFk...",
      "...kFfffffFk...",
      "...kFfffffFk...",
      "....kfffffk....",
      "....kffkffk....",
      ".....kfkfk.....",
      ".....kk.kk.....",
      "...............",
      "..............."
    ]
  },

  /* Grubenhund — Merkmal `s`: die vorgestreckte Schnauze. Blind, also
     kein Auge; erkannt wird er am Keil, der vor dem Rumpf steht. */
  grubenhund: {
    zeichen: { k: "kontur", s: "knochen2", m: "haut2", h: "haut1" },
    bild: [
      "......ksk......",
      "......ksk......",
      ".....ksssk.....",
      ".....ksssk.....",
      "....khhhhhk....",
      "...khmmmmmhk...",
      "...khmmmmmhk...",
      "..khhmmmmmhhk..",
      "..khhmmmmmhhk..",
      "...khmmmmmhk...",
      "...khhhhhhhk...",
      "..kk.khhhk.kk..",
      "..kk..kkk..kk..",
      "...............",
      "..............."
    ]
  },

  /* Knochendiener — Merkmal `s`: der bleiche Schädel, der weit über
     den Schultern sitzt. Er ist das Hellste an ihm. */
  knochendiener: {
    zeichen: { k: "kontur", s: "knochen2", B: "knochen1", b: "knochen0", l: "lumpen0" },
    bild: [
      "...............",
      ".....kkkkk.....",
      "....ksssssk....",
      "....ksssssk....",
      "....kBsssBk....",
      "...kBBBBBBBk...",
      "..kBBBbbbBBBk..",
      ".kBBbbbbbbbBBk.",
      ".klBbbbbbbBlk..",
      "..klBbbbbBlk...",
      "..klBBbbbBlk...",
      "...klBBBBlk....",
      "...klllllk.....",
      "....kllk.......",
      "....kk........."
    ]
  },

  /* Bogenschinder — Merkmal `b`: der Bogenrücken quer vor ihm, zwei
     Bildpunkte dick, damit er verkleinert nicht zerfällt. */
  bogenschinder: {
    zeichen: { k: "kontur", b: "leder2", m: "knochen1", h: "knochen2" },
    bild: [
      "..bb.......bb..",
      "..bb.......bb..",
      "...bb.....bb...",
      "....bbbbbbb....",
      "....bbbbbbb....",
      ".....kkkkk.....",
      "....khhhhhk....",
      "...khhmmmhhk...",
      "..khmmmmmmmhk..",
      "..khmmmmmmmhk..",
      "...kmmmmmmmk...",
      "...kmmmmmmmk...",
      "....kmmmmmk....",
      "....kmmmmmk....",
      ".....kkkkk....."
    ]
  },

  /* Kettenwicht — Merkmal `c`: die Kette, die schräg nach hinten
     rechts wegläuft. Sie steht nie mittig, deshalb sieht man die
     Drehung an ihr sofort. */
  kettenwicht: {
    zeichen: { k: "kontur", c: "eisen2", m: "eisen1", g: "eisenGlanz" },
    bild: [
      "...............",
      "....kkkkk......",
      "...kgggggk.....",
      "...kgmmmgk.....",
      "..kmmmmmmmk....",
      "..kmmgggmmk....",
      ".kmmgggggmmk...",
      ".kmmgggggmmkcc.",
      ".kmmgggggmmkcc.",
      "..kmmgggmmkcc..",
      "..kmmmmmmkcc...",
      "...kmmmmmkc....",
      "...kmmmmmk.....",
      "....kmmmk......",
      ".....kkk......."
    ]
  },

  /* Pechspeier — Merkmal `g`: die Gallenblase, die vor dem Leib
     hängt und grün leuchtet. Aus ihr kommt, was er speit. */
  pechspeier: {
    zeichen: { k: "kontur", g: "schleimHell", o: "oel1", F: "fleisch2", f: "fleisch1" },
    bild: [
      ".....kkkkk.....",
      "....kgggggk....",
      "...kggoooggk...",
      "...kggoooggk...",
      "....kgggggk....",
      "...kFFFFFFFk...",
      "..kFFFFFFFFFk..",
      ".kFFFffffFFFFk.",
      ".kFFffffffFFFk.",
      ".kFFffffffFFFk.",
      ".kFFFffffFFFFk.",
      "..kFFFFFFFFFk..",
      "..kFFFFFFFFk...",
      "...kFFFFFk.....",
      "....kkkkk......"
    ]
  },

  /* Rammbock — Merkmal `h`: der Hammerkopf, ein Klotz vor der Figur.
     Er ist der Grund, nicht an der Kante zu stehen, also ist er das,
     was man zuerst sieht. */
  rammbock: {
    zeichen: { k: "kontur", h: "eisen2", m: "knochen1", l: "leder2" },
    bild: [
      "...kkkkkkkkk...",
      "..khhhhhhhhhk..",
      "..khhhhhhhhhk..",
      "..khhhhhhhhhk..",
      "...kkkhhkkkk...",
      ".....khhk......",
      "...kkkhhkkk....",
      "..kmmmmmmmmk...",
      ".kmmmmmmmmmmk..",
      ".kmmmllmmmmmk..",
      ".kmmlllllmmmk..",
      "..kmmlllmmmk...",
      "..kmmmmmmmk....",
      "...kmmmmmk.....",
      "....kkkkk......"
    ]
  },

  /* Dunkelweber — Merkmal `a`: der glühende Sehschlitz. Er wohnt im
     Unbeleuchteten, also ist das Auge das Einzige, was von ihm zuerst
     ankommt. */
  dunkelweber: {
    zeichen: { k: "kontur", a: "auge", p: "knochen1", c: "chitin1" },
    bild: [
      "kc...........ck",
      "kcc.........cck",
      ".kcc.......cck.",
      "..kcppppppck...",
      "..kppaaappk....",
      "..kppaaappk....",
      ".kpppppppppk...",
      ".kpppppppppk...",
      "kcppppppppppck.",
      "kcppppppppppck.",
      ".kpppppppppk...",
      "..kppppppppk...",
      "..kccpppcck....",
      ".kcc.kkk.cck...",
      "kc.........ck.."
    ]
  },

  /* Aschemagier — Merkmal `f`: die Flammenkrone vor der Kapuze. Was
     von ihm brennt, brennt weiter — also brennt es sichtbar vorn. */
  aschemagier: {
    zeichen: { k: "kontur", f: "flammeHell", b: "knochen1", m: "leder2", l: "lumpen1" },
    bild: [
      "....kfffk......",
      "...kfffffk.....",
      "...kfffffk.....",
      "....kfffk......",
      ".....kkk.......",
      "....kbbbk......",
      "...kbbbbbk.....",
      "..kmbbbbbmk....",
      "..kmmbbbmmk....",
      ".kmmmmmmmmmk...",
      ".kmmmlllmmmk...",
      ".kmmllllllmk...",
      "..kmllllllk....",
      "..kmmlllmmk....",
      "...kkkkkkk....."
    ]
  },

  /* Blutvogt — Merkmal `s`: die Klinge des Richtschwerts, die weit
     vor ihm liegt. Er hält Gericht, also führt er das Urteil voran. */
  blutvogt: {
    zeichen: { k: "kontur", s: "knochen2", i: "eisenGlanz", e: "eisen2", r: "blut2" },
    bild: [
      "......ksk......",
      "......ksk......",
      "......ksk......",
      "......ksk......",
      ".....ksssk.....",
      "......kik......",
      "....kiiiiik....",
      "...keeeieeek...",
      "..kreeeeeeerk..",
      ".krreeeeeeerrk.",
      ".kreeeeeeeeerk.",
      ".kreeeeeeeeerk.",
      "..krrreeerrrk..",
      "...krrrrrrrk...",
      "....kkkkkkk...."
    ]
  }
};

/* ── Die Dinge im Kerker ────────────────────────────────────────────
   Die Schlüssel folgen `HINDERNIS` aus `spiel/gitter.mjs`; die Truhe
   hat zwei Zustände, die Treppe ist kein Hindernis, sondern der
   Ausgang.

   **Auch ein Fass ist asymmetrisch.** Das Licht dieses Spiels kommt
   aus Fackeln, nicht von überall — also liegt auf jedem Ding ein
   Glanz nach Nordwesten und ein Schatten nach Südosten. Das ist
   zugleich der Grund, warum kein Ding mit seiner eigenen Drehung
   zusammenfällt: Ein Fass, das von oben ein Kreis wäre, sähe gedreht
   gleich aus, und man könnte nicht mehr sehen, ob das Bild überhaupt
   gedreht wurde. */
export const DINGE = {
  /* Fass — Merkmal `e`: die Eisenreifen, zwei waagerechte Bänder. */
  fass: {
    zeichen: { k: "kontur", g: "knochen2", h: "knochen1", d: "leder2", e: "eisen2" },
    bild: [
      "...............",
      "....kkkkkkk....",
      "..kkgggggdkk...",
      "..keeeeeeeek...",
      ".kggegghhhddk..",
      ".kghehhhhhddk..",
      ".keeeeeeeeeek..",
      ".kghehhhhhddk..",
      ".kghehhhhhddk..",
      ".keeeeeeeeeek..",
      ".kghhhhhhhddk..",
      "..khhhhhhhdk...",
      "..kkdddddddk...",
      "....kkkkkkk....",
      "..............."
    ]
  },

  /* Kiste — Merkmal `e`: die Diagonalstrebe von der linken Ecke oben
     zur rechten unten. Sie liegt schräg, also fällt die Kiste mit
     keiner ihrer Drehungen zusammen. */
  kiste: {
    zeichen: { k: "kontur", g: "knochen2", h: "knochen1", d: "leder2", e: "eisen2" },
    bild: [
      "...............",
      ".kkkkkkkkkkkk..",
      ".kgggggggggdk..",
      ".kgeehhhhhhdk..",
      ".kgheehhhhhdk..",
      ".kghheehhhhdk..",
      ".kghhheehhhdk..",
      ".kdhhhheehhdk..",
      ".kdhhhhheehdk..",
      ".kdhhhhhheedk..",
      ".kdhhhhhhheek..",
      ".kddddddddddk..",
      ".kkkkkkkkkkkk..",
      "...............",
      "..............."
    ]
  },

  /* Sarg — Merkmal `b`: der bleiche Deckelstein am Kopfende, das
     immer nach Norden zeigt. Der Sarg ist oben breit und unten schmal
     — daran erkennt man seine Lage. */
  sarg: {
    zeichen: { k: "kontur", b: "knochen2", g: "knochen1", h: "leder2", d: "leder1" },
    bild: [
      "....kkkkkkk....",
      "...kbbbbbbbk...",
      "..kgbbbbbbbdk..",
      "..kghhhhhhhdk..",
      ".kgghhhhhhhddk.",
      ".kghhhhhhhhhdk.",
      ".kghhhhhhhhhdk.",
      ".kghhhhhhhhhdk.",
      "..kghhhhhhhdk..",
      "..kghhhhhhhdk..",
      "..kghhhhhhdk...",
      "...kghhhhdk....",
      "...kgddddk.....",
      "....kkkkk......",
      "..............."
    ]
  },

  /* Altar — Merkmal `b`: die Blutrinne, die vom Nordrand bis zur
     Mitte läuft und dort in eine Schale mündet. */
  altar: {
    zeichen: { k: "kontur", b: "blut2", s: "knochen0", g: "knochen1" },
    bild: [
      "...............",
      "..kkkkkkkkkk...",
      "..kgggggbbsk...",
      "..kgggggbbsk...",
      "..kgggbbbbsk...",
      "..kgggbbbgsk...",
      "..kgggbbbgsk...",
      "..kgggbbbgsk...",
      "..kggggbggsk...",
      "..kgggggggsk...",
      "..kgggggggsk...",
      "..kssssssssk...",
      "..kkkkkkkkkk...",
      "...............",
      "..............."
    ]
  },

  /* Säule — Merkmal `g`: der Glanzsichel nach Nordwesten. Rund und
     ohne ihn wäre die Säule in jeder Drehung dieselbe. */
  saeule: {
    zeichen: { k: "kontur", g: "knochen2", s: "knochen0", t: "steinKante" },
    bild: [
      "...............",
      "....kkkkkk.....",
      "..kkggggsskk...",
      "..kgggssssttk..",
      ".kgggsssssttk..",
      ".kggssssssttk..",
      ".kgsssssssttk..",
      ".kssssssssttk..",
      ".kssssssssttk..",
      ".ksssssssttttk.",
      "..ksssssttttk..",
      "..kkssstttkk...",
      "....kkkkkk.....",
      "...............",
      "..............."
    ]
  },

  /* Truhe zu — Merkmal `e`: das Schloss, ein Eisenblock mittig am
     Südrand. Es zeigt, wo vorn ist. */
  truheZu: {
    zeichen: { k: "kontur", g: "knochen2", h: "knochen1", d: "leder2", e: "eisen2" },
    bild: [
      "...............",
      "...............",
      "..kkkkkkkkkkk..",
      "..kggggggggdk..",
      "..kghhhhhhhdk..",
      "..kghhhhhhhdk..",
      "..kghheeehhdk..",
      "..kdhheeehhdk..",
      "..kdhheeehhdk..",
      "..kdhhhehhhdk..",
      "..kddddehdddk..",
      "..kkkkkekkkk...",
      ".....keek......",
      "...............",
      "..............."
    ]
  },

  /* Truhe auf — Merkmal `o`: das Gold im offenen Rumpf. Der Deckel
     steht nach Norden weg, das Innere leuchtet nach Süden. */
  truheAuf: {
    zeichen: { k: "kontur", o: "goldHell", g: "knochen2", h: "knochen1", d: "leder2" },
    bild: [
      "...............",
      "..kkkkkkkkkkk..",
      "..kggggggggdk..",
      "..kghhhhhhhdk..",
      "..kkkkkkkkkkk..",
      "..kdoooooooodk.",
      "..kdoooooooodk.",
      "..kdoooooooodk.",
      "..kdoooooooodk.",
      "..kdoooooooodk.",
      "..kddoooooodk..",
      "..kkddddddkk...",
      "....kkkkkk.....",
      "...............",
      "..............."
    ]
  },

  /* Fackelsockel — Merkmal `f`: die Flamme. Drei Bilder, weil eine
     stehende Flamme keine ist; `bild` bleibt `bilder[0]`, damit ein
     Aufrufer, der nur `bild` liest, unverändert weiterläuft. Die
     Flamme neigt sich nach Nordosten, deshalb ist auch dieses Sprite
     in keiner Drehung mit sich selbst gleich. */
  fackelsockel: {
    zeichen: { k: "kontur", F: "flammeWeiss", f: "flamme", g: "glut", s: "steinKante" },
    bild: [
      "......ggg......",
      ".....gfffg.....",
      "....gffFffg....",
      "....gfFFFfg....",
      "....gffFffg....",
      ".....gfffg.....",
      "......ggg......",
      ".....kkkkk.....",
      "....ksssssk....",
      "...kssssssskk..",
      "...kssssssssk..",
      "...kkssssskk...",
      ".....kkkkk.....",
      "...............",
      "..............."
    ],
    bilder: [
      [
        "......ggg......",
        ".....gfffg.....",
        "....gffFffg....",
        "....gfFFFfg....",
        "....gffFffg....",
        ".....gfffg.....",
        "......ggg......",
        ".....kkkkk.....",
        "....ksssssk....",
        "...kssssssskk..",
        "...kssssssssk..",
        "...kkssssskk...",
        ".....kkkkk.....",
        "...............",
        "..............."
      ],
      [
        ".......gg......",
        "......gffg.....",
        ".....gffFfg....",
        "....gffFFfg....",
        "....gffFffg....",
        ".....gfffg.....",
        "......ggg......",
        ".....kkkkk.....",
        "....ksssssk....",
        "...kssssssskk..",
        "...kssssssssk..",
        "...kkssssskk...",
        ".....kkkkk.....",
        "...............",
        "..............."
      ],
      [
        "......gggg.....",
        ".....gfffgg....",
        "....gffFffg....",
        "....gfFFFffg...",
        "....gffFffg....",
        ".....gffgg.....",
        "......ggg......",
        ".....kkkkk.....",
        "....ksssssk....",
        "...kssssssskk..",
        "...kssssssssk..",
        "...kkssssskk...",
        ".....kkkkk.....",
        "...............",
        "..............."
      ]
    ]
  },

  /* Gitter — Merkmal `g`: der blanke Riegel, der quer über den
     Stäben liegt. Die Stäbe hängen alle am Rahmen, sonst zerfiele
     das Gitter verkleinert zu Streuschmutz. */
  gitter: {
    zeichen: { k: "kontur", g: "knochen2", e: "eisen2", r: "rost" },
    bild: [
      "kkkkkkkkkkkkk..",
      "keeeeeeeeeeek..",
      "ke.e.e.e.e.ek..",
      "ke.e.e.e.e.ek..",
      "kr.e.e.e.e.ek..",
      "kggggggggggek..",
      "kggggggggggek..",
      "kr.e.e.e.e.ek..",
      "ke.e.e.e.e.ek..",
      "ke.e.e.e.e.ek..",
      "ke.e.e.e.e.ek..",
      "keeeeeeeeeeek..",
      "kkkkkkkkkkkkk..",
      "...............",
      "..............."
    ]
  },

  /* Spießreihe — Merkmal `w`: die weißen Spitzen. Sie stehen alle
     auf einer Fußleiste, damit die Reihe ein Stück bleibt. Die
     Spitzen zeigen nach Norden. */
  spiess: {
    zeichen: { k: "kontur", w: "knochen2", g: "eisenGlanz", d: "eisen1" },
    bild: [
      "...............",
      "..w.w.w.w.w.w..",
      "..w.w.w.w.w.w..",
      ".gwgwgwgwgwgwg.",
      ".gwgwgwgwgwgwg.",
      ".wwwwwwwwwwwww.",
      ".kdddddddddddk.",
      ".kdddddddddddk.",
      ".kkkkkkkkkkkkk.",
      "...............",
      "...............",
      "...............",
      "...............",
      "...............",
      "..............."
    ]
  },

  /* Treppe hinab — Merkmal `a`: die oberste, hellste Stufe. Die
     Stufen werden nach Süden dunkler, und genau daran liest man, dass
     es hinabgeht und nicht hinauf. */
  treppeHinab: {
    zeichen: { k: "kontur", a: "knochen2", b: "knochen1", c: "knochen0", d: "steinKante" },
    bild: [
      "...............",
      ".kkkkkkkkkkkk..",
      ".kaaaaaaaaaak..",
      ".kaaaaaaaaaak..",
      ".kaaaaaaaaakk..",
      ".kbbbbbbbbbk...",
      ".kbbbbbbbbbk...",
      ".kbbbbbbbbkk...",
      ".kcccccccck....",
      ".kcccccccck....",
      ".kcccccccck....",
      ".kdddddddk.....",
      ".kdddddddk.....",
      ".kkkkkkkkk.....",
      "..............."
    ]
  }
};

/* ── Die Zeichen der Oberfläche ─────────────────────────────────────
   Kleiner als die Figuren (7 oder 9, immer ungerade), weil sie über
   dem Spielfeld liegen und es nicht zudecken dürfen. Sie tragen
   deshalb die hellsten Töne der Palette: Ein Zeichen, das man erst
   sucht, hat seine Aufgabe verfehlt — und der Untergrund dieses
   Spiels ist dunkel, aber nicht überall gleich dunkel. */
export const ZEICHEN = {
  /* Zielkreuz — Merkmal `w`: der Kranz mit den vier Armen. Der
     nördliche Arm ist heller und länger als die anderen; ohne ihn
     wäre das Kreuz in jeder Drehung dasselbe Bild. */
  zielkreuz: {
    zeichen: { w: "hudWarn", m: "flamme" },
    bild: [
      "....m....",
      "....m....",
      "..wwwww..",
      "..w...w..",
      "wwww.wwww",
      "..w...w..",
      "..wwwww..",
      "....w....",
      "........."
    ]
  },

  /* Wegpunkt — Merkmal `a`: die Raute mit dem Stiel nach Süden. Der
     Stiel zeigt auf das Feld, die Raute schwebt darüber. */
  wegpunkt: {
    zeichen: { a: "arkanHell", A: "arkanWeiss" },
    bild: [
      "....a....",
      "...aaa...",
      "..aaaaa..",
      ".aaaAaaa.",
      "..aaaaa..",
      "...aaa...",
      "....a....",
      "....a....",
      "....a...."
    ]
  },

  /* Wachtauge — Merkmal `a`: die glühende Iris um die schwarze
     Pupille. Die drei Wimpern stehen nur nach Norden, damit man
     sieht, wohin die Wacht schaut. */
  wachtauge: {
    zeichen: { w: "knochen2", a: "auge", p: "kontur" },
    bild: [
      "..w.w.w..",
      "..wwwww..",
      ".wwaaaww.",
      "wwaapaaww",
      ".wwaaaww.",
      "..wwwww..",
      ".........",
      ".........",
      "........."
    ]
  },

  /* Ausrufezeichen — Merkmal `w`: der Balken. Der Punkt darunter ist
     **abgesetzt** und der einzige erlaubte zweite Fleck im ganzen
     Vorrat: Ein Ausrufezeichen ohne Lücke ist ein Ausrufestrich. */
  ausrufezeichen: {
    zeichen: { k: "kontur", w: "hudWarn", p: "flamme" },
    bild: [
      ".kwwwk.",
      ".kwwwk.",
      ".kwwwk.",
      ".kwwwk.",
      ".kkwkk.",
      ".......",
      ".kpppk."
    ]
  },

  /* Stoßpfeil — Merkmal `s`: der Pfeilkörper. Er zeigt nach Norden
     und wird mit der Stoßrichtung gedreht; die weiße Spitze sagt,
     wohin die Figur fliegt. */
  stosspfeil: {
    zeichen: { s: "apKosten", t: "flammeWeiss" },
    bild: [
      "....t....",
      "...ttt...",
      "..sssss..",
      ".sssssss.",
      "sssssssss",
      "...sss...",
      "...sss...",
      "...sss...",
      "...sss..."
    ]
  },

  /* AP-Punkt — Merkmal `A`: die volle Scheibe. Der Glanz liegt nach
     Nordwesten wie bei allen Dingen dieses Kerkers, und er ist es
     auch, der die Scheibe von ihrer eigenen Drehung unterscheidet. */
  apPunkt: {
    zeichen: { g: "gold0", A: "apVoll", h: "flammeWeiss" },
    bild: [
      "..ggg..",
      ".ghhAg.",
      "ghhAAAg",
      "gAAAAAg",
      "gAAAAAg",
      ".gAAAg.",
      "..ggg.."
    ]
  },

  /* Sturzpfeil — Merkmal `s`: der Pfeil, der nach unten zeigt. Er
     wird **nicht** gedreht, denn ein Sturz geht immer in dieselbe
     Richtung: hinab. Die dunkle Spitze ist blutig, weil ein Sturz
     hier drei Schaden je Stufe kostet. */
  sturzpfeil: {
    zeichen: { s: "hudSchlecht", t: "blut2" },
    bild: [
      "...sss...",
      "...sss...",
      "...sss...",
      "...sss...",
      "sssssssss",
      ".sssssss.",
      "..sssss..",
      "...ttt...",
      "....t...."
    ]
  }
};
