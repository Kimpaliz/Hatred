/* [Aufgabe: Regelkern] Die Höhenregeln — was ein Schritt kostet, wer
   stürzt, wer über wen hinwegsieht und wer in Deckung steht.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   `gitter.mjs` speichert die Ebene jedes Feldes, sagt aber nichts
   darüber, was sie bedeutet. Das steht hier, an **einer** Stelle.
   Bewegung, Wegfindung, Kampf, Gegner-KI und das Bild stellen dieselben
   zwei Fragen — „darf ich dorthin?" und „sehe ich dorthin?" — und wenn
   jedes Modul sich die Antwort selbst zusammenrechnet, laufen die
   Antworten auseinander. Genau das darf nicht passieren: Vier Rechner
   spielen dieselbe Runde nach (siehe `zufall.mjs`), und eine Regel, die
   an zwei Stellen leicht verschieden steht, ist ein Auseinanderlaufen
   mit Ansage.

   **Rampen liegen auf dem tieferen Feld und zeigen hinauf.** Das ist
   die Stelle, an der man sich am ehesten vertut, deshalb der Grund:
   Der Aufstieg gehört dem, der unten steht — er sieht die Rampe vor
   sich und zahlt dafür. Läge sie auf dem oberen Feld, müsste jeder
   Blick von unten das Nachbarfeld befragen, und ein einziges
   Rampenfeld könnte für vier Anstiege zugleich gelten. Hinab geht es
   dagegen überall: Von oben auf ein Rampenfeld zu treten ist ein
   gewöhnlicher Abstieg für einen Punkt, keine Rampenbenutzung.

   **Ein Sturz kostet einen Punkt und nimmt danach alle übrigen.** Ein
   Sturz ist kein Weg, den jemand geht, sondern etwas, das ihm zustößt —
   meistens durch einen Stoß. Wäre er in Punkten teuer, könnte man
   niemanden mehr in den Graben stoßen, dem die Punkte fehlen. Wehtun
   soll er in Lebenspunkten. Die erste Stufe ist frei, weil ein Schritt
   hinab kein Sturz ist; gezählt wird, was darunter liegt.

   **Sicht rechnet mit dem Höheren von Auge und Ziel.** So sieht man von
   einem Plateau über niedrige Kanten hinweg, und wer im Graben steht,
   sieht fast nichts — ohne dafür ein zweites Sichtsystem zu brauchen.
   Wer oben steht, sieht auch weiter hinunter als umgekehrt: Das ergibt
   sich von selbst, weil dieselbe Kante in der einen Richtung unter der
   Augenhöhe liegt und in der anderen darüber.

   **Deckung zählt nur in Angreiferrichtung.** Ein Fass hinter dem Ziel
   nützt dem Ziel nichts. Gedeckt ist das Feld, das zwischen Ziel und
   Angreifer liegt — und weil in diesem Spiel nur in vier Richtungen
   gegangen wird, ist das genau ein Nachbarfeld (bei einem Angreifer
   exakt über Eck: die beiden Felder dieser Ecke).

   Alles hier ist reine Rechnerei auf der Karte: keine Figuren, keine
   Aktionspunkte, kein Zufall. Ob auf dem Zielfeld schon jemand steht,
   weiß dieses Modul nicht und darf es nicht wissen — das prüft, wer
   Figuren führt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/gitter.mjs` (liefert Ebene, Hindernis, Flüssigkeit, Rampe),
   `spiel/wegfindung.mjs` (`laufKosten` je Schritt),
   `spiel/sicht.mjs` (`blocktSichtlinie` je Zwischenfeld der Bresenham-
   Linie), `spiel/aktionen.mjs` und `spiel/kampf.mjs` (Sturz, Stoß,
   Deckung, Höhenvorteil), `spiel/landschaft.mjs` (setzt Rampen so, dass
   `begehbar` überhaupt hinauf lässt), `runtime/zeichnen.js` (zeigt
   dieselben Kanten, die hier blocken). */

import {
  abstand, nachbarn, richtungen, alsWuerfel, RAMPE, FLUESSIG
} from "./gitter.mjs";

/* Die Preise. Sie stehen als Zahlen hier und nicht in einer
   Einstellungsdatei, weil jede Änderung daran eine Regeländerung ist:
   Sie gehört in den Changelog, nicht in ein Menü. */
export const GEHEN_KOSTEN = 1;
export const AUFSTIEG_KOSTEN = 2;
export const WASSER_ZUSCHLAG = 1;

/* Ab zwei Ebenen Unterschied ist es ein Sturz. Ein Schritt hinab ist
   keiner — sonst wäre jede Kante im Kerker eine Wunde. */
export const STURZ_AB_STUFEN = 2;
export const STURZ_SCHADEN_JE_STUFE = 3;
export const LAVA_SCHADEN = 8;

/* Kampfwirkung der Höhe. Der Trefferbonus gilt in beide Richtungen,
   der Reichweitenbonus nur nach oben — wer tiefer steht, schießt nicht
   kürzer, er trifft nur schlechter. */
export const HOEHEN_TREFFER_BONUS = 0.12;
export const HOEHEN_REICHWEITE_BONUS = 1;
export const DECKUNG_MALUS = 0.20;

/* Der Schritt von (vx,vy) nach (nx,ny) als eine der vier Richtungen —
   oder `null`, wenn das kein einzelner gerader Schritt ist. Diagonalen
   und Sprünge über mehrere Felder fallen hier heraus, damit sie nicht
   weiter unten aus Versehen billig werden. */
function schrittRichtung(vx, vy, nx, ny) {
  for (const r of richtungen(vy)) {
    if (vx + r.dx === nx && vy + r.dy === ny) return r;
  }
  return null;
}

/* Darf jemand von (vx,vy) nach (nx,ny) treten? Ohne Rücksicht darauf,
   ob er die Punkte dafür hat oder ob dort schon jemand steht. */
export function begehbar(karte, vx, vy, nx, ny) {
  const richtung = schrittRichtung(vx, vy, nx, ny);
  if (!richtung) return false;
  if (!karte.drin(vx, vy)) return false;
  /* Außerhalb der Karte gilt als Wand — `blocktBewegung` erledigt das
     mit, deshalb steht hier keine zweite Randprüfung. */
  if (karte.blocktBewegung(nx, ny)) return false;

  const von = karte.ebeneBei(vx, vy);
  const nach = karte.ebeneBei(nx, ny);
  if (von < 0 || nach < 0) return false;

  const unterschied = nach - von;
  if (unterschied <= 0) return true;      /* eben oder hinab: immer     */
  if (unterschied > 1) return false;      /* zwei Stufen klettert keiner */
  /* Hinauf nur über die Rampe des **tieferen** Feldes, und nur, wenn
     sie in die Laufrichtung zeigt. */
  return karte.rampeBei(vx, vy) === richtung.rampe;
}

/* Was der Schritt an Aktionspunkten kostet — `null`, wenn er gar nicht
   geht. `null` und nicht `Infinity`, damit ein vergessener Test nicht
   als „unendlich teuer, aber erlaubt" durchrutscht. */
export function laufKosten(karte, vx, vy, nx, ny) {
  if (!begehbar(karte, vx, vy, nx, ny)) return null;
  const hinauf = karte.ebeneBei(nx, ny) > karte.ebeneBei(vx, vy);
  let kosten = hinauf ? AUFSTIEG_KOSTEN : GEHEN_KOSTEN;
  /* Nur Wasser bremst. Lava bremst nicht — sie verbrennt, und das
     kostet Leben statt Punkte. */
  if (karte.fluessigBei(nx, ny) === FLUESSIG.wasser) kosten += WASSER_ZUSCHLAG;
  return kosten;
}

/* ── Die Sturzregel des Abgrunds ────────────────────────────────────

   **Ein Abgrundfeld (`HINDERNIS.abgrund`) trägt in der Reihe `ebene`
   die Ebene seiner SOHLE — nicht die des Randes, auf dem man davor
   steht.** Diese Festlegung gehört hierher, weil die beiden Funktionen
   direkt darunter von ihr leben.

   Warum so: `sturzTiefe` rechnet die Differenz zweier Ebenen, und
   `sturzSchaden` rechnet mit dieser Differenz weiter. Trüge das Loch
   die Ebene seines Randes, wären beide Ebenen gleich, die Differenz
   0 — und ein Sturz in den Abgrund täte **keinen** Schaden. Um das zu
   heilen, müsste jede Aufrufstelle eine Sonderrechnung „wenn Abgrund,
   dann so-und-so-viel tiefer als hier" bekommen. Genau solche über
   vier Dateien verstreuten Sonderfälle sind es, an denen zwei Rechner
   auseinanderlaufen. Steht die Sohle in der Reihe, rechnen beide
   Funktionen hier **unverändert** richtig: Rand auf Ebene 3, Sohle auf
   Ebene 1 ergibt zwei Stufen und damit 3 Schaden.

   Die zweite Wirkung ist ebenso gewollt: Wer hineingestoßen wird,
   landet auf der Sohle — „eine Ebene tiefer" ist keine gesonderte
   Zahl, die irgendwo gepflegt werden müsste, sondern steht auf dem
   Feld. Und `ebene` ist eine der fünf Reihen, die `karte.summe()`
   hasht; die Sohle fällt also nicht aus der Desync-Erkennung heraus,
   wie es eine Nebenliste „Sohlentiefen" täte.

   Wohin ein Gestoßener am Ende kommt und was ein Sturz ohne tiefere
   Ebene bedeutet, entscheidet nicht dieses Modul — hier steht nur, wie
   tief es geht und was das kostet. */

/* Wie viele Ebenen es bei diesem Wechsel hinabgeht, wenn es ein Sturz
   ist — sonst 0. Fragt bewusst **nicht**, ob der Schritt erlaubt wäre:
   Gestoßen wird auch dorthin, wohin niemand freiwillig ginge.
   Außerhalb der Karte ist die Ebene -1; das ist kein Sturz aus großer
   Höhe, sondern gar kein Feld. */
export function sturzTiefe(karte, vx, vy, nx, ny) {
  const von = karte.ebeneBei(vx, vy);
  const nach = karte.ebeneBei(nx, ny);
  if (von < 0 || nach < 0) return 0;
  const tiefe = von - nach;
  return tiefe >= STURZ_AB_STUFEN ? tiefe : 0;
}

/* Schaden zu einer Sturztiefe. Die erste Stufe ist frei: Ein Sturz über
   zwei Ebenen tut 3, über drei 6. */
export function sturzSchaden(stufen) {
  if (!Number.isFinite(stufen) || stufen < STURZ_AB_STUFEN) return 0;
  return (stufen - 1) * STURZ_SCHADEN_JE_STUFE;
}

/* +1 = der Angreifer steht höher, -1 = tiefer, 0 = gleich. */
export function hoehenVorteil(karte, ax, ay, zx, zy) {
  const angreifer = karte.ebeneBei(ax, ay);
  const ziel = karte.ebeneBei(zx, zy);
  if (angreifer < 0 || ziel < 0) return 0;
  if (angreifer > ziel) return 1;
  if (angreifer < ziel) return -1;
  return 0;
}

/* Die beiden Wirkungen des Vorteils, damit `kampf.mjs` die Zahlen nicht
   selbst zusammensetzt — besonders die Unsymmetrie ist leicht falsch
   gebaut: nach oben +1 Reichweite, nach unten aber keine Strafe. */
export function trefferBonus(vorteil) {
  return vorteil * HOEHEN_TREFFER_BONUS;
}

export function reichweitenBonus(vorteil) {
  return vorteil > 0 ? HOEHEN_REICHWEITE_BONUS : 0;
}

/* Blockt das **Zwischenfeld** (zx,zy) eine Sichtlinie, deren Auge auf
   `augenEbene` und deren Ziel auf `zielEbene` steht? `sicht.mjs` legt
   die Bresenham-Linie und fragt hier je Feld dazwischen; Start- und
   Zielfeld werden nicht gefragt, sonst sähe niemand aus dem eigenen
   Türrahmen heraus. */
export function blocktSichtlinie(karte, zx, zy, augenEbene, zielEbene) {
  if (!karte.drin(zx, zy)) return true;
  if (karte.blocktSicht(zx, zy)) return true;
  /* Gleich hoch blockt nicht: Man sieht über die Kante, auf der man
     selbst steht. Erst was **höher** ist als beide Enden, steht im Weg. */
  return karte.ebeneBei(zx, zy) > Math.max(augenEbene, zielEbene);
}

/* Steht auf dem Feld zwischen Ziel und Angreifer etwas, das halbe
   Deckung gibt?

   ── Warum das seit dem Sechseck einfacher ist ──────────────────────

   Bis zum 07.09.2026 stand hier eine Fallunterscheidung: Ein Feld,
   wenn der Angreifer gerade davor steht, zwei Felder, wenn er „exakt
   über Eck" steht — die Schusslinie streift dann beide. Das war die
   Sonderregel, die das Quadratraster erzwingt, weil seine Diagonale
   keine Nachbarschaft ist.

   Auf dem Sechseck gibt es keine Ecke. Gefragt wird jetzt geradeheraus:
   **Welche Nachbarn des Ziels liegen näher am Angreifer als das Ziel
   selbst?** Bei einem Angreifer geradeaus ist das genau einer, bei
   einem zwischen zwei Richtungen sind es zwei — dieselbe Wirkung wie
   vorher, aber als Folge der Geometrie statt als Sonderfall.

   Und vor allem: Es rechnet mit `nachbarn` statt mit `Math.sign`. Die
   alte Fassung zeigte auf dem Sechseck auf Felder, die vom Ziel aus gar
   keine Nachbarn sind — sie fand Deckung hinter Dingen, die nicht im
   Weg standen, und übersah welche, die es waren. */
export function hatDeckung(karte, ax, ay, zx, zy) {
  if (ax === zx && ay === zy) return false;
  const weit = abstand(zx, zy, ax, ay);

  for (const n of nachbarn(karte, zx, zy)) {
    if (abstand(n.x, n.y, ax, ay) >= weit) continue;
    /* `gibtDeckung` kennt Fass, Kiste, Altar und dergleichen; Wand und
       Säule stehen dort nicht drin, decken aber selbstverständlich —
       deshalb die zweite Frage. */
    if (karte.gibtDeckung(n.x, n.y) || karte.blocktSicht(n.x, n.y)) return true;
  }
  return false;
}

/* Wohin die Rampe auf (x,y) hinaufführt — `null`, wenn dort keine
   liegt. Als Schrittvektor, damit der Aufrufer nicht die Schlüssel aus
   `RAMPE` auseinanderhalten muss. */
export function rampeZeigtNach(karte, x, y) {
  const wert = karte.rampeBei(x, y);
  if (wert === RAMPE.keine) return null;
  for (const r of richtungen(y)) {
    if (r.rampe === wert) return { dx: r.dx, dy: r.dy };
  }
  return null;
}

/* Was das Betreten dieses Feldes sofort anrichtet. Bisher nur Lava; die
   Form ist trotzdem ein Objekt und kein nackter Zahlenwert, damit ein
   späteres Gift oder Öl hier hineinpasst, ohne jeden Aufrufer zu
   ändern. `art` ist der Schadensschlüssel aus dem Ereignis `schaden`. */
export function betretenSchaden(karte, x, y) {
  if (karte.fluessigBei(x, y) !== FLUESSIG.lava) return null;
  return { wieviel: LAVA_SCHADEN, art: "feuer" };
}

/* Welche der sechs Richtungen vom Ziel **weg** vom Angreifer zeigt —
   `null`, wenn der Angreifer zwischen zwei Richtungen steht oder auf
   dem Ziel selbst.

   ── Warum in Würfelkoordinaten ─────────────────────────────────────

   Bis zum 07.09.2026 stand hier `Math.abs`/`Math.sign` über die
   Versatzzeilen — eine Quadratrechnung, die aus der Zeit vor dem
   Sechseck übrig war. Gemessen über alle sechs Richtungen auf beiden
   Zeilenparitäten traf sie **4 von 12**: Ost und West stimmen, weil
   sie in derselben Zeile bleiben; die vier schrägen Richtungen landeten
   auf dem falschen Feld oder gaben `null`. Wer in Zeile 6 nach Südwest
   stieß, stieß ins Leere — auf einer geraden Zeile liegt der Südost-
   Nachbar bei `(0, +1)`, auf einer ungeraden bei `(+1, +1)`, und davon
   weiß `Math.sign` nichts.

   In Würfelkoordinaten ist „liegt auf derselben Achse" dagegen eine
   Multiplikation: Der Schritt in Richtung k, `weit` mal genommen, muss
   genau den Angreifer treffen. Die Gegenrichtung ist `(k + 3) % 6` —
   dieselbe Vorschrift wie in `kachelhilfe.gegen`.

   Ein Angreifer **mehrere** Felder entfernt zählt mit, solange er auf
   der Achse steht: Ein Schub über zwei Felder (`hakenkette`) schiebt
   beim zweiten Schritt von einem Punkt aus, der längst kein Nachbar
   mehr ist. */
function stossRichtung(ax, ay, zx, zy) {
  const weit = abstand(ax, ay, zx, zy);
  if (weit < 1) return null;                   /* auch: Angreifer auf dem Ziel */
  const a = alsWuerfel(ax, ay);
  const z = alsWuerfel(zx, zy);
  const hier = richtungen(zy);
  for (let k = 0; k < 6; k++) {
    const n = alsWuerfel(zx + hier[k].dx, zy + hier[k].dy);
    if (a.wx - z.wx === (n.wx - z.wx) * weit && a.wz - z.wz === (n.wz - z.wz) * weit) {
      return hier[(k + 3) % 6];
    }
  }
  return null;
}

/* Das Feld, auf das ein Stoß das Ziel schiebt: ein Feld vom Angreifer
   weg. `null`, wenn dort nichts hingeht — Wand, Kartenrand oder eine
   Kante, die man nicht hinaufgeschoben werden kann. Hinab geht immer;
   dass das ein Sturz wird, beantwortet `sturzTiefe`. */
export function stossZiel(karte, ax, ay, zx, zy) {
  const weiter = stossRichtung(ax, ay, zx, zy);
  if (!weiter) return null;
  const nx = zx + weiter.dx, ny = zy + weiter.dy;
  if (!begehbar(karte, zx, zy, nx, ny)) return null;
  return { x: nx, y: ny };
}

/* ── Der Stoß in den Abgrund ────────────────────────────────────────

   Liegt hinter dem Ziel ein Loch, dann sagt `stossZiel` `null` — es
   fragt `begehbar`, und `begehbar` fragt `blocktBewegung`, und dort
   steht der Abgrund seit dem 07.09.2026 drin. Genau so soll es sein:
   Wegfindung, Gegner-KI und Bild fragen `stossZiel`, und keines von
   ihnen darf einen Abgrund plötzlich für ein Zielfeld halten.

   Deshalb steht die zweite Frage **neben** `stossZiel` und nicht
   darin: Wer den Sturz will, fragt ausdrücklich danach. `stossZiel`
   bleibt Wort für Wort, wie es war — sonst änderten sich Wegfindung
   und KI stillschweigend mit. */

/* Das Feld hinter dem Ziel, **wenn dort ein Abgrund liegt** — sonst
   `null`. Dieselbe Sechseckrichtung wie `stossZiel`, dieselbe eine
   Vorschrift (`stossRichtung`); eine zweite Richtungsrechnung wäre die
   Naht, an der Stoß und Sturz eines Tages verschiedene Felder meinen. */
export function abgrundHinter(karte, ax, ay, zx, zy) {
  const weiter = stossRichtung(ax, ay, zx, zy);
  if (!weiter) return null;
  const nx = zx + weiter.dx, ny = zy + weiter.dy;
  if (!karte.istAbgrund(nx, ny)) return null;
  return { x: nx, y: ny };
}

/* ── Wohin ein Sturz in den Abgrund führt ───────────────────────────

   **Die Figur landet nicht im Loch, sondern auf dem Boden, den das
   Loch freilegt** — auf einer offenen Nachbarkachel des Abgrunds, die
   auf seiner Sohlenebene liegt. Das ist eine Entscheidung, und sie
   hat einen Grund:

   Der Abgrund steht in `BLOCKT_BEWEGUNG`. Eine Figur, die **auf** dem
   Abgrundfeld stünde, stünde auf einer Kachel, die `wegSuche`,
   `erreichbareFelder` und `naechstesFreiesFeld` nie betreten — sie
   käme dort nie wieder heraus, und keine Prüfung schlüge an, weil der
   Zustand für sich genommen gültig ist. Das wäre eine Falle mit
   Aussicht, und `erreichbarkeit.mjs` steht ausdrücklich dafür da, dass
   es die nicht gibt.

   Die Sohle als **Nachbarkachel** löst das ohne einen einzigen
   Sonderfall im übrigen Kern: Die Figur steht danach auf einer ganz
   gewöhnlichen offenen Kachel, eine Ebene oder mehr tiefer, und geht
   von dort aus weiter wie jede andere. Der Schaden kommt aus
   `sturzTiefe`/`sturzSchaden` — dieselben zwei Funktionen wie beim
   Stoß über die Kante, nicht eine zweite Sturzregel.

   **Gibt es keine solche Kachel, ist der Sturz tödlich.** Das ist die
   zweite Hälfte von Janniks Abnahme („oder stirbt, wenn es keine
   gibt"): ein Loch ohne Grund. `spiel/landschaft.mjs` gräbt nur
   Abgründe mit Grund; bodenlose entstehen von Hand — und die Regel
   dafür steht trotzdem hier, an **einer** Stelle.

   `vonEbene` ist die Ebene, von der aus gefallen wird. Sie steht als
   eigener Wert und nicht als Vorgabe im Kopf der Funktion, weil ein
   vergessenes Argument sonst lautlos 0 Schaden ergäbe — und ein Sturz
   ohne Schaden fiele niemandem auf.

   Welche Nachbarkachel es wird, wenn mehrere in Frage kommen:
   **die erste in der Reihenfolge aus `richtungen(y)`**. Nicht die
   nächste, nicht die beste — eine feste Reihenfolge, sonst wählen
   zwei Rechner verschieden (Fehlerbuch B2). */
export function abgrundSturz(karte, x, y, vonEbene) {
  if (!karte.istAbgrund(x, y)) return null;
  const sohle = karte.ebeneBei(x, y);
  let ziel = null;
  for (const r of richtungen(y)) {
    const nx = x + r.dx, ny = y + r.dy;
    if (karte.blocktBewegung(nx, ny)) continue;
    if (karte.ebeneBei(nx, ny) !== sohle) continue;
    ziel = { x: nx, y: ny };
    break;
  }
  const tiefe = Number.isFinite(vonEbene) && vonEbene > sohle ? vonEbene - sohle : 0;
  const stufen = tiefe >= STURZ_AB_STUFEN ? tiefe : 0;
  return { sohle, ziel, stufen, schaden: sturzSchaden(stufen), toedlich: ziel === null };
}
