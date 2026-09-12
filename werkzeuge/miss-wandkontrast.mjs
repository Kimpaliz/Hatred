/* [Aufgabe: Werkzeug] Misst, wie stark sich eine Wand im Bild vom Boden abhebt.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Jannik am 08.09.2026: *„gut erkennbare Wände, dass ist unendlich
   wichtig das auf den ersten Blick gut zu erkennen ist wo Wände
   sind"*. Das ist eine Aussage über ein Bild, und ein Bild lässt sich
   nicht diskutieren — es lässt sich messen. Ohne diese Zahl wäre jede
   Antwort auf seinen Wunsch eine Meinung.

   Gemessen werden drei Fälle nebeneinander, weil erst der Vergleich
   etwas aussagt:

   · **flach, dünn** — eine Ebene, Wände **ein Feld** dick. Das ist die
     Karte, die Jannik als Nächstes möchte, und der harte Fall: Eine
     dünne Wand hat kein Inneres, in dem sie dunkel werden könnte.
   · **flach, dick** — dieselbe Ebene mit einem breiten Felsrand. Der
     leichte Fall; er zeigt, was das Felsinnere beiträgt.
   · **heute** — eine erzeugte Karte, wie sie im Spiel steht, einmal
     über alle Grenzen und einmal nur über Paare auf **derselben**
     Ebene. Die zweite Zahl ist der Beitrag der Wand ohne die Höhe.

   ── Die drei Zahlen, und warum es drei sein müssen ─────────────────

   **Vorzeichen.** Wie oft ist der Fels dunkler als der Boden daneben?
   50 % heißt „reiner Zufall" — dann trägt die Grenze keine Auskunft.
   Ein Mittelwert kann gut aussehen, während die einzelne Kante geraten
   ist; deshalb steht das Vorzeichen zuerst.

   **Sprung durch Körnung.** Der Helligkeitssprung an der Grenze,
   geteilt durch das Rauschen **innerhalb** einer Bodenfläche. Unter 1
   geht die Kante im Rauschen unter, egal wie der Mittelwert steht.

   **Körper.** Das 90. Perzentil des Felsens gegen das 10. Perzentil des
   Bodens, über ganze Felder statt über die Naht. Diese Zahl ist der
   Wächter gegen das Schönrechnen: Ein gefärbter Strich an der Naht
   bewegt die ersten beiden Zahlen fast beliebig weit, den Körper nicht.
   Überlappen die beiden Perzentile, ist der Fels flächig genauso hell
   wie der Boden — dann hat man einen Bilderrahmen gebaut, keine Wand.

   ── Warum es eine Selbstprobe gibt ─────────────────────────────────

   Bis zum 12.09.2026 tastete dieses Werkzeug daneben. Es nahm den
   „Felspunkt" mit `Math.round` genau auf der Naht zwischen zwei
   Feldmitten — und weil die Feldgrenze eine Voronoi-Entscheidung je
   Bildpunkt ist und nicht die Mitte zwischen zwei Mitten, lag dieser
   Punkt oft im **Boden**. Gemessen: von 94 Grenzen der damaligen
   Probekarte waren nur 46 wirklich Fels gegen Boden, 35 verglichen
   Boden gegen Boden. Ein Idealbild (Fels 20, Boden 200, ohne jedes
   Rauschen) meldete daraufhin **48,9 %** statt 100 % und ein
   Verhältnis von **0,00**.

   Das ist der schlimmste Fehler, den ein Messgerät haben kann: Es sah
   nicht kaputt aus, es lieferte plausible Zahlen. Auf diesen Zahlen
   stand eine Abnahme (95 %), die mit ihm gar nicht erreichbar war —
   selbst pechschwarzer Fels kam nur auf rund 86 %.

   Deshalb läuft jetzt **vor** jeder Messung eine Selbstprobe: dasselbe
   Idealbild durch dieselbe Abtastung. Meldet sie nicht 100 %, bricht
   das Werkzeug ab, statt eine Zahl zu drucken. Ein Messgerät, das sich
   nicht selbst prüfen kann, misst nichts.

   ── Wie richtig abgetastet wird ────────────────────────────────────

   Statt zu raten, welchem Feld ein Bildpunkt gehört, wird es
   mitgeschrieben: Jedes Feld malt nur seine eigenen Bildpunkte, also
   steht beim Einsammeln fest, wer welchen geschrieben hat. Von der
   Naht aus wird nach **beiden** Seiten gelaufen, bis ein Bildpunkt
   auftaucht, der wirklich dem Fels- beziehungsweise dem Bodenfeld
   gehört. Findet sich einer nicht, wird die Grenze **übersprungen und
   gezählt** — eine stille Auslassung wäre dieselbe Lüge wie vorher.

   ── Was hier bewusst nicht gemessen wird ───────────────────────────

   Nicht die Farbe, nur die Helligkeit nach Rec. 709. Wo der Unterschied
   im Blaukanal steckt, sagt diese Zahl nichts — und weil das
   Fackellicht Blau mit 0,220 multipliziert, wäre ein Unterschied dort
   im Spiel ohnehin fast weg. Auch nicht gemessen wird, was ein Mensch
   erkennt; gemessen wird, was im Bildpuffer steht.

   Ebenfalls nicht gemessen: das Bild **nach** Licht und Nebel. Der
   Bildpuffer ist der Zustand, den der Kartenknopf zeigt, und genau
   dort fällt die Wanderkennung heute aus.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/granit-feld.js` liefert die Bildpunkte je Feld,
   `spiel/gitter.mjs` die Karte und die Nachbarrichtungen,
   `spiel/landschaft.mjs` die erzeugte Karte für den Fall „heute",
   `spiel/raster.mjs` die Feldmitten. Wer `granit-feld.js` ändert,
   ändert diese Zahlen — sie sind die Abnahme für den ersten Schritt
   der Welle 3 in `docs/ROADMAP.md`. */

import { macheGranitFeld } from "../runtime/granit-feld.js";
import { macheKarte, HINDERNIS, richtungen } from "../spiel/gitter.mjs";
import { baueLandschaft } from "../spiel/landschaft.mjs";
import { feldMitte } from "../spiel/raster.mjs";

const HELL = (p) =>
  (p & 255) * 0.2126 + ((p >>> 8) & 255) * 0.7152 + ((p >>> 16) & 255) * 0.0722;

const mittelwert = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function perzentil(werte, anteil) {
  if (!werte.length) return 0;
  const s = [...werte].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * anteil)));
  return s[i];
}

/* Wie weit von der Naht aus höchstens gesucht wird, bis ein Bildpunkt
   auftaucht, der wirklich dem gesuchten Feld gehört. Eine Feldbreite
   ist reichlich; alles darüber wäre nicht mehr „an der Grenze". */
const SUCHWEITE = 8;

/* Flache Probekarten. Bewusst von Hand gebaut und nicht erzeugt — sonst
   misst man die Formel des Erzeugers mit und nicht die Frage.
   `dick` schaltet zwischen dem harten Fall (Wände ein Feld dick, wie in
   einem Gang) und dem leichten (breiter Felsrand). Der harte ist der
   wichtige: Eine erzeugte Höhlenwand ist im Mittel drei Felder dick,
   und ihr Inneres sieht ein Spieler nie. */
function flacheKarte(dick, kante = 24, saat = 4711) {
  const k = macheKarte(kante, kante);
  k.saat = saat;
  for (let y = 0; y < kante; y++) {
    for (let x = 0; x < kante; x++) {
      const rand = dick
        ? (x < 6 || x >= kante - 6 || y < 6 || y >= kante - 6)
        : (x % 7 === 3 && y > 2 && y < kante - 3)
          || (y % 7 === 3 && x > 2 && x < kante - 3)
          || x === 0 || y === 0 || x === kante - 1 || y === kante - 1;
      k.setze(x, y, { ebene: 1, hindernis: rand ? HINDERNIS.wand : HINDERNIS.keins });
    }
  }
  return k;
}

/* Alle Bildpunkte eines Feldbereichs einsammeln — und dabei
   mitschreiben, WELCHES Feld jeden geschrieben hat. Genau diese
   Mitschrift fehlte bis zum 12.09.2026, und daran hing der Fehler. */
function bildVon(karte, x0, y0, x1, y1, malerErsatz = null) {
  const granit = macheGranitFeld({ kasten() {}, ton: (h) => h });
  const punkte = new Map(), besitzer = new Map(), felder = new Map();
  let konturHell = 0, konturDunkel = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!karte.drin(x, y)) continue;
      const f = granit.feldDaten(karte, x, y);
      const wandHier = karte.hindernisBei(x, y) === HINDERNIS.wand;
      let summe = 0, zahl = 0;
      for (const rolle of f.rollen) {
        if (rolle === 3) konturHell++;
        else if (rolle === 4) konturDunkel++;
      }
      for (let py = 0; py < f.hoehe; py++) {
        for (let px = 0; px < f.breite; px++) {
          const roh = f.pixel[py * f.breite + px];
          if (!roh) continue;
          const wert = malerErsatz ? malerErsatz(wandHier) : HELL(roh);
          const schluessel = (f.x0 + px) + "," + (f.y0 + py);
          punkte.set(schluessel, wert);
          besitzer.set(schluessel, x + "," + y);
          summe += wert;
          zahl++;
        }
      }
      if (zahl) felder.set(x + "," + y, summe / zahl);
    }
  }
  return { punkte, besitzer, felder, konturHell, konturDunkel, granit };
}

/* Von der Naht aus in eine Richtung laufen, bis ein Bildpunkt auftaucht,
   der wirklich dem gesuchten Feld gehört. Gibt null zurück, wenn keiner
   in Reichweite liegt — der Aufrufer zählt das als Auslassung. */
function suchePunkt(bild, mx, my, ux, uy, feld) {
  for (let schritt = 0; schritt <= SUCHWEITE; schritt++) {
    const sx = Math.round(mx + ux * schritt), sy = Math.round(my + uy * schritt);
    const schluessel = sx + "," + sy;
    if (bild.besitzer.get(schluessel) === feld) return bild.punkte.get(schluessel);
  }
  return null;
}

/* Der Sprung an einer einzelnen Grenze: der erste Bildpunkt, der
   wirklich dem Felsfeld gehört, gegen den ersten, der wirklich dem
   Bodenfeld gehört. */
function grenze(bild, x, y, nx, ny, wandHier) {
  const p = feldMitte(x, y), q = feldMitte(nx, ny);
  const laenge = Math.hypot(q.x - p.x, q.y - p.y);
  if (!laenge) return null;
  const ux = (q.x - p.x) / laenge, uy = (q.y - p.y) / laenge;
  const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
  const felsFeld = wandHier ? x + "," + y : nx + "," + ny;
  const bodenFeld = wandHier ? nx + "," + ny : x + "," + y;
  const zumFels = wandHier ? -1 : 1;
  const fels = suchePunkt(bild, mx, my, ux * zumFels, uy * zumFels, felsFeld);
  const boden = suchePunkt(bild, mx, my, -ux * zumFels, -uy * zumFels, bodenFeld);
  if (fels === null || boden === null || fels === undefined || boden === undefined) return null;
  return fels - boden;
}

function messe(karte, x0, y0, x1, y1, nurGleicheEbene = false, malerErsatz = null) {
  const bild = bildVon(karte, x0 - 1, y0 - 1, x1 + 1, y1 + 1, malerErsatz);
  const istWand = (x, y) => karte.hindernisBei(x, y) === HINDERNIS.wand;
  const wandBoden = [], bodenBoden = [], felsFelder = [], bodenFelder = [];
  let paare = 0, dunkler = 0, summe = 0, ausgelassen = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const eigen = bild.felder.get(x + "," + y);
      if (eigen !== undefined) (istWand(x, y) ? felsFelder : bodenFelder).push(eigen);
      for (const r of richtungen(y)) {
        const nx = x + r.dx, ny = y + r.dy;
        if (ny < y || (ny === y && nx < x)) continue;
        if (!karte.drin(nx, ny)) continue;
        const a = bild.felder.get(x + "," + y), b = bild.felder.get(nx + "," + ny);
        if (a === undefined || b === undefined) continue;
        const A = istWand(x, y), B = istWand(nx, ny);
        if (A && B) continue;
        if (nurGleicheEbene && karte.ebeneBei(x, y) !== karte.ebeneBei(nx, ny)) continue;
        if (!A && !B) { bodenBoden.push(Math.abs(a - b)); continue; }
        wandBoden.push(Math.abs(a - b));
        const d = grenze(bild, x, y, nx, ny, A);
        if (d === null) { ausgelassen++; continue; }
        paare++;
        summe += d;
        if (d < 0) dunkler++;
      }
    }
  }
  /* Körnung: zwei direkt benachbarte Punkte im selben Bodenfeld, in
     beiden Richtungen. Nur waagerecht zu zählen hieße, das Rauschen
     einer Richtung zum Maßstab für alle zu machen. */
  const rauschen = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!karte.drin(x, y) || istWand(x, y)) continue;
      const f = bild.granit.feldDaten(karte, x, y);
      for (let py = 0; py < f.hoehe; py++) {
        for (let px = 0; px < f.breite; px++) {
          const hier = f.pixel[py * f.breite + px];
          if (!hier) continue;
          const rechts = px + 1 < f.breite ? f.pixel[py * f.breite + px + 1] : 0;
          const unten = py + 1 < f.hoehe ? f.pixel[(py + 1) * f.breite + px] : 0;
          if (rechts) rauschen.push(Math.abs(HELL(hier) - HELL(rechts)));
          if (unten) rauschen.push(Math.abs(HELL(hier) - HELL(unten)));
        }
      }
    }
  }
  const felsHell = perzentil(felsFelder, 0.90);
  const bodenDunkel = perzentil(bodenFelder, 0.10);
  return {
    wandBoden: mittelwert(wandBoden), wandBodenN: wandBoden.length,
    bodenBoden: mittelwert(bodenBoden), bodenBodenN: bodenBoden.length,
    paare, ausgelassen, dunkleranteil: paare ? 100 * dunkler / paare : 0,
    sprung: paare ? summe / paare : 0,
    rauschen: mittelwert(rauschen), rauschenN: rauschen.length,
    konturHell: bild.konturHell, konturDunkel: bild.konturDunkel,
    felsHell, bodenDunkel, koerperLuft: bodenDunkel - felsHell,
    felsN: felsFelder.length, bodenN: bodenFelder.length
  };
}

/* ── Die Selbstprobe ────────────────────────────────────────────────
   Dasselbe Abtasten auf einem Bild, bei dem die Antwort feststeht: Fels
   überall 20, Boden überall 200, kein Rauschen. Wer da nicht 100 %
   meldet, tastet daneben — und alles, was danach käme, wäre erfunden. */
function selbstprobe() {
  const karte = flacheKarte(false, 24, 4711);
  const m = messe(karte, 3, 3, 21, 21, false, (wand) => (wand ? 20 : 200));
  const fehler = [];
  if (m.paare === 0) fehler.push("keine einzige Grenze abgetastet");
  if (m.dunkleranteil < 99.999) {
    fehler.push(`Fels dunkler nur in ${m.dunkleranteil.toFixed(1)} % statt 100 %`);
  }
  if (m.ausgelassen > 0) fehler.push(`${m.ausgelassen} Grenze(n) nicht abtastbar`);
  if (m.koerperLuft <= 0) fehler.push("Körper überlappen im Idealbild");
  return { m, fehler };
}

function drucke(titel, m) {
  console.log(titel);
  console.log(`  Vorzeichen: Fels dunkler als der Boden daneben in `
    + `${m.dunkleranteil.toFixed(1)} % von ${m.paare} Grenzen (Zufall = 50,0 %)`);
  console.log(`  mittlerer Sprung Boden→Fels: ${m.sprung.toFixed(2)} von 255`);
  console.log(`  Körnung im Boden: ${m.rauschen.toFixed(2)} von 255 (n=${m.rauschenN})`);
  const verhaeltnis = m.rauschen ? Math.abs(m.sprung) / m.rauschen : 0;
  console.log(`  Sprung durch Körnung: ${verhaeltnis.toFixed(2)} `
    + `— unter 1 geht die Wandkante im Rauschen unter`);
  console.log(`  Körper: Fels P90 ${m.felsHell.toFixed(2)} gegen Boden P10 `
    + `${m.bodenDunkel.toFixed(2)} → Luft ${m.koerperLuft.toFixed(2)} `
    + `(unter 0 = der Fels ist flächig so hell wie der Boden)`);
  console.log(`  Feldmittel Wand|Boden n=${m.wandBodenN} `
    + `${m.wandBoden.toFixed(2)}  ·  Boden|Boden n=${m.bodenBodenN} `
    + `${m.bodenBoden.toFixed(2)}`);
  console.log(`  Konturpunkte: hell=${m.konturHell} dunkel=${m.konturDunkel}`
    + `  ·  Felder: ${m.felsN} Fels, ${m.bodenN} Boden`);
  if (m.ausgelassen) {
    console.log(`  AUSGELASSEN: ${m.ausgelassen} Grenze(n) waren nicht abtastbar`);
  }
  console.log("");
}

const saat = Number(process.argv[2] || 4711);

const probe = selbstprobe();
if (probe.fehler.length) {
  console.error("Die Selbstprobe ist rot — das Werkzeug tastet daneben:");
  for (const f of probe.fehler) console.error("  · " + f);
  console.error("Es wird nichts gemessen. Erst das Abtasten berichtigen.");
  process.exit(1);
}
console.log(`Selbstprobe grün: Idealbild (Fels 20, Boden 200) ergibt `
  + `${probe.m.dunkleranteil.toFixed(1)} % über ${probe.m.paare} Grenzen, `
  + `0 ausgelassen.\n`);

console.log(`Wandkontrast, Saat ${saat}. Helligkeit nach Rec. 709, im Bildpuffer `
  + `gemessen — also ohne Licht und ohne Nebel.\n`);

drucke("FLACH, WÄNDE EIN FELD DICK — Janniks nächster Zustand, der harte Fall:",
  messe(flacheKarte(false, 24, saat), 3, 3, 21, 21));
drucke("FLACH, BREITER FELSRAND — derselbe Zustand mit Felsinnerem:",
  messe(flacheKarte(true, 24, saat), 3, 3, 21, 21));

const echt = baueLandschaft({ saat, breite: 56, hoehe: 40, spielerZahl: 2 });
drucke("HEUTE — erzeugte Karte, alle Grenzen (Höhenkante inbegriffen):",
  messe(echt, 4, 4, 52, 36));
drucke("HEUTE — dieselbe Karte, nur Paare auf derselben Ebene:",
  messe(echt, 4, 4, 52, 36, true));
