/* [Aufgabe: Regelkern] Die Aktionen — was ein Wesen in seinem Zug tun
   darf, was es kostet und welche Ereignisse dabei entstehen.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Das ist die Datei, an der das ganze Spiel hängt. Über die Leitung
   geht **eine Aktion** — „Wesen 3 geht nach (12, 8)" —, und alle vier
   Rechner rechnen daraus dieselbe Ereignisliste aus. Diese Datei ist
   die Stelle, an der entschieden wird, **welche** Regel eine Aktion
   auslöst und in welcher Reihenfolge — und deshalb steht hier keine
   Zahl, die anderswo schon steht: Die Preise eines Schrittes kommen
   aus `spiel/hoehen.mjs`, der Weg aus `spiel/wegfindung.mjs`, der
   Kampf aus `spiel/kampf.mjs`, die Waffenwerte aus
   `spiel/katalog/waffen.mjs`, die Zugordnung aus `spiel/zug.mjs`.

   **Warum eine Aktion flach ist.** `{typ, wer, ziel}` — Zahlen und
   Zeichenketten, kein Objektzeiger, kein Pfad. Der Pfad wird hier
   **selbst gesucht**: Schickte der Absender ihn mit, könnte ein
   Rechner mit einem anderen Pfad rechnen als die anderen, und das
   Netz merkte es erst an der Prüfsumme. Der Weg ist eine Folgerung
   aus dem Ziel, keine Angabe des Spielers.

   **Warum `wendeAn` wirft statt still nichts zu tun.** Eine abgelehnte
   Aktion darf **nichts** verändert haben (Fehlerbuch E2). Das lässt
   sich nur halten, wenn geprüft wird, **bevor** irgendetwas angefasst
   wird — deshalb ist `pruefeAktion` der erste Schritt von `wendeAn`,
   und ein „Grund" bricht sofort ab. Ein stilles `[]` wäre schlimmer
   als ein Abbruch: Im Netz hieße das, dass ein Rechner die Aktion
   ausgeführt hat und ein anderer nicht.

   **Warum die Wacht mitten in der Bewegung auslöst.** Der Fall, den
   man beim ersten Bauen vergisst (Fehlerbuch E3): Eine Bewegung ist
   keine Verschiebung von A nach B, sondern eine Folge von Schritten.
   Nach **jedem** Feld wird gefragt, ob jemand auf Wacht steht, der
   das Feld sieht und in Reichweite hat. Löst eine Wacht aus, endet
   der laufende Bewegungsabschnitt: Es wird ein `bewegt` bis genau
   dorthin gemeldet, dann der Schuss, dann — wenn das Wesen noch lebt —
   ein neuer Abschnitt. Nur so weiß das Bild, **wo** die Figur stand,
   als der Bolzen kam; ein einziges `bewegt` über den ganzen Weg
   könnte das nicht sagen, weil die Ereignisform der Wacht kein Feld
   trägt.

   **Warum hier keine Kampfrechnung steht.** Treffer, Schaden,
   Rüstung, Brand, Stoß und Fläche rechnet `spiel/kampf.mjs`, die
   Wesenwerte `spiel/wesen.mjs`, die Preise eines Schrittes
   `spiel/hoehen.mjs`. Diese Datei entscheidet nur, **welche** dieser
   Rechnungen eine Aktion auslöst, und in welcher Reihenfolge. Eine
   eigene Trefferchance an dieser Stelle wäre der schlimmste Fehler,
   den dieser Aufbau kennt: vier Rechner mit zwei Meinungen über
   denselben Wurf — und das Netz merkte es erst eine Runde später an
   der Prüfsumme.

   **Zwei Ergänzungen zum Schnittstellenvertrag**, beide additiv:
   `{art:"lpGesetzt", wer, lp}` — für Heilung gibt es im Vertrag keine
   Form, und ein `schaden` mit negativer Zahl wäre eine Lüge an das
   Bild; die Vorlage ist `apGesetzt`. Und `{art:"lichtNeu", x, y,
   lichtArt, staerke}` statt `art:"fackel"` — im Vertrag steht `art`
   dort zweimal im selben Objekt, was nicht geht; `lichtArt` ist der
   Name, den `spiel/katalog/faehigkeiten.mjs` ohnehin benutzt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/kampf.mjs` (der ganze Angriff — Trefferchance, Reichweite,
   Schaden, Rüstung, Besonderheiten), `spiel/wesen.mjs` (wer wo steht,
   Wirkungen anhängen), `spiel/zug.mjs` (wer am Zug ist, Sicht,
   Schaden außerhalb eines Angriffs, Zugende), `spiel/hoehen.mjs`
   (Sturz, Stoß, Lava), `spiel/wegfindung.mjs` (Weg und
   erreichbare Felder), `spiel/sicht.mjs` und `spiel/licht.mjs` (wer
   wen überhaupt erkennt), `spiel/katalog/waffen.mjs` und
   `spiel/katalog/faehigkeiten.mjs` (die Zettel mit den Zahlen),
   `spiel/gegner-ki.mjs` (fragt `moeglicheAktionen`), `netz/sitzung.mjs`
   (schickt Aktionen, nicht Ereignisse), `runtime/zeichnen.js` (spielt
   die Ereignisse ab), `werkzeuge/pruefe-zug.mjs`. */

import { HINDERNIS, richtungen, abstand, gespiegelt } from "./gitter.mjs";
import {
  sturzTiefe, sturzSchaden, stossZiel, betretenSchaden, abgrundHinter, abgrundSturz
} from "./hoehen.mjs";
import { sichtlinie } from "./sicht.mjs";
import { helligkeitsfeld, istVerborgen, SICHT_IM_DUNKELN } from "./licht.mjs";
import { wegSuche, erreichbareFelder } from "./wegfindung.mjs";
import { waffe } from "./katalog/waffen.mjs";
import { faehigkeit, kenntFaehigkeit } from "./katalog/faehigkeiten.mjs";
import { wesenBei, belegtPruefer, wirkungAnhaengen } from "./wesen.mjs";
import { fuehreAngriffAus, inReichweite } from "./kampf.mjs";
import {
  amZugWesen, zugBeenden, wesenMitId, sichtVon, setzeWirkung,
  abklingtNoch, hatWirkung, fuegeSchadenZu, laufEndeEintragen
} from "./zug.mjs";

/* Die acht Aktionsarten. Als benanntes Bündel und nicht als lose
   Zeichenketten: Ein Tippfehler im Netzpaket soll als „Die Aktion
   ... gibt es nicht" auffallen, nicht als stumm übersprungener Zug. */
export const AKTION = {
  gehen: "gehen",
  angriff: "angriff",
  stoss: "stoss",
  faehigkeit: "faehigkeit",
  trank: "trank",
  aufheben: "aufheben",
  wacht: "wacht",
  zugEnde: "zugEnde"
};

const ALLE_TYPEN = new Set(Object.values(AKTION));

/* Die Preise, die nicht aus einem Katalog kommen. Sie stehen als
   Zahlen hier, weil jede Änderung daran eine Regeländerung ist — sie
   gehört in den Changelog, nicht in ein Menü. */
export const STOSS_KOSTEN = 2;
export const TRANK_KOSTEN = 2;
export const AUFHEBEN_KOSTEN = 1;
/* Wacht kostet **alle** übrigen Punkte, aber niemals weniger als
   zwei: Sonst könnte ein Wesen mit einem Restpunkt den ganzen Gang
   sperren, und Wacht wäre kein Verzicht mehr, sondern ein Rest. */
export const WACHT_MINDEST_AP = 2;

export const TRANK_HEILUNG = 10;

/* Was in Truhen und Särgen liegt. Kurze Liste, feste Reihenfolge:
   `zufall.ausListe` geht sie durch, und zwei Rechner müssen dieselbe
   Folge sehen (Fehlerbuch B2). */
export const BEUTE_ARTEN = ["trank", "gold"];

/* Was `aufheben` öffnet — nur was ohnehin Beute trägt. Fass und Kiste
   sind Deckung, kein Schrank; sie gehen nur mit dem Grabgriff auf. */
export const BEUTE_HINDERNISSE = new Set([HINDERNIS.truhe, HINDERNIS.sarg]);
export const OEFFENBARE_HINDERNISSE = new Set([
  HINDERNIS.truhe, HINDERNIS.sarg, HINDERNIS.fass, HINDERNIS.kiste
]);

/* Welche Wirkungsart auf ein Wesen zielt, welche auf ein Feld. Der
   Rest wirkt auf sich selbst und trägt `aufSich` im Katalog. */
const ZIEL_WIRKUNGEN = new Set([
  "schaden", "heilen", "stossen", "ziehen", "verlangsamen", "brennen"
]);
const FELD_WIRKUNGEN = new Set(["licht", "sprung", "oeffnen"]);

/* ── Die Lage eines Aufrufs ────────────────────────────────────────

   Das Helligkeitsfeld kostet je Licht eine Fläche; es wird je Aufruf
   **einmal** gerechnet und danach nur befragt. Legt eine Fähigkeit
   ein neues Licht, wird es verworfen und beim nächsten Bedarf neu
   gerechnet — sonst schösse jemand noch im alten Dunkel. */
function macheLage(zustand) {
  let hell = null;
  return {
    zustand,
    karte: zustand.karte,
    helligkeit() {
      if (hell === null) hell = helligkeitsfeld(zustand.karte);
      return hell;
    },
    lichtGeaendert() { hell = null; }
  };
}

/* ── Kleine Fragen an den Zustand ──────────────────────────────────*/

/* Wer steht hier? `spiel/wesen.mjs` beantwortet das — dort steht auch
   der Grund, warum Tote nicht zählen. */
function wesenAuf(zustand, x, y) {
  return wesenBei(zustand.wesen, x, y) || null;
}

/* Die Sperrfunktion für die Wegsuche, als Momentaufnahme aller
   lebenden Figuren. Das eigene Feld ist darin mitgesperrt, und das
   ist richtig so: `wegSuche` nimmt das Startfeld ohnehin immer
   hinein, und ein kürzester Weg kehrt nie dorthin zurück. */
function belegtJetzt(zustand) {
  return belegtPruefer(zustand.wesen);
}

function waffeVon(wesen) {
  return waffe(wesen.waffe);
}

/* Steht `ziel` für `beobachter` im Dunkeln? Die Regel aus
   `spiel/licht.mjs`, dazu die Fähigkeit `verbergen`: Wer sie wirkt,
   gilt als verborgen, auch im Hellen — aber nach derselben Elle, also
   erst jenseits von `SICHT_IM_DUNKELN` Feldern. Auge in Auge
   versteckt sich niemand. */
function verborgenFuer(lage, beobachter, ziel) {
  if (hatWirkung(ziel, "verbergen")
    && abstand(beobachter.x, beobachter.y, ziel.x, ziel.y) > SICHT_IM_DUNKELN) {
    return true;
  }
  return istVerborgen(lage.karte, lage.helligkeit(), beobachter, ziel);
}

/* Sieht `beobachter` das `ziel` wirklich — Reichweite des Auges,
   freie Linie, nicht im Dunkeln? Drei Fragen, eine Antwort; sonst
   stellt jede Aktion zwei davon und vergisst die dritte. */
function erkannt(lage, beobachter, ziel) {
  const karte = lage.karte;
  if (!karte.drin(beobachter.x, beobachter.y) || !karte.drin(ziel.x, ziel.y)) return false;
  if (abstand(beobachter.x, beobachter.y, ziel.x, ziel.y) > sichtVon(beobachter)) {
    return false;
  }
  if (!sichtlinie(karte, beobachter.x, beobachter.y, ziel.x, ziel.y)) return false;
  return !verborgenFuer(lage, beobachter, ziel);
}

function wegFuer(zustand, wesen, nach, maxKosten) {
  return wegSuche(zustand.karte, { x: wesen.x, y: wesen.y }, nach, {
    belegt: belegtJetzt(zustand),
    maxKosten
  });
}

function ganzesFeld(feld) {
  return !!feld && Number.isInteger(feld.x) && Number.isInteger(feld.y);
}

/* ── Was eine Aktion kostet ────────────────────────────────────────

   `Infinity` heißt „von hier aus gar nicht" — und nicht 0. Eine 0
   rutschte durch jede Punkteprüfung und ließe die Aktion umsonst
   geschehen. */
export function kostenVon(zustand, aktion) {
  if (!zustand || !aktion) return Infinity;
  const wesen = wesenMitId(zustand, aktion.wer);
  if (!wesen) return Infinity;

  switch (aktion.typ) {
    case AKTION.gehen: {
      if (!ganzesFeld(aktion.nach)) return Infinity;
      const weg = wegFuer(zustand, wesen, aktion.nach, Infinity);
      return weg ? weg.kosten : Infinity;
    }
    case AKTION.angriff:
      return waffeVon(wesen).ap;
    case AKTION.stoss:
      return STOSS_KOSTEN;
    case AKTION.faehigkeit:
      return kenntFaehigkeit(aktion.schluessel) ? faehigkeit(aktion.schluessel).ap : Infinity;
    case AKTION.trank:
      return TRANK_KOSTEN;
    case AKTION.aufheben:
      return AUFHEBEN_KOSTEN;
    case AKTION.wacht:
      return wesen.ap > WACHT_MINDEST_AP ? wesen.ap : WACHT_MINDEST_AP;
    case AKTION.zugEnde:
      return 0;
    default:
      return Infinity;
  }
}

/* ── Darf das? ─────────────────────────────────────────────────────

   Gibt `null`, wenn die Aktion erlaubt ist, sonst den Grund als
   deutschen Satz — die Oberfläche zeigt ihn wörtlich an, das Netz
   schreibt ihn ins Abbruchprotokoll. Die Punkteprüfung steht
   **zuletzt**: Erst wenn feststeht, dass die Aktion überhaupt möglich
   wäre, ist „dafür fehlen Punkte" die richtige Auskunft. */
export function pruefeAktion(zustand, aktion) {
  if (!zustand) return "Es gibt keinen Spielstand.";
  if (zustand.vorbei) return "Der Lauf ist vorbei.";
  if (!aktion || typeof aktion !== "object") return "Das ist keine Aktion.";
  if (!ALLE_TYPEN.has(aktion.typ)) return `Die Aktion „${aktion.typ}" gibt es nicht.`;

  const wesen = wesenMitId(zustand, aktion.wer);
  if (!wesen) return "Dieses Wesen gibt es nicht.";
  if (!wesen.lebt) return "Dieses Wesen lebt nicht mehr.";
  const dran = amZugWesen(zustand);
  if (!dran || dran.id !== wesen.id) return "Dieses Wesen ist nicht am Zug.";

  const grund = pruefeInhalt(zustand, aktion, wesen);
  if (grund) return grund;

  const kosten = kostenVon(zustand, aktion);
  if (!Number.isFinite(kosten)) return "Diese Aktion ist von hier aus nicht möglich.";
  if (kosten > wesen.ap) {
    return `Dafür fehlen Aktionspunkte: ${kosten} nötig, ${wesen.ap} übrig.`;
  }
  return null;
}

function pruefeInhalt(zustand, aktion, wesen) {
  const lage = macheLage(zustand);
  switch (aktion.typ) {
    case AKTION.gehen: return pruefeGehen(zustand, aktion, wesen);
    case AKTION.angriff: return pruefeAngriff(lage, aktion, wesen);
    case AKTION.stoss: return pruefeStoss(lage, aktion, wesen);
    case AKTION.faehigkeit: return pruefeFaehigkeit(lage, aktion, wesen);
    case AKTION.trank:
      return wesen.traenke > 0 ? null : "Es ist kein Trank mehr im Gepäck.";
    case AKTION.aufheben:
      return beuteFeldNeben(zustand, wesen) ? null : "Hier ist nichts zum Aufheben.";
    case AKTION.wacht:
      return wesen.wacht ? "Dieses Wesen steht schon auf Wacht." : null;
    default: return null;
  }
}

function pruefeGehen(zustand, aktion, wesen) {
  if (!ganzesFeld(aktion.nach)) return "Dieses Feld gibt es nicht.";
  const { x, y } = aktion.nach;
  if (!zustand.karte.drin(x, y)) return "Dieses Feld liegt außerhalb der Karte.";
  if (x === wesen.x && y === wesen.y) return "Dort steht das Wesen bereits.";
  if (zustand.karte.blocktBewegung(x, y)) return "Dorthin führt kein Weg.";
  const dort = wesenAuf(zustand, x, y);
  if (dort && dort.id !== wesen.id) return "Dort steht schon jemand.";
  if (!wegFuer(zustand, wesen, aktion.nach, Infinity)) return "Dorthin führt kein Weg.";
  return null;
}

/* Ein Ziel für Waffe oder Fähigkeit: Es muss leben, auf der anderen
   Seite stehen und erkannt sein. Die Seitenprüfung ist keine
   Höflichkeit — ohne sie könnte die Gegner-KI die eigene Brut
   niederschießen und der Lauf endete von selbst. */
function pruefeGegnerisches(lage, wesen, ziel) {
  if (!ziel) return "Dieses Ziel gibt es nicht.";
  if (!ziel.lebt) return "Dieses Ziel lebt nicht mehr.";
  if (ziel.id === wesen.id) return "Auf sich selbst zielt niemand.";
  if (ziel.seite === wesen.seite) return "Das ist die eigene Seite.";
  if (!erkannt(lage, wesen, ziel)) return "Dieses Ziel ist nicht zu sehen.";
  return null;
}

/* Reichweite und freie Bahn beantwortet `spiel/kampf.mjs` — dieselbe
   Frage, die `fuehreAngriffAus` gleich noch einmal stellt, bevor es
   losschlägt. Zwei Antworten darauf wären ein Angriff, den die
   Oberfläche anbietet und der Kern verweigert. */
function pruefeAngriff(lage, aktion, wesen) {
  const ziel = wesenMitId(lage.zustand, aktion.ziel);
  const grund = pruefeGegnerisches(lage, wesen, ziel);
  if (grund) return grund;
  if (!inReichweite(lage.karte, wesen, ziel, waffeVon(wesen))) {
    return "Das Ziel steht außer Reichweite.";
  }
  return null;
}

function pruefeStoss(lage, aktion, wesen) {
  const ziel = wesenMitId(lage.zustand, aktion.ziel);
  const grund = pruefeGegnerisches(lage, wesen, ziel);
  if (grund) return grund;
  if (abstand(wesen.x, wesen.y, ziel.x, ziel.y) > 1) {
    return "Zum Stoßen muss man daneben stehen.";
  }
  return pruefeSchub(lage, wesen.x, wesen.y, ziel, true);
}

/* Wohin ein Schub führt — und ob dort überhaupt Platz ist.
   `stossZiel` kennt Wände und Kanten, aber keine Figuren; wer dahinter
   steht, weiß nur der Zustand.

   Sagt `stossZiel` nein, ist die Sache noch nicht zu Ende: Hinter dem
   Ziel kann ein **Abgrund** liegen. Der blockt die Bewegung, also
   lehnt `stossZiel` ihn ab — genau richtig, denn niemand geht dort
   freiwillig hin. Gestoßen wird man aber sehr wohl hinein, und dann
   ist der Schub erlaubt.

   Diese zweite Frage steht hier und in `schiebe`, und das ist keine
   Doppelung, sondern die Bedingung dafür, dass beides dasselbe sagt:
   Würde nur hier gefragt und dort nicht, gäbe es eine Aktion, die die
   Oberfläche anbietet, die bezahlt wird und die nichts tut. */
function pruefeSchub(lage, ausX, ausY, ziel, weg) {
  const feld = schubFeld(lage.karte, ausX, ausY, ziel, weg);
  if (feld) {
    if (wesenAuf(lage.zustand, feld.x, feld.y)) return "Dahinter steht schon jemand.";
    return null;
  }
  const sturz = schubSturz(lage.karte, ausX, ausY, ziel, weg);
  if (!sturz) return "In diese Richtung geht es nicht weiter.";
  /* Ein bodenloser Schacht hat kein Landefeld — dort steht nie jemand,
     und der Stoß ist immer erlaubt. */
  const auf = sturz.ziel;
  if (auf && wesenAuf(lage.zustand, auf.x, auf.y)) return "Dahinter steht schon jemand.";
  return null;
}

/* Ein Feld weg vom Punkt (ausX, ausY) — oder auf ihn zu. Das Ziehen
   benutzt dieselbe Regel wie das Stoßen, nur vom gespiegelten Punkt
   aus: So gibt es genau **eine** Vorschrift dafür, welche der sechs
   Richtungen gilt, und ein Angreifer zwischen zwei Richtungen fällt in
   beiden Fällen gleich heraus.

   Gespiegelt wird über `gespiegelt` aus `gitter.mjs` und nicht mehr mit
   `2 * ziel - aus`: Auf dem Sechseckraster liegt der gespiegelte Punkt
   sonst neben der Achse, sobald die beiden Zeilen verschiedene Parität
   haben — und dann zog die Hakenkette niemanden mehr. */
function schubPunkt(ausX, ausY, ziel, weg) {
  return weg ? { x: ausX, y: ausY } : gespiegelt(ausX, ausY, ziel.x, ziel.y);
}

function schubFeld(karte, ausX, ausY, ziel, weg) {
  const aus = schubPunkt(ausX, ausY, ziel, weg);
  return stossZiel(karte, aus.x, aus.y, ziel.x, ziel.y);
}

/* Dasselbe für den Abgrund: Liegt hinter dem Ziel ein Loch, dann sagt
   das Ergebnis, wohin die Figur stürzt (`ziel`), wie viel das kostet
   (`schaden`) und ob es sie umbringt (`toedlich`). `null`, wenn dort
   kein Loch liegt. */
function schubSturz(karte, ausX, ausY, ziel, weg) {
  const aus = schubPunkt(ausX, ausY, ziel, weg);
  const loch = abgrundHinter(karte, aus.x, aus.y, ziel.x, ziel.y);
  if (!loch) return null;
  const sturz = abgrundSturz(karte, loch.x, loch.y, karte.ebeneBei(ziel.x, ziel.y));
  return { loch, ...sturz };
}

function pruefeFaehigkeit(lage, aktion, wesen) {
  const schluessel = aktion.schluessel;
  if (!kenntFaehigkeit(schluessel)) return `Die Fähigkeit „${schluessel}" gibt es nicht.`;
  const liste = wesen.faehigkeiten || [];
  if (!liste.includes(schluessel)) return "Diese Fähigkeit hat das Wesen nicht.";
  if (abklingtNoch(wesen, schluessel)) return "Diese Fähigkeit klingt noch ab.";

  const f = faehigkeit(schluessel);
  const wirkung = f.wirkung;
  if (wirkung.aufSich === true) return null;

  if (ZIEL_WIRKUNGEN.has(wirkung.art)) {
    const ziel = wesenMitId(lage.zustand, aktion.ziel);
    /* Heilen ist die eine Wirkung, die auf die **eigene** Seite geht. */
    if (wirkung.art === "heilen") {
      if (!ziel || !ziel.lebt) return "Dieses Ziel gibt es nicht.";
      if (ziel.seite !== wesen.seite) return "Geheilt wird nur die eigene Seite.";
      if (!erkannt(lage, wesen, ziel)) return "Dieses Ziel ist nicht zu sehen.";
    } else {
      const grund = pruefeGegnerisches(lage, wesen, ziel);
      if (grund) return grund;
    }
    if (abstand(wesen.x, wesen.y, ziel.x, ziel.y) > f.reichweite) {
      return "Das Ziel steht außer Reichweite.";
    }
    if (wirkung.art === "stossen") return pruefeSchub(lage, wesen.x, wesen.y, ziel, true);
    if (wirkung.art === "ziehen") return pruefeSchub(lage, wesen.x, wesen.y, ziel, false);
    return null;
  }

  if (FELD_WIRKUNGEN.has(wirkung.art)) {
    if (!ganzesFeld(aktion.feld)) return "Dazu fehlt das Feld.";
    const { x, y } = aktion.feld;
    if (!lage.karte.drin(x, y)) return "Dieses Feld liegt außerhalb der Karte.";
    const weite = wirkung.art === "sprung"
      ? Math.min(f.reichweite, wirkung.felder)
      : f.reichweite;
    if (abstand(wesen.x, wesen.y, x, y) > weite) return "Das Feld liegt zu weit weg.";
    if (wirkung.art === "sprung") return pruefeSprung(lage, wesen, x, y, wirkung);
    if (wirkung.art === "oeffnen") {
      if (!OEFFENBARE_HINDERNISSE.has(lage.karte.hindernisBei(x, y))) {
        return "Dort ist nichts zu öffnen.";
      }
      return null;
    }
    if (lage.karte.blocktBewegung(x, y)) return "Dort lässt sich kein Licht setzen.";
    return null;
  }
  return null;
}

/* Ein Satzsprung trägt eine Ebene hinauf, ohne dass eine Rampe dort
   liegt — das ist sein ganzer Sinn. Er trägt aber nicht hinab: Wer
   zwei Ebenen tiefer will, springt nicht, er fällt, und dafür gibt es
   die Sturzregel. */
function pruefeSprung(lage, wesen, x, y, wirkung) {
  const karte = lage.karte;
  if (karte.blocktBewegung(x, y)) return "Dort ist kein Platz zum Landen.";
  if (wesenAuf(lage.zustand, x, y)) return "Dort steht schon jemand.";
  const von = karte.ebeneBei(wesen.x, wesen.y);
  const nach = karte.ebeneBei(x, y);
  const hinauf = Number.isFinite(wirkung.ebenen) ? wirkung.ebenen : 1;
  if (nach - von > hinauf) return "So hoch trägt der Sprung nicht.";
  if (von - nach >= 2) return "So tief ist das kein Sprung mehr, sondern ein Sturz.";
  if (!sichtlinie(karte, wesen.x, wesen.y, x, y)) return "Dorthin ist keine freie Bahn.";
  return null;
}

/* Das erste Nachbarfeld mit etwas, das Beute trägt — in der
   Reihenfolge aus `richtungen` (Nord, Ost, Süd, West). Feste
   Reihenfolge, weil `aufheben` kein Feld mitschickt und die Wahl
   damit hier fällt (Fehlerbuch B2). */
function beuteFeldNeben(zustand, wesen) {
  for (const r of richtungen(wesen.y)) {
    const x = wesen.x + r.dx;
    const y = wesen.y + r.dy;
    if (!zustand.karte.drin(x, y)) continue;
    if (BEUTE_HINDERNISSE.has(zustand.karte.hindernisBei(x, y))) return { x, y };
  }
  return null;
}

/* ── Ereignisse bauen ──────────────────────────────────────────────*/

function bezahle(wesen, kosten, ereignisse) {
  if (!(kosten > 0)) return;
  wesen.ap -= kosten;
  if (wesen.ap < 0) wesen.ap = 0;
  ereignisse.push({ art: "apGesetzt", wer: wesen.id, ap: wesen.ap });
}

function heile(wesen, wieviel, ereignisse) {
  if (!wesen.lebt || !(wieviel > 0)) return;
  const vorher = wesen.lp;
  const oben = Number.isFinite(wesen.lpMax) ? wesen.lpMax : wesen.lp + wieviel;
  wesen.lp = Math.min(oben, wesen.lp + wieviel);
  if (wesen.lp !== vorher) {
    ereignisse.push({ art: "lpGesetzt", wer: wesen.id, lp: wesen.lp });
  }
}

/* Ein Angriff. Hier steht keine Zeile Kampfrechnung mehr: Treffer,
   Schaden, Rüstung, Brand, Stoß und Fläche macht `spiel/kampf.mjs`,
   und zwar für den gewöhnlichen Schlag wie für den Schuss aus der
   Wacht. Eine zweite Trefferrechnung an dieser Stelle wäre genau der
   Fehler, den der ganze Aufbau vermeiden soll — vier Rechner, zwei
   Meinungen über denselben Wurf.

   `fuehreAngriffAus` zieht die Punkte selbst ab; deshalb bezahlt
   `wendeAn` einen Angriff nicht noch einmal. */
function angriffAusfuehren(lage, angreifer, ziel, ereignisse) {
  ereignisse.push(...fuehreAngriffAus(lage.zustand, angreifer, ziel, waffeVon(angreifer)));
}

/* Ein Wesen um bis zu `felder` Felder schieben (`weg`) oder ziehen.
   Ein Sturz beendet das Schieben sofort: Wer fällt, fliegt nicht
   weiter, und seine übrigen Punkte sind hin. */
function schiebe(lage, ziel, ausX, ausY, felder, weg, ereignisse) {
  const karte = lage.karte;
  for (let schritt = 0; schritt < felder; schritt++) {
    if (!ziel.lebt) return;
    const feld = schubFeld(karte, ausX, ausY, ziel, weg);
    /* Kein begehbares Feld dahinter — vielleicht ein Loch. Auch der
       Sturz beendet das Schieben: Wer fällt, fliegt nicht weiter. */
    if (!feld) { stossInsLoch(lage, ziel, ausX, ausY, weg, ereignisse); return; }
    if (wesenAuf(lage.zustand, feld.x, feld.y)) return;

    const von = { x: ziel.x, y: ziel.y };
    const vonEbene = karte.ebeneBei(von.x, von.y);
    const stufen = sturzTiefe(karte, von.x, von.y, feld.x, feld.y);
    ziel.x = feld.x;
    ziel.y = feld.y;
    const nachEbene = karte.ebeneBei(ziel.x, ziel.y);
    ereignisse.push({ art: "gestossen", wer: ziel.id, von, nach: { x: ziel.x, y: ziel.y } });
    if (nachEbene !== vonEbene) {
      ereignisse.push({ art: "ebeneGewechselt", wer: ziel.id, von: vonEbene, nach: nachEbene });
    }

    if (stufen > 0) {
      const schaden = sturzSchaden(stufen);
      ereignisse.push({
        art: "gestuerzt", wer: ziel.id, von, nach: { x: ziel.x, y: ziel.y }, stufen, schaden
      });
      ziel.ap = 0;
      ereignisse.push({ art: "apGesetzt", wer: ziel.id, ap: 0 });
      fuegeSchadenZu(ziel, schaden, "sturz", "sturz", ereignisse);
      lavaPruefen(lage, ziel, ereignisse);
      return;
    }
    lavaPruefen(lage, ziel, ereignisse);
  }
}

/* Der Stoß in den Abgrund. Getrennt von `schiebe`, weil sich der
   Ablauf an einer Stelle wirklich unterscheidet: Beim gewöhnlichen
   Schub steht am Ende immer eine Figur auf einem Feld, hier steht
   vielleicht keine mehr.

   Die Reihenfolge der Ereignisse ist dieselbe wie beim Sturz über eine
   Kante — `gestossen`, `ebeneGewechselt`, `gestuerzt`, Punkte weg,
   Schaden —, damit das Bild nur einen Fall kennt.

   **Der bodenlose Schacht tötet über den gewöhnlichen Schadensweg**
   (`fuegeSchadenZu` mit den restlichen Lebenspunkten) und nicht über
   ein eigenes `wesen.lebt = false`. So läuft alles daran Hängende
   mit: das Ereignis `gestorben`, das gelöschte Wacht-Recht, der
   Lauf-Abschluss. Ein zweiter Todesweg wäre die Naht, an der eines
   davon eines Tages fehlt. */
function stossInsLoch(lage, ziel, ausX, ausY, weg, ereignisse) {
  const karte = lage.karte;
  const sturz = schubSturz(karte, ausX, ausY, ziel, weg);
  if (!sturz) return;
  if (sturz.ziel && wesenAuf(lage.zustand, sturz.ziel.x, sturz.ziel.y)) return;

  const von = { x: ziel.x, y: ziel.y };
  const vonEbene = karte.ebeneBei(von.x, von.y);
  /* Wohin die Leiche fällt, wenn es keinen Grund gibt: in das Loch
     selbst. Sie liegt dann auf einer gesperrten Kachel — das ist
     unbedenklich, weil `wesenBei` nur Lebende zählt, und es ist die
     einzige Stelle, an der der Sturz sichtbar wird. */
  const nach = sturz.ziel || sturz.loch;
  ziel.x = nach.x;
  ziel.y = nach.y;
  const nachEbene = karte.ebeneBei(nach.x, nach.y);
  ereignisse.push({ art: "gestossen", wer: ziel.id, von, nach: { x: nach.x, y: nach.y } });
  if (nachEbene !== vonEbene) {
    ereignisse.push({ art: "ebeneGewechselt", wer: ziel.id, von: vonEbene, nach: nachEbene });
  }

  const schaden = sturz.toedlich ? ziel.lp : sturz.schaden;
  ereignisse.push({
    art: "gestuerzt", wer: ziel.id, von, nach: { x: nach.x, y: nach.y },
    stufen: sturz.stufen, schaden, abgrund: true, toedlich: sturz.toedlich
  });
  ziel.ap = 0;
  ereignisse.push({ art: "apGesetzt", wer: ziel.id, ap: 0 });
  fuegeSchadenZu(ziel, schaden, "sturz", "sturz", ereignisse);
  lavaPruefen(lage, ziel, ereignisse);
}

function lavaPruefen(lage, wesen, ereignisse) {
  if (!wesen.lebt) return;
  const schaden = betretenSchaden(lage.karte, wesen.x, wesen.y);
  if (schaden) fuegeSchadenZu(wesen, schaden.wieviel, "lava", schaden.art, ereignisse);
}

/* ── Die Wacht ─────────────────────────────────────────────────────

   Wer auf Wacht steht, schießt, sobald ein Gegner in Sicht **und**
   Waffenreichweite tritt. Einmal — danach ist die Wacht verbraucht;
   bezahlt wurde sie mit allen Punkten eines Zuges, nicht mit einem
   Dauerrecht.

   Durchgegangen wird `zustand.wesen` in Listenreihenfolge. Nicht in
   der Zugordnung: Die ändert sich je Runde, die Liste nicht — und
   zwei Rechner müssen dieselbe Folge sehen (Fehlerbuch B2). */
function wachtPruefen(lage, laeufer) {
  const ereignisse = [];
  if (!laeufer.lebt) return ereignisse;
  for (const wache of lage.zustand.wesen || []) {
    if (!wache || !wache.lebt || wache.wacht !== true) continue;
    if (wache.id === laeufer.id || wache.seite === laeufer.seite) continue;
    if (!erkannt(lage, wache, laeufer)) continue;
    if (!inReichweite(lage.karte, wache, laeufer, waffeVon(wache))) continue;

    wache.wacht = false;
    ereignisse.push({ art: "wachtLoest", wer: wache.id, ziel: laeufer.id });
    /* Der Schuss ist bezahlt — mit **allen** Punkten des Zuges, in
       dem die Wacht bezogen wurde. `fuehreAngriffAus` rechnet aber
       immer mit dem Waffenpreis ab; also bekommt der Wächter genau
       diesen Preis obendrauf und gibt ihn im selben Atemzug wieder
       aus. Aufgeschlagen und nicht gesetzt: So steht danach wieder
       genau da, was vorher dastand, auch wenn eine spätere Regel
       einem Wächter Punkte lässt. Der Umweg ist der Preis dafür, dass
       es **eine** Kampfrechnung gibt und nicht eine zweite für die
       Wacht. */
    wache.ap += waffeVon(wache).ap;
    angriffAusfuehren(lage, wache, laeufer, ereignisse);
    if (!laeufer.lebt) return ereignisse;
  }
  return ereignisse;
}

/* ── Gehen ─────────────────────────────────────────────────────────

   Feld für Feld, und nach jedem Feld die drei Fragen: Ist das ein
   Sturz? Steht hier Lava? Schießt jemand? Erst wenn etwas davon
   zutrifft, wird der bisherige Abschnitt als `bewegt` gemeldet — so
   bleibt der gewöhnliche Zug ein einziges Ereignis, und nur der
   unterbrochene zerfällt. */
function geheAus(lage, wesen, nach, ereignisse) {
  const karte = lage.karte;
  const weg = wegFuer(lage.zustand, wesen, nach, wesen.ap);
  if (!weg) return;

  const eintrag = (feld, kosten) => ({
    x: feld.x, y: feld.y, ebene: karte.ebeneBei(feld.x, feld.y), kosten
  });
  let abschnitt = [eintrag(weg.pfad[0], 0)];
  const meldeAbschnitt = () => {
    if (abschnitt.length > 1) {
      ereignisse.push({ art: "bewegt", wer: wesen.id, pfad: abschnitt, apRest: wesen.ap });
    }
    abschnitt = [abschnitt[abschnitt.length - 1]];
  };

  for (let i = 1; i < weg.pfad.length; i++) {
    const vorher = weg.pfad[i - 1];
    const jetzt = weg.pfad[i];
    const vonEbene = karte.ebeneBei(vorher.x, vorher.y);
    const stufen = sturzTiefe(karte, vorher.x, vorher.y, jetzt.x, jetzt.y);

    wesen.x = jetzt.x;
    wesen.y = jetzt.y;
    wesen.ap -= jetzt.kosten - vorher.kosten;
    if (wesen.ap < 0) wesen.ap = 0;
    abschnitt.push(eintrag(jetzt, jetzt.kosten));

    /* Was auf diesem Feld geschieht, wird gesammelt und erst nach dem
       `bewegt` gemeldet — das Bild braucht erst den Weg, dann das,
       was am Ende des Weges passiert ist. */
    const dazwischen = [];
    if (stufen > 0) {
      const schaden = sturzSchaden(stufen);
      dazwischen.push({
        art: "gestuerzt", wer: wesen.id,
        von: { x: vorher.x, y: vorher.y }, nach: { x: jetzt.x, y: jetzt.y }, stufen, schaden
      });
      wesen.ap = 0;
      dazwischen.push({ art: "apGesetzt", wer: wesen.id, ap: 0 });
      fuegeSchadenZu(wesen, schaden, "sturz", "sturz", dazwischen);
    }
    const nachEbene = karte.ebeneBei(jetzt.x, jetzt.y);
    if (nachEbene !== vonEbene) {
      dazwischen.push({
        art: "ebeneGewechselt", wer: wesen.id, von: vonEbene, nach: nachEbene
      });
    }
    lavaPruefen(lage, wesen, dazwischen);
    dazwischen.push(...wachtPruefen(lage, wesen));

    if (dazwischen.length > 0) {
      meldeAbschnitt();
      ereignisse.push(...dazwischen);
    }
    /* Tot bleibt liegen, gestürzt bleibt stehen — beides beendet den
       Weg mitten drin. */
    if (!wesen.lebt || stufen > 0) return;
  }
  meldeAbschnitt();
}

/* ── Fähigkeiten ───────────────────────────────────────────────────*/

function springe(lage, wesen, feld, ereignisse) {
  const karte = lage.karte;
  const vonEbene = karte.ebeneBei(wesen.x, wesen.y);
  const pfad = [
    { x: wesen.x, y: wesen.y, ebene: vonEbene, kosten: 0 }
  ];
  wesen.x = feld.x;
  wesen.y = feld.y;
  const nachEbene = karte.ebeneBei(feld.x, feld.y);
  pfad.push({ x: feld.x, y: feld.y, ebene: nachEbene, kosten: 0 });
  ereignisse.push({ art: "bewegt", wer: wesen.id, pfad, apRest: wesen.ap });
  if (nachEbene !== vonEbene) {
    ereignisse.push({ art: "ebeneGewechselt", wer: wesen.id, von: vonEbene, nach: nachEbene });
  }
  lavaPruefen(lage, wesen, ereignisse);
  ereignisse.push(...wachtPruefen(lage, wesen));
}

/* Öffnen und Aufheben sind dieselbe Handlung mit verschiedenem
   Schlüssel: Das Hindernis verschwindet, die Beute geht ins Gepäck.
   Wer die Eigenheit `truhenmeister` hat, bekommt zwei Stücke statt
   einem — das ist der ganze Grund, warum der Grabräuber mitkommt. */
function oeffne(lage, wesen, feld, ereignisse) {
  const karte = lage.karte;
  const was = karte.hindernisBei(feld.x, feld.y);
  karte.setze(feld.x, feld.y, { hindernis: HINDERNIS.keins });
  ereignisse.push({ art: "hindernisWeg", x: feld.x, y: feld.y, was });

  const meister = wesen.eigenheit && wesen.eigenheit.art === "truhenmeister";
  const stuecke = meister ? 2 : 1;
  for (let i = 0; i < stuecke; i++) {
    const beute = lage.zustand.zufall.ausListe(BEUTE_ARTEN);
    if (beute === "trank") wesen.traenke = (wesen.traenke || 0) + 1;
    else wesen.gold = (wesen.gold || 0) + 1;
    ereignisse.push({ art: "beute", wer: wesen.id, was: beute });
  }
}

function faehigkeitAusfuehren(lage, wesen, f, aktion, ereignisse) {
  const wirkung = f.wirkung;
  const ziel = wesenMitId(lage.zustand, aktion.ziel);
  const feld = aktion.feld;

  switch (wirkung.art) {
    case "schaden":
      fuegeSchadenZu(ziel, wirkung.wieviel, f.schluessel,
        wirkung.schadensart || "arkan", ereignisse);
      break;
    case "heilen":
      heile(ziel, wirkung.wieviel, ereignisse);
      break;
    case "stossen":
      schiebe(lage, ziel, wesen.x, wesen.y, wirkung.felder || 1, true, ereignisse);
      break;
    case "ziehen":
      schiebe(lage, ziel, wesen.x, wesen.y, wirkung.felder || 1, false, ereignisse);
      break;
    /* Fessel, Brand und Schild kennt `spiel/wesen.mjs`; sie werden
       dort angehängt, damit für sie dieselbe Zusammenlegungsregel
       gilt wie für den Brand einer Waffe. Die Wortwahl ist die von
       dort (`verlangsamt`, `brennt`) — der Katalog nennt die
       **Wirkungsart**, das Wesen den **Zustand**. */
    case "verlangsamen":
      wirkungAnhaengen(ziel, "verlangsamt", wirkung.runden, wirkung.apAbzug);
      break;
    case "brennen":
      wirkungAnhaengen(ziel, "brennt", wirkung.runden, wirkung.wieviel);
      break;
    case "schild":
      wirkungAnhaengen(wesen, "schild", wirkung.runden, wirkung.ruestung);
      break;
    case "sicht":
      setzeWirkung(wesen, { art: "sicht", zusatz: wirkung.zusatz, runden: wirkung.runden });
      break;
    case "verbergen":
      setzeWirkung(wesen, { art: "verbergen", runden: wirkung.runden });
      break;
    case "licht": {
      const licht = {
        x: feld.x, y: feld.y, art: wirkung.lichtArt,
        staerke: wirkung.staerke, runden: wirkung.runden
      };
      if (!Array.isArray(lage.karte.lichter)) lage.karte.lichter = [];
      lage.karte.lichter.push(licht);
      lage.lichtGeaendert();
      ereignisse.push({
        art: "lichtNeu", x: licht.x, y: licht.y,
        lichtArt: licht.art, staerke: licht.staerke
      });
      break;
    }
    case "sprung":
      springe(lage, wesen, feld, ereignisse);
      break;
    case "oeffnen":
      oeffne(lage, wesen, feld, ereignisse);
      break;
    default:
      break;
  }

  /* Der eigene Verlust zuletzt — sonst könnte der Bluthexer an seinem
     eigenen Zoll sterben, bevor der Zoll gewirkt hat. */
  if (wirkung.eigenerVerlust > 0) {
    fuegeSchadenZu(wesen, wirkung.eigenerVerlust, f.schluessel, "arkan", ereignisse);
  }
  if (f.abklingen > 0) {
    setzeWirkung(wesen, { art: "abklingen", schluessel: f.schluessel, runden: f.abklingen });
  }
}

/* ── Anwenden ──────────────────────────────────────────────────────*/

export function wendeAn(zustand, aktion) {
  const grund = pruefeAktion(zustand, aktion);
  if (grund) throw new Error(`Aktion abgelehnt: ${grund}`);

  if (!Array.isArray(zustand.protokoll)) zustand.protokoll = [];
  zustand.protokoll.push(aktion);

  const lage = macheLage(zustand);
  const wesen = wesenMitId(zustand, aktion.wer);
  const ereignisse = [];

  if (aktion.typ === AKTION.zugEnde) {
    ereignisse.push(...zugBeenden(zustand));
    return ereignisse;
  }

  /* Zwei Aktionen bezahlen nicht hier. **Gehen** bezahlt Schritt für
     Schritt und meldet den Rest im `bewegt`: Ein Weg kann unterwegs
     abbrechen — eine Wacht, ein Sturz —, und dann sind nur die
     gegangenen Felder bezahlt. Der **Angriff** bezahlt in
     `spiel/kampf.mjs`, weil der Preis in der Waffe steht und dort
     ausgerechnet wird. Alles andere ist im Voraus fällig. */
  if (aktion.typ !== AKTION.gehen && aktion.typ !== AKTION.angriff) {
    bezahle(wesen, kostenVon(zustand, aktion), ereignisse);
  }

  switch (aktion.typ) {
    case AKTION.gehen:
      geheAus(lage, wesen, aktion.nach, ereignisse);
      break;
    case AKTION.angriff:
      angriffAusfuehren(lage, wesen, wesenMitId(zustand, aktion.ziel), ereignisse);
      break;
    case AKTION.stoss:
      schiebe(lage, wesenMitId(zustand, aktion.ziel), wesen.x, wesen.y, 1, true, ereignisse);
      break;
    case AKTION.faehigkeit:
      faehigkeitAusfuehren(lage, wesen, faehigkeit(aktion.schluessel), aktion, ereignisse);
      break;
    case AKTION.trank:
      wesen.traenke -= 1;
      heile(wesen, TRANK_HEILUNG, ereignisse);
      break;
    case AKTION.aufheben:
      oeffne(lage, wesen, beuteFeldNeben(zustand, wesen), ereignisse);
      break;
    case AKTION.wacht:
      wesen.wacht = true;
      ereignisse.push({ art: "wacht", wer: wesen.id });
      break;
    default:
      break;
  }

  ereignisse.push(...laufEndeEintragen(zustand));
  /* Wer in seinem eigenen Zug fällt — durch Lava, eine Wacht oder den
     eigenen Blutzoll —, hat keinen Zug mehr. Der Zeiger dürfte sonst
     auf einer Leiche stehen bleiben, und `amZugWesen` gäbe `null`,
     ohne dass jemand weiterrücken könnte. */
  if (!zustand.vorbei && !wesen.lebt) ereignisse.push(...zugBeenden(zustand));
  return ereignisse;
}

/* ── Was ginge jetzt ───────────────────────────────────────────────

   Für die Gegner-KI und für die Oberfläche. Jeder Vorschlag läuft
   durch `pruefeAktion`, bevor er in die Liste kommt — damit kann die
   Liste nichts enthalten, was `wendeAn` ablehnen würde. Das ist die
   Eigenschaft, an der die Prüfung hängt: Zwei Wahrheiten über
   „erlaubt" gäbe es sonst, und die KI probierte irgendwann eine
   Aktion, die zurückgewiesen wird.

   Die Reihenfolge ist fest: Zugende, Wacht, Trank, Aufheben,
   Angriffe, Stöße, Fähigkeiten, Gehen. Innerhalb jeder Gruppe die
   Reihenfolge von `zustand.wesen` beziehungsweise der Feldindizes. */
export function moeglicheAktionen(zustand, wesen) {
  const raus = [];
  if (!zustand || !wesen) return raus;
  const dran = amZugWesen(zustand);
  if (!dran || dran.id !== wesen.id) return raus;

  const nimm = (aktion) => {
    if (pruefeAktion(zustand, aktion) === null) raus.push(aktion);
  };

  nimm({ typ: AKTION.zugEnde, wer: wesen.id });
  nimm({ typ: AKTION.wacht, wer: wesen.id });
  nimm({ typ: AKTION.trank, wer: wesen.id });
  nimm({ typ: AKTION.aufheben, wer: wesen.id });

  for (const anderer of zustand.wesen || []) {
    if (!anderer || anderer.id === wesen.id) continue;
    nimm({ typ: AKTION.angriff, wer: wesen.id, ziel: anderer.id });
  }
  for (const anderer of zustand.wesen || []) {
    if (!anderer || anderer.id === wesen.id) continue;
    nimm({ typ: AKTION.stoss, wer: wesen.id, ziel: anderer.id });
  }

  for (const schluessel of wesen.faehigkeiten || []) {
    if (!kenntFaehigkeit(schluessel)) continue;
    faehigkeitsAktionen(zustand, wesen, schluessel, nimm);
  }

  const felder = erreichbareFelder(zustand.karte, wesen.x, wesen.y, wesen.ap, {
    belegt: belegtJetzt(zustand)
  });
  for (const eintrag of felder.values()) {
    if (eintrag.x === wesen.x && eintrag.y === wesen.y) continue;
    nimm({ typ: AKTION.gehen, wer: wesen.id, nach: { x: eintrag.x, y: eintrag.y } });
  }
  return raus;
}

function faehigkeitsAktionen(zustand, wesen, schluessel, nimm) {
  const f = faehigkeit(schluessel);
  const wirkung = f.wirkung;

  if (wirkung.aufSich === true) {
    nimm({ typ: AKTION.faehigkeit, wer: wesen.id, schluessel, ziel: null, feld: null });
    return;
  }
  if (ZIEL_WIRKUNGEN.has(wirkung.art)) {
    for (const anderer of zustand.wesen || []) {
      if (!anderer) continue;
      nimm({
        typ: AKTION.faehigkeit, wer: wesen.id, schluessel, ziel: anderer.id, feld: null
      });
    }
    return;
  }
  /* Feldwirkungen: das Quadrat der Reichweite abgehen, Zeile für
     Zeile — dieselbe Ordnung wie `alleFelder` in `gitter.mjs`. */
  const weite = wirkung.art === "sprung"
    ? Math.min(f.reichweite, wirkung.felder)
    : f.reichweite;
  for (let y = wesen.y - weite; y <= wesen.y + weite; y++) {
    for (let x = wesen.x - weite; x <= wesen.x + weite; x++) {
      if (!zustand.karte.drin(x, y)) continue;
      nimm({
        typ: AKTION.faehigkeit, wer: wesen.id, schluessel, ziel: null, feld: { x, y }
      });
    }
  }
}
