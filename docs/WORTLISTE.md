# Wortliste — die Sprachtrennung dieses Projekts

*(Nur anlegen, wenn `alpha-code.json` einen `sprache`-Block hat.
`werkzeuge/pruefe-sprache.mjs` liest genau diese Tabelle.)*

Diese Liste ist **nie vollständig, und das ist die Bauart.** Eine
Sprache lässt sich nicht erkennen, nur eine Wortliste abgleichen. Wer
ein deutsches Wort in einem Bezeichner oder Dateinamen findet, das hier
noch fehlt, **trägt es ein** — dann kann genau dieses Wort nie wieder
durchrutschen. Nach zwanzig Einträgen fängt die Liste die Wörter, die
man wirklich tippt.

Die Tabelle wird **zweimal** gelesen, und das ist Absicht:

| Verwendung | Beispiel |
| --- | --- |
| Bezeichner und Dateinamen | `pruefung` oder `prüfung` in einem Namen ist ein Verstoß |
| Ersatzschreibung in Texten | `Pruefung` in einem Kommentar ist ein Verstoß — es heißt `Prüfung` |

Zwei getrennte Listen wären zwei Wahrheiten für dieselbe Sache
(Fehlerbuch E2). Deshalb steht jedes Wort genau einmal hier.

## Die Liste

| deutsch | englisch |
| --- | --- |
| `Prüfung` | `check` |
| `Werkzeug` | `tool` |
| `Vorlage` | `template` |
| `Datei` | `file` |
| `Ordner` | `folder` |
| `Benutzer` | `user` |
| `Einstellung` | `setting` |
| `Fehler` | `error` |
| `Größe` | `size` |
| `Wächter` | `guard` |
| `Änderung` | `change` |
| `Löschen` | `delete` |

## Ausnahmen

Fachbegriffe der Domäne bleiben deutsch, auch in Bezeichnern — ein
`Kegelfall` heißt in einem Bowling-Projekt nicht `pinFall`, weil dann
niemand mehr den Bezug zum Fachgespräch findet. Solche Wörter kommen
**nicht** in diese Tabelle; wer sie einträgt, verbietet sie.
