/* [Aufgabe: Werkzeug] Druckt einen erzeugten Kerker als Bild in die Schale.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Eine Landschaftsprüfung sagt, ob eine Karte **richtig** ist. Ob sie
   **gut** ist, sagt sie nicht: Ein Kerker kann jede Prüfung bestehen
   und trotzdem aus vier Kämmerchen in einer Reihe bestehen. Das sieht
   man erst, wenn man ihn ansieht — und weil dieses Spiel keine
   Bilddateien kennt, ist das Bild Text.

   Drei Tafeln, weil eine Tafel drei Fragen gleichzeitig beantworten
   müsste und dann keine beantwortet:
   · **Kerker** — was steht wo (Wände, Fässer, Pfützen, Rampen).
   · **Ebenen** — nur die Höhen, damit man die Plateaus als Flächen
     sieht und die Rampen an ihren Kanten wiederfindet.
   · **Zahlen** — was die Karte an Messwerten hergibt: offener Anteil,
     Ebenenverteilung, Rampen, Seen, Fackeln.

   ── Aufruf ─────────────────────────────────────────────────────────

   `node werkzeuge/karte-zeigen.mjs [saat] [--breite N] [--hoehe N]`,
   dazu `--tiefe N` und `--spieler N`.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/landschaft.mjs` (baut die Karte, liefert `plateaus`,
   `beidseitigErreichbar`, `offen`), `spiel/gitter.mjs` (die
   Feldwerte). Ändert nichts, schreibt nichts — nur lesen und drucken. */

import {
  baueLandschaft, plateaus, beidseitigErreichbar, offen, gebiete
} from "../spiel/landschaft.mjs";
import {
  BODEN, FLUESSIG, HINDERNIS, RAMPE, EBENEN, alleFelder
} from "../spiel/gitter.mjs";

const ZEICHEN_HINDERNIS = {
  [HINDERNIS.wand]: "#",
  [HINDERNIS.saeule]: "I",
  [HINDERNIS.fass]: "o",
  [HINDERNIS.kiste]: "=",
  [HINDERNIS.spiess]: "*",
  [HINDERNIS.altar]: "A",
  [HINDERNIS.gitter]: "+",
  [HINDERNIS.fackelsockel]: "Y",
  [HINDERNIS.sarg]: "T",
  [HINDERNIS.truhe]: "$"
};

const ZEICHEN_FLUESSIG = {
  [FLUESSIG.wasser]: "w",
  [FLUESSIG.blut]: "b",
  [FLUESSIG.schleim]: "s",
  [FLUESSIG.lava]: "L",
  [FLUESSIG.oel]: "O"
};

const ZEICHEN_RAMPE = {
  [RAMPE.nord]: "↑",
  [RAMPE.ost]: "→",
  [RAMPE.sued]: "↓",
  [RAMPE.west]: "←"
};

/* Namen und Größen kommen aus `spiel/gitter.mjs`, nicht aus einer
   Liste hier. Bis zum 06.09.2026 standen `new Array(6)`, `new Array(8)`
   und eine Namensliste mit sechs Einträgen fest im Text — wer dort eine
   siebte Flüssigkeit einträgt, bekam von diesem Werkzeug lautlos
   „undefined:NaN" gedruckt, und die ganze Prüfkette blieb grün. */
const NAME_BODEN = Object.fromEntries(Object.entries(BODEN).map(([n, w]) => [w, n]));
const NAME_FLUESSIG = Object.fromEntries(Object.entries(FLUESSIG).map(([n, w]) => [w, n]));

function lesArgumente(argv) {
  const werte = { saat: 1, breite: 56, hoehe: 40, tiefe: 1, spieler: 2 };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const name = a.slice(2);
      if (!(name in werte)) throw new Error(`Unbekannte Schaltung --${name}`);
      werte[name] = Number.parseInt(argv[++i], 10);
      if (!Number.isInteger(werte[name])) throw new Error(`--${name} braucht eine ganze Zahl`);
    } else {
      rest.push(Number.parseInt(a, 10));
    }
  }
  if (rest.length && Number.isInteger(rest[0])) werte.saat = rest[0];
  return werte;
}

/* Die Reihenfolge ist die Aussage: Wo eine Rampe liegt, will man die
   Rampe sehen und nicht das Wasser darunter. Zuerst also, was man
   verpassen würde, zuletzt die Ebene als bloßer Untergrund. */
function zeichenKerker(karte, startNummern) {
  const zeilen = [];
  for (let y = 0; y < karte.hoehe; y++) {
    let zeile = "";
    for (let x = 0; x < karte.breite; x++) {
      const i = karte.index(x, y);
      const start = startNummern.get(i);
      /* Eingekreiste Ziffern, keine nackten: Eine „3" auf dem
         Startfeld sähe aus wie Ebene 3 — und genau die Verwechslung
         soll dieses Bild ausschließen. */
      if (start !== undefined) { zeile += "①②③④"[start - 1]; continue; }
      const aus = karte.ausgang;
      if (aus && aus.x === x && aus.y === y) { zeile += "X"; continue; }
      const h = karte.hindernis[i];
      if (h !== HINDERNIS.keins) { zeile += ZEICHEN_HINDERNIS[h] ?? "?"; continue; }
      const rampe = karte.rampe[i];
      if (rampe !== RAMPE.keine) { zeile += ZEICHEN_RAMPE[rampe] ?? "?"; continue; }
      const f = karte.fluessig[i];
      if (f !== FLUESSIG.keine) { zeile += ZEICHEN_FLUESSIG[f] ?? "?"; continue; }
      zeile += String(karte.ebene[i]);
    }
    zeilen.push(zeile);
  }
  return zeilen;
}

function zeichenEbenen(karte) {
  const zeilen = [];
  for (let y = 0; y < karte.hoehe; y++) {
    let zeile = "";
    for (let x = 0; x < karte.breite; x++) {
      const i = karte.index(x, y);
      zeile += offen(karte, i) ? String(karte.ebene[i]) : "#";
    }
    zeilen.push(zeile);
  }
  return zeilen;
}

function tafel(titel, zeilen) {
  const breite = zeilen.length ? zeilen[0].length : 0;
  /* Drei, nicht zwei: Ecke + Strich + Leerzeichen + Titel + Leerzeichen
     + Füllung + Ecke muss so breit werden wie `│` + Zeile + `│`. Mit
     der Zwei war jede Oberkante genau ein Zeichen zu breit — seit es
     dieses Werkzeug gibt, und niemandem aufgefallen. */
  console.log(`┌─ ${titel} ${"─".repeat(Math.max(0, breite - titel.length - 3))}┐`);
  for (const z of zeilen) console.log(`│${z}│`);
  console.log(`└${"─".repeat(breite)}┘`);
}

/* Wie viele Seen — nicht wie viele nasse Kacheln. Ein See ist ein
   zusammenhängendes Wasserstück; die Zahl sagt, ob das Wasser eine
   Pfütze ist oder ein Graben, der die Karte teilt. */
function seenZahl(karte) {
  const { groessen } = gebiete(karte,
    (i) => karte.fluessig[i] === FLUESSIG.wasser, () => true);
  return groessen.length;
}

function zahlen(karte) {
  let begehbar = 0, rampen = 0;
  const jeEbene = new Array(EBENEN).fill(0);
  const jeFluessig = new Array(Object.keys(FLUESSIG).length).fill(0);
  const jeBoden = new Array(Object.keys(BODEN).length).fill(0);
  for (const { x, y, i } of alleFelder(karte)) {
    if (karte.rampe[i] !== RAMPE.keine) rampen++;
    if (karte.blocktBewegung(x, y)) continue;
    begehbar++;
    jeEbene[karte.ebene[i]]++;
    jeFluessig[karte.fluessig[i]]++;
    jeBoden[karte.boden[i]]++;
  }
  const gut = beidseitigErreichbar(karte, karte.starts);
  let erreichbar = 0;
  for (let i = 0; i < gut.length; i++) erreichbar += gut[i];
  const plateauZahl = plateaus(karte).groessen.length;
  const fackeln = karte.lichter.filter((l) => l.art === "fackel").length;

  console.log(`  Saat ${karte.saat} · Tiefe ${karte.tiefe} · ${karte.breite}×${karte.hoehe}` +
    ` = ${karte.anzahl} Felder · Prüfsumme ${karte.summe()}`);
  console.log(`  Räume ${karte.raeume.length} · Plateaus ${plateauZahl} · Rampen ${rampen}` +
    ` · Seen ${seenZahl(karte)} · Fackeln ${fackeln} · Lichter ${karte.lichter.length}`);
  console.log(`  Offen ${begehbar} (${(100 * begehbar / karte.anzahl).toFixed(1)} %)` +
    ` · davon hin und zurück erreichbar ${erreichbar}` +
    ` (${(100 * erreichbar / Math.max(1, begehbar)).toFixed(1)} %)` +
    ` · eine Fackel je ${(begehbar / Math.max(1, fackeln)).toFixed(1)} offene Felder`);
  console.log(`  Ebenen: ${jeEbene.map((z, e) => `${e}:${z}`).join("  ")}`);
  const fName = (f) => (f === FLUESSIG.keine ? "–" : NAME_FLUESSIG[f]);
  console.log(`  Flüssig: ${jeFluessig.map((z, f) => `${fName(f)}:${z}`).join("  ")}`);
  console.log(`  Boden: ${jeBoden.map((z, b) => `${NAME_BODEN[b]}:${z}`).join("  ")}`);
  console.log("  Räume:");
  for (const r of karte.raeume) {
    console.log(`    ${r.art.padEnd(10)} ${String(r.breite).padStart(2)}×${String(r.hoehe)
      .padStart(2)} bei (${String(r.x).padStart(2)},${String(r.y).padStart(2)})` +
      `  Ebene ${r.ebene}`);
  }
}

function legende() {
  console.log("  Zeichen: 0-3 Ebene · # Wand · I Säule · o Fass · = Kiste · T Sarg · $ Truhe");
  console.log("           A Altar · + Gitter · Y Fackelsockel · * Spieß");
  console.log("           w Wasser · b Blut · s Schleim · L Lava · O Öl");
  console.log("           ↑→↓← Rampe (zeigt hinauf) · ①②③④ Startfeld · X Ausgang");
}

const werte = lesArgumente(process.argv.slice(2));
const karte = baueLandschaft({
  saat: werte.saat, breite: werte.breite, hoehe: werte.hoehe,
  tiefe: werte.tiefe, spielerZahl: werte.spieler
});
const startNummern = new Map();
karte.starts.forEach((s, nr) => startNummern.set(karte.index(s.x, s.y), nr + 1));

console.log("");
tafel(`Kerker · Saat ${karte.saat}`, zeichenKerker(karte, startNummern));
legende();
console.log("");
tafel("Nur Ebenen", zeichenEbenen(karte));
console.log("");
zahlen(karte);
console.log("");
