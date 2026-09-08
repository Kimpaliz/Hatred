# Hatred — zuerst lesen

Ein rundenbasierter Koop-Dungeon-Crawler für den Browser, zu **einem bis
vier über das Internet**. Janniks Auftrag wörtlich: *„multyplayer
rundenbasiert dungeoncrawler. in raster unterteilt. schöne pixel grafik.
richtige landschaftsgenerierung. das schlachtfeld kann aus
unterschiedlichen höhen bestehen"* und *„stil wie auf dem bild. auch mit
licht quellen. pixel partikeln."*

Was das mechanisch heißt, steht in [docs/SPIEL.md](docs/SPIEL.md).

Auftraggeber ist **Jannik**. Er entscheidet fachlich und programmiert
selbst nicht: Alles Technische wird gebaut und ihm anschließend in
normaler Sprache erklärt — keine Fachwörter ohne Übersetzung, keine
Aufgabe an ihn, die Code voraussetzt. Sein Wortlaut ist die Quelle:
Wünsche werden **zitiert**, nicht umformuliert.

## In dreißig Sekunden

- Zweig anlegen, `WORKCLAIM.md` lesen und eintragen — **dann** erst bauen.
- Jede Änderung: Changelog-Eintrag oben, dann `node werkzeuge/pruefe-alles.mjs`.
- Ein roter Ausgangsstand wird zuerst **gemeldet**, nicht überbaut.
- Merge, Push, Veröffentlichung: nur auf das ausdrückliche Ja des Auftraggebers.
- Was unter „Ausdrücklich nicht gefordert" steht, wird nicht gebaut und
  nicht als Lücke gemeldet.

## Die drei Entscheidungen, die alles erklären

**1. `spiel/` kennt keinen Browser.** Kein Bildschirm, keine Tastatur,
keine Uhr, kein `Math.random`. Deshalb rechnen vier Rechner dieselbe
Runde bitgleich — und genau deshalb ist Internet-Koop hier eine dünne
Schicht statt eines Umbaus.

**2. Über die Leitung geht eine Aktion, kein Zustand.** „Wesen 3 geht
nach (12, 8)" sind ein paar Dutzend Bytes. Jeder Rechner rechnet das
Ergebnis selbst aus und vergleicht danach eine Prüfzahl.

**3. Es gibt keine Bilddatei.** Jede Figur steht als Text im
Repository, eine Zeile je Bildpunktzeile. Diffbar, prüfbar, ohne
Bildbearbeitung änderbar.

## Ausdrücklich nicht gefordert

- **Konten, Anmeldung, Datenbank.** Es gibt keinen Spielserver. Der
  Spielstand liegt im Browser.
- **Bezahlung, Werbung, Ladenseite.**
- **Bestenlisten über das Netz**, Freundeslisten, Chat.
- **Übersetzungen.** Das Spiel ist deutsch.
- **Bilddateien** für Sprites.
- **Ton** — bis Jannik ihn ausdrücklich möchte.

---

## Die Regeln

Ausführlich in [docs/REGELN.md](docs/REGELN.md); die prüfbaren laufen in
der Kette mit.

1. **Nie direkt auf `main`.** Jede Änderung entsteht auf einem Zweig.
2. **Ein Zweig je System.** Die Tabelle steht in `docs/REGELN.md`.
3. **Nach jeder Änderung wird gefragt**, ob sie nach `main` soll.
4. **Alles steht im Changelog.** Jede einzelne Änderung, genau, oben.
5. **Workclaim:** [WORKCLAIM.md](WORKCLAIM.md) erst lesen, dann
   eintragen, dann schreiben. Fremde Bereiche sind gesperrt.
6. **`spiel/` bleibt browserfrei** — daran hängt der Netz-Koop.
7. **Doku trägt die Begründung, nicht den Stand.** Kein „ist live", kein
   „erledigt", kein Häkchen an einem Plan-Schritt — das veraltet
   lautlos. Zustandsaussagen nur **datiert** („gemessen am …").

```bash
node werkzeuge/pruefe-alles.mjs      # die ganze Prüfkette
node werkzeuge/vorschau.mjs          # spielen: http://127.0.0.1:8145/
node werkzeuge/karte-zeigen.mjs 7    # eine erzeugte Karte ansehen
```

---

## Wegweiser — welche Datei beantwortet welche Frage

**Vor dem Bauen immer zuerst:** dieses Dokument, dann
[docs/FEHLERBUCH.md](docs/FEHLERBUCH.md) — dort stehen die Fehler, die
sich wiederholen, und woran man sie erkennt, **bevor** man hineinläuft.

**Wer neu dazukommt**, liest danach
[docs/UEBERGABE.md](docs/UEBERGABE.md): was gemessen wurde, welche
Entscheidungen offen sind und welche Prüfung grün ist, obwohl sie nichts
mehr misst.

| Frage | Datei |
| --- | --- |
| Ich bin neu hier — was muss ich wissen? | [docs/UEBERGABE.md](docs/UEBERGABE.md) |
| Welches System redet mit welchem? Wo fasse ich für Wunsch X an? | [docs/WEGWEISER.md](docs/WEGWEISER.md) |
| Was wird gebaut und warum so? | [docs/SPIEL.md](docs/SPIEL.md) |
| Wer arbeitet gerade woran? | [WORKCLAIM.md](WORKCLAIM.md) |
| Was wurde zuletzt gebaut, und warum — mit den Messungen | `CHANGELOG.md`, oberster Eintrag |
| Was kommt als Nächstes? | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Welche Regeln gelten, welche Zweignamen gibt es? | [docs/REGELN.md](docs/REGELN.md) |
| Welche Fehler wiederholen sich? | [docs/FEHLERBUCH.md](docs/FEHLERBUCH.md) |
| **Wie ist der Stand von X?** | **nicht hier** — im Vorgang (Regel 13) |

---

## Die Haltung dieses Projekts

**Jede Zahl ist gemessen.** Nicht geschätzt, nicht aus einem Kommentar
übernommen. Wenn irgendwo eine Zahl steht, gibt es den Befehl, der sie
nachrechnet.

**Umbau und Inhalt werden getrennt.** Ein Umbau ohne sichtbare Änderung
lässt sich beweisen (gleiche Aktionen → gleiche `zustandsSumme()`); ein
Umbau mit Änderung nicht.

**Jede neue Prüfung wird zuerst rot gemacht.** Den Fehler absichtlich
einbauen, anschlagen sehen, zurücknehmen. Eine Prüfung, die nie rot war,
prüft womöglich nichts.

**Geprüft wird der Fall, der ohne die Arbeit falsch wäre.** Nicht der,
der ohnehin gewinnt.
