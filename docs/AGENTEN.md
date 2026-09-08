# Mit Agenten an Hatred arbeiten

Der Einstieg ist [AGENTS.md](../AGENTS.md), die fachliche Karte
[WEGWEISER.md](WEGWEISER.md). Dieses Dokument beschreibt die Zusammenarbeit;
Spielregeln bleiben in [SPIEL.md](SPIEL.md), technische Regeln in
[REGELN.md](REGELN.md). Claude-Dateien verweisen auf diese gemeinsamen Quellen.

## Einen Auftrag schneiden

Ein Auftrag benennt ein Ergebnis und die Dateien, die dafür nötig sind.
Nicht nach allgemeiner Tätigkeit aufteilen, wenn beide Agenten dadurch dieselben
Dateien ändern würden. Stattdessen nach Verantwortung schneiden, etwa Kamerazoom
und dessen Prüfung als ein Paket; ein anderer Agent liest die Touch-Grenzen.

Vor dem Schnitt Importe, gemeinsame Kataloge und Testhilfen lesen. Änderungen
an einer geteilten Schnittstelle zuerst vereinbaren und danach die abhängigen
Pakete starten. Für kleine Änderungen genügt ein Agent.

| Aufgabe | Geeigneter Arbeitsmodus |
| --- | --- |
| Bestandsaufnahme oder unabhängige Fehlersuche | Lesend auf benanntem Commit oder Snapshot |
| Eigenständige Änderung an exklusiven Dateien | Schreibend in eigenem Worktree |
| Mehrere Änderungen an derselben Schnittstelle | Nacheinander, ein schreibender Besitzer |
| Integration, Changelog und abschließende Abnahme | Leitender Agent |

Codex übernimmt Routine, Werkzeuge, Prüfungen und Integration. Claude hat nur
etwa ein Zwanzigstel des Codex-Kontingents und wird über das vorhandene
`claude.cmd` gezielt eingesetzt: etwa für eine schwierige Architekturentscheidung
oder eine besonders wertvolle unabhängige Fehlersicht. Vorher kurz Grund und
Auftrag nennen; höchstens ein kompakter Lauf plus eine gezielte Nachbesserung.
Keine Geheimnisse übergeben. Ergebnisse prüft der leitende Agent selbst.

## Dateibesitz und Worktrees

1. Tatsächliche Wurzel, Zweig, offenen Diff und `git worktree list` prüfen.
2. Die gemeinsame Koordinationskopie von [WORKCLAIM.md](../WORKCLAIM.md) im
   leitenden Checkout benennen. Dort werden Besitzer und konkrete Dateien
   vor dem Schreiben eingetragen.
3. Der leitende Agent legt Schreib-Worktrees an und prüft deren Basis-Commit.
   Bereits vorhandene fremde Worktrees werden nicht umgeschaltet oder bereinigt.
4. Ein Worktree sieht nur seinen eigenen Dateistand. Offene Anleitungen und
   Workclaims aus einem anderen Checkout werden nicht automatisch geteilt.
   Benötigte Regeln vor dem Start im Basis-Commit bereitstellen oder ausdrücklich
   als Auftragskontext übergeben. Ein lesender Review kann einen bezeichneten
   offenen Diff verwenden.
5. Pro Datei genau ein Schreiber. `WORKCLAIM.md` und `CHANGELOG.md` gehören bei
   paralleler Arbeit dem Leitstand. Unteragenten liefern dafür Textbausteine.
6. Vor der Übergabe den eigenen Diff prüfen und nur die eigenen Dateien vormerken.
   Keine Sammelbefehle über unbekannte Änderungen, kein Reset im fremden Checkout.

Eine Workclaim-Datei ist eine Absprache, keine technische Sperre. Kopien in
Worktrees sind keine gemeinsame Datenbank. Deshalb ist der Pfad der
Koordinationskopie Teil jedes Auftrags, und nur der Leitstand aktualisiert sie.
Ein altes Datum allein gibt keinen fremden Arbeitsbereich frei.

## Vorlage für einen begrenzten Auftrag

```text
Ziel: Konkretes gewünschtes Verhalten oder konkrete Strukturänderung.
Provider und Modus: Codex/Claude; read-only oder write.
Arbeitsort: Verifizierter absoluter Pfad.
Basis: Commit-SHA oder ausdrücklich benannter offener Snapshot.
Koordination: Absoluter Pfad der Workclaim-Datei des Leitstands.
Eigene Dateien: Vollständige Liste oder eng begrenzte Ordner.
Nicht-Auftrag: Spielregeln/Optik/Protokoll, soweit nicht beauftragt.
Lesen: AGENTS.md, relevante lokale Anleitung und konkrete Quelldateien.
Schnittstellen: Benutzte Exporte, Zustandsformen und feste Grenzen.
Abnahme: Reproduzierbarer Fehlerfall, Prüfbefehle, erwartete Ergebnisse.
Autorisierung: Kein Merge, Push, Deploy oder externe Nachricht ohne Auftrag.
Rückgabe: Ergebnis, Diff/Dateien, Messungen, offene Einschränkungen.
```

Auftrag und Ausgabe bleiben einfacher Text. Kein kompliziertes Antwortschema,
für dessen Formatierung die ganze Arbeit wiederholt werden muss.

## Abnehmen und übergeben

Der leitende Agent liest den tatsächlichen Diff und kontrolliert Pfade,
Importgrenzen und Behauptungen. Eine grüne Prüfung in zwei getrennten
Worktrees beweist nicht, dass deren Kombination funktioniert.

Nach dem Zusammenführen in den Arbeitszweig `pnpm test` auf diesem Stand
ausführen. Bei Modul-/Exportänderungen `pnpm build`; sichtbare Änderungen
zusätzlich im Browser. Die vollständige Kette ist das Gate; gezielte Tests
helfen vorher beim Arbeiten. Befehle und Rückgabewerte dokumentieren, nicht
nur die Aussage „Tests sind grün“. Details stehen in
[ENTWICKLUNG.md](ENTWICKLUNG.md).

Nach Abschluss den eigenen Workclaim freigeben. Merge nach `main`, Push und
Veröffentlichung nur im ausdrücklich autorisierten Umfang. Bestehende
Autorisierung nicht wiederholt erfragen. Eine lokale Änderung darf vollständig
gebaut, geprüft und auf ihrem Arbeitszweig vorbereitet werden.

## Alte Worktrees aufräumen

Ein Nachbarordner kann eine registrierte Arbeitskopie mit eigenen Commits oder
uncommitteten Änderungen sein. Vor einem gezielten Abbau Status, nicht
integrierte Commits und eine mögliche aktive Sitzung prüfen. Erst eindeutig
zugeordnete, nicht mehr benötigte Worktrees mit dem Git-Worktree-Befehl entfernen.
Keine erzwungene Entfernung und kein rekursives Löschen nach einem Namensmuster.
