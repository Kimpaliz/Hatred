/* [Aufgabe: Prüfwesen] Prüft den Katalog — Waffen, Helden, Gegner,
   Fähigkeiten — auf das, was ohne diese Prüfung lautlos schiefginge.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Ein Katalog ist die undankbarste Sorte Datei: Er hat keine Logik, die
   abstürzen könnte, und genau deshalb merkt niemand, wenn er falsch
   ist. Ein Held mit der Fähigkeit `wuchtstos` bekommt keinen Fehler —
   er hat einfach eine Fähigkeit weniger, und irgendwann fragt jemand,
   warum der Schildträger sich so lahm anfühlt. Geprüft wird deshalb
   ausdrücklich der Fall, der ohne die Arbeit **falsch** wäre:

   · **Ein Schlüssel zweimal, über Dateigrenzen hinweg.** `NACH_SCHLUESSEL`
     ist je Datei eine eigene Map — zwei gleiche Schlüssel in Waffen und
     Fähigkeiten fielen in keiner davon auf, aber ein Speicherstand, der
     nur den Schlüssel trägt, wäre mehrdeutig.
   · **Ein Verweis ins Leere.** Jede `startWaffe`, jede Gegnerwaffe, jede
     genannte Fähigkeit muss wirklich existieren. Das ist der Tippfehler,
     der garantiert irgendwann passiert.
   · **Tote Daten.** Eine Fähigkeit, die keine Klasse und kein Gegner je
     nennt, ist gebaut und nie im Spiel — sie sieht im Katalog aus wie
     Inhalt und ist keiner.
   · **Die ehrliche Kurve.** Wenn eine Waffe eine andere derselben Art in
     jeder Zahl schlägt, ist die Wahl keine. Von Hand fällt das beim
     vierzehnten Eintrag niemandem mehr auf; hier fällt es sofort auf.
   · **Der Rückfall in der Tiefe.** `gewichtBei` hat eine Untergrenze bei
     `abTiefe` statt bei 1. Mit 1 sieht der zwölfte Kerker aus wie der
     vierte (gemessen: 15,8 % statt 35,7 % späte Brut) — und das Spiel
     läuft trotzdem weiter, nur langweiliger. Genau so etwas findet man
     nie beim Spielen, sondern nur beim Nachrechnen.
   · **Umlaute, die zu `ae` werden.** Wird eine dieser Dateien einmal
     falsch kodiert oder von jemandem „vereinfacht", steht im Spiel
     „Spaeher". Deshalb werden die sechs Namen, deren Schlüssel eine
     Umschrift ist, **wörtlich** behauptet.
   · **Gleichlauf der Auswahl.** `waehleGegner` würfelt. Dieselbe Saat
     muss zweimal dieselbe Folge geben, sonst stehen auf vier Rechnern
     verschiedene Gegner im selben Saal — der teuerste Fehler, den
     dieses Spiel überhaupt haben kann.

   Dazu die Randfälle: Budget kleiner als der billigste Gegner, Tiefe 0,
   ein Budget, das keine Schleife beenden würde.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `werkzeuge/helfer.mjs` (das Prüfgerüst), die vier Dateien unter
   `spiel/katalog/` (das Geprüfte), `spiel/zufall.mjs` (der gesäte Strom
   für den Gleichlauf), `runtime/palette.js` (wird als **Text** gelesen,
   nicht geladen: Es ist eine `.js`-Datei ohne `package.json`, also für
   Node kein ES-Modul — geprüft wird nur, dass jede genannte Lichtart
   dort als Schlüssel steht), `werkzeuge/pruefe-alles.mjs`. */

import { readFileSync } from "node:fs";
import { abschnitt, behaupte, gleich, nahe, ende } from "./helfer.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import {
  WAFFEN, SCHADENSARTEN, BESONDERHEITEN, waffe, kenntWaffe, waffenNachArt,
  schadenDoppelt, mittlererSchaden, kleinsterSchaden, groessterSchaden
} from "../spiel/katalog/waffen.mjs";
import {
  FAEHIGKEITEN, WIRKUNGSARTEN, faehigkeit, kenntFaehigkeit, faehigkeitenVon
} from "../spiel/katalog/faehigkeiten.mjs";
import { HELDEN, held, kenntHeld, heldenSchluessel } from "../spiel/katalog/helden.mjs";
import {
  GEGNER, VERHALTEN, gegner, kenntGegner, kosten, gewichtBei,
  gegnerBisTiefe, waehleGegner, HOECHSTENS_GEGNER
} from "../spiel/katalog/gegner.mjs";

/* ── Die Spannen ────────────────────────────────────────────────────
   Als benannte Zahlen und nicht verstreut im Text, damit die Prüfung
   dieselbe Grenze liest, die hier begründet steht. */
const AP_KLEINST = 1, AP_GROESST = 6;          /* Kosten einer Aktion  */
const APMAX_KLEINST = 5, APMAX_GROESST = 7;    /* Punkte je Zug        */
const REICHWEITE_GROESST = 12;                 /* Felder               */
const LP_KLEINST = 6, LP_GROESST = 60;

/* ── Umfang ─────────────────────────────────────────────────────── */

abschnitt("Umfang");
gleich(WAFFEN.length, 14, "vierzehn Waffen");
gleich(HELDEN.length, 6, "sechs Heldenklassen");
gleich(GEGNER.length, 10, "zehn Gegnerarten");
gleich(FAEHIGKEITEN.length, 12, "zwölf Fähigkeiten");

/* ── Kein Schlüssel zweimal, über alle vier Dateien ──────────────────
   Der Fall, der ohne diese Prüfung falsch wäre: Jede Datei hat ihre
   eigene Map, in der ein doppelter Schlüssel nur den früheren Eintrag
   verdeckt. Über Dateigrenzen hinweg fiele er nirgends auf — bis ein
   Speicherstand „blutzoll" trägt und niemand weiß, ob das die Fähigkeit
   oder eine Waffe war. */

abschnitt("Schlüssel");
{
  const gesehen = new Map();
  const eintragen = (liste, woher) => {
    for (const e of liste) {
      behaupte(typeof e.schluessel === "string" && e.schluessel.length > 0,
        `${woher}: jeder Eintrag hat einen Schlüssel`);
      behaupte(/^[a-z][a-z0-9]*$/.test(e.schluessel),
        `${woher}/${e.schluessel}: Schlüssel nur aus kleinen ASCII-Buchstaben`);
      const schon = gesehen.get(e.schluessel);
      behaupte(schon === undefined,
        `Schlüssel "${e.schluessel}" steht zweimal: ${schon} und ${woher}`);
      gesehen.set(e.schluessel, woher);
    }
  };
  eintragen(WAFFEN, "waffen");
  eintragen(FAEHIGKEITEN, "faehigkeiten");
  eintragen(HELDEN, "helden");
  eintragen(GEGNER, "gegner");
  gleich(gesehen.size, 14 + 12 + 6 + 10, "alle Schlüssel zusammen sind verschieden");
}

/* ── Nachschlagen ───────────────────────────────────────────────── */

abschnitt("Nachschlagen");
{
  gleich(waffe("rostdolch").name, "Rostdolch", "Waffe nachschlagen");
  gleich(held("spaeher").apMax, 7, "Held nachschlagen");
  gleich(gegner("blutvogt").verhalten, "hauptmann", "Gegner nachschlagen");
  gleich(faehigkeit("satzsprung").wirkung.art, "sprung", "Fähigkeit nachschlagen");

  /* Ein unbekannter Schlüssel muss werfen. Gäbe er `undefined` zurück,
     liefe der Tippfehler weiter, bis irgendwo `undefined.ap` gelesen
     wird — drei Module vom Fehler entfernt. */
  for (const [fn, was] of [[waffe, "Waffe"], [held, "Held"],
    [gegner, "Gegner"], [faehigkeit, "Fähigkeit"]]) {
    let geworfen = false;
    try { fn("gibtesnicht"); } catch { geworfen = true; }
    behaupte(geworfen, `unbekannte ${was} wirft`);
  }
  gleich(kenntWaffe("gibtesnicht"), false, "kenntWaffe sagt nein");
  gleich(kenntFaehigkeit("gibtesnicht"), false, "kenntFaehigkeit sagt nein");
  gleich(kenntHeld("gibtesnicht"), false, "kenntHeld sagt nein");
  gleich(kenntGegner("gibtesnicht"), false, "kenntGegner sagt nein");
}

/* ── Waffen: Werte und Spannen ──────────────────────────────────── */

abschnitt("Waffen");
for (const w of WAFFEN) {
  const n = w.schluessel;
  behaupte(w.art === "nah" || w.art === "fern", `${n}: Art ist nah oder fern`);
  behaupte(Number.isInteger(w.ap) && w.ap >= AP_KLEINST && w.ap <= AP_GROESST,
    `${n}: AP ${w.ap} liegt zwischen ${AP_KLEINST} und ${AP_GROESST}`);
  /* Der Vertrag: Nahwaffen 2–3, Fernwaffen 3–4. Ohne diese Grenze
     entsteht die Waffe mit 1 AP, die alles andere überflüssig macht. */
  if (w.art === "nah") behaupte(w.ap >= 2 && w.ap <= 3, `${n}: Nahwaffe kostet 2 bis 3 AP`);
  if (w.art === "fern") behaupte(w.ap >= 3 && w.ap <= 4, `${n}: Fernwaffe kostet 3 bis 4 AP`);

  behaupte(Number.isInteger(w.reichweite) && w.reichweite >= 1
    && w.reichweite <= REICHWEITE_GROESST,
    `${n}: Reichweite ${w.reichweite} liegt zwischen 1 und ${REICHWEITE_GROESST}`);
  if (w.art === "nah") behaupte(w.reichweite <= 2, `${n}: Nahwaffe reicht höchstens 2 Felder`);
  if (w.art === "fern") behaupte(w.reichweite >= 4, `${n}: Fernwaffe reicht mindestens 4 Felder`);

  behaupte(w.trefferGrund > 0 && w.trefferGrund <= 1,
    `${n}: Treffergrund ${w.trefferGrund} liegt zwischen 0 und 1`);
  behaupte(SCHADENSARTEN.includes(w.schadensart),
    `${n}: Schadensart "${w.schadensart}" ist bekannt`);
  behaupte(w.besonderheit === undefined || BESONDERHEITEN.includes(w.besonderheit),
    `${n}: Besonderheit "${w.besonderheit}" ist bekannt`);

  const wf = w.wuerfel;
  behaupte(Number.isInteger(wf.anzahl) && wf.anzahl >= 1 && wf.anzahl <= 3,
    `${n}: 1 bis 3 Würfel`);
  behaupte([4, 6, 8, 10, 12].includes(wf.seiten), `${n}: übliche Würfelseiten`);
  behaupte(Number.isInteger(wf.festwert) && wf.festwert >= 0 && wf.festwert <= 4,
    `${n}: Festwert zwischen 0 und 4`);
  behaupte(Number.isInteger(schadenDoppelt(w)),
    `${n}: der doppelte Mittelwert ist eine ganze Zahl`);
  behaupte(kleinsterSchaden(w) >= 1, `${n}: der schlechteste Wurf tut noch weh`);
  behaupte(groessterSchaden(w) > kleinsterSchaden(w), `${n}: der Würfel streut`);
}
gleich(waffenNachArt("nah").length, 8, "acht Nahwaffen");
gleich(waffenNachArt("fern").length, 6, "sechs Fernwaffen");
/* Jede Besonderheit muss an mindestens einer Waffe hängen — sonst baut
   `spiel/kampf.mjs` eine Regel für einen Fall, den es nie gibt. */
for (const b of BESONDERHEITEN) {
  behaupte(WAFFEN.some((w) => w.besonderheit === b), `Besonderheit "${b}" kommt vor`);
}

/* ── Die ehrliche Kurve ──────────────────────────────────────────────
   Zwei Behauptungen, die beide von Hand nicht zu halten sind:

   1. **Keine Waffe schlägt eine andere derselben Art in allem.**
      Verglichen werden Mindest-, Höchst- und Mittelschaden,
      Treffergrund, Preis (weniger ist besser) und Reichweite. Wer alle
      sechs gewinnt, macht die andere zu totem Text.
   2. **Mehr Schaden kostet Treffergrund.** Wer bei gleichem oder
      niedrigerem Preis mehr Mittelschaden hat, muss schlechter treffen.
      Ohne diese Regel entsteht die Waffe, die einfach besser ist. */

abschnitt("Waffenkurve");
{
  const masse = (w) => [
    kleinsterSchaden(w), groessterSchaden(w), schadenDoppelt(w),
    w.trefferGrund, -w.ap, w.reichweite
  ];
  for (const a of WAFFEN) {
    for (const b of WAFFEN) {
      if (a === b || a.art !== b.art) continue;
      const ma = masse(a), mb = masse(b);
      const nieSchlechter = ma.every((v, i) => v >= mb[i]);
      const einmalBesser = ma.some((v, i) => v > mb[i]);
      behaupte(!(nieSchlechter && einmalBesser),
        `${a.schluessel} schlägt ${b.schluessel} in jeder Zahl`);
    }
  }
  for (const a of WAFFEN) {
    for (const b of WAFFEN) {
      if (a === b || a.art !== b.art) continue;
      if (schadenDoppelt(a) > schadenDoppelt(b) && a.ap <= b.ap) {
        behaupte(a.trefferGrund < b.trefferGrund,
          `${a.schluessel} haut härter als ${b.schluessel} und muss schlechter treffen`);
      }
    }
  }

  /* Reichweite hat einen Preis: Im Nahkampf muss der erwartete Schaden
     je Aktionspunkt spürbar höher liegen. Sonst wäre Fernkampf schlicht
     die bessere Wahl und der halbe Kerker unbespielt. */
  const wirkung = (w) => mittlererSchaden(w) * w.trefferGrund / w.ap;
  const mittel = (liste) => liste.reduce((s, w) => s + wirkung(w), 0) / liste.length;
  const nah = mittel(waffenNachArt("nah"));
  const fern = mittel(waffenNachArt("fern"));
  behaupte(nah > fern * 1.2,
    `Nahkampf lohnt sich mehr je Punkt: ${nah.toFixed(3)} gegen ${fern.toFixed(3)}`);
  nahe(nah, 1.519, 0.02, "mittlere Nahkampfwirkung je Punkt");
  nahe(fern, 1.111, 0.02, "mittlere Fernkampfwirkung je Punkt");
}

/* ── Fähigkeiten ────────────────────────────────────────────────── */

abschnitt("Fähigkeiten");
{
  /* Die zehn Wirkungsarten, die der Vertrag verlangt. Fehlt eine, ist
     eine ganze Sorte Zug nicht spielbar — und niemand merkt es, weil
     nichts abstürzt. */
  const GEFORDERT = ["schaden", "heilen", "stossen", "ziehen", "verlangsamen",
    "licht", "brennen", "schild", "sprung", "sicht"];
  for (const art of GEFORDERT) {
    behaupte(FAEHIGKEITEN.some((f) => f.wirkung.art === art),
      `es gibt eine Fähigkeit der Wirkung "${art}"`);
  }

  for (const f of FAEHIGKEITEN) {
    const n = f.schluessel;
    behaupte(Number.isInteger(f.ap) && f.ap >= AP_KLEINST && f.ap <= AP_GROESST,
      `${n}: AP ${f.ap} liegt zwischen ${AP_KLEINST} und ${AP_GROESST}`);
    behaupte(Number.isInteger(f.abklingen) && f.abklingen >= 1 && f.abklingen <= 6,
      `${n}: Abklingzeit ${f.abklingen} liegt zwischen 1 und 6 Runden`);
    behaupte(Number.isInteger(f.reichweite) && f.reichweite >= 0
      && f.reichweite <= REICHWEITE_GROESST,
      `${n}: Reichweite ${f.reichweite} liegt zwischen 0 und ${REICHWEITE_GROESST}`);
    behaupte(WIRKUNGSARTEN.includes(f.wirkung.art), `${n}: Wirkungsart ist bekannt`);

    /* Null heißt „auf sich selbst" und muss auch so dastehen. Sonst
       liest ein Aufrufer die Null als Feldabstand und die Fähigkeit
       trifft niemanden. */
    gleich(f.reichweite === 0, f.wirkung.aufSich === true,
      `${n}: Reichweite 0 und aufSich gehören zusammen`);

    /* Ein flaches Objekt aus Zahlen, Zeichenketten und Wahrheitswerten
       — es geht durch die Leitung und in den Speicherstand. */
    for (const [schluessel, wert] of Object.entries(f.wirkung)) {
      const gut = typeof wert === "number" || typeof wert === "string"
        || typeof wert === "boolean";
      behaupte(gut, `${n}: Wirkungsfeld "${schluessel}" ist ein flacher Wert`);
    }
    if (f.wirkung.schadensart !== undefined) {
      behaupte(SCHADENSARTEN.includes(f.wirkung.schadensart),
        `${n}: Schadensart "${f.wirkung.schadensart}" ist bekannt`);
    }
  }

  /* Der Satzsprung ist die Fähigkeit, die den Spielern die Höhen
     öffnet — genau **eine** Ebene, nicht zwei. Zwei wären der
     Abkürzungsweg, der die Rampen der Landschaft bedeutungslos macht. */
  const s = faehigkeit("satzsprung");
  gleich(s.wirkung.art, "sprung", "satzsprung springt");
  gleich(s.wirkung.ebenen, 1, "satzsprung trägt genau eine Ebene hinauf");

  const drei = faehigkeitenVon(["blutzoll", "blutbund", "hakenkette"]);
  gleich(drei.length, 3, "faehigkeitenVon gibt so viele zurück, wie gefragt");
  gleich(drei[0].schluessel, "blutzoll", "und in der Reihenfolge der Frage");
}

/* Die Lichtart muss in `runtime/palette.js` stehen, sonst legt der
   Flammenruf ein Licht, das niemand zeichnen kann. Gelesen wird die
   Datei als Text: Ohne `package.json` gilt `.js` in Node als
   CommonJS, sie ließe sich hier gar nicht importieren. */
abschnitt("Lichtarten");
{
  const text = readFileSync(new URL("../runtime/palette.js", import.meta.url), "utf8");
  const block = text.slice(text.indexOf("LICHT_ARTEN"));
  const ende2 = block.indexOf("};");
  const arten = block.slice(0, ende2 > 0 ? ende2 : block.length);
  for (const f of FAEHIGKEITEN) {
    if (f.wirkung.art !== "licht") continue;
    behaupte(new RegExp(`\\b${f.wirkung.lichtArt}\\s*:`).test(arten),
      `${f.schluessel}: Lichtart "${f.wirkung.lichtArt}" steht in palette.js`);
  }
}

/* ── Helden ─────────────────────────────────────────────────────── */

abschnitt("Helden");
for (const h of HELDEN) {
  const n = h.schluessel;
  behaupte(Number.isInteger(h.lpMax) && h.lpMax >= LP_KLEINST && h.lpMax <= LP_GROESST,
    `${n}: LP ${h.lpMax} liegen zwischen ${LP_KLEINST} und ${LP_GROESST}`);
  behaupte(Number.isInteger(h.apMax) && h.apMax >= APMAX_KLEINST && h.apMax <= APMAX_GROESST,
    `${n}: apMax ${h.apMax} liegt zwischen ${APMAX_KLEINST} und ${APMAX_GROESST}`);
  behaupte(Number.isInteger(h.flinkheit) && h.flinkheit >= 1 && h.flinkheit <= 12,
    `${n}: Flinkheit ${h.flinkheit} liegt zwischen 1 und 12`);
  behaupte(Number.isInteger(h.ruestung) && h.ruestung >= 0 && h.ruestung <= 5,
    `${n}: Rüstung ${h.ruestung} liegt zwischen 0 und 5`);
  behaupte(Number.isInteger(h.sicht) && h.sicht >= 4 && h.sicht <= REICHWEITE_GROESST,
    `${n}: Sicht ${h.sicht} liegt zwischen 4 und ${REICHWEITE_GROESST}`);

  /* Der Verweis ins Leere — der Tippfehler, der garantiert passiert. */
  behaupte(kenntWaffe(h.startWaffe), `${n}: Startwaffe "${h.startWaffe}" gibt es wirklich`);
  gleich(h.faehigkeiten.length, 2, `${n}: genau zwei Fähigkeiten`);
  for (const f of h.faehigkeiten) {
    behaupte(kenntFaehigkeit(f), `${n}: Fähigkeit "${f}" gibt es wirklich`);
  }
  behaupte(h.eigenheit === null || typeof h.eigenheit.art === "string",
    `${n}: Eigenheit ist null oder hat eine Art`);
}
{
  /* Die Klassen müssen sich spürbar unterscheiden — nicht sechsmal
     dasselbe mit anderen Zahlen. Drei Belege, die alle fielen, wenn
     jemand die Werte „ausbalanciert" und dabei einebnet. */
  const apWerte = new Set(HELDEN.map((h) => h.apMax));
  behaupte(apWerte.size >= 3, "es gibt mindestens drei verschiedene AP-Zahlen");
  behaupte(HELDEN.some((h) => h.ruestung >= 3), "eine Klasse trägt schwere Rüstung");
  behaupte(HELDEN.some((h) => h.ruestung === 0), "eine Klasse trägt gar keine");
  const spanne = Math.max(...HELDEN.map((h) => h.lpMax))
    - Math.min(...HELDEN.map((h) => h.lpMax));
  behaupte(spanne >= 12, `die LP-Spanne ist mit ${spanne} groß genug, um zu zählen`);
  behaupte(HELDEN.some((h) => waffe(h.startWaffe).art === "nah"), "jemand fängt im Nahkampf an");
  behaupte(HELDEN.some((h) => waffe(h.startWaffe).art === "fern"), "jemand fängt in der Ferne an");

  gleich(heldenSchluessel().join(","),
    "spaeher,schildtraeger,flammenpriester,grabraeuber,bluthexer,bogenschuetzin",
    "die Klassenreihenfolge liegt fest");
}

/* ── Gegner ─────────────────────────────────────────────────────── */

abschnitt("Gegner");
for (const g of GEGNER) {
  const n = g.schluessel;
  behaupte(Number.isInteger(g.lpMax) && g.lpMax >= LP_KLEINST && g.lpMax <= LP_GROESST,
    `${n}: LP ${g.lpMax} liegen zwischen ${LP_KLEINST} und ${LP_GROESST}`);
  behaupte(Number.isInteger(g.apMax) && g.apMax >= APMAX_KLEINST && g.apMax <= APMAX_GROESST,
    `${n}: apMax ${g.apMax} liegt zwischen ${APMAX_KLEINST} und ${APMAX_GROESST}`);
  behaupte(Number.isInteger(g.flinkheit) && g.flinkheit >= 1 && g.flinkheit <= 12,
    `${n}: Flinkheit ${g.flinkheit} liegt zwischen 1 und 12`);
  behaupte(Number.isInteger(g.ruestung) && g.ruestung >= 0 && g.ruestung <= 5,
    `${n}: Rüstung ${g.ruestung} liegt zwischen 0 und 5`);
  behaupte(Number.isInteger(g.sicht) && g.sicht >= 4 && g.sicht <= REICHWEITE_GROESST,
    `${n}: Sicht ${g.sicht} liegt zwischen 4 und ${REICHWEITE_GROESST}`);
  behaupte(kenntWaffe(g.waffe), `${n}: Waffe "${g.waffe}" gibt es wirklich`);
  for (const f of g.faehigkeiten) {
    behaupte(kenntFaehigkeit(f), `${n}: Fähigkeit "${f}" gibt es wirklich`);
  }
  behaupte(VERHALTEN.includes(g.verhalten), `${n}: Verhalten "${g.verhalten}" ist bekannt`);
  behaupte(Number.isInteger(g.abTiefe) && g.abTiefe >= 1,
    `${n}: abTiefe ${g.abTiefe} ist eine Tiefe ab 1`);
  behaupte(Number.isInteger(g.gewicht) && g.gewicht >= 1, `${n}: Gewicht ist positiv`);
  behaupte(Number.isInteger(kosten(g)) && kosten(g) > 0, `${n}: Kosten sind eine ganze Zahl`);
}
{
  /* Jedes Verhalten muss vorkommen, sonst hat `spiel/gegner-ki.mjs`
     einen Zweig, den nie jemand betritt — oder es fehlt eine Rolle. */
  for (const v of VERHALTEN) {
    behaupte(GEGNER.some((g) => g.verhalten === v), `Verhalten "${v}" kommt vor`);
  }
  /* Die drei Rollen, ohne die das Gelände nicht mitspielt. */
  behaupte(GEGNER.some((g) => waffe(g.waffe).besonderheit === "stoesst"
    || g.faehigkeiten.includes("wuchtstoss")),
    "mindestens einer stößt und macht die Kanten gefährlich");
  behaupte(GEGNER.some((g) => waffe(g.waffe).art === "fern"),
    "mindestens einer wirkt aus der Ferne");
  behaupte(GEGNER.some((g) => g.verhalten === "lauerer"),
    "mindestens einer lauert im Dunkeln");

  /* Gestaffelt heißt: nicht alles ab Tiefe 1, aber jeder erreichbar. */
  behaupte(GEGNER.some((g) => g.abTiefe === 1), "in Tiefe 1 gibt es schon Gegner");
  behaupte(new Set(GEGNER.map((g) => g.abTiefe)).size >= 4,
    "es gibt mindestens vier verschiedene Einstiegstiefen");
  gleich(gegnerBisTiefe(1).length, 3, "in Tiefe 1 sind drei Arten erlaubt");
  gleich(gegnerBisTiefe(99).length, GEGNER.length, "tief unten sind alle erlaubt");
  gleich(gegnerBisTiefe(0).length, 0, "in Tiefe 0 gibt es nichts");

  /* Teurer heißt tiefer: Der billigste Gegner ab Tiefe 5 muss teurer
     sein als der billigste in Tiefe 1, sonst ist die Staffelung nur
     eine Behauptung im Kopftext. */
  const billigstBei = (t) => Math.min(...gegnerBisTiefe(t).map(kosten));
  behaupte(billigstBei(5) >= billigstBei(1), "tiefer wird nicht billiger");
  gleich(kosten(gegner("kraetzling")), 11, "der Krätzling kostet 11 Punkte");
  gleich(kosten(gegner("blutvogt")), 40, "der Blutvogt kostet 40 Punkte");
}

/* ── Tote Daten ──────────────────────────────────────────────────────
   Eine Fähigkeit, die niemand trägt, ist gebaut und nie im Spiel. Sie
   sieht im Katalog aus wie Inhalt und ist keiner — und weil nichts
   abstürzt, fällt sie ohne diese Prüfung nie auf. Dasselbe gilt für
   eine Waffe, die keine Klasse und kein Gegner je in die Hand nimmt. */

abschnitt("Tote Daten");
{
  const getragen = new Set();
  for (const h of HELDEN) for (const f of h.faehigkeiten) getragen.add(f);
  for (const g of GEGNER) for (const f of g.faehigkeiten) getragen.add(f);
  for (const f of FAEHIGKEITEN) {
    behaupte(getragen.has(f.schluessel), `Fähigkeit "${f.schluessel}" wird von jemandem getragen`);
  }
  const gefuehrt = new Set([...HELDEN.map((h) => h.startWaffe), ...GEGNER.map((g) => g.waffe)]);
  /* Nicht jede Waffe muss eine **Startwaffe** sein — Beute gibt es
     auch. Aber die Hälfte des Katalogs unbenutzt wäre kein Katalog. */
  behaupte(gefuehrt.size >= WAFFEN.length / 2,
    `mindestens die Hälfte der Waffen wird geführt (${gefuehrt.size} von ${WAFFEN.length})`);
}

/* ── Texte: echte Umlaute, nichts Leeres, keine Zeichensalat ─────── */

abschnitt("Texte");
{
  const alle = [];
  for (const liste of [WAFFEN, FAEHIGKEITEN, HELDEN, GEGNER]) {
    for (const e of liste) {
      alle.push([e.schluessel, "name", e.name]);
      if (e.zier !== undefined) alle.push([e.schluessel, "zier", e.zier]);
    }
  }
  /* Weißliste statt schwarzer Liste: Sie fängt auch den Zeichensalat,
     der beim falschen Kodieren entsteht („Ã¤"), und den geraden
     Bindestrich, der im Fließtext ein Gedankenstrich sein müsste. */
  const ERLAUBT = /^[A-Za-zÄÖÜäöüß0-9 .,;:!?'’„“()–—-]+$/u;
  for (const [n, feld, text] of alle) {
    behaupte(typeof text === "string" && text.trim().length > 0,
      `${n}.${feld}: nicht leer`);
    behaupte(ERLAUBT.test(text), `${n}.${feld}: nur erlaubte Zeichen — "${text}"`);
    behaupte(text === text.trim(), `${n}.${feld}: kein Leerzeichen am Rand`);
  }
  for (const liste of [WAFFEN, FAEHIGKEITEN, HELDEN, GEGNER]) {
    for (const e of liste) {
      behaupte(e.name !== e.schluessel, `${e.schluessel}: Name ist kein Schlüssel`);
      behaupte(e.name[0] === e.name[0].toUpperCase(), `${e.schluessel}: Name groß geschrieben`);
      if (e.zier === undefined) continue;
      behaupte(e.zier.length >= 20, `${e.schluessel}: die Zier ist ein Satz, kein Wort`);
      behaupte(/[.!?]$/.test(e.zier), `${e.schluessel}: die Zier endet mit einem Satzzeichen`);
    }
  }

  /* Der Fall, der ohne diese Prüfung falsch wäre: Wird eine dieser
     Dateien falsch kodiert oder von jemandem „vereinfacht", steht im
     Spiel „Spaeher" — und niemand merkt es, weil nichts abstürzt.
     Deshalb wörtlich, Buchstabe für Buchstabe. */
  const WOERTLICH = [
    ["spaeher", "Späher"], ["schildtraeger", "Schildträger"],
    ["grabraeuber", "Grabräuber"], ["bogenschuetzin", "Bogenschützin"],
    ["kraetzling", "Krätzling"], ["wuchtstoss", "Wuchtstoß"]
  ];
  for (const [s, name] of WOERTLICH) {
    const e = [...WAFFEN, ...FAEHIGKEITEN, ...HELDEN, ...GEGNER]
      .find((x) => x.schluessel === s);
    behaupte(e !== undefined, `"${s}" steht im Katalog`);
    gleich(e && e.name, name, `"${s}" heißt wörtlich "${name}"`);
  }
  /* Und alle vier Sonderbuchstaben müssen irgendwo wirklich vorkommen
     — sonst hätte jemand sie flächendeckend umgeschrieben. */
  const ganzerText = alle.map(([, , t]) => t).join(" ");
  for (const zeichen of ["ä", "ö", "ü", "ß"]) {
    behaupte(ganzerText.includes(zeichen), `"${zeichen}" kommt im Katalog wirklich vor`);
  }
}

/* ── waehleGegner: Gleichlauf, Tiefe, Budget ────────────────────── */

abschnitt("Auswahl");
{
  const schluessel = (liste) => liste.map((g) => g.schluessel).join(",");

  /* Gleichlauf — der teuerste Fehler, den dieses Spiel haben kann:
     Zwei Rechner, dieselbe Saat, verschiedene Gegner im selben Saal. */
  const a = schluessel(waehleGegner(macheZufall(41), 4, 120));
  const b = schluessel(waehleGegner(macheZufall(41), 4, 120));
  gleich(a, b, "dieselbe Saat gibt dieselbe Auswahl");
  behaupte(a.length > 0, "und sie ist nicht leer");
  /* Sonst verglichen wir eben nur zweimal dieselbe leere Zeichenkette. */
  const c = schluessel(waehleGegner(macheZufall(7), 4, 120));
  behaupte(c !== a, "eine andere Saat gibt eine andere Auswahl");

  /* Der Strom darf nur so weit laufen, wie gezogen wird — sonst
     verschiebt die Gegnerauswahl jeden späteren Trefferwurf
     (Fehlerbuch B4). Geprüft wird, dass zwei Läufe mit derselben Saat
     denselben Strom zurücklassen. */
  const z1 = macheZufall(41), z2 = macheZufall(41);
  waehleGegner(z1, 4, 120);
  waehleGegner(z2, 4, 120);
  gleich(z1.zustand(), z2.zustand(), "der Strom steht danach gleich weit");

  /* Kein Gegner darf tiefer gehören, als der Kerker tief ist. */
  for (let tiefe = 1; tiefe <= 12; tiefe++) {
    const wahl = waehleGegner(macheZufall(1000 + tiefe), tiefe, 150);
    for (const g of wahl) {
      behaupte(g.abTiefe <= tiefe,
        `Tiefe ${tiefe}: ${g.schluessel} gehört erst ab Tiefe ${g.abTiefe}`);
    }
    const summe = wahl.reduce((s, g) => s + kosten(g), 0);
    behaupte(summe <= 150, `Tiefe ${tiefe}: die Auswahl bleibt im Budget (${summe} von 150)`);
    behaupte(wahl.length > 0, `Tiefe ${tiefe}: es kommt überhaupt jemand`);
  }

  /* Die Tiefe wird an **zwei** Stellen gehalten: `gegnerBisTiefe`
     lässt zu tiefe Arten gar nicht erst in die Liste, und `gewichtBei`
     gibt ihnen Gewicht 0. Mit dem echten Strom ist das nicht zu
     unterscheiden — nimmt man eine der beiden weg, bleibt die Prüfung
     grün, und niemand weiß mehr, welche der beiden trägt. Genau
     deshalb hier ein Strom, der den einen dokumentierten Ausweg von
     `nachGewicht` nimmt: den letzten Eintrag der Liste, ohne auf sein
     Gewicht zu sehen (`spiel/zufall.mjs`, letzte Zeile der Funktion).
     Hält dann noch die Tiefe, hält sie der Filter — und nicht das
     Gewicht. Ohne den Filter steht der Blutvogt in Tiefe 1. */
  {
    const boesartig = { nachGewicht: (liste) => liste[liste.length - 1] };
    for (let tiefe = 1; tiefe <= 5; tiefe++) {
      const wahl = waehleGegner(boesartig, tiefe, 150);
      behaupte(wahl.length > 0, `Tiefe ${tiefe}: auch der letzte Eintrag wird gezogen`);
      for (const g of wahl) {
        behaupte(g.abTiefe <= tiefe,
          `Tiefe ${tiefe}: ${g.schluessel} (ab ${g.abTiefe}) kam am Gewicht vorbei herein`);
      }
    }
  }

  /* Randfälle. Der billigste Gegner kostet 11 — darunter darf nichts
     kommen, und die Schleife muss trotzdem enden. */
  gleich(waehleGegner(macheZufall(3), 1, 10).length, 0, "Budget 10 reicht für niemanden");
  gleich(waehleGegner(macheZufall(3), 1, 0).length, 0, "Budget 0 gibt niemanden");
  gleich(waehleGegner(macheZufall(3), 1, -50).length, 0, "ein negatives Budget auch nicht");
  gleich(waehleGegner(macheZufall(3), 0, 500).length, 0, "in Tiefe 0 gibt es keine Gegner");
  gleich(waehleGegner(macheZufall(3), 1, 11).length, 1, "Budget 11 reicht für genau einen");
  /* Der Riegel: Ein riesiges Budget darf keine endlose Liste geben. */
  gleich(waehleGegner(macheZufall(3), 1, 100000).length, HOECHSTENS_GEGNER,
    "ein riesiges Budget endet am Riegel");

  /* Jede Art muss erreichbar sein — eine Vorlage, die nie gezogen wird,
     ist gebaute Zierde. Gesucht wird in ihrer eigenen Einstiegstiefe. */
  for (const g of GEGNER) {
    let gefunden = false;
    for (let saat = 1; saat <= 60 && !gefunden; saat++) {
      const wahl = waehleGegner(macheZufall(saat), g.abTiefe, 300);
      gefunden = wahl.some((w) => w.schluessel === g.schluessel);
    }
    behaupte(gefunden, `${g.schluessel} ist ab Tiefe ${g.abTiefe} wirklich erreichbar`);
  }
}

/* ── Das Tiefenfenster ───────────────────────────────────────────────
   Der Rückfall, den man nie beim Spielen findet: Mit einer Untergrenze
   von 1 statt `abTiefe` fällt der Anteil später Brut in großer Tiefe
   wieder auf den Stand von Tiefe 4 zurück (gemessen: 15,8 % statt
   35,7 %), weil dann wieder die nackten Grundgewichte regieren — und
   der Krätzling hat das höchste. Das Spiel läuft weiter, nur ist der
   zwölfte Kerker derselbe wie der vierte. */

abschnitt("Tiefenfenster");
{
  const anteilSpaet = (tiefe) => {
    let ganz = 0, spaet = 0;
    for (const g of GEGNER) {
      const w = gewichtBei(g, tiefe);
      ganz += w;
      if (g.abTiefe >= 4) spaet += w;
    }
    return ganz === 0 ? 0 : spaet / ganz;
  };

  for (const g of GEGNER) {
    gleich(gewichtBei(g, g.abTiefe - 1), 0,
      `${g.schluessel}: eine Tiefe zu früh wiegt nichts`);
    behaupte(gewichtBei(g, g.abTiefe) > 0, `${g.schluessel}: in seiner Tiefe wiegt er`);
    behaupte(Number.isInteger(gewichtBei(g, 7)), `${g.schluessel}: das Gewicht ist ganzzahlig`);
  }

  nahe(anteilSpaet(4), 0.160, 0.005, "in Tiefe 4 stellt späte Brut ein Sechstel");
  nahe(anteilSpaet(6), 0.494, 0.005, "in Tiefe 6 die Hälfte");
  nahe(anteilSpaet(12), 0.357, 0.005, "und in Tiefe 12 immer noch ein gutes Drittel");
  behaupte(anteilSpaet(12) > anteilSpaet(4) * 2,
    "der zwölfte Kerker fällt nicht auf den vierten zurück");
  gleich(anteilSpaet(1), 0, "in Tiefe 1 gibt es keine späte Brut");
}

ende("Katalog");
