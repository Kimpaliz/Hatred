/* [Aufgabe: Regelkern] Die Brücke von Janniks Bildpunkt-Höhle auf das
   Kachelfeld: Wände, Ebenen, Rampen, Wasser, Boden, Zier, Licht, Starts.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Der Auftrag steht wörtlich: *„wegen der Landschaft. benutze meine
   pixelslop engine aus scotophobia, aber erst mal nur mit wasser und
   ohne gase. die landschft muss auf ein kachel raster feld generiert
   werden. also wände im raster muster, aber trotzdem natürliche
   wände."*

   Die **Form** kommt deshalb nicht mehr von hier: `spiel/welt-feld.mjs`
   sagt an jeder Stelle, wie weit die nächste Wand entfernt ist. Diese
   Datei macht daraus Kacheln und nur das — sie tastet ab, rastert,
   räumt auf und sorgt dafür, dass man überall hinkommt.

   „Im Rastermuster" und trotzdem „natürliche Wände" geht genau dann,
   wenn die Entscheidung *Wand oder nicht* je Kachel fällt, ihre
   Grundlage aber **feiner** ist als die Kachel. Deshalb neun Proben je
   Kachel: Die Wand liegt auf ganzen Kacheln, ihr Umriss folgt der
   Höhlenform.

   ── Was das Rastern kaputt macht ───────────────────────────────────

   Vier Krankheiten, alle vier erst im Spiel zu sehen. Gegen jede steht
   ein eigener, einzeln aufrufbarer Schritt — einzeln, weil eine Karte,
   die am Ende spielbar ist, nichts darüber sagt, ob der
   Mehrheitsfilter arbeitet:

   · **Die Nur-Diagonale.** Zwei Kacheln berühren sich über Eck und
     sehen verbunden aus; bei vier Richtungen sind sie es nicht. Fällt
     erst auf, wenn ein Spieler in einer Ecke feststeckt.
   · **Der Ausrutscher in der Höhe.** Eine einzelne Kachel Ebene 3
     mitten in Ebene 1 ist kein Plateau, sondern eine unbesteigbare
     Stufe.
   · **Die Insel ohne Ufer.** Ein Hohlraum, den der Kartenrand oder
     eine Felsmasse vom Rest abschneidet.
   · **Die Grube ohne Rampe.** Hinab kommt man überall, hinauf nur über
     eine Rampe — wer nur vorwärts prüft, baut eine Falle.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/welt-feld.mjs` (`macheWeltfeld`: die Höhlenformel, dazu
   `versatz`, `raumBei`, `entzerre` für Hallen und Raumliste),
   `spiel/bauart.mjs` (`PIXEL_JE_FELD`, `wasserMindestSee`,
   `wandAnhebungWeite`), `spiel/welt-rauschen.mjs` (`hash`, `fbm` für
   Boden und Zier — kein `Math.random`, Fehlerbuch B1),
   `spiel/gitter.mjs` (Feldwerte und Karte), `spiel/hoehen.mjs`
   (`laufKosten` — die **eine** Schrittregel; eine zweite, bequemere
   Bau-Regel wäre die Naht, an der eine Karte „geprüft" und doch
   unspielbar ist), `spiel/lauf.mjs` (baut damit jede Ebene),
   `werkzeuge/pruefe-landschaft.mjs`, `werkzeuge/karte-zeigen.mjs`. */

import {
  macheKarte, richtungen, RAMPE, BODEN, FLUESSIG, HINDERNIS,
  BLOCKT_BEWEGUNG, EBENEN, EBENE_GRABEN
} from "./gitter.mjs";
import { laufKosten, STURZ_AB_STUFEN } from "./hoehen.mjs";
import { macheWeltfeld } from "./welt-feld.mjs";
import { PIXEL_JE_FELD } from "./bauart.mjs";
import { feldMitte, ZEILEN_HOEHE } from "./raster.mjs";
import { hash, fbm } from "./welt-rauschen.mjs";

import {
  FACKEL_ABSTAND, SPIESS_HAEUFIGKEIT, START_NAEHE, ZIER_ARTEN, ZIER_FENSTER,
  markiereRaum, setzeWasser,
  macheHallenProbe,
  setzeBoden,
  zierErlaubt,
  setzeFackeln,
  setzeZier,
  waehleStarts,
  waehleAusgang,
  sammleRaeume
} from "./ausstattung.mjs";

import {
  spalte, zeile, gegen, offen, alleDabei, gleicheEbene, gebiete, plateaus,
  beckenGebiete
} from "./kachelhilfe.mjs";

import {
  laufKostenFeld, erreichbareFelder, beidseitigErreichbar, offeneGebiete,
  groesstesPlateauFeld, kachelMitte
} from "./erreichbarkeit.mjs";

/* ── Die Zahlen dieser Brücke ───────────────────────────────────────
   Nicht in `bauart.mjs`: Dort steht, wie die Höhle aussieht, hier, wie
   man sie auf Kacheln legt. */

/* Neun Proben je Kachel, ab fünf Felsproben ist sie Wand. 2 × 2 hätte
   keine Mehrheit, 4 × 4 kostet doppelt und verschiebt kaum etwas. */
export const UEBERABTASTUNG = 3;
export const FELS_MEHRHEIT = 5;

/* Kleinste Karte, die das trägt: Der Skelettsektor der Engine misst
   204 Bildpunkte = 12,75 Kacheln; unter 20 liegt weniger als
   eineinhalb Sektoren und damit unter zwei Räumen. */
export const MIN_KARTE = 20;

/* Eine Ebenenfläche unter drei Kacheln ist kein Plateau, sondern ein
   Ausrutscher des Rauschens. */
export const MIN_EBENEN_FLAECHE = 3;

/* Obergrenzen. Sie fangen keinen erwarteten Fall, sondern einen
   Denkfehler: Jede Schleife hier setzt in jedem Durchgang etwas, kann
   also nicht endlos laufen — es sei denn, sie tut es doch. */
export const RAMPEN_RUNDEN = 24;
export const AUFRAEUM_RUNDEN = 8;
export const EBENEN_RUNDEN = 64;

/* Anteil der zusätzlichen Rampen an allen möglichen Aufstiegen. Eine
   Karte mit genau einem Weg hinauf ist ein Flur, kein Schlachtfeld. */
export const ZUSATZ_RAMPEN = 0.22;





/* Die Arten, die `karte.raeume` trägt. Halle und Kammer kommen aus
   der Engine; Eingang und Ausgang werden erst markiert, wenn
   feststeht, wo sie liegen. */
export const RAUM_ARTEN = ["halle", "kammer", "eingang", "ausgang"];

const P = PIXEL_JE_FELD;



/* „Offen" heißt hier immer: blockt die Bewegung nicht. Eine Säule ist
   damit keine offene Kachel — und genau so soll jede
   Erreichbarkeitsfrage sie sehen. */

/* ═══ Schritt 1 — Rastern ═══════════════════════════════════════════════════
   Neun Proben an den Neuntelmitten. Die mittlere liegt genau auf der
   Kachelmitte; ihr Wert wird zurückgegeben, weil der Boden ihn noch
   braucht (Geröll am Wandfuß) und ein zweiter Durchlauf durch
   `feldBei` das Teuerste wäre, was man hier tun kann. */
/* Der Zeilenabstand eines Sechseckrasters, in Feldbreiten. */
export const ZEILEN_ABSTAND = ZEILEN_HOEHE / P;

export function rastereWaende(karte, welt) {
  const wandNaehe = new Float32Array(karte.anzahl);
  const schritt = P / UEBERABTASTUNG;
  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) {
      const mittePunkt = feldMitte(x, y);
      let fels = 0, mitte = 0;
      for (let b = 0; b < UEBERABTASTUNG; b++) {
        for (let a = 0; a < UEBERABTASTUNG; a++) {
          const wert = welt.feldBei(
            mittePunkt.x + (a - 1) * schritt, mittePunkt.y + (b - 1) * schritt);
          if (wert > 0) fels++;
          if (a === 1 && b === 1) mitte = wert;
        }
      }
      const i = y * karte.breite + x;
      wandNaehe[i] = mitte;
      karte.hindernis[i] = fels >= FELS_MEHRHEIT ? HINDERNIS.wand : HINDERNIS.keins;
    }
  }
  return wandNaehe;
}

/* ═══ Schritt 2 — Rand ══════════════════════════════════════════════════════
   Die äußerste Reihe ist immer Wand. Nicht aus Schönheit: Die Höhle
   der Engine ist unendlich, die Karte ein Ausschnitt. Ohne
   geschlossenen Rand endete ein Gang im Nichts, und jede Wegsuche
   liefe gegen eine Kante, die wie ein Ausgang aussieht. */
export function setzeRand(karte) {
  let gesetzt = 0;
  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) {
      if (x > 0 && y > 0 && x < karte.breite - 1 && y < karte.hoehe - 1) continue;
      const i = y * karte.breite + x;
      if (karte.hindernis[i] !== HINDERNIS.wand) gesetzt++;
      karte.hindernis[i] = HINDERNIS.wand;
    }
  }
  return gesetzt;
}

/* ═══ Schritt 3 — Ebenen ════════════════════════════════════════════════════
   Die Ebene an der Kachelmitte, roh und ungefiltert. */
export function roheEbenen(karte, welt) {
  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) {
      const mitte = feldMitte(x, y);
      karte.ebene[y * karte.breite + x] = welt.ebeneBei(mitte.x, mitte.y);
    }
  }
}

/* Mehrheit über 3 × 3, gleichzeitig aus einer Abschrift: Der Reihe
   nach sähe die zweite Kachel das Ergebnis der ersten, und das Bild
   zöge nach rechts unten. Bei Gleichstand gewinnt die eigene Ebene —
   eine feste Regel statt einer, die an der Zählreihenfolge hängt. */
export function mehrheitsFilter(karte) {
  const alt = karte.ebene.slice();
  const zahl = new Int32Array(EBENEN);
  let geaendert = 0;
  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) {
      zahl.fill(0);
      for (let b = -1; b <= 1; b++) {
        for (let a = -1; a <= 1; a++) {
          if (karte.drin(x + a, y + b)) zahl[alt[(y + b) * karte.breite + x + a]]++;
        }
      }
      const i = y * karte.breite + x;
      let beste = 0;
      for (let e = 1; e < EBENEN; e++) if (zahl[e] > zahl[beste]) beste = e;
      if (zahl[alt[i]] === zahl[beste]) beste = alt[i];
      if (beste !== alt[i]) geaendert++;
      karte.ebene[i] = beste;
    }
  }
  return geaendert;
}



/* Flächen gleicher Ebene über alle Kacheln, auch über Fels: Die Ebene
   einer Wand ist im Bild sichtbar (sie trägt die Schattenkante), also
   gilt die Mindestgröße auch dort.

   **Nur der Abgrund zählt nicht mit.** Seine Ebene ist die seiner
   Sohle (Vorgang #8, Schritt 2) und beschreibt kein Stück Gelände,
   sondern wie tief das Loch ist. Zählte er mit, wäre jedes einzelne
   Loch mitten auf einem Plateau eine Ebenenfläche von einer Kachel und
   damit genau der „Ausrutscher des Rauschens", den `MIN_EBENEN_FLAECHE`
   verbietet — gemessen über 60 Karten 573 solcher Flächen statt 0.

   Für alles, was vor `grabeAbgruende` läuft, ändert das nichts: Bis
   dahin gibt es keine Abgrundkachel, und `legeKleineEbenenZusammen`
   bekommt Kachel für Kachel dieselbe Antwort wie vorher. */
export function ebenenFlaechen(karte) {
  return gebiete(karte, (i) => karte.hindernis[i] !== HINDERNIS.abgrund,
    gleicheEbene(karte));
}

/* Zu kleine Flächen bekommen die Ebene ihrer häufigsten Nachbarfläche.
   Das läuft zusammen, weil jede Zuweisung die Fläche mit einer
   Nachbarfläche **verschmilzt**: Die Zahl der Flächen sinkt in jedem
   Durchgang um mindestens eins. */
export function legeKleineEbenenZusammen(karte, mindest = MIN_EBENEN_FLAECHE) {
  let runden = 0;
  for (;;) {
    const { nummer, groessen } = ebenenFlaechen(karte);
    let kleinste = -1;
    for (let m = 0; m < groessen.length; m++) {
      if (groessen[m] < mindest) { kleinste = m; break; }
    }
    if (kleinste < 0) return runden;
    if (++runden > EBENEN_RUNDEN) {
      throw new Error(`legeKleineEbenenZusammen: mehr als ${EBENEN_RUNDEN} Durchgänge`);
    }
    const zahl = new Int32Array(EBENEN);
    const felder = [];
    for (let i = 0; i < karte.anzahl; i++) {
      if (nummer[i] !== kleinste) continue;
      felder.push(i);
      const x = spalte(karte, i), y = zeile(karte, i);
      for (const r of richtungen(y)) {
        const nx = x + r.dx, ny = y + r.dy;
        if (!karte.drin(nx, ny)) continue;
        const j = ny * karte.breite + nx;
        if (nummer[j] !== kleinste) zahl[karte.ebene[j]]++;
      }
    }
    let beste = -1;
    for (let e = 0; e < EBENEN; e++) if (beste < 0 || zahl[e] > zahl[beste]) beste = e;
    /* Eine Fläche ohne fremde Nachbarn ist die ganze Karte — dann ist
       sie nicht zu klein. Trotzdem geprüft, sonst liefe die Schleife
       ewig statt aufzufallen. */
    if (zahl[beste] === 0) throw new Error("legeKleineEbenenZusammen: Fläche ohne Nachbarn");
    for (const i of felder) karte.ebene[i] = beste;
  }
}

/* ── Kliffe: aus zwei Stufen wird eine Kante ────────────────────────
   Gemessen am 06.09.2026 über zehn Saaten: **1,8** Absturzkanten je
   Karte gegen **260,5** einstufige. Damit war der Stoß tot — und der
   Stoß ist die Aktion, die aus dem Höhensystem ein Spiel macht
   (`docs/SPIEL.md` 3). Eine Regel, die auf der erzeugten Karte nie
   greift, ist keine Regel.

   Der Grund liegt im Rauschen und nicht im Zufall: Ein stetiges Feld
   muss auf dem Weg von Ebene 0 nach Ebene 2 durch das Band der Ebene 1
   — und dieses Band ist meist ein bis zwei Kacheln breit. Zwei Ebenen
   Unterschied zwischen **benachbarten** Kacheln kann es so kaum geben.

   Also wird das schmale Zwischenband entfernt, nicht ein Absturz
   hinzuerfunden: Eine Fläche, die zwischen einer tieferen und einer
   höheren liegt und schmal genug ist, fällt der größeren Nachbarin zu.
   Aus 0-1-2 wird 0-2, und die Kante steht.

   Das ist dieselbe Bauart wie bei den Felsinseln der Engine: nicht aus
   dem Rauschen hoffen, sondern setzen — nur so lässt sich etwas
   zusichern. Und es **verkleinert** Flächen nie, es verschmilzt sie;
   die Mindestgröße aus `legeKleineEbenenZusammen` bleibt also heil.

   Erreichbarkeit: Ein Kliff ist abwärts immer begehbar (Sturz), aufwärts
   nur über eine Rampe — und die Rampen werden **danach** gesetzt, mit
   den echten Regeln aus `spiel/hoehen.mjs`. Ein Kliff kann die Karte
   also nicht zerschneiden. */
export const KLIFF_RUNDEN = 8;

export function schneideKliffe(karte) {
  let geschnitten = 0;
  for (let runde = 0; runde < KLIFF_RUNDEN; runde++) {
    /* Erst alle Zwischenkacheln der Runde suchen, dann setzen. Wer
       mitten im Suchen ändert, liest für die späteren Kacheln schon die
       neue Ebene — und das Ergebnis hinge an der Reihenfolge, in der
       man die Karte durchläuft. Genau so laufen zwei Rechner
       auseinander (Fehlerbuch B2). */
    const aenderungen = [];
    for (let i = 0; i < karte.anzahl; i++) {
      if (!offen(karte, i)) continue;
      const e = karte.ebene[i];
      const x = spalte(karte, i), y = zeile(karte, i);
      let tiefer = 0, hoeher = 0;
      for (const r of richtungen(y)) {
        const nx = x + r.dx, ny = y + r.dy;
        if (!karte.drin(nx, ny)) continue;
        const j = ny * karte.breite + nx;
        if (!offen(karte, j)) continue;
        if (karte.ebene[j] === e - 1) tiefer++;
        else if (karte.ebene[j] === e + 1) hoeher++;
      }
      /* Eine Kachel, die zugleich einen tieferen und einen höheren
         Nachbarn hat, ist die ganze Böschung — einen Bildpunkt breit.
         Sie fällt der stärkeren Seite zu, und aus 0-1-2 wird 0-2. */
      if (tiefer === 0 || hoeher === 0) continue;
      aenderungen.push([i, hoeher > tiefer ? e + 1 : e - 1]);
    }
    if (!aenderungen.length) break;
    for (const [i, ziel] of aenderungen) karte.ebene[i] = ziel;
    geschnitten += aenderungen.length;
  }
  /* Das Zusammenlegen zu kleiner Flächen steht **nicht** hier, obwohl
     das Schneiden welche erzeugen kann: Ein Schritt, der zwei Dinge tut,
     lässt sich nicht mehr einzeln prüfen. `setzeEbenen` ruft beide
     nacheinander auf, und die Prüfung fährt dieselbe Reihenfolge. */
  return geschnitten;
}

export function setzeEbenen(karte, welt) {
  roheEbenen(karte, welt);
  const gefiltert = mehrheitsFilter(karte);
  const kliffe = schneideKliffe(karte);
  const runden = legeKleineEbenenZusammen(karte);
  return { gefiltert, kliffe, runden };
}

/* ═══ Schritt 4 — Aufräumen ═════════════════════════════════════════════════
   Sind alle vier Nachbarn offen — oder alle vier gesperrt? Die Frage
   nach der **einzelnen** Kachel, in beiden Richtungen. */
function ringsum(karte, i, sollOffen) {
  const x = spalte(karte, i), y = zeile(karte, i);
  for (const r of richtungen(y)) {
    if (offen(karte, (y + r.dy) * karte.breite + x + r.dx) !== sollOffen) return false;
  }
  return true;
}

/* Alle inneren Kacheln, auf die `trifft` zutrifft, bekommen `neu` —
   erst, wenn alle gefunden sind. Der Reihe nach zu setzen hieße, dass
   die zweite Kachel das Ergebnis der ersten sieht. */
function wandleInnere(karte, trifft, neu) {
  const treffer = [];
  for (let y = 1; y < karte.hoehe - 1; y++) {
    for (let x = 1; x < karte.breite - 1; x++) {
      const i = y * karte.breite + x;
      if (trifft(i)) treffer.push(i);
    }
  }
  for (const i of treffer) karte.hindernis[i] = neu;
  return treffer.length;
}

/* (a) Eine einzelne offene Kachel, ringsum Wand, ist kein Raum,
   sondern ein Loch im Fels, das niemand je betritt. */
export function schliesseEinzelneHohlraeume(karte) {
  return wandleInnere(karte,
    (i) => offen(karte, i) && ringsum(karte, i, false), HINDERNIS.wand);
}

/* (b) Eine einzelne Wandkachel mitten im Offenen bleibt stehen, wird
   aber zur Säule: die beste Deckung, die eine Höhle hat. Man kann sie
   umrunden, sie blockt Sicht und Schuss, sie kostet keinen Schritt —
   wegwerfen wäre der bequemste und teuerste Fehler. */
export function macheSaeulen(karte) {
  return wandleInnere(karte,
    (i) => karte.hindernis[i] === HINDERNIS.wand && ringsum(karte, i, true),
    HINDERNIS.saeule);
}

/* Wie viel Fels ringsum (acht Nachbarn). Entscheidet, welche
   Sperrkachel einer Nur-Diagonale fällt: die dünnere — so frisst der
   Eingriff sich nicht in eine Felsmasse hinein. */
function felsRingsum(karte, x, y) {
  let zahl = 0;
  for (let b = -1; b <= 1; b++) {
    for (let a = -1; a <= 1; a++) {
      if (a === 0 && b === 0) continue;
      const nx = x + a, ny = y + b;
      /* Außerhalb zählt als Fels — sonst wäre die Kachel am Rand die
         dünnste Stelle der Karte und würde immer aufgebrochen. */
      if (!karte.drin(nx, ny) || !offen(karte, ny * karte.breite + nx)) zahl++;
    }
  }
  return zahl;
}



/* Die Aufräumschritte, bis sich nichts mehr rührt: Ein geschlossenes
   Loch kann eine neue Nur-Diagonale bilden, eine geöffnete Diagonale
   ein neues Loch. Deshalb im Kreis, mit Obergrenze — ein Schaukeln
   soll auffallen statt ewig zu laufen. Säulen zuletzt: Eine Wand, die
   eine Nur-Diagonale sperrt, soll geöffnet werden dürfen, bevor jemand
   sie zur Deckung erklärt. Ebenen ganz zuletzt, sonst prüfte die
   Mindestgröße eine Karte, die es nicht mehr gibt. */
export function raeumeAuf(karte) {
  let geschlossen = 0, geoeffnet = 0, runden = 0;
  for (;;) {
    const zu = schliesseEinzelneHohlraeume(karte);
    geschlossen += zu;
    if (zu === 0) break;
    if (++runden > AUFRAEUM_RUNDEN) throw new Error("raeumeAuf: läuft nicht zusammen");
  }
  const saeulen = macheSaeulen(karte);
  const ebenenRunden = legeKleineEbenenZusammen(karte);
  return { geschlossen, saeulen, geoeffnet, ebenenRunden, runden };
}


/* Alles, was nicht am größten Gebiet hängt, wird Fels. Der Hohlraum
   hinter einer Felsmasse ist kein Geheimnis, sondern eine Kammer, in
   die kein Spieler je kommt — in der `spiel/lauf.mjs` aber Brut
   aufstellen würde. */
export function verfuelleNebenraeume(karte) {
  const { nummer, groessen } = offeneGebiete(karte);
  if (groessen.length <= 1) return 0;
  let beste = 0;
  for (let m = 1; m < groessen.length; m++) if (groessen[m] > groessen[beste]) beste = m;
  let verfuellt = 0;
  for (let i = 0; i < karte.anzahl; i++) {
    if (nummer[i] < 0 || nummer[i] === beste) continue;
    karte.hindernis[i] = HINDERNIS.wand;
    verfuellt++;
  }
  return verfuellt;
}





/* ═══ Schritt 5 — Rampen ════════════════════════════════════════════════════
   Jede Kante, an der eine Rampe etwas bewirken kann: zwei offene
   Nachbarn mit genau einer Stufe Unterschied. Zwei Stufen sind keine
   Kante, sondern eine Wand aus Höhe. */
export function aufstiegsKanten(karte) {
  const kanten = [];
  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) {
      const i = y * karte.breite + x;
      if (!offen(karte, i)) continue;
      for (const r of richtungen(y)) {
        const nx = x + r.dx, ny = y + r.dy;
        if (!karte.drin(nx, ny)) continue;
        const j = ny * karte.breite + nx;
        if (offen(karte, j) && karte.ebene[j] - karte.ebene[i] === 1) {
          kanten.push({ tief: i, hoch: j, rampe: r.rampe });
        }
      }
    }
  }
  return kanten;
}

/* Ein Teil aller möglichen Aufstiege wird gesetzt, bevor irgendetwas
   geprüft ist: Eine Karte mit genau einem Weg nach oben ist ein Flur —
   wer ihn hält, hält das Plateau. Gewürfelt wird aus Feldnummer und
   Saat, nie aus `Math.random`. */
export function streueZusatzRampen(karte, saat, anteil = ZUSATZ_RAMPEN) {
  let gesetzt = 0;
  for (const kante of aufstiegsKanten(karte)) {
    if (karte.rampe[kante.tief] !== RAMPE.keine) continue;
    if (hash(kante.tief, kante.rampe, (saat | 0) + 401) >= anteil) continue;
    karte.rampe[kante.tief] = kante.rampe;
    gesetzt++;
  }
  return gesetzt;
}


/* Der Kern von Schritt 5: fluten, Grenzen finden, Rampen setzen, von
   vorn. Geflutet wird **beidseitig** und mit `laufKosten` aus
   `spiel/hoehen.mjs` — eine eigene, bequemere Kopie der Schrittregel
   wäre die Naht, an der eine Karte geprüft aussieht und doch
   unspielbar ist.

   An einer Grenze steht immer ein Höhenunterschied; bei einer Stufe
   hilft eine Rampe auf der **tieferen** Kachel in Aufstiegsrichtung
   (Fehlerbuch A2). Bei zwei Stufen hilft keine, und was dahinterliegt,
   wird verfüllt — ein Plateau, das niemand betreten kann, ist Fels,
   der so tut als wäre er Boden. Danach wird aufgeräumt. */
export function verbindeMitRampen(karte) {
  const quelle = groesstesPlateauFeld(karte);
  if (quelle < 0) throw new Error("verbindeMitRampen: die Karte hat keine offene Kachel");
  const start = { x: spalte(karte, quelle), y: zeile(karte, quelle) };
  let rampen = 0, verfuellt = 0, runden = 0;
  for (;;) {
    const gut = beidseitigErreichbar(karte, [start]);
    const schlecht = [];
    for (let i = 0; i < karte.anzahl; i++) if (offen(karte, i) && !gut[i]) schlecht.push(i);
    if (schlecht.length === 0) return { rampen, verfuellt, runden };
    if (++runden > RAMPEN_RUNDEN) {
      throw new Error(`verbindeMitRampen: mehr als ${RAMPEN_RUNDEN} Durchgänge`);
    }
    let neu = 0;
    for (const i of schlecht) {
      const x = spalte(karte, i), y = zeile(karte, i);
      const tabelle = richtungen(y);
      for (let k = 0; k < tabelle.length; k++) {
        const r = tabelle[k];
        const nx = x + r.dx, ny = y + r.dy;
        if (!karte.drin(nx, ny)) continue;
        const j = ny * karte.breite + nx;
        if (!gut[j]) continue;
        if (karte.ebene[j] === karte.ebene[i] + 1 && karte.rampe[i] === RAMPE.keine) {
          /* i liegt tiefer: die Rampe gehört auf i und zeigt zu j. */
          karte.rampe[i] = r.rampe;
          rampen++; neu++;
        } else if (karte.ebene[i] === karte.ebene[j] + 1 && karte.rampe[j] === RAMPE.keine) {
          /* j liegt tiefer: die Rampe gehört auf j und zeigt zurück. */
          karte.rampe[j] = gegen(ny, k).rampe;
          rampen++; neu++;
        }
      }
    }
    if (neu > 0) continue;
    for (const i of schlecht) karte.hindernis[i] = HINDERNIS.wand;
    verfuellt += schlecht.length;
    raeumeAuf(karte);
  }
}

export function setzeRampen(karte, saat) {
  const zusatz = streueZusatzRampen(karte, saat);
  const pflicht = verbindeMitRampen(karte);
  return { zusatz, ...pflicht };
}

/* ═══ Schritt 5b — Abgründe ═════════════════════════════════════════════════

   Janniks Satz zu Vorgang #8 wörtlich: *„unterschiedliche ebenen und
   auf jeder ebene kann es wasserbecken oder sbruende [Abgründe] geben"*.

   ── Was ein Abgrund hier ist ───────────────────────────────────────

   Ein Loch im Boden einer **hoch gelegenen** Kachel. Hoch heißt: ab
   `STURZ_AB_STUFEN` über dem Graben, also ab Ebene 2. Das ist kein
   gewähltes Maß, sondern dasselbe, ab dem `spiel/hoehen.mjs` einen
   Abstieg einen Sturz nennt: Ein Loch, in das man eine Ebene tief
   fällt, tut keinen Schaden und ist ein Treppenabsatz.

   Wie tief es geht, entscheidet der Fels ringsum, und daraus fallen
   von selbst zwei Sorten Abgrund:

   · **Am Kliffrand** liegt neben der Kachel offener Boden, der
     mindestens zwei Ebenen tiefer liegt. Das Loch bricht dorthin
     durch; wer hineinfällt, schlägt auf diesem Boden auf und lebt.
     Die Sohle bekommt dessen Ebene.
   · **Mitten auf dem Plateau** liegt kein solcher Boden daneben. Dann
     geht der Schacht in den Fels, und niemand kommt unten an — die
     Sohle bekommt `STURZ_AB_STUFEN` unter dem Rand, und der Sturz ist
     tödlich.

   Beides ist dieselbe Regel, nur an verschiedenem Gestein. Wohin man
   fällt und ob man es überlebt, rechnet `abgrundSturz`
   (`spiel/hoehen.mjs`) allein aus der fertigen Karte — hier wird nichts
   davon zusätzlich vermerkt. Das ist Absicht: `karte.summe()` hasht die
   fünf Reihen, eine Nebenliste „welches Loch ist bodenlos" fiele aus
   der Desync-Erkennung heraus.

   Dass ein Abgrundfeld in der Reihe `ebene` die Ebene seiner **Sohle**
   trägt und nicht die seines Randes, ist die Festlegung aus Schritt 2;
   sie steht mit ihrer Begründung in `spiel/hoehen.mjs`.

   ── Warum je Kachel gewürfelt und nicht in Flecken ─────────────────

   Der erste Anlauf nahm ein grobes Rauschfeld, wie es `setzeBoden` für
   den Knochenteppich benutzt: zusammenhängende Schluchten statt
   einzelner Löcher. Er wurde am 07.09.2026 an der damaligen Fassung
   gemessen und verworfen, und zwar an der Sache selbst. Ein
   Rauschfleck liegt auf **einem** Plateau, und ein Loch trägt die
   Ebene seiner Sohle — also lagen die Löcher einer Karte überwiegend
   auf derselben Ebene: Bei vergleichbarer Lochzahl trugen mit dem
   Rauschfeld 16 von 30 Karten Abgründe auf zwei verschiedenen Ebenen,
   mit dem Wurf je Kachel 24 von 30. Dazu sperrte das Rauschfeld
   doppelt so oft einen Weg (113 zurückgenommene Löcher gegen 58) —
   eine Schlucht trennt, ein einzelnes Loch nur eine Kachel.

   Janniks Satz verlangt ausdrücklich *„unterschiedliche ebenen"* —
   und genau das kann ein einzelnes Rauschfeld über eine Karte nicht.

   ── Warum genau hier im Ablauf ─────────────────────────────────────

   Gemessen am 07.09.2026 an einem naiv gesetzten Abgrund: `raeumeAuf`
   macht die Insel im Loch zu Wand, `verfuelleNebenraeume` verfüllte
   81 von 162 begehbaren Kacheln, `verbindeMitRampen` ebenso. Der
   einzige Platz, an dem keiner dieser drei Schritte das Loch wieder
   zumauert, ist **nach** `setzeRampen` und **vor** `setzeWasser`.

   Vor dem Wasser und nicht danach, weil das Loch die Form der Karte
   ändert: Eine weggenommene Kachel kann aus einem Plateau eine Mulde
   machen, und `setzeWasser` fragt die Form (`beckenGebiete`).
   Umgekehrt gäbe es Wasser, das ins Loch liefe.

   ── Jedes Loch einzeln setzen und im Zweifel zurücknehmen ──────────

   Das Muster ist das von `zierErlaubt` (`spiel/ausstattung.mjs`):
   Kachel probeweise sperren, die Erreichbarkeit fragen, im Zweifel
   ablehnen. Gemessen: 12 beliebig gesetzte Abgründe schneiden auf
   Saat 1 bereits zwei offene Kacheln ab.

   Gefragt wird hier aber **global** und nicht wie dort in einem
   Fenster von 7 × 7 — und das ist der Unterschied, der gemessen den
   Ausschlag gibt: Eine Kliffkante ist genau die Stelle, an der die
   örtliche Frage falsch antwortet. Der Nachbar zwei Ebenen tiefer ist
   von oben erreichbar, von unten nie (hinauf geht es nur über eine
   Rampe), also findet `zierErlaubt` im Fenster keine beidseitige
   Verbindung und lehnt ab — obwohl die Karte über eine Rampe drei
   Kacheln weiter längst ganz zusammenhängt.

   Weil jede Kachel einzeln geprüft wird, ist die Karte nach jedem
   Schritt wieder ganz — und die eine globale Gegenprobe am Ende ist
   die Behauptung dieser Vollständigkeit, kein erwarteter Fall. Sie
   wirft, wenn sie doch etwas findet.

   Gewürfelt wird aus `hash(Feldnummer, Randebene, Saat)` — nie aus
   `Math.random` (Fehlerbuch B1), und mit eigener Saatverschiebung,
   damit dieser Wurf keinen späteren verschiebt (Fehlerbuch B4). */

/* Wie oft ein hoch genug gelegenes Feld ein Loch wird. Zwei Sätze,
   weil zwei verschiedene Dinge gewürfelt werden:

   · `ABGRUND_ANTEIL` gilt auf freier Fläche. Gemessen über 30 Saaten
     auf 44 × 32 (`werkzeuge/pruefe-abgrund.mjs`): 235,1 Kacheln je
     Karte liegen hoch genug, und zusammen mit dem Kliffsatz werden
     daraus 17,2 Löcher je Karte. Bei 0,12/0,55 wären es 22,2 und das
     Plateau wäre mehr Loch als Boden; bei 0,03/0,20 nur 6,9, und dann
     tragen nur 17 statt 22 von 30 Karten Abgründe auf zwei
     verschiedenen Ebenen.
   · `ABGRUND_KLIFF_ANTEIL` gilt am Kliffrand — dort, wo nebenan schon
     Boden zwei Ebenen tiefer liegt. Er ist höher, weil Fels dort
     weiterbricht, wo er schon abgebrochen ist. Er entscheidet zugleich
     über das **Spiel**: Nur ein Loch am Kliffrand hat einen Grund, auf
     dem man aufschlägt und weiterlebt. Mit gleichem Satz überall
     (0,09/0,09) sind gemessen 353 von 391 Löchern bodenlos (90 %), mit
     dem Kliffsatz 349 von 516 (68 %) — die 167 übrigen sind die, in
     die man einen Gegner stoßen kann, ohne ihn gleich zu töten. */
export const ABGRUND_ANTEIL = 0.09;
export const ABGRUND_KLIFF_ANTEIL = 0.45;

/* Die Sohle eines möglichen Lochs auf (x,y): die **höchste** offene
   Nachbarkachel, die noch mindestens `STURZ_AB_STUFEN` tiefer liegt —
   und `null`, wenn es keine gibt; dann ist der Schacht bodenlos und
   seine Sohle liegt `STURZ_AB_STUFEN` unter dem Rand.

   Höchste und nicht tiefste: Man schlägt auf dem ersten Boden auf, der
   trägt, nicht auf dem untersten der Karte. Ein Höchstwert und keine
   Reihenfolgenwahl — damit hängt nichts an der Reihenfolge, in der die
   sechs Nachbarn abgefragt werden (Fehlerbuch B2). */
function sohleUnter(karte, x, y) {
  const oben = karte.ebene[y * karte.breite + x];
  let sohle = null;
  for (const r of richtungen(y)) {
    const nx = x + r.dx, ny = y + r.dy;
    if (!karte.drin(nx, ny)) continue;
    const j = ny * karte.breite + nx;
    if (!offen(karte, j)) continue;
    const tief = karte.ebene[j];
    if (oben - tief >= STURZ_AB_STUFEN && (sohle === null || tief > sohle)) sohle = tief;
  }
  return sohle;
}

/* Wie viele offene Kacheln von `start` aus **nicht** beidseitig
   erreichbar sind. Null heißt: die Karte ist ganz. */
function abgeschnitten(karte, start) {
  const gut = beidseitigErreichbar(karte, [start]);
  let zahl = 0;
  for (let i = 0; i < karte.anzahl; i++) if (offen(karte, i) && !gut[i]) zahl++;
  return zahl;
}

/* Trägt dieses Loch seine eigene Regel? Zwei Bedingungen, und beide
   sind die Bedingung dafür, dass ein Stoß hinein überhaupt ein Sturz
   ist:

   · **Kein Sims.** Jede offene Nachbarkachel liegt entweder genau auf
     der Sohle — das ist der Boden, den das Loch freilegt — oder
     mindestens `STURZ_AB_STUFEN` darüber. Eine Kachel genau eine Ebene
     über der Sohle wäre ein Sims: Wer von dort hineingestoßen wird,
     fällt eine Ebene und nimmt keinen Schaden, und in einem bodenlosen
     Schacht stürbe er sogar an einem einzigen Schritt. Ohne diese
     Frage hatten gemessen über 30 Saaten 184 von 704 Löchern einen
     solchen Sims.
   · **Ein Rand, von dem aus es hineingeht.** Mindestens eine offene
     Nachbarkachel liegt `STURZ_AB_STUFEN` oder mehr über der Sohle.
     Sonst ist das Loch von keiner Kachel aus ein Sturz — es ist
     überhaupt kein Abgrund mehr, nur eine gesperrte Kachel. Das
     entsteht nicht beim Graben, sondern **danach**: Wird der letzte
     hohe Nachbar selbst zum Loch, verliert das erste seinen Rand.
     Ohne diese Frage traf das gemessen 15 von 704 Löchern. */
function lochTraegt(karte, x, y) {
  const sohle = karte.ebene[y * karte.breite + x];
  let rand = false;
  for (const r of richtungen(y)) {
    const nx = x + r.dx, ny = y + r.dy;
    if (karte.blocktBewegung(nx, ny)) continue;
    const hoch = karte.ebeneBei(nx, ny) - sohle;
    if (hoch === 0) continue;
    if (hoch < STURZ_AB_STUFEN) return false;
    rand = true;
  }
  return rand;
}

/* Tragen das neue Loch **und** jedes Loch daneben noch ihre Regel?
   Beide Fragen zusammen, weil ein neues Loch dem alten den Rand
   nehmen kann: Es war eine hohe offene Kachel und ist jetzt keine
   mehr. Weiter als bis zu den Nachbarn reicht diese Wirkung nicht —
   was ein Loch von seinem Rand hat, steht in seinen sechs Nachbarn. */
function traegtRingsum(karte, x, y) {
  if (!lochTraegt(karte, x, y)) return false;
  for (const r of richtungen(y)) {
    const nx = x + r.dx, ny = y + r.dy;
    if (!karte.istAbgrund(nx, ny)) continue;
    if (!lochTraegt(karte, nx, ny)) return false;
  }
  return true;
}

/* Wie viele Geländeflächen unter `MIN_EBENEN_FLAECHE` liegen. Die
   zweite Frage, die ein Loch verderben kann: Es nimmt eine Kachel aus
   ihrer Ebenenfläche heraus, und was übrig bleibt, kann eine einzelne
   Kachel sein — ein Sims von einem Feld, das die Karte nur unruhig
   macht. Gemessen über 60 Karten trat das viermal auf; ohne diese
   Frage bliebe `pruefe-landschaft.mjs` (h) genau viermal rot. */
function zuKleineFlaechen(karte) {
  let zahl = 0;
  for (const gross of ebenenFlaechen(karte).groessen) {
    if (gross < MIN_EBENEN_FLAECHE) zahl++;
  }
  return zahl;
}

export function grabeAbgruende(karte, saat, anteil = ABGRUND_ANTEIL,
  kliffAnteil = ABGRUND_KLIFF_ANTEIL) {
  const quelle = groesstesPlateauFeld(karte);
  if (quelle < 0) throw new Error("grabeAbgruende: die Karte hat keine offene Kachel");
  const start = { x: spalte(karte, quelle), y: zeile(karte, quelle) };
  const marke = (saat | 0) + 907;
  let hoch = 0, geloecht = 0, bodenlos = 0, zurueck = 0;

  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) {
      const i = y * karte.breite + x;
      /* Die Flutquelle bleibt heil: Wäre sie das Loch, stünde die
         ganze Erreichbarkeitsfrage auf einer gesperrten Kachel. */
      if (i === quelle || !offen(karte, i)) continue;
      const rand = karte.ebene[i];
      if (rand - EBENE_GRABEN < STURZ_AB_STUFEN) continue;
      hoch++;
      const gefunden = sohleUnter(karte, x, y);
      if (hash(i, rand, marke) >= (gefunden === null ? anteil : kliffAnteil)) continue;

      const sohle = gefunden === null ? rand - STURZ_AB_STUFEN : gefunden;
      karte.hindernis[i] = HINDERNIS.abgrund;
      karte.ebene[i] = sohle;
      if (!traegtRingsum(karte, x, y) || abgeschnitten(karte, start) > 0
        || zuKleineFlaechen(karte) > 0) {
        karte.hindernis[i] = HINDERNIS.keins;
        karte.ebene[i] = rand;
        zurueck++;
      } else {
        geloecht++;
        if (gefunden === null) bodenlos++;
      }
    }
  }

  const rest = abgeschnitten(karte, start) + zuKleineFlaechen(karte);
  if (rest > 0) {
    throw new Error(`grabeAbgruende: ${rest} Kachel(n) abgeschnitten oder zu klein,` +
      " obwohl jede einzeln geprüft wurde");
  }
  return { hoch, geloecht, bodenlos, zurueck };
}

function pruefeAngaben(saat, breite, hoehe, tiefe, spielerZahl) {
  const ganz = Number.isInteger;
  if (!ganz(saat)) throw new Error("baueLandschaft: saat muss eine ganze Zahl sein");
  if (!ganz(breite) || !ganz(hoehe)) {
    throw new Error("baueLandschaft: breite und hoehe müssen ganze Zahlen sein");
  }
  if (breite < MIN_KARTE || hoehe < MIN_KARTE) {
    throw new Error(`baueLandschaft: die Karte muss mindestens ${MIN_KARTE} Kacheln messen`);
  }
  if (!ganz(tiefe) || tiefe < 1) throw new Error("baueLandschaft: tiefe ist eine Zahl ab 1");
  if (!ganz(spielerZahl) || spielerZahl < 1 || spielerZahl > 4) {
    throw new Error("baueLandschaft: spielerZahl muss 1 bis 4 sein");
  }
}

export function baueLandschaft({
  saat, breite = 56, hoehe = 40, tiefe = 1, spielerZahl = 2, bauart = null
} = {}) {
  pruefeAngaben(saat, breite, hoehe, tiefe, spielerZahl);
  const welt = macheWeltfeld(saat, bauart);
  const karte = macheKarte(breite, hoehe);
  karte.saat = saat;
  karte.tiefe = tiefe;

  const wandNaehe = rastereWaende(karte, welt);
  setzeRand(karte);
  setzeEbenen(karte, welt);
  raeumeAuf(karte);
  verfuelleNebenraeume(karte);
  setzeRampen(karte, saat);
  grabeAbgruende(karte, saat);
  /* Ein kleiner Ausschnitt der echten Höhle kann fast ganz im Becken
     liegen. Die Gruppe reserviert deshalb ihren trockenen Einstieg,
     bevor Wasser oder Einrichtungsgegenstände diese Plätze belegen. */
  const startReserve = waehleStarts(karte, spielerZahl);
  setzeWasser(karte, welt);
  try {
    karte.starts = waehleStarts(karte, spielerZahl);
  } catch {
    /* Nur wenn kein trockener Einstieg mehr passt, bleibt sein ganzes
       Becken trocken. Ein bestehender See wird nicht in Flecken geteilt. */
    karte.starts = startReserve;
    for (const b of beckenGebiete(karte)) {
      if (!karte.starts.some((s) => b.boden.includes(karte.index(s.x, s.y)))) continue;
      for (const i of b.boden) karte.fluessig[i] = FLUESSIG.keine;
    }
  }
  setzeBoden(karte, welt, wandNaehe);
  setzeFackeln(karte);
  setzeZier(karte, welt, saat);

  const ausgang = waehleAusgang(karte, karte.starts);
  karte.ausgang = { x: ausgang.x, y: ausgang.y };
  karte.raeume = sammleRaeume(karte, welt);
  markiereRaum(karte.raeume, karte.starts[0], "eingang");
  markiereRaum(karte.raeume, karte.ausgang, "ausgang");
  return karte;
}

/* Weitergereicht: `werkzeuge/pruefe-landschaft.mjs` prüft die Schritte
   einzeln und soll dafür nicht zwei Dateien kennen müssen. */
export {
  setzeWasser,
  macheHallenProbe,
  setzeBoden,
  zierErlaubt,
  setzeFackeln,
  setzeZier,
  waehleStarts,
  waehleAusgang,
  sammleRaeume
};

export { offen, gebiete, beckenGebiete, spalte, zeile };

export {
  FACKEL_ABSTAND, SPIESS_HAEUFIGKEIT, START_NAEHE, ZIER_ARTEN, ZIER_FENSTER,
  plateaus, erreichbareFelder, beidseitigErreichbar, offeneGebiete,
  groesstesPlateauFeld, laufKostenFeld,
  kachelMitte };
