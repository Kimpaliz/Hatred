/* [Aufgabe: Prüfwesen] Malt echte Granitpixel und prüft Hexbesitz und Treppennähte.

   ── Warum die Ausgabe und nicht nur Hilfsformeln ────────────────────

   Ein Treppenflag beweist keinen durchgehenden Tritt. Hier werden die
   fertigen Pixel des Standardzeichners einschließlich Feldgrenzen,
   Nebeldämpfung und Cacheänderungen betrachtet. Alle sechs Richtungen
   und beide Zeilenparitäten müssen dieselben Zusagen erfüllen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/granit-feld.js` liefert den geprüften Pixel- und Zeichenweg;
   `spiel/gitter.mjs`, `spiel/raster.mjs` liefern echte Regelkarten.
   `runtime/palette.js` liefert die normale Nebeldämpfung; die Aussagen
   gehen über `tests/helfer.mjs` in die vollständige Prüfkette. */

import { abschnitt, behaupte, gleich, tiefGleich, ende } from "./helfer.mjs";
import { macheGranitFeld, feldPixelGrenzen, FEIN } from "../runtime/granit-feld.js";
import {
  macheKarte, HINDERNIS, FLUESSIG, BLOCKT_BEWEGUNG, richtungen
} from "../spiel/gitter.mjs";
import { feldMitte, weltNachFeld } from "../spiel/raster.mjs";
import { abdunkeln, ERINNERT_HELLE } from "../runtime/palette.js";

const ton = (farbe, matt) => matt ? abdunkeln(farbe, ERINNERT_HELLE) : farbe;
const neu = () => { const k = macheKarte(18, 18); k.saat = 4711; return k; };
const renderer = () => macheGranitFeld({ kasten() {}, ton });
const hell = (p) => (p & 255) * 0.2126 + ((p >>> 8) & 255) * 0.7152
  + ((p >>> 16) & 255) * 0.0722;
const farben = (bild) => [...bild.pixel].filter(Boolean);

function setzeRampe(k, x, y, r, ebene = 1) {
  k.setze(x, y, { ebene, rampe: r.rampe });
  k.setze(x + r.dx, y + r.dy, { ebene: ebene + 1 });
}

abschnitt("Hexbesitz: kein Loch, kein doppelter Weltpixel");
{
  const k = neu(), g = renderer(), besitzer = new Map();
  let fein = 1;
  for (let y = 4; y <= 9; y++) for (let x = 4; x <= 9; x++) {
    const bild = g.feldDaten(k, x, y);
    fein = bild.fein;
    tiefGleich(feldPixelGrenzen(x, y), {
      x0: bild.x0, y0: bild.y0, breite: bild.breite, hoehe: bild.hoehe
    }, `(${x},${y}): Kamera und Pixelpuffer teilen dieselbe Boundingbox`);
    for (let py = 0; py < bild.bildHoehe; py++) for (let px = 0; px < bild.bildBreite; px++) {
      if (!bild.pixel[py * bild.bildBreite + px]) continue;
      const wx = bild.x0 + px / bild.fein, wy = bild.y0 + py / bild.fein;
      const key = `${bild.x0 * bild.fein + px},${bild.y0 * bild.fein + py}`;
      const f = weltNachFeld(wx + 0.5 / bild.fein, wy + 0.5 / bild.fein);
      behaupte(f.x === x && f.y === y, `Weltpixel ${key} liegt im richtigen Hexfeld`);
      behaupte(!besitzer.has(key), `Weltpixel ${key} wird nur einmal gemalt`);
      besitzer.set(key, true);
    }
  }
  /* Jeder Weltpunkt der Innenfläche ist mit allen seinen feinen
     Abtastpunkten gemalt — Schlüssel in Bildpunkten, Welt mal FEIN. */
  for (let wy = 80; wy <= 112; wy++) for (let wx = 96; wx <= 128; wx++) {
    for (let j = 0; j < fein; j++) for (let i = 0; i < fein; i++) {
      behaupte(besitzer.has(`${wx * fein + i},${wy * fein + j}`),
        `Innenfläche enthält Weltpixel ${wx},${wy} (Abtastpunkt ${i},${j})`);
    }
  }
}

abschnitt("Alle sechs Höhenkanten: oben hell, unten dunkel");

/* ── Was sich am 12.09.2026 geändert hat (W10, Vorgang #35) ─────────
   Liegt der tiefere Nachbar **unter** dem Hochfeld (Südost, Südwest),
   zeigt sich die Höhe seit der Flanke nicht mehr als ein Bildpunkt
   Schattenkontur, sondern als Südseite über mehrere Bildpunkte. Die
   Rolle 4 ist dort weg, und das ist Absicht: Zwei Zeichen für dieselbe
   Höhe an derselben Stelle wären eins zu viel.

   Die anderen vier Richtungen behalten die Kontur. Sie ist dort das
   Einzige, was die Höhe zeigt — im gekippten Blick sieht man die Seite
   von etwas, das neben oder über einem steht, nun einmal nicht. */
for (const y of [6, 7]) for (const r of richtungen(y)) {
  const k = neu(), g = renderer(), x = 7;
  k.setze(x, y, { ebene: 2 });
  const oben = g.feldDaten(k, x, y);
  const unten = g.feldDaten(k, x + r.dx, y + r.dy);
  const suedlich = r.dy > 0;
  behaupte([...oben.rollen].filter((v) => v === 3).length >= 4,
    `${y}/${r.name}: das Hochfeld trägt eine sichtbare Oberkontur`);
  if (suedlich) {
    const flanke = [...unten.rollen].filter((v) => v === 6).length;
    behaupte(flanke >= 30,
      `${y}/${r.name}: das tiefere Nachbarfeld trägt eine Flanke (${flanke} Abtastpunkte)`);
    gleich([...unten.rollen].filter((v) => v === 4).length, 0,
      `${y}/${r.name}: und daneben keine zweite Höhenanzeige als Schattenkontur`);
  } else {
    behaupte([...unten.rollen].filter((v) => v === 4).length >= 4,
      `${y}/${r.name}: das tiefere Nachbarfeld trägt eine Schattenkontur`);
    gleich([...unten.rollen].filter((v) => v === 6).length, 0,
      `${y}/${r.name}: und keine Flanke — von der Seite sieht man keine Südseite`);
  }
  const lichtrand = farben(oben).filter((p) => hell(p) > 90);
  behaupte(lichtrand.length >= 4, `${y}/${r.name}: die gemalte Kontur ist wirklich hell`);
  k.setze(x, y, { ebene: 1 });
  const gleichHoch = g.feldDaten(k, x, y);
  behaupte(!gleichHoch.rollen.some((v) => v === 3 || v === 4),
    `${y}/${r.name}: gleiche Höhe hat keine erfundene Kontur`);
  gleich([...g.feldDaten(k, x + r.dx, y + r.dy).rollen].filter((v) => v === 6).length, 0,
    `${y}/${r.name}: gleiche Höhe hat auch keine erfundene Flanke`);
}

abschnitt("Die Flanke hängt an der Naht, wird nach unten dunkler und ist Erde");

/* ── Warum spaltenweise und nicht als Mittelwert (W10, Vorgang #35) ──
   Ein Mittelwert über alle Flankenpunkte wäre auch dann noch schön,
   wenn der Streifen zu tief im Feld säße, Löcher hätte oder unten
   heller wäre als oben. Geprüft wird deshalb je Bildspalte: Wo Flanke
   steht, beginnt sie am **obersten gemalten Punkt** der Spalte, läuft
   ohne Lücke weiter, bleibt höchstens vier Weltpunkte hoch und wird
   nach unten dunkler.

   Die Toleranz 1,1 ist kein Spielraum für echte Umkehrungen, sondern
   die Rasterung: Die Körnung schwankt um bis zu 0,36, und jeder Kanal
   rastet auf Vielfache von 5 — ein einziger Rotschritt sind 5 · 0,2126
   = 1,06 Helligkeit. Beides zusammen gemessen am 12.09.2026 als
   größter Aufwärtssprung 1,06. Ein echter Rücksprung wäre ein
   Farbschritt der Flanke, und die liegen 7,4 auseinander. */
const warm = (p) => (p & 255) - ((p >>> 16) & 255);

function flankenSpalten(bild) {
  const spalten = [];
  for (let px = 0; px < bild.bildBreite; px++) {
    const reihe = [];
    let erstes = -1;
    for (let py = 0; py < bild.bildHoehe; py++) {
      const i = py * bild.bildBreite + px;
      if (bild.pixel[i] && erstes < 0) erstes = py;
      if (bild.rollen[i] === 6) reihe.push(py);
    }
    if (reihe.length) spalten.push({ px, reihe, erstes });
  }
  return spalten;
}

for (const y of [6, 7]) for (const art of ["Etage", "Fels"]) {
  const k = neu(), g = renderer(), x = 7;
  const hoch = richtungen(y).filter((r) => r.dy < 0);
  for (const r of hoch) {
    k.setze(x + r.dx, y + r.dy,
      art === "Fels" ? { hindernis: HINDERNIS.wand } : { ebene: 2 });
  }
  const bild = g.feldDaten(k, x, y), spalten = flankenSpalten(bild);
  const maxHoch = 4 * bild.fein;
  behaupte(spalten.length >= 30,
    `${y}/${art}: beide oberen Kanten tragen Flanke (${spalten.length} Spalten)`);
  let lueckig = 0, schwebend = 0, zuHoch = 0, aufwaerts = 0, falleZuKlein = 0;
  let dunkelsteFlanke = 255, kaeltesteFlanke = 255;
  for (const s of spalten) {
    if (s.reihe[s.reihe.length - 1] - s.reihe[0] + 1 !== s.reihe.length) lueckig++;
    if (s.reihe[0] !== s.erstes) schwebend++;
    if (s.reihe.length > maxHoch) zuHoch++;
    let vorher = 256;
    for (const py of s.reihe) {
      const p = bild.pixel[py * bild.bildBreite + s.px];
      if (hell(p) > vorher + 1.1) aufwaerts++;
      vorher = hell(p);
      dunkelsteFlanke = Math.min(dunkelsteFlanke, hell(p));
      kaeltesteFlanke = Math.min(kaeltesteFlanke, warm(p));
    }
    if (s.reihe.length < maxHoch) continue;
    const obenH = hell(bild.pixel[s.reihe[0] * bild.bildBreite + s.px]);
    if (obenH - vorher < 15) falleZuKlein++;
  }
  gleich(lueckig, 0, `${y}/${art}: keine Flankenspalte hat ein Loch`);
  gleich(schwebend, 0, `${y}/${art}: jede Flanke beginnt an der Naht, keine schwebt`);
  gleich(zuHoch, 0, `${y}/${art}: keine Flanke höher als vier Weltpunkte`);
  gleich(aufwaerts, 0, `${y}/${art}: keine Flanke wird nach unten heller`);
  gleich(falleZuKlein, 0,
    `${y}/${art}: volle Flanken fallen von oben nach unten um mindestens 15`);
  behaupte(dunkelsteFlanke > 20,
    `${y}/${art}: die Flanke bleibt Wand und wird nicht so dunkel wie ein Abgrund`
    + ` (dunkelster Punkt ${dunkelsteFlanke.toFixed(2)}, Abgrund 8,94)`);
  let waermsterBoden = -255;
  for (let i = 0; i < bild.pixel.length; i++) {
    if (bild.rollen[i] === 0 && bild.pixel[i]) {
      waermsterBoden = Math.max(waermsterBoden, warm(bild.pixel[i]));
    }
  }
  behaupte(kaeltesteFlanke > waermsterBoden,
    `${y}/${art}: die kälteste Flanke ist wärmer als der wärmste Granit daneben`
    + ` (${kaeltesteFlanke} gegen ${waermsterBoden})`);
}

/* Ein Loch ist selbst die Tiefe, und eine Treppe geht hinauf: Beide
   bekommen keine Südseite, auch wenn oben etwas Höheres steht. */
for (const y of [6, 7]) for (const r of richtungen(y).filter((d) => d.dy < 0)) {
  const loch = neu(), g = renderer(), x = 7;
  loch.setze(x + r.dx, y + r.dy, { ebene: 2 });
  loch.setze(x, y, { hindernis: HINDERNIS.abgrund });
  gleich(flankenSpalten(g.feldDaten(loch, x, y)).length, 0,
    `${y}/${r.name}: ein Loch unter der Kante trägt keine Flanke`);
  const stufe = neu();
  setzeRampe(stufe, x, y, r);
  gleich(flankenSpalten(g.feldDaten(stufe, x, y)).length, 0,
    `${y}/${r.name}: eine Treppe unter der Kante trägt keine Flanke`);
}

abschnitt("Treppen: durchgehende Pixel bis an sechs Feldränder");
for (const y of [6, 7]) for (const r of richtungen(y)) {
  const k = neu(), g = renderer(), x = 7;
  setzeRampe(k, x, y, r);
  const bild = g.feldDaten(k, x, y);
  const gemalt = farben(bild);
  gleich([...bild.rollen].filter((v) => v === 5).length, gemalt.length,
    `${y}/${r.name}: kein innerer Treppenrahmen oder Randabstand`);
  behaupte(gemalt.some((p) => hell(p) > 95), `${y}/${r.name}: helle Trittvorderkanten`);
  behaupte(gemalt.some((p) => hell(p) < 35), `${y}/${r.name}: lesbare dunkle Setzstufen`);
  const ziel = g.feldDaten(k, x + r.dx, y + r.dy);
  const a = feldMitte(x, y), b = feldMitte(x + r.dx, y + r.dy);
  let offen = 0;
  for (let py = 0; py < ziel.bildHoehe; py++) for (let px = 0; px < ziel.bildBreite; px++) {
    const wx = ziel.x0 + (px + 0.5) / ziel.fein, wy = ziel.y0 + (py + 0.5) / ziel.fein;
    if (Math.hypot(wx - (a.x + b.x) / 2, wy - (a.y + b.y) / 2) > 2) continue;
    if (!ziel.pixel[py * ziel.bildBreite + px]) continue;
    const rolle = ziel.rollen[py * ziel.bildBreite + px];
    behaupte(rolle !== 3 && rolle !== 4, `${y}/${r.name}: oberer Anschluss ohne Querbarriere`);
    offen++;
  }
  behaupte(offen >= 2, `${y}/${r.name}: Anschluss wurde an echten Zielpixeln geprüft`);
}

abschnitt("Breite und lange Treppen haben keine innere Abschlusskante");
{
  const k = neu(), g = renderer();
  for (let y = 5; y <= 9; y++) for (let x = 6; x <= 8; x++) {
    setzeRampe(k, x, y, richtungen(y)[0], x - 6);
  }
  /* Nur echte Anschlüsse und gleich hohe Parallelfelder müssen offen
     sein. Ein seitlicher Ebenensprung bleibt auch innerhalb einer breiten
     Treppe regelwidrig und braucht weiterhin seine sichtbare Kliffkante. */
  const paare = [];
  for (let y = 6; y <= 8; y++) for (let x = 6; x <= 7; x++) {
    paare.push([x, y, x + 1, y]);
  }
  for (let y = 6; y <= 7; y++) for (let x = 6; x <= 8; x++) {
    paare.push([x, y, x, y + 1]);
  }
  let proben = 0;
  for (const [x, y, nx, ny] of paare) {
    const a = feldMitte(x, y), b = feldMitte(nx, ny);
    for (const [fx, fy] of [[x, y], [nx, ny]]) {
      const bild = g.feldDaten(k, fx, fy);
      for (let py = 0; py < bild.bildHoehe; py++) for (let px = 0; px < bild.bildBreite; px++) {
        const wx = bild.x0 + (px + 0.5) / bild.fein, wy = bild.y0 + (py + 0.5) / bild.fein;
        if (Math.hypot(wx - (a.x + b.x) / 2, wy - (a.y + b.y) / 2) > 2) continue;
        const wert = bild.pixel[py * bild.bildBreite + px];
        if (!wert) continue;
        gleich(bild.rollen[py * bild.bildBreite + px], 5,
          "Echte Treppennaht hat beidseitig keine Zwischenwange oder Querbarriere");
        if ((Math.floor(bild.x0 + px / bild.fein) % 4) === 0) continue;
        behaupte(hell(wert) > 48, "Helle Trittfläche reicht bis über die echte Feldnaht");
        proben++;
      }
    }
  }
  behaupte(proben > 80, "mehr als 80 echte Trittflächenpixel an zwölf Nähten geprüft");
}

abschnitt("Felsinnere ohne wiederkehrende Südflanken");
{
  const k = neu(), g = renderer();
  k.hindernis.fill(HINDERNIS.wand);
  const bild = g.feldDaten(k, 7, 7), zeilen = [];
  for (let y = 0; y < bild.bildHoehe; y++) {
    const row = [...bild.pixel.slice(y * bild.bildBreite, (y + 1) * bild.bildBreite)]
      .filter(Boolean);
    if (row.length >= 8) zeilen.push(row.reduce((s, p) => s + hell(p), 0) / row.length);
  }
  behaupte(Math.max(...zeilen) < 18, "massives Felsinneres bleibt dunkel");
  behaupte(Math.max(...zeilen) - Math.min(...zeilen) < 8,
    "keine wiederkehrende helle Oberseite und dunkle Südflanke im Felsinneren");
}

abschnitt("Ungültige Rampen öffnen weder Fels noch Abgrund");
for (const hindernis of [HINDERNIS.wand, HINDERNIS.abgrund]) {
  const k = neu(), g = renderer();
  setzeRampe(k, 7, 7, richtungen(7)[0]);
  k.setze(7, 7, { hindernis });
  const mit = [...g.feldDaten(k, 7, 7).pixel];
  k.setze(7, 7, { rampe: 0 });
  tiefGleich([...g.feldDaten(k, 7, 7).pixel], mit,
    `Restflag auf Hindernis ${hindernis} malt keine Treppe`);
}

abschnitt("Kein Treppenbild auf oder zu einem Bewegungsblocker");
for (const hindernis of BLOCKT_BEWEGUNG) for (const blockiertZiel of [false, true]) {
  const k = neu(), g = renderer();
  setzeRampe(k, 7, 7, richtungen(7)[0]);
  k.setze(blockiertZiel ? 8 : 7, 7, { hindernis });
  const mit = [...g.feldDaten(k, 7, 7).pixel];
  const zielMit = [...g.feldDaten(k, 8, 7).pixel];
  k.setze(7, 7, { rampe: 0 });
  behaupte(g.feldDaten(k, 7, 7).pixel.every((p, n) => p === mit[n]),
    `${hindernis}/${blockiertZiel}: blockierte Treppe sieht wie Feld ohne Rampenflag aus`);
  behaupte(g.feldDaten(k, 8, 7).pixel.every((p, n) => p === zielMit[n]),
    `${hindernis}/${blockiertZiel}: blockierte Treppe öffnet keine Zielkontur`);
}

abschnitt("Unverbundene Treppen behalten echte seitliche Höhenbrüche");
for (const y of [6, 7]) for (const gleicheRichtung of [false, true]) {
  for (const unterschied of [1, 2]) {
  const k = neu(), g = renderer(), x = 7;
  const seite = richtungen(y)[2];
  const nx = x + seite.dx, ny = y + seite.dy;
  setzeRampe(k, x, y, richtungen(y)[0], 0);
  setzeRampe(k, nx, ny, richtungen(ny)[gleicheRichtung ? 0 : 3], unterschied);
  const a = feldMitte(x, y), b = feldMitte(nx, ny);
  let tief = 0, hoch = 0;
  for (const [fx, fy, oben] of [[x, y, false], [nx, ny, true]]) {
    const bild = g.feldDaten(k, fx, fy);
    for (let py = 0; py < bild.bildHoehe; py++) for (let px = 0; px < bild.bildBreite; px++) {
      const wx = bild.x0 + (px + 0.5) / bild.fein, wy = bild.y0 + (py + 0.5) / bild.fein;
      if (Math.hypot(wx - (a.x + b.x) / 2, wy - (a.y + b.y) / 2) > 2) continue;
      const rolle = bild.rollen[py * bild.bildBreite + px];
      if (oben && rolle === 3) hoch++;
      if (!oben && rolle === 4) tief++;
    }
  }
  behaupte(hoch >= 2 && tief >= 2,
    `${y}/${gleicheRichtung}/${unterschied}: Seitenkliff bleibt an beiden Treppen lesbar`);
  }
}

abschnitt("Schräge Trittphasen bleiben unabhängig von der Zeilenlage");
{
  const achsen = [[1, 0], [0.5, Math.sqrt(3) / 2], [-0.5, Math.sqrt(3) / 2],
    [-1, 0], [-0.5, -Math.sqrt(3) / 2], [0.5, -Math.sqrt(3) / 2]];
  for (const verschiebung of [0, 10000000]) for (const richtung of [1, 2, 4, 5]) {
    const basis = neu(), y = 7 + verschiebung, x = 7;
    setzeRampe(basis, x, 7, richtungen(7)[richtung]);
    const k = { ...basis };
    for (const name of ["index", "drin", "ebeneBei", "bodenBei", "hindernisBei",
      "fluessigBei", "rampeBei", "blocktBewegung"]) {
      k[name] = (xx, yy) => basis[name](xx, yy - verschiebung);
    }
    const bild = renderer().feldDaten(k, x, y);
    let falsch = 0, anzahl = 0;
    for (let py = 0; py < bild.bildHoehe; py++) for (let px = 0; px < bild.bildBreite; px++) {
      const wert = bild.pixel[py * bild.bildBreite + px];
      if (!wert) continue;
      const proj = (bild.x0 + (px + 0.5) / bild.fein) * achsen[richtung][0]
        + (bild.y0 + (py + 0.5) / bild.fein) * achsen[richtung][1];
      const phase = ((proj % 4) + 4) % 4;
      if ((phase < 0.8) !== (hell(wert) < 40)) falsch++;
      anzahl++;
    }
    behaupte(anzahl > 180, "Schrägphase wurde über ein ganzes echtes Hexfeld geprüft");
    gleich(falsch, 0, `${verschiebung}/${richtung}: jede dunkle Stufe folgt derselben Weltachse`);
  }
}

abschnitt("Hoher massiver Fels bekommt keine inneren Hexrahmen");
{
  const k = neu(), g = renderer();
  k.hindernis.fill(HINDERNIS.wand); k.ebene.fill(3);
  for (let y = 6; y <= 8; y++) for (let x = 6; x <= 8; x++) {
    const bild = g.feldDaten(k, x, y);
    behaupte(farben(bild).every((p) => hell(p) < 25),
      `(${x},${y}): hoher Innenfels hat auch an den Feldkanten keine helle Palette-Wange`);
    gleich([...bild.rollen].filter((r) => r === 1).length, farben(bild).length,
      `(${x},${y}): zusammenhängender Innenfels zeichnet keine Feldkontur`);
  }
}

abschnitt("Cache, direkter Kartenumbau und Nebelfarben");
{
  const k = neu(), aufrufe = [];
  const g = macheGranitFeld({ ton, kasten(...a) { aufrufe.push(a); } });
  const vorher = k.summe(), eins = g.feldDaten(k, 7, 7);
  gleich(g.feldDaten(k, 7, 7), eins, "unveränderte Karte verwendet denselben Pixelpuffer");
  k.hindernis[k.index(8, 7)] = HINDERNIS.wand;
  const zwei = g.feldDaten(k, 7, 7);
  behaupte(zwei !== eins, "direktes Schreiben invalidiert benachbarte Geländeoberfläche");
  behaupte(JSON.stringify([...zwei.pixel]) !== JSON.stringify([...eins.pixel]),
    "neue Wand verändert sichtbar die Umgebungsverdeckung");
  k.hindernis[k.index(8, 7)] = 0;
  k.fluessig[k.index(7, 7)] = FLUESSIG.wasser;
  const wasser = g.feldDaten(k, 7, 7);
  behaupte(farben(wasser).some((p) => (p & 255) < ((p >>> 16) & 255)),
    "Wasser bekommt einen kühlen durchgehenden Farbgrund");
  k.fluessig[k.index(7, 7)] = 0;
  const ecke = { x: 0, y: 0 };
  g.zeichneFeld(k, 7, 7, k.index(7, 7), ecke, false);
  const hellBild = aufrufe.splice(0);
  g.zeichneFeld(k, 7, 7, k.index(7, 7), ecke, true);
  tiefGleich(aufrufe.map((a) => a.slice(0, 6)), hellBild.map((a) => a.slice(0, 6)),
    "Nebel verändert keine Pixelgeometrie");
  behaupte(aufrufe.every((a, n) => a[6] === ton(hellBild[n][6], true)),
    "alle Gelände-, Treppen- und Materialfarben werden gedämpft");
  gleich(k.summe(), vorher, "Zeichnen verändert keine Kartenregelwerte");
  g.leereSpeicher();
  behaupte(g.feldDaten(k, 7, 7) !== eins, "Speicher kann ausdrücklich vollständig geleert werden");
  const stand = g.statistik();
  console.log(`      · ${stand.neuGebaut} Neubauten; ${stand.treffer} Cachetreffer`);
}

abschnitt("Die gesamte Standardkarte bleibt zwischen zwei Bildern im Cache");
{
  const k = macheKarte(56, 40), g = renderer();
  for (let bild = 0; bild < 2; bild++) {
    for (let y = 0; y < k.hoehe; y++) for (let x = 0; x < k.breite; x++) {
      g.feldDaten(k, x, y);
    }
    gleich(g.statistik().neuGebaut, 2240,
      `Standardkarte Bild ${bild + 1}: sämtliche 2240 Pixelpuffer werden nur einmal gebaut`);
  }
  const gross = macheKarte(80, 64), begrenzt = renderer();
  const erst = begrenzt.feldDaten(gross, 0, 0);
  for (let y = 0; y < gross.hoehe; y++) for (let x = 0; x < gross.breite; x++) {
    begrenzt.feldDaten(gross, x, y);
  }
  behaupte(begrenzt.feldDaten(gross, 0, 0) !== erst,
    "Übergroße Karten behalten weiterhin keinen unbegrenzten Vorrat alter Pixelpuffer");
}

abschnitt("Browserpfad: ein wiederverwendetes Pixelbild statt Einzelrechtecken");

/* ── Warum dieser Block ZWEIMAL läuft ───────────────────────────────
   Seit dem Bildmaßstab `FEIN` gibt es zwei Blattwege, und welcher
   genommen wird, entscheidet die Zoomstufe (`runtime/granit-feld.js`,
   `const grob = gross % feld.fein !== 0`):

   · Stufe 2 ist ein Vielfaches von `FEIN` — das **feine** Blatt kommt
     aufs Bild, ein Abtastpunkt je Bildschirmpunkt.
   · Stufe 3 ist keines — dann zeichnet der **grobe** Weg jeden
     FEIN-ten Abtastpunkt, damit kein halber Bildpunkt entsteht
     (Fehlerbuch D1).

   Bis zum 12.09.2026 lief dieser Block nur auf einer Stufe, und der
   grobe Weg hatte damit **null** Behauptungen — obwohl `kamera.js` bei
   640 × 360 genau Stufe 1 wählt und `zoome` in Einzelschritten auch auf
   3 stellt. Die Gegenprobe dazu ist gemessen: Verfälscht man
   `schritt = grob ? feld.fein : 1` zu `schritt = 1`, blieb die ganze
   Kette grün (Fehlerbuch G1). Mit dem zweiten Durchlauf unten schlägt
   genau diese Verfälschung an. */
function pruefeBrowserpfad(gross) {
  const grob = gross % FEIN !== 0;
  const wort = grob ? `grob (Stufe ${gross})` : `fein (Stufe ${gross})`;
  const k = neu(), bilder = [], zeichnungen = [], masse = [];
  let neueBlaetter = 0, ersatz = 0;
  const ctx = {
    imageSmoothingEnabled: true,
    canvas: { ownerDocument: {
      createElement() {
        neueBlaetter++;
        const blatt = { getContext() {
          return {
            createImageData(b, h) {
              masse.push([b, h]);
              return { data: new Uint8ClampedArray(b * h * 4) };
            },
            putImageData(bild) { bilder.push(bild); }
          };
        } };
        return blatt;
      }
    } },
    drawImage(...a) { zeichnungen.push(a); }
  };
  const g = macheGranitFeld({ ton, ctx, kamera: { vergroesserung: gross },
    kasten() { ersatz++; } });
  g.zeichneFeld(k, 7, 7, k.index(7, 7), { x: 5, y: 9 }, false);
  g.zeichneFeld(k, 7, 7, k.index(7, 7), { x: 11, y: 15 }, false);
  gleich(neueBlaetter, 1,
    `${wort}: zweites Bild und Kamerabewegung erzeugen keine neue Zeichenfläche`);
  gleich(zeichnungen.length, 2, `${wort}: je Weltbild reicht ein drawImage für dieses Hexfeld`);
  gleich(ersatz, 0, `${wort}: der Browserpfad malt keine Material-Einzelrechtecke`);
  gleich(ctx.imageSmoothingEnabled, false,
    `${wort}: vergrößerte Geländeoberfläche bleibt ungeglättet`);

  const feld = g.feldDaten(k, 7, 7);
  /* Der grobe Weg legt ein Blatt in **Welt**punkten an, der feine eines
     in Abtastpunkten. Diese beiden Maße auseinanderzuhalten ist der
     ganze Zweck des zweiten Durchlaufs. */
  const schritt = grob ? feld.fein : 1;
  const blattBreite = feld.bildBreite / schritt, blattHoehe = feld.bildHoehe / schritt;
  tiefGleich(masse[0], [blattBreite, blattHoehe],
    `${wort}: das Blatt misst ${blattBreite} × ${blattHoehe} Punkte`);

  let alpha = 0, gesetzt = 0;
  for (let py = 0; py < blattHoehe; py++) {
    for (let px = 0; px < blattBreite; px++) {
      const quelle = feld.pixel[(py * schritt) * feld.bildBreite + px * schritt];
      const i = py * blattBreite + px;
      gleich(bilder[0].data[i * 4 + 3], quelle ? 255 : 0,
        `${wort}: Browserbild hat dieselbe transparente Hexmaske wie der Pixelpuffer`);
      if (bilder[0].data[i * 4 + 3]) alpha++;
      if (quelle) gesetzt++;
    }
  }
  gleich(alpha, gesetzt, `${wort}: kein Nachbarpixel wird im Browser übermalt`);
  behaupte(alpha > blattBreite * blattHoehe / 3,
    `${wort}: ${alpha} von ${blattBreite * blattHoehe} Punkten tragen Farbe`);
  if (!grob) {
    gleich(alpha, farben(feld).length, `${wort}: das feine Blatt zeigt jeden Abtastpunkt`);
  }
  tiefGleich(zeichnungen[0].slice(1), [5, 9, feld.breite * gross, feld.hoehe * gross],
    `${wort}: Ganzzahlvergrößerung verwendet dieselbe Weltpixel-Boundingbox`);
}

pruefeBrowserpfad(2);
pruefeBrowserpfad(3);

ende("Granit-Pixelfeld");
