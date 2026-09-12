# Zusammen spielen — wie ihr euch findet

Für Jannik. Ohne Fachwörter; wo eines nötig ist, steht die Übersetzung
daneben.

## Das Problem in drei Sätzen

Dein Rechner steht bei dir, der deines Freundes bei ihm. Keiner von
beiden weiß, wo der andere ist — im Internet hat niemand eine
Hausnummer, die einfach so bekannt wäre. Sie müssen sich **einmal**
finden; danach reden sie direkt miteinander, und niemand steht mehr
dazwischen.

Dieses „einmal finden" heißt hier **Vermittlung**. Es gibt zwei Wege
dafür, und sie kosten Verschiedenes. Diese Seite sagt dir ehrlich, was.

## Warum das Spiel keinen Spielserver braucht

Ein Spielserver wäre ein fremder Rechner, der immer läuft, jeden Zug
sieht und jeden Monat Geld kostet. **Hatred** braucht ihn nicht, und
das hat einen technischen Grund, den man in einem Satz sagen kann:

> Jeder Rechner rechnet die Runde selbst aus, und alle kommen auf
> dasselbe Ergebnis.

Deshalb muss über die Leitung nicht der Spielstand gehen, sondern nur
die **Absicht**: „Figur 3 geht auf Feld 12/8." Das sind ein paar Dutzend
Zeichen je Zug. Alles Weitere — wie hoch der Schaden war, wer gestürzt
ist, was man sieht — rechnet jeder Rechner selbst, und weil alle
dieselbe Rechnung machen, sehen alle dasselbe.

Das ist der Grund, warum ihr zu viert über das Internet spielen könnt,
ohne dass jemand einen Dienst bezahlt.

---

## Weg 1 — Der Einladungscode zum Kopieren

**Braucht: nichts.** Kein Konto, kein Kennwort, kein Programm, kein
Dienst. Nur euren Chat, in dem ihr euch ohnehin schreibt.

So läuft es zu zweit:

1. Du eröffnest die Runde. Das Spiel zeigt dir einen langen Code.
2. Du kopierst ihn und schickst ihn deinem Freund — Chat, Mail, egal.
3. Er fügt ihn bei sich ein. Sein Spiel zeigt ihm daraufhin einen
   **zweiten** Code, den Antwortcode.
4. Er schickt dir den zurück, du fügst ihn ein.
5. Ihr seid verbunden. Ab hier läuft nichts mehr über den Chat.

**Was es dich an Mühe kostet.** Zwei Kopiervorgänge je Mitspieler:
einer hin, einer zurück. Zu zweit sind das zwei, zu viert **sechs** —
du machst das mit jedem Freund einmal. Das ist der ehrliche
Schwachpunkt dieses Weges: Er ist zu zweit angenehm und zu viert
umständlich.

**Wie lang so ein Code ist.** Er ist lang genug, dass man ihn nicht
abtippt, und kurz genug, dass man ihn in einen Chat klebt: Bei einer
Netzkarte im Rechner sind es 274 Zeichen, bei dreien 499 (gemessen am
06.09.2026). Nachrechnen kannst du das jederzeit selbst:

```bash
node tests/pruefe-leitung.mjs
```

Dort steht die Zeile „eine Netzkarte: … Zeichen roh → … als Code".
Roh — also ohne die Verkürzung, die das Spiel einbaut — wären es 550
Zeichen gewesen, und ohne den eingebauten Wortvorrat sogar 752, also
mehr als der Rohtext. Genau deshalb gibt es den Vorrat.

**Wenn beim Kopieren etwas schiefgeht.** Ein Chatfenster bricht lange
Zeilen um, und beim Markieren fehlt gern das letzte Zeichen. Der Code
merkt das: Er trägt eine Prüfzahl am Ende. Es kommt dann „Der Code ist
verfälscht — bitte noch einmal ganz kopieren" auf den Bildschirm, und
nicht etwa eine halb gelesene Verbindung, bei der ihr euch nachher
wundert. Zeilenumbrüche und Leerzeichen im Code sind dagegen egal —
die wirft das Spiel selbst weg.

---

## Weg 2 — Ein eigener Vermittler

**Braucht: dass einer von euch ein kleines Programm laufen lässt.**

Der Vermittler ist ein schwarzes Brett mit Fächern. Der Gastgeber
pinnt seinen Zettel an ein Fach, der Gast holt ihn ab und pinnt seine
Antwort daneben. Mehr passiert dort nicht.

Bei dem, der ihn laufen lässt:

```bash
node netz/broker.mjs 7788
```

Danach steht auf seinem Bildschirm, unter welcher Adresse er
erreichbar ist. Die tragt ihr im Spiel ein — einmal, dann findet euch
das Spiel von allein, ohne Kopieren.

**Was es kostet.**

- Der Rechner, auf dem er läuft, muss **erreichbar** sein, solange ihr
  euch verbindet. Sitzt ihr im selben Heimnetz, ist das ohne Weiteres
  so. Über das Internet muss in seinem Router ein Tor geöffnet werden
  (in Routern heißt das „Portfreigabe"). Das ist einmalige Handarbeit
  und der eigentliche Preis dieses Weges.
- Danach darf er wieder aus. Vermittelt wird nur beim Verbinden.

**Was der Vermittler speichert.** Je Fach den einen Zettel, ein paar
hundert Zeichen, für fünf Minuten. Danach wirft er ihn weg. Keine
Namen, keine Spielstände, keine Liste, wer wann gespielt hat — es gibt
gar keinen Ort, an dem so etwas stünde.

**Was er nicht sieht.** Euer Spiel. Kein Zug läuft über ihn. Er ist
das Telefonbuch, nicht die Leitung.

---

## Der ehrliche Haken, den beide Wege teilen

Dein Router versteckt deinen Rechner vor dem Internet — das ist seine
Aufgabe, und es ist gut so. Deshalb weiß dein Rechner selbst oft gar
nicht, unter welcher Adresse er von außen erreichbar ist.

Um das herauszufinden, fragen Programme üblicherweise einen fremden
Rechner: „Unter welcher Adresse siehst du mich gerade?" So ein Helfer
heißt in der Fachsprache **STUN-Server**; nenn ihn Adresshelfer.

**Hatred fragt von sich aus keinen.** Die Liste der Adresshelfer ist im
Spiel absichtlich leer. Das heißt:

| Wo ihr sitzt | geht es ohne Adresshelfer? |
| --- | --- |
| Zwei Rechner im selben WLAN | ja |
| Zwei Wohnungen, verschiedene Anschlüsse | in aller Regel nein |

Das ist keine Vergesslichkeit, sondern deine Entscheidung. Ein
Adresshelfer ist ein **fremder** Rechner, der beim Verbinden erfährt,
welche Internetadresse du gerade hast. Er sieht nichts vom Spiel, keine
Namen und keine Züge — aber er ist ein Fremder in einem Ablauf, der
sonst keinen kennt. Ob **Hatred** einen fragen darf, gehört dir und
steht als offene Frage 8.1 in [SPIEL.md](SPIEL.md). Wir beantworten sie
hier nicht.

Wenn du sie beantwortest, ist die Änderung klein: Es ist eine Liste von
Adressen, die das Spiel beim Verbinden mitbekommt, und sie steht an
genau einer Stelle.

---

## Der dritte Weg — und warum er dir gehört

Am bequemsten wäre ein Vermittler, der dauerhaft im Netz steht: Ihr
tippt einen kurzen Runden-Code ein, und mehr ist nicht zu tun. Kein
Kopieren, kein Router, kein Programm bei einem von euch.

Der Preis dafür ist, dass zur Spielzeit ein Dienst läuft, den jemand
betreiben muss. Ob und wo das sein soll, ist eine Entscheidung, die dir
gehört. Sie steht als Frage 8.1 in [SPIEL.md](SPIEL.md); die Überlegungen
dazu sind in [PROJEKTGRENZE.md](PROJEKTGRENZE.md) aufgeschrieben. Weg 1
und Weg 2 hängen nicht davon ab — sie funktionieren so oder so, und
beide führen zum selben Spiel.

---

## Was in keinem der Wege passiert

- Kein Konto, keine Anmeldung, kein Kennwort.
- Keine Datenbank, in der etwas über euch stünde.
- Keine Bestenliste über das Netz, keine Freundesliste, kein Chat.
- Kein Zug, der über einen fremden Rechner läuft.

## Wenn es hakt — was der Satz auf dem Bildschirm bedeutet

| Was dasteht | Was du tun kannst |
| --- | --- |
| „Der Code ist verfälscht — bitte noch einmal ganz kopieren." | Beim Markieren fehlt ein Stück. Vom ersten bis zum letzten Zeichen kopieren. |
| „Der Code stammt aus Fassung … , dieses Spiel spricht Fassung …" | Ihr habt verschiedene Stände des Spiels. Beide denselben nehmen. |
| „Es hat sich niemand gemeldet." | Der andere hat seinen Teil noch nicht eingefügt, oder der Vermittler ist nicht erreichbar. |
| „Der Vermittler unter … antwortet nicht." | Das Programm bei deinem Freund läuft nicht, oder die Adresse stimmt nicht. |
| „Die beiden Rechner haben sich nicht erreicht." | Das ist der Haken oben: ohne Adresshelfer über zwei Anschlüsse hinweg. |
| „Dieses Programm kann keine direkte Verbindung aufbauen." | Der Browser ist zu alt. Ein aktueller Firefox, Chrome oder Edge kann es. |

## Für den, der es genauer wissen will

| Frage | Datei |
| --- | --- |
| Wie der Einladungscode gebaut und geprüft wird | `netz/vermittler.mjs` |
| Das kleine Programm für Weg 2 | `netz/broker.mjs` |
| Die Leitung selbst — aufbauen, senden, schließen | `netz/verbindung.mjs` |
| Wer beim Spiel Schiedsrichter ist | `netz/sitzung.mjs` |
| Alle Zahlen dieser Seite nachrechnen | `tests/pruefe-leitung.mjs` |
