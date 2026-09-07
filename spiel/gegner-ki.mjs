/* [Aufgabe: Regelkern] Die Gegner-KI — welchen Zug ein Wesen der Brut
   sich vornimmt und wie gut ein Standort für es ist.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Das Höhensystem ist nur dann etwas wert, wenn die Brut es benutzt.
   Steht der Bogenschinder unten im Gang, ist das Podest über ihm
   Zierde; stößt der Rammbock niemanden über die Kante, ist der Graben
   ein Loch im Boden. Deshalb steht in dieser Datei kein „geh zum
   nächsten Jäger und schlag zu", sondern eine **Bewertung von
   Standorten**: Höhenvorteil, Sichtlinie, Deckung, Dunkelheit,
   Lava — dieselben Fragen, die auch der Spieler sich stellt, mit
   Zahlen beantwortet.

   **Warum eine Bewertung und kein Entscheidungsbaum.** Ein Baum aus
   `wenn … dann` hat je Verhalten eigene Zweige, und die sechs
   Verhalten aus `spiel/katalog/gegner.mjs` wären sechs Bäume, die
   auseinanderlaufen. Eine Bewertung hat **eine** Rechnung und je
   Verhalten nur andere Gewichte (`ART_GEWICHTE`). Ein neues Verhalten
   ist damit eine Zeile, kein Zweig.

   **Warum jede Zahl in Hundertsteln eines Aktionspunktes zählt.** Alle
   Werte hier haben dieselbe Elle: `WERT_JE_AP = 100` ist ein
   Aktionspunkt Weg, `WERT_JE_SCHADEN = 100` ein Lebenspunkt Schaden.
   Erst dadurch lässt sich „lohnt der Umweg?" überhaupt ausrechnen —
   und erst dadurch ist die Forderung „Deckung, wenn der Umweg
   höchstens zwei Punkte kostet" eine **nachrechenbare** Zahl:
   `WERT_DECKUNG = 201` liegt genau zwischen zwei und drei Punkten
   Umweg. `werkzeuge/pruefe-ki.mjs` rechnet beide Seiten der Grenze
   nach.

   **Warum die Nähe schwerer wiegt als der Weg.** Ein Feld näher an
   einem Jäger ist `naehe` wert, ein Schritt kostet `WERT_JE_AP`.
   Wären beide gleich, stünde der Stürmer für immer still: Jeder
   Schritt nach vorn wäre genau so viel wert, wie er kostet, und die
   Bewegung braucht eine **echte** Verbesserung. Deshalb liegt `naehe`
   bei den Stürmern auf 200 — zwei Punkte je Feld Annäherung. Das ist
   auch die Zahl, die entscheidet, ob ein Umweg um eine Lavapfütze
   (drei Schritte für zwei Felder Gewinn) sich noch lohnt.

   **Warum die Planung den Zustand nicht anfasst.** `planeZug` gibt
   eine Liste von Aktionen zurück, angewandt wird sie von außen
   (`spiel/aktionen.mjs`). Geplant wird deshalb auf einem
   **Schattenzustand**: flache Kopien aller Wesen, dieselbe Karte.
   Darauf läuft dieselbe Erlaubnisprüfung `pruefeAktion` wie später im
   Ernst — es gibt also nur **eine** Wahrheit darüber, was erlaubt ist,
   und die steht in `spiel/aktionen.mjs`. Was diese Datei selbst
   rechnet, ist ausschließlich die Frage „was ist **gut**?".

   **Was die Planung nicht weiß.** Ob ein Schlag trifft, entscheidet
   ein Würfel, und Würfel wirft die Planung nicht. Der Schattenzustand
   zieht dem Ziel deshalb den **erwarteten** Schaden ab; fällt es
   dabei, plant die KI nicht weiter auf es. Es kann trotzdem
   vorkommen, dass eine spätere Aktion des Plans im Ernst abgelehnt
   wird — weil das Ziel schon tot ist oder eine Wacht dazwischenkam.
   Deshalb gilt für jeden, der einen Plan abspielt: **vor jeder Aktion
   `pruefeAktion` fragen und beim ersten Grund abbrechen**, dann neu
   planen. Wer lieber Schritt für Schritt fahren will, nimmt
   `naechsteAktion` — dieselbe Entscheidung, aber immer auf dem
   echten, aktuellen Zustand.

   **Warum die Brut nicht sucht, was sie nicht sieht.** Nimmt ein
   Wesen keinen Jäger wahr, geht es auf Wacht statt loszulaufen. Liefe
   die Brut auf einen Jäger zu, den sie gar nicht sehen kann, wäre der
   ganze Kerker beim ersten Schritt der Truppe in Bewegung — aus einem
   Zug-um-Zug-Spiel würde ein Ansturm, und Dunkelheit wäre kein
   Versteck mehr, sondern Zierde.

   **Warum der gewöhnliche Stoß den Wuchtstoß schlägt.** Beide kosten
   zwei Punkte und reichen ein Feld weit; nur der Wuchtstoß muss danach
   eine Runde abklingen. Bei gleichem Nutzen ist die Fähigkeit deshalb
   um `WERT_ABKLINGEN` schlechter — der Rammbock hebt sie sich auf, und
   das ist richtig so. Wozu die Zug-Fähigkeiten trotzdem gebraucht
   werden, zeigt die Hakenkette: Sie reicht fünf Felder weit und holt
   einen Schützen vom Podest, wo kein Stoß hinkommt.

   **Was hier bewusst fehlt.** Die Bewertung schaut genau einen Zug
   weit. Ein Umweg, der sich erst in zwei Zügen auszahlt (der lange
   Bogen um eine Lavabank herum), wird nicht gefunden: Die KI läuft
   bis an die Bank und bleibt stehen. Das ist eine bewusste Grenze —
   eine Suche über mehrere Züge müsste den Zustand vorwärtsrechnen,
   und jede solche Vorwärtsrechnung wäre eine zweite Regelauslegung
   neben `spiel/aktionen.mjs`.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/aktionen.mjs` (`pruefeAktion`, `kostenVon`, `AKTION` — die
   einzige Wahrheit über „erlaubt"), `spiel/hoehen.mjs` (Sturz, Stoß,
   Höhenvorteil, Deckung, Lava), `spiel/sicht.mjs` und
   `spiel/licht.mjs` (wer wen erkennt), `spiel/wegfindung.mjs`
   (erreichbare Felder und der Weg, den `wendeAn` später wirklich
   geht), `spiel/kampf.mjs` (Trefferchance, Reichweite, Rüstung),
   `spiel/zug.mjs` und `spiel/wesen.mjs` (wer am Zug ist, Wirkungen),
   `spiel/katalog/*.mjs` (Waffen, Fähigkeiten, Verhalten),
   `werkzeuge/pruefe-ki.mjs`. */

import { abstand, gespiegelt } from "./gitter.mjs";
import {
  STURZ_AB_STUFEN, sturzTiefe, sturzSchaden, hoehenVorteil, hatDeckung,
  betretenSchaden, stossZiel
} from "./hoehen.mjs";
import { sichtlinie } from "./sicht.mjs";
import { helligkeitsfeld, helligkeitBei, istVerborgen, VERBORGEN_UNTER, SICHT_IM_DUNKELN }
  from "./licht.mjs";
import { erreichbareFelder, wegSuche } from "./wegfindung.mjs";
import { waffe, mittlererSchaden } from "./katalog/waffen.mjs";
import { faehigkeit, kenntFaehigkeit } from "./katalog/faehigkeiten.mjs";
import { VERHALTEN, gegner, kenntGegner } from "./katalog/gegner.mjs";
import { trefferChance, inReichweite, ruestungAbzug } from "./kampf.mjs";
import { ruestungVon } from "./wesen.mjs";
import { amZugWesen, wesenMitId, sichtVon, hatWirkung } from "./zug.mjs";
import { AKTION, pruefeAktion, kostenVon, TRANK_HEILUNG } from "./aktionen.mjs";

/* ── Die Elle ──────────────────────────────────────────────────────

   Alles in dieser Datei wird in Hundertsteln gerechnet: ein
   Aktionspunkt Weg und ein Lebenspunkt Schaden sind beide 100 wert.
   Zwei verschiedene Ellen wären der sichere Weg dazu, dass „lohnt der
   Umweg?" niemand mehr nachrechnen kann. */
export const WERT_JE_AP = 100;
export const WERT_JE_SCHADEN = 100;

/* Deckung ist genau so viel wert, dass ein Umweg von **zwei** Punkten
   sich noch lohnt und einer von drei nicht mehr. Die 1 obendrauf ist
   kein Schönheitsfehler, sondern die Grenze selbst: Bei glatten 200
   stünde bei zwei Punkten Umweg Gleichstand, und dann entschiede die
   Feldnummer statt der Regel. */
export const UMWEG_FUER_DECKUNG = 2;
export const WERT_DECKUNG = UMWEG_FUER_DECKUNG * WERT_JE_AP + 1;

/* Was ein Stoß über die Kante zusätzlich zum Sturzschaden wert ist:
   Das Opfer verliert **alle** restlichen Punkte und liegt eine Ebene
   tiefer, wo es niemanden mehr erreicht. Vier Punkte sind dafür eher
   zu wenig als zu viel — aber genug, dass der Stoß jeden gewöhnlichen
   Schlag schlägt, und darum geht es. */
export const WERT_STOSS_ZUSATZ = 400;

/* Ein Schlag, der das Ziel voraussichtlich umlegt, ist mehr wert als
   seine Schadenszahl: Ein toter Jäger schlägt nicht zurück. */
export const WERT_TOEDLICH = 500;

/* Eine Fähigkeit mit Abklingzeit ist bei gleichem Nutzen die
   schlechtere Wahl — sie fehlt in der nächsten Runde. Klein gehalten:
   Sie soll Gleichstände entscheiden, nicht ganze Fähigkeiten
   verhindern. */
export const WERT_ABKLINGEN = 50;

export const WERT_VERLANGSAMEN = 250;
export const WERT_SCHILD = 200;
export const WERT_VERBERGEN = 300;

/* Was ein Punkt Schaden beim Betreten eines Feldes an Abschreckung
   wert ist. Doppelt so viel wie derselbe Punkt im Kampf: Lava trifft
   sicher, ein Schlag nur vielleicht. Acht Punkte Lavaschaden werden
   damit zu 1.600 — sechzehn Aktionspunkte Umweg. So weit ist auf einer
   Kerkerkarte kein Weg. */
export const GEFAHR_JE_SCHADEN = 200;

/* Ein Feld, das gar nicht betreten werden kann, und eines, dessen
   Betreten sicher tötet. Beide so tief, dass keine Summe von Boni sie
   je nach oben trägt. */
export const WERT_UNMOEGLICH = -1000000;
export const WERT_TOD = -100000;

/* Ein Riegel gegen die Endlosschleife: Mehr Aktionen als das kann ein
   Zug nicht haben, weil jede mindestens einen Punkt kostet und kein
   Wesen mehr als eine Handvoll hat. Der Riegel ist die zweite
   Sicherung — die erste ist, dass jede geplante Aktion Punkte
   abzieht. */
export const HOECHSTENS_SCHRITTE = 16;

/* Wer kein Verhalten nennt, stürmt. Lieber ein Wesen, das angreift,
   als eines, das ratlos stehen bleibt. */
export const STANDARD_VERHALTEN = "stuermer";

/* ── Die Gewichte je Verhalten ─────────────────────────────────────

   `naehe`    — je Feld Abstand vom **Wunschabstand** (der Reichweite
                der eigenen Waffe). Über `WERT_JE_AP`, sonst lohnt sich
                kein Schritt nach vorn.
   `hoehe`    — für den Höhenvorteil (+1/0/−1) gegen ein Ziel.
   `deckung`  — halbe Deckung gegen das Ziel auf diesem Feld.
   `dunkel`   — das Feld ist dunkler als `VERBORGEN_UNTER`.
   `angriff`  — von diesem Feld aus geht ein Angriff auf das Ziel.

   Die Zahlen sind gewählt, nicht gemessen — aber begründet: Der
   Schütze zahlt für das Podest (`hoehe` 500) mehr als für drei
   Schritte Weg, weil er dort +12 % Trefferchance und ein Feld mehr
   Reichweite bekommt und selbst schwer zu erreichen ist. Der Lauerer
   zahlt für die Dunkelheit (400) fast dasselbe, weil sie ihn dem
   Beschuss ganz entzieht. Der Stürmer zahlt für Deckung genau zwei
   Punkte Umweg — das ist die Forderung, wörtlich als Zahl. */
export const ART_GEWICHTE = {
  stuermer: { naehe: 200, hoehe: 60, deckung: WERT_DECKUNG, dunkel: 0, angriff: 300 },
  schuetze: { naehe: 160, hoehe: 500, deckung: 150, dunkel: 60, angriff: 600 },
  lauerer: { naehe: 180, hoehe: 80, deckung: 120, dunkel: 400, angriff: 400 },
  schwarm: { naehe: 220, hoehe: 30, deckung: 60, dunkel: 0, angriff: 300 },
  hauptmann: { naehe: 190, hoehe: 80, deckung: WERT_DECKUNG, dunkel: 0, angriff: 300 },
  speier: { naehe: 160, hoehe: 300, deckung: 150, dunkel: 80, angriff: 500 }
};

/* Das Verhalten eines Wesens. Ein Wesen darf es selbst tragen — dann
   gilt seins; sonst kommt es aus der Gegnervorlage. Beides und nicht
   nur eines, weil die Prüfung Wesen von Hand baut und ein Held gar
   keine Gegnervorlage hat. */
export function verhaltenVon(wesen) {
  if (wesen && typeof wesen.verhalten === "string" && VERHALTEN.includes(wesen.verhalten)) {
    return wesen.verhalten;
  }
  if (wesen && kenntGegner(wesen.art)) return gegner(wesen.art).verhalten;
  return STANDARD_VERHALTEN;
}

export function gewichteVon(wesen) {
  return ART_GEWICHTE[verhaltenVon(wesen)] || ART_GEWICHTE[STANDARD_VERHALTEN];
}

/* ── Die Lage eines Aufrufs ────────────────────────────────────────

   Das Helligkeitsfeld kostet je Licht eine Fläche und wird für jedes
   bewertete Feld gebraucht. Es entsteht deshalb je Aufruf **einmal**
   und wird danach nur befragt. Zwischengespeichert wird es bewusst
   nicht über den Aufruf hinaus: Ein Zwischenspeicher, der auf einem
   Rechner noch gilt und auf dem anderen schon nicht mehr, wäre genau
   die Sorte Unterschied, an der der Netz-Koop zerbricht. */
function macheLage(zustand) {
  let hell = null;
  return {
    zustand,
    karte: zustand.karte,
    helligkeit() {
      if (hell === null) hell = helligkeitsfeld(zustand.karte);
      return hell;
    }
  };
}

/* ── Wer steht wo ──────────────────────────────────────────────────*/

function wesenAufAusser(zustand, x, y, ausser) {
  for (const w of zustand.wesen || []) {
    if (!w || !w.lebt) continue;
    if (ausser && w.id === ausser.id) continue;
    if (w.x === x && w.y === y) return w;
  }
  return null;
}

/* Dieselbe Sperrfunktion, die `spiel/aktionen.mjs` der Wegsuche
   reicht. Sie steht hier noch einmal, weil sie dort nicht ausgeführt
   wird — und sie muss Feld für Feld dasselbe sagen, sonst rechnet die
   KI mit anderen Wegen, als `wendeAn` später geht. */
function belegtAusser(zustand, wesen) {
  return (x, y) => !!wesenAufAusser(zustand, x, y, wesen);
}

/* ── Wahrnehmung ───────────────────────────────────────────────────

   Dieselben drei Fragen wie in `spiel/aktionen.mjs`: Reicht das Auge,
   ist die Linie frei, steht das Ziel im Dunkeln? Nur dass hier auch
   nach einem **anderen** Standort gefragt werden darf — die
   Bewertung will ja wissen, was ein Wesen von dort drüben sähe.
   Erlaubt wird davon nichts; ob ein Angriff wirklich zulässig ist,
   sagt am Ende immer `pruefeAktion`. */
function erkanntVon(lage, beobachter, ziel) {
  const karte = lage.karte;
  if (!ziel || ziel.lebt === false) return false;
  if (!karte.drin(beobachter.x, beobachter.y) || !karte.drin(ziel.x, ziel.y)) return false;
  const weite = abstand(beobachter.x, beobachter.y, ziel.x, ziel.y);
  if (weite > sichtVon(beobachter)) return false;
  if (!sichtlinie(karte, beobachter.x, beobachter.y, ziel.x, ziel.y)) return false;
  if (hatWirkung(ziel, "verbergen") && weite > SICHT_IM_DUNKELN) return false;
  return !istVerborgen(karte, lage.helligkeit(), beobachter, ziel);
}

/* Die Jäger (beziehungsweise die Brut), die dieses Wesen von seinem
   Standort aus wirklich erkennt — in der Reihenfolge von
   `zustand.wesen`. Die Reihenfolge ist keine Nebensache: Bei
   Gleichstand entscheidet sie, und vier Rechner müssen dieselbe
   Folge sehen (Fehlerbuch B2). */
export function wahrgenommeneZiele(zustand, wesen) {
  const lage = macheLage(zustand);
  return zieleAus(lage, wesen);
}

function zieleAus(lage, wesen) {
  const raus = [];
  for (const anderer of lage.zustand.wesen || []) {
    if (!anderer || !anderer.lebt) continue;
    if (anderer.id === wesen.id || anderer.seite === wesen.seite) continue;
    if (erkanntVon(lage, wesen, anderer)) raus.push(anderer);
  }
  return raus;
}

/* ── Der Wunschabstand ─────────────────────────────────────────────

   Die Reichweite der eigenen Waffe, gemessen in derselben
   Schachbrett-Elle wie Sicht und Schuss. Der Nahkämpfer will auf 1,
   der Hellebardier auf 2, der Langbogenschütze auf 9 — eine Regel
   statt sechs Sonderfällen je Verhalten. */
function wunschAbstand(wesen) {
  return waffe(wesen.waffe).reichweite;
}

/* ── Was ein Angriff bringt ────────────────────────────────────────*/

/* Der Schaden eines sicheren Treffers, nach Rüstung — dieselbe
   Rechnung wie in `spiel/kampf.mjs`: `durchschlag` halbiert die
   Rüstung, `ruestungAbzug` kennt die Arten, gegen die sie nur halb
   schützt. Gerechnet wird mit dem **gerundeten Mittelwert** des
   Würfelsatzes; die Streuung ist gerade das, was niemand vorhersagen
   kann. */
function schadenNachRuestung(angreifer, ziel) {
  const w = waffe(angreifer.waffe);
  const roh = Math.round(mittlererSchaden(w));
  const schutz = w.besonderheit === "durchschlag"
    ? Math.floor(ruestungVon(ziel) / 2)
    : ruestungVon(ziel);
  return ruestungAbzug(roh, schutz, w.schadensart);
}

/* Der erwartete Schaden eines Angriffs von (x,y) aus. `zweifach` gibt
   einen zweiten Wurf, aber nur nach einem Fehlschlag — die wirkliche
   Trefferchance ist also `1 − (1 − c)²` und nicht `2c`. */
function erwarteterSchaden(karte, angreifer, ziel) {
  const w = waffe(angreifer.waffe);
  const chance = trefferChance(karte, angreifer, ziel, w);
  const wirklich = w.besonderheit === "zweifach" ? 1 - (1 - chance) * (1 - chance) : chance;
  return wirklich * schadenNachRuestung(angreifer, ziel);
}

function alsStuende(wesen, x, y) {
  return { ...wesen, x, y };
}

/* Käme dieses Wesen von (x,y) aus mit seiner Waffe an dieses Ziel —
   sehen **und** treffen? Zwei Fragen, eine Antwort; sonst stellt jede
   Stelle die eine und vergisst die andere. */
function kannAngreifenVon(lage, wesen, x, y, ziel) {
  const da = alsStuende(wesen, x, y);
  if (!erkanntVon(lage, da, ziel)) return false;
  return inReichweite(lage.karte, da, ziel, waffe(wesen.waffe));
}

/* ── Was ein Stoß bringt ───────────────────────────────────────────

   Der Schaden, den ein Stoß von (x,y) aus an diesem Ziel anrichtet —
   0, wenn er gar nicht geht oder nichts bringt. **Gestoßen wird nur,
   wenn etwas dabei herauskommt**: ein Sturz über mindestens zwei
   Ebenen oder ein Feld voll Lava. Ein Stoß, der das Ziel bloß ein
   Feld weiter schiebt, kostet zwei Punkte und ändert nichts.

   `weg` unterscheidet Stoßen von Ziehen: Gezogen wird nach derselben
   Vorschrift, nur vom gespiegelten Punkt aus — genau wie in
   `spiel/aktionen.mjs`, und seit dem 07.09.2026 mit derselben
   Sechseckspiegelung (`gespiegelt`) statt mit `2 * ziel - x`. */
function schubGewinn(lage, x, y, ziel, weg) {
  const karte = lage.karte;
  const aus = weg ? { x, y } : gespiegelt(x, y, ziel.x, ziel.y);
  const feld = stossZiel(karte, aus.x, aus.y, ziel.x, ziel.y);
  if (!feld) return 0;
  if (wesenAufAusser(lage.zustand, feld.x, feld.y, ziel)) return 0;

  const stufen = sturzTiefe(karte, ziel.x, ziel.y, feld.x, feld.y);
  let gewinn = stufen >= STURZ_AB_STUFEN ? sturzSchaden(stufen) : 0;
  const brennt = betretenSchaden(karte, feld.x, feld.y);
  if (brennt) gewinn += brennt.wieviel;
  return gewinn;
}

/* ── Der Wert eines Standorts ──────────────────────────────────────*/

export function bewerteFeld(zustand, wesen, x, y) {
  if (!zustand || !zustand.karte || !wesen) return WERT_UNMOEGLICH;
  const lage = macheLage(zustand);
  return feldWert(lage, wesen, x, y, zieleAus(lage, wesen));
}

function feldWert(lage, wesen, x, y, ziele) {
  const karte = lage.karte;
  if (!karte.drin(x, y)) return WERT_UNMOEGLICH;
  if (karte.blocktBewegung(x, y)) return WERT_UNMOEGLICH;

  const g = gewichteVon(wesen);
  let wert = 0;

  /* Erst die Gefahr des Feldes selbst — sie hängt an keinem Ziel und
     wiegt schwerer als jeder Vorteil. Wer daran stirbt, geht nie
     hinein, egal was drüben lockt. */
  const brennt = betretenSchaden(karte, x, y);
  if (brennt) {
    if (brennt.wieviel >= wesen.lp) return WERT_TOD;
    wert -= GEFAHR_JE_SCHADEN * brennt.wieviel;
  }

  if (g.dunkel > 0 && helligkeitBei(lage.helligkeit(), x, y, karte) < VERBORGEN_UNTER) {
    wert += g.dunkel;
  }

  /* Gegen **ein** Ziel muss der Standort taugen, nicht gegen alle: Ein
     Podest, von dem aus ein Jäger im Schuss steht, ist gut, auch wenn
     die anderen drei hinter der Mauer stehen. Deshalb der beste Wert
     und nicht die Summe — eine Summe machte aus vier halb guten
     Stellungen eine bessere als aus einer ganz guten. */
  let bestes = null;
  for (const ziel of ziele) {
    const w = wertGegenZiel(lage, wesen, x, y, ziel, g);
    if (bestes === null || w > bestes) bestes = w;
  }
  if (bestes !== null) wert += bestes;
  return wert;
}

function wertGegenZiel(lage, wesen, x, y, ziel, g) {
  const karte = lage.karte;
  let wert = -g.naehe * Math.abs(abstand(x, y, ziel.x, ziel.y) - wunschAbstand(wesen));
  wert += g.hoehe * hoehenVorteil(karte, x, y, ziel.x, ziel.y);
  if (hatDeckung(karte, ziel.x, ziel.y, x, y)) wert += g.deckung;
  if (kannAngreifenVon(lage, wesen, x, y, ziel)) wert += g.angriff;

  /* Das Feld, von dem aus man jemanden über die Kante schieben kann,
     ist mehr wert als jedes andere. Genau dieser Zug macht die Höhen
     zum Spiel.

     Gestoßen wird nur von **daneben**, also `abstand(...) === 1`. Bis
     zum 07.09.2026 stand hier die Zeile `schub > 0 &&(x, y, ziel.x,
     ziel.y) === 1` — bei der Sechseck-Umstellung war der Funktionsname
     `schussweite` entfallen, die Klammer aber stehengeblieben. Was
     übrig blieb, war eine Kommaliste: Sie liefert `ziel.y` und
     vergleicht die **Zeile des Ziels** mit 1. Gemessen an einer Karte
     mit identischer Geometrie: derselbe Stoßplatz war in Zeile 1
     970 wert, in Zeile 3, 5 und 7 nur 270. */
  const schub = schubGewinn(lage, x, y, ziel, true);
  if (schub > 0 && abstand(x, y, ziel.x, ziel.y) === 1) {
    wert += WERT_STOSS_ZUSATZ + WERT_JE_SCHADEN * schub;
  }
  return wert;
}

/* ── Die Sofortaktionen ────────────────────────────────────────────

   Alles, was ohne einen Schritt geht: Stoß, Angriff, Fähigkeit,
   Trank. Jeder Vorschlag läuft durch `pruefeAktion`, bevor er
   überhaupt bewertet wird — so kann nichts in die Liste geraten, das
   `wendeAn` später ablehnen würde.

   Die Reihenfolge ist fest: erst der Stoß, dann die Angriffe, dann
   die Fähigkeiten, zuletzt der Trank; innerhalb jeder Gruppe die
   Reihenfolge der Zielliste. Bei Gleichstand gewinnt der frühere
   Eintrag. Ohne diese Festlegung hinge die Wahl an der
   Einfügereihenfolge (Fehlerbuch B2). */
function besteSofortAktion(lage, wesen, ziele) {
  const zustand = lage.zustand;
  let beste = null;
  const pruefe = (aktion, wert) => {
    if (!(wert > 0)) return;
    if (beste !== null && wert <= beste.wert) return;
    if (pruefeAktion(zustand, aktion) !== null) return;
    beste = { aktion, wert };
  };

  for (const ziel of ziele) {
    if (abstand(wesen.x, wesen.y, ziel.x, ziel.y) !== 1) continue;
    const schub = schubGewinn(lage, wesen.x, wesen.y, ziel, true);
    if (schub <= 0) continue;
    pruefe({ typ: AKTION.stoss, wer: wesen.id, ziel: ziel.id },
      WERT_STOSS_ZUSATZ + WERT_JE_SCHADEN * schub);
  }

  for (const ziel of ziele) {
    const erwartet = erwarteterSchaden(lage.karte, wesen, ziel);
    let wert = Math.round(WERT_JE_SCHADEN * erwartet);
    if (schadenNachRuestung(wesen, ziel) >= ziel.lp) wert += WERT_TOEDLICH;
    pruefe({ typ: AKTION.angriff, wer: wesen.id, ziel: ziel.id }, wert);
  }

  for (const schluessel of wesen.faehigkeiten || []) {
    if (!kenntFaehigkeit(schluessel)) continue;
    faehigkeitsVorschlaege(lage, wesen, schluessel, ziele, pruefe);
  }

  if (wesen.traenke > 0 && wesen.lp * 2 <= wesen.lpMax) {
    const fehlt = Math.max(0, wesen.lpMax - wesen.lp);
    pruefe({ typ: AKTION.trank, wer: wesen.id },
      WERT_JE_SCHADEN * Math.min(TRANK_HEILUNG, fehlt));
  }
  return beste;
}

/* Was eine Fähigkeit wert ist. Feldwirkungen (`licht`, `sprung`,
   `oeffnen`) bekommen keinen Vorschlag: Ein Licht verrät vor allem
   den, der es setzt — die Brut kämpft im Dunkeln —, und Springen und
   Öffnen trägt im Katalog kein Gegner. Wer sie später braucht, hängt
   hier einen Zweig an; bis dahin wäre das Absuchen des ganzen
   Reichweitenquadrats nur Rechenzeit. */
function faehigkeitsVorschlaege(lage, wesen, schluessel, ziele, pruefe) {
  const f = faehigkeit(schluessel);
  const wirkung = f.wirkung;
  const abzug = f.abklingen > 0 ? WERT_ABKLINGEN : 0;
  const aufSich = { typ: AKTION.faehigkeit, wer: wesen.id, schluessel, ziel: null, feld: null };

  switch (wirkung.art) {
    case "schild":
      if (!hatWirkung(wesen, "schild") && ziele.length > 0) pruefe(aufSich, WERT_SCHILD - abzug);
      return;
    case "verbergen":
      if (!hatWirkung(wesen, "verbergen") && ziele.length > 0) {
        pruefe(aufSich, WERT_VERBERGEN - abzug);
      }
      return;
    case "heilen": {
      /* Geheilt wird die eigene Seite — deshalb nicht die Zielliste,
         die trägt nur Feinde. */
      for (const freund of lage.zustand.wesen || []) {
        if (!freund || !freund.lebt || freund.seite !== wesen.seite) continue;
        const fehlt = Math.max(0, freund.lpMax - freund.lp);
        const netto = Math.min(wirkung.wieviel, fehlt) - (wirkung.eigenerVerlust || 0);
        pruefe({ typ: AKTION.faehigkeit, wer: wesen.id, schluessel, ziel: freund.id, feld: null },
          WERT_JE_SCHADEN * netto - abzug);
      }
      return;
    }
    case "schaden":
    case "brennen":
    case "verlangsamen":
    case "stossen":
    case "ziehen":
      break;
    default:
      return;
  }

  for (const ziel of ziele) {
    const aktion = { typ: AKTION.faehigkeit, wer: wesen.id, schluessel, ziel: ziel.id, feld: null };
    pruefe(aktion, zielWirkungsWert(lage, wesen, wirkung, ziel) - abzug);
  }
}

function zielWirkungsWert(lage, wesen, wirkung, ziel) {
  switch (wirkung.art) {
    case "schaden": {
      const eigen = wirkung.eigenerVerlust || 0;
      /* Wer an der eigenen Fähigkeit stirbt, wirkt sie nicht. */
      if (eigen >= wesen.lp) return 0;
      const durch = ruestungAbzug(wirkung.wieviel, ruestungVon(ziel),
        wirkung.schadensart || "arkan");
      const zusatz = durch >= ziel.lp ? WERT_TOEDLICH : 0;
      return WERT_JE_SCHADEN * (durch - eigen) + zusatz;
    }
    case "brennen":
      if (hatWirkung(ziel, "brennt")) return 0;
      return WERT_JE_SCHADEN * wirkung.wieviel * wirkung.runden;
    case "verlangsamen":
      return hatWirkung(ziel, "verlangsamt") ? 0 : WERT_VERLANGSAMEN;
    case "stossen": {
      const schub = schubGewinn(lage, wesen.x, wesen.y, ziel, true);
      return schub > 0 ? WERT_STOSS_ZUSATZ + WERT_JE_SCHADEN * schub : 0;
    }
    case "ziehen": {
      const schub = schubGewinn(lage, wesen.x, wesen.y, ziel, false);
      return schub > 0 ? WERT_STOSS_ZUSATZ + WERT_JE_SCHADEN * schub : 0;
    }
    default:
      return 0;
  }
}

/* ── Die Bewegung ──────────────────────────────────────────────────

   Ein Feld ist ein Kandidat, wenn sein Standortwert abzüglich des
   Weges besser ist als der Wert des Feldes, auf dem das Wesen schon
   steht. „Besser" heißt **echt** besser: Ein Gleichstand ist kein
   Grund zu laufen.

   Zwei Durchgänge, und der erste ist der wichtige: Wer schießen will,
   lässt sich die Punkte dafür übrig. Gesucht wird zuerst unter den
   Feldern, die nach dem Weg noch den Waffenpreis übrig lassen **und**
   von denen aus ein Angriff überhaupt möglich wäre. Erst wenn es
   keins gibt, zählt die ganze Reichweite der Beine — dann ist der Zug
   ohnehin nur ein Anmarsch.

   **Der Weg wird gegengeprüft.** `wendeAn` sucht sich den Weg zum
   Zielfeld selbst und nimmt den billigsten. Die KI darf deshalb nur
   Ziele wählen, deren billigster Weg auch wirklich gangbar ist —
   sonst plant sie den Bogen um die Lava herum und `wendeAn` läuft
   mitten hindurch. */
function besterSchritt(lage, wesen, ziele) {
  if (ziele.length === 0) return null;
  const zustand = lage.zustand;
  const karte = lage.karte;
  const jetzt = feldWert(lage, wesen, wesen.x, wesen.y, ziele);

  /* Der Lauerer rührt sich nur, wenn dieser Zug ihn an einen Jäger
     heranbringt. Sonst bleibt er, wo er ist — im Dunkeln. Das ist
     seine ganze Rolle: Wer im Unbeleuchteten wartet, ist vor Beschuss
     sicher, und wer loszieht, ist es nicht mehr. */
  const nurMitAngriff = verhaltenVon(wesen) === "lauerer";

  const felder = erreichbareFelder(karte, wesen.x, wesen.y, wesen.ap, {
    belegt: belegtAusser(zustand, wesen)
  });

  const kandidaten = [];
  for (const [index, eintrag] of felder) {
    if (eintrag.x === wesen.x && eintrag.y === wesen.y) continue;
    const wert = feldWert(lage, wesen, eintrag.x, eintrag.y, ziele) - WERT_JE_AP * eintrag.kosten;
    if (wert <= jetzt) continue;
    const greift = ziele.some((z) => kannAngreifenVon(lage, wesen, eintrag.x, eintrag.y, z));
    if (nurMitAngriff && !greift) continue;
    kandidaten.push({ index, x: eintrag.x, y: eintrag.y, kosten: eintrag.kosten, wert, greift });
  }
  if (kandidaten.length === 0) return null;

  /* Bester Wert zuerst, bei Gleichstand die kleinere Feldnummer —
     dieselbe Regel wie in der Warteschlange der Wegfindung, aus
     demselben Grund. */
  kandidaten.sort((a, b) => (b.wert - a.wert) || (a.index - b.index));

  const preis = waffe(wesen.waffe).ap;
  const mitVorrat = kandidaten.filter((k) => k.greift && k.kosten + preis <= wesen.ap);
  return ersterGangbarer(lage, wesen, mitVorrat) || ersterGangbarer(lage, wesen, kandidaten);
}

function ersterGangbarer(lage, wesen, kandidaten) {
  for (const k of kandidaten) {
    const aktion = { typ: AKTION.gehen, wer: wesen.id, nach: { x: k.x, y: k.y } };
    if (pruefeAktion(lage.zustand, aktion) !== null) continue;
    if (!wegIstSicher(lage, wesen, aktion.nach)) continue;
    return aktion;
  }
  return null;
}

/* Läuft der Weg, den `wendeAn` gehen wird, durch ein Feld, das beim
   Betreten wehtut? Gefragt wird mit denselben Einstellungen, mit
   denen `spiel/aktionen.mjs` ihn sucht — sonst prüft die KI einen
   anderen Weg, als später gegangen wird. Das Startfeld zählt nicht
   mit: Wer schon in der Lava steht, soll heraus dürfen. */
function wegIstSicher(lage, wesen, nach) {
  const weg = wegSuche(lage.karte, { x: wesen.x, y: wesen.y }, nach, {
    belegt: belegtAusser(lage.zustand, wesen),
    maxKosten: wesen.ap
  });
  if (!weg) return false;
  for (let i = 1; i < weg.pfad.length; i++) {
    if (betretenSchaden(lage.karte, weg.pfad[i].x, weg.pfad[i].y)) return false;
  }
  return true;
}

/* ── Die eine Entscheidung ─────────────────────────────────────────

   Erst die Bewegung, dann die Sofortaktion: Wer erst schießt und dann
   erst merkt, dass das Podest zwei Schritte weit weg war, steht die
   ganze Runde falsch. Die Bewegung darf nur wählen, was ihr den
   Angriff nicht wegnimmt (siehe `besterSchritt`) — damit ist die
   Reihenfolge kein Verzicht, sondern eine Vorbereitung.

   Wer weder gehen noch angreifen kann, geht auf **Wacht**. Ein Wesen,
   das nur dasteht, ist ein Wesen, das der Spieler gefahrlos umgeht;
   eines auf Wacht ist ein Grund, den Gang nicht zu betreten. */
export function naechsteAktion(zustand, wesen) {
  if (!zustand || !zustand.karte || !wesen) return null;
  if (zustand.vorbei) return null;
  const dran = amZugWesen(zustand);
  if (!dran || dran.id !== wesen.id) return null;
  return entscheide(macheLage(zustand), wesen);
}

function entscheide(lage, wesen) {
  const zustand = lage.zustand;
  const ziele = zieleAus(lage, wesen);

  const gang = besterSchritt(lage, wesen, ziele);
  if (gang) return gang;

  const sofort = besteSofortAktion(lage, wesen, ziele);
  if (sofort) return sofort.aktion;

  const wacht = { typ: AKTION.wacht, wer: wesen.id };
  if (pruefeAktion(zustand, wacht) === null) return wacht;
  return { typ: AKTION.zugEnde, wer: wesen.id };
}

/* ── Der Schattenzustand ───────────────────────────────────────────

   Flache Kopien aller Wesen samt ihrer Wirkungslisten, dieselbe
   Karte, dieselbe Ordnung. Darauf plant `planeZug` seine Aktionen
   durch, ohne dass am echten Zustand ein einziges Feld anders wird —
   `werkzeuge/pruefe-ki.mjs` vergleicht dafür einen vollständigen
   Abdruck vorher und nachher.

   Die Karte wird nicht kopiert: Weder `pruefeAktion` noch irgendeine
   Rechnung hier schreibt in sie, und eine Kopie je Planung wäre bei
   fünf Zahlenreihen über tausende Felder der teuerste Teil des
   ganzen Zuges. */
function schattenZustand(zustand) {
  const kopien = [];
  for (const w of zustand.wesen || []) {
    if (!w) continue;
    kopien.push({
      ...w,
      wirkungen: Array.isArray(w.wirkungen) ? w.wirkungen.map((e) => ({ ...e })) : []
    });
  }
  return {
    ...zustand,
    wesen: kopien,
    nachId: new Map(kopien.map((w) => [w.id, w])),
    protokoll: []
  };
}

/* Führt eine geplante Aktion im Schatten nach — so weit, wie sie
   vorhersehbar ist. Punkte werden immer abgezogen; das ist der Teil,
   der die Planung garantiert beendet. Was der Würfel entscheidet,
   wird als **Erwartungswert** eingetragen: Fällt das Ziel danach im
   Schatten, plant die KI nicht weiter auf es. */
function schattenSchritt(schatten, wesen, aktion) {
  const karte = schatten.karte;
  const preis = kostenVon(schatten, aktion);
  if (!Number.isFinite(preis)) return false;

  if (aktion.typ === AKTION.gehen) {
    const weg = wegSuche(karte, { x: wesen.x, y: wesen.y }, aktion.nach, {
      belegt: belegtAusser(schatten, wesen),
      maxKosten: wesen.ap
    });
    if (!weg) return false;
    wesen.x = aktion.nach.x;
    wesen.y = aktion.nach.y;
    wesen.ap = Math.max(0, wesen.ap - weg.kosten);
    return true;
  }

  wesen.ap = Math.max(0, wesen.ap - preis);

  if (aktion.typ === AKTION.wacht) {
    wesen.wacht = true;
    return true;
  }
  if (aktion.typ === AKTION.trank) {
    wesen.traenke = Math.max(0, (wesen.traenke || 0) - 1);
    wesen.lp = Math.min(wesen.lpMax, wesen.lp + TRANK_HEILUNG);
    return true;
  }

  const ziel = wesenMitId(schatten, aktion.ziel);
  if (aktion.typ === AKTION.angriff && ziel) {
    nimmSchaden(ziel, Math.round(erwarteterSchaden(karte, wesen, ziel)));
    return true;
  }
  if (aktion.typ === AKTION.stoss && ziel) {
    schiebeImSchatten(schatten, wesen.x, wesen.y, ziel, true);
    return true;
  }
  if (aktion.typ === AKTION.faehigkeit) {
    faehigkeitImSchatten(schatten, wesen, aktion, ziel);
    return true;
  }
  return true;
}

function nimmSchaden(wesen, wieviel) {
  if (!(wieviel > 0)) return;
  wesen.lp -= wieviel;
  if (wesen.lp <= 0) {
    wesen.lp = 0;
    wesen.lebt = false;
  }
}

function schiebeImSchatten(schatten, ausX, ausY, ziel, weg) {
  const karte = schatten.karte;
  const von = weg ? { x: ausX, y: ausY } : gespiegelt(ausX, ausY, ziel.x, ziel.y);
  const feld = stossZiel(karte, von.x, von.y, ziel.x, ziel.y);
  if (!feld) return;
  if (wesenAufAusser(schatten, feld.x, feld.y, ziel)) return;
  const stufen = sturzTiefe(karte, ziel.x, ziel.y, feld.x, feld.y);
  ziel.x = feld.x;
  ziel.y = feld.y;
  if (stufen >= STURZ_AB_STUFEN) {
    ziel.ap = 0;
    nimmSchaden(ziel, sturzSchaden(stufen));
  }
  const brennt = betretenSchaden(karte, feld.x, feld.y);
  if (brennt) nimmSchaden(ziel, brennt.wieviel);
}

function faehigkeitImSchatten(schatten, wesen, aktion, ziel) {
  const f = faehigkeit(aktion.schluessel);
  const wirkung = f.wirkung;
  /* Die Abklingzeit ist der Teil, den die Planung wissen **muss** —
     sonst plant sie dieselbe Fähigkeit dreimal in einem Zug. */
  if (f.abklingen > 0) {
    wesen.wirkungen = wesen.wirkungen.filter(
      (w) => !(w.art === "abklingen" && w.schluessel === f.schluessel));
    wesen.wirkungen.push({ art: "abklingen", schluessel: f.schluessel, runden: f.abklingen });
  }
  if (wirkung.eigenerVerlust > 0) nimmSchaden(wesen, wirkung.eigenerVerlust);
  if (!ziel) return;

  switch (wirkung.art) {
    case "schaden":
      nimmSchaden(ziel, ruestungAbzug(wirkung.wieviel, ruestungVon(ziel),
        wirkung.schadensart || "arkan"));
      return;
    case "heilen":
      ziel.lp = Math.min(ziel.lpMax, ziel.lp + wirkung.wieviel);
      return;
    case "stossen":
      schiebeImSchatten(schatten, wesen.x, wesen.y, ziel, true);
      return;
    case "ziehen":
      schiebeImSchatten(schatten, wesen.x, wesen.y, ziel, false);
      return;
    case "verlangsamen":
      ziel.wirkungen.push({ art: "verlangsamt", runden: wirkung.runden, staerke: wirkung.apAbzug });
      return;
    case "brennen":
      ziel.wirkungen.push({ art: "brennt", runden: wirkung.runden, staerke: wirkung.wieviel });
      return;
    default:
  }
}

/* ── Der ganze Zug ─────────────────────────────────────────────────

   Die Liste endet **immer** mit `zugEnde` — auch für ein Wesen, das
   eingekesselt ist, keine Punkte mehr hat oder nichts sieht. Ein Plan
   ohne Ende wäre ein Zug, der nie zurückgibt, und im Netz-Koop
   säßen dann vier Rechner und warteten.

   Zwei unabhängige Sicherungen halten die Schleife an: Jede geplante
   Aktion zieht im Schatten Punkte ab (und keine kostet null außer
   `zugEnde`, das die Schleife verlässt), und `HOECHSTENS_SCHRITTE`
   deckelt zusätzlich. Eine Sicherung wäre eine Behauptung; zwei sind
   ein Riegel. */
export function planeZug(zustand, wesen) {
  const plan = [];
  if (!zustand || !zustand.karte || !wesen || !wesen.lebt) return plan;
  if (zustand.vorbei) return plan;
  const dran = amZugWesen(zustand);
  if (!dran || dran.id !== wesen.id) return plan;

  const schatten = schattenZustand(zustand);
  const ich = wesenMitId(schatten, wesen.id);
  if (!ich) return plan;
  const lage = macheLage(schatten);

  for (let n = 0; n < HOECHSTENS_SCHRITTE; n++) {
    const aktion = entscheide(lage, ich);
    if (!aktion || aktion.typ === AKTION.zugEnde) break;
    plan.push(aktion);
    if (!schattenSchritt(schatten, ich, aktion)) break;
    if (!ich.lebt) break;
  }
  plan.push({ typ: AKTION.zugEnde, wer: wesen.id });
  return plan;
}
