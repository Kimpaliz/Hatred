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
import { FARBEN } from "../runtime/palette.js";
import { FINGER_MINDESTMASS, TASTEN as T2 } from "../runtime/oberflaeche.js";
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

/* ── 2 · Am Finger ────────────────────────────────────────────────

   Der Fall, der ohne diese Prüfung falsch wäre: Die Leiste **quetscht**
   die Felder, statt umzubrechen. Auf dem Bild sieht das ordentlich aus
   — jedes Feld ist da, jede Beschriftung steht drin —, und der Daumen
   trifft trotzdem nichts, weil ein Feld dreizehn Punkte hoch ist.
   Deshalb wird hier nicht „es gibt Felder" behauptet, sondern die eine
   Zahl, an der Android das festmacht: 48. */
abschnitt("2 · Am Finger");
{
  behaupte(FINGER_MINDESTMASS === 48,
    "Androids Mindestmaß für einen Daumen ist 48 Punkte");

  for (const fenster of [260, 340, 400, 700, 900, 1400]) {
    const probe = macheProbe();
    const buehne = macheBuehne(probe.zustand, { fenster });
    buehne.flaeche.zeichne(probe.zustand, {}, { finger: true });
    const felder = buehne.flaeche.felder();
    const mass = buehne.flaeche.masse();

    behaupte(felder.length > 0, `bei ${fenster} am Finger stehen Felder da`);
    pruefeFelder(buehne, felder, `Finger bei ${fenster}`);

    /* Die Behauptung dieses Bausteins. Ein einziges zu kleines Feld
       reicht — deshalb wird das kleinste genannt, nicht der Durchschnitt. */
    const engstes = Math.min(...felder.map((f) => Math.min(f.breite, f.hoehe)));
    behaupte(engstes >= FINGER_MINDESTMASS,
      `bei ${fenster} ist kein Feld schmaler oder niedriger als 48 (${engstes})`);

    /* Und die Felder liegen wirklich als eigene Kästen im Bild — nicht
       nur als Zahl in einer Liste über einem gemeinsamen Band. */
    for (const f of felder) {
      behaupte(buehne.ctx.rechtecke.some((r) =>
        r.farbe === FARBEN.hudGrund && r.x === f.x && r.y === f.y
        && r.b === f.breite && r.h === f.hoehe),
      `Finger bei ${fenster}: "${f.id}" ist als eigener Kasten gemalt`);
    }

    /* Umgebrochen wird nach unten, und die Leiste bleibt im Bild. */
    const reihen = new Set(felder.map((f) => f.y));
    behaupte([...reihen].every((y) => y + FINGER_MINDESTMASS <= mass.hoehe),
      `bei ${fenster} liegt jede Reihe im Fenster`);
    behaupte(mass.leisteHoehe === reihen.size * felder[0].hoehe,
      `bei ${fenster} ist die Leiste so hoch wie ihre ${reihen.size} Reihe(n)`);
    behaupte(mass.leisteHoehe <= Math.floor(mass.hoehe / 2) + felder[0].hoehe,
      `bei ${fenster} frisst die Leiste nicht das halbe Bild (${mass.leisteHoehe})`);

    /* Ohne dieses Feld steckt man fest — auch am Finger, auch schmal. */
    behaupte(felder.some((f) => f.art === "zugEnde"),
      `bei ${fenster} bleibt "Zug beenden" am Finger stehen`);
    gleich((felder.find((f) => f.art === "zugEnde") || { taste: "fehlt" }).taste, T2.zugEnde,
      `bei ${fenster} nennt es dieselbe Taste wie die Tastatur`);
  }

  /* Der schmale Schirm bricht wirklich um — sonst prüfte das oben nichts:
     Eine Leiste, die nie umbricht, bestünde jede Behauptung über den
     Umbruch. Auf 260 Punkten passen fünf Felder à 48 nicht nebeneinander. */
  const eng = macheProbe();
  const be = macheBuehne(eng.zustand, { fenster: 260 });
  be.flaeche.zeichne(eng.zustand, {}, { finger: true });
  const engFelder = be.flaeche.felder();
  const engReihen = new Set(engFelder.map((f) => f.y));
  behaupte(engReihen.size > 1,
    `auf 260 Punkten bricht die Leiste wirklich um (${engReihen.size} Reihen)`);
  behaupte(be.flaeche.masse().leisteHoehe > FINGER_MINDESTMASS,
    "und wird dabei höher als ein einzelnes Feld");
  behaupte(engFelder.every((f) => f.breite >= FINGER_MINDESTMASS),
    "und quetscht dabei kein Feld unter 48 Punkte");
  /* Auf demselben schmalen Schirm ohne Finger bleibt es eine Zeile —
     der Umbruch ist die Antwort auf den Daumen, nicht auf die Breite. */
  const bs = macheBuehne(macheProbe().zustand, { fenster: 260 });
  bs.flaeche.zeichne(eng.zustand, {});
  gleich(new Set(bs.flaeche.felder().map((f) => f.y)).size, 1,
    "ohne Finger bleibt dieselbe Breite einzeilig");

  /* Und der Beweis, dass die Arbeit nichts beschädigt hat: Ohne Finger
     ist die Aufrufliste dieselbe wie ohne den Zusatz überhaupt — und mit
     Finger eine andere. Ohne den zweiten Teil wäre der erste wertlos. */
  const a = macheProbe(), b = macheProbe(), c = macheProbe();
  const ba = macheBuehne(a.zustand, { fenster: 900 });
  const bb = macheBuehne(b.zustand, { fenster: 900 });
  const bc = macheBuehne(c.zustand, { fenster: 900 });
  const ansicht = () => ({ ziel: 2, zeiger: { x: 6, y: 6 }, zeit: 1, rundeSeit: 1 });
  ba.flaeche.zeichne(a.zustand, ansicht());
  bb.flaeche.zeichne(b.zustand, ansicht(), { finger: false });
  bc.flaeche.zeichne(c.zustand, ansicht(), { finger: true });
  gleich(JSON.stringify(bb.ctx.aufrufe), JSON.stringify(ba.ctx.aufrufe),
    "finger: false zeichnet Aufruf für Aufruf dasselbe wie ohne die Angabe");
  behaupte(JSON.stringify(bc.ctx.aufrufe) !== JSON.stringify(ba.ctx.aufrufe),
    "finger: true zeichnet wirklich etwas anderes - sonst prüfte das nichts");
}

/* ── 3 · Karte und Menü ───────────────────────────────────────────

   Der Fall, der ohne diese Prüfung falsch wäre: Die Übersichtskarte
   hängt an `Tab`, ein Menü hat überhaupt keine Taste. Auf einem Telefon
   sind das zwei Dinge, an die man **gar nicht** herankommt — und das
   fällt niemandem auf, der mit einer Tastatur davorsitzt. Geprüft wird
   deshalb nicht „es gibt zwei Felder mehr", sondern dass es sie genau
   dort gibt, wo es sonst keinen Weg hin gäbe. */
abschnitt("3 · Karte und Menü");
{
  for (const fenster of [340, 700, 1400]) {
    const probe = macheProbe();
    const b = macheBuehne(probe.zustand, { fenster });
    b.flaeche.zeichne(probe.zustand, {}, { finger: true });
    const felder = b.flaeche.felder();
    gleich(felder.filter((f) => f.art === "karte").length, 1,
      `bei ${fenster} gibt es am Finger genau ein Feld für die Karte`);
    gleich(felder.filter((f) => f.art === "menue").length, 1,
      `bei ${fenster} gibt es am Finger genau ein Feld für das Menü`);

    /* Fehlt ein Feld, soll die Prüfung das **melden** und nicht am
       fehlenden Feld sterben: Ein Absturz sagt nicht, was fehlte. */
    const leer = { taste: "fehlt", aktion: "fehlt", beschriftung: "fehlt", aktiv: false };
    const karte = felder.find((f) => f.art === "karte") || leer;
    const menue = felder.find((f) => f.art === "menue") || leer;
    gleich(karte.taste, "Tab", `bei ${fenster} tut das Kartenfeld, was Tab tut`);
    gleich(karte.aktion, null, `bei ${fenster} ist die Karte keine Spielaktion`);
    gleich(karte.beschriftung, "Karte", `bei ${fenster} steht "Karte" darauf`);
    /* `null` ist hier kein Versehen, sondern die Auskunft: Es gibt keine
       Taste, die ein Menü öffnet. Stünde dort eine erfundene, suchte die
       Eingabe eine Taste, die nichts tut. */
    gleich(menue.taste, null, `bei ${fenster} nennt das Menüfeld keine erfundene Taste`);
    gleich(menue.aktion, null, `bei ${fenster} ist das Menü keine Spielaktion`);
    gleich(menue.beschriftung, "Menü", `bei ${fenster} steht "Menü" darauf`);
    behaupte(karte.aktiv && menue.aktiv, `bei ${fenster} sind beide wählbar`);

    /* Ohne Finger gibt es sie nicht — sonst wären es zwei Felder, die
       am Mauszeiger niemand braucht und die das Bild von heute ändern. */
    const ohne = macheBuehne(macheProbe().zustand, { fenster });
    ohne.flaeche.zeichne(probe.zustand, {});
    gleich(ohne.flaeche.felder().filter((f) => f.art === "karte" || f.art === "menue").length,
      0, `bei ${fenster} gibt es sie ohne Finger nicht`);
  }

  /* Am Ende eines Laufs ist niemand am Zug. Genau dann braucht man das
     Menü am dringendsten — und genau dann fehlte es, wenn die Leiste
     nur einen Satz schriebe. */
  const aus = macheProbe();
  aus.zustand.vorbei = "sieg";
  const ba = macheBuehne(aus.zustand, { fenster: 400 });
  ba.flaeche.zeichne(aus.zustand, {}, { finger: true });
  const ruhe = ba.flaeche.felder();
  pruefeFelder(ba, ruhe, "ohne Zug am Finger");
  gleich(ruhe.length, 2, "ist niemand am Zug, bleiben am Finger genau Karte und Menü");
  behaupte(ruhe.some((f) => f.art === "karte") && ruhe.some((f) => f.art === "menue"),
    "und zwar diese beiden");
  behaupte(ruhe.every((f) => f.breite >= FINGER_MINDESTMASS
    && f.hoehe >= FINGER_MINDESTMASS), "auch sie sind daumengroß");
  const bo = macheBuehne(macheProbe().zustand, { fenster: 400 });
  bo.flaeche.zeichne(aus.zustand, {});
  gleich(bo.flaeche.felder().length, 0,
    "ohne Finger bleibt es beim Satz ohne Felder");

  /* Und der Fall, den ein breiter Schirm verdeckt: Wenn es eng wird,
     muss die Reihenfolge des Wegkürzens stimmen. Erst die Aktionen,
     dann das Menü, dann die Karte — "Zug beenden" niemals. */
  const winzig = macheProbe();
  const bw = macheBuehne(winzig.zustand, { fenster: 120 });
  bw.flaeche.zeichne(winzig.zustand, {}, { finger: true });
  const knapp = bw.flaeche.felder();
  pruefeFelder(bw, knapp, "auf 120 Punkten");
  behaupte(knapp.some((f) => f.art === "zugEnde"),
    `auf 120 Punkten bleibt "Zug beenden" stehen (${knapp.map((f) => f.id).join(", ")})`);
  behaupte(!knapp.some((f) => f.art === "aktion"),
    "auf 120 Punkten sind die Aktionen zuerst gewichen");
  behaupte(!knapp.some((f) => f.art === "menue"),
    "und danach das Menü");
  behaupte(knapp.some((f) => f.art === "karte"),
    "die Karte weicht als letzte vor dem Zugende");
  behaupte(knapp.length < 7,
    `auf 120 Punkten wird wirklich gekürzt (${knapp.length} Felder) - sonst prüfte das nichts`);
}

ende("Felder");
