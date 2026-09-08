# Die Regeln dieses Projekts

Kurz in [CLAUDE.md](../CLAUDE.md). Hier steht die Begründung — und
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
| Prüfwesen | `Prüfwesen` | `pruef/…` | `werkzeuge/pruefe-*.mjs`, `werkzeuge/helfer.mjs` |
| Werkzeug | `Werkzeug` | `werk/…` | `werkzeuge/` ohne die Prüfungen — Vorschau, Kartenansicht, Bündler |
| Doku | `Doku` | `doku/…` | `docs/`, alle `*.md` in der Wurzel |

Die **Landschaft** hat bewusst keinen eigenen Zweignamen: Sie ist Teil
des Regelkerns (`spiel/welt-feld.mjs`, `landschaft.mjs`, `bauart.mjs`),
weil ihre Ausgabe eine Spielregel ist und keine Zierde — eine Karte, auf
der der Ausgang nicht erreichbar ist, ist ein unspielbarer Lauf.

Arbeiten mehrere Agenten gleichzeitig, hilft zusätzlich ein Präfix je
Agent (`claude/<thema>`). Das beantwortet aber eine andere Frage — „wer"
statt „was". Wer beides braucht, nimmt `WORKCLAIM.md` für das Wer.

## 3. Nach jeder Änderung wird gefragt

Merge, Push und Veröffentlichung nur auf das ausdrückliche Ja des
Auftraggebers. Kein „ich habe es schon mal nach main gebracht, war ja
klein".

## 4. Alles steht im Changelog

Jede einzelne Änderung, oben, mit **Warum** und **Messung**. Ein
Changelog-Eintrag ohne Zahl ist eine Behauptung.

*Geprüft:* `werkzeuge/pruefe-arbeitsweise.mjs` verlangt, dass
`CHANGELOG.md` mitgeändert wurde.

## 5. Workclaim vor dem Schreiben

[WORKCLAIM.md](../WORKCLAIM.md) erst lesen, dann eintragen, dann
schreiben. Fremde Bereiche sind gesperrt.

*Geprüft:* `werkzeuge/pruefe-workclaim.mjs`.

## 6. `spiel/` und `netz/` kennen keinen Browser

Verboten unter `spiel/`: `window`, `document`, `canvas`, `Date`,
`performance`, `Math.random`, `setTimeout`, `requestAnimationFrame`,
`localStorage`. Der Zufall kommt aus `macheZufall` und wird gereicht.

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

*Geprüft:* `werkzeuge/pruefe-einstieg.mjs` für die Seite selbst und
`werkzeuge/pruefe-app.mjs` für den Baum darunter — es verfolgt jeden
`from "…"` vom Einstiegsskript aus, bis nichts Neues mehr kommt, und
schlägt bei jedem Pfad an, der weder mit `./` noch mit `../` beginnt.

**Nicht** `werkzeuge/pruefe-verweise.mjs`. Bis zum 07.09.2026 stand hier
dieser Name, und er war falsch: Jene Datei hält Markdown-Verweise in der
Doku gegen die Platte und sieht keinen einzigen Importpfad. Der Verweis
selbst wird von nichts geprüft — wer eine Regel für gedeckt hält, weil
hier ein Dateiname steht, muss die Datei aufschlagen.

## Die ganze Kette

```bash
node werkzeuge/pruefe-alles.mjs
```

Sie startet jede `werkzeuge/pruefe-*.mjs` als eigenen Prozess und
beendet sich mit 1, sobald eine rot ist. Ein roter Ausgangsstand wird
**gemeldet**, nicht überbaut.

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
