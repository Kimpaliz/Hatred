/* [Aufgabe: Prüfwesen] Rechnet nach, was die Kopfnotiz von
   `runtime/palette.js` behauptet — Stufe für Stufe, in Rec. 709.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Die Palette ist der einzige Ort im Spiel, an dem eine Zahl behauptet
   wird, die man **sieht** statt sie zu rechnen: „Zwei benachbarte
   Ebenenstufen liegen mindestens 14 von 255 auseinander." Genau solche
   Zahlen veralten still. Jemand verschiebt einen Steinton um zwei
   Punkte, weil er ihm zu blau war, und drei Wochen später fällt auf,
   dass man Podest und Boden im verkleinerten Bild nicht mehr trennen
   kann — aber niemand weiß mehr, welche Änderung es war.

   Geprüft wird deshalb der Fall, der ohne diese Arbeit falsch wäre:

   · Der Abstand wird **durch `bodenTon()` selbst** gemessen, nicht
     nachgebaut. Eine Prüfung, die die Formel abschreibt, prüft nur
     ihre eigene Abschrift; sie bliebe grün, wenn `bodenTon` morgen
     die Ebene ignorierte.
   · Gemessen wird in Rec. 709, nicht als Mittel aus r, g und b. Grün
     wirkt auf das Auge fast zehnmal heller als Blau — eine Rampe, die
     im Mittelwert weit auseinanderliegt, kann für das Auge ein
     einziger Klumpen sein. Genau daran scheitern Paletten „auf dem
     Papier".
   · Geprüft werden **beide** Töne jeder Bodenart. Wer nur `grund`
     misst, übersieht, dass `zweit` das Muster trägt: Verschmilzt das,
     verschwindet die Struktur des Bodens, nicht die Höhe.
   · Die Rampe muss **steigen**, nicht nur auseinanderliegen. Ein
     Abstand von 14 ist auch dann erfüllt, wenn Ebene 3 dunkler wäre
     als Ebene 2 — und dann läse sich das Bild verkehrt herum.
   · Die Länge der Farbtabellen wird gegen `spiel/gitter.mjs` geprüft,
     nicht gegen eine Zahl. Wer dort eine neunte Bodenart anhängt,
     bekommt sonst eine Bodenart ohne Farbe — und die zeichnet still
     als Stein.
   · Die Lichtweiten stehen zweimal: als Bild in `LICHT_ARTEN` und als
     Regel in `spiel/licht.mjs`. Zwei Listen derselben Zahlen laufen
     auseinander, sobald eine gepflegt wird. Also werden sie verglichen.

   ── Was hier bewusst nicht geprüft wird ────────────────────────────

   `riss` ist der dritte Ton jeder Bodenart, geht aber **nicht** durch
   die Ebenenrampe: `bodenTon()` liefert nur `grund` und `zweit`. Dass
   das so ist, steht unten als eigene Behauptung — erst damit ist die
   Auslassung bewiesen und nicht bloß behauptet. Für `riss` gälte die
   Obergrenze von 250 je Kanal deshalb ins Leere; `asche` liefe mit
   ihrem Glutriss auf Ebene 3 rechnerisch in die Sättigung, gezeichnet
   wird sie dort aber nie.

   Die zweite Schwelle der Kopfnotiz — 24 von 255 zwischen zwei Stufen
   **einer Figur** — gehört zu den Sprite-Rampen in
   `runtime/sprite-daten.js`. Diese Datei gibt es noch nicht, also gibt
   es nichts zu verriegeln. Gemessen und gedruckt werden die Rampen
   trotzdem, damit die Zahl beim Bau der Sprites dasteht statt geraten
   zu werden.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/palette.js` (der Prüfling, nur gelesen), `spiel/gitter.mjs`
   (die Schlüssel, gegen die gezählt wird), `spiel/licht.mjs` (die
   Lichtweiten der Regelseite), `werkzeuge/helfer.mjs` und
   `werkzeuge/pruefe-alles.mjs`, das diese Datei als Prozess startet. */

import { abschnitt, behaupte, gleich, nahe, ende } from "./helfer.mjs";
import { BODEN, FLUESSIG, EBENEN } from "../spiel/gitter.mjs";
import { LICHT_WEITEN } from "../spiel/licht.mjs";
import {
  FARBEN, EBENEN_TON, STUFEN_SCHATTEN, BODEN_FARBEN, FLUESSIG_FARBEN,
  LICHT_ARTEN, GRUNDHELLE, ERINNERT_HELLE,
  nachRGB, nachHex, helligkeit, mische, abdunkeln, bodenTon
} from "../runtime/palette.js";

/* Die Schwelle aus der Kopfnotiz der Palette. Steht hier als Zahl,
   damit sie an genau einer Stelle steht — und nicht in jeder
   Behauptung noch einmal. */
const MINDEST_ABSTAND = 14;
const HOECHSTER_KANAL = 250;
const SPRITE_ABSTAND = 24;

const HEX_FORM = /^#[0-9a-f]{6}$/;
const kanaele = (hex) => Object.values(nachRGB(hex));
const namenVon = (schluesselWerk) => Object.keys(schluesselWerk);

/* ── 1. Die Form jeder Farbe ────────────────────────────────────────*/
{
  abschnitt("Form der Farben");

  const alle = [];
  for (const [name, wert] of Object.entries(FARBEN)) alle.push([`FARBEN.${name}`, wert]);
  BODEN_FARBEN.forEach((satz, i) => {
    for (const ton of ["grund", "zweit", "riss"]) {
      alle.push([`BODEN_FARBEN[${i}].${ton}`, satz[ton]]);
    }
  });
  FLUESSIG_FARBEN.forEach((satz, i) => {
    if (satz === null) return;
    for (const ton of ["tief", "flach", "glanz"]) {
      alle.push([`FLUESSIG_FARBEN[${i}].${ton}`, satz[ton]]);
    }
    if (satz.licht !== null) alle.push([`FLUESSIG_FARBEN[${i}].licht`, satz.licht]);
  });
  for (const [name, art] of Object.entries(LICHT_ARTEN)) {
    alle.push([`LICHT_ARTEN.${name}`, art.farbe]);
  }

  for (const [name, wert] of alle) {
    behaupte(typeof wert === "string" && HEX_FORM.test(wert),
      `${name} ist ein gültiges #rrggbb (ist ${JSON.stringify(wert)})`);
  }

  /* Hin und zurück: Wer `nachHex` schief baut, bemerkt es sonst erst
     im Bild — und dort sieht man zwei Punkte Unterschied nicht. */
  for (const [name, wert] of alle) {
    if (!HEX_FORM.test(wert)) continue;
    gleich(nachHex(nachRGB(wert)), wert, `${name} übersteht nachRGB → nachHex`);
  }
  console.log(`      · ${alle.length} Farben geprüft`);
}

/* ── 2. Die Rechenwerkzeuge ─────────────────────────────────────────
   Zuerst das Maß selbst. Eine falsche `helligkeit()` machte jede
   Abstandsprüfung darunter wertlos — und zwar unauffällig. */
{
  abschnitt("Rechenwerkzeuge");

  gleich(helligkeit("#000000"), 0, "Schwarz hat Helligkeit 0");
  /* Nicht `gleich`: Die drei Rec.-709-Faktoren summieren sich in
     Gleitkomma auf 254,99999999999997, nicht auf 255. */
  nahe(helligkeit("#ffffff"), 255, 1e-9, "Weiß hat Helligkeit 255");
  nahe(helligkeit("#00ff00"), 0.7152 * 255, 0.001, "Rec. 709: Grün trägt 0,7152");
  nahe(helligkeit("#ff0000"), 0.2126 * 255, 0.001, "Rec. 709: Rot trägt 0,2126");
  nahe(helligkeit("#0000ff"), 0.0722 * 255, 0.001, "Rec. 709: Blau trägt 0,0722");
  behaupte(helligkeit("#00ff00") > helligkeit("#ff0000"),
    "Grün wiegt schwerer als Rot — sonst wäre es ein Mittelwert");
  behaupte(helligkeit("#ff0000") > helligkeit("#0000ff"), "Rot wiegt schwerer als Blau");

  gleich(mische("#000000", "#ffffff", 0), "#000000", "mische(…, 0) gibt die erste Farbe");
  gleich(mische("#000000", "#ffffff", 1), "#ffffff", "mische(…, 1) gibt die zweite Farbe");
  gleich(mische("#000000", "#ffffff", 0.5), "#808080", "mische(…, 0.5) liegt in der Mitte");

  gleich(abdunkeln("#8040c0", 1), "#8040c0", "abdunkeln(…, 1) ändert nichts");
  gleich(abdunkeln("#8040c0", 0), "#000000", "abdunkeln(…, 0) gibt Schwarz");
  gleich(abdunkeln("#804020", 2), "#ff8040", "abdunkeln verdoppelt kanalweise");
  gleich(abdunkeln("#c00000", 2), "#ff0000", "abdunkeln läuft nicht über, es begrenzt");

  /* Der Fall, den ein naiver Bau falsch macht: 255 × 2 als Byte
     gerechnet wäre 254 — und Weiß würde beinahe schwarz. */
  gleich(abdunkeln("#ffffff", 2), "#ffffff", "Weiß bleibt Weiß, es kippt nicht");
}

/* ── 3. Die Tabellen sind so lang wie die Schlüssel ─────────────────*/
{
  abschnitt("Länge der Tabellen");

  const bodenNamen = namenVon(BODEN);
  const fluessigNamen = namenVon(FLUESSIG);

  gleich(BODEN_FARBEN.length, bodenNamen.length,
    "BODEN_FARBEN hat genauso viele Einträge wie BODEN Schlüssel");
  gleich(FLUESSIG_FARBEN.length, fluessigNamen.length,
    "FLUESSIG_FARBEN hat genauso viele Einträge wie FLUESSIG");

  /* Nicht nur die Anzahl: Jede Zahl aus `gitter.mjs` muss auch der
     Platz in der Tabelle sein. Zwei vertauschte Zeilen wären sonst
     unsichtbar. */
  for (const name of bodenNamen) {
    const satz = BODEN_FARBEN[BODEN[name]];
    behaupte(satz !== undefined && satz !== null, `Bodenart "${name}" hat einen Farbsatz`);
    if (satz) {
      for (const ton of ["grund", "zweit", "riss"]) {
        behaupte(typeof satz[ton] === "string", `Bodenart "${name}" hat den Ton "${ton}"`);
      }
    }
  }
  gleich(FLUESSIG_FARBEN[FLUESSIG.keine], null, "„keine Flüssigkeit\" hat keine Farbe");
  for (const name of fluessigNamen) {
    if (name === "keine") continue;
    const satz = FLUESSIG_FARBEN[FLUESSIG[name]];
    behaupte(satz !== undefined && satz !== null, `Flüssigkeit "${name}" hat einen Farbsatz`);
    if (!satz) continue;
    for (const ton of ["tief", "flach", "glanz"]) {
      behaupte(typeof satz[ton] === "string", `Flüssigkeit "${name}" hat den Ton "${ton}"`);
    }
    /* Wer leuchtet, muss auch als Lichtart bekannt sein — sonst
       zeichnet das Bild einen Schein, den die Regel nicht kennt. */
    if (satz.licht !== null) {
      behaupte(Object.prototype.hasOwnProperty.call(LICHT_ARTEN, name),
        `leuchtende Flüssigkeit "${name}" hat eine Lichtart gleichen Namens`);
    }
  }
}

/* ── 4. Die Ebenenrampe — die Zahl aus der Kopfnotiz ────────────────*/
let engste = { was: "—", abstand: Infinity };
let hellste = { was: "—", kanal: -1 };
{
  abschnitt("Ebenenrampe");

  gleich(EBENEN_TON.length, EBENEN, "es gibt einen Ton je Ebene");
  for (let e = 1; e < EBENEN_TON.length; e++) {
    behaupte(EBENEN_TON[e] > EBENEN_TON[e - 1],
      `EBENEN_TON steigt von Ebene ${e - 1} nach ${e}`);
  }

  /* Der Beweis, dass `riss` außen vor bleibt: `bodenTon` kennt genau
     zwei Töne, und beide gehen durch dieselbe Rampe. */
  for (const name of namenVon(BODEN)) {
    const art = BODEN[name];
    /* Fehlt der Farbsatz ganz, hat Abschnitt 3 das schon gemeldet.
       Hier nur überspringen — ein Absturz an dieser Stelle verschluckte
       den Bericht und damit gerade die Meldung, die man braucht. */
    if (!BODEN_FARBEN[art]) continue;
    for (let e = 0; e < EBENEN; e++) {
      gleich(bodenTon(art, e, false), abdunkeln(BODEN_FARBEN[art].grund, EBENEN_TON[e]),
        `bodenTon("${name}", ${e}) ist der Grundton durch die Rampe`);
      gleich(bodenTon(art, e, true), abdunkeln(BODEN_FARBEN[art].zweit, EBENEN_TON[e]),
        `bodenTon("${name}", ${e}, zweit) ist der Zweitton durch die Rampe`);
    }
  }

  for (const name of namenVon(BODEN)) {
    const art = BODEN[name];
    if (!BODEN_FARBEN[art]) continue;
    for (const [tonName, zweit] of [["grund", false], ["zweit", true]]) {
      for (let e = 0; e < EBENEN; e++) {
        const hex = bodenTon(art, e, zweit);
        const spitze = Math.max(...kanaele(hex));
        if (spitze > hellste.kanal) {
          hellste = { was: `${name}/${tonName} auf Ebene ${e}`, kanal: spitze };
        }
        behaupte(spitze <= HOECHSTER_KANAL,
          `${name}/${tonName} auf Ebene ${e} bleibt unter ${HOECHSTER_KANAL}` +
          ` je Kanal (ist ${spitze})`);

        if (e === 0) continue;
        const unten = helligkeit(bodenTon(art, e - 1, zweit));
        const oben = helligkeit(hex);
        const d = oben - unten;
        if (d < engste.abstand) engste = { was: `${name}/${tonName} ${e - 1}→${e}`, abstand: d };
        behaupte(d >= MINDEST_ABSTAND,
          `${name}/${tonName}: Ebene ${e - 1}→${e} liegen ${d.toFixed(2)} auseinander,` +
          ` gefordert ${MINDEST_ABSTAND}`);
        behaupte(oben > unten, `${name}/${tonName}: Ebene ${e} ist heller als ${e - 1}`);
      }
    }
  }
}

/* ── 5. Die übrigen Zahlen der Palette ──────────────────────────────*/
{
  abschnitt("Weitere Zahlen");

  behaupte(Number.isInteger(STUFEN_SCHATTEN) && STUFEN_SCHATTEN >= 1,
    `STUFEN_SCHATTEN ist eine ganze Zahl ab 1 (ist ${STUFEN_SCHATTEN})`);
  behaupte(GRUNDHELLE > 0, "GRUNDHELLE ist nicht 0 — ein schwarzes Feld nähme die Karte");
  behaupte(GRUNDHELLE < ERINNERT_HELLE, "erinnert ist heller als nie gesehen");
  behaupte(ERINNERT_HELLE < 1, "erinnert ist dunkler als beleuchtet");

  for (const [name, art] of Object.entries(LICHT_ARTEN)) {
    behaupte(art.weite > 0, `Lichtart "${name}" hat eine Weite über 0`);
    behaupte(art.flackern >= 0 && art.flackern <= 1,
      `Lichtart "${name}" flackert zwischen 0 und 1 (ist ${art.flackern})`);
  }

  /* Die eine Zahl, die in zwei Dateien steht. */
  const bild = namenVon(LICHT_ARTEN).sort();
  const regel = namenVon(LICHT_WEITEN).sort();
  gleich(bild.join(","), regel.join(","),
    "LICHT_ARTEN und LICHT_WEITEN kennen dieselben Lichtarten");
  for (const name of bild) {
    if (LICHT_WEITEN[name] === undefined) continue;
    gleich(LICHT_ARTEN[name].weite, LICHT_WEITEN[name],
      `Lichtart "${name}": Bild und Regel nennen dieselbe Weite`);
  }
}

/* ── 6. Gemessen, nicht behauptet ───────────────────────────────────*/
console.log(`      · engste Ebenenstufe ${engste.was}: ${engste.abstand.toFixed(2)} von 255` +
  ` (gefordert ${MINDEST_ABSTAND})`);
console.log(`      · hellster Bodenton ${hellste.was}: Kanalspitze ${hellste.kanal}` +
  ` (erlaubt ${HOECHSTER_KANAL})`);

/* Die Sprite-Rampen: gemessen und gedruckt, nicht verriegelt —
   `runtime/sprite-daten.js` gibt es noch nicht. */
{
  const familien = new Map();
  for (const [name, wert] of Object.entries(FARBEN)) {
    const teil = /^([A-Za-zÄÖÜäöüß]+?)([0-9])$/.exec(name);
    if (!teil) continue;
    if (!familien.has(teil[1])) familien.set(teil[1], []);
    familien.get(teil[1]).push({ stufe: Number(teil[2]), wert });
  }
  const knapp = [];
  for (const [name, stufen] of familien) {
    if (stufen.length < 2) continue;
    stufen.sort((a, b) => a.stufe - b.stufe);
    let kleinster = Infinity;
    for (let i = 1; i < stufen.length; i++) {
      kleinster = Math.min(kleinster, helligkeit(stufen[i].wert) - helligkeit(stufen[i - 1].wert));
    }
    if (kleinster < SPRITE_ABSTAND) knapp.push(`${name} ${kleinster.toFixed(1)}`);
  }
  console.log(`      · Farbfamilien mit mehreren Stufen: ${familien.size}, davon` +
    ` ${knapp.length} unter ${SPRITE_ABSTAND} — ${knapp.join(", ")}`);
  console.log("      · (Schwelle 24 gilt den Sprite-Rampen; runtime/sprite-daten.js fehlt noch)");
}

ende("Palette");
