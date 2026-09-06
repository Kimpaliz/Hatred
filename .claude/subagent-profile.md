# Subagenten-Profil — Hatred

Ergänzt `.claude/PROJEKTPROFIL.md` um das, was dort fehlt: die stillen
Fallen dieser Fläche. Jeder Auftrag zieht hieraus **wörtlich**.

## Grunddaten

| | |
| --- | --- |
| Wurzel | `/home/user/hatred` |
| Hauptzweig | `main` · gearbeitet wird auf `einrichtung/alpha-code` |
| Prüfbefehl | `node werkzeuge/pruefe-alles.mjs` (33 Prüfungen, ~65 s) |
| Konventionen | `docs/REGELN.md`, Systemtabelle mit den Tags |
| Fehlerbuch | `docs/FEHLERBUCH.md` |
| Abnahmeweg | Workclaim → Zweig → Kette grün → Auftraggeber fragen → `main` |

## Wächter, die keine Fachprüfung sind

`pruefe-kern` (kein Browser unter `spiel/`) · `pruefe-tags` (jede Datei
trägt `[Aufgabe: <Tag>]`) · `pruefe-kopfnotiz` (Kopfnotiz, ≤1000 Zeilen,
≤100 Zeichen) · `pruefe-sprache` (deutsche Bezeichner, echte Umlaute) ·
`pruefe-verweise` (kein Pfad mit führendem `/`, kein toter Doku-Verweis) ·
`pruefe-doku-status` (kein Dokument behauptet einen Zustand) ·
`pruefe-arbeitsweise` (nicht auf `main`, Changelog mitgeändert) ·
`pruefe-altlasten` (keine neue Datei über 1000 Zeilen).

## Stille Fallen — Bild und Bedienung

Diese kommen **grün durch** und fallen erst im fertigen Bild auf.

1. **Halbe Bildpunkte.** Sobald etwas auf `x = 12.5` gezeichnet wird,
   glättet der Browser, und die Pixelgrafik ist dahin. Alles auf ganze
   Bildpunkte runden; Vergrößerung immer ganzzahlig.
2. **`imageSmoothingEnabled` wird beim Setzen von `canvas.width`
   zurückgesetzt.** Nach *jedem* Setzen der Maße erneut auf `false`.
3. **Ein Tipp erzeugt auf Android AUCH Mausereignisse.** `touchend`
   löst danach `mousedown`/`click` aus. Wer beide Wege behandelt, führt
   jede Aktion **zweimal** aus — im Spiel heißt das: zwei Züge, zwei
   Angriffe, und der zweite geht ins Leere. Entweder Zeigerereignisse
   (`pointerdown`) allein, oder `preventDefault()` auf dem Touch-Weg.
4. **Es gibt keinen Zeiger, der schwebt.** `mousemove` liefert auf dem
   Handy nichts, bevor getippt wird. Alles, was heute an der
   Zeigerposition hängt (Wegvorschau, Feldangabe, Zielangabe), ist auf
   dem Handy **leer**, wenn man es nicht auf zwei Schritte umstellt.
5. **Das Blatt und das Gerät haben verschiedene Auflösungen.**
   `devicePixelRatio` ist auf Android oft 2,625 oder 2,75 — krumm. Wer
   das Blatt damit multipliziert, bekommt eine **nicht ganzzahlige**
   Vergrößerung und weiche Kanten. Die Vergrößerung muss ganzzahlig
   bleiben; lieber ein paar Bildpunkte Rand als ein weiches Bild.
6. **Doppeltipp zoomt, Wischen scrollt** — beides stört. `touch-action`
   und `user-select` gehören auf das Blatt, sonst kämpft der Browser
   gegen das Spiel.
7. **Vollbild und Bildschirmdrehung brauchen eine Nutzergeste.** Aus
   einem Zeitgeber heraus lehnt Android beides ab.
8. **Fingergroß heißt mindestens 48 Bildpunkte.** Was für die Maus
   reicht, trifft der Daumen nicht.
9. **Eine abgelehnte Aktion darf nichts geändert haben.** Kein halber
   Schritt (Fehlerbuch E2).
10. **Solange eine Ereignisliste abgespielt wird, wird keine Eingabe
    angenommen** — sonst trifft eine Aktion eine Voraussetzung, die
    sich gerade ändert.

## Wie eine `runtime/`-Datei ohne Browser geprüft wird

In der Prüfdatei ein **mitschreibendes Zeichenblatt** bauen: ein Objekt
mit den benutzten Methoden, das jeden Aufruf in eine Liste legt. Dann
über die **mitgeschriebenen Aufrufe** behaupten — so lässt sich belegen,
dass auf ganzen Bildpunkten gezeichnet wird und die Glättung aus ist.
Beispiele: `werkzeuge/pruefe-zeichnen.mjs`, `pruefe-oberflaeche.mjs`.

Zeigerereignisse werden genauso nachgestellt: ein Objekt mit
`addEventListener`, das die Hörer merkt, damit die Prüfung sie von Hand
auslösen kann. `werkzeuge/pruefe-eingabe.mjs` macht das bereits.

## Bevor der erste Arbeitsbaum entsteht

⚠️ **Alles, was ein Agent lesen soll, muss committet sein.** Ein Arbeitsbaum
(`git worktree add <pfad> <sha>`) kennt nur Commits — offene Änderungen im
Hauptbaum sieht er nicht. Am 06.09.2026 lagen dieses Profil und die
Workclaim-Einträge beim Anlegen der Bäume noch offen; drei Agenten arbeiteten
ohne sie. Einer meldete das Fehlen, ein zweiter trug sich selbst in
`WORKCLAIM.md` ein und schrieb damit in eine fremde Datei. Beide handelten
richtig — der Fehler lag beim Leitstand.

Also: erst committen, dann `git rev-parse HEAD` nehmen, dann die Bäume anlegen.

## Was Agenten nicht tun

- nicht nach `main` zusammenführen, nicht pushen, nicht deployen;
- keine Datei außerhalb ihres Auftrags ändern — auch nicht „im
  Vorbeigehen";
- **nie `git add -A`** — nur die eigenen Pfade;
- keine Prüfmarke, Schwelle oder Abnahmebedingung senken, um grün zu
  werden. Wer eine Marke für falsch hält, meldet das und lässt sie rot;
- `CHANGELOG.md` schreibt der Leitstand, nicht der Agent.
