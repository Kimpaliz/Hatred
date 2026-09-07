/* [Aufgabe: Prüfwesen] Prüft manuellen Pixelzoom an der echten Kamera.

   ── Warum die Kamera statt einer nachgebauten Rechnung ────────────

   Ein Zoomknopf hilft nicht, wenn die nächste Fensteränderung seine
   Stufe zurücksetzt oder die Figur aus dem Blick rutscht. Hier werden
   deshalb dieselben Kameramethoden wie bei Resize, Verfolgung und
   Rütteln aufgerufen. Die Feldkoordinaten müssen nach jeder Stufe noch
   eindeutig zurückkommen; die Karte selbst bleibt unverändert.

   Die alte Kamera muss an der fehlenden Bedienung scheitern. Die
   automatische Vergrößerung bleibt gesondert abgesichert, damit ein
   manueller Wunsch den bisherigen Standard nicht unbemerkt ersetzt.

   ── Arbeitet zusammen mit ────────────────────────────────────────

   `runtime/kamera.js` (echte Kamera), `runtime/licht.js` (Kachelmaß),
   `spiel/gitter.mjs` (Karte mit prüfbarer Summe),
   `werkzeuge/pruefe-schrift.mjs` (bisherige Kameraautomatik) und
   `werkzeuge/helfer.mjs` (Behauptungen und Rückgabewert). */

import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";
import { macheKamera, vergroesserungFuer } from "../runtime/kamera.js";
import { KACHEL } from "../runtime/licht.js";
import { macheKarte } from "../spiel/gitter.mjs";
import { weltMasse } from "../spiel/raster.mjs";

const FENSTER = [[412, 915], [915, 412], [801, 603], [1920, 1080], [9000, 7000]];
const karte = macheKarte(120, 120);
const summe = karte.summe();
const kamera = macheKamera({ karte, fensterBreite: 801, fensterHoehe: 603 });

abschnitt("Zoom: vorhandene Bedienung");
const namen = ["zoome", "setzeZoom", "zoomZurueck", "zoomStand"];
for (const name of namen) gleich(typeof kamera[name], "function", `${name} ist aufrufbar`);
if (namen.some((name) => typeof kamera[name] !== "function")) ende("Kamerazoom");

abschnitt("Zoom: unveränderte Automatik und expliziter Nutzerwunsch");
for (const [breite, hoehe] of FENSTER) {
  kamera.setzeFenster(breite, hoehe);
  gleich(kamera.vergroesserung, vergroesserungFuer(breite, hoehe),
    `${breite}×${hoehe}: ohne Wunsch gilt die bisherige Vergrößerung`);
  gleich(kamera.standardVergroesserung, vergroesserungFuer(breite, hoehe),
    "das HUD bekommt die automatische Standardstufe");
  gleich(kamera.zoomStand().automatisch, true, "die Kamera meldet Automatik");
  gleich(kamera.zoomStand().min, 1, "Verkleinern endet bei einem echten Pixel");
  gleich(kamera.zoomStand().max, Math.max(12, vergroesserungFuer(breite, hoehe)),
    "das Maximum erlaubt zwölf Stufen oder die größere automatische Stufe");
}
kamera.setzeFenster(801, 603);
gleich(kamera.zoome(0), kamera.vergroesserung, "kein Schritt verändert nichts");
gleich(kamera.zoomStand().automatisch, true, "null Schritte schalten die Automatik nicht ab");
gleich(kamera.zoome(1), 2, "ein positiver Schritt vergrößert um eins");
gleich(kamera.zoomStand().automatisch, false, "ein echter Schritt ist ein manueller Wunsch");
gleich(kamera.setzeZoom(4.9), 4, "absolute Stufen werden auf ganze Bildpunkte abgerundet");
gleich(kamera.zoome(2.9), 6, "positive Teilschritte werden abgeschnitten");
gleich(kamera.zoome(-1.9), 5, "negative Teilschritte zählen genauso viele ganze Schritte");
for (const falsch of [NaN, Infinity, -Infinity, undefined, null, "4"]) {
  gleich(kamera.setzeZoom(falsch), 5, "ein ungültiger absoluter Zoom bleibt ohne Wirkung");
  gleich(kamera.zoome(falsch), 5, "ein ungültiger Zoomschritt bleibt ohne Wirkung");
}
gleich(kamera.setzeZoom(-100), 1, "absolute Stufen unterschreiten eins nicht");
gleich(kamera.zoome(-100), 1, "Schritte unterschreiten eins nicht");
gleich(kamera.setzeZoom(100), 12, "absolute Stufen halten das Maximum ein");
gleich(kamera.zoome(100), 12, "Schritte halten das Maximum ein");

abschnitt("Zoom: Resize und Vollbild behalten die gewählte absolute Stufe");
kamera.setzeZoom(4);
for (const [breite, hoehe] of FENSTER) {
  kamera.setzeFenster(breite, hoehe);
  gleich(kamera.vergroesserung, 4, `${breite}×${hoehe}: die manuelle vier bleibt erhalten`);
  gleich(kamera.standardVergroesserung, vergroesserungFuer(breite, hoehe),
    "die HUD-Standardstufe folgt trotz Nutzerzoom der Fenstergröße");
  gleich(kamera.zoomStand().stufe, 4, "der gemeldete Zoom stimmt mit der Zeichnung überein");
  gleich(kamera.zoomStand().automatisch, false, "Resize schaltet nicht zur Automatik zurück");
}
kamera.setzeZoom(18);
kamera.setzeFenster(801, 603);
gleich(kamera.vergroesserung, 12, "ein verkleinertes Fenster begrenzt sehr große Sonderstufen");
kamera.setzeFenster(9000, 7000);
gleich(kamera.vergroesserung, 18,
  "der größere absolute Wunsch bleibt bis zur Rückkehr gespeichert");
gleich(kamera.zoomZurueck(), vergroesserungFuer(9000, 7000), "Reset folgt sofort der Automatik");
gleich(kamera.zoomStand().automatisch, true, "Reset meldet wieder automatisch");
kamera.setzeFenster(801, 603);
gleich(kamera.vergroesserung, vergroesserungFuer(801, 603),
  "nach Reset reagiert Resize automatisch");

abschnitt("Zoom: Mittelpunkt, Grenzen und eindeutige Feldkoordinaten");
let umkehrungen = 0;
for (let stufe = 1; stufe <= 12; stufe++) {
  kamera.setzeZoom(stufe);
  kamera.folge(60, 60, true);
  const anker = kamera.feldNachBild(60, 60);
  const mitte = { x: anker.x + KACHEL / 2 * stufe,
    y: anker.y + KACHEL / 2 * stufe };
  behaupte(Math.abs(mitte.x - kamera.fensterBreite / 2) <= stufe,
    `Stufe ${stufe}: die gefolgte Figur bleibt waagerecht in der Mitte`);
  behaupte(Math.abs(mitte.y - kamera.fensterHoehe / 2) <= stufe,
    `Stufe ${stufe}: die gefolgte Figur bleibt senkrecht in der Mitte`);
  for (const [x, y] of [[60, 60], [0, 0], [119, 119], [0, 119], [119, 0]]) {
    kamera.folge(x, y, true);
    const fenster = kamera.sichtbareFelder();
    behaupte(fenster.vonX >= 0 && fenster.vonY >= 0 && fenster.bisX < karte.breite
      && fenster.bisY < karte.hoehe, `Stufe ${stufe}: der Ausschnitt bleibt auf der Karte`);
    behaupte(Number.isInteger(kamera.eckeX) && Number.isInteger(kamera.eckeY),
      `Stufe ${stufe}: die Kameralage ist ganzzahlig`);
    for (const [fx, fy] of [[x, y], [1, 1], [60, 60], [118, 118]]) {
      const bild = kamera.feldNachBild(fx, fy);
      const zurueck = kamera.bildNachFeld(bild.x + KACHEL / 2 * stufe,
        bild.y + KACHEL / 2 * stufe);
      gleich(zurueck.x, fx, `Stufe ${stufe}: Feldspalte kommt nach dem Zoom zurück`);
      gleich(zurueck.y, fy, `Stufe ${stufe}: Feldzeile kommt nach dem Zoom zurück`);
      behaupte(Number.isInteger(bild.x) && Number.isInteger(bild.y),
        `Stufe ${stufe}: der gezeichnete Spriteanker bleibt ganzzahlig`);
      umkehrungen++;
    }
  }
}

abschnitt("Zoom: weiches Folgen und Rütteln bleiben im selben Weltbezug");
{
  const neu = () => macheKamera({ karte, fensterBreite: 801, fensterHoehe: 603 });
  const eins = neu(), zwei = neu();
  eins.folge(40, 40, true); zwei.folge(40, 40, true);
  eins.folge(60, 50); zwei.folge(60, 50);
  const vorherX = eins.eckeX + eins.sichtBreite() / 2;
  const vorherY = eins.eckeY + eins.sichtHoehe() / 2;
  eins.setzeZoom(4);
  behaupte(Math.abs(eins.eckeX + eins.sichtBreite() / 2 - vorherX) <= 1,
    "Zoom während der Bewegung hält die aktuelle waagerechte Mitte");
  behaupte(Math.abs(eins.eckeY + eins.sichtHoehe() / 2 - vorherY) <= 1,
    "Zoom während der Bewegung hält die aktuelle senkrechte Mitte");
  for (let i = 0; i < 30; i++) { eins.folge(60, 50); zwei.folge(60, 50); }
  zwei.setzeZoom(4);
  gleich(eins.eckeX, zwei.eckeX, "Zoomen verschiebt nicht die weiche Verfolgung auf X");
  gleich(eins.eckeY, zwei.eckeY, "Zoomen verschiebt nicht die weiche Verfolgung auf Y");
  eins.ruettle(5, 0.6);
  eins.folge(60, 50, true, 0.1); zwei.folge(60, 50, true, 0.1);
  const versatz = { x: eins.eckeX - zwei.eckeX, y: eins.eckeY - zwei.eckeY };
  behaupte(versatz.x !== 0 || versatz.y !== 0, "die Rüttelprobe enthält einen echten Versatz");
  eins.setzeZoom(7); zwei.setzeZoom(7);
  gleich(eins.eckeX - zwei.eckeX, versatz.x, "Zoom behält den Rüttelversatz in Weltpunkten auf X");
  gleich(eins.eckeY - zwei.eckeY, versatz.y, "Zoom behält den Rüttelversatz in Weltpunkten auf Y");
}

abschnitt("Zoom: kleine Karte und unberührte Spielwerte");
{
  const klein = macheKarte(8, 6);
  const masse = weltMasse(klein);
  const probe = macheKamera({ karte: klein, fensterBreite: 801, fensterHoehe: 603 });
  for (const stufe of [1, 2, 4, 12]) {
    probe.setzeZoom(stufe);
    if (probe.sichtBreite() >= masse.breite) {
      const mitte = (masse.breite / 2 - probe.eckeX) * stufe;
      behaupte(Math.abs(mitte - 801 / 2) <= stufe, "eine kleine Karte bleibt waagerecht mittig");
    }
    if (probe.sichtHoehe() >= masse.hoehe) {
      const mitte = (masse.hoehe / 2 - probe.eckeY) * stufe;
      behaupte(Math.abs(mitte - 603 / 2) <= stufe, "eine kleine Karte bleibt senkrecht mittig");
    }
  }
  gleich(karte.summe(), summe, "alle Zoomoperationen lassen sämtliche Kartenfelder unverändert");
}

console.log(`  Gemessen: 12 Zoomstufen, ${FENSTER.length} Fenstergrößen, `
  + `${umkehrungen} Feld-Bild-Umkehrungen.`);
ende("Kamerazoom");
