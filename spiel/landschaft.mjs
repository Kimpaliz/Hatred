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
import { laufKosten } from "./hoehen.mjs";
import { macheWeltfeld } from "./welt-feld.mjs";
import { PIXEL_JE_FELD } from "./bauart.mjs";
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
  spalte, zeile, gegen, offen, alleDabei, gleicheEbene, gebiete, plateaus
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
export const ZEILEN_ABSTAND = Math.sqrt(3) / 2;

export function rastereWaende(karte, welt) {
  const wandNaehe = new Float32Array(karte.anzahl);
  const schritt = P / UEBERABTASTUNG;
  for (let y = 0; y < karte.hoehe; y++) {
    /* ── Der halbe Versatz der ungeraden Zeilen ──────────────────────

       Seit dem 07.09.2026 ist das Raster ein Sechseckraster in
       Versatzzeilen: Jede ungerade Zeile liegt ein halbes Feld weiter
       rechts. Die Weltformel muss **dort** abgetastet werden, wo das
       Feld wirklich liegt — sonst beschreibt das Bild eine andere
       Höhle als die, durch die man läuft.

       Was passiert, wenn man es vergisst: Die Wände stehen um ein
       halbes Feld versetzt zur Nachbarschaft. Gänge, die im Bild offen
       aussehen, sind es nicht, und die Karte zerfällt in Taschen.
       Gemessen: `waehleStarts` fand auf einer engen Karte nur noch ein
       einziges Startfeld statt zweier. */
    const versatz = (y & 1) === 1 ? P / 2 : 0;
    /* Und die Zeilen stehen enger, als sie breit sind: Beim Sechseck
       ist der Zeilenabstand √3/2 der Feldbreite. Die Zahl ist nicht
       gewählt, sondern Geometrie — zwei Zeilen greifen ineinander.

       ── Eine Messung, die eine Fehlentscheidung verhindert hat ─────

       Der erste Blick darauf war eine **einzelne** Karte (Saat 5,
       44 x 32): 6,5 % offene Kacheln gegen 22,4 % ohne den engeren
       Abstand. Das sah nach einem klaren Rückschritt aus, und beinahe
       wäre hier `y * P` stehengeblieben mit einer Notiz, die das
       begründet.

       Über **60 Saaten** gemessen sieht es anders aus: 35,8 % mit dem
       Sechseck-Abstand gegen 36,5 % ohne, und in beiden Fällen bauen
       alle 60 Karten fehlerfrei. Saat 5 war eine dünne Karte, kein
       Beleg. Eine Zahl aus einem Lauf ist keine Messung. */
    const zeileOben = y * P * ZEILEN_ABSTAND;
    for (let x = 0; x < karte.breite; x++) {
      let fels = 0, mitte = 0;
      for (let b = 0; b < UEBERABTASTUNG; b++) {
        for (let a = 0; a < UEBERABTASTUNG; a++) {
          const wert = welt.feldBei(
            x * P + versatz + (a + 0.5) * schritt, zeileOben + (b + 0.5) * schritt);
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
      karte.ebene[y * karte.breite + x] = welt.ebeneBei(kachelMitte(x), kachelMitte(y));
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



/* Flächen gleicher Ebene über **alle** Kacheln, auch über Fels: Die
   Ebene einer Wand ist im Bild sichtbar (sie trägt die Schattenkante),
   also gilt die Mindestgröße auch dort. */
export function ebenenFlaechen(karte) {
  return gebiete(karte, alleDabei, gleicheEbene(karte));
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
  setzeWasser(karte, welt);
  setzeBoden(karte, welt, wandNaehe);
  setzeFackeln(karte);
  setzeZier(karte, welt, saat);

  karte.starts = waehleStarts(karte, spielerZahl);
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

export { offen, gebiete, spalte, zeile };

export {
  FACKEL_ABSTAND, SPIESS_HAEUFIGKEIT, START_NAEHE, ZIER_ARTEN, ZIER_FENSTER,
  plateaus, erreichbareFelder, beidseitigErreichbar, offeneGebiete,
  groesstesPlateauFeld, laufKostenFeld,
  kachelMitte };
