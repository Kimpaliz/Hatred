/* [Aufgabe: Regelkern] Das Raster — ein Feld ist eine Zahl, keine Klasse.

   ── Warum flache Zahlenreihen und keine Objekte je Feld ─────────────

   Eine Karte ist 64 × 48 Felder, also 3.072 Stück. Als Objekte wären
   das 3.072 Zeigerverfolgungen je Sichtberechnung — und die läuft je
   Figur und je Zug. Als `Uint8Array` ist ein Feldzugriff eine
   Adressrechnung. Wichtiger noch: Eine flache Reihe lässt sich
   **byteweise vergleichen**. Genau das braucht die Desync-Erkennung im
   Netz (`netz/sitzung.mjs`): Zwei Rechner haben dieselbe Karte, wenn
   dieselben Bytes drinstehen — nicht „ungefähr dieselbe".

   ── Die Höhen ──────────────────────────────────────────────────────

   Jedes Feld hat eine **Ebene** von 0 bis 3. Das ist der Grund, warum
   dieses Spiel kein flaches Schachbrett ist: Ebene 0 ist der Graben
   (Wasser, Lava), 1 der Boden, 2 ein Podest, 3 das Hochplateau. Was
   das für Bewegung, Sicht und Kampf bedeutet, steht in
   `spiel/hoehen.mjs` — hier steht nur, **wo** es steht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/hoehen.mjs` (die Regeln), `spiel/landschaft.mjs` (füllt sie),
   `spiel/sicht.mjs`, `spiel/wegfindung.mjs`, `runtime/zeichnen.js`.
   Kennt selbst weder Figuren noch Züge. */

/* ── Die Schlüssel ──────────────────────────────────────────────────
   Alle Feldwerte sind kleine ganze Zahlen. Die Namen stehen hier, die
   Farben in `runtime/palette.js`, die Bedeutung fürs Spiel in den
   Regelmodulen. Wer einen Wert anhängt, hängt ihn **unten** an —
   gespeicherte Läufe tragen die Zahlen, nicht die Namen. */

export const BODEN = {
  stein: 0,        /* der Standardboden des Kerkers                */
  platte: 1,       /* geschliffene Platten, Hallen und Podeste     */
  erde: 2,         /* aufgebrochener Grund                         */
  kachel: 3,       /* gemusterter Boden, Weihestätten              */
  gitterrost: 4,   /* über dem Graben; man sieht hindurch          */
  knochen: 5,      /* Knochenteppich, Gruften                      */
  asche: 6,        /* verbrannt, rings um Lava                     */
  holz: 7          /* Stege und Brücken                            */
};

export const FLUESSIG = {
  keine: 0,
  wasser: 1,       /* verlangsamt                                  */
  blut: 2,         /* nur Zierde — aber viel davon                 */
  schleim: 3,      /* verlangsamt und leuchtet grün                */
  lava: 4,         /* Schaden je Zug                               */
  oel: 5           /* entzündet sich an Lava und Fackeln           */
};

export const HINDERNIS = {
  keins: 0,
  wand: 1,         /* voll: blockt Bewegung und Sicht              */
  saeule: 2,       /* voll                                         */
  fass: 3,         /* zerstörbar, blockt Bewegung, halbe Deckung   */
  kiste: 4,        /* zerstörbar                                   */
  spiess: 5,       /* Wandzier, blockt nichts — nur Bild           */
  altar: 6,        /* blockt Bewegung, halbe Deckung               */
  gitter: 7,       /* blockt Bewegung, **nicht** Sicht             */
  fackelsockel: 8, /* blockt Bewegung, trägt ein Licht             */
  sarg: 9,         /* zerstörbar, halbe Deckung                    */
  truhe: 10        /* blockt Bewegung, gibt Beute                  */
};

/* Was eine Wand voll blockt, was nur halbe Deckung gibt, was gar
   nichts tut. Eine Liste je Frage — sonst steht dieselbe Aufzählung
   an vier Stellen und läuft auseinander. */
export const BLOCKT_BEWEGUNG = new Set([
  HINDERNIS.wand, HINDERNIS.saeule, HINDERNIS.fass, HINDERNIS.kiste,
  HINDERNIS.altar, HINDERNIS.gitter, HINDERNIS.fackelsockel,
  HINDERNIS.sarg, HINDERNIS.truhe
]);

export const BLOCKT_SICHT = new Set([
  HINDERNIS.wand, HINDERNIS.saeule
]);

export const GIBT_DECKUNG = new Set([
  HINDERNIS.fass, HINDERNIS.kiste, HINDERNIS.altar, HINDERNIS.gitter,
  HINDERNIS.sarg, HINDERNIS.truhe, HINDERNIS.fackelsockel
]);

export const ZERSTOERBAR = new Set([
  HINDERNIS.fass, HINDERNIS.kiste, HINDERNIS.sarg
]);

/* Die vier Ebenen. Mehr wären nicht lesbar: Auf einem exakt von oben
   gesehenen Bild trägt nur die Kantenschattierung die Höhe, und vier
   Stufen sind das Meiste, was das Auge daran noch auseinanderhält. */
export const EBENEN = 4;
export const EBENE_GRABEN = 0;
export const EBENE_BODEN = 1;

/* Rampen: 0 = keine, sonst die Richtung, in die es **hinauf** geht.
   Eine Rampe liegt auf dem tieferen der beiden Felder. */
export const RAMPE = { keine: 0, nord: 1, ost: 2, sued: 3, west: 4 };

/* Die vier Richtungen. Es sind bewusst vier und nicht acht: Bei acht
   ist die Diagonale entweder zu billig (1 Punkt für √2 Weg) oder
   krumm (1,41 Punkte) — und Aktionspunkte sollen ganze Zahlen
   bleiben, damit man sie im Kopf zählen kann. */
export const RICHTUNGEN = [
  { dx: 0, dy: -1, name: "nord", rampe: RAMPE.nord },
  { dx: 1, dy: 0, name: "ost", rampe: RAMPE.ost },
  { dx: 0, dy: 1, name: "sued", rampe: RAMPE.sued },
  { dx: -1, dy: 0, name: "west", rampe: RAMPE.west }
];

export function macheKarte(breite, hoehe) {
  if (!Number.isInteger(breite) || !Number.isInteger(hoehe) || breite < 4 || hoehe < 4) {
    throw new Error(`macheKarte: Maße müssen ganze Zahlen ab 4 sein (${breite}×${hoehe})`);
  }
  const anzahl = breite * hoehe;

  const karte = {
    breite, hoehe, anzahl,
    boden: new Uint8Array(anzahl),
    ebene: new Uint8Array(anzahl).fill(EBENE_BODEN),
    hindernis: new Uint8Array(anzahl),
    fluessig: new Uint8Array(anzahl),
    rampe: new Uint8Array(anzahl),
    /* Von der Landschaft gefüllt, von Bild und Regeln gelesen. */
    lichter: [],     /* [{x, y, art, staerke}]                       */
    raeume: [],      /* [{x, y, breite, hoehe, art, ebene}]          */
    starts: [],      /* [{x, y}] — Startfelder der Jäger             */
    ausgang: null,   /* {x, y} — die Treppe hinab                    */
    saat: 0,
    tiefe: 1,

    index: (x, y) => y * breite + x,
    drin: (x, y) => x >= 0 && y >= 0 && x < breite && y < hoehe,

    ebeneBei(x, y) { return this.drin(x, y) ? this.ebene[y * breite + x] : -1; },
    bodenBei(x, y) { return this.drin(x, y) ? this.boden[y * breite + x] : -1; },
    hindernisBei(x, y) { return this.drin(x, y) ? this.hindernis[y * breite + x] : HINDERNIS.wand; },
    fluessigBei(x, y) { return this.drin(x, y) ? this.fluessig[y * breite + x] : FLUESSIG.keine; },
    rampeBei(x, y) { return this.drin(x, y) ? this.rampe[y * breite + x] : RAMPE.keine; },

    /* Außerhalb gilt als Wand. Das erspart jedem Aufrufer die
       Randprüfung — und Randfehler sind in Rasterspielen die
       häufigste Fehlerklasse überhaupt. */
    blocktBewegung(x, y) {
      if (!this.drin(x, y)) return true;
      return BLOCKT_BEWEGUNG.has(this.hindernis[y * breite + x]);
    },
    blocktSicht(x, y) {
      if (!this.drin(x, y)) return true;
      return BLOCKT_SICHT.has(this.hindernis[y * breite + x]);
    },
    gibtDeckung(x, y) {
      if (!this.drin(x, y)) return true;
      return GIBT_DECKUNG.has(this.hindernis[y * breite + x]);
    },

    setze(x, y, werte) {
      if (!this.drin(x, y)) return;
      const i = y * breite + x;
      if (werte.boden !== undefined) this.boden[i] = werte.boden;
      if (werte.ebene !== undefined) this.ebene[i] = werte.ebene;
      if (werte.hindernis !== undefined) this.hindernis[i] = werte.hindernis;
      if (werte.fluessig !== undefined) this.fluessig[i] = werte.fluessig;
      if (werte.rampe !== undefined) this.rampe[i] = werte.rampe;
    },

    /* Eine Prüfsumme über **alle** Felder. Zwei Rechner mit derselben
       Zahl haben dieselbe Karte; unterscheidet sie sich, ist der Lauf
       auseinandergelaufen und die Sitzung bricht ab, statt zwei
       verschiedene Spiele weiterzuspielen (`netz/sitzung.mjs`).
       FNV-1a über die fünf Reihen, in fester Reihenfolge. */
    summe() {
      let h = 0x811c9dc5;
      for (const reihe of [this.boden, this.ebene, this.hindernis, this.fluessig, this.rampe]) {
        for (let i = 0; i < reihe.length; i++) {
          h = Math.imul(h ^ reihe[i], 0x01000193) >>> 0;
        }
      }
      return h >>> 0;
    }
  };
  return karte;
}

/* Jedes Feld einmal, in fester Reihenfolge — damit zwei Läufe über
   dieselbe Karte dieselbe Reihenfolge sehen. */
export function* alleFelder(karte) {
  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) yield { x, y, i: y * karte.breite + x };
  }
}

/* Die vier Nachbarn, ohne die außerhalb. */
export function nachbarn(karte, x, y) {
  const raus = [];
  for (const r of RICHTUNGEN) {
    const nx = x + r.dx, ny = y + r.dy;
    if (karte.drin(nx, ny)) raus.push({ x: nx, y: ny, richtung: r });
  }
  return raus;
}

/* Manhattan — die einzig richtige Entfernung, wenn man nur in vier
   Richtungen läuft. */
export const abstand = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);

/* Für Reichweiten von Fernwaffen: die Schachbrett-Entfernung. Ein Bogen
   soll diagonal genauso weit schießen wie gerade — sonst hat die
   Reichweite die Form eines Rhombus, und das sieht falsch aus. */
export const schussweite = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
