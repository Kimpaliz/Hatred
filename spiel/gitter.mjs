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
   Eine Rampe liegt auf dem tieferen der beiden Felder.

   Sechs Richtungen seit dem 07.09.2026 (Vorgang #6/#7). Die Namen sind
   die eines spitz nach oben stehenden Sechsecks: zwei waagerechte
   Nachbarn, je zwei schräg oben und schräg unten. Ein „nord" gibt es
   nicht mehr — senkrecht nach oben liegt beim Sechseck kein Feld,
   sondern eine Kante. */
export const RAMPE = {
  keine: 0, ost: 1, suedost: 2, suedwest: 3, west: 4, nordwest: 5, nordost: 6
};

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

/* Die sechs Nachbarn, ohne die außerhalb. Welche sechs, hängt von der
   Zeile ab — Begründung unten beim Sechseckraster. */
export function nachbarn(karte, x, y) {
  const raus = [];
  for (const r of richtungen(y)) {
    const nx = x + r.dx, ny = y + r.dy;
    if (karte.drin(nx, ny)) raus.push({ x: nx, y: ny, richtung: r });
  }
  return raus;
}

/* ══════════════════════════════════════════════════════════════════
   Das Sechseckraster
   ══════════════════════════════════════════════════════════════════

   Entschieden am 07.09.2026 (Vorgang #6): *„ja hexagon. raster form."*
   Seit derselben Sitzung ist es **in Betrieb** — `nachbarn()` und
   `abstand()` oben rechnen damit. `schussweite` gibt es nicht mehr.

   ── Warum die Speicherform bleibt ──────────────────────────────────

   Ein Sechseckraster wird hier als **Versatzzeilen** geführt: Jede
   ungerade Zeile liegt ein halbes Feld weiter rechts — wie die Ziegel
   in einer Mauer. Ein Ziegel berührt genau sechs andere: zwei oben,
   zwei unten, einen links, einen rechts. Das ist buchstäblich dieselbe
   Nachbarschaft wie beim Sechseck.

   Der Gewinn: `index: (x, y) => y * breite + x` gilt unverändert
   weiter. `macheKarte`, die fünf Reihen, `summe()` und damit das ganze
   Netzprotokoll bleiben, wie sie sind. Was sich ändert, ist allein
   **wer neben wem liegt** und **wie weit es ist**.

   ── Warum zwei Tabellen und nicht eine ─────────────────────────────

   Auf einer geraden Zeile liegen die oberen Nachbarn links und
   mittig; auf einer ungeraden mittig und rechts. Das ist keine
   Feinheit, sondern der ganze Trick: Wer hier eine Tabelle für beide
   nimmt, bekommt eine Nachbarschaft, die **nicht gegenseitig** ist —
   A sieht B, aber B sieht A nicht. Im Kampf heißt das: Man wird von
   jemandem geschlagen, den man selbst nicht erreichen kann, und
   niemand versteht warum. Die Prüfung dazu heißt „Nachbarschaft ist
   gegenseitig" und war absichtlich rot.

   ── Warum nur **ein** Entfernungsmaß ───────────────────────────────

   Bis zum 07.09.2026 gab es zwei: `abstand` (Manhattan) fürs Laufen und
   `schussweite` (Schachbrett) fürs Schießen. Zwei, weil die Diagonale
   eines Quadrats beides nicht zugleich sein kann — ein Bogen soll
   diagonal so weit schießen wie gerade, ein Schritt aber nicht diagonal
   billiger sein.

   Sechs gleichwertige Nachbarn haben dieses Problem nicht: Der Schritt
   in jede Richtung ist gleich weit. `abstand` ist deshalb jetzt beides,
   und `schussweite` ist **ersatzlos entfallen** — nicht umbenannt,
   entfallen. Ein zweiter Name für dieselbe Rechnung wäre die nächste
   Stelle, an der zwei Wahrheiten auseinanderlaufen.

   ── Arbeitet zusammen mit ──────────────────────────────────────────

   `werkzeuge/pruefe-sechseck.mjs` (misst alles hier), und später
   `spiel/wegfindung.mjs`, `spiel/sicht.mjs`, `spiel/hoehen.mjs`. */

/* Sechs Richtungen, getrennt nach gerader und ungerader Zeile. Die
   Namen sind die eines spitz nach oben stehenden Sechsecks: zwei
   waagerechte Nachbarn, je zwei schräg oben und schräg unten. */
export const RICHTUNGEN_GERADE = [
  { dx: 1, dy: 0, name: "ost", rampe: RAMPE.ost },
  { dx: 0, dy: 1, name: "suedost", rampe: RAMPE.suedost },
  { dx: -1, dy: 1, name: "suedwest", rampe: RAMPE.suedwest },
  { dx: -1, dy: 0, name: "west", rampe: RAMPE.west },
  { dx: -1, dy: -1, name: "nordwest", rampe: RAMPE.nordwest },
  { dx: 0, dy: -1, name: "nordost", rampe: RAMPE.nordost }
];

export const RICHTUNGEN_UNGERADE = [
  { dx: 1, dy: 0, name: "ost", rampe: RAMPE.ost },
  { dx: 1, dy: 1, name: "suedost", rampe: RAMPE.suedost },
  { dx: 0, dy: 1, name: "suedwest", rampe: RAMPE.suedwest },
  { dx: -1, dy: 0, name: "west", rampe: RAMPE.west },
  { dx: 0, dy: -1, name: "nordwest", rampe: RAMPE.nordwest },
  { dx: 1, dy: -1, name: "nordost", rampe: RAMPE.nordost }
];

/* Welche Tabelle für diese Zeile gilt. Ungerade Zeilen liegen versetzt. */
export const richtungen = (y) =>
  ((y & 1) === 0 ? RICHTUNGEN_GERADE : RICHTUNGEN_UNGERADE);

/* Versatzzeilen in Würfelkoordinaten. Nur dort ist die Entfernung eine
   einfache Rechnung; in Versatzzeilen selbst wäre sie ein Wust von
   Fallunterscheidungen — und jede davon eine Stelle, an der jemand sich
   vertut. Die drei Zahlen summieren sich immer zu null; daran erkennt
   man einen Rechenfehler sofort.

   Ausgeführt, weil `spiel/sicht.mjs` die Sichtlinie darüber legt:
   Sehen und Gehen müssen demselben Raster folgen, sonst sieht man
   Felder, die man nicht erreicht. */
export function alsWuerfel(x, y) {
  const wx = x - ((y - (y & 1)) >> 1);
  const wz = y;
  return { wx, wy: -wx - wz, wz };
}

/* Zurück aus den Würfelkoordinaten in Versatzzeilen. */
export const vonWuerfel = (wx, wz) => ({ x: wx + ((wz - (wz & 1)) >> 1), y: wz });

/* Die Entfernung in Schritten — zugleich Laufweg und Schussweite. */
export function abstand(ax, ay, bx, by) {
  const a = alsWuerfel(ax, ay), b = alsWuerfel(bx, by);
  return (Math.abs(a.wx - b.wx) + Math.abs(a.wy - b.wy) + Math.abs(a.wz - b.wz)) / 2;
}
