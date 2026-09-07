/* [Aufgabe: Werkzeug] Interaktive Sichtprobe mit dem tatsächlichen Spielzeichner.

   ── Warum es das gibt ──────────────────────────────────────────────

   Die Karte zeigt die echte Generierung. Die zweite Ansicht setzt breite
   Treppen, mehrere Höhen und eine Schlucht nebeneinander, damit ihre
   Anschlüsse ohne Zufall verglichen werden können. Keine zweite Engine.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   topdown-vorschau.html trägt Bedienelemente, landschaft.mjs die Höhle,
   zeichnen.js die Ausgabe und raster.mjs die gemeinsame Feldgeometrie. */

import { baueLandschaft } from "../spiel/landschaft.mjs";
import { macheKarte, HINDERNIS, RAMPE, FLUESSIG, richtungen } from "../spiel/gitter.mjs";
import { feldEcken, feldMitte, weltNachFeld } from "../spiel/raster.mjs";
import { macheKamera } from "../runtime/kamera.js";
import { macheLichtwerk } from "../runtime/licht.js";
import { macheZeichner } from "../runtime/zeichnen.js";

const blatt = document.querySelector("#bild"), ctx = blatt.getContext("2d");
const status = document.querySelector("#status");
let karte, kamera, zeichner, ziel, modus = "hoehle", bilder = 0, zeitSumme = 0;
const lichtAn = () => document.querySelector("#licht").checked;

function galerie() {
  const k = macheKarte(28, 23); k.saat = 7;
  for (let y = 0; y < k.hoehe; y++) for (let x = 0; x < k.breite; x++) {
    if (x < 2 || y < 2 || x >= 26 || y >= 21) k.hindernis[k.index(x, y)] = HINDERNIS.wand;
    k.ebene[k.index(x, y)] = x < 9 ? 0 : x < 18 ? 1 : 2;
    if (y >= 5 && y <= 9 && (x === 8 || x === 17)) k.rampe[k.index(x, y)] = RAMPE.ost;
    if (x >= 12 && x <= 15 && y >= 15 && y <= 18) {
      k.hindernis[k.index(x, y)] = HINDERNIS.abgrund;
      k.ebene[k.index(x, y)] = 0;
    }
    if (x >= 3 && x <= 6 && y >= 14 && y <= 18) k.fluessig[k.index(x, y)] = FLUESSIG.wasser;
  }
  /* Zweite Galeriehälfte: alle sechs Richtungen mit ihren höheren Zielfeldern. */
  for (let n = 0; n < 6; n++) {
    const x = 4 + n * 3, y = 11;
    const r = richtungen(y)[n];
    k.ebene[k.index(x, y)] = 1;
    k.ebene[k.index(x + r.dx, y + r.dy)] = 2;
    k.rampe[k.index(x, y)] = r.rampe;
  }
  k.lichter = [{ x: 6, y: 7, art: "fackel", staerke: 1 },
    { x: 17, y: 12, art: "fackel", staerke: 1 }];
  return k;
}

function bauen() {
  karte = modus === "treppen" ? galerie()
    : baueLandschaft({ saat: Number(document.querySelector("#saat").value) | 0,
      spielerZahl: 2 });
  kamera = macheKamera({ fensterBreite: innerWidth, fensterHoehe: 700, karte });
  ziel = { x: (karte.breite - 1) / 2, y: (karte.hoehe - 1) / 2 };
  const lichtwerk = lichtAn() ? macheLichtwerk(karte) : null;
  zeichner = macheZeichner({ ctx, kamera, lichtwerk });
  groesse(); kamera.setzeZoom(modus === "treppen" ? 3 : 1);
  kamera.folge(ziel.x, ziel.y, true); bilder = 0; zeitSumme = 0;
  globalThis.vorschau = { karte, kamera, zeichner };
}
function groesse() {
  zeichner?.setzeFenster(innerWidth,
    Math.max(150, innerHeight - document.querySelector("header").offsetHeight));
}
function rasterZeigen() {
  if (!document.querySelector("#raster").checked) return;
  ctx.strokeStyle = "#b5b9a72a"; ctx.lineWidth = 1;
  const f = kamera.sichtbareFelder(0), g = kamera.vergroesserung;
  for (let y = f.vonY; y <= f.bisY; y++) for (let x = f.vonX; x <= f.bisX; x++) {
    if (karte.blocktBewegung(x, y)) continue;
    ctx.beginPath();
    feldEcken(x, y).forEach((p, i) => {
      const px = (Math.round(p.x) - kamera.eckeX) * g + 0.5;
      const py = (Math.round(p.y) - kamera.eckeY) * g + 0.5;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath(); ctx.stroke();
  }
}
function bild(zeit) {
  const start = performance.now();
  zeichner.bild({ karte, wesen: [] }, {}, zeit / 1000);
  rasterZeigen();
  zeitSumme += performance.now() - start; bilder++;
  if (bilder % 30 === 0) {
    status.textContent = (modus === "treppen" ? "Breite Treppen · sechs Richtungen · Höhen 0–2"
      : "Scotophobias Höhlenform · Granit · rasterbasierte Höhen")
      + " | Zoom " + kamera.vergroesserung + "× | " + (zeitSumme / bilder).toFixed(1)
      + " ms/Bild | Ziehen zum Verschieben";
    bilder = 0; zeitSumme = 0;
  }
  requestAnimationFrame(bild);
}
document.querySelector("#hoehle").onclick = () => { modus = "hoehle"; bauen(); };
document.querySelector("#treppen").onclick = () => { modus = "treppen"; bauen(); };
document.querySelector("#licht").onchange = bauen;
document.querySelector("#plus").onclick = () => kamera.zoome(1);
document.querySelector("#minus").onclick = () => kamera.zoome(-1);
let ziehen = null;
blatt.onpointerdown = (e) => { ziehen = { x: e.clientX, y: e.clientY,
  mitte: feldMitte(ziel.x, ziel.y) }; blatt.setPointerCapture(e.pointerId); };
blatt.onpointermove = (e) => {
  if (!ziehen) return;
  const dx = (e.clientX - ziehen.x) / kamera.vergroesserung;
  const dy = (e.clientY - ziehen.y) / kamera.vergroesserung;
  const p = weltNachFeld(ziehen.mitte.x - dx, ziehen.mitte.y - dy);
  ziel = p; kamera.folge(ziel.x, ziel.y, true);
};
blatt.onpointerup = () => { ziehen = null; };
blatt.onpointercancel = () => { ziehen = null; };
addEventListener("resize", groesse);
bauen(); requestAnimationFrame(bild);
