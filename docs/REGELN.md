# Die Regeln dieses Projekts

Kurz in [AGENTS.md](../AGENTS.md). Hier steht die Begründung — und
welche Regel maschinell geprüft wird.

## 1. Nie direkt auf `main`

Jede Änderung entsteht auf einem Zweig. `main` ist der Stand, den man
spielen kann, ohne zu wissen, woran gerade gearbeitet wird.

*Geprüft:* `werkzeuge/pruefe-arbeitsweise.mjs` schlägt an, wenn offene
Änderungen auf `main` liegen.

## 2. Ein Zweig je System

Zwei Änderungen an verschiedenen Systemen gehören in zwei Zweige, auch
wenn sie am selben Tag entstehen. Sonst lässt sich die eine nicht
annehmen und die andere verwerfen.

| System | Tag | Zweig | Bereiche |
| --- | --- | --- | --- |
| Regelkern | `Regelkern` | `kern/…` | `spiel/` — Höhen, Sicht, Wege, Kampf, Züge, KI, Lauf, Katalog |
| Bild | `Bild` | `bild/…` | `runtime/zeichnen.js`, `licht.js`, `partikel.js`, `sprite*.js`, `palette.js`, `kamera.js`, `schrift.js` |
| Oberfläche | `Oberfläche` | `flaeche/…` | `runtime/oberflaeche.js`, `eingabe.js`, `lobby.js`, `start.js`, `index.html` |
| Netz | `Netz` | `netz/…` | `netz/` |
| Prüfwesen | `Prüfwesen` | `pruef/…` | `tests/`, `werkzeuge/pruefe-*.mjs` |
| Werkzeug | `Werkzeug` | `werk/…` | `werkzeuge/` ohne die Prüfungen — Vorschau, Kartenansicht, Bündler |
| Doku | `Doku` | `doku/…` | `docs/`, alle `*.md` in der Wurzel |

Die **Landschaft** hat bewusst keinen eigenen Zweignamen: Sie ist Teil
des Regelkerns (`spiel/welt-feld.mjs`, `landschaft.mjs`, `bauart.mjs`),
weil ihre Ausgabe eine Spielregel ist und keine Zierde — eine Karte, auf
der der Ausgang nicht erreichbar ist, ist ein unspielbarer Lauf.

Arbeiten mehrere Agenten gleichzeitig, hilft zusätzlich ein Präfix je
Agent (`claude/<thema>`). Das beantwortet aber eine andere Frage — „wer"
statt „was". Wer beides braucht, nimmt `WORKCLAIM.md` für das Wer.

## 3. Autorisierung für Integration und Veröffentlichung

Merge, Push und Veröffentlichung nur auf das ausdrückliche Ja des
Auftraggebers. Kein „ich habe es schon mal nach main gebracht, war ja
klein". Für `main` gilt seit dem 12.09.2026 die Dauerfreigabe weiter
unten in diesem Abschnitt; für alles andere bleibt es bei diesem Satz.

Eine bereits erteilte Autorisierung gilt für den vereinbarten Umfang weiter.
Lokale Änderungen erst vollständig bauen und prüfen; nicht vor jeder
reversiblen Teiländerung dieselbe Frage wiederholen.

### Die Dauerfreigabe für `main` vom 12.09.2026

Janniks Wortlaut: *„trag dir ein. das alles auf main kann wenn du der
meinung bist das es sicher ist."*

**Warum das auch den Push deckt.** Der Satz nennt nur *„auf main"*, und
das Hochladen zu GitHub ist ein zweiter Schritt. Er antwortet aber auf
eine Frage, die beide benannt hat — im selben Gespräch stand:
*„Sag „ja main", dann führe ich zusammen und **lade hoch**."* Sein
„das alles" bezieht sich darauf. Wer es enger liest, fragt nach; wer es
weiter liest als hier, überschreitet die Freigabe.

Damit ist **Merge nach `main` und Push von `main`** dauerhaft
autorisiert — nicht mehr Änderung für Änderung. Die Freigabe hängt an
einer Bedingung, und die Bedingung ist keine Stimmung, sondern diese
Liste. **Alle sieben Punkte müssen zutreffen:**

1. `node werkzeuge/pruefe-alles.mjs` ist grün, und zwar auf **genau dem
   Stand, der gemergt wird** — nicht auf einem früheren.
2. Jede Zahl im Changelog-Eintrag ist gemessen, mit dem Befehl daneben
   (Regel 11).
3. Ein Umbau ohne beabsichtigte Bildänderung ist bewiesen
   (`werkzeuge/miss-bildabdruck.mjs`), eine Änderung in `runtime/` gegen
   die Prüfsummen aus `spiel/` abgegrenzt (Regel 12).
4. Keine Prüfschwelle wurde gesenkt, keine Prüfung abgeschaltet und keine
   Behauptung entfernt, um grün zu werden.
5. `main` wird dadurch **nicht schlechter**: kein Zwischenzustand, den
   Jannik nicht bedienen kann. Der Beispielfall aus dem Gespräch vom
   12.09.2026: eine flache Karte ohne sichtbare Wände wäre so ein
   Zustand — sie wartet, bis sie zusammen mit ihrem Gegenstück kommt.
6. `WORKCLAIM.md` trägt keinen fremden Anspruch auf die berührten
   Bereiche.
7. Kein Zugangswort, kein Messprotokoll und keine Wegwerfdatei liegen im
   Baum (`werkzeuge/pruefe-geheimnisse.mjs` läuft in der Kette mit).

**Im Zweifel wird gefragt, nicht gemergt.** Genau dafür steht *„wenn du
der meinung bist"* — die Freigabe nimmt die Rückfrage bei klaren Fällen
weg, nicht das Urteil.

**Was die Freigabe ausdrücklich NICHT deckt** und weiterhin ein eigenes
Ja braucht:

- **Veröffentlichen.** Der Zweig `gh-pages` und alles, was Jannik seinen
  Freunden schickt. `main` ist der Arbeitsstand, nicht die Auslieferung.
- **Zweige löschen**, auch offensichtlich tote.
- **Geschichte umschreiben** auf `main`: kein `--force`, kein `reset`,
  kein `rebase` eines Standes, der schon oben liegt.
- **Nachrichten nach außen**, die über einen Vorgangskommentar zum
  eigenen Stand hinausgehen.

Die Freigabe gilt, bis Jannik sie zurücknimmt; ein Satz von ihm genügt
dafür.

## 4. Alles steht im Changelog

Jede einzelne Änderung, oben, mit **Warum** und **Messung**. Ein
Changelog-Eintrag ohne Zahl ist eine Behauptung.

*Geprüft:* `werkzeuge/pruefe-arbeitsweise.mjs` verlangt, dass
`CHANGELOG.md` mitgeändert wurde.

Commit-Betreff nach Conventional Commits, mit deutschem Text und richtigen
Umlauten, beispielsweise `refactor: Ordne Prüfungen und Werkzeuge`.
Eine zugehörige Vorgangsnummer ergänzen, wenn für die Änderung eine existiert.

## 5. Workclaim vor dem Schreiben

[WORKCLAIM.md](../WORKCLAIM.md) erst lesen, dann eintragen, dann
schreiben. Fremde Bereiche sind gesperrt.

*Geprüft:* `werkzeuge/pruefe-workclaim.mjs`.

## 6. `spiel/` bleibt browserfrei und deterministisch

Verboten unter `spiel/`: `window`, `document`, `canvas`, `Date`,
`performance`, `Math.random`, `setTimeout`, `requestAnimationFrame`,
`localStorage`. Der Zufall kommt aus `macheZufall` und wird gereicht.

`netz/sitzung.mjs` erhält Sendefunktionen und bleibt transportunabhängig.
Die Adapter in `netz/` dürfen dagegen Browser- und Node-APIs verwenden.

Das ist keine Stilfrage. Daran hängt, ob vier Rechner dieselbe Runde
bitgleich ausrechnen — und damit, ob Internet-Koop überhaupt so billig
ist, wie er hier gebaut ist.

*Geprüft:* `werkzeuge/pruefe-kern.mjs`, Zeile für Zeile, mit Datei und
Zeilennummer im Fehlertext.

## 7. Jede Quelldatei hat eine Kopfnotiz

```
/* [Aufgabe: <Tag>] <ein Satz: was das ist>

   ── Warum es das gibt ──────────────────────────────────────────────

   <Begründung>

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   <welche Dateien, wofür> */
```

Tags: `Regelkern`, `Bild`, `Netz`, `Prüfwesen`, `Oberfläche`, `Werkzeug`.

Der Abschnitt „Arbeitet zusammen mit" ist der wichtigste: Er ist die
einzige Stelle, an der steht, was kaputtgeht, wenn man diese Datei
ändert.

*Geprüft:* `werkzeuge/pruefe-kopfnotiz.mjs`.

## 8. Keine Datei über 1.000 Zeilen, keine Zeile über 100 Zeichen

Eine Datei, die über tausend Zeilen wächst, hat aufgehört, eine Sache zu
sein. Ausnahme für lange Zeichenketten (Sprite-Zeilen, Adressen).

*Geprüft:* `werkzeuge/pruefe-kopfnotiz.mjs`.

## 9. Deutsch, mit echten Umlauten

Bezeichner deutsch. In Texten für Menschen niemals `ae oe ue ss`.
Funktionsnamen dürfen umlautfrei geschrieben werden (`hoehenVorteil`),
weil ein Umlaut im Bezeichner in manchen Werkzeugketten stolpert — ein
Text für Menschen niemals.

*Geprüft:* `werkzeuge/pruefe-sprache.mjs`.

## 10. Jede Prüfung wird zuerst rot gemacht

Den Fehler absichtlich einbauen, anschlagen sehen, zurücknehmen. Eine
Prüfung, die nie rot war, prüft womöglich nichts. Und: **geprüft wird
der Fall, der ohne die Arbeit falsch wäre** — nicht der, der ohnehin
gewinnt.

## 11. Jede Zahl ist gemessen

Nicht geschätzt, nicht aus einem Kommentar übernommen. Steht irgendwo
eine Zahl, gibt es den Befehl, der sie nachrechnet, und er steht daneben.

## 12. Umbau und Inhalt werden getrennt

Ein Umbau ohne sichtbare Änderung lässt sich beweisen (gleiche Eingaben
→ byteweise gleiches Ergebnis, über `zustandsSumme()`); ein Umbau mit
Änderung nicht. Deshalb erst das eine, dann das andere.

## 13. Doku trägt die Begründung, nicht den Stand

Kein „ist live", kein „erledigt", kein Häkchen an einem Plan-Schritt —
das veraltet lautlos und niemand merkt es. Zustandsaussagen gehören in
den Vorgang. Im Dokument stehen sie nur **datiert**: „gemessen am …".

*Geprüft:* `werkzeuge/pruefe-doku-status.mjs`.

## 14. Alle Importpfade sind relativ

Unter `https://kimpaliz.github.io/Hatred/` liegt die Seite in einem
Unterordner. Ein `/runtime/start.js` zeigte dort ins Leere — und zwar
ohne Fehlermeldung im Änderungsvergleich. Das ist der häufigste Grund,
warum ein Spiel daheim läuft und im Netz weiß bleibt.

Ein Prüflauf im Wurzelverzeichnis findet das nie: Dort ist `/runtime/…`
richtig. Der Beweis muss deshalb am Text hängen und nicht am Aufruf.

*Geprüft:* `tests/pruefe-einstieg.mjs` für die Seite selbst und
`tests/pruefe-app.mjs` für den Baum darunter — es verfolgt jeden
`from "…"` vom Einstiegsskript aus, bis nichts Neues mehr kommt, und
schlägt bei jedem Pfad an, der weder mit `./` noch mit `../` beginnt.

**Nicht** `werkzeuge/pruefe-verweise.mjs`. Bis zum 07.09.2026 stand hier
dieser Name, und er war falsch: Jene Datei hält Markdown-Verweise in der
Doku gegen die Platte und sieht keinen einzigen Importpfad. Der Verweis
selbst wird durch `werkzeuge/pruefe-regelwerk.mjs` auf den Rückverweis in
der Kopfnotiz geprüft. Ob der Test die Regel inhaltlich beweist, muss
weiterhin durch Lesen und eine passende Gegenprobe beurteilt werden.

## Die ganze Kette

```bash
node werkzeuge/pruefe-alles.mjs
```

Sie startet Fachprüfungen unter `tests/` und Wächter unter `werkzeuge/`
als eigene Prozesse, auch aus Unterordnern. Nach einem Fehler laufen die
anderen weiter; der Gesamtausgang ist dann 1. Die Arbeitsweiseprüfung läuft
zuletzt. Ein roter Ausgangsstand wird **gemeldet**, nicht überbaut.

Die Bereichsauswahl und Zuordnung stehen in [ENTWICKLUNG.md](ENTWICKLUNG.md),
Dateibesitz und Worktrees in [AGENTEN.md](AGENTEN.md).

## Wer die Nachweise bewacht

Jeder Satz „*Geprüft:*" oben ist eine Behauptung, und sie wird geprüft:
`werkzeuge/pruefe-regelwerk.mjs` hält jeden dieser Verweise gegen die
genannte Datei. Dass es die Datei gibt, genügt nicht — sie muss in ihrer
**Kopfnotiz** die Regelnummer zurückgeben, in der einen Form
`docs/REGELN.md <Nummer>`. Erst diese zweite Unterschrift macht aus dem
Verweis einen Beweis.

Warum die strengere Fassung: Der Fehler unter Regel 14 (bis zum
07.09.2026) hätte eine Prüfung, die bloß nach der Datei fragt, nicht
gestört — `pruefe-verweise.mjs` gibt es ja. Rot wird nur, wer beide
Seiten liest.
