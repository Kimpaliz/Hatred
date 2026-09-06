/* [Aufgabe: Prüfwesen] Die Messung an den Feldern, die ein Finger trifft:
   Liegt jedes gemeldete Feld wirklich dort, wo gezeichnet wurde?

   ── Warum das eine eigene Prüfung ist ──────────────────────────────

   Der Auftrag lautet wörtlich: *„ja bitte hauptsächlich android
   compatible."* Damit ein Tipp etwas auslöst, muss die Anzeige sagen,
   **wo** etwas steht — und genau diese Auskunft ist der Ort, an dem ein
   Fehler unsichtbar bleibt: Auf dem Bildschirm sieht alles richtig aus,
   der Finger trifft daneben, und niemand kann sagen warum. Ein
   Bildschirmfoto beweist hier nichts.

   Deshalb wird nicht die Rechnung geprüft, sondern die **Mitschrift**:
   Für jedes Feld muss an seiner Mitte wirklich gemalt worden sein, seine
   Beschriftung muss darin stehen, und seine linke obere Ecke muss auf
   der Ecke des gezeichneten Eintrags liegen. Eine hier nachgebaute
   Layoutrechnung wäre genau die zweite Wahrheit, die diese Prüfung
   fangen soll (Fehlerbuch E2).

   ── Was ohne diese Prüfung durchginge ──────────────────────────────

   · Die Leiste malt an eine Stelle und meldet eine andere.
   · Zwei Felder liegen übereinander — ein Tipp löst zwei Dinge aus.
   · Ein Feld ragt aus dem Fenster und ist nie erreichbar.
   · Ein Feld nennt eine Aktion, die der Kern ablehnt: Man tippt, und
     nichts geschieht — das sieht aus wie ein kaputtes Telefon.
   · Die Feldliste sammelt sich an, und der Finger trifft ein Feld von
     gestern.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/oberflaeche.js` (führt die Liste, gibt `felder()` aus),
   `runtime/oberflaeche-leiste.js` (füllt sie beim Zeichnen),
   `werkzeuge/buehne-oberflaeche.mjs` (Probestellung und Mitschriften —
   dieselben wie in `werkzeuge/pruefe-oberflaeche.mjs`),
   `spiel/aktionen.mjs` (`pruefeAktion` — die eine Wahrheit darüber, ob
   eine Aktion wirklich geht), `runtime/schrift.js`, `werkzeuge/helfer.mjs`
   und `werkzeuge/pruefe-alles.mjs`, das diese Datei als eigenen Prozess
   startet. */

import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";
import { pruefeAktion } from "../spiel/aktionen.mjs";
import * as SCHRIFT from "../runtime/schrift.js";
import { TASTEN } from "../runtime/oberflaeche.js";
import { draussen, macheBuehne, macheProbe } from "./buehne-oberflaeche.mjs";

/* ── 1 · Die Leiste am Mauszeiger ─────────────────────────────────*/
abschnitt("1 · Felder");

/* Die Bänder der Leiste aus der Mitschrift lesen: Jeder Eintrag malt
   genau drei Texte (Taste, Name, Preis) auf derselben Höhe. Sie nach x
   zu ordnen und zu dritteln gibt die Einträge zurück, ohne dass hier
   eine einzige Koordinate ausgerechnet würde. */
function leistenTexte(buehne) {
  const mass = buehne.flaeche.masse();
  const y = mass.hoehe - mass.leisteHoehe + mass.polster;
  return buehne.schrift.texte.filter((t) => t.y === y).sort((a, b) => a.x - b.x);
}

const bedeckt = (rechtecke, x, y) => rechtecke.some((r) =>
  x >= r.x && x < r.x + r.b && y >= r.y && y < r.y + r.h);

/* Die Behauptungen, die für **jede** Feldliste gelten, gleich unter
   welcher Bedienung sie entstanden ist. */
function pruefeFelder(buehne, felder, wo) {
  const mass = buehne.flaeche.masse();
  for (const f of felder) {
    behaupte([f.x, f.y, f.breite, f.hoehe].every(Number.isInteger),
      `${wo}: "${f.id}" hat ganze Zahlen (${f.x},${f.y},${f.breite},${f.hoehe})`);
    behaupte(f.breite > 0 && f.hoehe > 0, `${wo}: "${f.id}" ist nicht leer`);
    behaupte(!draussen({ x: f.x, y: f.y, b: f.breite, h: f.hoehe }, mass.breite, mass.hoehe),
      `${wo}: "${f.id}" bleibt im Fenster`);
    behaupte(typeof f.beschriftung === "string" && f.beschriftung.trim() !== "",
      `${wo}: "${f.id}" ist beschriftet`);
    const fremd = [...f.beschriftung].filter((z) => !(z in SCHRIFT.ZEICHEN));
    gleich(fremd.length, 0,
      `${wo}: "${f.id}" benutzt nur Zeichen der Schrift (${fremd.join(" ")})`);
    behaupte(!/(ae|oe|ue|ss)/.test(f.beschriftung) || /Fass|Wasser/.test(f.beschriftung),
      `${wo}: "${f.id}" schreibt keine Ersatzumlaute (${f.beschriftung})`);
    /* Die Mitte muss gemalt sein. Ein Feld über einer Stelle, an der
       nichts steht, ist ein Knopf, den man nicht sieht. */
    behaupte(bedeckt(buehne.ctx.rechtecke,
      f.x + Math.floor(f.breite / 2), f.y + Math.floor(f.hoehe / 2)),
    `${wo}: an der Mitte von "${f.id}" wurde wirklich gemalt`);
    /* Und die Beschriftung steht darin — nicht daneben. */
    const drin = buehne.schrift.texte.filter((t) =>
      t.x >= f.x && t.x < f.x + f.breite && t.y >= f.y && t.y < f.y + f.hoehe
      && t.text.trim() !== "");
    behaupte(drin.some((t) => f.beschriftung.includes(t.text.trim())),
      `${wo}: die Beschriftung von "${f.id}" steht im Feld`);
  }
  const kennungen = felder.map((f) => f.id);
  gleich(new Set(kennungen).size, kennungen.length,
    `${wo}: jede Kennung kommt genau einmal vor`);
  /* Zwei Felder übereinander hieße: ein Tipp löst zwei Dinge aus. */
  let ueberdeckt = 0;
  for (let i = 0; i < felder.length; i++) {
    for (let j = i + 1; j < felder.length; j++) {
      const a = felder[i], b = felder[j];
      if (a.x < b.x + b.breite && b.x < a.x + a.breite
        && a.y < b.y + b.hoehe && b.y < a.y + a.hoehe) ueberdeckt++;
    }
  }
  gleich(ueberdeckt, 0, `${wo}: keine zwei Felder überdecken sich`);
}

{
  /* Vor dem ersten Bild gibt es nichts zu treffen. Eine Liste, die
     schon vorher etwas nennt, hätte sie **gerechnet** statt gezeichnet. */
  const kalt = macheProbe();
  const b0 = macheBuehne(kalt.zustand, { fenster: 900 });
  gleich(b0.flaeche.felder().length, 0, "vor dem ersten Bild ist die Feldliste leer");
  b0.flaeche.zeichne(null, {});
  gleich(b0.flaeche.felder().length, 0, "und ohne Spielstand bleibt sie leer");
  b0.flaeche.zeichne(kalt.zustand, {});
  const ersteZahl = b0.flaeche.felder().length;
  behaupte(ersteZahl > 0, "nach dem Zeichnen stehen Felder darin");
  /* Die Liste wird bei **jedem** Bild neu gefüllt. Sammelte sie sich an,
     lägen nach einer Minute tausend tote Felder übereinander, und der
     Finger träfe eines von gestern. */
  b0.flaeche.zeichne(kalt.zustand, {});
  gleich(b0.flaeche.felder().length, ersteZahl, "ein zweites Bild verdoppelt nichts");
  b0.flaeche.zeichne(null, {});
  gleich(b0.flaeche.felder().length, 0,
    "ein Bild ohne Spielstand räumt die Felder des vorigen weg");

  /* Die Liste ist eine Kopie: Wer von außen daran dreht, dreht nicht an
     der einen Wahrheit über die Maße. */
  const kopie = b0.flaeche.felder();
  kopie.push({ id: "erfunden" });
  gleich(b0.flaeche.felder().some((f) => f.id === "erfunden"), false,
    "die Liste von außen zu verändern ändert die Anzeige nicht");

  for (const fenster of [340, 400, 700, 900, 1400]) {
    const probe = macheProbe();
    const buehne = macheBuehne(probe.zustand, { fenster });
    buehne.flaeche.zeichne(probe.zustand, {});
    const felder = buehne.flaeche.felder();
    const mass = buehne.flaeche.masse();
    const texte = leistenTexte(buehne);

    pruefeFelder(buehne, felder, `bei ${fenster}`);
    gleich(felder.length, texte.length / 3,
      `bei ${fenster} bekommt jeder gezeichnete Eintrag genau ein Feld`);

    /* Die eigentliche Behauptung: Feld und Zeichnung liegen aufeinander.
       Die linke obere Ecke jedes Eintrags steht in der Mitschrift — sie
       ist um das Polster gegen das Feld eingerückt, und um nichts sonst. */
    const nachX = [...felder].sort((a, b) => a.x - b.x);
    for (let i = 0; i < nachX.length; i++) {
      const f = nachX[i];
      const kopf = texte[i * 3];
      gleich(f.x + mass.polster, kopf.x,
        `bei ${fenster}: "${f.id}" beginnt dort, wo seine Taste steht`);
      gleich(f.y + mass.polster, kopf.y,
        `bei ${fenster}: "${f.id}" steht auf der Zeile seines Eintrags`);
      gleich(kopf.text.trim(), f.taste,
        `bei ${fenster}: vor "${f.id}" steht seine eigene Taste`);
      const schwanz = texte[i * 3 + 2];
      behaupte(schwanz.x + SCHRIFT.breiteVon(schwanz.text) * mass.stufe
        <= f.x + f.breite,
      `bei ${fenster}: der Preis von "${f.id}" endet noch im Feld`);
    }

    /* Das Band liegt unten und ist so hoch wie die Leiste. */
    for (const f of felder) {
      gleich(f.hoehe, mass.leisteHoehe, `bei ${fenster}: "${f.id}" ist so hoch wie die Leiste`);
      gleich(f.y + f.hoehe, mass.hoehe, `bei ${fenster}: "${f.id}" steht am unteren Rand`);
    }

    /* Ohne dieses Feld steckt man fest — bei jeder Breite. */
    const schluss = felder.find((f) => f.art === "zugEnde");
    behaupte(!!schluss, `bei ${fenster} gibt es ein Feld "Zug beenden"`);
    behaupte(schluss && schluss.beschriftung.includes("Zug beenden"),
      `bei ${fenster} heißt es auch so (${schluss && schluss.beschriftung})`);
    gleich(schluss && schluss.taste, TASTEN.zugEnde,
      `bei ${fenster} nennt es dieselbe Taste wie die Tastatur`);

    /* Und der Fall, der eine bloß hübsche Liste nicht besteht: Die
       Aktion muss der Kern wirklich annehmen. Ein Feld mit einer Aktion,
       die abgelehnt wird, tut beim Tippen nichts — und das sieht genauso
       aus wie ein Fehler in der Eingabe. */
    for (const f of felder) {
      if (!f.aktiv || f.aktion === null) continue;
      gleich(pruefeAktion(probe.zustand, f.aktion), null,
        `bei ${fenster}: der Kern nimmt die Aktion von "${f.id}" an`);
    }
  }

  /* Ohne Zug am Tisch gibt es nichts zu tippen — und keine erfundenen
     Felder über dem Satz "Niemand ist am Zug." */
  const ruhe = macheProbe();
  ruhe.zustand.vorbei = "sieg";
  const b2 = macheBuehne(ruhe.zustand, { fenster: 900 });
  b2.flaeche.zeichne(ruhe.zustand, {});
  gleich(b2.flaeche.felder().length, 0,
    "ist niemand am Zug, meldet die Leiste kein Feld");
}

ende("Felder");
