# Projektprofil — {{PROJEKTNAME}}

Für die Verteilung von Arbeit auf Subagenten. Jeder Auftrag zieht
hieraus — wörtlich, nicht als Verweis.

## Grunddaten

| | |
| --- | --- |
| Standardbranch | `main` |
| Konventionsdatei | `docs/REGELN.md` |
| Prüfbefehl | `node werkzeuge/pruefe-alles.mjs` |
| Abnahmeweg | Workclaim eintragen → Zweig → Kette grün → Auftraggeber fragen → `main` |

## Konventionen — wörtlich in jeden Auftrag

- **Sprache:** getrennt nach Bezeichnern und Texten
  (`alpha-code.json` → `sprache`, Regel 15). Texte deutsch, mit echten
  Umlauten (ä ö ü ß), niemals `ae oe ue ss`. Nutzertexte gehören in
  Sprachdateien, nicht in den Code.
- **Kopfnotiz:** jede Quelldatei beginnt mit Was · Warum · „Arbeitet
  zusammen mit", plus `[Aufgabe: <Tag>]` aus der Tabelle in
  `docs/REGELN.md`.
- **Commit-Text:** Conventional Commits mit deutschem Betreff
  (`fix: Bahnenfeld laesst sich leeren`). **Umlaute und ß werden auch
  im Betreff richtig gesetzt.** Sobald ein Vorgang existiert, steht
  seine Nummer am Ende: `(#123)`.
- **Zweigname:** `<system>/<kurz>` aus der Systemtabelle in
  `docs/REGELN.md`. *(Arbeiten mehrere Agenten am selben Projekt und
  ist unklar, wem ein Zweig gehört, hilft ein Präfix je Agent —
  `claude/<thema>`, `codex/<thema>`. Es beantwortet aber eine andere
  Frage als die Systemtabelle: „wer" statt „was". Wer beides braucht,
  nimmt `WORKCLAIM.md` für das Wer und behält den Systemschnitt, denn
  nur er macht einen Zweig als Ganzes annehmbar oder verwerfbar.)*
- **Changelog:** jede Änderung, oben, mit Warum und Messung.
- **Zeilenenden:** die der Zieldatei übernehmen, nicht die eigenen.
  Nie mit `grep`/`cat -A` beurteilen — `file` oder Bytes zählen
  (Fehlerbuch C4).
- **Doku trägt Begründung, nicht Stand** (Regel 13/14). In einen
  Abschlussbericht gehört kein „erledigt" für ein Dokument — der
  Stand steht im Vorgang.

## Stille Fallen — kommen grün durch

1. `pruefe-arbeitsweise.mjs` schlägt an, wenn offene Änderungen auf
   `main` liegen oder `CHANGELOG.md` nicht mitgeändert ist — auch bei
   reiner Doku-Arbeit.
2. Die Ausgabe eines Messlaufs gehört **außerhalb** des Projekts
   (`> lauf.txt` im Scratchpad), sonst sieht die Arbeitsweise-Prüfung
   sie als offene Änderung.
3. `<befehl> | tail -25; echo $?` meldet den Code von `tail`. Echten
   Code holen: `<befehl> > lauf.txt 2>&1; echo "code=$?"`.
4. Die Werkzeugfallen dieser Umgebung stehen in `docs/FEHLERBUCH.md`,
   Klasse C — **vor dem ersten Shell-Einzeiler lesen**.

## Was Agenten nicht tun

- nicht nach `main` zusammenführen, nicht pushen und nicht deployen;
- keine Dateien außerhalb des eigenen Workclaim-Bereichs ändern;
- keine Prüfmarke, Schwelle oder Abnahmebedingung senken, um einen
  Lauf grün zu machen;
- keine Abhängigkeit oder Grundsatzentscheidung ohne eigenen Auftrag
  einführen.

## Abnahmekriterien

Der Agent liest den vollständigen Diff, weist ausschließlich erlaubte
Pfade nach, führt die Kette aus und nennt Commit-SHA, geänderte
Dateien, Messzahlen und offene Punkte. Die Integrationsinstanz führt
vor einer Freigabe die Kette auf dem **integrierten** Stand aus — ein
grüner Einzel-Worktree beweist nicht, dass die Kombination grün ist.

Jeder Abschlussbericht beantwortet außerdem zwei Fragen, die sich in
einer PR-Vorlage bewährt haben: **Was wurde bewusst nicht geändert?** — der
Satz, der stille Nebenumbauten sichtbar macht. Und wo ein
Produktivsystem berührt ist: **Wie ist der Rückrollweg?**
