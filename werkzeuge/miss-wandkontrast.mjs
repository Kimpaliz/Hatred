/* [Aufgabe: Werkzeug] Misst, wie stark sich eine Wand im Bild vom Boden abhebt.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Jannik am 08.09.2026: *„gut erkennbare wände, dass ist unendlich
   wichtig das auf den ersten blick gut zu erkennen ist wo Wände
   sind"*. Das ist eine Aussage über ein Bild, und ein Bild lässt sich
   nicht diskutieren — es lässt sich messen. Ohne diese Zahl wäre jede
   Antwort auf seinen Wunsch eine Meinung.

   Gemessen werden drei Fälle nebeneinander, weil erst der Vergleich
   etwas aussagt:

   · **heute** — eine erzeugte Karte, wie sie im Spiel steht. Hier
     enthält der Sprung an einer Wandgrenze auch die Höhenkante, denn
     Wände stehen meist eine Stufe höher als der Boden davor.
   · **heute, gleiche Ebene** — dieselbe Karte, aber nur die Paare, bei
     denen Wand und Boden auf **derselben** Ebene liegen. Das ist der
     Beitrag der Wand allein.
   · **flach** — eine Karte, wie Jannik sie als Nächstes möchte: eine
     Ebene, nur Raum und Wand. Was hier übrig bleibt, ist das, was er
     nach dem Umbau tatsächlich sähe.

   Der schärfste Wert ist nicht der Mittelwert, sondern der
   **Münzwurf**: Wie oft ist ein Felspunkt dunkler als der Bodenpunkt
   direkt daneben? 50 % heißt „reiner Zufall" — dann trägt die Grenze
   keine Auskunft. Ein Mittelwert kann gut aussehen, während die
   einzelne Kante geraten ist; deshalb steht beides da.

   Zum Vergleich läuft die Körnung im Boden mit: der Sprung zwischen
   zwei direkt benachbarten Punkten **innerhalb** einer Bodenfläche.
   Ist der Sprung an der Wandgrenze kleiner als dieses Rauschen, ist
   die Wand als Helligkeitskante nicht zu sehen, egal wie der
   Mittelwert steht.

   ── Was hier bewusst nicht gemessen wird ───────────────────────────

   Nicht die Farbe, nur die Helligkeit nach Rec. 709. Wo der Unterschied
   im Blaukanal steckt, sagt diese Zahl nichts — und weil das Fackellicht
   Blau mit 0,220 multipliziert, wäre ein Unterschied dort im Spiel
   ohnehin fast weg. Auch nicht gemessen wird, was ein Mensch erkennt;
   gemessen wird, was im Bildpuffer steht.

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

/* Eine flache Zielkarte: eine Ebene, ein Raum, ringsum Fels. Bewusst
   von Hand gebaut und nicht erzeugt — sonst misst man die Formel des
   Erzeugers mit und nicht die Frage. */
function flacheKarte(kante = 24, saat = 4711) {
  const k = macheKarte(kante, kante);
  k.saat = saat;
  const rand = Math.round(kante / 4);
  for (let y = 0; y < kante; y++) {
    for (let x = 0; x < kante; x++) {
      const fels = x < rand || x >= kante - rand || y < rand || y >= kante - rand;
      k.setze(x, y, { ebene: 1, hindernis: fels ? HINDERNIS.wand : HINDERNIS.keins });
    }
  }
  return k;
}

/* Alle Bildpunkte eines Feldbereichs einsammeln, dazu die mittlere
   Helligkeit je Feld. Der Rand bleibt aussen vor: Ein halb gezeichnetes
   Feld hätte einen falschen Mittelwert. */
function bildVon(karte, x0, y0, x1, y1) {
  const granit = macheGranitFeld({ kasten() {}, ton: (h) => h });
  const punkte = new Map(), felder = new Map();
  let konturHell = 0, konturDunkel = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const f = granit.feldDaten(karte, x, y);
      let summe = 0, zahl = 0;
      for (const rolle of f.rollen) {
        if (rolle === 3) konturHell++;
        else if (rolle === 4) konturDunkel++;
      }
      for (let py = 0; py < f.hoehe; py++) {
        for (let px = 0; px < f.breite; px++) {
          const wert = f.pixel[py * f.breite + px];
          if (!wert) continue;
          punkte.set((f.x0 + px) + "," + (f.y0 + py), HELL(wert));
          summe += HELL(wert);
          zahl++;
        }
      }
      if (zahl) felder.set(x + "," + y, summe / zahl);
    }
  }
  return { punkte, felder, konturHell, konturDunkel, granit };
}

/* Der Münzwurf an einer einzelnen Grenze: den Punkt genau auf der
   Naht mit dem Punkt einen Schritt zurück im Boden vergleichen. */
function grenze(bild, karte, x, y, nx, ny, wandHier) {
  const p = feldMitte(x, y), q = feldMitte(nx, ny);
  const laenge = Math.hypot(q.x - p.x, q.y - p.y);
  if (!laenge) return null;
  const ux = (q.x - p.x) / laenge, uy = (q.y - p.y) / laenge;
  const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, zeichen = wandHier ? -1 : 1;
  const boden = bild.punkte.get(
    Math.round(mx - ux * zeichen) + "," + Math.round(my - uy * zeichen));
  const fels = bild.punkte.get(Math.round(mx) + "," + Math.round(my));
  if (boden === undefined || fels === undefined) return null;
  return fels - boden;
}

function messe(karte, x0, y0, x1, y1, nurGleicheEbene = false) {
  const bild = bildVon(karte, x0 - 1, y0 - 1, x1 + 1, y1 + 1);
  const istWand = (x, y) => karte.hindernisBei(x, y) === HINDERNIS.wand;
  const wandBoden = [], bodenBoden = [];
  let paare = 0, dunkler = 0, summe = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
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
        const d = grenze(bild, karte, x, y, nx, ny, A);
        if (d === null) continue;
        paare++;
        summe += d;
        if (d < 0) dunkler++;
      }
    }
  }
  /* Körnung: zwei direkt benachbarte Punkte im selben Bodenfeld. */
  const rauschen = [];
  for (let y = y0 + 2; y < Math.min(y1 - 2, y0 + 8); y++) {
    for (let x = x0 + 2; x < Math.min(x1 - 2, x0 + 8); x++) {
      if (istWand(x, y)) continue;
      const f = bild.granit.feldDaten(karte, x, y);
      for (let py = 0; py < f.hoehe; py++) {
        for (let px = 0; px + 1 < f.breite; px++) {
          const a = f.pixel[py * f.breite + px], b = f.pixel[py * f.breite + px + 1];
          if (!a || !b) continue;
          rauschen.push(Math.abs(HELL(a) - HELL(b)));
        }
      }
    }
  }
  return {
    wandBoden: mittelwert(wandBoden), wandBodenN: wandBoden.length,
    bodenBoden: mittelwert(bodenBoden), bodenBodenN: bodenBoden.length,
    paare, dunkleranteil: paare ? 100 * dunkler / paare : 0,
    sprung: paare ? summe / paare : 0,
    rauschen: mittelwert(rauschen), rauschenN: rauschen.length,
    konturHell: bild.konturHell, konturDunkel: bild.konturDunkel
  };
}

function drucke(titel, m) {
  console.log(titel);
  console.log(`  Feldmittel Wand|Boden   n=${m.wandBodenN} `
    + `Mittel=${m.wandBoden.toFixed(2)} von 255`);
  console.log(`  Feldmittel Boden|Boden  n=${m.bodenBodenN} `
    + `Mittel=${m.bodenBoden.toFixed(2)} von 255`);
  console.log(`  Münzwurf: Felspunkt dunkler als der Boden daneben in `
    + `${m.dunkleranteil.toFixed(1)} % von ${m.paare} Grenzen (Zufall = 50,0 %)`);
  console.log(`  mittlerer Sprung Boden→Fels: ${m.sprung.toFixed(2)} von 255`);
  console.log(`  Körnung im Boden (zwei Nachbarpunkte): `
    + `${m.rauschen.toFixed(2)} von 255 (n=${m.rauschenN})`);
  console.log(`  Konturpunkte: hell=${m.konturHell} dunkel=${m.konturDunkel}`);
  const verhaeltnis = m.rauschen ? Math.abs(m.sprung) / m.rauschen : 0;
  console.log(`  Sprung geteilt durch Körnung: ${verhaeltnis.toFixed(2)} `
    + `— unter 1 geht die Wandkante im Rauschen unter`);
  console.log("");
}

const saat = Number(process.argv[2] || 4711);

console.log(`Wandkontrast, Saat ${saat}. Alle Werte in Helligkeit nach Rec. 709.\n`);

const flach = flacheKarte(24, saat);
drucke("FLACH — eine Ebene, nur Raum und Fels (Janniks nächster Zustand):",
  messe(flach, 3, 3, 21, 21));

const echt = baueLandschaft({ saat, breite: 56, hoehe: 40, spielerZahl: 2 });
drucke("HEUTE — erzeugte Karte, alle Grenzen (Höhenkante inbegriffen):",
  messe(echt, 4, 4, 52, 36));
drucke("HEUTE — dieselbe Karte, nur Paare auf derselben Ebene:",
  messe(echt, 4, 4, 52, 36, true));
