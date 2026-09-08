/* [Aufgabe: Prüfwesen] Die Körnung im Fels: Zwei benachbarte
   Wandfelder derselben Art tragen nie exakt denselben Farbwert.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Merkmal 3 der Abnahme von Vorgang #9 steht wörtlich so da, und es
   war die einzige Aussage über das Bild, die sich als Zahl nachrechnen
   ließ: Am 07.09.2026 trugen **2.608 von 2.608** benachbarten
   Wandpaaren gleicher Ebene exakt denselben Farbwert — 100,00 %. Eine
   Felswand war eine lackierte Fläche.

   Geprüft wird deshalb der Fall, der ohne diese Arbeit falsch wäre,
   und zwar in dieser Reihenfolge:

   · **An der wirklich gezeichneten Farbe**, nicht an der Formel. Eine
     Prüfung, die `koernungsTon` noch einmal nachrechnet, prüft ihre
     eigene Abschrift; sie bliebe grün, wenn `zeichneWand` die Stufe
     morgen gar nicht mehr reichte. Hier wird gezeichnet und aus der
     Mitschrift abgelesen.
   · **Kein einziges Paar**, nicht „fast keins". Die Dreifärbung des
     Sechseckgitters gibt zwei Nachbarn immer verschiedene Bänder —
     daraus wird eine Garantie und keine Wahrscheinlichkeit. Gemessen,
     indem die Dreifärbung einmal durch einen freien Wurf über sechs
     Stufen ersetzt wurde: 292 von 1.847 Wandpaaren im Bild farbgleich,
     also 15,8 % — und genau das sähe man als Flecken.
   · **Die Schranke nach oben.** Eine Körnung, die den Höhenabstand
     auffrisst, macht das Bild bunter und das Spiel unlesbar: Wer die
     Ebene einer Wand nicht mehr sieht, läuft in den Sturz. Also wird
     verlangt, dass sich die gezeichneten Töne zweier Ebenen nicht
     einmal berühren — an der Oberseite und an der engeren Flanke.

   ── Was hier bewusst nicht geprüft wird ────────────────────────────

   **Der Boden.** Er bekommt keine Körnung, und das ist eine
   Entscheidung und kein Versäumnis: Er trägt schon das Schachbrett aus
   Grund- und Zweitton, an dem man beim Laufen die eigene Bewegung
   sieht. Ob dort zusätzlich gekörnt wird, entscheidet der
   Auftraggeber; hier steht deshalb keine Behauptung darüber.

   **Ob es schön aussieht.** Diese Datei misst Farbabstände, nicht
   Geschmack. Dass eine Körnung von 7 Punkten auf 255 „nach Granit
   aussieht", kann nur der Auftraggeber in der Vorschau sagen.

   **Die Lichtlage.** Dass ein Unterschied von 2 Punkten ab Lichtstufe
   2/7 überlebt, ist die Begründung für die Größe der Bandsprünge und
   steht in `runtime/palette.js`. Nachgemessen wird sie dort, wo das
   Licht gerechnet wird, nicht hier — hier gälte sie doppelt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/palette.js` (`KOERNUNG_*`, `koernungsTon`, `helligkeit` —
   der Prüfling), `runtime/zeichnen.js` (`koernungsStufe`, `wandTon`,
   der Zeichner), `runtime/kamera.js`, `runtime/licht.js` (`KACHEL`),
   `spiel/gitter.mjs` (Karte, Nachbarn, Würfelkoordinaten),
   `spiel/rauschen.mjs` (`ganzHash`, für die Frage nach den Bits),
   `tests/helfer.mjs` und `werkzeuge/pruefe-alles.mjs`, das diese
   Datei als eigenen Prozess startet. Die Form der Wand — Oberseite,
   Flanke, Lage — misst `tests/pruefe-zeichnen.mjs`. */

import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";
import { BODEN, HINDERNIS, macheKarte, richtungen } from "../spiel/gitter.mjs";
import { ganzHash } from "../spiel/rauschen.mjs";
import {
  KOERNUNG_BAENDER, KOERNUNG_SPANNE, KOERNUNG_STUFEN, KOERNUNG_ZWISCHEN,
  EBENEN_TON, helligkeit, koernungsTon, koernungsVersatz, nachRGB
} from "../runtime/palette.js";
import { KACHEL } from "../runtime/licht.js";
import { macheKamera } from "../runtime/kamera.js";
import {
  KOERNUNG_BITS, RISS_ANTEIL, WAND_FLANKE, koernungsStufe, macheZeichner, wandTon
} from "../runtime/zeichnen.js";

/* Ein Blatt, das nichts zeichnet, sondern jedes Rechteck mit seiner
   Farbe mitschreibt — dieselbe Bauart wie in
   `tests/pruefe-zeichnen.mjs`, hier auf das Nötige gekürzt. */
function macheErsatzflaeche() {
  const aufrufe = [];
  let farbe = "#000000";
  return {
    aufrufe,
    canvas: { width: 320, height: 180 },
    set imageSmoothingEnabled(wert) { void wert; },
    get imageSmoothingEnabled() { return false; },
    set fillStyle(wert) { farbe = wert; },
    get fillStyle() { return farbe; },
    set globalCompositeOperation(wert) { void wert; },
    get globalCompositeOperation() { return "source-over"; },
    fillRect(x, y, b, h) { aufrufe.push([x, y, b, h, farbe]); }
  };
}

/* Eine Karte mit Fels auf **zwei** Ebenen. Nur so lässt sich beides
   zugleich fragen: „kein Nachbarpaar gleich" und „die Ebenen bleiben
   getrennt". Auf einer einebenen Karte wäre die zweite Frage leer. */
function macheFelsKarte(breite = 30, hoehe = 24, saat = 4711) {
  const karte = macheKarte(breite, hoehe);
  karte.saat = saat;
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const ebene = y < hoehe / 2 ? 1 : 2;
      karte.setze(x, y, { boden: BODEN.stein, ebene, hindernis: HINDERNIS.wand });
    }
  }
  /* Ein Streifen ohne Wand, damit die Karte nicht aus lauter Fels
     besteht — sonst prüfte man einen Fall, den es im Spiel nie gibt. */
  for (let x = 0; x < breite; x++) karte.setze(x, 3, { hindernis: HINDERNIS.keins });
  return karte;
}

/* Was wirklich gezeichnet wurde, Feld für Feld: die Oberseite (das
   breite Rechteck oben im Feld) und die Flanke (das flache darunter).
   Abgelesen aus der Mitschrift über die Bildschirmecke des Feldes —
   die Reihenfolge im Protokoll darf sich ändern, die Lage nicht. */
function gezeichneteWandtoene(karte) {
  const ctx = macheErsatzflaeche();
  const kamera = macheKamera({ fensterBreite: 320, fensterHoehe: 180, karte });
  const zeichner = macheZeichner({ ctx, kamera });
  zeichner.setzeFenster(320, 180);
  const gross = kamera.vergroesserung;
  const obenHoch = (KACHEL - WAND_FLANKE) * gross;
  const flankeHoch = WAND_FLANKE * gross;
  const toene = new Map();
  for (let mitteY = 0; mitteY <= karte.hoehe + 8; mitteY += 6) {
    for (let mitteX = 0; mitteX <= karte.breite + 8; mitteX += 6) {
      kamera.folge(mitteX, mitteY, true);
      ctx.aufrufe.length = 0;
      zeichner.zeichneWelt(karte, null, null, 0);
      const f = kamera.sichtbareFelder(0);
      const ecken = new Map();
      for (let y = f.vonY; y <= f.bisY; y++) {
        for (let x = f.vonX; x <= f.bisX; x++) {
          const i = karte.index(x, y);
          if (karte.hindernis[i] !== HINDERNIS.wand) continue;
          const ecke = kamera.feldNachBild(x, y);
          ecken.set(`${ecke.x}|${ecke.y}`, i);
        }
      }
      for (const [x, y, breite, hoehe, farbe] of ctx.aufrufe) {
        if (breite !== KACHEL * gross) continue;
        const obenTreffer = hoehe === obenHoch ? ecken.get(`${x}|${y}`) : undefined;
        if (obenTreffer !== undefined) {
          const eintrag = toene.get(obenTreffer) || {};
          eintrag.oben = farbe;
          toene.set(obenTreffer, eintrag);
          continue;
        }
        if (hoehe !== flankeHoch) continue;
        const i = ecken.get(`${x}|${y - obenHoch}`);
        if (i === undefined) continue;
        const eintrag = toene.get(i) || {};
        eintrag.flanke = farbe;
        toene.set(i, eintrag);
      }
    }
  }
  return toene;
}

/* Alle Nachbarpaare aus Wandfeldern **gleicher Ebene**, jedes einmal.
   Die Ebene muss dazu, sonst zählte man den Höhensprung als Körnung
   mit — und genau der ist immer verschieden. */
function wandPaare(karte) {
  const paare = [];
  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) {
      const i = karte.index(x, y);
      if (karte.hindernis[i] !== HINDERNIS.wand) continue;
      for (const r of richtungen(y)) {
        const nx = x + r.dx;
        const ny = y + r.dy;
        if (!karte.drin(nx, ny)) continue;
        const j = karte.index(nx, ny);
        if (j <= i) continue;
        if (karte.hindernis[j] !== HINDERNIS.wand) continue;
        if (karte.ebene[j] !== karte.ebene[i]) continue;
        paare.push([i, j, x, y, nx, ny]);
      }
    }
  }
  return paare;
}

/* ── 1 · Die Rechnung: sechs Stufen, symmetrisch, ohne Anschlag ─────*/
abschnitt("1 · Die Rechnung");
{
  gleich(KOERNUNG_BAENDER, 3, "es gibt drei Bänder — die Dreifärbung des Sechseckgitters");
  gleich(KOERNUNG_STUFEN, KOERNUNG_BAENDER * KOERNUNG_ZWISCHEN,
    "die Stufenzahl ist Bänder mal Zwischenstufen");
  behaupte(KOERNUNG_ZWISCHEN >= 2,
    `es gibt mindestens zwei Zwischenstufen je Band (${KOERNUNG_ZWISCHEN})`);

  const versaetze = [];
  for (let s = 0; s < KOERNUNG_STUFEN; s++) versaetze.push(koernungsVersatz(s));
  const spanne = Math.max(...versaetze) - Math.min(...versaetze);
  behaupte(Math.abs(spanne - KOERNUNG_SPANNE) < 1e-9,
    `die Versätze spannen ${spanne} — KOERNUNG_SPANNE sagt ${KOERNUNG_SPANNE}`);
  const mitte = versaetze.reduce((a, b) => a + b, 0) / KOERNUNG_STUFEN;
  behaupte(Math.abs(mitte) < 1e-9,
    `die Körnung ist symmetrisch um null (Mittelwert ${mitte})`);

  /* Der Sprung, auf den es ankommt: Zwei Nachbarn liegen immer in
     verschiedenen Bändern, also entscheidet der Abstand **zwischen**
     zwei Bändern darüber, ob man die Körnung sieht. */
  let kleinsterBandsprung = Infinity;
  for (let a = 0; a < KOERNUNG_STUFEN; a++) {
    for (let b = 0; b < KOERNUNG_STUFEN; b++) {
      if (Math.floor(a / KOERNUNG_ZWISCHEN) === Math.floor(b / KOERNUNG_ZWISCHEN)) continue;
      kleinsterBandsprung = Math.min(kleinsterBandsprung,
        Math.abs(versaetze[a] - versaetze[b]));
    }
  }
  behaupte(kleinsterBandsprung >= 2,
    `der engste Bandsprung ist ${kleinsterBandsprung} von 255 (verlangt sind 2, `
    + "damit er ab Lichtstufe 2/7 überlebt)");
  console.log(`      · Versätze: ${versaetze.join(" · ")} — Spanne ${spanne}, `
    + `engster Bandsprung ${kleinsterBandsprung}`);

  /* Jede Stufe muss auf jedem Wandton eine **andere** Farbe geben, und
     keine darf am Kanalanschlag kleben: Bei 0 oder 255 fielen zwei
     Stufen still zusammen, und die Garantie wäre weg. */
  for (let ebene = 0; ebene < EBENEN_TON.length; ebene++) {
    for (const flanke of [false, true]) {
      const name = `Ebene ${ebene} ${flanke ? "Flanke" : "Oberseite"}`;
      const toene = [];
      for (let s = 0; s < KOERNUNG_STUFEN; s++) toene.push(wandTon(ebene, flanke, s));
      gleich(new Set(toene).size, KOERNUNG_STUFEN, `${name}: sechs verschiedene Farbwerte`);
      const kanaele = toene.flatMap((t) => Object.values(nachRGB(t)));
      behaupte(Math.min(...kanaele) > 0 && Math.max(...kanaele) < 255,
        `${name}: kein Kanal läuft an den Anschlag `
        + `(${Math.min(...kanaele)} bis ${Math.max(...kanaele)})`);
      const hell = toene.map(helligkeit);
      const gemessen = Math.max(...hell) - Math.min(...hell);
      behaupte(Math.abs(gemessen - KOERNUNG_SPANNE) <= 0.5,
        `${name}: gemessene Spanne ${gemessen.toFixed(2)} von 255 statt ${KOERNUNG_SPANNE}`);
    }
  }

  /* Und der Gegenbeweis, dass diese Behauptungen überhaupt etwas
     sehen könnten: Ohne Stufe kommt der Grundton, mit Stufe nicht
     immer derselbe. */
  const grund = wandTon(1, false);
  const mitStufen = [];
  for (let s = 0; s < KOERNUNG_STUFEN; s++) mitStufen.push(wandTon(1, false, s));
  behaupte(mitStufen.some((t) => t !== grund),
    "eine Körnungsstufe verändert den Grundton wirklich");
  gleich(koernungsTon(grund, 0), mitStufen[0],
    "wandTon reicht die Stufe an koernungsTon weiter, statt selbst zu rechnen");
}

/* ── 2 · Die Stufe: die Dreifärbung garantiert den Unterschied ──────
   Nicht an einer Karte, sondern an einem großen Ausschnitt: Die
   Behauptung ist eine über das Raster, nicht über eine Landschaft. */
abschnitt("2 · Die Stufe");
{
  const KANTE = 200;
  const karte = { saat: 4711 };
  const zaehler = new Array(KOERNUNG_STUFEN).fill(0);
  const baender = new Array(KOERNUNG_BAENDER).fill(0);
  let nachbarschaften = 0;
  let stufengleich = 0;
  let bandgleich = 0;
  for (let y = 0; y < KANTE; y++) {
    for (let x = 0; x < KANTE; x++) {
      const s = koernungsStufe(karte, x, y);
      zaehler[s]++;
      baender[Math.floor(s / KOERNUNG_ZWISCHEN)]++;
      for (const r of richtungen(y)) {
        const nx = x + r.dx;
        const ny = y + r.dy;
        if (nx < 0 || ny < 0 || nx >= KANTE || ny >= KANTE) continue;
        nachbarschaften++;
        const n = koernungsStufe(karte, nx, ny);
        if (n === s) stufengleich++;
        if (Math.floor(n / KOERNUNG_ZWISCHEN) === Math.floor(s / KOERNUNG_ZWISCHEN)) bandgleich++;
      }
    }
  }
  behaupte(nachbarschaften > 200000,
    `die Probe ist groß genug (${nachbarschaften} Nachbarschaften auf ${KANTE}×${KANTE})`);
  gleich(bandgleich, 0, "kein Nachbarpaar teilt ein Band — das ist die Garantie");
  gleich(stufengleich, 0, "und damit auch keines dieselbe Körnungsstufe");
  behaupte(zaehler.every((z) => z > 0), `jede der ${KOERNUNG_STUFEN} Stufen kommt vor`);
  console.log(`      · Stufen: ${zaehler.join(" / ")} — Bänder ${baender.join(" / ")}, `
    + `${stufengleich} von ${nachbarschaften} Nachbarschaften gleich`);

  /* Das Zittern muss wirklich zittern — sonst wäre die Stufe die
     Dreifärbung allein und das Muster im Bild ablesbar. */
  const zitterEins = zaehler.filter((_, i) => i % KOERNUNG_ZWISCHEN === 1)
    .reduce((a, b) => a + b, 0);
  const zitterAnteil = (zitterEins / (KANTE * KANTE)) * 100;
  behaupte(Math.abs(zitterAnteil - 50) <= 2,
    `das Zittern ist ausgeglichen: ${zitterAnteil.toFixed(2)} von 100 (erlaubt 50 ± 2)`);

  /* Und es hängt nicht an denselben Hashbits wie die Risse. Gemessen
     wird die Wirkung, nicht die Absicht: Wäre die Körnung an den
     Rissen aufgehängt, säße das Zittern auf Rissfeldern anders als
     auf rissfreien. */
  let mitRiss = 0, mitRissEins = 0, ohneRiss = 0, ohneRissEins = 0;
  for (let y = 0; y < KANTE; y++) {
    for (let x = 0; x < KANTE; x++) {
      const wurf = ganzHash(karte.saat >>> 0, x, y);
      const zittert = koernungsStufe(karte, x, y) % KOERNUNG_ZWISCHEN === 1;
      if (wurf % 100 < RISS_ANTEIL) { mitRiss++; if (zittert) mitRissEins++; }
      else { ohneRiss++; if (zittert) ohneRissEins++; }
    }
  }
  const verzug = Math.abs((mitRissEins / mitRiss - ohneRissEins / ohneRiss) * 100);
  behaupte(verzug <= 2,
    `Risse und Körnung hängen nicht zusammen: ${verzug.toFixed(1)} Prozentpunkte `
    + "Unterschied (erlaubt 2)");
  behaupte(KOERNUNG_BITS >= 24,
    `das Zittern nimmt die oberen Bits (Verschiebung ${KOERNUNG_BITS}), `
    + "die zeichneRisse nicht anfasst");
  console.log(`      · Zittern: ${zitterAnteil.toFixed(2)} von 100, `
    + `Verzug gegen die Risse ${verzug.toFixed(1)} Prozentpunkte`);
}

/* ── 3 · Im Bild: kein Nachbarpaar trägt denselben Farbwert ─────────
   Merkmal 3 der Abnahme, wörtlich, an der gezeichneten Farbe. */
abschnitt("3 · Im Bild");
{
  const karte = macheFelsKarte();
  const toene = gezeichneteWandtoene(karte);
  const paare = wandPaare(karte);

  let vollstaendig = 0;
  for (const eintrag of toene.values()) if (eintrag.oben && eintrag.flanke) vollstaendig++;
  gleich(vollstaendig, toene.size, "jedes gezeichnete Wandfeld hat Oberseite und Flanke");
  behaupte(toene.size > 400, `es wurden ${toene.size} Wandfelder wirklich gezeichnet`);

  let gemessen = 0;
  let gleicheOben = 0;
  let gleicheFlanke = 0;
  let ersterFund = null;
  for (const [i, j, x, y, nx, ny] of paare) {
    const a = toene.get(i);
    const b = toene.get(j);
    if (!a || !b) continue;
    gemessen++;
    if (a.oben === b.oben) {
      gleicheOben++;
      if (!ersterFund) ersterFund = `${x},${y} und ${nx},${ny} beide ${a.oben}`;
    }
    if (a.flanke === b.flanke) gleicheFlanke++;
  }
  behaupte(gemessen > 800,
    `${gemessen} benachbarte Wandpaare gleicher Ebene sind gemessen — genug, um etwas zu finden`);
  gleich(gleicheOben, 0,
    "kein Nachbarpaar trägt dieselbe Oberseite"
    + (ersterFund ? ` — zuerst ${ersterFund}` : ""));
  gleich(gleicheFlanke, 0, "und keines dieselbe Flanke");
  const anteil = gemessen === 0 ? 0 : (gleicheOben / gemessen) * 100;
  console.log(`      · Im Bild: ${gleicheOben} von ${gemessen} Nachbarpaaren farbgleich `
    + `= ${anteil.toFixed(2)} von 100 · ${new Set([...toene.values()]
      .map((e) => e.oben)).size} Oberseitentöne`);

  /* Zweimal dieselbe Karte gibt dieselben Töne, eine andere Saat
     andere: Die Körnung hängt an der Karte, nicht am Bild. */
  const nochmal = gezeichneteWandtoene(macheFelsKarte());
  const andere = gezeichneteWandtoene(macheFelsKarte(30, 24, 90210));
  let abweichung = 0;
  let unterschied = 0;
  for (const [i, eintrag] of toene) {
    if (nochmal.get(i)?.oben !== eintrag.oben) abweichung++;
    if (andere.get(i)?.oben !== eintrag.oben) unterschied++;
  }
  gleich(abweichung, 0, "dieselbe Saat gibt dieselbe Körnung");
  behaupte(unterschied > 0,
    `eine andere Saat gibt eine andere Körnung (${unterschied} Felder weichen ab)`);
}

/* ── 4 · Die Schranke nach oben: die Höhe bleibt lesbar ─────────────
   Der Fall, den man beim Körnen vergisst. Eine Körnung, die den
   Ebenenabstand auffrisst, ist keine Verzierung mehr, sondern ein
   Fehler im Höhensystem: Wer die Ebene einer Wand nicht mehr sieht,
   läuft in den Sturz. */
abschnitt("4 · Die Schranke nach oben");
{
  /* Der Ebenenabstand wird **gemessen**, nicht abgeschrieben: Er
     folgt aus EBENEN_TON und den beiden Steintönen, und wer daran
     dreht, soll hier anschlagen und nicht dort. */
  const bereiche = [];
  for (let ebene = 0; ebene < EBENEN_TON.length; ebene++) {
    for (const flanke of [false, true]) {
      const hell = [];
      for (let s = 0; s < KOERNUNG_STUFEN; s++) hell.push(helligkeit(wandTon(ebene, flanke, s)));
      bereiche.push({ ebene, flanke, tief: Math.min(...hell), hoch: Math.max(...hell) });
    }
  }
  for (const flanke of [false, true]) {
    const reihe = bereiche.filter((b) => b.flanke === flanke).sort((a, b) => a.ebene - b.ebene);
    const name = flanke ? "Flanke" : "Oberseite";
    let engster = Infinity;
    for (let n = 1; n < reihe.length; n++) {
      const luecke = reihe[n].tief - reihe[n - 1].hoch;
      engster = Math.min(engster, luecke);
      behaupte(luecke > 0,
        `${name}: Ebene ${n - 1} und ${n} überschneiden sich nicht `
        + `(${luecke.toFixed(2)} von 255 bleiben frei)`);
    }
    const grundAbstand = helligkeit(wandTon(1, flanke)) - helligkeit(wandTon(0, flanke));
    behaupte(KOERNUNG_SPANNE < grundAbstand,
      `${name}: die Körnung (${KOERNUNG_SPANNE}) bleibt unter dem Ebenenabstand `
      + `(${grundAbstand.toFixed(2)} von 255)`);
    console.log(`      · ${name}: Ebenenabstand ${grundAbstand.toFixed(2)}, `
      + `Körnung ${KOERNUNG_SPANNE}, engste Lücke ${engster.toFixed(2)} von 255`);
  }

  /* Und die Wand bleibt in sich, wie sie war: Oberseite und Flanke
     bekommen **dieselbe** Stufe, also darf die Körnung den Abstand
     zwischen beiden um keinen Punkt verändern. Das ist die Frage, die
     dieser Arbeit gehört — wie groß der Abstand sein muss (Fehlerbuch
     D3: 24), misst `tests/pruefe-zeichnen.mjs` an der gezeichneten
     Wand. Würde jemand die Flanke getrennt würfeln lassen, stünde es
     hier: Der Abstand schwankte dann um bis zu eine ganze Spanne. */
  for (let ebene = 0; ebene < EBENEN_TON.length; ebene++) {
    const ohne = helligkeit(wandTon(ebene, false)) - helligkeit(wandTon(ebene, true));
    let groessteAbweichung = 0;
    for (let s = 0; s < KOERNUNG_STUFEN; s++) {
      const mit = helligkeit(wandTon(ebene, false, s)) - helligkeit(wandTon(ebene, true, s));
      groessteAbweichung = Math.max(groessteAbweichung, Math.abs(mit - ohne));
    }
    behaupte(groessteAbweichung <= 0.5,
      `Ebene ${ebene}: die Körnung verschiebt den Abstand Oberseite–Flanke `
      + `um höchstens ${groessteAbweichung.toFixed(2)} von 255 (${ohne.toFixed(2)} ohne sie)`);
  }
}

ende("Körnung im Fels");
