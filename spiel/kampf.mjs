/* [Aufgabe: Regelkern] Der Kampf — Trefferchance, Reichweite,
   Schadenswurf, Rüstung und der ganze Ablauf eines Angriffs.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Über die Leitung geht „Wesen 3 greift Wesen 7 mit dem Langbogen an",
   und alle vier Rechner rechnen daraus **selbst** dieselben Ereignisse.
   Das geht nur, wenn es genau **eine** Stelle gibt, an der ein Angriff
   ausgerechnet wird. Deshalb steht in den Waffen keine Zeile Rechnung
   (`spiel/katalog/waffen.mjs` ist ein Stapel Zettel), in den Höhen nur
   die Geländeregeln (`spiel/hoehen.mjs`) — und hier alles, was daraus
   ein Ergebnis macht.

   **Warum die Trefferchance eine Summe ist und kein Produkt.** Vier
   Dinge gehen hinein: der Treffergrund der Waffe, der Höhenvorteil, die
   Deckung des Ziels und dessen Ausweichen. Als Produkt („90 % davon 80 %
   davon…") wäre jede einzelne Zahl für sich nicht mehr lesbar: Ob 20 %
   Deckung viel sind, hinge davon ab, was vorher schon abgezogen wurde.
   Als Summe steht in jeder Zeile derselbe Satz — „Deckung nimmt zwanzig
   Punkte weg" —, und der Spieler kann im Kopf mitrechnen. Das ist bei
   einem rundenbasierten Spiel keine Kleinigkeit: Er sitzt vor der
   Entscheidung, ob sich der Schritt aufs Podest lohnt, und muss sie
   ausrechnen können, ohne die Regel zu kennen.

   **Warum 5 % und 95 % die Grenzen sind.** Ohne Untergrenze gäbe es
   Stellungen, aus denen ein Angriff rechnerisch unmöglich ist — und
   dann steht der Spieler ratlos vor einer Aktion, die nichts tut.
   Ohne Obergrenze gäbe es den sicheren Treffer, und damit wäre jede
   Deckung, jede Flinkheit und jedes Ausweichen wertlos, sobald einer
   genug Boni sammelt. Beide Grenzen sind auch der Grund, warum
   `werkzeuge/pruefe-kampf.mjs` mit absurden Werten prüft: Genau dort
   fällt eine vergessene Begrenzung auf, nicht im Spiel.

   **Warum die Rüstung gegen Feuer, Arkanes und Gift nur halb zählt.**
   Ein Schildträger mit Rüstung 3 hielte sonst *alles* aus, und der
   halbe Katalog wäre gegen ihn ohne Wirkung — der Aschemagier hätte
   keinen Grund zu existieren. Die halbe Rüstung ist die Antwort auf
   „warum sollte jemand eine Feuerwaffe nehmen, die weniger Schaden
   macht": weil sie durch den Panzer geht. Gemessen mit
   `node werkzeuge/pruefe-kampf.mjs`: Gegen einen Gegner mit Rüstung 1
   macht die Flammenzunge 1,68 Schaden je Aktionspunkt und liegt damit
   vor allen anderen Nahwaffen; gegen einen ungepanzerten sind es 1,31
   und sie liegt hinter Hetzerbiss und Beilpaar. Genau so herum soll es
   sein — sie ist die Antwort auf Rüstung, nicht die beste Waffe.

   Eine **unbekannte**
   Schadensart zählt volle Rüstung — wer eine neue anhängt und hier
   vergisst, bekommt eine zu schwache Waffe, die auffällt, statt einer
   heimlich zu starken, die es nicht tut.

   **Warum mindestens ein Punkt Schaden durchkommt.** Rüstung 3 gegen
   den Rostdolch (1 bis 4 Schaden) wäre sonst Unverwundbarkeit, und ein
   Blutvogt in einem Gang bliebe für eine Truppe aus Dolchen und
   Wurfmessern für immer stehen. Ein Punkt je Treffer ist wenig, aber
   er beendet den Kampf irgendwann — und genau das muss eine Regel
   leisten.

   **Warum `zweifach` den Trefferwurf wiederholt und nicht den Schaden.**
   „Zwei Trefferwürfe statt einem" heißt: zwei Gelegenheiten, **einen**
   Schlag zu landen. Würfe *und* Schaden zu verdoppeln machte aus dem
   Beilpaar die mit Abstand beste Nahwaffe: gemessen mit
   `node werkzeuge/pruefe-kampf.mjs` 1,87 Schaden je Aktionspunkt
   gegenüber 1,25 beim Kriegshammer und 1,31 im Mittel aller acht
   Nahwaffen. Der wiederholte Trefferwurf lässt es dagegen bei 1,22 —
   und macht daraus, was der Zettel verspricht: eine **verlässliche**
   Waffe, keine starke. 90,8 % seiner Angriffe landen, mehr als bei
   jeder anderen Waffe, aber jeder einzelne Schlag tut nur, was 2d4
   eben tun.

   **Warum die Punkte hier abgezogen werden.** Ein Angriff kostet
   `waffe.ap`; diese Zahl lebt in der Waffe, also gehört ihre Anwendung
   dorthin, wo Waffen ausgerechnet werden. Wer `fuehreAngriffAus` ruft,
   zieht **nicht** noch einmal ab — das erste Ereignis der Liste ist
   `apGesetzt` und sagt, was übrig ist.

   **Warum ein unmöglicher Angriff wirft und nicht leer zurückgibt.**
   Eine abgelehnte Aktion darf nichts verändert haben (Fehlerbuch E2).
   Deshalb wird zuerst alles geprüft und erst danach das Erste
   geschrieben. Eine leere Liste wäre nicht zu unterscheiden von „hat
   danebengegangen" und liefe im Netz-Koop stumm auseinander: Ein
   Rechner, der den Angriff für unmöglich hält, hätte einen anderen
   Zufallsstand als einer, der ihn ausführt.

   **Was hier ausdrücklich nicht entschieden wird:** ob das Ziel im
   Dunkeln verborgen ist. Das braucht das Helligkeitsfeld aus
   `spiel/licht.mjs`, das je Zug **einmal** entsteht und nicht im
   Spielzustand steht; wer Ziele auswählt (`spiel/aktionen.mjs`,
   `spiel/gegner-ki.mjs`), hat es zur Hand und fragt `istVerborgen`,
   bevor er hierher kommt.

   ── Die Gleitkommazahlen und der Netz-Koop ──────────────────────────

   Die Trefferchance ist eine Gleitkommazahl, und das ist erlaubt: Es
   kommen nur Addition, Subtraktion und Vergleiche vor, und die sind in
   IEEE 754 auf das Bit festgelegt. Verboten bleiben `Math.pow`,
   `Math.sin` und Freunde (Fehlerbuch B3) — deshalb steht die Summe in
   fester Reihenfolge da und wird nirgends umgestellt. Alles, was am
   Ende zählt (Schaden, Lebenspunkte, Punkte), ist ganzzahlig.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/hoehen.mjs` (Höhenvorteil, Deckung, Sturz, Stoß),
   `spiel/sicht.mjs` (`sichtlinie` — durch eine Wand schießt niemand),
   `spiel/gitter.mjs` (`schussweite`, `RICHTUNGEN`),
   `spiel/wesen.mjs` (Rüstung mit Schild, `brennt` anhängen, wer wo
   steht), `spiel/katalog/waffen.mjs` (die Zettel), `spiel/zufall.mjs`
   (der gesäte Strom aus `zustand.zufall`),
   `werkzeuge/pruefe-kampf.mjs`. */

import { RICHTUNGEN, schussweite } from "./gitter.mjs";
import {
  DECKUNG_MALUS, hoehenVorteil, trefferBonus, reichweitenBonus,
  hatDeckung, sturzTiefe, sturzSchaden, stossZiel, betretenSchaden
} from "./hoehen.mjs";
import { sichtlinie } from "./sicht.mjs";
import { lebendig, wesenBei, ruestungVon, wirkungAnhaengen } from "./wesen.mjs";

/* Die Grenzen der Trefferchance — siehe Kopfnotiz. */
export const TREFFER_MINDESTENS = 0.05;
export const TREFFER_HOECHSTENS = 0.95;

/* Was eine Stufe Flinkheit an Ausweichen bringt. Der Katalog reicht von
   3 (Schildträger, Knochendiener) bis 10 (Grubenhund); mit 2 % je Stufe
   liegt das Ausweichen also zwischen 6 % und 20 %. Weniger wäre keine
   Eigenschaft mehr, mehr machte die flinken Gegner unangreifbar. */
export const AUSWEICH_JE_FLINKHEIT = 0.02;

/* Was auch durch die dickste Rüstung geht. */
export const MINDEST_SCHADEN = 1;

/* Wogegen die Rüstung nur halb schützt. */
export const SCHUTZ_HALB = new Set(["feuer", "arkan", "gift"]);

/* Der Brand, den die Besonderheit `brennt` legt. Die Waffe trägt dafür
   keine Zahlen — sie stünden sonst an acht Zetteln und liefen
   auseinander. Bewusst kleiner als die Fähigkeit `brandmal` (3 Schaden,
   3 Runden): Eine Waffe **steckt an**, sie ist kein Feuerzauber; mit
   dessen Zahlen wäre die Flammenzunge die beste Nahwaffe des Spiels. */
export const WAFFEN_BRAND = { schaden: 1, runden: 2 };

/* Die Gründe, die in `ereignis.quelle` stehen können. Als Liste, damit
   das Bild eine Wahrheit hat, gegen die es vergleicht — und damit ein
   Tippfehler nicht stumm zu einer Schadensart wird, die niemand malt.
   `quelle` ist immer eine Zeichenkette und nie eine Kennnummer: Wer
   zugeschlagen hat, steht im `angriff`-Ereignis unmittelbar davor. */
export const SCHADENSGRUENDE = ["angriff", "flaeche", "sturz", "lava"];

function begrenzt(chance) {
  return Math.min(TREFFER_HOECHSTENS, Math.max(TREFFER_MINDESTENS, chance));
}

/* Wie viel Trefferchance ein Ziel durch seine Flinkheit wegnimmt. Ein
   Wesen ohne Flinkheit weicht nicht aus — `undefined` würde sonst über
   `NaN` die ganze Chance vernichten, und `NaN < wurf` ist immer falsch:
   Der Angriff ginge lautlos nie mehr daneben oder nie mehr durch. */
export function ausweichAnteil(wesen) {
  if (!wesen || !Number.isFinite(wesen.flinkheit)) return 0;
  return Math.max(0, wesen.flinkheit) * AUSWEICH_JE_FLINKHEIT;
}

function trefferGrundVon(waffe) {
  if (!waffe || !Number.isFinite(waffe.trefferGrund)) {
    throw new Error(`kampf: die Waffe hat keinen Treffergrund ("${waffe && waffe.schluessel}")`);
  }
  return waffe.trefferGrund;
}

/* Die Trefferchance, 0,05 bis 0,95.

   Die vier Summanden stehen in fester Reihenfolge: Treffergrund,
   Höhenvorteil, Deckung, Ausweichen. Vertauschen ändert das letzte Bit
   des Ergebnisses — und damit im Grenzfall, ob ein Wurf trifft.

   Höhenvorteil und Deckung kommen aus `spiel/hoehen.mjs` und werden
   hier **nicht** nachgerechnet: Die Richtung ist die Stelle, an der man
   sich beim Tippen vertut (Fehlerbuch A4), und sie soll nur an einer
   Stelle stehen können. */
export function trefferChance(karte, angreifer, ziel, waffe) {
  if (!karte || !angreifer || !ziel) {
    throw new Error("trefferChance: braucht Karte, Angreifer und Ziel");
  }
  const vorteil = hoehenVorteil(karte, angreifer.x, angreifer.y, ziel.x, ziel.y);
  let chance = trefferGrundVon(waffe);
  chance += trefferBonus(vorteil);
  if (hatDeckung(karte, angreifer.x, angreifer.y, ziel.x, ziel.y)) chance -= DECKUNG_MALUS;
  chance -= ausweichAnteil(ziel);
  return begrenzt(chance);
}

/* Wie weit diese Waffe in dieser Stellung trägt.

   Der Höhenzuschlag gilt nur für Fernwaffen: Ein Arm wird nicht länger,
   weil man höher steht — ein Bogen trägt weiter, weil der Pfeil länger
   fliegt. Dieselbe Unsymmetrie steht in `hoehen.reichweitenBonus`: nach
   oben +1, nach unten keine Strafe.

   Die Eigenheit `hoehenschuetze` (Bogenschützin) legt noch ein Feld
   drauf, aber **nur mit Höhenvorteil**: Ihr Satz ist „von hoch oben ist
   der ganze Saal nur ein langer Schuss", nicht „sie hat einen besseren
   Bogen". Ohne die Bedingung wäre ihr Platz nicht mehr das Plateau,
   und die Klasse verlöre ihre Entscheidung. */
export function reichweiteVon(karte, angreifer, ziel, waffe) {
  if (!waffe || !Number.isFinite(waffe.reichweite)) {
    throw new Error(`kampf: die Waffe hat keine Reichweite ("${waffe && waffe.schluessel}")`);
  }
  if (waffe.art !== "fern") return waffe.reichweite;

  const vorteil = hoehenVorteil(karte, angreifer.x, angreifer.y, ziel.x, ziel.y);
  let weite = waffe.reichweite + reichweitenBonus(vorteil);
  const eigen = angreifer.eigenheit;
  if (vorteil > 0 && eigen && eigen.art === "hoehenschuetze") {
    weite += Number.isFinite(eigen.reichweiteMehr) ? eigen.reichweiteMehr : 0;
  }
  return weite;
}

/* Kommt der Angreifer mit dieser Waffe an dieses Ziel?

   Gemessen wird in der Schachbrett-Entfernung — dieselbe Elle wie beim
   Sichtfeld (`spiel/sicht.mjs`). Mit Manhattan-Abstand hätte jede
   Reichweite die Form eines Rhombus: Ein Bogen träfe geradeaus acht
   Felder weit und über Eck nur vier, und das sieht auf dem Raster
   schlicht falsch aus.

   Die Sichtlinie wird **immer** gefragt, auch im Nahkampf. Bei
   Reichweite 1 ist sie ohnehin frei (auf der Linie liegen nur Start und
   Ziel, und die blocken nie) — aber die Hellebarde reicht zwei Felder,
   und die soll nicht durch eine Wand stechen. Eine Regel für alle ist
   hier billiger als zwei, die auseinanderlaufen können. */
export function inReichweite(karte, angreifer, ziel, waffe) {
  if (!karte || !angreifer || !ziel || !waffe) return false;
  const weite = schussweite(angreifer.x, angreifer.y, ziel.x, ziel.y);
  if (weite < 1) return false;             /* auf sich selbst zielt niemand */
  if (weite > reichweiteVon(karte, angreifer, ziel, waffe)) return false;
  return sichtlinie(karte, angreifer.x, angreifer.y, ziel.x, ziel.y);
}

/* Ein Würfelsatz `{anzahl, seiten, festwert}` aus dem gesäten Strom.
   `zufall.ganz` schließt beide Enden ein und rechnet ganzzahlig — kein
   `Math.floor(zahl() * n)`, das an der Rundung hinge. */
function wuerfelWurf(zufall, wuerfel, wer) {
  if (!zufall || typeof zufall.ganz !== "function") {
    throw new Error("kampf: der Schadenswurf braucht den gesäten Strom aus zustand.zufall");
  }
  if (!wuerfel || !Number.isInteger(wuerfel.anzahl) || !Number.isInteger(wuerfel.seiten)
    || !Number.isInteger(wuerfel.festwert) || wuerfel.anzahl < 0 || wuerfel.seiten < 1
    || wuerfel.festwert < 0) {
    throw new Error(`kampf: "${wer}" hat einen unbrauchbaren Würfelsatz`);
  }
  let summe = wuerfel.festwert;
  for (let i = 0; i < wuerfel.anzahl; i++) summe += zufall.ganz(1, wuerfel.seiten);
  return summe;
}

/* Der Schadenswurf einer Waffe — vor der Rüstung.

   `angreifer` geht in keine Zahl ein: Schaden macht die Waffe, nicht
   der Arm. Er steht trotzdem in der Reihe, und zwar als Sperre — ein
   Toter würfelt nicht mehr. Ohne sie führe ein Fehler in der
   Zugreihenfolge dazu, dass ein gefallener Krätzling weiter zuschlägt,
   und das fiele erst als „woher kam dieser Schaden?" auf. */
export function schadenWurf(zufall, waffe, angreifer = null) {
  if (angreifer !== null && angreifer !== undefined && !lebendig(angreifer)) {
    throw new Error(`schadenWurf: Wesen ${angreifer.id} lebt nicht mehr`);
  }
  return wuerfelWurf(zufall, waffe && waffe.wuerfel, waffe && waffe.schluessel);
}

/* Was von einem Schadenswurf nach der Rüstung übrig bleibt.

   Bewusst eine reine Rechnung ohne Waffe und ohne Wesen: So lässt sie
   sich mit absurden Zahlen prüfen, und die beiden Sonderwege
   (`durchschlag` halbiert die Rüstung, Sturz und Lava fragen gar nicht
   erst) bleiben dort, wo sie hingehören — beim Aufrufer. */
export function ruestungAbzug(schaden, ruestung, schadensart) {
  if (!Number.isInteger(schaden)) {
    throw new Error(`ruestungAbzug: schaden muss ganzzahlig sein (${schaden})`);
  }
  if (!Number.isInteger(ruestung)) {
    throw new Error(`ruestungAbzug: ruestung muss ganzzahlig sein (${ruestung})`);
  }
  /* Kein Schaden bleibt kein Schaden. Der Mindestschaden gilt für einen
     Treffer, der gelandet ist — nicht für einen, den es nicht gab. */
  if (schaden <= 0) return 0;
  const roh = Math.max(0, ruestung);
  const wirksam = SCHUTZ_HALB.has(schadensart) ? Math.floor(roh / 2) : roh;
  return Math.max(MINDEST_SCHADEN, schaden - wirksam);
}

/* Trägt den Schaden ein und hängt die Ereignisse an. `wieviel` ist die
   **fertige** Zahl: Rüstung, Durchschlag und Sturz sind vorher
   entschieden. Lebenspunkte bleiben bei 0 stehen — negative hat noch
   niemand gebraucht, und eine Leiste mit −3 sieht kaputt aus. */
function schadenEintragen(opfer, wieviel, art2, quelle, ereignisse) {
  if (wieviel <= 0) return;
  opfer.lp -= wieviel;
  if (opfer.lp < 0) opfer.lp = 0;
  ereignisse.push({
    art: "schaden", wer: opfer.id, wieviel, quelle, lpRest: opfer.lp, art2
  });
  if (opfer.lp <= 0 && opfer.lebt !== false) {
    opfer.lebt = false;
    ereignisse.push({ art: "gestorben", wer: opfer.id, x: opfer.x, y: opfer.y });
  }
}

/* Ein Treffer mit allem, was daran hängt: Schaden, Brand, Stoß. */
function trefferFolgen(zustand, angreifer, ziel, waffe, ereignisse) {
  const roh = schadenWurf(zustand.zufall, waffe, angreifer);
  const schutz = waffe.besonderheit === "durchschlag"
    ? Math.floor(ruestungVon(ziel) / 2)
    : ruestungVon(ziel);
  schadenEintragen(ziel, ruestungAbzug(roh, schutz, waffe.schadensart),
    waffe.schadensart, "angriff", ereignisse);

  if (!lebendig(ziel)) return;
  if (waffe.besonderheit === "brennt") {
    wirkungAnhaengen(ziel, "brennt", WAFFEN_BRAND.runden, WAFFEN_BRAND.schaden);
  }
  if (waffe.besonderheit === "stoesst") {
    stossFolgen(zustand, angreifer, ziel, ereignisse);
  }
}

/* Der Stoß: ein Feld vom Angreifer weg, und was daraus wird.

   Steht auf dem Feld dahinter schon jemand, bleibt das Ziel stehen —
   eine Kettenreaktion („der schiebt den nächsten") ist nicht gefordert
   und wäre im Netz-Koop eine Regel mehr, die genau gleich laufen muss.
   Der Sturz nimmt der Figur alle restlichen Punkte; die Lava, in die
   sie fällt, fragt `hoehen.betretenSchaden` — dieselbe Antwort wie beim
   freiwilligen Schritt hinein. */
function stossFolgen(zustand, angreifer, ziel, ereignisse) {
  const karte = zustand.karte;
  const hin = stossZiel(karte, angreifer.x, angreifer.y, ziel.x, ziel.y);
  if (!hin) return;
  if (wesenBei(zustand.wesen, hin.x, hin.y)) return;

  const von = { x: ziel.x, y: ziel.y };
  const vonEbene = karte.ebeneBei(ziel.x, ziel.y);
  const stufen = sturzTiefe(karte, ziel.x, ziel.y, hin.x, hin.y);

  ziel.x = hin.x;
  ziel.y = hin.y;
  ereignisse.push({ art: "gestossen", wer: ziel.id, von, nach: { x: hin.x, y: hin.y } });

  const nachEbene = karte.ebeneBei(hin.x, hin.y);
  if (nachEbene !== vonEbene) {
    ereignisse.push({ art: "ebeneGewechselt", wer: ziel.id, von: vonEbene, nach: nachEbene });
  }

  if (stufen > 0) {
    const schaden = sturzSchaden(stufen);
    ereignisse.push({
      art: "gestuerzt", wer: ziel.id, von, nach: { x: hin.x, y: hin.y }, stufen, schaden
    });
    /* Der Sturz fragt nicht nach Rüstung: Was einen drei Ebenen tief
       fallen lässt, kümmert kein Kettenhemd. */
    schadenEintragen(ziel, schaden, "sturz", "sturz", ereignisse);
    if (lebendig(ziel) && ziel.ap > 0) {
      ziel.ap = 0;
      ereignisse.push({ art: "apGesetzt", wer: ziel.id, ap: 0 });
    }
  }

  const beimBetreten = betretenSchaden(karte, hin.x, hin.y);
  if (beimBetreten && lebendig(ziel)) {
    schadenEintragen(ziel, beimBetreten.wieviel, beimBetreten.art, "lava", ereignisse);
  }
}

/* Die Nachbarfelder des Ziels für `flaeche2`.

   Ohne eigenen Trefferwurf, aber mit eigenem Schadenswurf: Der
   Feuerkelch zerplatzt, er zielt nicht ein zweites Mal. Getroffen wird
   **jeder**, der danebensteht — auch der eigene Trupp, auch der
   Werfer, wenn er nah genug steht. „Es fragt nicht, wen" steht auf dem
   Zettel, und eine Waffe, die Freund und Feind trifft, ist eine
   Entscheidung; eine, die nur Feinde trifft, ist keine.

   Die vier Richtungen werden in der Reihenfolge aus `RICHTUNGEN`
   abgegangen — sonst hinge die Folge der Ereignisse an der Reihenfolge
   der Wesenliste (Fehlerbuch B2). */
function flaechenFolgen(zustand, ziel, waffe, ereignisse) {
  for (const r of RICHTUNGEN) {
    const nachbar = wesenBei(zustand.wesen, ziel.x + r.dx, ziel.y + r.dy);
    if (!nachbar || nachbar.id === ziel.id) continue;
    const roh = wuerfelWurf(zustand.zufall, waffe.wuerfel, waffe.schluessel);
    schadenEintragen(nachbar, ruestungAbzug(roh, ruestungVon(nachbar), waffe.schadensart),
      waffe.schadensart, "flaeche", ereignisse);
  }
}

function apPreis(waffe) {
  if (!waffe || !Number.isInteger(waffe.ap) || waffe.ap < 0) {
    throw new Error(`kampf: die Waffe hat keinen Punktepreis ("${waffe && waffe.schluessel}")`);
  }
  return waffe.ap;
}

/* Ein ganzer Angriff: prüfen, Punkte abziehen, würfeln, eintragen.

   Erst wird **alles** geprüft und dann das Erste geschrieben — eine
   abgelehnte Aktion darf nichts verändert haben (Fehlerbuch E2). Wer
   fragen will, ob der Angriff überhaupt geht, fragt vorher
   `inReichweite` und vergleicht die Punkte; hier wirft es.

   Die Ereignisse kommen in fester Folge:
   `apGesetzt` · ein oder zwei `angriff` · bei Treffer `schaden`,
   dann `gestorben` oder (bei `stoesst`) `gestossen`,
   `ebeneGewechselt`, `gestuerzt`, `schaden`, `apGesetzt` ·
   zuletzt die Flächenwirkung. Das Bild spielt sie in dieser Folge ab. */
export function fuehreAngriffAus(zustand, angreifer, ziel, waffe) {
  if (!zustand || !zustand.karte || !zustand.zufall) {
    throw new Error("fuehreAngriffAus: zustand braucht karte und zufall");
  }
  if (!waffe || typeof waffe !== "object") {
    throw new Error("fuehreAngriffAus: ohne Waffe kein Angriff");
  }
  if (!lebendig(angreifer)) throw new Error("fuehreAngriffAus: der Angreifer lebt nicht mehr");
  if (!lebendig(ziel)) throw new Error("fuehreAngriffAus: das Ziel lebt nicht mehr");
  if (angreifer === ziel || angreifer.id === ziel.id) {
    throw new Error(`fuehreAngriffAus: Wesen ${angreifer.id} greift sich selbst an`);
  }
  if (!inReichweite(zustand.karte, angreifer, ziel, waffe)) {
    throw new Error(
      `fuehreAngriffAus: "${waffe.schluessel}" reicht nicht von `
      + `(${angreifer.x},${angreifer.y}) nach (${ziel.x},${ziel.y})`);
  }
  const preis = apPreis(waffe);
  if (angreifer.ap < preis) {
    throw new Error(
      `fuehreAngriffAus: Wesen ${angreifer.id} hat ${angreifer.ap} Punkte, braucht ${preis}`);
  }

  const ereignisse = [];
  angreifer.ap -= preis;
  ereignisse.push({ art: "apGesetzt", wer: angreifer.id, ap: angreifer.ap });

  const chance = trefferChance(zustand.karte, angreifer, ziel, waffe);
  /* `zweifach` gibt einen zweiten Wurf — aber nur, wenn der erste
     danebenging. Zwei Würfe zu werfen, nachdem der Schlag schon sitzt,
     verbrauchte Zufall ohne Wirkung und verschöbe jeden späteren Wurf
     (Fehlerbuch B4). */
  const wuerfe = waffe.besonderheit === "zweifach" ? 2 : 1;
  let getroffen = false;
  for (let i = 0; i < wuerfe && !getroffen; i++) {
    const wurf = zustand.zufall.zahl();
    getroffen = wurf < chance;
    ereignisse.push({
      art: "angriff", wer: angreifer.id, ziel: ziel.id,
      waffe: waffe.schluessel, chance, wurf, treffer: getroffen
    });
  }
  if (!getroffen) return ereignisse;

  trefferFolgen(zustand, angreifer, ziel, waffe, ereignisse);
  if (waffe.besonderheit === "flaeche2") {
    flaechenFolgen(zustand, ziel, waffe, ereignisse);
  }
  return ereignisse;
}
