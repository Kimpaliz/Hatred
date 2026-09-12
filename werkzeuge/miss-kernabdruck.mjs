/* [Aufgabe: Werkzeug] Der Fingerabdruck der **Welt**: eine Prüfzahl über
   die Karten und über jede Rundensumme eines gespielten Laufs.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Das Gegenstück zu `werkzeuge/miss-bildabdruck.mjs`. Jenes beweist,
   dass ein Umbau **das Bild** nicht verändert hat; dieses beweist, dass
   er **das Spiel** nicht verändert hat.

   Der Anlass steht im Changelog vom 12.09.2026: W9 macht das Bild
   feiner und lässt die Welt bei 16 Bildpunkten je Feld. Die Behauptung
   „die Welt ist unberührt" hing zuerst an einem Wegwerfskript außerhalb
   des Projekts — also an einer Zahl ohne Befehl, und das verbietet
   `docs/REGELN.md` 11. Ein Prüfer hat genau das gefunden: Die Prüfzahl
   stand im Changelog, und im ganzen Baum gab es nichts, das sie
   nachrechnet.

   ── Was gemessen wird, und warum genau das ─────────────────────────

   · **Die Karte**, über zwanzig Saaten: `karte.summe()`. Ändert der
     Welterzeuger auch nur einen Bildpunkt seiner Rechnung, springt sie.
   · **Der Lauf**, vierzig Runden je Saat: `zustandsSumme()` nach
     **jeder** Runde, nicht nur am Ende. Zwei Läufe, die sich in Runde 7
     trennen und in Runde 40 zufällig wieder treffen, fielen sonst durch.
   · Gespielt wird über `netz/sitzung.mjs`, mit gewürfelten Aktionen aus
     `moeglicheAktionen` und der echten Gegner-KI — derselbe Weg wie in
     `tests/pruefe-app.mjs`. Ein Fingerabdruck über einen Weg, den das
     Spiel nie geht, bewiese nichts.
   · Der Würfel ist **gesät** (`macheZufall(saat + 77)`), sonst hätten
     zwei Läufe nichts miteinander zu tun.

   Kein Bild: `macheSpiel` wird nicht angefasst. Diese Datei fragt nach
   dem Zustand, und der entsteht ohne Zeichenblatt.

   ── Wie man damit beweist ──────────────────────────────────────────

       node werkzeuge/miss-kernabdruck.mjs > /irgendwo/vorher.txt
       … Umbau in runtime/ …
       node werkzeuge/miss-kernabdruck.mjs > /irgendwo/nachher.txt
       diff /irgendwo/vorher.txt /irgendwo/nachher.txt

   Die Ausgabe gehört **außerhalb** des Projekts (Fehlerbuch C2). Eine
   einzelne Zahl ändert sich absichtlich, sobald jemand an `spiel/`
   arbeitet — dann ist der Unterschied der Gegenstand und kein Fehler.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/lauf.mjs` (`macheLauf`, `zustandsSumme`), `spiel/aktionen.mjs`
   (`moeglicheAktionen` — die eine Liste des Erlaubten),
   `spiel/gegner-ki.mjs` (`planeZug`), `spiel/zug.mjs` (`amZugWesen`),
   `spiel/zufall.mjs` (der gesäte Strom), `netz/sitzung.mjs` (der Weg
   jeder Aktion) und `werkzeuge/miss-bildabdruck.mjs`, das dasselbe für
   das Bild tut. */

import { macheLauf, zustandsSumme } from "../spiel/lauf.mjs";
import { macheSitzung } from "../netz/sitzung.mjs";
import { AKTION, moeglicheAktionen } from "../spiel/aktionen.mjs";
import { amZugWesen, SEITE_JAEGER } from "../spiel/zug.mjs";
import { planeZug } from "../spiel/gegner-ki.mjs";
import { macheZufall } from "../spiel/zufall.mjs";

const SAATEN = 20;
const RUNDEN = 40;
/* Dieselbe Obergrenze wie in `tests/pruefe-app.mjs`: Sie fängt nicht
   einen erwarteten Fall, sondern den, der das Werkzeug wertlos machte —
   eine Schleife, die nie endet, weil eine Sitzung nichts mehr annimmt. */
const SCHRITTE_JE_RUNDE = 200;

function fnv(hash, text) {
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

const hex = (zahl) => zahl.toString(16).padStart(8, "0");

/* Der Spieler würfelt aus `moeglicheAktionen` — der einen Liste des
   Erlaubten. Der Trank ist die einzige Ausnahme: Ohne ihn fällt der
   einzelne Jäger, lange bevor vierzig Runden voll sind. */
function spielerAktion(zustand, wesen, zufall) {
  const moeglich = moeglicheAktionen(zustand, wesen);
  if (moeglich.length === 0) return { typ: AKTION.zugEnde, wer: wesen.id };
  if (wesen.lp * 2 <= wesen.lpMax) {
    const trank = moeglich.find((a) => a.typ === AKTION.trank);
    if (trank) return trank;
  }
  return zufall.ausListe(moeglich);
}

let gesamt = 2166136261 >>> 0;
for (let saat = 1; saat <= SAATEN; saat++) {
  const zustand = macheLauf({ saat, spielerZahl: 1, tiefe: 1 });
  const sitzung = macheSitzung({
    istGastgeber: true, zustand, sendeAn() {}, alleSenden() {}
  });
  const zufall = macheZufall(saat + 77);
  const summen = [zustandsSumme(zustand)];
  let letzte = zustand.runde;
  let schritte = 0;
  while (summen.length <= RUNDEN && !zustand.vorbei) {
    if (++schritte > RUNDEN * SCHRITTE_JE_RUNDE) break;
    const dran = amZugWesen(zustand);
    if (!dran) break;
    const aktion = dran.seite === SEITE_JAEGER
      ? spielerAktion(zustand, dran, zufall)
      : (planeZug(zustand, dran)[0] || { typ: AKTION.zugEnde, wer: dran.id });
    if (!sitzung.willAktion(aktion)) {
      sitzung.willAktion({ typ: AKTION.zugEnde, wer: dran.id });
    }
    if (zustand.runde !== letzte) {
      letzte = zustand.runde;
      summen.push(zustandsSumme(zustand));
    }
  }
  const gespielt = summen.length - 1;
  const ausgang = zustand.vorbei ? `vorbei: ${zustand.vorbei}` : "offen";
  gesamt = fnv(gesamt, summen.join(","));
  console.log(`Saat ${String(saat).padStart(2)}: Karte ${zustand.karte.summe()}  `
    + `${String(gespielt).padStart(2)} Runden  letzte Summe ${summen[summen.length - 1]}  `
    + ausgang);
}
console.log(`Prüfzahl über alle Rundensummen: ${hex(gesamt)}`);
