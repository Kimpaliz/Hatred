/* [Aufgabe: Oberfläche] Die Bedienung: aus Zeiger — Maus, Finger,
   Stift — und Tastatur werden Aktionen, und aus nichts sonst.

   ── Warum diese Datei nichts entscheidet ───────────────────────────

   Eine Eingabe, die selbst anwendet, ist der kürzeste Weg zu vier
   verschiedenen Spielständen: Der eine Rechner hätte die Figur schon
   bewegt, während die Aktion noch unterwegs ist, und die Prüfzahl
   liefe eine Runde später auseinander. Deshalb gibt es hier genau
   einen Ausgang — `sende(aktion)` —, und der geht an
   `netz/sitzung.mjs`. Zurück kommt die Änderung erst als Ereignis.

   **Gefragt wird immer der Kern.** Ob ein Feld erreichbar ist, sagt
   `spiel/wegfindung.mjs`; ob eine Aktion erlaubt ist, sagt
   `pruefeAktion`; was ein Sturz kostet, sagt `spiel/hoehen.mjs`. Eine
   zweite Preisliste in dieser Datei wäre eine Vorschau, die etwas
   anderes verspricht, als der Zug dann tut — und das ist keine
   Ungenauigkeit, sondern eine Lüge an den Spieler.

   ── Warum während des Abspielens nichts angenommen wird ────────────

   Solange `runtime/zeichnen.js` eine Ereignisliste abspielt, steht
   die Welt zwischen zwei Wahrheiten: Die Figur ist auf dem Bild noch
   unterwegs, im Spielstand schon angekommen. Ein Klick in diesem
   Augenblick schickte eine Aktion, deren Voraussetzung sich gerade
   ändert. `sperre(true)` macht die Eingabe deshalb vollständig taub —
   und wirft beim Entsperren die gemerkte Reichweite weg, weil die
   Ereignisse sie ungültig gemacht haben.

   ── Warum es hier keine Mausereignisse mehr gibt ───────────────────

   Ein Tipp auf Android erzeugt nach `touchend` **zusätzlich**
   `mousedown` und `click`. Wer beide Wege hört, führt jede Aktion
   zweimal aus: zwei Züge, zwei Angriffe — und der zweite geht ins
   Leere, weil die Punkte vom ersten schon weg sind. Deshalb hört diese
   Datei nur noch auf Zeigerereignisse. Die bedienen Maus, Finger und
   Stift zugleich, und der Nachschlag aus dem Browser findet keinen
   Hörer mehr vor. `pointerType` sagt, womit gerade bedient wird.

   ── Warum der Finger zwei Schritte braucht ─────────────────────────

   Es gibt keinen Finger, der über einem Feld **schwebt**. Alles, was
   die Maus beim Schweben zeigt — Weg, Kosten, Höhe, Sturzwarnung,
   Trefferchance —, wäre auf dem Handy leer, und man liefe blind.
   Deshalb übernimmt der **erste** Tipp die Rolle des Schwebens: Er
   wählt an und zeigt, er tut nichts. Erst der **zweite** Tipp auf
   dasselbe Feld führt aus, und ein **dritter** hebt die Anwahl wieder
   auf — auf einem Handy gibt es kein `Esc`, und ohne diesen Ausgang
   steckte man in einem Modus fest.

   Für die Maus ändert sich dadurch nichts: Sie schwebt und klickt wie
   bisher. Die zwei Schritte gelten nur, wenn zuletzt mit dem Finger
   bedient wurde — `istFinger()` sagt es auch nach außen.

   ── Warum die Tastatur allein reichen muss ─────────────────────────

   Ein Spiel, das ohne Maus unbedienbar ist, schließt Leute aus. Die
   Pfeiltasten führen einen Feldzeiger über **jedes** Feld der Karte,
   `Enter` bestätigt. Der Zeiger läuft auch über Wände: Er ist ein
   Blick, keine Figur — sonst wäre die Karte für die Tastatur an jeder
   Mauer zu Ende, und die Maus käme weiter als die Tastatur.

   `WASD` bekommt den Zeiger **nicht**: `W` trägt schon die Wacht und
   `S` den Stoß, und zwei Bedeutungen auf einer Taste sind schlimmer
   als eine fehlende Zweitbelegung. Die Forderung „ohne Maus
   spielbar" tragen die Pfeiltasten allein.

   ── Warum `Esc` alles zurücksetzt und nicht nur den Modus ──────────

   Ein halb geräumter Zustand ist die Sorte Fehler, die man nicht
   sieht: Der Modus steht wieder auf Gehen, aber der Fähigkeitsschlüssel
   liegt noch daneben, und der nächste Klick wirkt einen Zauber, den
   niemand mehr angesagt hat. `Esc` stellt deshalb genau den Zustand
   her, den `macheEingabe` gerade gebaut hat — Zeiger auf der eigenen
   Figur, Modus Gehen, keine Warnung, Übersichtskarte zu.

   ── Warum die Knopfleiste ihre Maße selbst behält ──────────────────

   Wo ein Knopf liegt, weiß nur die Anzeige, die ihn gezeichnet hat.
   Rechnete diese Datei die Maße ein zweites Mal nach, gäbe es zwei
   Wahrheiten, und die liefen auseinander (Fehlerbuch E2). Deshalb
   fragt sie `felderLesen()` — die Liste, die `runtime/oberflaeche.js`
   **beim Zeichnen** füllt — und trifft nur die Entscheidung, ob der
   Punkt in einem wählbaren Feld liegt. `felderLesen` darf fehlen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/oberflaeche.js` (`felder()` — die Maße der Knopfleiste),
   `spiel/wegfindung.mjs` (`erreichbareFelder`, `pfadAus` — Vorschau
   und Kosten), `spiel/aktionen.mjs` (`pruefeAktion`, `kostenVon` —
   die einzige Wahrheit über „erlaubt"), `spiel/hoehen.mjs`
   (`sturzTiefe`, `sturzSchaden`, `stossZiel` — die Sturzwarnung),
   `spiel/zug.mjs` (`amZugWesen`), `spiel/wesen.mjs` (`wesenBei`,
   `belegtPruefer`), `spiel/katalog/faehigkeiten.mjs` (Reichweite der
   Fähigkeiten), `runtime/kamera.js` (`bildNachFeld` — Zeiger auf
   Feld), `netz/sitzung.mjs` (nimmt `sende` entgegen),
   `runtime/zeichnen.js` (malt `ansicht()`),
   `werkzeuge/pruefe-eingabe.mjs`. */

import { RICHTUNGEN } from "../spiel/gitter.mjs";
import { erreichbareFelder, pfadAus } from "../spiel/wegfindung.mjs";
import { sturzTiefe, sturzSchaden, stossZiel } from "../spiel/hoehen.mjs";
import { AKTION, kostenVon, pruefeAktion } from "../spiel/aktionen.mjs";
import { amZugWesen, wesenMitId } from "../spiel/zug.mjs";
import { wesenBei, belegtPruefer } from "../spiel/wesen.mjs";
import { faehigkeit, kenntFaehigkeit } from "../spiel/katalog/faehigkeiten.mjs";

/* Die Knopfnummern des Browsers. Als Namen, weil `knopf === 2` an der
   Aufrufstelle niemand liest. */
export const KNOPF_LINKS = 0;
export const KNOPF_RECHTS = 2;

/* Die vier Zustände, in denen ein Klick etwas anderes bedeutet. Mehr
   gibt es nicht: Trank, Wacht und Zugende brauchen kein Ziel und
   laufen sofort los, statt einen Modus zu öffnen, den man wieder
   schließen müsste. */
export const MODUS = {
  gehen: "gehen",
  angriff: "angriff",
  stoss: "stoss",
  faehigkeit: "faehigkeit"
};

/* Die sechs Zifferntasten. Als Tabelle und nicht als `switch`, damit
   die Oberfläche dieselbe Liste anzeigen kann, die die Eingabe
   auswertet — sonst stünde in der Leiste eine Belegung, die es nicht
   gibt. `stelle` zeigt in `wesen.faehigkeiten`; jede Klasse hat zwei. */
export const SLOTS = [
  { taste: "1", art: "modus", modus: MODUS.gehen },
  { taste: "2", art: "modus", modus: MODUS.angriff },
  { taste: "3", art: "modus", modus: MODUS.stoss },
  { taste: "4", art: "faehigkeit", stelle: 0 },
  { taste: "5", art: "faehigkeit", stelle: 1 },
  { taste: "6", art: "sofort", typ: AKTION.trank }
];

/* Pfeiltaste → Stelle in `RICHTUNGEN` (nord, ost, süd, west). */
export const ZEIGER_TASTEN = {
  ArrowUp: 0,
  ArrowRight: 1,
  ArrowDown: 2,
  ArrowLeft: 3
};

/* Tasten, die diese Datei beansprucht. Der Browser täte sonst sein
   Eigenes damit: `Tab` springt aus dem Bild heraus, die Leertaste
   rollt die Seite. */
export const EIGENE_TASTEN = new Set([
  "ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "Enter", "Escape", "Tab", " ",
  "1", "2", "3", "4", "5", "6", "s", "S", "w", "W"
]);

export const WARNUNG = { sturz: "sturz", abgelehnt: "abgelehnt" };

/* Die drei Arten, mit denen ein Zeigerereignis kommen kann. Der Browser
   schreibt sie so in `pointerType`; als Namen, weil `"touch"` an der
   Aufrufstelle wie eine beliebige Zeichenkette aussieht. */
export const ZEIGER_MAUS = "mouse";
export const ZEIGER_FINGER = "touch";
export const ZEIGER_STIFT = "pen";

/* Eine Karte, die nie jemand füllt: die Antwort auf „Reichweite?",
   solange niemand von uns am Zug ist. Ein `null` an dieser Stelle
   zwänge jeden Zeichner zu einer Fallunterscheidung. */
const LEERE_REICHWEITE = new Map();

const KEIN_ZUG = "Gerade ist niemand von euch am Zug.";

export function macheEingabe({
  leinwand = null, kamera = null, zustand = null, sende = null, platz = null,
  felderLesen = null
} = {}) {
  if (typeof sende !== "function") {
    throw new Error("macheEingabe: `sende` muss eine Funktion sein — die Eingabe wendet "
      + "nichts selbst an, sie reicht die Aktion weiter");
  }
  if (!zustand) throw new Error("macheEingabe: ohne Spielstand geht nichts");
  if (!kamera || typeof kamera.bildNachFeld !== "function") {
    throw new Error("macheEingabe: ohne Kamera lässt sich kein Bildpunkt in ein Feld "
      + "umrechnen");
  }

  let gesperrt = false;
  let modus = MODUS.gehen;
  let schluessel = null;
  let zeigerFeld = null;
  let ganzeKarte = false;
  let warnung = null;
  let wegVorschau = null;
  let kosten = null;
  let ziel = null;

  /* Womit zuletzt bedient wurde. Am Anfang die Maus: Ein Rechner, an
     dem nie jemand tippt, soll nicht in der Fingerbedienung starten. */
  let zeigerArt = ZEIGER_MAUS;

  /* Der Zeiger, der gerade unten ist. Ein zweiter, der dazukommt, wird
     nicht angenommen — auf einem Handy liegt schnell ein Daumen mit auf
     dem Blatt, und zwei Zeiger hießen zwei Aktionen. */
  let aktiverZeiger = null;

  /* Das Feld, das der Finger angewählt hat, und der wievielte Tipp
     darauf gerade gezählt wurde: 1 wählt an, 2 führt aus, 3 hebt auf.
     Die Maus benutzt beides nicht — sie schwebt. */
  let anwahl = null;
  let anwahlStufe = 0;

  /* Die gemerkte Lage. Sie hängt an einem Schlüssel aus allem, was sie
     ungültig machen kann; ändert sich einer der Werte, wird neu
     gerechnet. Ohne das liefe je Mausbewegung eine ganze Wegsuche. */
  let merkSchluessel = "";
  let merkReichweite = LEERE_REICHWEITE;
  let merkKandidaten = new Map();

  const holeZustand = () => (typeof zustand === "function" ? zustand() : zustand);

  /* Die Figur, der dieser Rechner Befehle geben darf. Die Brut trägt
     keinen Spielerplatz — deshalb nimmt die Eingabe für sie nichts an,
     ganz gleich, was jemand klickt. */
  function eigenesWesen() {
    const z = holeZustand();
    if (!z || z.vorbei) return null;
    const w = amZugWesen(z);
    if (!w || w.spielerPlatz === null || w.spielerPlatz === undefined) return null;
    if (platz !== null && w.spielerPlatz !== platz) return null;
    return w;
  }

  function zugSchluessel(z, w) {
    const angewandt = Array.isArray(z.protokoll) ? z.protokoll.length : 0;
    const wesenZahl = Array.isArray(z.wesen) ? z.wesen.length : 0;
    return `${z.runde}|${z.amZug}|${w.id}|${w.x}|${w.y}|${w.ap}|${angewandt}|${wesenZahl}`;
  }

  function frischeLage(z, w) {
    const jetzt = zugSchluessel(z, w);
    if (jetzt === merkSchluessel) return;
    merkSchluessel = jetzt;
    merkReichweite = erreichbareFelder(z.karte, w.x, w.y, w.ap, {
      belegt: belegtPruefer(z.wesen)
    });
    merkKandidaten = new Map();
  }

  /* ── Was ein Klick auf dieses Feld bedeuten würde ────────────────*/

  function bauVorschlag(z, w, feld, rechts) {
    if (rechts || modus === MODUS.angriff) return zielAktion(z, w, feld, AKTION.angriff);
    if (modus === MODUS.stoss) return zielAktion(z, w, feld, AKTION.stoss);
    if (modus === MODUS.faehigkeit) return faehigkeitsAktion(z, w, feld);
    return gehAktion(z, w, feld);
  }

  function zielAktion(z, w, feld, typ) {
    const gegenueber = wesenBei(z.wesen, feld.x, feld.y);
    if (!gegenueber) return null;
    return { typ, wer: w.id, ziel: gegenueber.id };
  }

  /* Gehen braucht kein `pruefeAktion`: Die Reichweitenkarte ist
     dieselbe Rechnung — sie kennt Wände, Höhen, Wasser und wer schon
     wo steht. Ein zweiter Lauf gäbe dieselbe Antwort und kostete je
     Mausbewegung eine volle Wegsuche. */
  function gehAktion(z, w, feld) {
    if (!z.karte.drin(feld.x, feld.y)) return null;
    if (feld.x === w.x && feld.y === w.y) return null;
    if (!merkReichweite.has(z.karte.index(feld.x, feld.y))) return null;
    return { typ: AKTION.gehen, wer: w.id, nach: { x: feld.x, y: feld.y } };
  }

  function faehigkeitsAktion(z, w, feld) {
    for (const kandidat of kandidaten(z, w, schluessel).liste) {
      if (kandidat.feld && kandidat.feld.x === feld.x && kandidat.feld.y === feld.y) {
        return kandidat;
      }
      if (kandidat.ziel === null || kandidat.ziel === undefined) continue;
      const getroffen = wesenMitId(z, kandidat.ziel);
      if (getroffen && getroffen.x === feld.x && getroffen.y === feld.y) return kandidat;
    }
    return null;
  }

  /* Alle Fähigkeitsaktionen, die jetzt erlaubt sind. Aufgezählt wird
     hier, **entschieden** wird in `pruefeAktion` — deshalb steht in
     dieser Datei nirgends, welche Wirkung ein Wesen und welche ein
     Feld braucht. Die Aufzählung darf großzügig sein: Was nicht geht,
     fällt heraus.

     Der `grund` ist die Auskunft für den Spieler, und er wird nur
     gegeben, wenn **alle** Versuche denselben Satz zurückgaben. Sagen
     sie Verschiedenes, ist die Wahrheit „von hier aus trifft sie
     nichts" und nicht der Satz des ersten Versuchs. */
  function kandidaten(z, w, welche) {
    if (!welche || !kenntFaehigkeit(welche)) return { liste: [], grund: null };
    frischeLage(z, w);
    const fertig = merkKandidaten.get(welche);
    if (fertig) return fertig;

    const liste = [];
    const gruende = new Set();
    const nimm = (aktion) => {
      const grund = pruefeAktion(z, aktion);
      if (grund === null) liste.push(aktion);
      else gruende.add(grund);
    };
    const ohneZiel = {
      typ: AKTION.faehigkeit, wer: w.id, schluessel: welche, ziel: null, feld: null
    };
    nimm(ohneZiel);
    /* Wirkt sie auf sich selbst, ist sie damit vollständig beschrieben.
       Ohne diesen Ausstieg trüge die Aktion später ein Ziel oder ein
       Feld mit sich, das keine Regel liest — und das ginge so über die
       Leitung. */
    if (liste.length === 1) {
      const nurDas = { liste, grund: null };
      merkKandidaten.set(welche, nurDas);
      return nurDas;
    }
    for (const anderer of z.wesen || []) {
      if (!anderer) continue;
      nimm({ typ: AKTION.faehigkeit, wer: w.id, schluessel: welche, ziel: anderer.id,
        feld: null });
    }
    const weite = faehigkeit(welche).reichweite;
    for (let y = w.y - weite; y <= w.y + weite; y++) {
      for (let x = w.x - weite; x <= w.x + weite; x++) {
        if (!z.karte.drin(x, y)) continue;
        nimm({ typ: AKTION.faehigkeit, wer: w.id, schluessel: welche, ziel: null,
          feld: { x, y } });
      }
    }
    const fund = {
      liste,
      grund: liste.length === 0 && gruende.size === 1 ? [...gruende][0] : null
    };
    merkKandidaten.set(welche, fund);
    return fund;
  }

  /* ── Die Vorschau ────────────────────────────────────────────────*/

  function rechne() {
    wegVorschau = null;
    kosten = null;
    ziel = null;
    warnung = null;
    if (gesperrt || !zeigerFeld) return;
    const z = holeZustand();
    const w = eigenesWesen();
    if (!w) return;
    frischeLage(z, w);

    const vorschlag = gueltigerVorschlag(z, w, zeigerFeld, false);
    if (vorschlag) {
      kosten = preisVon(z, vorschlag);
      if (vorschlag.typ === AKTION.gehen) {
        wegVorschau = pfadAus(merkReichweite, z.karte.index(zeigerFeld.x, zeigerFeld.y));
      }
      if (vorschlag.ziel !== null && vorschlag.ziel !== undefined) {
        const getroffen = wesenMitId(z, vorschlag.ziel);
        if (getroffen) ziel = { id: getroffen.id, x: getroffen.x, y: getroffen.y };
      }
    }
    warnung = sturzWarnung(z, w, vorschlag);
  }

  function gueltigerVorschlag(z, w, feld, rechts) {
    const roh = bauVorschlag(z, w, feld, rechts);
    if (!roh) return null;
    if (roh.typ === AKTION.gehen) return roh;
    return pruefeAktion(z, roh) === null ? roh : null;
  }

  function preisVon(z, aktion) {
    if (aktion.typ === AKTION.gehen) {
      const eintrag = merkReichweite.get(z.karte.index(aktion.nach.x, aktion.nach.y));
      return eintrag ? eintrag.kosten : null;
    }
    const preis = kostenVon(z, aktion);
    return Number.isFinite(preis) ? preis : null;
  }

  /* ── Der Sturz ───────────────────────────────────────────────────

     Zwei Fälle, eine Form. Im Gehen-Modus warnt das Feld unter dem
     Zeiger vor dem eigenen Fall; im Stoß-Modus vor dem des Ziels —
     das ist keine Drohung, sondern der Reiz der Aktion.

     Gewarnt wird nur auf Feldern **ohne** Weg. Ein erreichbares Feld
     hat einen Weg ohne Sturz (`spiel/wegfindung.mjs` nimmt Stürze
     nicht in den Weg); dort zu warnen hieße, vor einem Weg zu warnen,
     den die Vorschau daneben gar nicht zeigt. */
  function sturzWarnung(z, w, vorschlag) {
    if (modus === MODUS.stoss) {
      if (!vorschlag || vorschlag.typ !== AKTION.stoss) return null;
      const getroffen = wesenMitId(z, vorschlag.ziel);
      if (!getroffen) return null;
      const feld = stossZiel(z.karte, w.x, w.y, getroffen.x, getroffen.y);
      if (!feld) return null;
      const stufen = sturzTiefe(z.karte, getroffen.x, getroffen.y, feld.x, feld.y);
      if (stufen <= 0) return null;
      return macheSturz(stufen, getroffen.id, feld,
        `Der Stoß wirft ihn ${stufen} Ebenen hinab`);
    }
    if (modus !== MODUS.gehen) return null;
    return eigenerSturz(z, w);
  }

  function eigenerSturz(z, w) {
    const karte = z.karte;
    const { x, y } = zeigerFeld;
    if (!karte.drin(x, y) || karte.blocktBewegung(x, y)) return null;
    if (merkReichweite.has(karte.index(x, y))) return null;

    let tiefste = 0;
    for (const r of RICHTUNGEN) {
      const nx = x - r.dx;
      const ny = y - r.dy;
      if (!karte.drin(nx, ny)) continue;
      if (!merkReichweite.has(karte.index(nx, ny))) continue;
      const stufen = sturzTiefe(karte, nx, ny, x, y);
      if (stufen > tiefste) tiefste = stufen;
    }
    if (tiefste <= 0) return null;
    return macheSturz(tiefste, w.id, { x, y }, `Dort geht es ${tiefste} Ebenen hinab`);
  }

  function macheSturz(stufen, wen, feld, anfang) {
    const schaden = sturzSchaden(stufen);
    return {
      art: WARNUNG.sturz,
      wen,
      feld: { x: feld.x, y: feld.y },
      stufen,
      schaden,
      text: `${anfang}: ${schaden} Schaden, und danach sind alle Aktionspunkte weg.`
    };
  }

  /* ── Senden ──────────────────────────────────────────────────────*/

  function sendeAktion(aktion) {
    const z = holeZustand();
    const grund = pruefeAktion(z, aktion);
    if (grund) {
      warnung = { art: WARNUNG.abgelehnt, text: grund };
      return null;
    }
    if (sende(aktion) === false) {
      warnung = {
        art: WARNUNG.abgelehnt,
        text: "Die Sitzung hat diese Aktion nicht angenommen."
      };
      return null;
    }
    /* Nach der Aktion ist die Lage eine andere: Punkte sind weg, das
       Ziel steht vielleicht nicht mehr. Ein Modus, der stehen bliebe,
       verschluckte den nächsten Klick als Angriff auf leeren Boden. */
    modus = MODUS.gehen;
    schluessel = null;
    warnung = null;
    wegVorschau = null;
    kosten = null;
    ziel = null;
    /* Auch die Anwahl des Fingers: Sonst führte der nächste Tipp auf
       dasselbe Feld sofort aus, statt erst wieder zu zeigen. */
    anwahl = null;
    anwahlStufe = 0;
    return aktion;
  }

  function bestaetige(rechts) {
    const w = eigenesWesen();
    if (!w) {
      warnung = { art: WARNUNG.abgelehnt, text: KEIN_ZUG };
      return null;
    }
    if (!zeigerFeld) return null;
    const z = holeZustand();
    frischeLage(z, w);
    const vorschlag = bauVorschlag(z, w, zeigerFeld, rechts);
    if (vorschlag) return sendeAktion(vorschlag);
    /* Die Sturzwarnung sagt schon, warum dort kein Weg hinführt —
       „Dorthin führt kein Weg" darüberzuschreiben nähme dem Spieler
       die einzige nützliche Auskunft. */
    if (warnung && warnung.art === WARNUNG.sturz) return null;
    warnung = { art: WARNUNG.abgelehnt, text: grundFuer(z, w, zeigerFeld, rechts) };
    return null;
  }

  /* Warum es nicht ging — vom Kern erfragt und nicht hier gebaut. Das
     ist die teure Auskunft (für das Gehen eine volle Wegsuche), und
     deshalb steht sie hier und nicht in der Vorschau: einmal je Klick
     statt einmal je Mausbewegung. */
  function grundFuer(z, w, feld, rechts) {
    if (rechts || modus === MODUS.angriff || modus === MODUS.stoss) {
      const typ = rechts || modus === MODUS.angriff ? AKTION.angriff : AKTION.stoss;
      const gegenueber = wesenBei(z.wesen, feld.x, feld.y);
      if (!gegenueber) return "Dort steht niemand.";
      return pruefeAktion(z, { typ, wer: w.id, ziel: gegenueber.id })
        || "Das geht von hier aus nicht.";
    }
    if (modus === MODUS.faehigkeit) {
      const fund = kandidaten(z, w, schluessel);
      return fund.grund || `Die Fähigkeit „${schluessel}" trifft dieses Feld nicht.`;
    }
    return pruefeAktion(z, { typ: AKTION.gehen, wer: w.id, nach: { x: feld.x, y: feld.y } })
      || "Dorthin führt kein Weg.";
  }

  /* ── Tasten ──────────────────────────────────────────────────────*/

  function setzeModus(neuer) {
    modus = neuer;
    schluessel = null;
    rechne();
  }

  function sofortAktion(typ) {
    const w = eigenesWesen();
    if (!w) {
      warnung = { art: WARNUNG.abgelehnt, text: KEIN_ZUG };
      return null;
    }
    return sendeAktion({ typ, wer: w.id });
  }

  function slotTaste(nummer) {
    const slot = SLOTS[nummer - 1];
    if (!slot) return null;
    if (slot.art === "modus") { setzeModus(slot.modus); return null; }
    if (slot.art === "sofort") return sofortAktion(slot.typ);
    return faehigkeitsSlot(slot.stelle);
  }

  function faehigkeitsSlot(stelle) {
    const w = eigenesWesen();
    if (!w) {
      warnung = { art: WARNUNG.abgelehnt, text: KEIN_ZUG };
      return null;
    }
    const welche = (w.faehigkeiten || [])[stelle];
    if (!welche) {
      warnung = {
        art: WARNUNG.abgelehnt,
        text: `Diese Figur hat keine ${stelle + 1}. Fähigkeit.`
      };
      return null;
    }
    const z = holeZustand();
    const fund = kandidaten(z, w, welche);
    if (fund.liste.length === 0) {
      warnung = {
        art: WARNUNG.abgelehnt,
        text: fund.grund || `Die Fähigkeit „${welche}" trifft von hier aus nichts.`
      };
      return null;
    }
    const erste = fund.liste[0];
    if (fund.liste.length === 1 && erste.ziel === null && erste.feld === null) {
      return sendeAktion(erste);
    }
    modus = MODUS.faehigkeit;
    schluessel = welche;
    rechne();
    return null;
  }

  /* Der Feldzeiger. Er läuft über Wände hinweg — siehe Kopfnotiz. Der
     erste Tastendruck setzt ihn nur, er bewegt ihn nicht: Sonst
     spränge er beim ersten Pfeil um zwei Felder, wenn eine Maus ihn
     vorher schon gesetzt hat. */
  function zeigerSchritt(stelle) {
    const z = holeZustand();
    const w = eigenesWesen();
    const r = RICHTUNGEN[stelle];
    if (modus === MODUS.stoss && w) return stossInRichtung(z, w, r);
    if (!zeigerFeld) {
      zeigerFeld = w ? { x: w.x, y: w.y } : null;
    } else {
      const nx = zeigerFeld.x + r.dx;
      const ny = zeigerFeld.y + r.dy;
      if (z.karte.drin(nx, ny)) zeigerFeld = { x: nx, y: ny };
    }
    rechne();
    return null;
  }

  /* „S, dann Richtung": Im Stoß-Modus meint eine Pfeiltaste nicht den
     Zeiger, sondern den Nachbarn, den es treffen soll. */
  function stossInRichtung(z, w, r) {
    const feld = { x: w.x + r.dx, y: w.y + r.dy };
    if (!z.karte.drin(feld.x, feld.y)) {
      warnung = { art: WARNUNG.abgelehnt, text: "Dort ist der Rand der Karte." };
      return null;
    }
    zeigerFeld = feld;
    rechne();
    return bestaetige(false);
  }

  function raeumeAuf() {
    modus = MODUS.gehen;
    schluessel = null;
    ganzeKarte = false;
    anwahl = null;
    anwahlStufe = 0;
    const w = eigenesWesen();
    zeigerFeld = w ? { x: w.x, y: w.y } : null;
    rechne();
  }

  /* ── Die Leinwand ────────────────────────────────────────────────*/

  const abmelder = [];

  function punktAus(ereignis) {
    if (typeof leinwand.getBoundingClientRect !== "function") {
      return { x: Math.floor(ereignis.offsetX || 0), y: Math.floor(ereignis.offsetY || 0) };
    }
    const kasten = leinwand.getBoundingClientRect();
    /* Das Blatt kann in der Seite anders groß sein, als es Bildpunkte
       hat. Ohne diese Umrechnung zeigte der Zeiger auf ein anderes
       Feld, sobald jemand das Fenster verkleinert. */
    const breit = kasten.width > 0 ? leinwand.width / kasten.width : 1;
    const hoch = kasten.height > 0 ? leinwand.height / kasten.height : 1;
    return {
      x: Math.floor((ereignis.clientX - kasten.left) * breit),
      y: Math.floor((ereignis.clientY - kasten.top) * hoch)
    };
  }

  /* Womit dieses Ereignis kommt. Ein Browser ohne `pointerType` gibt es
     nicht mehr, aber ein nachgestelltes Ereignis in einer Prüfung sehr
     wohl — und dort ist die Maus die harmlose Annahme. */
  function artVon(ereignis) {
    return ereignis && ereignis.pointerType ? ereignis.pointerType : ZEIGER_MAUS;
  }

  /* Die Nummer des Zeigers. `pointerId` darf 0 sein, deshalb wird auf
     den Typ geprüft und nicht auf Wahrheit. */
  function nummerVon(ereignis) {
    return ereignis && typeof ereignis.pointerId === "number" ? ereignis.pointerId : 1;
  }

  function haengeAn() {
    if (!leinwand || typeof leinwand.addEventListener !== "function") return;
    const tastenZiel = leinwand.ownerDocument || leinwand;
    const halteAn = (ereignis) => {
      if (typeof ereignis.preventDefault === "function") ereignis.preventDefault();
    };
    const paare = [
      /* Ein Finger schwebt nicht: Auf dem Handy kommt `pointermove` erst,
         wenn er schon unten ist, und würde die Anwahl unter dem Finger
         wegziehen. Das Schweben bleibt der Maus und dem Stift. */
      [leinwand, "pointermove", (e) => {
        zeigerArt = artVon(e);
        if (zeigerArt === ZEIGER_FINGER) return;
        const p = punktAus(e);
        beiZeiger(p.x, p.y);
      }],
      [leinwand, "pointerdown", (e) => {
        halteAn(e);
        const p = punktAus(e);
        beiZeigerDruck(p.x, p.y,
          { art: artVon(e), knopf: e.button, nummer: nummerVon(e) });
      }],
      /* Losgelassen wird am Schriftstück und nicht am Blatt: Wer neben
         dem Blatt loslässt, machte die Eingabe sonst dauerhaft taub. */
      [tastenZiel, "pointerup", (e) => { beiZeigerEnde(nummerVon(e)); }],
      [tastenZiel, "pointercancel", (e) => { beiZeigerEnde(nummerVon(e)); }],
      [leinwand, "contextmenu", halteAn],
      [tastenZiel, "keydown", (e) => { if (EIGENE_TASTEN.has(e.key)) halteAn(e);
        beiTaste(e.key, true); }],
      [tastenZiel, "keyup", (e) => { beiTaste(e.key, false); }]
    ];
    for (const [wo, name, hoerer] of paare) {
      wo.addEventListener(name, hoerer);
      abmelder.push(() => wo.removeEventListener(name, hoerer));
    }
  }

  /* ── Nach außen ──────────────────────────────────────────────────*/

  function beiZeiger(px, py) {
    if (gesperrt) return null;
    /* Über einem Knopf steht kein Kartenfeld: Sonst zeigte die Vorschau
       unter der Leiste einen Weg, den niemand angesteuert hat. */
    if (knopfUnter(px, py)) return null;
    const feld = feldAus(px, py);
    zeigerFeld = feld;
    rechne();
    return zeigerFeld;
  }

  /* Ein Zeiger geht nieder. Der zweite, der dazukommt, während der
     erste noch unten ist, wird verworfen — sonst schickte ein
     mitliegender Daumen dieselbe Aktion ein zweites Mal. */
  function beiZeigerDruck(px, py, angaben = {}) {
    const nummer = angaben.nummer === undefined ? 1 : angaben.nummer;
    if (aktiverZeiger !== null && aktiverZeiger !== nummer) return null;
    aktiverZeiger = nummer;
    const knopf = angaben.knopf === undefined ? KNOPF_LINKS : angaben.knopf;
    return beiKlick(px, py, knopf, angaben.art || ZEIGER_MAUS);
  }

  /* Losgelassen oder vom Browser abgenommen (Wischen, Zoomen). Ohne
     `pointercancel` bliebe der Zeiger für immer als unten vermerkt. */
  function beiZeigerEnde(nummer) {
    if (nummer === undefined || aktiverZeiger === nummer) aktiverZeiger = null;
    return null;
  }

  /* Das Feld der Knopfleiste unter diesem Bildpunkt — oder nichts.

     Die Maße kommen von der Anzeige und werden hier **nicht**
     nachgerechnet: Zwei Stellen, die Knopfmaße rechnen, sind zwei
     Wahrheiten, und die laufen auseinander (Fehlerbuch E2). Gefragt
     wird bei jedem Zeigerereignis neu, weil `felder()` beim Zeichnen
     gefüllt wird und damit sagt, was gerade wirklich auf dem Schirm
     steht.

     `felderLesen` darf fehlen und darf werfen — vor dem ersten Bild
     gibt es noch keine Leiste. Eine Eingabe, die dann unbrauchbar
     wäre, wäre auf halbem Wege gebaut. */
  function knopfUnter(px, py) {
    if (typeof felderLesen !== "function") return null;
    let liste = null;
    try { liste = felderLesen(); } catch { return null; }
    if (!Array.isArray(liste)) return null;
    /* Von hinten nach vorn: Was zuletzt gezeichnet wurde, liegt oben. */
    for (let i = liste.length - 1; i >= 0; i--) {
      const f = liste[i];
      if (!f || f.aktiv !== true) continue;
      if (!Number.isFinite(f.x) || !Number.isFinite(f.y)) continue;
      if (px < f.x || py < f.y) continue;
      if (px >= f.x + f.breite || py >= f.y + f.hoehe) continue;
      return f;
    }
    return null;
  }

  /* Ein Knopf ist eindeutig, ein Feld nicht — deshalb läuft er sofort
     los und nicht über die zwei Schritte. Und das Kartenfeld darunter
     wird gar nicht erst gesucht: Sonst liefe die Figur los, während der
     Spieler „Zug beenden" gedrückt hat. */
  function drueckeKnopf(knopfFeld) {
    anwahl = null;
    anwahlStufe = 0;
    if (knopfFeld.aktion) return sendeAktion(knopfFeld.aktion);
    /* Ein Feld ohne Aktion schaltet nur die Anzeige um. Es verschluckt
       das Ereignis trotzdem — sonst ginge die Figur unter der Leiste. */
    if (knopfFeld.art === "karte") ganzeKarte = !ganzeKarte;
    return null;
  }

  function beiKlick(px, py, knopf = KNOPF_LINKS, art = ZEIGER_MAUS) {
    zeigerArt = art;
    if (gesperrt) return null;
    const knopfFeld = knopfUnter(px, py);
    if (knopfFeld) return drueckeKnopf(knopfFeld);
    const feld = feldAus(px, py);
    if (!feld) {
      /* Neben die Karte getippt. Auf dem Handy ist das das einzige
         `Esc`, das es gibt — also räumt es auf statt nichts zu tun. */
      if (art === ZEIGER_FINGER) raeumeAuf();
      return null;
    }
    if (art === ZEIGER_FINGER) return fingerTipp(feld, knopf);
    /* Die Maus hat gerade das Kommando übernommen: Eine Anwahl vom
       Finger, die liegen bliebe, verschluckte sonst den nächsten Klick. */
    anwahl = null;
    anwahlStufe = 0;
    zeigerFeld = feld;
    rechne();
    return bestaetige(knopf === KNOPF_RECHTS);
  }

  /* Zwei Schritte statt Schweben — siehe Kopfnotiz. Der erste Tipp
     rechnet nur die Vorschau, der zweite bestätigt sie, der dritte
     nimmt zurück. Der dritte kommt nur vor, wenn der zweite abgelehnt
     wurde: Eine angenommene Aktion räumt die Anwahl selbst weg. */
  function fingerTipp(feld, knopf) {
    if (!anwahl || anwahl.x !== feld.x || anwahl.y !== feld.y) {
      anwahl = { x: feld.x, y: feld.y };
      anwahlStufe = 1;
      zeigerFeld = feld;
      rechne();
      return null;
    }
    anwahlStufe++;
    if (anwahlStufe >= 3) { raeumeAuf(); return null; }
    /* Zwischen den beiden Tipps kann eine Pfeiltaste den Zeiger woanders
       hingestellt haben. Bestätigt wird, was angetippt wurde — sonst
       führte der zweite Tipp eine Aktion auf einem fremden Feld aus. */
    zeigerFeld = feld;
    rechne();
    return bestaetige(knopf === KNOPF_RECHTS);
  }

  /* Ein Tipp mit dem Finger — dasselbe wie ein Zeigerereignis vom Typ
     `touch`, nur ohne nachgestelltes Ereignis. */
  function beiTipp(px, py, knopf = KNOPF_LINKS) {
    return beiKlick(px, py, knopf, ZEIGER_FINGER);
  }

  function istFinger() {
    return zeigerArt === ZEIGER_FINGER;
  }

  function beiTaste(taste, gedrueckt = true) {
    if (!gedrueckt || gesperrt) return null;
    if (taste === "Escape") { raeumeAuf(); return null; }
    if (taste === "Tab") { ganzeKarte = !ganzeKarte; return null; }
    if (ZEIGER_TASTEN[taste] !== undefined) return zeigerSchritt(ZEIGER_TASTEN[taste]);
    if (taste === "Enter") return bestaetige(false);
    if (taste === " ") return sofortAktion(AKTION.zugEnde);
    if (taste === "w" || taste === "W") return sofortAktion(AKTION.wacht);
    if (taste === "s" || taste === "S") { setzeModus(MODUS.stoss); return null; }
    if (/^[1-6]$/.test(taste)) return slotTaste(Number(taste));
    return null;
  }

  function feldAus(px, py) {
    const feld = kamera.bildNachFeld(px, py);
    const z = holeZustand();
    if (!z.karte.drin(feld.x, feld.y)) return null;
    return { x: feld.x, y: feld.y };
  }

  function sperre(an) {
    gesperrt = an === true;
    if (gesperrt) {
      wegVorschau = null;
      kosten = null;
      ziel = null;
      warnung = null;
      return true;
    }
    /* Die Ereignisse haben die Welt bewegt. Was gemerkt war, ist damit
       eine Aussage über eine Karte, die es nicht mehr gibt. */
    merkSchluessel = "";
    merkReichweite = LEERE_REICHWEITE;
    merkKandidaten = new Map();
    /* Während der Sperre ist das Loslassen womöglich verlorengegangen.
       Ein Zeiger, der als unten gilt, machte die Eingabe für immer
       taub — und das fiele erst im Spiel auf. */
    aktiverZeiger = null;
    /* Und aus demselben Grund die Anwahl: Der zweite Tipp bestätigte
       sonst eine Vorschau von vor den Ereignissen. */
    anwahl = null;
    anwahlStufe = 0;
    rechne();
    return false;
  }

  function ansicht() {
    const w = gesperrt ? null : eigenesWesen();
    if (w) frischeLage(holeZustand(), w);
    return {
      zeigerFeld: zeigerFeld ? { x: zeigerFeld.x, y: zeigerFeld.y } : null,
      wegVorschau,
      reichweite: w ? merkReichweite : LEERE_REICHWEITE,
      ziel,
      modus,
      schluessel,
      kosten,
      warnung,
      ganzeKarte,
      gesperrt,
      /* Damit die Anzeige weiß, ob sie Knöpfe für einen Daumen bauen
         muss — und ob die Vorschau vom Schweben oder vom ersten Tipp
         kommt. */
      istFinger: istFinger()
    };
  }

  function loese() {
    while (abmelder.length > 0) abmelder.pop()();
  }

  haengeAn();
  raeumeAuf();

  return {
    beiZeiger, beiKlick, beiTipp, beiZeigerDruck, beiZeigerEnde, beiTaste,
    istFinger, ansicht, sperre, loese
  };
}
