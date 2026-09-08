/* [Aufgabe: Prüfwesen] Die Messung an der Anzeige — ohne Browser, über ein
   Zeichenblatt und eine Schrift, die jeden Aufruf mitschreiben.

   ── Warum zwei Mitschriften ────────────────────────────────────────

   Die Anzeige macht zwei Sorten Fehler, und keine sieht man im fertigen
   Bild sofort:

   1. **Fehler der Geometrie** — etwas liegt auf einem halben Bildpunkt
      oder ragt aus dem Fenster (Fehlerbuch D1). Die fängt das
      mitschreibende Zeichenblatt: In der Mitschrift ist es eine Zahl mit
      Komma und ein Rechteck mit x = -3.
   2. **Fehler der Sprache** — ein leerer Text, ein englisches Wort, ein
      Zeichen, das die Pixelschrift gar nicht kennt und als Kasten malt.
      Die fängt nur eine Mitschrift der **Texte**, und die gibt es, weil
      `macheOberflaeche` die Schrift hereingereicht bekommt statt sie
      sich zu holen.

   Geprüft wird jeweils der Fall, der ohne die Arbeit falsch wäre:

   · **Die Kostenvorschau zeigt zu viele oder zu wenige Punkte.** Bei
     6 AP und einer 3-AP-Waffe müssen es **genau drei** sein. Eine
     Anzeige, die einfach alle vorhandenen Punkte hervorhebt, bestünde
     jede Prüfung, die nur „mehr als null" verlangt. Dazu der Fall, den
     man beim Bauen vergisst: Die Aktion ist **zu teuer** — dann darf
     nichts in der Kostenfarbe leuchten, sonst sieht „geht nicht"
     genauso aus wie „kostet drei".
   · **Die Begründung erklärt die Zahl nicht.** Die Summanden werden
     einzeln aus den gezeichneten Texten gelesen und gegen die
     angezeigte Trefferchance gerechnet. Eine Zielangabe, die 76 % zeigt
     und 74 + 12 begründet, fällt damit auf — sie sähe sonst richtig aus.
   · **Die Zugleiste überspringt die Toten.** Der bequeme Weg ist ein
     `filter(w => w.lebt)`; die Reihe sieht danach sauber aus und ist um
     einen Platz verschoben. Geprüft wird deshalb, dass der Name des
     Toten **steht** und dass ein Strich in seiner Breite darüber liegt.
   · **Etwas wird außerhalb des Fensters gezeichnet.** Eine Figur weit
     ab vom Ausschnitt darf gar nichts beitragen, eine halb angeschnittene
     genau bis zur Kante. Beides wird mit derselben Stellung gemessen,
     einmal mit und einmal ohne die Figur.

   ── Warum die Probestellung von Hand gebaut ist ────────────────────

   `macheLauf` würfelt Karte und Brut. Für „genau drei Punkte" und
   „genau +12 %" braucht es aber eine Stellung, in der jede Zahl
   feststeht. Die Karte wird deshalb von Hand gesetzt — und **zusätzlich**
   läuft alles einmal über einen echten Lauf aus `spiel/lauf.mjs`, damit
   die Anzeige nicht nur auf ihrer eigenen Puppenstube funktioniert.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/oberflaeche.js` (das Geprüfte), `runtime/schrift.js` und
   `runtime/kamera.js` (hereingereicht), `runtime/palette.js` (die
   Farben, an denen die Rechtecke erkannt werden), `spiel/gitter.mjs`,
   `spiel/wesen.mjs`, `spiel/zug.mjs`, `spiel/zufall.mjs` und
   `spiel/lauf.mjs` (die Probestellungen), `tests/helfer.mjs` und
   `werkzeuge/pruefe-alles.mjs`, das diese Datei als eigenen Prozess
   startet. Die Probestellung und die beiden Mitschriften stehen in
   `tests/buehne-oberflaeche.mjs` — dieselben benutzt
   `tests/pruefe-felder.mjs`, das misst, **wo** man hintippen kann. */

import { abschnitt, behaupte, gleich, wirft, ende } from "./helfer.mjs";
import { EBENE_BODEN, HINDERNIS } from "../spiel/gitter.mjs";
import { macheLauf } from "../spiel/lauf.mjs";
import { AKTION } from "../spiel/aktionen.mjs";
import { waffe } from "../spiel/katalog/waffen.mjs";
import { FARBEN } from "../runtime/palette.js";
import { KACHEL } from "../runtime/licht.js";
import { macheKamera } from "../runtime/kamera.js";
import * as SCHRIFT from "../runtime/schrift.js";
import {
  LAUFTEXT_ZEILEN, RUNDE_EINBLENDUNG, TASTEN, ZUGLEISTE_WESEN,
  macheOberflaeche, nameVon, satzVon
} from "../runtime/oberflaeche.js";
import {
  alleTexte, draussen, enthaelt, ganzzahlig, macheBuehne, macheErsatzflaeche,
  macheErsatzschrift, macheProbe, mitFarbe
} from "./buehne-oberflaeche.mjs";

/* ── 0 · Selbstprobe des Prüfers ────────────────────────────────────
   Ein Messgerät, das nie ausschlägt, meldet für immer „grün". */
abschnitt("0 · Selbstprobe");
{
  const ctx = macheErsatzflaeche();
  ctx.fillStyle = FARBEN.apKosten;
  ctx.fillRect(1, 2, 3, 4);
  gleich(ctx.rechtecke.length, 1, "das Ersatzblatt schreibt mit");
  gleich(ctx.aufrufe[0][0], "rechteck", "und merkt sich die Reihenfolge der Aufrufe");
  ctx.imageSmoothingEnabled = false;
  gleich(ctx.aufrufe[ctx.aufrufe.length - 1][0], "glaettung",
    "auch das Abschalten der Glättung steht in der Reihenfolge");
  gleich(mitFarbe(ctx.rechtecke, FARBEN.apKosten).length, 1, "die Farbe wird mitgeschrieben");
  behaupte(ganzzahlig(ctx.rechtecke[0]), "ein ganzzahliges Rechteck gilt als sauber");
  ctx.fillRect(12.5, 2, 3, 4);
  behaupte(!ganzzahlig(ctx.rechtecke[1]),
    "ein Rechteck auf 12,5 schlägt an - sonst prüfte die Mitschrift nichts");
  behaupte(!draussen({ x: 0, y: 0, b: 10, h: 10 }, 10, 10), "genau im Fenster gilt als drin");
  behaupte(draussen({ x: -1, y: 0, b: 2, h: 2 }, 10, 10), "links daneben schlägt an");
  behaupte(draussen({ x: 9, y: 0, b: 2, h: 2 }, 10, 10), "rechts hinaus schlägt an");

  const schrift = macheErsatzschrift();
  schrift.zeichne(ctx, "Probe", 0, 0, FARBEN.hudSchrift, { gross: 1, schatten: false });
  gleich(schrift.texte.length, 1, "die Ersatzschrift schreibt den Text mit");
  gleich(schrift.texte[0].text, "Probe", "und zwar wörtlich");
  behaupte(ctx.rechtecke.length > 2, "und zeichnet trotzdem wirklich");
}

/* ── 1 · Die Angaben, ohne die nichts geht ─────────────────────────*/
abschnitt("1 · Angaben");
{
  const { zustand } = macheProbe();
  const kamera = macheKamera({ fensterBreite: 400, fensterHoehe: 400, karte: zustand.karte });
  wirft(() => macheOberflaeche({ schrift: macheErsatzschrift(), kamera }),
    "ohne Zeichenblatt wirft macheOberflaeche");
  wirft(() => macheOberflaeche({ ctx: macheErsatzflaeche(), kamera }),
    "ohne Schrift wirft macheOberflaeche");
  wirft(() => macheOberflaeche({ ctx: macheErsatzflaeche(), schrift: macheErsatzschrift() }),
    "ohne Kamera wirft macheOberflaeche");
  /* Eine Schrift ohne ZEILE hat kein Zeilenmaß — die Anzeige dürfte sich
     dann eines ausdenken, und das wäre eine zweite Wahrheit. */
  wirft(() => macheOberflaeche({
    ctx: macheErsatzflaeche(),
    schrift: { zeichne() {}, breiteVon() { return 0; } },
    kamera
  }), "eine Schrift ohne ZEILE wirft");
}

/* ── 2 · Die Sätze ────────────────────────────────────────────────
   Jede Ereignisform aus dem Vertrag bekommt einen deutschen Satz. */
abschnitt("2 · Sätze");
{
  const { zustand } = macheProbe();
  const formen = [
    { art: "bewegt", wer: 1, pfad: [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }], apRest: 4 },
    { art: "gestuerzt", wer: 1, von: { x: 5, y: 5 }, nach: { x: 5, y: 6 },
      stufen: 2, schaden: 3 },
    { art: "angriff", wer: 1, ziel: 2, waffe: "kurzbogen", chance: 0.76, wurf: 0.3,
      treffer: true },
    { art: "angriff", wer: 1, ziel: 2, waffe: "kurzbogen", chance: 0.76, wurf: 0.9,
      treffer: false },
    { art: "schaden", wer: 2, wieviel: 4, quelle: "angriff", lpRest: 6, art2: "stich" },
    { art: "gestossen", wer: 2, von: { x: 8, y: 5 }, nach: { x: 9, y: 5 } },
    { art: "gestorben", wer: 2, x: 8, y: 5 },
    { art: "apGesetzt", wer: 1, ap: 6 },
    { art: "wacht", wer: 1 },
    { art: "wachtLoest", wer: 1, ziel: 2 },
    { art: "hindernisWeg", x: 4, y: 7, was: HINDERNIS.fass },
    { art: "lichtNeu", x: 4, y: 7, art2: "fackel", staerke: 1 },
    { art: "lichtWeg", x: 4, y: 7 },
    { art: "zugEnde", wer: 1 },
    { art: "rundeNeu", nummer: 3 },
    { art: "seiteDran", seite: "brut" },
    { art: "beute", wer: 1, was: "trank" },
    { art: "ebeneGewechselt", wer: 1, von: 2, nach: 1 },
    { art: "laufEnde", grund: "sieg" },
    { art: "laufEnde", grund: "niederlage" }
  ];
  /* Jeder Satz wird hier auch auf den Zeichenvorrat geprüft und nicht
     erst, wenn er zufällig auf dem Bild landet: Ein Gedankenstrich in
     einem seltenen Ereignis fiele sonst nie auf — er stünde im Bild als
     Kasten, und in keiner Prüfung stünde etwas. */
  for (const form of formen) {
    const satz = satzVon(zustand, form);
    behaupte(typeof satz === "string" && satz.length > 3,
      `"${form.art}" bekommt einen Satz: ${satz}`);
    behaupte(satz.endsWith(".") || satz.endsWith("!"),
      `"${form.art}" endet als Satz: ${satz}`);
    const fremd = [...satz].filter((z) => !(z in SCHRIFT.ZEICHEN));
    gleich(fremd.length, 0,
      `"${form.art}" benutzt nur Zeichen, die die Schrift kennt (${fremd.join(" ")})`);
  }
  behaupte(satzVon(zustand, { art: "gibtEsNicht" }).length > 3,
    "eine unbekannte Ereignisform verschwindet nicht still, sondern bekommt einen Satz");
  behaupte(satzVon(zustand, null).length > 3, "auch null bekommt einen Satz statt zu werfen");

  /* Der Name kommt aus dem Spieler, sobald es einen gibt — sonst stünde
     bei vier Spielern viermal dieselbe Klasse in der Zugleiste. */
  gleich(nameVon(zustand, 1), "Jannik", "ein Jäger heißt nach seinem Spieler");
  gleich(nameVon(zustand, 2), "Krätzling", "eine Brut heißt nach ihrer Art");
  gleich(nameVon(zustand, 999), "Jemand", "eine unbekannte Nummer wirft nicht");
  behaupte(satzVon(zustand, { art: "angriff", wer: 1, ziel: 2, treffer: true })
    .includes("Jannik"), "der Satz nennt den Spielernamen");
}

/* ── 3 · Die Kostenvorschau ───────────────────────────────────────*/
abschnitt("3 · Kostenvorschau");
{
  const { zustand, schuetze } = macheProbe();
  const angriff = { typ: AKTION.angriff, wer: 1, ziel: 2 };

  const ohne = macheBuehne(zustand);
  ohne.flaeche.zeichne(zustand, {});
  gleich(mitFarbe(ohne.ctx.rechtecke, FARBEN.apKosten).length, 0,
    "ohne geplante Aktion leuchtet kein Punkt in der Kostenfarbe");

  const mit = macheBuehne(zustand);
  mit.flaeche.zeichne(zustand, { geplant: angriff });
  const hervor = mitFarbe(mit.ctx.rechtecke, FARBEN.apKosten);
  gleich(schuetze.ap, 6, "der Schütze hat sechs Aktionspunkte");
  gleich(hervor.length, 3,
    "bei 6 AP und einer 3-AP-Waffe leuchten genau drei Punkte");
  behaupte(hervor.every((r) => r.b === hervor[0].b && r.h === hervor[0].h),
    "die hervorgehobenen Punkte sind alle gleich groß");
  behaupte(hervor.every((r) => r.y === hervor[0].y),
    "sie stehen in einer Reihe");
  /* Die drei sind die **rechten** der vorhandenen: Das sind die, die
     weg wären. Links davon bleiben die drei, die übrig blieben. */
  const voll = mitFarbe(mit.ctx.rechtecke, FARBEN.apVoll)
    .filter((r) => r.y === hervor[0].y);
  gleich(voll.length, 3, "drei Punkte bleiben in der vollen Farbe stehen");
  behaupte(Math.max(...voll.map((r) => r.x)) < Math.min(...hervor.map((r) => r.x)),
    "die Kosten stehen rechts von dem, was übrig bleibt");

  /* Wo die Reihe liegt, sagt die Anzeige selbst - eine hier nachgebaute
     Rechnung waere eine zweite Wahrheit ueber dieselbe Stelle. */
  const reihe = mit.flaeche.apReihe(schuetze);
  gleich(reihe.anzahl, 6, "die Punktreihe ist so lang wie apMax");
  const inDerReihe = (rechtecke) => rechtecke.filter((r) =>
    r.y === reihe.y && r.b === reihe.gross && r.h === reihe.gross);
  gleich(inDerReihe(mit.ctx.rechtecke).length, 6, "es stehen so viele Punkte wie apMax");
  behaupte(hervor.every((r) => r.y === reihe.y), "die Kosten stehen in der Punktreihe");

  /* Der Fall, den man beim Bauen vergisst: zu teuer. */
  const arm = macheProbe();
  arm.schuetze.ap = 2;
  const knapp = macheBuehne(arm.zustand);
  knapp.flaeche.zeichne(arm.zustand, { geplant: angriff });
  gleich(mitFarbe(knapp.ctx.rechtecke, FARBEN.apKosten).length, 0,
    "eine zu teure Aktion leuchtet nicht in der Kostenfarbe");
  const knappReihe = knapp.flaeche.apReihe(arm.schuetze);
  const warnPunkte = mitFarbe(knapp.ctx.rechtecke, FARBEN.hudSchlecht)
    .filter((r) => r.y === knappReihe.y && r.b === knappReihe.gross);
  gleich(warnPunkte.length, 2,
    "stattdessen leuchten die zwei übrigen Punkte in der Warnfarbe");
  const knappLeer = mitFarbe(knapp.ctx.rechtecke, FARBEN.apLeer)
    .filter((r) => r.y === knappReihe.y && r.b === knappReihe.gross);
  gleich(knappLeer.length, 4, "und vier Punkte stehen als verbraucht da");

  /* Zug beenden kostet nichts — dann darf auch nichts leuchten. */
  const frei = macheBuehne(zustand);
  frei.flaeche.zeichne(zustand, { geplant: { typ: AKTION.zugEnde, wer: 1 } });
  gleich(mitFarbe(frei.ctx.rechtecke, FARBEN.apKosten).length, 0,
    "eine Aktion für null Punkte hebt keinen Punkt hervor");
}

/* ── 4 · Die Lebensbalken ─────────────────────────────────────────

   Der Fall, der ohne diese Prüfung durchginge: Der Balken hat einen
   Rahmen von einem logischen Punkt auf jeder Seite. Ist er nur zwei
   Punkte hoch, bleibt bei einfacher Vergrößerung innen **null** übrig —
   der Rahmen steht da, die Farbe fehlt, und niemand sieht mehr, wie viel
   Leben eine Figur hat. Ein Bildschirmfoto sähe fast richtig aus.
   Deshalb wird nicht der Rahmen gemessen, sondern die **Füllung**. */
abschnitt("4 · Lebensbalken");
{
  const rahmenVon = (rechtecke, stufe) =>
    mitFarbe(rechtecke, FARBEN.kontur).filter((r) => r.b === KACHEL * stufe);
  const fuellungIn = (rechtecke, rahmen, farbe) => mitFarbe(rechtecke, farbe)
    .filter((r) => r.y >= rahmen.y && r.y + r.h <= rahmen.y + rahmen.h
      && r.x >= rahmen.x && r.x + r.b <= rahmen.x + rahmen.b);

  for (const fenster of [400, 700, 1024]) {
    const probe = macheProbe();
    const buehne = macheBuehne(probe.zustand, { fenster });
    buehne.flaeche.zeichne(probe.zustand, {});
    const stufe = buehne.flaeche.masse().stufe;
    const rahmen = rahmenVon(buehne.ctx.rechtecke, stufe);
    gleich(rahmen.length, 3,
      `bei ${fenster} Punkten hat jedes lebende Wesen einen Balken, das tote keinen`);
    let mitFuellung = 0;
    for (const r of rahmen) {
      if (fuellungIn(buehne.ctx.rechtecke, r, FARBEN.hudGut).length > 0) mitFuellung++;
    }
    gleich(mitFuellung, 3,
      `bei ${fenster} Punkten ist in jedem Balken wirklich Farbe - nicht nur ein Rahmen`);
  }

  /* Drei Stufen, und jede muss anders aussehen. Ein Balken, der immer
     grün bleibt, sagt nichts, und man merkt es erst beim Sterben. */
  const stufenProbe = [
    { anteil: 1.0, farbe: FARBEN.hudGut, was: "voll ist grün" },
    { anteil: 0.5, farbe: FARBEN.hudWarn, was: "halb ist gelb" },
    { anteil: 0.1, farbe: FARBEN.hudSchlecht, was: "fast tot ist rot" }
  ];
  const breiten = [];
  for (const fall of stufenProbe) {
    const probe = macheProbe();
    probe.beute.lp = Math.round(probe.beute.lpMax * fall.anteil);
    const buehne = macheBuehne(probe.zustand, { fenster: 700 });
    buehne.flaeche.zeichne(probe.zustand, {});
    const stufe = buehne.flaeche.masse().stufe;
    const ecke = buehne.kamera.feldNachBild(probe.beute.x, probe.beute.y);
    const rahmen = rahmenVon(buehne.ctx.rechtecke, stufe).find((r) => r.x === ecke.x);
    behaupte(!!rahmen, `${fall.was}: der Balken steht über der Figur`);
    const fuellung = fuellungIn(buehne.ctx.rechtecke, rahmen, fall.farbe);
    gleich(fuellung.length, 1, `${fall.was}`);
    breiten.push(fuellung.length === 1 ? fuellung[0].b : -1);
  }
  behaupte(breiten[0] > breiten[1] && breiten[1] > breiten[2],
    `weniger Leben ist auch ein kürzerer Balken (${breiten.join(" > ")})`);

  /* Und wer nicht mehr lebt, bekommt keinen - sonst schwebte über jeder
     Leiche ein leerer Rahmen und man hielte sie für einen Gegner. */
  const tot = macheProbe();
  const b2 = macheBuehne(tot.zustand, { fenster: 700 });
  b2.flaeche.zeichne(tot.zustand, {});
  const stufe2 = b2.flaeche.masse().stufe;
  const ecke = b2.kamera.feldNachBild(tot.toter.x, tot.toter.y);
  gleich(rahmenVon(b2.ctx.rechtecke, stufe2).filter((r) => r.x === ecke.x).length, 0,
    "ein totes Wesen bekommt keinen Lebensbalken");
}

/* ── 5 · Die Zielangabe ───────────────────────────────────────────*/
abschnitt("5 · Zielangabe");
{
  const oben = macheProbe({ hoeheDesSchuetzen: 2 });
  const buehne = macheBuehne(oben.zustand);
  buehne.flaeche.zeichne(oben.zustand, { ziel: 2 });
  const texte = alleTexte(buehne.schrift);

  behaupte(enthaelt(buehne.schrift, "Trefferchance"), "die Trefferchance steht da");
  behaupte(texte.some((t) => t.includes("+12")),
    "ein Ziel mit Höhenvorteil zeigt +12");
  behaupte(texte.some((t) => t.includes("+12") && t.includes("oben")),
    "und sagt auch, woher die zwölf kommen");
  behaupte(enthaelt(buehne.schrift, "Schaden etwa"), "der erwartete Schaden steht da");
  behaupte(enthaelt(buehne.schrift, "Grundwert"), "der Grundwert der Waffe steht da");
  behaupte(texte.some((t) => t.includes("Flinkheit")),
    "das Ausweichen des Ziels wird begründet");
  behaupte(enthaelt(buehne.schrift, "Krätzling"), "das Ziel wird benannt");

  /* Die Probe, die eine bloß hübsche Anzeige nicht besteht: Die
     Summanden müssen die gezeigte Zahl **ergeben**. */
  /* Fehlt die Zeile ganz, soll die Prüfung das **melden** und nicht an
     ihr sterben: Ein Absturz sagt nicht, was fehlte. */
  const chanceZeile = texte.find((t) => t.startsWith("Trefferchance")) || "";
  behaupte(chanceZeile !== "", "es steht überhaupt eine Trefferchance da");
  const gezeigt = Number((chanceZeile.match(/(\d+)/) || [0, -1])[1]);
  let summe = 0;
  for (const t of texte) {
    const grund = t.match(/^Grundwert der Waffe (\d+) %/);
    if (grund) summe += Number(grund[1]);
    const zuschlag = t.match(/^([+-])(\d+) %/);
    if (zuschlag) summe += (zuschlag[1] === "+" ? 1 : -1) * Number(zuschlag[2]);
  }
  gleich(summe, gezeigt, "die genannten Gründe ergeben genau die gezeigte Trefferchance");
  gleich(gezeigt, 76, "74 % Grundwert, +12 % von oben, -10 % Flinkheit");

  /* Und die andere Richtung — der Fehler, den man beim Tippen macht
     (Fehlerbuch A4): Steht der Schütze **tiefer**, muss es -12 heißen. */
  const unten = macheProbe({ hoeheDesSchuetzen: EBENE_BODEN });
  unten.karte.setze(8, 5, { ebene: 2 });
  const b2 = macheBuehne(unten.zustand);
  b2.flaeche.zeichne(unten.zustand, { ziel: 2 });
  const t2 = alleTexte(b2.schrift);
  behaupte(t2.some((t) => t.includes("-12") && t.includes("unten")),
    "von unten zeigt die Anzeige -12, nicht +12");
  behaupte(!t2.some((t) => t.includes("+12")), "und eben nicht auch noch +12");

  /* Deckung: ein Fass auf dem Feld zwischen Ziel und Schützen. */
  const deckung = macheProbe();
  deckung.karte.setze(7, 5, { hindernis: HINDERNIS.fass });
  const b3 = macheBuehne(deckung.zustand);
  b3.flaeche.zeichne(deckung.zustand, { ziel: 2 });
  behaupte(alleTexte(b3.schrift).some((t) => t.includes("-20") && t.includes("Deckung")),
    "ein Fass neben dem Ziel wird als -20 % durch Deckung genannt");

  /* Zu weit weg: dann steht dort die Entfernung, nicht eine Chance. */
  const fern = macheProbe();
  fern.beute.x = 30;
  const b4 = macheBuehne(fern.zustand);
  b4.flaeche.zeichne(fern.zustand, { ziel: 2 });
  behaupte(alleTexte(b4.schrift).some((t) => t.includes("Zu weit")),
    "ein zu weit entferntes Ziel wird als zu weit gemeldet");
  behaupte(!enthaelt(b4.schrift, "Trefferchance"),
    "und bekommt keine Trefferchance, die es nicht gibt");
}

/* ── 6 · Die Höhenangabe ──────────────────────────────────────────*/
abschnitt("6 · Höhenangabe");
{
  const probe = macheProbe();
  /* Ein Graben zwei Ebenen unter dem Schützen: der Weg dorthin ist ein
     Sturz, und genau das muss vor dem Klicken zu lesen sein. */
  probe.karte.setze(6, 6, { ebene: 0 });
  const buehne = macheBuehne(probe.zustand);
  buehne.flaeche.zeichne(probe.zustand, { zeiger: { x: 6, y: 6 } });
  const texte = alleTexte(buehne.schrift);
  behaupte(texte.some((t) => t.includes("Ebene 0")), "die Ebene des Feldes steht da");
  behaupte(texte.some((t) => t.includes("Sturz")), "der Sturz wird angesagt");
  behaupte(texte.some((t) => t.includes("3 Schaden")),
    "mit dem Schaden: zwei Ebenen sind 3 Schaden");

  const flach = macheBuehne(probe.zustand);
  flach.flaeche.zeichne(probe.zustand, { zeiger: { x: 7, y: 5 } });
  behaupte(!alleTexte(flach.schrift).some((t) => t.includes("Sturz")),
    "ein Feld eine Ebene tiefer ist kein Sturz");

  const drauss = macheBuehne(probe.zustand);
  drauss.flaeche.zeichne(probe.zustand, { zeiger: { x: -3, y: 99 } });
  behaupte(alleTexte(drauss.schrift).some((t) => t.includes("Außerhalb")),
    "außerhalb der Karte wird das gesagt statt gerechnet");

  const wand = macheProbe();
  wand.karte.setze(7, 5, { hindernis: HINDERNIS.wand });
  const b2 = macheBuehne(wand.zustand);
  b2.flaeche.zeichne(wand.zustand, { zeiger: { x: 7, y: 5 } });
  behaupte(alleTexte(b2.schrift).some((t) => t.includes("geht niemand durch")),
    "eine Wand wird als unpassierbar gemeldet");
}

/* ── 7 · Die Zugleiste ────────────────────────────────────────────*/
abschnitt("7 · Zugleiste");
{
  const probe = macheProbe();
  const buehne = macheBuehne(probe.zustand, { fenster: 400 });
  buehne.flaeche.zeichne(probe.zustand, {});
  const mass = buehne.flaeche.masse();

  /* Die Zugleiste ist das Band ganz oben: Ihre Texte stehen auf der
     Höhe `polster`. Gefragt wird nach dem Maß, nicht nach einer hier
     nachgebauten Rechnung - zwei Rechnungen wären zwei Wahrheiten. */
  const oben = buehne.schrift.texte.filter((t) => t.y === mass.polster);
  gleich(oben.length, 4, "vier Wesen, vier Einträge in der Zugleiste");
  /* Fehlt ein Eintrag, soll die Prüfung das **melden** und nicht am
     fehlenden Feld sterben: Ein Absturz sagt nicht, was fehlte. */
  const eintragAn = (i) => (oben[i] || { text: "", x: -1, y: -1 });
  gleich(eintragAn(0).text, "Jannik", "vorn steht, wer am Zug ist");
  /* Acht Plätze auf 400 Bildpunkten heißt gekürzte Namen. Geprüft wird
     die Reihenfolge, nicht die Länge — und dass die Kürzung ehrlich ist:
     ein Punkt am Ende, und der Rest steht wirklich im Namen. */
  behaupte(eintragAn(1).text.startsWith("Grubenh"),
    `der Tote steht an seiner Stelle und wird nicht übersprungen (${eintragAn(1).text})`);
  behaupte(eintragAn(2).text.startsWith("Krätz"),
    `dahinter geht die Reihe unverändert weiter (${eintragAn(2).text})`);
  behaupte(eintragAn(3).text.startsWith("Knochen"), "und der letzte steht hinten");
  behaupte(eintragAn(1).text.endsWith("."), "ein gekürzter Name endet auf einem Punkt");
  behaupte("Grubenhund".startsWith(eintragAn(1).text.slice(0, -1)),
    "und der Rest steht wirklich so im Namen");

  /* Und er ist durchgestrichen: ein Strich in genau seiner Breite, auf
     seiner Höhe. Beides wird aus der Mitschrift gelesen. */
  const eintrag = eintragAn(1);
  const breiteDesNamens = SCHRIFT.breiteVon(eintrag.text) * mass.stufe;
  const striche = mitFarbe(buehne.ctx.rechtecke, FARBEN.hudSchlecht).filter((r) =>
    r.x === eintrag.x && r.b === breiteDesNamens
    && r.y > eintrag.y && r.y < eintrag.y + SCHRIFT.ZEICHEN_HOCH * mass.stufe);
  gleich(striche.length, 1, "über dem Namen des Toten liegt genau ein Strich");
  gleich((striche[0] || {}).h, mass.stufe, "der Strich ist einen logischen Punkt hoch");

  /* Der Lebende daneben bekommt keinen. */
  const lebend = eintragAn(2);
  const falsch = mitFarbe(buehne.ctx.rechtecke, FARBEN.hudSchlecht).filter((r) =>
    r.x === lebend.x && r.y > lebend.y
    && r.y < lebend.y + SCHRIFT.ZEICHEN_HOCH * mass.stufe);
  gleich(falsch.length, 0, "ein lebendes Wesen wird nicht durchgestrichen");

  behaupte(ZUGLEISTE_WESEN === 8, "die Zugleiste ist auf acht Wesen ausgelegt");
}

/* ── 8 · Die Aktionsleiste ────────────────────────────────────────*/
abschnitt("8 · Aktionsleiste");
{
  const probe = macheProbe();
  const buehne = macheBuehne(probe.zustand, { fenster: 900 });
  buehne.flaeche.zeichne(probe.zustand, {});
  const texte = alleTexte(buehne.schrift);

  behaupte(texte.some((t) => t.includes("Gehen")), "Gehen steht in der Leiste");
  behaupte(texte.some((t) => t.includes("Zug beenden")), "Zug beenden steht in der Leiste");
  behaupte(texte.some((t) => t.trim() === TASTEN.gehen),
    "die Taste für Gehen steht davor");
  behaupte(texte.some((t) => t.includes("je Feld")),
    "beim Gehen steht der Preis je Feld, nicht ein erfundener Gesamtpreis");
  /* Der Preis muss der **echte** sein. Eine Leiste, die überall dieselbe
     Zahl schreibt, bestünde ein bloßes „irgendwo steht AP" — und der
     Spieler plante seinen Zug mit einer erfundenen Zahl. Deshalb wird
     gegen den Katalog gemessen, und zweimal mit verschiedenen Waffen. */
  const preise = (b) => alleTexte(b.schrift).filter((t) => /^\d+ AP$/.test(t));
  behaupte(preise(buehne).length > 0, "die anderen Aktionen nennen ihre Punkte");
  behaupte(preise(buehne).includes(`${waffe("kurzbogen").ap} AP`),
    `der Kurzbogen steht mit seinen ${waffe("kurzbogen").ap} Punkten in der Leiste`);

  const schwer = macheProbe();
  schwer.schuetze.waffe = "armbrust";
  const b3 = macheBuehne(schwer.zustand, { fenster: 900 });
  b3.flaeche.zeichne(schwer.zustand, {});
  behaupte(preise(b3).includes(`${waffe("armbrust").ap} AP`),
    `eine andere Waffe zeigt einen anderen Preis (${waffe("armbrust").ap} AP)`);
  behaupte(waffe("armbrust").ap !== waffe("kurzbogen").ap,
    "die beiden Waffen kosten wirklich verschieden viel - sonst prüfte das nichts");

  /* Die Gruppen kommen aus `moeglicheAktionen` — die Anzeige denkt sich
     keine Aktion aus, die der Kern ablehnen würde. */
  const gruppen = buehne.flaeche.aktionsGruppen(probe.zustand, probe.schuetze);
  behaupte(gruppen.length > 0, "es gibt mögliche Aktionen");
  behaupte(gruppen.some((g) => g.typ === AKTION.gehen), "Gehen ist dabei");
  behaupte(gruppen.some((g) => g.typ === AKTION.zugEnde), "Zug beenden ist dabei");
  const arten = gruppen.map((g) => g.art);
  gleich(new Set(arten).size, arten.length, "jede Art steht genau einmal in der Leiste");

  /* Ohne Punkte bleibt nur, was nichts kostet. */
  const leer = macheProbe();
  leer.schuetze.ap = 0;
  const b2 = macheBuehne(leer.zustand, { fenster: 900 });
  b2.flaeche.zeichne(leer.zustand, {});
  const g2 = b2.flaeche.aktionsGruppen(leer.zustand, leer.schuetze);
  behaupte(!g2.some((g) => g.typ === AKTION.angriff),
    "ohne Punkte steht kein Angriff in der Leiste");
  behaupte(g2.some((g) => g.typ === AKTION.zugEnde), "Zug beenden bleibt");

  /* Der Fall, den ein breites Fenster verdeckt: Auf schmalem Schirm
     reicht der Platz nicht für alle Einträge. Fällt dabei „Zug beenden"
     heraus, steckt der Spieler fest — es gibt keinen anderen Weg aus
     dem Zug. Also muss es bei **jeder** Breite stehen. */
  let jeAbgeschnitten = false;
  for (const fenster of [340, 400, 500, 700, 1400]) {
    const eng = macheProbe();
    const be = macheBuehne(eng.zustand, { fenster });
    be.flaeche.zeichne(eng.zustand, {});
    const et = alleTexte(be.schrift);
    behaupte(et.some((t) => t.includes("Zug beenden")),
      `bei ${fenster} Punkten steht "Zug beenden" in der Leiste`);
    if (!et.some((t) => t.includes("Wacht"))) jeAbgeschnitten = true;
    const m = be.flaeche.masse();
    behaupte(be.ctx.rechtecke.every((r) => !draussen(r, m.breite, m.hoehe)),
      `bei ${fenster} Punkten bleibt die Leiste im Fenster`);
  }
  behaupte(jeAbgeschnitten,
    "auf schmalem Schirm fällt wirklich etwas aus der Leiste - sonst prüfte das nichts");
}

/* ── 9 · Lauftext und Spielerleiste ───────────────────────────────*/
abschnitt("9 · Lauftext und Spieler");
{
  const probe = macheProbe();
  probe.zustand.ereignisse = [
    { art: "rundeNeu", nummer: 1 },
    { art: "apGesetzt", wer: 1, ap: 6 },
    { art: "angriff", wer: 1, ziel: 2, treffer: true },
    { art: "schaden", wer: 2, wieviel: 4, quelle: "angriff", lpRest: 6, art2: "stich" },
    { art: "gestossen", wer: 2, von: { x: 8, y: 5 }, nach: { x: 9, y: 5 } },
    { art: "gestuerzt", wer: 2, von: { x: 8, y: 5 }, nach: { x: 9, y: 5 },
      stufen: 2, schaden: 3 },
    { art: "gestorben", wer: 2, x: 9, y: 5 },
    { art: "zugEnde", wer: 1 }
  ];
  const buehne = macheBuehne(probe.zustand, { fenster: 900 });
  buehne.flaeche.zeichne(probe.zustand, {});
  const texte = alleTexte(buehne.schrift);
  const saetze = texte.filter((t) => t.endsWith("."));
  behaupte(saetze.length >= LAUFTEXT_ZEILEN,
    "der Lauftext zeigt sechs Sätze");
  behaupte(texte.some((t) => t.includes("fällt und steht nicht wieder auf")),
    "das neueste Ereignis steht drin");
  behaupte(!texte.some((t) => t.includes("Runde 1 beginnt")),
    "das siebtälteste ist herausgerollt - sonst wären es keine sechs");

  /* Fertige Sätze von außen haben Vorrang: Das Spiel führt sein eigenes
     Protokoll, und die Anzeige erfindet keins daneben. */
  const eigen = macheBuehne(probe.zustand, { fenster: 900 });
  eigen.flaeche.zeichne(probe.zustand, { meldungen: ["Ein eigener Satz."] });
  behaupte(enthaelt(eigen.schrift, "Ein eigener Satz."), "gereichte Meldungen werden gezeigt");

  const netz = macheBuehne(probe.zustand, { fenster: 900 });
  netz.flaeche.zeichne(probe.zustand, {
    spieler: [
      { platz: 1, name: "Jannik", selbst: true, verbunden: true },
      { platz: 2, name: "Tim", selbst: false, verbunden: false }
    ]
  });
  const nt = alleTexte(netz.schrift);
  behaupte(nt.some((t) => t.includes("Jannik") && t.includes("verbunden")),
    "die Spielerleiste nennt Namen und Verbindungszustand");
  behaupte(nt.some((t) => t.includes("Tim") && t.includes("getrennt")),
    "ein getrennter Spieler wird als getrennt gezeigt");
  behaupte(nt.some((t) => t.includes("(du)")), "man sieht, wer man selbst ist");

  /* Ohne Netzangabe sitzt der Spieler an diesem Rechner. */
  const daheim = macheBuehne(probe.zustand, { fenster: 900 });
  daheim.flaeche.zeichne(probe.zustand, {});
  behaupte(alleTexte(daheim.schrift).some((t) => t.includes("Jannik") && t.includes("hier")),
    "ohne Netzangabe steht hier statt einer erfundenen Verbindung");
}

/* ── 10 · Die Rundeneinblendung ────────────────────────────────────*/
abschnitt("10 · Runde N");
{
  const probe = macheProbe();
  probe.zustand.runde = 7;
  const gleich0 = macheBuehne(probe.zustand, { fenster: 900 });
  gleich0.flaeche.zeichne(probe.zustand, { zeit: 10, rundeSeit: 10 });
  behaupte(enthaelt(gleich0.schrift, "Runde 7"), "gleich nach dem Wechsel steht Runde 7");

  const spaeter = macheBuehne(probe.zustand, { fenster: 900 });
  spaeter.flaeche.zeichne(probe.zustand, { zeit: 10 + RUNDE_EINBLENDUNG + 0.1, rundeSeit: 10 });
  behaupte(!enthaelt(spaeter.schrift, "Runde 7"), "danach ist sie wieder weg");

  const ohneUhr = macheBuehne(probe.zustand, { fenster: 900 });
  ohneUhr.flaeche.zeichne(probe.zustand, {});
  behaupte(!enthaelt(ohneUhr.schrift, "Runde 7"),
    "ohne Zeitangabe blendet nichts ein - die Anzeige hat keine eigene Uhr");
}

/* ── 11 · Ganze Bildpunkte und der Fensterrand ────────────────────*/
abschnitt("11 · Bildpunkte und Rand");
{
  /* Vier Fenstergrößen, damit auch die Vergrößerungen 1 bis 3 mitlaufen:
     Eine Rechnung, die nur bei einfacher Vergrößerung ganzzahlig
     aufgeht, ist der übliche Weg zu halben Bildpunkten. */
  const groessen = [400, 700, 1024, 1400];
  const stufen = new Set();
  let alleGanz = true;
  let alleDrin = true;
  let rechteckeGesamt = 0;

  for (const fenster of groessen) {
    const probe = macheProbe();
    probe.karte.setze(6, 6, { ebene: 0 });
    const buehne = macheBuehne(probe.zustand, { fenster });
    buehne.flaeche.zeichne(probe.zustand, {
      geplant: { typ: AKTION.angriff, wer: 1, ziel: 2 },
      ziel: 2,
      zeiger: { x: 6, y: 6 },
      zeit: 1, rundeSeit: 1,
      spieler: [{ platz: 1, name: "Jannik", selbst: true, verbunden: true }]
    });
    const mass = buehne.flaeche.masse();
    stufen.add(mass.stufe);
    rechteckeGesamt += buehne.ctx.rechtecke.length;
    for (const r of buehne.ctx.rechtecke) {
      if (!ganzzahlig(r)) alleGanz = false;
      if (draussen(r, mass.breite, mass.hoehe)) alleDrin = false;
    }
    for (const t of buehne.schrift.texte) {
      if (!Number.isInteger(t.x) || !Number.isInteger(t.y)) alleGanz = false;
      if (!Number.isInteger(t.gross)) alleGanz = false;
    }
    behaupte(buehne.ctx.glaettung.length > 0 && buehne.ctx.glaettung.every((w) => w === false),
      `bei ${fenster} Punkten wird die Glättung abgeschaltet und nie wieder an`);
    /* Und zwar **zuerst**: Das Setzen der Blattmaße stellt die Glättung
       zurück, und der erste Punkt eines Bildes fällt sonst geglättet. */
    const erster = buehne.ctx.aufrufe[0] || [];
    behaupte(erster[0] === "glaettung" && erster[1] === false,
      `bei ${fenster} Punkten wird die Glättung vor dem ersten Punkt abgeschaltet`);
  }
  behaupte(rechteckeGesamt > 400, `es wurde wirklich gezeichnet (${rechteckeGesamt} Rechtecke)`);
  behaupte(stufen.size >= 3, `es liefen mehrere Vergrößerungen mit (${[...stufen].join(", ")})`);
  behaupte(alleGanz, "jede Position liegt auf einem ganzen Bildpunkt");
  behaupte(alleDrin, "nichts wird außerhalb des Fensters gezeichnet");
}

/* ── 12 · Der Fensterrand, mit Absicht überschritten ──────────────

   Der Fall, der ohne die Schere falsch wäre. Er muss **gestellt** werden:
   Auf einer Karte, die ganz ins Fenster passt, ragt nie etwas hinaus, und
   eine Prüfung, die nur „alles liegt drin" behauptet, wäre auch ohne jede
   Schere grün. Also wird die Kamera so gestellt, dass die Karte über
   beide Fensterkanten hinausreicht, und je eine Figur genau auf die
   Kante gesetzt — links angeschnitten und rechts angeschnitten. */
abschnitt("12 · Die Schere");
{
  const nah = macheProbe({ weitWeg: false });
  const fern = macheProbe({ weitWeg: true });
  const b1 = macheBuehne(nah.zustand);
  const b2 = macheBuehne(fern.zustand);
  b1.flaeche.zeichne(nah.zustand, {});
  b2.flaeche.zeichne(fern.zustand, {});
  behaupte(b2.ctx.rechtecke.length < b1.ctx.rechtecke.length,
    "eine Figur außerhalb des Ausschnitts trägt nichts zum Bild bei");

  /* 410 und nicht 400: Bei 400 fiele die Fensterkante genau auf eine
     Feldkante (16 teilt 400), und dann ragte nichts an — die Prüfung
     hätte nichts zu schneiden. */
  const probe = macheProbe();
  const buehne = macheBuehne(probe.zustand, { fenster: 410, folgeAuf: { x: 20, y: 15 } });
  const mass = buehne.flaeche.masse();
  const linkeKante = buehne.kamera.bildNachFeld(-1, 100);
  const rechteKante = buehne.kamera.bildNachFeld(mass.breite, 100);
  probe.beute.x = linkeKante.x;
  probe.beute.y = 15;
  probe.letzter.x = rechteKante.x;
  probe.letzter.y = 15;

  const linksEcke = buehne.kamera.feldNachBild(probe.beute.x, probe.beute.y);
  const rechtsEcke = buehne.kamera.feldNachBild(probe.letzter.x, probe.letzter.y);
  const voll = KACHEL * mass.stufe;
  behaupte(linksEcke.x < 0 && linksEcke.x + voll > 0,
    `die linke Figur ragt wirklich hinaus (Ecke ${linksEcke.x})`);
  behaupte(rechtsEcke.x < mass.breite && rechtsEcke.x + voll > mass.breite,
    `die rechte Figur ragt wirklich hinaus (Ecke ${rechtsEcke.x})`);

  buehne.flaeche.zeichne(probe.zustand, {});
  const rahmen = mitFarbe(buehne.ctx.rechtecke, FARBEN.kontur).filter((r) => r.b < voll);
  const links = rahmen.filter((r) => r.x === 0 && r.b === linksEcke.x + voll);
  const rechts = rahmen.filter((r) =>
    r.x === rechtsEcke.x && r.x + r.b === mass.breite);
  gleich(links.length, 1, "der linke Lebensbalken endet genau an der linken Kante");
  gleich(rechts.length, 1, "der rechte endet genau an der rechten Kante");
  behaupte(buehne.ctx.rechtecke.every((r) => !draussen(r, mass.breite, mass.hoehe)),
    "und kein Bildpunkt liegt außerhalb des Fensters");
}

/* ── 13 · Deutsch, und nichts als Deutsch ─────────────────────────*/
abschnitt("13 · Sprache");
{
  const probe = macheProbe();
  probe.karte.setze(6, 6, { ebene: 0 });
  probe.zustand.ereignisse = [
    { art: "beute", wer: 1, was: "gold" },
    { art: "hindernisWeg", x: 4, y: 7, was: HINDERNIS.fass },
    { art: "wacht", wer: 1 },
    { art: "seiteDran", seite: "brut" },
    { art: "lichtNeu", x: 4, y: 7, staerke: 1 },
    { art: "ebeneGewechselt", wer: 1, von: 2, nach: 1 }
  ];
  const buehne = macheBuehne(probe.zustand, { fenster: 1024 });
  buehne.flaeche.zeichne(probe.zustand, {
    geplant: { typ: AKTION.angriff, wer: 1, ziel: 2 },
    ziel: 2, zeiger: { x: 6, y: 6 }, zeit: 2, rundeSeit: 2,
    spieler: [{ platz: 1, name: "Jannik", selbst: true, verbunden: true }]
  });
  const texte = alleTexte(buehne.schrift);
  behaupte(texte.length > 20, `es wurden viele Texte gezeichnet (${texte.length})`);

  /* Kein leerer Text. Ein leerer sähe im Bild aus wie gar nichts und
     wäre trotzdem ein Fehler in der Rechnung darüber. */
  gleich(texte.filter((t) => t.trim() === "").length, 0, "kein Text ist leer");

  /* Jedes Zeichen muss die Pixelschrift kennen. Ein Gedankenstrich oder
     ein typografisches Anführungszeichen wird sonst als Kasten gemalt -
     im Bild sieht man einen Kasten, in keiner Prüfung sieht man etwas. */
  const fremd = new Set();
  for (const t of texte) for (const z of t) if (!(z in SCHRIFT.ZEICHEN)) fremd.add(z);
  gleich(fremd.size, 0,
    `jedes Zeichen steht im Vorrat der Schrift (fremd: ${[...fremd].join(" ")})`);

  /* Ersatzschreibungen statt Umlaut - genau die, die in diesen Texten
     vorkommen könnten. Eine Rundumsuche nach "ss" verböte "Fass". */
  const ersatzWoerter = [
    "Hoeh", "hoehe", "Staerk", "Ruestun", "Spiess", "Jaeger", "Faehigkei",
    "Naechst", "Traenk", "Loes", "Zuege", "Schliess", "Grabraeuber",
    "Krae", "Bogenschuetz", "ueber", "fuer"
  ];
  const schlecht = texte.filter((t) => ersatzWoerter.some((w) => t.includes(w)));
  gleich(schlecht.length, 0, `keine Ersatzschreibung statt Umlaut (${schlecht.join(" | ")})`);

  const englischeWoerter = [
    "hit", "chance", "damage", "round", "turn", "player", "action", "point",
    "points", "health", "move", "attack", "cover", "level", "target", "log",
    "next", "dead", "cost", "range"
  ];
  const englisch = new RegExp(`\\b(${englischeWoerter.join("|")})\\b`, "i");
  const fremdwort = texte.filter((t) => englisch.test(t));
  gleich(fremdwort.length, 0, `kein englisches Wort (${fremdwort.join(" | ")})`);

  /* Und positiv: Die sechs Auskünfte, ohne die der Auftraggeber nicht
     spielen kann, stehen wirklich auf dem Bild. */
  for (const pflicht of ["Trefferchance", "Schaden", "Ebene", "Runde", "Gehen", "Jannik"]) {
    behaupte(texte.some((t) => t.includes(pflicht)), `"${pflicht}" steht auf dem Bild`);
  }
}

/* ── 14 · Auf einem echten Lauf ───────────────────────────────────

   Die Puppenstube oben ist von Hand gestellt. Hier läuft dieselbe
   Anzeige über eine gewürfelte Karte mit gewürfelter Brut — der Fall,
   in dem eine Anzeige mit stillen Annahmen über die Karte umfällt. */
abschnitt("14 · Echter Lauf");
{
  for (const saat of [12345, 777, 20260906]) {
    const zustand = macheLauf({ saat, spielerZahl: 2, tiefe: 1, breite: 30, hoehe: 24 });
    const ctx = macheErsatzflaeche();
    const schrift = macheErsatzschrift();
    const kamera = macheKamera({ fensterBreite: 800, fensterHoehe: 600, karte: zustand.karte });
    const held = zustand.wesen[0];
    kamera.folge(held.x, held.y, true);
    const flaeche = macheOberflaeche({ ctx, schrift, kamera });
    const feind = zustand.wesen.find((w) => w.seite === "brut");
    const gezeichnet = flaeche.zeichne(zustand, {
      geplant: { typ: AKTION.angriff, wer: held.id, ziel: feind.id },
      ziel: feind.id,
      zeiger: { x: held.x, y: held.y + 1 },
      zeit: 0.5, rundeSeit: 0.5
    });
    const mass = flaeche.masse();
    behaupte(gezeichnet > 200, `Saat ${saat}: es wurde gezeichnet (${gezeichnet} Rechtecke)`);
    behaupte(ctx.rechtecke.every(ganzzahlig), `Saat ${saat}: alles auf ganzen Bildpunkten`);
    behaupte(ctx.rechtecke.every((r) => !draussen(r, mass.breite, mass.hoehe)),
      `Saat ${saat}: nichts außerhalb des Fensters`);
    behaupte(schrift.texte.every((t) => t.text.trim() !== ""),
      `Saat ${saat}: kein leerer Text`);
    behaupte(schrift.texte.some((t) => t.text.includes("Runde")),
      `Saat ${saat}: die Runde wird eingeblendet`);

    /* Zweimal dasselbe Bild bei gleicher Eingabe: Die Anzeige würfelt
       nicht und merkt sich nichts, was sie nicht darf. */
    const ctx2 = macheErsatzflaeche();
    const schrift2 = macheErsatzschrift();
    const kamera2 = macheKamera({ fensterBreite: 800, fensterHoehe: 600, karte: zustand.karte });
    kamera2.folge(held.x, held.y, true);
    const flaeche2 = macheOberflaeche({ ctx: ctx2, schrift: schrift2, kamera: kamera2 });
    flaeche2.zeichne(zustand, {
      geplant: { typ: AKTION.angriff, wer: held.id, ziel: feind.id },
      ziel: feind.id,
      zeiger: { x: held.x, y: held.y + 1 },
      zeit: 0.5, rundeSeit: 0.5
    });
    gleich(JSON.stringify(ctx2.rechtecke), JSON.stringify(ctx.rechtecke),
      `Saat ${saat}: zweimal dieselbe Eingabe gibt byteweise dasselbe Bild`);
  }
}

/* ── 15 · Was ohne Zustand geschieht ──────────────────────────────*/
abschnitt("15 · Ohne Zustand");
{
  const probe = macheProbe();
  const buehne = macheBuehne(probe.zustand);
  gleich(buehne.flaeche.zeichne(null, {}), 0, "ohne Spielstand wird nichts gezeichnet");
  gleich(buehne.flaeche.zeichne(undefined), 0, "und geworfen wird auch nicht");
  behaupte(buehne.flaeche.zeichne(probe.zustand) > 0,
    "ohne Ansicht wird trotzdem gezeichnet");
  behaupte(buehne.flaeche.zeichne(probe.zustand, { ziel: 999 }) > 0,
    "eine unbekannte Zielnummer wirft nicht");
  behaupte(buehne.flaeche.zeichne(probe.zustand, { geplant: { typ: "gibtEsNicht", wer: 1 } }) > 0,
    "eine unbekannte Aktionsart wirft nicht");
}

/* ── 16 · Die Zielangabe ohne Zeiger ──────────────────────────────

   Der Fall, der ohne diese Prüfung falsch wäre — und der am Schreibtisch
   nie auffällt: Die Zielangabe hängt heute am **Schweben**. Ein Finger
   schwebt nicht. Auf dem Telefon bekäme man Trefferchance und Begründung
   also nie zu sehen, und aus dem taktischen Spiel würde ein Ratespiel.

   Am Finger bleibt der Zeiger dort liegen, wo zuletzt getippt wurde —
   er **ist** die Anwahl. Geprüft wird deshalb, dass ein angetipptes
   Wesen dieselbe Auskunft bekommt wie ein überfahrenes, und dass die
   Anzeige sich dafür keine eigene Anwahl ausdenkt: Ohne `finger` ändert
   sich nichts. */
abschnitt("16 · Zielangabe am Finger");
{
  /* Die Zugleiste nennt **alle** Namen, auch den der Beute. Gefragt ist
     hier aber, wen die **Zielangabe** nennt - also wird nur gelesen, was
     unterhalb des oberen Bandes steht. */
  const unterhalb = (buehne) => buehne.schrift.texte
    .filter((t) => t.y > buehne.flaeche.masse().zugHoehe).map((t) => t.text);

  /* Die Beute steht auf 8,5 - derselbe Platz, den sonst `ziel: 2` nennt. */
  const probe = macheProbe();
  const getippt = macheBuehne(probe.zustand, { fenster: 900 });
  getippt.flaeche.zeichne(probe.zustand, { zeiger: { x: 8, y: 5 } }, { finger: true });
  const texte = alleTexte(getippt.schrift);
  behaupte(texte.some((t) => t.startsWith("Trefferchance")),
    "ein angetipptes Wesen zeigt seine Trefferchance");
  behaupte(unterhalb(getippt).some((t) => t.includes("Krätzling")),
    "und wird in der Zielangabe benannt");
  behaupte(texte.some((t) => t.includes("+12") && t.includes("oben")),
    "samt Begründung - dieselbe wie beim Schweben");

  /* Dieselbe Stellung ohne Finger: Der Zeiger ist dann ein Zeiger und
     keine Anwahl, und die Anzeige erfindet keine. */
  const ohne = macheBuehne(macheProbe().zustand, { fenster: 900 });
  ohne.flaeche.zeichne(probe.zustand, { zeiger: { x: 8, y: 5 } });
  behaupte(!enthaelt(ohne.schrift, "Trefferchance"),
    "ohne Finger bleibt der Zeiger ein Zeiger und keine Anwahl");

  /* Und der Fall, den man beim Bauen vergisst: Wird ausdrücklich ein
     Ziel gereicht, gilt **das** - nicht das Wesen unter dem Zeiger.
     Sonst überschriebe die Anwahl die Absicht des Spielers. */
  const beides = macheBuehne(macheProbe().zustand, { fenster: 900 });
  beides.flaeche.zeichne(probe.zustand,
    { ziel: 4, zeiger: { x: 8, y: 5 } }, { finger: true });
  behaupte(unterhalb(beides).some((t) => t.includes("Knochendiener")),
    "ein ausdrücklich gereichtes Ziel hat Vorrang vor dem Zeiger");
  behaupte(!unterhalb(beides).some((t) => t.includes("Krätzling")),
    "und das Wesen unter dem Zeiger steht dann nicht auch noch in der Zielangabe");

  /* Ein leeres Feld ist kein Ziel, und ein Toter auch nicht: Beides
     dürfte keine Trefferchance erfinden. */
  const leer = macheBuehne(macheProbe().zustand, { fenster: 900 });
  leer.flaeche.zeichne(probe.zustand, { zeiger: { x: 20, y: 20 } }, { finger: true });
  behaupte(!enthaelt(leer.schrift, "Trefferchance"),
    "ein leeres Feld bekommt keine Trefferchance");
  const tot = macheBuehne(macheProbe().zustand, { fenster: 900 });
  tot.flaeche.zeichne(probe.zustand,
    { zeiger: { x: probe.toter.x, y: probe.toter.y } }, { finger: true });
  behaupte(!enthaelt(tot.schrift, "Trefferchance"),
    "ein totes Wesen bekommt keine Trefferchance");

  /* Und die Zielangabe steht **über** der Leiste, nicht darunter: Am
     Finger ist die Leiste höher, und ein Kasten, der darunter rutscht,
     ist aus dem Bild. */
  const mass = getippt.flaeche.masse();
  const chance = getippt.schrift.texte.find((t) => t.text.startsWith("Trefferchance"));
  behaupte(!!chance && chance.y + mass.zeile <= mass.hoehe - mass.leisteHoehe,
    `die Zielangabe bleibt über der Leiste (${chance && chance.y} von `
    + `${mass.hoehe - mass.leisteHoehe})`);
  behaupte(getippt.ctx.rechtecke.every((r) => !draussen(r, mass.breite, mass.hoehe)),
    "und nichts wird dabei aus dem Fenster gemalt");
}

ende("Oberfläche");
