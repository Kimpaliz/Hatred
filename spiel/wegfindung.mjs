/* [Aufgabe: Regelkern] Die Wegfindung — welche Felder ein Wesen mit
   seinen Aktionspunkten erreicht und über welchen Weg.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Ein Zug beginnt damit, dass der Spieler seine Figur anklickt und das
   Bild ihm zeigt, wohin sie käme. Diese Vorschau, der Weg, den die
   Figur danach wirklich läuft, und der Weg, den die Gegner-KI für sich
   sucht, müssen **eine** Rechnung sein. Zeigte die Vorschau ein Feld,
   das der Zug dann nicht erreicht, wäre das kein Schönheitsfehler,
   sondern eine Lüge an den Spieler.

   **Hier steht keine einzige Kostenzahl.** Jeder Schritt wird bei
   `spiel/hoehen.mjs` erfragt: `laufKosten` weiß, dass die Rampe zwei
   Punkte kostet, Wasser einen dazu und eine Wand gar nicht gangbar
   ist. Eine zweite Preisliste in dieser Datei wäre der kürzeste Weg
   dazu, dass Vorschau und Zug verschieden rechnen. Wer die Preise
   beugen muss — etwa eine Wirkung „Verlangsamt", die jeden Schritt
   teurer macht —, reicht über `hoehenRegeln` eine Hülle um dieselben
   Funktionen herein, statt dass diese Datei je Wirkung einen Schalter
   bekommt.

   **Dijkstra und nicht A-Stern.** Die Vorschau braucht ohnehin *alle*
   erreichbaren Felder und nicht nur eines. A-Stern müsste dafür ein
   zweites Mal laufen, mit einer eigenen Schätzung und einer eigenen
   Regel für Gleichstände — und an zwei solchen Regeln laufen zwei
   Rechner auseinander. Beide Fragen beantwortet deshalb dieselbe
   Suche: `erreichbareFelder` lässt sie bis zur Punktegrenze laufen,
   `wegSuche` bricht ab, sobald das Ziel abgearbeitet ist.

   **Gleich teure Wege sind die eigentliche Gefahr.** Auf offenem Feld
   gibt es zwischen zwei Punkten hunderte Wege gleicher Länge. Wählte
   jeder Rechner einen anderen, stünde dieselbe Figur nach demselben
   Befehl auf vier Rechnern woanders — und das Netz merkte es erst
   eine Runde später an der Prüfsumme. Zwei Festlegungen verhindern
   das: Die Warteschlange vergleicht **erst die Kosten, dann den
   Feldindex**, und die Nachbarn werden **immer in der Reihenfolge aus
   `richtungen`** betrachtet (Nord, Ost, Süd, West). Weil Kosten und
   Index zusammen nie zweimal denselben Eintrag ergeben, hängt danach
   nichts mehr an der Einfügereihenfolge der Halde: Es gibt je Karte
   genau eine Antwort.

   **Der Vorgänger wird nur bei echter Verbesserung gesetzt** — `<`,
   nicht `<=`. Sonst überschriebe der später abgearbeitete von zwei
   gleich guten Vorgängern den früheren, und die Regel oben stünde
   wieder offen.

   **Stürze sind standardmäßig kein Weg.** `hoehen.mjs` lässt den
   Schritt über zwei Ebenen hinab zu: Er kostet einen Punkt, tut drei
   Schaden je Stufe unter der ersten und nimmt der Figur danach alle
   übrigen Punkte. Für einen Spieler ist das kein Weg, sondern ein
   Unfall — ein Vorschaufeld „drei Punkte, du landest mit sechs
   Schaden und stehst dann still" wäre nicht zu lesen. Deshalb ist
   `stuerzeErlaubt` standardmäßig **aus**. Wer ihn ausdrücklich umlegt
   (die Gegner-KI darf einen Sprung in Kauf nehmen), bekommt Wege, die
   stürzen, und muss selbst wissen, dass die Figur dort stehenbleibt:
   Gerechnet wird der Sturz mit seinen reinen Laufkosten, den Verlust
   der übrigen Punkte trägt `spiel/aktionen.mjs` beim Ausführen ein.

   **`kosten` ist immer der Preis des ganzen Weges bis zu diesem
   Feld**, nie der des letzten Schritts, und das Startfeld steht mit 0
   vorn im Pfad. Beides ist die Form, die das Ereignis `bewegt`
   braucht: Das Bild läuft den Pfad ab, der letzte Eintrag ist zugleich
   die Summe. Die Ebene je Feld hängt `aktionen.mjs` beim Bauen des
   Ereignisses aus der Karte an — hier stehen nur x, y und Kosten,
   damit `erreichbareFelder`, `wegSuche` und `pfadAus` dieselbe Form
   haben.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/gitter.mjs` (Karte, `richtungen`, Feldindizes),
   `spiel/hoehen.mjs` (`laufKosten` und `sturzTiefe` — die Preise und
   die Sturzgrenze), `spiel/aktionen.mjs` (führt den Pfad aus und baut
   `bewegt`), `spiel/gegner-ki.mjs` (sucht Wege und freie Plätze),
   `runtime/zeichnen.js` (färbt die erreichbaren Felder ein),
   `werkzeuge/pruefe-wegfindung.mjs`. */

import { richtungen } from "./gitter.mjs";
import { laufKosten, sturzTiefe } from "./hoehen.mjs";

/* Die echten Regeln als ein Bündel. Wer eigene reicht, ersetzt beide
   zugleich — sonst rechnete die Suche die Preise nach der einen und
   die Sturzgrenze nach der anderen Elle. */
export const HOEHEN_REGELN = { laufKosten, sturzTiefe };

const NIEMAND_BELEGT = () => false;

function einstellungenAus(roh) {
  const o = roh || {};
  const regeln = o.hoehenRegeln || HOEHEN_REGELN;
  /* Halbe gereichte Regeln sind gefährlicher als gar keine: Es
     rechnete dann die Preise nach der einen und die Sturzgrenze nach
     der anderen Elle, und das fiele erst an einer Figur auf, die
     irgendwo im Graben steht. */
  if (typeof regeln.laufKosten !== "function" || typeof regeln.sturzTiefe !== "function") {
    throw new Error("wegfindung: hoehenRegeln braucht laufKosten und sturzTiefe");
  }
  return {
    belegt: typeof o.belegt === "function" ? o.belegt : NIEMAND_BELEGT,
    regeln,
    stuerzeErlaubt: o.stuerzeErlaubt === true
  };
}

/* Eine brauchbare Punktegrenze. `Infinity` darf durch — die Gegner-KI
   fragt nach dem Weg und nicht nach dem Zug. Alles Unbrauchbare wird
   zu 0 und nicht etwa zu `NaN`: `kosten > NaN` ist **immer** falsch,
   eine Grenze `NaN` machte also lautlos die ganze Karte erreichbar. */
function grenzeAus(wert, standard) {
  if (wert === undefined || wert === null) return standard;
  if (typeof wert !== "number" || Number.isNaN(wert)) return 0;
  return wert < 0 ? 0 : wert;
}

/* Nicht-ganze Koordinaten ergäben über `index(x,y)` einen krummen
   Feldindex, der in keiner Reihe steht — der Fehler fiele erst Felder
   später auf. Lieber sofort laut. */
function ganzesFeld(x, y, wo) {
  if (Number.isInteger(x) && Number.isInteger(y)) return;
  throw new Error(`wegfindung: ${wo} braucht ganze Feldkoordinaten (${x},${y})`);
}

/* Eine binäre Halde über (Kosten, Feldindex). Keine nach jeder
   Einfügung neu sortierte Liste: Eine Karte hat einige tausend Felder,
   und die Suche läuft je Zug und je Wesen.

   Der Vergleich endet beim Feldindex, und weil kein Feld zweimal mit
   denselben Kosten hineingelegt wird (eingelegt wird nur bei echter
   Verbesserung), gibt es nie zwei gleichwertige Einträge. Damit hängt
   die Reihenfolge, in der die Halde ausgibt, allein am Vergleich und
   nicht daran, wie sie intern tauscht — das ist die Eigenschaft, auf
   der der ganze Gleichlauf steht. */
function macheHalde() {
  const kosten = [];
  const felder = [];

  const vorne = (i, j) =>
    kosten[i] < kosten[j] || (kosten[i] === kosten[j] && felder[i] < felder[j]);

  const tausche = (i, j) => {
    const k = kosten[i]; kosten[i] = kosten[j]; kosten[j] = k;
    const f = felder[i]; felder[i] = felder[j]; felder[j] = f;
  };

  return {
    leer: () => felder.length === 0,

    hinein(neueKosten, feld) {
      kosten.push(neueKosten);
      felder.push(feld);
      let i = felder.length - 1;
      while (i > 0) {
        const eltern = (i - 1) >> 1;
        if (!vorne(i, eltern)) break;
        tausche(i, eltern);
        i = eltern;
      }
    },

    heraus() {
      const kopfKosten = kosten[0];
      const kopfFeld = felder[0];
      const letzte = felder.length - 1;
      kosten[0] = kosten[letzte];
      felder[0] = felder[letzte];
      kosten.pop();
      felder.pop();
      let i = 0;
      for (;;) {
        const links = 2 * i + 1;
        const rechts = links + 1;
        let klein = i;
        if (links < felder.length && vorne(links, klein)) klein = links;
        if (rechts < felder.length && vorne(rechts, klein)) klein = rechts;
        if (klein === i) break;
        tausche(i, klein);
        i = klein;
      }
      return { kosten: kopfKosten, feld: kopfFeld };
    }
  };
}

/* Der eine Suchlauf hinter beiden öffentlichen Fragen. `zielIndex`
   ist -1, wenn die ganze Fläche gemeint ist; sonst endet der Lauf,
   sobald das Ziel abgearbeitet ist — dessen Eintrag ist dann endgültig,
   weil alle Felder seines Weges vorher abgearbeitet wurden. */
function laufeSuche(karte, vx, vy, grenze, o, zielIndex) {
  const felder = new Map();
  if (!karte.drin(vx, vy) || !(grenze >= 0)) return felder;

  const start = karte.index(vx, vy);
  /* Das eigene Feld gehört dazu, auch wenn `belegt` es meldet: Dort
     steht die Figur, die gerade laufen will. */
  felder.set(start, { x: vx, y: vy, kosten: 0, vorher: null });

  const fertig = new Uint8Array(karte.anzahl);
  const halde = macheHalde();
  halde.hinein(0, start);

  while (!halde.leer()) {
    const { kosten, feld } = halde.heraus();
    if (fertig[feld]) continue;      /* veralteter Eintrag derselben Halde */
    fertig[feld] = 1;
    if (feld === zielIndex) break;

    const x = feld % karte.breite;
    const y = (feld - x) / karte.breite;

    for (const r of richtungen(y)) {
      const nx = x + r.dx;
      const ny = y + r.dy;
      if (!karte.drin(nx, ny)) continue;
      const nachbarIndex = karte.index(nx, ny);
      if (fertig[nachbarIndex]) continue;
      if (o.belegt(nx, ny)) continue;

      const schritt = o.regeln.laufKosten(karte, x, y, nx, ny);
      if (schritt === null || schritt === undefined) continue;
      if (typeof schritt !== "number" || !Number.isFinite(schritt) || schritt <= 0) {
        throw new Error(
          `wegfindung: laufKosten muss null oder eine Zahl über 0 geben (${schritt})`);
      }
      /* Ein Sturz ist erlaubter Schritt in `hoehen.mjs`, aber kein Weg,
         den jemand freiwillig geht — siehe Kopfnotiz. */
      if (!o.stuerzeErlaubt && o.regeln.sturzTiefe(karte, x, y, nx, ny) > 0) continue;

      const neu = kosten + schritt;
      if (neu > grenze) continue;
      const bisher = felder.get(nachbarIndex);
      if (bisher !== undefined && bisher.kosten <= neu) continue;
      if (bisher === undefined) {
        felder.set(nachbarIndex, { x: nx, y: ny, kosten: neu, vorher: feld });
      } else {
        bisher.kosten = neu;
        bisher.vorher = feld;
      }
      halde.hinein(neu, nachbarIndex);
    }
  }
  return felder;
}

/* Die Reihenfolge einer `Map` ist die Einfügereihenfolge — also die
   Reihenfolge, in der die Suche die Felder gefunden hat. Wer sie
   anzeigt oder zu einer Prüfzahl verrechnet, hinge damit an den
   Innereien des Verfahrens. Ausgegeben wird deshalb nach Feldindex
   aufsteigend, dieselbe Ordnung, die `alleFelder` benutzt. */
function nachIndex(felder) {
  const geordnet = new Map();
  for (const schluessel of [...felder.keys()].sort((a, b) => a - b)) {
    geordnet.set(schluessel, felder.get(schluessel));
  }
  return geordnet;
}

/* Alle Felder, die von (vx,vy) aus mit `ap` Punkten erreichbar sind —
   Schlüssel ist der Feldindex, Wert `{x, y, kosten, vorher}` mit
   `kosten` als Preis des ganzen Weges und `vorher` als Feldindex des
   Vorgängers (`null` beim Startfeld). Das Startfeld ist immer dabei,
   solange es auf der Karte liegt; ohne Punkte ist es das einzige. */
export function erreichbareFelder(karte, vx, vy, ap, einstellungen) {
  ganzesFeld(vx, vy, "erreichbareFelder");
  const o = einstellungenAus(einstellungen);
  return nachIndex(laufeSuche(karte, vx, vy, grenzeAus(ap, 0), o, -1));
}

/* Der billigste Weg von `von` nach `nach` als `{pfad, kosten}` oder
   `null`, wenn keiner unter `maxKosten` passt. `belegt` sperrt auch das
   Zielfeld: Wer zu einem Gegner *hin* will, sucht das Feld daneben —
   `naechstesFreiesFeld` oder eine Suche auf dessen Nachbarn. */
export function wegSuche(karte, von, nach, einstellungen) {
  if (!von || !nach) return null;
  ganzesFeld(von.x, von.y, "wegSuche");
  ganzesFeld(nach.x, nach.y, "wegSuche");
  if (!karte.drin(von.x, von.y) || !karte.drin(nach.x, nach.y)) return null;

  const start = karte.index(von.x, von.y);
  const ziel = karte.index(nach.x, nach.y);
  /* Wer schon dasteht, geht keinen Schritt — und der Pfad hat trotzdem
     die Form, die der Aufrufer erwartet. */
  if (start === ziel) return { pfad: [{ x: von.x, y: von.y, kosten: 0 }], kosten: 0 };

  const o = einstellungenAus(einstellungen);
  if (karte.blocktBewegung(nach.x, nach.y)) return null;
  if (o.belegt(nach.x, nach.y)) return null;

  const grenze = grenzeAus(einstellungen ? einstellungen.maxKosten : undefined, Infinity);
  const felder = laufeSuche(karte, von.x, von.y, grenze, o, ziel);
  const eintrag = felder.get(ziel);
  if (eintrag === undefined) return null;
  return { pfad: pfadAus(felder, ziel), kosten: eintrag.kosten };
}

/* Der Weg zu einem Feld, aus dem Ergebnis von `erreichbareFelder`
   zurückverfolgt: `[{x, y, kosten}]` vom Startfeld (Kosten 0) bis zum
   Ziel. Ein Ziel, das nicht in der Feldkarte steht, gibt eine leere
   Liste — kein `null`, weil jeder Aufrufer darüber läuft. */
export function pfadAus(feldKarte, zielIndex) {
  const pfad = [];
  if (!feldKarte || typeof feldKarte.get !== "function") return pfad;

  let stelle = zielIndex;
  /* Eine Vorgängerkette kann nicht länger sein als die Feldkarte. Ist
     sie es doch, ist die Karte kaputt (ein Kreis) — dann lieber ein
     Abbruch als eine Schleife, die den Zug hängen lässt. */
  let uebrig = feldKarte.size + 1;
  while (stelle !== null && stelle !== undefined) {
    const eintrag = feldKarte.get(stelle);
    if (eintrag === undefined) {
      if (pfad.length === 0) return pfad;
      throw new Error(`pfadAus: Vorgängerkette bricht bei Feld ${stelle} ab`);
    }
    pfad.push({ x: eintrag.x, y: eintrag.y, kosten: eintrag.kosten });
    stelle = eintrag.vorher;
    if (--uebrig < 0) throw new Error("pfadAus: Vorgängerkette dreht sich im Kreis");
  }
  pfad.reverse();
  return pfad;
}

/* Das nächstgelegene Feld, auf dem niemand steht und auf das man
   treten darf — `(x,y)` selbst, wenn es frei ist.

   Das ist ausdrücklich **keine** Wegsuche: Es fragt weder nach
   Aktionspunkten noch nach Höhen, sondern sucht einen *Platz* — wohin
   ein Beschworener tritt, wohin eine gestoßene Figur ausweicht, wo ein
   Spieler startet, wenn sein Feld besetzt ist. Durch Wände sucht es
   nicht, über besetzte Felder hinweg schon: Hinter dem Nachbarn kann
   frei sein.

   Bei gleicher Entfernung gewinnt der kleinere Feldindex — dieselbe
   Regel wie in der Warteschlange der Suche, aus demselben Grund. */
export function naechstesFreiesFeld(karte, x, y, einstellungen) {
  ganzesFeld(x, y, "naechstesFreiesFeld");
  const o = einstellungenAus(einstellungen);
  if (!karte.drin(x, y)) return null;

  const frei = (px, py) => !karte.blocktBewegung(px, py) && !o.belegt(px, py);
  if (frei(x, y)) return { x, y };

  const gesehen = new Uint8Array(karte.anzahl);
  gesehen[karte.index(x, y)] = 1;
  let schicht = [karte.index(x, y)];

  while (schicht.length > 0) {
    const naechste = [];
    for (const feld of schicht) {
      const fx = feld % karte.breite;
      const fy = (feld - fx) / karte.breite;
      for (const r of richtungen(fy)) {
        const nx = fx + r.dx;
        const ny = fy + r.dy;
        if (!karte.drin(nx, ny)) continue;
        const nachbarIndex = karte.index(nx, ny);
        if (gesehen[nachbarIndex]) continue;
        gesehen[nachbarIndex] = 1;
        if (karte.blocktBewegung(nx, ny)) continue;
        naechste.push(nachbarIndex);
      }
    }
    naechste.sort((a, b) => a - b);
    for (const feld of naechste) {
      const fx = feld % karte.breite;
      const fy = (feld - fx) / karte.breite;
      if (!o.belegt(fx, fy)) return { x: fx, y: fy };
    }
    schicht = naechste;
  }
  return null;
}
